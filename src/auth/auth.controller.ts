import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto, RegisterDto } from './dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: '회원가입 API',
    description: '회원가입을 진행한다.',
  })
  @ApiResponse({
    status: 201,
    description: '회원가입 성공',
    schema: {
      example: {
        id: 10,
        email: 'user1@example.com',
        nickname: 'johndoe1',
        role: 'USER',
        createdAt: '2024-11-23T07:59:45.179Z',
        updatedAt: '2024-11-23T07:59:45.179Z',
        deletedAt: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
    schema: {
      example: {
        message: [
          'email should not be empty',
          'email must be an email',
          'password must be shorter than or equal to 20 characters',
          'password must be longer than or equal to 8 characters',
          'password should not be empty',
          'password must be a string',
          'nickname must be shorter than or equal to 20 characters',
          'nickname must be longer than or equal to 2 characters',
          'nickname should not be empty',
          'nickname must be a string',
        ],
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '회원가입 실패 Conflict',
    schema: {
      example: {
        message: 'Email or nickname already exists',
        error: 'Conflict',
        statusCode: 409,
      },
    },
  })
  @ApiBody({ type: RegisterDto })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const { email, password, nickname } = registerDto;
    return this.authService.register(email, password, nickname);
  }

  @ApiOperation({
    summary: '로그인 API',
    description: '이메일과 비밀번호로 로그인을 진행한다.',
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
