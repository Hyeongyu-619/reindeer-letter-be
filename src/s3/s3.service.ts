import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Express } from 'express';
import * as devConfig from '../../dev.json';
import sharp from 'sharp';

@Injectable()
export class S3Service {
  public readonly s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: devConfig.AWS_REGION,
      credentials: {
        accessKeyId: devConfig.ACCESS_KEY,
        secretAccessKey: devConfig.SECRET_KEY,
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
      if (type === 'image') {
        const optimizedBuffer = await sharp(file.buffer)
          .resize(1920, null, {
            withoutEnlargement: true,
            fit: 'inside',
          })
          .toBuffer();

        file.buffer = optimizedBuffer;
      }

      const key = this.sanitizeFileName(
        file.originalname,
        type === 'image' ? 'images' : 'voices',
      );

      const command = new PutObjectCommand({
        Bucket: devConfig.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000',
      });

      await this.s3Client.send(command);

      const url = `https://${devConfig.AWS_S3_BUCKET}.s3.${devConfig.AWS_REGION}.amazonaws.com/${key}`;

      return url;
    } catch (error: unknown) {
      console.error('S3 업로드 에러:', error);
      throw new InternalServerErrorException(
        '파일 업로드 중 오류가 발생했습니다: ' +
          (error instanceof Error ? error.message : '알 수 없는 오류'),
      );
    }
  }
}
