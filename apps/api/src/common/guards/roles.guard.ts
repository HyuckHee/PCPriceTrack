import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SafeUser } from '../../database/schema/users';

export type UserRole = 'user' | 'admin' | 'master';

/** 숫자 레벨: master(2) ≥ admin(1) ≥ user(0) */
const ROLE_LEVEL: Record<UserRole, number> = {
  user: 0,
  admin: 1,
  master: 2,
};

export const ROLES_KEY = 'roles';

/**
 * @Roles('admin') → role이 admin 이상(admin, master)인 유저만 허용
 * @Roles('master') → master 유저만 허용
 */
export const Roles = (minRole: UserRole) => SetMetadata(ROLES_KEY, minRole);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const minRole = this.reflector.getAllAndOverride<UserRole>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!minRole) return true;

    const req = context.switchToHttp().getRequest<Request & { user: SafeUser }>();
    const userRole = (req.user?.role as UserRole) ?? 'user';

    return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
  }
}
