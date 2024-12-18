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
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: number;
  };
}

@ApiTags('Letters')
@Controller('letters')
export class LettersController {
  constructor(private readonly lettersService: LettersService) {}

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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  create(
    @Body() createLetterDto: CreateLetterDto,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user?.userId;
    return this.lettersService.create(createLetterDto, userId);
  }

  @ApiOperation({
    summary: '내 편지 목록 조회 API',
    description: '자신이 받은 편지 목록을 페이지네이션하여 조회합니다.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyLetters(
    @Request() req: RequestWithUser,
    @Query() query: Record<string, any>,
  ) {
    // 쿼리 파라미터 수동 변환
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    // 유효성 검사
    if (isNaN(page) || page < 1) {
      throw new BadRequestException('페이지 번호는 1 이상의 숫자여야 합니다.');
    }
    if (isNaN(limit) || limit < 1) {
      throw new BadRequestException(
        '페이지당 항목 수는 1 이상의 숫자여야 합니다.',
      );
    }

    return this.lettersService.getMyLetters(req.user.userId, { page, limit });
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
    return this.lettersService.findOne(+id, req.user.userId);
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.lettersService.uploadImage(file);
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
          description: '업로드할 음성 파일 (mp3, wav, m4a만 허용, 최대 10MB)',
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
          new FileTypeValidator({ fileType: /(mp3|wav|m4a)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.lettersService.uploadVoice(file);
  }

  @ApiOperation({
    summary: '내가 나에게 쓴 편지 목록 조회 API',
    description: '자신이 자신에게 쓴 편�� 목록을 페이지네이션하여 조회합니다.',
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

    return this.lettersService.getMyLettersToMyself(req.user.userId, {
      page,
      limit,
    });
  }
}
