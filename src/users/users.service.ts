// src/users/users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
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
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  async findByIdWithoutPassword(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  async create(data: {
    email: string;
    password: string;
    nickname: string;
  }): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          password: data.password,
          nickName: data.nickname,
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
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }
}
