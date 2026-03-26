import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SafeUser } from '../../database/schema/users';

@Controller('alerts')
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Post()
  create(@CurrentUser() user: SafeUser, @Body() dto: CreateAlertDto) {
    return this.alertsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: SafeUser) {
    return this.alertsService.findAll(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.alertsService.remove(user.id, id);
  }

  @Patch(':id/deactivate')
  deactivate(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.alertsService.deactivate(user.id, id);
  }
}
