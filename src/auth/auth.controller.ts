import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  UnauthorizedException,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginDto, RegisterDto } from './dto';
import { Request as ExpressRequest } from 'express';
import { User } from '@prisma/client';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response } from 'express';
import { Cookies } from './decorators/cookies.decorator';

interface RequestWithUser extends Request {
  user: Omit<User, 'password'>;
}

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
  @ApiBody({ type: RegisterDto })
  @Throttle({ default: { limit: 5, ttl: 60 } })
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
  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60 } })
  @Post('login')
  async login(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('사용자 인증에 실패했습니다.');
    }
    return this.authService.login(req.user, res);
  }

  @ApiOperation({
    summary: '이메일 중복 확인 API',
    description: '회원가입 시 이메일 중복 여부를 확인합니다.',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    description: '확인할 이메일 주소',
  })
  @ApiResponse({
    status: 200,
    description: '사용 가능한 이메일',
    schema: {
      example: {
        available: true,
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '이미 사용 중인 이메일',
    schema: {
      example: {
        statusCode: 409,
        message: '이미 사용 중인 이메일입니다.',
        error: 'Conflict',
      },
    },
  })
  @Get('check-email')
  checkEmail(@Query('email') email: string) {
    return this.authService.checkEmailDuplicate(email);
  }

  @ApiOperation({
    summary: '닉네임 중복 확인 API',
    description: '회원가입 시 닉네임 중복 여부를 확인합니다.',
  })
  @ApiQuery({
    name: 'nickname',
    required: true,
    description: '확인할 닉네임',
  })
  @ApiResponse({
    status: 200,
    description: '사용 가능한 닉네임',
    schema: {
      example: {
        available: true,
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '이미 사용 중인 닉네임',
    schema: {
      example: {
        statusCode: 409,
        message: '이미 사용 중인 닉네임입니다.',
        error: 'Conflict',
      },
    },
  })
  @Get('check-nickname')
  checkNickname(@Query('nickname') nickname: string) {
    return this.authService.checkNicknameDuplicate(nickname);
  }

  @ApiOperation({
    summary: '로그아웃 API',
    description: '사용자 로그아웃을 처리합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공',
    schema: {
      example: {
        message: '로그아웃 되었습니다.',
      },
    },
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    // refresh_token 쿠키 제거
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    // DB에서 refresh token 제거
    return this.authService.logout(req.user.id);
  }
}
