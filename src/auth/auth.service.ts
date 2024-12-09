import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Omit<User, 'password'>) {
    const payload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nickName: user.nickName,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async register(email: string, password: string, nickName: string) {
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
      },
      select: {
        id: true,
        email: true,
        nickName: true,
        profileImageUrl: true,
        createdAt: true,
        updatedAt: true,
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
}
