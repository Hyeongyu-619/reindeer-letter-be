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

  async uploadToS3({
    Key,
    Body,
    ContentType,
  }: {
    Key: string;
    Body: Buffer;
    ContentType: string;
  }) {
    const command = new PutObjectCommand({
      Bucket: devConfig.AWS_S3_BUCKET,
      Key,
      Body,
      ContentType,
      CacheControl: 'public, max-age=31536000',
    });

    return this.s3Client.send(command);
  }
}
