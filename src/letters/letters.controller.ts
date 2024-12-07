import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LettersService } from './letters.service';
import { CreateLetterDto } from './dto/create-letter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Letters')
@Controller('letters')
export class LettersController {
  constructor(private readonly lettersService: LettersService) {}

  @ApiOperation({
    summary: '편지 작성 API',
    description: '새로운 편지를 작성합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '편지 작성 성공',
  })
  @Post()
  create(@Body() createLetterDto: CreateLetterDto) {
    return this.lettersService.create(createLetterDto);
  }

  @ApiOperation({
    summary: '특정 편지 조회 API',
    description: '특정 ID의 편지를 조회합니다.',
  })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.lettersService.findOne(+id, req.user.userId);
  }

  @ApiOperation({
    summary: '내 편지 목록 조회 API',
    description: '자신이 작성한 편지 목록을 조회합니다.',
  })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: 200,
    description: '편지 목록 조회 성공',
    schema: {
      example: [
        {
          id: 1,
          title: '사랑하는 친구에게',
          description: '오랜만에 연락하네...',
          imageUrl: 'https://example.com/image.jpg',
          bgmUrl: 'https://example.com/music.mp3',
          category: 'TEXT',
          isOpen: false,
          createdAt: '2024-03-14T12:00:00.000Z',
          updatedAt: '2024-03-14T12:00:00.000Z',
          userId: 1,
        },
      ],
    },
  })
  @UseGuards(JwtAuthGuard)
  @Get('my/letters')
  getMyLetters(@Request() req) {
    return this.lettersService.getMyLetters(req.user.userId);
  }
}
