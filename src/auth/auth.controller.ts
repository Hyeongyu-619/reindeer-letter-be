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
import {
  AntlerType,
  getReindeerImageUrl,
  MufflerColor,
  ReindeerSkin,
} from '../constants/reindeer-images';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import * as devConfig from '../../dev.json';

interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    isNewUser?: boolean;
    userData?: {
      googleId: string;
      email: string;
      nickname: string;
    };
  } & Partial<Omit<User, 'password'>>;
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
        profileImageUrl: 'https://example.com/images/profile.jpg',
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
    const { email, password, nickname, skinColor, antlerType, mufflerColor } =
      registerDto;
    return this.authService.register(
      email,
      password,
      nickname,
      skinColor,
      antlerType,
      mufflerColor,
    );
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
    console.log('Logout request:', req.user);

    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('인증 정보가 없습니다.');
    }

    try {
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      const result = await this.authService.logout(req.user.id);
      return result;
    } catch (error) {
      console.error('Logout controller error:', error);
      throw error;
    }
  }

  @ApiOperation({
    summary: '이메일 인증 코드 발송 API',
    description: '회원가입을 위한 이메일 인증 코드를 발송합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'test@example.com',
          description: '인증코드를 받을 이메일 주소',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '인증 코드 발송 성공',
    schema: {
      example: {
        message: '인증 코드가 이메일로 발송되었습니다.',
      },
    },
  })
  @Post('send-verification')
  async sendVerification(@Body('email') email: string) {
    return this.authService.sendVerificationCode(email);
  }

  @ApiOperation({
    summary: '이메일 인증 코드 확인 API',
    description: '송된 이메일 인증 코드를 확인합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'test@example.com',
          description: '인증받을 이메일 주소',
        },
        code: {
          type: 'string',
          example: 'ABC123',
          description: '수신한 6자리 인증 코드',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '인증 성공',
    schema: {
      example: {
        verified: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 인증 코드 또는 만료된 코드',
    schema: {
      example: {
        statusCode: 400,
        message: '잘못된 인증 코드 또는 만료된 코드입니다.',
      },
    },
  })
  @Post('verify-email')
  async verifyEmail(@Body('email') email: string, @Body('code') code: string) {
    return this.authService.verifyEmail(email, code);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '프로필 정보 조회 API',
    description: '본인의 프로필 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '프로필 정보 조회 성공',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        nickName: 'johndoe',
        profileImageUrl: 'https://example.com/images/profile.jpg',
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: RequestWithUser) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('사용자 정보를 찾을 수 없습니다.');
    }
    return this.authService.getProfile(userId);
  }

  @ApiOperation({
    summary: '순록 미리보기 API',
    description: '선택한 옵션에 따라 순록 이미지를 미리보기합니다.',
  })
  @ApiQuery({
    name: 'skinColor',
    required: true,
    description: '순록 스킨 색상',
  })
  @ApiQuery({
    name: 'antlerType',
    required: true,
    description: '뿔 타입',
  })
  @ApiQuery({
    name: 'mufflerColor',
    required: true,
    description: '목도리 색상',
  })
  @ApiResponse({
    status: 200,
    description: '미리보기 이미지 URL',
    schema: {
      example: {
        imageUrl: 'https://example.com/images/reindeer_preview.jpg',
      },
    },
  })
  @Get('reindeer-preview')
  async getReindeerPreview(
    @Query('skinColor') skinColor: ReindeerSkin,
    @Query('antlerType') antlerType: AntlerType,
    @Query('mufflerColor') mufflerColor: MufflerColor,
  ) {
    return this.authService.getReindeerPreview(
      skinColor,
      antlerType,
      mufflerColor,
    );
  }

  @Get('kakao')
  @UseGuards(KakaoAuthGuard)
  @ApiOperation({
    summary: '카카오 로그인 API',
    description: '카카오 OAuth를 통한 로그인을 시작합니다.',
  })
  async kakaoLogin() {
    // 카카오 로그인 페이지로 리다이렉트
  }

  @Get('kakao/callback')
  @UseGuards(KakaoAuthGuard)
  @ApiOperation({
    summary: '카카오 로그인 콜백 API',
    description: '카카오 OAuth 인증 후 처리를 담당합니다.',
  })
  async kakaoLoginCallback(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user } = req;
    if (!user) {
      throw new UnauthorizedException('카카오 인증에 실패했습니다.');
    }

    if ('isNewUser' in user && user.isNewUser) {
      return {
        isNewUser: true,
        userData: user.userData,
      };
    }

    return this.authService.login(user, res);
  }

  @Post('kakao/register')
  async registerKakaoUser(
    @Body()
    registerDto: {
      kakaoId: string;
      email: string;
      additionalData: {
        nickname: string;
        skinColor: ReindeerSkin;
        antlerType: AntlerType;
        mufflerColor: MufflerColor;
      };
    },
  ) {
    return this.authService.registerKakaoUser(
      registerDto.kakaoId,
      registerDto.email,
      registerDto.additionalData,
    );
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: '구글 로그인 API',
    description: '구글 OAuth를 통한 로그인을 시작합니다.',
  })
  async googleLogin() {
    // 구글 로그인 페이지로 리다이렉트
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleLoginCallback(
    @Request() req: RequestWithUser,
    @Res() res: Response,
  ) {
    try {
      const { user } = req;
      console.log('Google Callback - Received user:', user);

      if (!user) {
        throw new UnauthorizedException('구글 인증에 실패했습니다.');
      }

      if ('isNewUser' in user && user.isNewUser) {
        const redirectUrl = new URL('/profile', devConfig.FRONTEND_URL);
        redirectUrl.searchParams.set('userData', JSON.stringify(user.userData));
        console.log('Redirecting new user to:', redirectUrl.toString());
        return res.redirect(redirectUrl.toString());
      }

      const loginResult = await this.authService.login(user, res);
      const redirectUrl = new URL('/home', devConfig.FRONTEND_URL);
      redirectUrl.searchParams.set('token', loginResult.access_token);
      redirectUrl.searchParams.set('userId', user.id.toString());
      redirectUrl.searchParams.set('nickName', user.nickName);
      console.log('Redirecting existing user to:', redirectUrl.toString());
      return res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Google callback error:', error);
      return res.redirect(`${devConfig.FRONTEND_URL}/login?error=auth`);
    }
  }

  @Post('google/register')
  async registerGoogleUser(
    @Body()
    registerDto: {
      googleId: string;
      email: string;
      additionalData: {
        nickname: string;
        skinColor: ReindeerSkin;
        antlerType: AntlerType;
        mufflerColor: MufflerColor;
      };
    },
  ) {
    return this.authService.registerGoogleUser(
      registerDto.googleId,
      registerDto.email,
      registerDto.additionalData,
    );
  }
}
