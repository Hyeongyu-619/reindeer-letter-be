import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import * as devConfig from '../../dev.json';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || devConfig.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    KakaoStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
