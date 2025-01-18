import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
  BadRequestException,
  UnauthorizedException,
  Put,
  Delete,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { LettersService } from './letters.service';
import { CreateLetterDto } from './dto/create-letter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { SaveDraftLetterDto } from './dto/save-draft-letter.dto';
import { Category } from '@prisma/client';
import * as devConfig from '../../dev.json';
import { S3Service } from '../s3/s3.service';
import { memoryStorage } from 'multer';

interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
  };
}

@ApiTags('Letters')
@Controller('letters')
export class LettersController {
  constructor(
    private readonly lettersService: LettersService,
    private readonly s3Service: S3Service,
  ) {}

  @ApiOperation({
    summary: '편지 작성 API',
    description:
      '새로운 편지를 작성합니다. 로그인한 경우 발신자가 저장되고, 비로그인시 익명으로 전송됩니다.',
  })
  @ApiResponse({
    status: 200,
    description: '편지 작성 성공',
    schema: {
      example: {
        id: 1,
        title: '사랑하는 친구에게',
        description: '오랜만에 연락하네...',
        imageUrl: 'https://example.com/image.jpg',
        bgmUrl: 'https://example.com/music.mp3',
        category: 'TEXT',
        isOpen: false,
        scheduledAt: '2024-03-20T12:00:00.000Z',
        createdAt: '2024-03-14T12:00:00.000Z',
        updatedAt: '2024-03-14T12:00:00.000Z',
        userId: 1,
      },
    },
  })
  @Post()
  @ApiBearerAuth('access-token')
  create(
    @Body() createLetterDto: CreateLetterDto,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    return this.lettersService.create(createLetterDto, userId);
  }

  @ApiOperation({
    summary: '내 편지 목록 조회 API',
    description:
      '자신이 받은 편지 목록을 페이지네이션하여 조회합니다. 카테고리로 필터도 가능합니다.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '페이지 번호 (기본값: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '페이지네이션 항목 수 (기본값: 10)',
    type: Number,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: '편지 카테고리 필터 (TEXT 또는 VOICE)',
    enum: Category,
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyLetters(
    @Request() req: RequestWithUser,
    @Query() query: Record<string, any>,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('사용자 정보를 찾을 수 없습니다.');
    }

    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const category = query.category as Category | undefined;

    // 유효성 검사
    if (isNaN(page) || page < 1) {
      throw new BadRequestException('페이지 번호는 1 이상의 숫자여야 합니다.');
    }
    if (isNaN(limit) || limit < 1) {
      throw new BadRequestException(
        '페이지당 항목 수는 1 이상의 숫자여야 합니다.',
      );
    }

    // 카테고리 유효성 검사
    if (category && !Object.values(Category).includes(category)) {
      throw new BadRequestException('유효하지 않은 카테고리입니다.');
    }

    return this.lettersService.getMyLetters(req.user.id, {
      page,
      limit,
      category,
    });
  }

  @ApiOperation({
    summary: '특정 편지 조회 API',
    description: '특정 ID의 편지를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '편지 조회 성공',
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자',
  })
  @ApiResponse({
    status: 403,
    description: '권한 없음 (수신자가 아니거나 아직 열람할 수 없는 편지)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    if (!req.user?.id) {
      throw new UnauthorizedException('사용자 인증이 필요합니다.');
    }

    return this.lettersService.findOne(+id, req.user.id);
  }

  @ApiOperation({
    summary: '이미지 업로드 API',
    description: '이미지를 S3에 업로드합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '업로드할 이미지 파일 (jpg, jpeg, png만 허용, 최대 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '이미지 업로드 성공',
    schema: {
      example: {
        imageUrl:
          'https://your-bucket.s3.region.amazonaws.com/uploads/1234567890-image.jpg',
      },
    },
  })
  @Post('upload/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
          return callback(
            new BadRequestException('이미지 파일만 업로드 가능합니다.'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '업로드할 이미지 파일 (jpg, jpeg, png만 허용, 최대 5MB)',
        },
      },
    },
  })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }

    const fileKey = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${file.originalname.split('.').pop()}`;

    const filePath = `images/${fileKey}`;

    try {
      await this.s3Service.uploadToS3({
        Key: filePath,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      return {
        imageUrl: `https://${devConfig.AWS_S3_BUCKET}.s3.${devConfig.AWS_REGION}.amazonaws.com/${filePath}`,
        fileKey,
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new InternalServerErrorException('파일 업로드에 실패했습니다.');
    }
  }

  @ApiOperation({
    summary: '음성 파일 업로드 API',
    description: '음성 파일을 S3에 업로드합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            '업로드할 음성 파일 (mp3, wav, m4a, mp4만 허용, 최대 10MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '음성 파일 업로드 성공',
    schema: {
      example: {
        voiceUrl:
          'https://your-bucket.s3.region.amazonaws.com/voices/1234567890-voice.mp3',
      },
    },
  })
  @Post('upload/voice')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVoice(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(mp3|wav|m4a|mp4)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.lettersService.uploadVoice(file);
  }

  @ApiOperation({
    summary: '내가 나에게 쓴 편지 목록 조회 API',
    description: '자신이 자신에게 쓴 편지 목록을 페이지네이션하여 조회합니다.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('my/self')
  getMyLettersToMyself(
    @Request() req: RequestWithUser,
    @Query() query: Record<string, any>,
  ) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    if (isNaN(page) || page < 1) {
      throw new BadRequestException('페이지 번호는 1 이상의 숫자여야 합니다.');
    }
    if (isNaN(limit) || limit < 1) {
      throw new BadRequestException(
        '페이지당 항목 수는 1 이상의 숫자여야 합니다.',
      );
    }

    return this.lettersService.getMyLettersToMyself(req.user.id, {
      page,
      limit,
    });
  }

  @ApiOperation({
    summary: '편지 임시저장 API',
    description: '편지를 임시저장합니다.',
  })
  @Post('draft')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async saveDraft(
    @Body() draftData: SaveDraftLetterDto,
    @Request() req: RequestWithUser,
    @Query('draftId') draftId?: string,
  ) {
    return this.lettersService.saveDraft(
      draftData,
      req.user.id,
      draftId ? +draftId : undefined,
    );
  }

  @ApiOperation({
    summary: '임시저장 편지 목록 조회 API',
    description: '임시저장된 편지 목록을 조회합니다.',
  })
  @Get('drafts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  getDrafts(@Request() req: RequestWithUser) {
    return this.lettersService.getDrafts(req.user.id);
  }

  @ApiOperation({
    summary: '임시저장 편지 조회 API',
    description: '특정 임시저장 편지를 조회합니다.',
  })
  @Get('draft/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  getDraft(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.lettersService.getDraft(+id, req.user.id);
  }

  @ApiOperation({
    summary: '임시저장 편지 목록 조회 API (페이지네이션)',
    description: '임시저장된 편지 목록을 페이지네이션하여 조회합니다.',
  })
  @Get('drafts/paginated')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  getDraftLetters(
    @Request() req: RequestWithUser,
    @Query() query: Record<string, any>,
  ) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    if (isNaN(page) || page < 1) {
      throw new BadRequestException('페이지 번호는 1 이상의 숫자여야 합니다.');
    }
    if (isNaN(limit) || limit < 1) {
      throw new BadRequestException(
        '페이지당 항목 수는 1 이상의 숫자여야 합니다.',
      );
    }

    return this.lettersService.getDraftLetters(req.user.id, {
      page,
      limit,
    });
  }

  @ApiOperation({
    summary: '임시저장 편지 수정 API',
    description: '임시저장된 편지 수정합니다.',
  })
  @Put('draft/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async updateDraft(
    @Param('id') id: string,
    @Body() draftData: SaveDraftLetterDto,
    @Request() req: RequestWithUser,
  ) {
    return this.lettersService.updateDraft(+id, draftData, req.user.id);
  }

  @ApiOperation({
    summary: '임시저장 편지 삭제 API',
    description: '임시저장된 편지를 삭제합니다.',
  })
  @Delete('draft/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async deleteDraft(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.lettersService.deleteDraft(+id, req.user.id);
  }

  @ApiOperation({
    summary: 'BGM 목록 조회 API',
    description: 'S3에 저장된 BGM 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'BGM 목록 조회 성공',
    schema: {
      example: {
        bgms: [
          {
            url: 'https://your-bucket.s3.region.amazonaws.com/bgm/music1.mp3',
            name: 'music1.mp3',
          },
        ],
      },
    },
  })
  @Get('bgm/list')
  async getBgmList() {
    return this.lettersService.getBgmList();
  }

  @ApiOperation({
    summary: '임시저장 편지 발송 API',
    description: '임시저장된 편지를 발송하고 임시저 목록에서 제거합니다.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: '임시저장 편지 ID',
    type: 'number',
  })
  @ApiBody({
    type: CreateLetterDto,
    description: '발송할 편지 데이터',
  })
  @ApiResponse({
    status: 201,
    description: '편지 발송 성공',
    schema: {
      example: {
        id: 1,
        title: '안녕하세요',
        description: '반갑습니다',
        imageUrls: ['https://example.com/image.jpg'],
        bgmUrl: 'https://example.com/bgm.mp3',
        category: 'TEXT',
        isOpen: false,
        scheduledAt: '2024-12-25T00:00:00.000Z',
        senderNickname: '익명의 친구',
        audioUrl: 'https://example.com/voice.mp3',
        isDraft: false,
        createdAt: '2024-03-19T12:00:00.000Z',
        updatedAt: '2024-03-19T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '임시저장된 편지를 찾을 수 없음',
    schema: {
      example: {
        statusCode: 404,
        message: '임시저장된 편지를 찾을 수 없습니다.',
        error: 'Not Found',
      },
    },
  })
  @ApiBearerAuth('access-token')
  @Post('draft/:id/send')
  @UseGuards(JwtAuthGuard)
  async sendDraft(
    @Param('id') id: string,
    @Body() createLetterDto: CreateLetterDto,
    @Request() req: RequestWithUser,
  ) {
    return this.lettersService.createFromDraft(
      +id,
      createLetterDto,
      req.user.id,
    );
  }
}
