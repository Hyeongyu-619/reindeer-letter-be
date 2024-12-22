import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Category } from '@prisma/client';

export class SaveDraftLetterDto {
  @ApiProperty({
    required: false,
    description: '편지 제목',
    example: '임시저장 제목',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    required: false,
    description: '편지 내용',
    example: '임시저장 내용',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    required: false,
    isArray: true,
    description: '이미지 URL 배열',
    example: ['https://example.com/image1.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiProperty({
    required: false,
    description: 'BGM URL',
    example: 'https://example.com/music.mp3',
  })
  @IsString()
  @IsOptional()
  bgmUrl?: string;

  @ApiProperty({
    required: false,
    enum: Category,
    description: '편지 카테고리',
    example: 'TEXT',
  })
  @IsEnum(Category)
  @IsOptional()
  category?: Category;

  @ApiProperty({
    required: false,
    description: '수신자 ID',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  receiverId?: number;

  @ApiProperty({
    required: false,
    description: '예약 발송 시간',
    example: '2024-12-25',
  })
  @IsString()
  @IsOptional()
  scheduledAt?: string;

  @ApiProperty({
    required: false,
    description: '발신자 닉네임',
    example: '익명의 친구',
  })
  @IsString()
  @IsOptional()
  senderNickName?: string;
}
