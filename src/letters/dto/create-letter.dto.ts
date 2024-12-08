import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  MaxLength,
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
    example: 'https://example.com/image.jpg',
    description: '이미지 URL',
  })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({
    example: 'https://example.com/music.mp3',
    description: 'BGM URL',
  })
  @IsString()
  @IsNotEmpty()
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
  @IsNotEmpty()
  @IsNumber()
  receiverId: number;

  @ApiProperty({
    example: false,
    description: '공개 여부',
  })
  @IsBoolean()
  isOpen: boolean;

  @ApiProperty({
    example: '2025-01-01T12:00:00',
    description: '예약 발송 시간',
  })
  @IsNumber()
  scheduledAt?: Date;

  @ApiProperty({
    example: '익명의 친구',
    description: '발신자 닉네임',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  senderNickName: string;
}
