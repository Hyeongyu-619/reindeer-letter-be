import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import {
  ReindeerSkin,
  AntlerType,
  MufflerColor,
} from '../../constants/reindeer-images';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: '사용자 이메일',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: '비밀번호',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  password: string;

  @ApiProperty({
    example: 'johndoe',
    description: '닉네임',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  nickname: string;

  @ApiProperty({
    example: 'https://example.com/images/profile.jpg',
    description: '프로필 이미지 URL',
    required: false,
  })
  profileImageUrl?: string;

  @ApiProperty({
    enum: ['BROWN', 'WHITE'],
    description: '순록 스킨 색상',
  })
  @IsEnum(['BROWN', 'WHITE'])
  @IsNotEmpty()
  skinColor: ReindeerSkin;

  @ApiProperty({
    enum: ['OPTION-01', 'OPTION-02', 'OPTION-03'],
    description: '뿔 타입',
  })
  @IsEnum(['OPTION-01', 'OPTION-02', 'OPTION-03'])
  @IsNotEmpty()
  antlerType: AntlerType;

  @ApiProperty({
    enum: ['RED', 'GREEN', 'PURPLE'],
    description: '목도리 색상',
  })
  @IsEnum(['RED', 'GREEN', 'PURPLE'])
  @IsNotEmpty()
  mufflerColor: MufflerColor;
}
