import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { Roles, RolesGuard, UserRole } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SafeUser } from '../../database/schema/users';
import { UsersService } from './users.service';

class SetRoleDto {
  @IsString()
  @IsIn(['user', 'admin', 'master'])
  role!: UserRole;
}

/**
 * JWT 인증 기반 유저 관리 엔드포인트.
 * GET  /api/admin/users         → admin 이상 접근 가능
 * PATCH /api/admin/users/:id/role → master만 가능
 */
@Controller('admin/users')
@UseGuards(RolesGuard)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /api/admin/users?search=&page=&limit= */
  @Get()
  @Roles('admin')
  async listUsers(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const { data, total } = await this.usersService.listUsers({
      search: search?.trim() || undefined,
      page: pageNum,
      limit: limitNum,
    });
    return {
      data,
      meta: { total, page: pageNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  /** PATCH /api/admin/users/:id/role */
  @Patch(':id/role')
  @Roles('master')
  @HttpCode(HttpStatus.OK)
  async setRole(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: SetRoleDto,
    @CurrentUser() caller: SafeUser,
  ) {
    // master가 자신의 역할을 강등하는 것 방지
    if (caller.id === id && body.role !== 'master') {
      throw new ForbiddenException('자신의 master 권한은 해제할 수 없습니다');
    }
    const updated = await this.usersService.setUserRole(id, body.role);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }
}
