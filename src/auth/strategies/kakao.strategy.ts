import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { AuthService } from '../auth.service';
import * as devConfig from '../../../dev.json';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      clientID: devConfig.KAKAO_CLIENT_ID,
      clientSecret: devConfig.KAKAO_CLIENT_SECRET,
      callbackURL: devConfig.KAKAO_CALLBACK_URL,
      scope: ['account_email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const { id, username, _json } = profile;
    const email = _json?.kakao_account?.email;

    if (!email) {
      throw new Error('이메일 제공에 동의해주세요.');
    }

    const user = await this.authService.findOrCreateKakaoUser({
      kakaoId: id,
      email,
      nickname: username || `사용자${id}`,
    });

    return user;
  }
}
