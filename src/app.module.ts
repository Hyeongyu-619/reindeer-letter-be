import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { LettersModule } from './letters/letters.module';
import { PrismaModule } from './prisma/prisma.module';
import { S3Module } from './s3/s3.module';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth/auth.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60, // 시간 윈도우 (초)
        limit: 10, // 허용되는 최대 요청 수
      },
    ]),
    AuthModule,
    LettersModule,
    PrismaModule,
    S3Module,
    UsersModule,
  ],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
