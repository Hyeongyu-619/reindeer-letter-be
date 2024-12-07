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

@ApiTags('Letters')
@Controller('letters')
export class LettersController {
  constructor(private readonly lettersService: LettersService) {}

  @ApiOperation({
    summary: '편지 작성 API',
    description:
      '새로운 편지를 작성합니다. scheduledAt을 설정하면 예약 발송됩니다.',
  })
  @ApiResponse({
    status: 201,
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
  create(@Body() createLetterDto: CreateLetterDto) {
    return this.lettersService.create(createLetterDto);
  }

  @ApiOperation({
    summary: '특정 편지 조회 API',
    description: '특정 ID의 편지를 조회합니다.',
  })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.lettersService.findOne(+id, req.user.userId);
  }

  @ApiOperation({
    summary: '내 편지 목록 조회 API',
    description: '자신이 작성한 편지 목록을 조회합니다.',
  })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: 200,
    description: '편지 목록 조회 성공',
    schema: {
      example: [
        {
          id: 1,
          title: '사랑하는 친구에게',
          description: '오랜만에 연락하네...',
          imageUrl: 'https://example.com/image.jpg',
          bgmUrl: 'https://example.com/music.mp3',
          category: 'TEXT',
          isOpen: false,
          createdAt: '2024-03-14T12:00:00.000Z',
          updatedAt: '2024-03-14T12:00:00.000Z',
          userId: 1,
        },
      ],
    },
  })
  @UseGuards(JwtAuthGuard)
  @Get('my/letters')
  getMyLetters(@Request() req) {
    return this.lettersService.getMyLetters(req.user.userId);
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
    status: 201,
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
    status: 201,
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
}
