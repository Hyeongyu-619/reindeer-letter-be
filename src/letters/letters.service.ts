import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLetterDto } from './dto/create-letter.dto';
import { S3Service } from '../s3/s3.service';
import { Express } from 'express';

@Injectable()
export class LettersService {
  constructor(private prisma: PrismaService, private s3Service: S3Service) {}

  async create(createLetterDto: CreateLetterDto) {
    const { receiverId, scheduledAt, ...letterData } = createLetterDto;
    return this.prisma.letter.create({
      data: {
        ...letterData,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        receiver: {
          connect: {
            id: receiverId,
          },
        },
      },
      include: {
        receiver: true,
      },
    });
  }

  async findOne(id: number, userId?: number) {
    const letter = await this.prisma.letter.findUnique({
      where: {
        id: id,
      },
      include: {
        receiver: true,
      },
    });

    if (!letter) {
      throw new NotFoundException('편지를 찾을 수 없습니다.');
    }

    // 수신자만 편지를 볼 수 있음
    if (letter.receiver.id !== userId) {
      throw new ForbiddenException('이 편지는 수신자만 볼 수 있습니다.');
    }

    return letter;
  }

  // 내가 받은 편지 목록 조회
  async getMyLetters(userId: number, { page = 1, limit = 10 }) {
    const now = new Date();
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.letter.findMany({
        where: {
          receiverId: userId,
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          receiver: true,
        },
        skip,
        take: limit,
      }),
      this.prisma.letter.count({
        where: {
          receiverId: userId,
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async uploadImage(file: Express.Multer.File) {
    const imageUrl = await this.s3Service.uploadFile(file, 'image');
    return { imageUrl };
  }

  async uploadVoice(file: Express.Multer.File) {
    const voiceUrl = await this.s3Service.uploadFile(file, 'audio');
    return { voiceUrl };
  }

  async processScheduledLetters() {
    const now = new Date();

    // 발송 예정 시간이 현재 시간보다 이전이고, 아직 처리되지 않은 편지들을 조회
    const scheduledLetters = await this.prisma.letter.findMany({
      where: {
        scheduledAt: {
          lte: now,
          not: null,
        },
        isDelivered: false,
      },
      include: {
        receiver: true,
      },
    });

    // 각 편지 처리
    const results = await Promise.all(
      scheduledLetters.map(async (letter) => {
        // 편지 상태 업데이트
        const updatedLetter = await this.prisma.letter.update({
          where: { id: letter.id },
          data: { isDelivered: true },
        });

        return updatedLetter;
      }),
    );

    return {
      processedCount: results.length,
      letters: results,
    };
  }
}
