import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLetterDto } from './dto/create-letter.dto';

@Injectable()
export class LettersService {
  constructor(private prisma: PrismaService) {}

  async create(createLetterDto: CreateLetterDto) {
    const { userId, ...letterData } = createLetterDto;
    return this.prisma.letter.create({
      data: {
        ...letterData,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.letter.findMany({
      where: {
        isOpen: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.letter.findUnique({
      where: { id },
    });
  }

  async getMyLetters(userId: number) {
    return this.prisma.letter.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
