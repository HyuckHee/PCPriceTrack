import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('oauth.googleClientId') ?? 'GOOGLE_CLIENT_ID',
      clientSecret: config.get<string>('oauth.googleClientSecret') ?? 'GOOGLE_CLIENT_SECRET',
      callbackURL: config.get<string>('oauth.googleCallbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const avatarUrl = profile.photos?.[0]?.value;
    return this.authService.socialLogin({
      provider: 'google',
      providerId: profile.id,
      email,
      name,
      avatarUrl,
    });
  }
}
