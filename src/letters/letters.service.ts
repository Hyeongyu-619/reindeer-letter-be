import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLetterDto } from './dto/create-letter.dto';

@Injectable()
export class LettersService {
  constructor(private prisma: PrismaService) {}

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
  async getMyLetters(userId: number) {
    const now = new Date();
    return this.prisma.letter.findMany({
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
    });
  }
}
