import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Category } from '@prisma/client';

export class SaveDraftLetterDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bgmUrl?: string;

  @ApiProperty({ required: false, enum: Category })
  @IsEnum(Category)
  @IsOptional()
  category?: Category;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  receiverId?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  scheduledAt?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  senderNickName?: string;
}
