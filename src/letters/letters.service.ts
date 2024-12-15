import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLetterDto } from './dto/create-letter.dto';
import { S3Service } from '../s3/s3.service';
import { Express } from 'express';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class LettersService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private emailService: EmailService,
  ) {}

  async create(createLetterDto: CreateLetterDto) {
    const { receiverId, scheduledAt, senderNickName, ...letterData } =
      createLetterDto;

    let scheduledDate = null;
    let isDelivered = true;

    if (scheduledAt) {
      scheduledDate = new Date(scheduledAt);
      scheduledDate.setHours(0, 0, 0, 0);

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (scheduledDate > now) {
        isDelivered = false;
      }
    }

    return this.prisma.letter.create({
      data: {
        ...letterData,
        senderNickName,
        scheduledAt: scheduledDate,
        isDelivered,
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

    // 아직 배달되지 않은 편지인 경우
    if (!letter.isDelivered) {
      throw new ForbiddenException('아직 열람할 수 없는 편지입니다.');
    }

    // 처음 읽는 경우 isOpen을 true로 변경
    if (!letter.isOpen) {
      await this.prisma.letter.update({
        where: { id: letter.id },
        data: { isOpen: true },
      });
    }

    return letter;
  }

  // 내가 받은 편지 목록 조회
  async getMyLetters(
    userId: number,
    { page, limit }: { page: number; limit: number },
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.letter.findMany({
        where: {
          receiverId: userId,
          isDelivered: true,
        },
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          bgmUrl: true,
          category: true,
          isOpen: true,
          isDelivered: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          senderNickName: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.letter.count({
        where: {
          receiverId: userId,
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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

    const results = await Promise.all(
      scheduledLetters.map(async (letter) => {
        const updatedLetter = await this.prisma.letter.update({
          where: { id: letter.id },
          data: {
            isDelivered: true,
          },
        });

        // 이메일 발송
        try {
          await this.emailService.sendLetterNotification(
            letter.receiver.email,
            letter.title,
          );
        } catch (error) {
          console.error(`편지 ID ${letter.id} 이메일 발송 실패:`, error);
        }

        return updatedLetter;
      }),
    );

    return {
      processedCount: results.length,
      letters: results,
    };
  }
}
