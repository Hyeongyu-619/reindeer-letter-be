import { Module } from '@nestjs/common';
import { LettersService } from './letters.service';
import { LettersController } from './letters.controller';
import { S3Module } from '../s3/s3.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [S3Module, PrismaModule, EmailModule],
  controllers: [LettersController],
  providers: [LettersService],
})
export class LettersModule {}
