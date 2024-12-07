import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsBoolean, IsNotEmpty } from 'class-validator';
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
    description: '사용자 ID',
  })
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    example: false,
    description: '공개 여부',
  })
  @IsBoolean()
  isOpen: boolean;
}
