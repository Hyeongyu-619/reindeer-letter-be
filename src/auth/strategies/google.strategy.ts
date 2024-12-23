import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import * as devConfig from '../../../dev.json';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      clientID: devConfig.GOOGLE_CLIENT_ID,
      clientSecret: devConfig.GOOGLE_CLIENT_SECRET,
      callbackURL: devConfig.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
  ) {
    const { id, emails, displayName } = profile;
    const email = emails[0].value;

    const user = await this.authService.findOrCreateGoogleUser({
      googleId: id,
      email,
      nickname: displayName || `사용자${id}`,
    });

    if (user.isNewUser) {
      return user;
    }

    return {
      id: user.user.id,
      email: user.user.email,
      nickName: user.user.nickName,
      profileImageUrl: user.user.profileImageUrl,
    };
  }
}
