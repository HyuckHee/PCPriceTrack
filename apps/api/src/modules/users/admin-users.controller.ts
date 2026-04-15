import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { AdminKeyGuard } from '../../common/guards/admin-key.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { UsersService } from './users.service';

class SetRoleDto {
  @IsString()
  @IsIn(['user', 'admin'])
  role!: 'user' | 'admin';
}

/**
 * Admin-only user management endpoints.
 * x-admin-key 헤더로 인증 (JWT 불필요).
 */
@Public()
@Controller('admin/users')
@UseGuards(AdminKeyGuard)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /api/admin/users?search=&page=&limit= */
  @Get()
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
      meta: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /** PATCH /api/admin/users/:id/role */
  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  async setRole(
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: SetRoleDto,
  ) {
    const updated = await this.usersService.setUserRole(id, body.role);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }
}
