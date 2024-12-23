import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from './s3.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import * as devConfig from '../../dev.json';

@ApiTags('S3')
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @ApiOperation({ summary: '이미지 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const fileKey = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${file.originalname.split('.').pop()}`;

    const filePath = `images/${fileKey}`;

    await this.s3Service.uploadToS3({
      Key: filePath,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    return {
      imageUrl: `https://${devConfig.AWS_S3_BUCKET}.s3.${devConfig.AWS_REGION}.amazonaws.com/${filePath}`,
    };
  }

  @ApiOperation({ summary: '음성 파일 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post('upload/voice')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVoice(@UploadedFile() file: Express.Multer.File) {
    const fileKey = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${file.originalname.split('.').pop()}`;

    const filePath = `voices/${fileKey}`;

    await this.s3Service.uploadToS3({
      Key: filePath,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    return {
      voiceUrl: `https://${devConfig.AWS_S3_BUCKET}.s3.${devConfig.AWS_REGION}.amazonaws.com/${filePath}`,
    };
  }
}
