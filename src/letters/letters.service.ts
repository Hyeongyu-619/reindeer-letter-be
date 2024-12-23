import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLetterDto } from './dto/create-letter.dto';
import { S3Service } from '../s3/s3.service';
import { Express } from 'express';
import { EmailService } from '../email/email.service';
import { SaveDraftLetterDto } from './dto/save-draft-letter.dto';
import { Category } from '@prisma/client';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as devConfig from '../../dev.json';

@Injectable()
export class LettersService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private emailService: EmailService,
  ) {}

  async create(createLetterDto: CreateLetterDto, userId?: number) {
    const {
      receiverId,
      scheduledAt,
      senderNickName,
      imageUrls,
      audioUrl,
      ...letterData
    } = createLetterDto;

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
        imageUrls: imageUrls || [],
        senderNickname: senderNickName,
        scheduledAt: scheduledDate,
        isDelivered,
        ...(userId && {
          senderId: userId,
        }),
        receiverId,
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
    {
      page,
      limit,
      category,
    }: { page: number; limit: number; category?: Category },
  ) {
    const skip = (page - 1) * limit;

    const whereClause = {
      receiverId: userId,
      isDraft: false,
      ...(category && { category }),
    };

    const [items, total] = await Promise.all([
      this.prisma.letter.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          description: true,
          imageUrls: true,
          bgmUrl: true,
          category: true,
          isOpen: true,
          isDelivered: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          senderNickname: true,
          receiver: {
            select: {
              id: true,
              email: true,
              nickName: true,
              profileImageUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.letter.count({
        where: whereClause,
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

  // 내가 나에게 쓴 편지 목록 조회
  async getMyLettersToMyself(
    userId: number,
    options: { page: number; limit: number },
  ) {
    const skip = (options.page - 1) * options.limit;

    const [items, total] = await Promise.all([
      this.prisma.letter.findMany({
        where: {
          receiverId: userId,
          senderId: userId,
        },
        skip,
        take: options.limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          description: true,
          imageUrls: true,
          bgmUrl: true,
          category: true,
          isOpen: true,
          isDelivered: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          senderNickname: true,
        },
      }),
      this.prisma.letter.count({
        where: {
          receiverId: userId,
          senderId: userId,
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  async uploadImage(file: Express.Multer.File) {
    try {
      // 파일 MIME 타입 확인
      if (!file.mimetype.match(/(jpg|jpeg|png)/)) {
        throw new BadRequestException('지원하지 않는 이미지 형식입니다.');
      }

      const imageUrl = await this.s3Service.uploadFile(file, 'image');

      return { imageUrl };
    } catch (error) {
      console.error('Image upload failed:', error);
      throw new InternalServerErrorException(
        '이미지 업로드 중 오류가 발생했습니다: ' + error.message,
      );
    }
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

  async saveDraft(
    draftData: SaveDraftLetterDto,
    userId: number,
    draftId?: number,
  ) {
    if (draftId) {
      return this.prisma.letter
        .findFirst({
          where: {
            id: draftId,
            senderId: userId,
          },
        })
        .then((letter) => {
          if (!letter) {
            throw new NotFoundException('임시저장 편지를 찾을 수 없습니다.');
          }
          return this.prisma.letter.update({
            where: { id: draftId },
            data: {
              draftData: draftData as any,
              updatedAt: new Date(),
            },
          });
        });
    }

    return this.prisma.letter.create({
      data: {
        title: draftData.title || '임시저장',
        description: draftData.description || '',
        imageUrls: draftData.imageUrls || [],
        bgmUrl: draftData.bgmUrl || '',
        category: draftData.category || 'TEXT',
        senderNickname: draftData.senderNickName || '익명',
        senderId: userId,
        receiverId: draftData.receiverId || userId,
        isDraft: true,
        draftData: draftData as any,
      },
    });
  }

  async getDrafts(userId: number) {
    return this.prisma.letter.findMany({
      where: {
        senderId: userId,
        isDraft: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getDraft(draftId: number, userId: number) {
    const draft = await this.prisma.letter.findFirst({
      where: {
        id: draftId,
        senderId: userId,
        isDraft: true,
      },
    });

    if (!draft) {
      throw new NotFoundException('임시저장된 편지를 찾을 수 없습니다.');
    }

    return draft;
  }

  // 임시저장 편지 목록 조회 (페이지네이션)
  async getDraftLetters(
    userId: number,
    { page, limit }: { page: number; limit: number },
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.letter.findMany({
        where: {
          senderId: userId,
          isDraft: true,
        },
        select: {
          id: true,
          title: true,
          description: true,
          imageUrls: true,
          bgmUrl: true,
          category: true,
          draftData: true,
          createdAt: true,
          updatedAt: true,
          receiverId: true,
          senderNickname: true,
          receiver: {
            select: {
              nickName: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.letter.count({
        where: {
          senderId: userId,
          isDraft: true,
        },
      }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        receiverNickName: item.receiver?.nickName,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 카테고리별 편지 목록 조회
  async getLettersByCategory(
    userId: number,
    category: Category,
    { page, limit }: { page: number; limit: number },
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.letter.findMany({
        where: {
          receiverId: userId,
          category,
          isDraft: false,
          isDelivered: true,
        },
        select: {
          id: true,
          title: true,
          description: true,
          imageUrls: true,
          bgmUrl: true,
          category: true,
          isOpen: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          senderNickname: true,
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
          category,
          isDraft: false,
          isDelivered: true,
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

  async updateDraft(
    draftId: number,
    draftData: SaveDraftLetterDto,
    userId: number,
  ) {
    const draft = await this.prisma.letter.findFirst({
      where: {
        id: draftId,
        senderId: userId,
        isDraft: true,
      },
    });

    if (!draft) {
      throw new NotFoundException('임시저장된 편지를 찾을 수 없습니다.');
    }

    return this.prisma.letter.update({
      where: { id: draftId },
      data: {
        title: draftData.title || draft.title,
        description: draftData.description || draft.description,
        imageUrls: draftData.imageUrls || draft.imageUrls,
        bgmUrl: draftData.bgmUrl || draft.bgmUrl,
        category: draftData.category || draft.category,
        senderNickname: draftData.senderNickName || draft.senderNickname,
        receiverId: draftData.receiverId || draft.receiverId,
        draftData: draftData as any,
        updatedAt: new Date(),
      },
    });
  }

  async deleteDraft(draftId: number, userId: number) {
    const draft = await this.prisma.letter.findFirst({
      where: {
        id: draftId,
        senderId: userId,
        isDraft: true,
      },
    });

    if (!draft) {
      throw new NotFoundException('임시저장된 편지를 찾을 수 없습니다.');
    }

    return this.prisma.letter.delete({
      where: { id: draftId },
    });
  }

  async getBgmList() {
    try {
      const bucket = devConfig.AWS_S3_BUCKET;
      const prefix = 'bgm/';

      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      });

      const response = await this.s3Service.s3Client.send(command);

      const bgms =
        response.Contents?.map((item) => ({
          url: `https://${bucket}.s3.${devConfig.AWS_REGION}.amazonaws.com/${item.Key}`,
          name: item.Key?.replace(prefix, ''),
        })) || [];

      return { bgms };
    } catch (error) {
      console.error('BGM 목록 조회 에러:', error);
      throw new InternalServerErrorException(
        'BGM 목록을 가져오는데 실패했습니다.',
      );
    }
  }
}
