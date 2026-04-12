import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SafeUser } from '../../database/schema/users';
import { AuthTokens } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { userId: string; refreshToken: string }) {
    if (!body.userId || !body.refreshToken) throw new UnauthorizedException();
    return this.authService.refresh(body.userId, body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: SafeUser) {
    await this.authService.logout(user.id);
  }

  @Get('me')
  me(@CurrentUser() user: SafeUser) {
    return user;
  }

  // ── Google OAuth ──────────────────────────────────────────────
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const { user, tokens } = req.user as { user: SafeUser; tokens: AuthTokens };
    const frontendUrl = this.config.get<string>('oauth.frontendUrl');
    res.redirect(
      `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}&uid=${user.id}`,
    );
  }

  // ── Kakao OAuth ───────────────────────────────────────────────
  @Public()
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  kakaoAuth() {}

  @Public()
  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  kakaoCallback(@Req() req: Request, @Res() res: Response) {
    const { user, tokens } = req.user as { user: SafeUser; tokens: AuthTokens };
    const frontendUrl = this.config.get<string>('oauth.frontendUrl');
    res.redirect(
      `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}&uid=${user.id}`,
    );
  }

  @Public()
  @Get('kakao/logout')
  kakaoLogout(@Res() res: Response) {
    const clientId = this.config.get<string>('oauth.kakaoClientId') ?? '';
    const frontendUrl = this.config.get<string>('oauth.frontendUrl');
    res.redirect(
      `https://kauth.kakao.com/oauth/logout?client_id=${clientId}&logout_redirect_uri=${frontendUrl}`,
    );
  }
}
