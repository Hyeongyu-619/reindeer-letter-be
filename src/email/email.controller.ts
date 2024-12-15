import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from './email.service';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

class TestEmailDto {
  @ApiProperty({
    example: 'test@example.com',
    description: '테스트 이메일을 받을 주소',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @ApiOperation({
    summary: '이메일 발송 테스트',
    description: '지정된 이메일 주소로 테스트 메일을 발송합니다.',
  })
  @ApiBody({
    type: TestEmailDto,
    description: '테스트 이메일 정보',
  })
  @ApiResponse({
    status: 200,
    description: '이메일 발송 성공',
    schema: {
      example: {
        success: true,
        message: '이메일이 성공적으로 발송되었습니다.',
      },
    },
  })
  @Post('test')
  async testEmail(@Body() { email }: TestEmailDto) {
    await this.emailService.sendLetterNotification(
      email,
      '테스트 편지입니다 🎅',
    );
    return {
      success: true,
      message: '이메일이 성공적으로 발송되었습니다.',
    };
  }
}
