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

  private sanitizeFileName(fileName: string): string {
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop();
    const randomString = Math.random().toString(36).substring(2, 15);

    return `${timestamp}-${randomString}.${fileExtension}`;
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    try {
      const bucket = process.env.AWS_S3_BUCKET;
      if (!bucket) {
        throw new InternalServerErrorException(
          'AWS S3 버킷이 설정되지 않았습니다.',
        );
      }

      const sanitizedFileName = this.sanitizeFileName(file.originalname);
      const key = `uploads/${sanitizedFileName}`;

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
