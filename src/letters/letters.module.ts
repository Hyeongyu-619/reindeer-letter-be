import { Module } from '@nestjs/common';
import { LettersService } from './letters.service';
import { LettersController } from './letters.controller';
import { S3Module } from '../s3/s3.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [S3Module, PrismaModule],
  controllers: [LettersController],
  providers: [LettersService],
})
export class LettersModule {}
