import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  MaxLength,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Category } from '@prisma/client';

export class CreateLetterDto {
  @ApiProperty({
    example: '사랑하는 친구에게',
    description: '편지 제목',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: '오랜만에 연락하네...',
    description: '편지 내용',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    description: '이미지 URL 배열',
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls: string[];

  @ApiProperty({
    example: 'https://example.com/music.mp3',
    description: 'BGM URL',
  })
  @IsString()
  @IsOptional()
  bgmUrl: string;

  @ApiProperty({
    enum: Category,
    example: 'TEXT',
    description: '편지 카테고리',
  })
  @IsEnum(Category)
  category: Category;

  @ApiProperty({
    example: 1,
    description: '수신자 ID',
  })
  @IsOptional()
  @IsNumber()
  receiverId: number;

  @ApiProperty({
    example: false,
    description: '공개 여부',
  })
  @IsBoolean()
  isOpen: boolean;

  @ApiProperty({
    example: '2024-12-25',
    description: '예약 발송 시간 (YYYY-MM-DD 형식)',
    required: false,
  })
  @IsString()
  @IsOptional()
  scheduledAt?: string;

  @ApiProperty({
    example: '익명의 친구',
    description: '발신자 닉네임',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  senderNickName: string;

  @ApiProperty({
    example: 'https://example.com/audio.mp3',
    description: '음성 파일 URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  audioUrl?: string;
}
