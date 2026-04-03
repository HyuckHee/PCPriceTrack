import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * x-admin-key 헤더로 인증하는 가드.
 * JWT 갱신 없이 영구 사용 가능한 관리자 API KEY 방식.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = req.headers['x-admin-key'];
    const secret = this.config.get<string>('ADMIN_SECRET');

    if (!secret) throw new UnauthorizedException('ADMIN_SECRET not configured');
    if (!key || key !== secret) throw new UnauthorizedException('Invalid admin key');

    return true;
  }
}
