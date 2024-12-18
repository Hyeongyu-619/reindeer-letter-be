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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
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

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Omit<User, 'password'>, response: Response) {
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
        nickName: user.nickName,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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
    // DB에서 refresh token 제거
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
      },
    });

    return {
      message: '로그아웃 되었습니다.',
    };
  }

  async register(email: string, password: string, nickName: string) {
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
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickName,
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
    // 6자리 랜덤 코드 생성
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 10분 후 만료
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 기존 인증 정보가 있다면 업데이트, 없다면 생성
    await this.prisma.emailVerification.upsert({
      where: { email },
      update: { code, expiresAt, verified: false },
      create: { email, code, expiresAt },
    });

    // 인증 메일 발송
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
}
