import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const KakaoStrategy = require('passport-kakao').Strategy;
import { AuthService } from '../auth.service';

@Injectable()
export class KakaoOAuthStrategy extends PassportStrategy(KakaoStrategy, 'kakao') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('oauth.kakaoClientId') ?? 'KAKAO_CLIENT_ID',
      clientSecret: config.get<string>('oauth.kakaoClientSecret') ?? '',
      callbackURL: config.get<string>('oauth.kakaoCallbackUrl'),
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: any) {
    const email: string | undefined = profile._json?.kakao_account?.email;
    const name: string | undefined =
      profile.displayName || profile._json?.properties?.nickname;
    const avatarUrl: string | undefined =
      profile._json?.properties?.thumbnail_image;
    return this.authService.socialLogin({
      provider: 'kakao',
      providerId: String(profile.id),
      email,
      name,
      avatarUrl,
    });
  }
}
