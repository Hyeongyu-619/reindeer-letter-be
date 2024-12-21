import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import { EmailService } from '../email/email.service';
import {
  AntlerType,
  getReindeerImageUrl,
  MufflerColor,
  ReindeerSkin,
} from '../constants/reindeer-images';

interface RequestWithUser extends Request {
  user: {
    userId: number;
    email: string;
  };
}

interface KakaoUserDto {
  kakaoId: string;
  email: string;
  nickname: string;
}

interface GoogleUserDto {
  googleId: string;
  email: string;
  nickname: string;
}

interface GoogleUser {
  id: number;
  email: string;
  isNewUser?: boolean;
  userData?: {
    googleId: string;
    email: string;
    nickname: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      console.log('Login attempt:', { email });

      const user = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          nickName: true,
          profileImageUrl: true,
          createdAt: true,
          updatedAt: true,
          refreshToken: true,
        },
      });

      console.log('User found:', !!user);

      if (user && user.password) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Password valid:', isPasswordValid);

        if (isPasswordValid) {
          const { password: _, ...result } = user;
          return result;
        }
      }
      return null;
    } catch (error) {
      console.error('validateUser error:', error);
      throw error;
    }
  }

  async login(user: GoogleUser | Omit<User, 'password'>, response: Response) {
    // 새로운 사용자인 경우 처리
    if ('isNewUser' in user && user.isNewUser) {
      return {
        isNewUser: true,
        userData: user.userData,
      };
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        nickName: 'nickName' in user ? user.nickName : undefined,
        profileImageUrl:
          'profileImageUrl' in user ? user.profileImageUrl : undefined,
        createdAt: 'createdAt' in user ? user.createdAt : undefined,
        updatedAt: 'updatedAt' in user ? user.updatedAt : undefined,
        refreshToken: refreshToken,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      // Refresh Token 검증
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
      }

      // 새로운 토큰 발급
      const newPayload = { sub: user.id, email: user.email };
      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: '1h',
      });
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: '7d',
      });

      // 새로운 Refresh Token을 DB에 저장
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
      });

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('토큰 갱신에 실패했습니다.');
    }
  }

  async logout(userId: number) {
    if (!userId) {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    try {
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          refreshToken: null,
        },
      });

      return {
        message: '로그아웃 되었습니다.',
      };
    } catch (error) {
      console.error('Logout error:', error);
      throw new UnauthorizedException('로그아웃 처리 중 오류가 발생했습니다.');
    }
  }

  async register(
    email: string,
    password: string,
    nickName: string,
    skinColor: ReindeerSkin,
    antlerType: AntlerType,
    mufflerColor: MufflerColor,
  ) {
    // 이메일 인증 확인
    const verification = await this.prisma.emailVerification.findUnique({
      where: { email },
    });

    if (!verification || !verification.verified) {
      throw new BadRequestException('이메일 인증이 필요합니다.');
    }

    // 이메일 중복 체크
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // 닉네임 중복 체크
    const existingNickname = await this.prisma.user.findFirst({
      where: { nickName },
    });
    if (existingNickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    // 비밀번호 해시화 및 사용자 생성
    const hashedPassword = await bcrypt.hash(password, 10);
    const profileImageUrl = getReindeerImageUrl({
      skinColor,
      antlerType,
      mufflerColor,
    });

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickName,
        profileImageUrl,
        refreshToken: null,
      },
      select: {
        id: true,
        email: true,
        nickName: true,
        profileImageUrl: true,
        createdAt: true,
        updatedAt: true,
        refreshToken: true,
      },
    });

    return user;
  }

  async checkEmailDuplicate(email: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    return { available: true };
  }

  async checkNicknameDuplicate(nickName: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: { nickName },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    return { available: true };
  }

  async sendVerificationCode(email: string) {
    // 먼저 이메일 중복 검사
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // 6자리 랜덤 코드 생성
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.emailVerification.upsert({
      where: { email },
      update: { code, expiresAt, verified: false },
      create: { email, code, expiresAt },
    });

    await this.emailService.sendVerificationEmail(email, code);

    return { message: '인증 코드가 이메일로 발송되었습니다.' };
  }

  async verifyEmail(email: string, code: string) {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { email },
    });

    if (!verification) {
      throw new NotFoundException('인증 정보를 찾을 수 없습니다.');
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('인증 코드가 만료되었습니다.');
    }

    if (verification.code !== code) {
      throw new BadRequestException('잘못된 인증 코드입니다.');
    }

    await this.prisma.emailVerification.update({
      where: { email },
      data: { verified: true },
    });

    return { verified: true };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickName: true,
        profileImageUrl: true,
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  async getReindeerPreview(
    skinColor: ReindeerSkin,
    antlerType: AntlerType,
    mufflerColor: MufflerColor,
  ) {
    const imageUrl = getReindeerImageUrl({
      skinColor,
      antlerType,
      mufflerColor,
    });

    return { imageUrl };
  }

  async findOrCreateKakaoUser(kakaoUserDto: KakaoUserDto) {
    const { kakaoId, email, nickname } = kakaoUserDto;

    // 기존 유저 찾기
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ kakaoId }, { email }],
      },
    });

    if (existingUser) {
      // 기존 유저는 바로 로그인 처리
      const tokens = await this.generateToken(existingUser);
      return {
        isNewUser: false,
        user: existingUser,
        ...tokens,
      };
    }

    // 새로운 유저는 추가 정보 입력이 필요
    return {
      isNewUser: true,
      userData: {
        kakaoId,
        email,
        nickname,
      },
    };
  }

  // 소셜 회원가입용 새로운 메소드
  async registerKakaoUser(
    kakaoId: string,
    email: string,
    additionalData: {
      nickname: string;
      skinColor: ReindeerSkin;
      antlerType: AntlerType;
      mufflerColor: MufflerColor;
    },
  ) {
    const profileImageUrl = getReindeerImageUrl({
      skinColor: additionalData.skinColor,
      antlerType: additionalData.antlerType,
      mufflerColor: additionalData.mufflerColor,
    });

    const user = await this.prisma.user.create({
      data: {
        email,
        kakaoId,
        nickName: additionalData.nickname,
        password: '', // 소셜 로그인은 비밀번호 불필요
        profileImageUrl,
      },
      select: {
        id: true,
        email: true,
        nickName: true,
        profileImageUrl: true,
        createdAt: true,
        updatedAt: true,
        refreshToken: true,
        kakaoId: true,
      },
    });

    const tokens = await this.generateToken(user);
    return {
      user,
      ...tokens,
    };
  }

  private async generateToken(user: any) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async findOrCreateGoogleUser(googleUserDto: GoogleUserDto) {
    const { googleId, email, nickname } = googleUserDto;

    // 기존 사용자 찾기
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (existingUser) {
      // 기존 사용자는 바로 로그인
      return {
        isNewUser: false,
        user: existingUser,
      };
    }

    // 새로운 사용자는 추가 정보 입력 필요
    return {
      isNewUser: true,
      userData: {
        googleId,
        email,
        nickname,
      },
    };
  }

  async registerGoogleUser(
    googleId: string,
    email: string,
    additionalData: {
      nickname: string;
      skinColor: ReindeerSkin;
      antlerType: AntlerType;
      mufflerColor: MufflerColor;
    },
  ) {
    const profileImageUrl = getReindeerImageUrl({
      skinColor: additionalData.skinColor,
      antlerType: additionalData.antlerType,
      mufflerColor: additionalData.mufflerColor,
    });

    const user = await this.prisma.user.create({
      data: {
        email,
        googleId,
        nickName: additionalData.nickname,
        password: '', // 소셜 로그인은 빈 문자열로 설정
        profileImageUrl,
      },
      select: {
        id: true,
        email: true,
        nickName: true,
        profileImageUrl: true,
        createdAt: true,
        updatedAt: true,
        refreshToken: true,
        googleId: true,
      },
    });

    return user;
  }
}
