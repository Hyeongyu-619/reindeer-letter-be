import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import * as devConfig from '../../../dev.json';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: devConfig.GOOGLE_CLIENT_ID,
      clientSecret: devConfig.GOOGLE_CLIENT_SECRET,
      callbackURL: devConfig.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile) {
    const { name, emails } = profile;
    const user = await this.authService.findOrCreateGoogleUser({
      googleId: profile.id,
      email: emails[0].value,
      nickname: name.givenName,
      code: null,
    });

    return user;
  }
}
