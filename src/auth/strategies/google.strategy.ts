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
      callbackURL: 'http://localhost:3000/auth/google/callback',
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
    const code = req.query.code;

    const user = await this.authService.findOrCreateGoogleUser({
      googleId: id,
      email,
      nickname: displayName || `사용자${id}`,
      code,
    });

    return user;
  }
}
