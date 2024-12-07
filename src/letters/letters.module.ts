import { Module } from '@nestjs/common';
import { LettersService } from './letters.service';
import { LettersController } from './letters.controller';

@Module({
  controllers: [LettersController],
  providers: [LettersService],
})
export class LettersModule {}
