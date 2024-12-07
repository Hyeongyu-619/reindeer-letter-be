import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Express } from 'express';

@Injectable()
export class S3Service {
  private s3Client: S3Client;

  constructor() {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    // 필수 환경변수 검증
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException(
        'AWS 설정이 올바르지 않습니다. (region, accessKeyId, secretAccessKey 확인 필요)',
      );
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private sanitizeFileName(fileName: string, prefix: string): string {
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop();
    const randomString = Math.random().toString(36).substring(2, 15);

    return `${prefix}/${timestamp}-${randomString}.${fileExtension}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    type: 'image' | 'audio',
  ): Promise<string> {
    try {
      const bucket = process.env.AWS_S3_BUCKET;
      if (!bucket) {
        throw new InternalServerErrorException(
          'AWS S3 버킷이 설정되지 않았습니다.',
        );
      }

      // 파일 타입별 설정
      const config = {
        image: {
          maxSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: /(jpg|jpeg|png)$/,
          folder: 'images',
        },
        audio: {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: /(mp3|wav|m4a)$/,
          folder: 'voices',
        },
      };

      const settings = config[type];

      // 파일 크기 검증
      if (file.size > settings.maxSize) {
        throw new InternalServerErrorException(
          `파일 크기는 ${settings.maxSize / (1024 * 1024)}MB를 초과할 수 없습니다.`,
        );
      }

      // 파일 타입 검증
      if (!file.mimetype.match(settings.allowedTypes)) {
        throw new InternalServerErrorException(
          `지원하지 않는 파일 형식입니다. ${type === 'image' ? 'jpg, jpeg, png' : 'mp3, wav, m4a'} 파일만 업로드 가능합니다.`,
        );
      }

      const key = this.sanitizeFileName(file.originalname, settings.folder);

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('S3 업로드 에러:', error);
      throw new InternalServerErrorException(
        '파일 업로드 중 오류가 발생했습니다: ' + error.message,
      );
    }
  }
}
