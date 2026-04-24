import { Controller, Get, Patch, Put, Body, Param, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { InAppNotificationDto } from './application/dtos/in-app-notification.dto';
import { NotificationCountDto } from './application/dtos/notification-count.dto';
import { PreferencesGroupedDto } from './application/dtos/preferences-grouped.dto';
import { UpdateNotificationPreferencesDto } from './application/dtos/update-preferences.dto';
import { GetNotificationsUseCase } from './application/use-cases/get-notifications.use-case';
import { GetNotificationCountUseCase } from './application/use-cases/get-notification-count.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read.use-case';
import { GetNotificationPreferencesUseCase } from './application/use-cases/get-notification-preferences.use-case';
import { UpdateNotificationPreferencesUseCase } from './application/use-cases/update-notification-preferences.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string; roles: string[] };
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
    private readonly getNotificationCountUseCase: GetNotificationCountUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
    private readonly getNotificationPreferencesUseCase: GetNotificationPreferencesUseCase,
    private readonly updatePreferencesUseCase: UpdateNotificationPreferencesUseCase,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Listar notificaciones in-app del usuario autenticado' })
  @ApiOkResponse({ description: 'Lista de notificaciones', type: [InAppNotificationDto] })
  getNotifications(@Req() req: AuthenticatedRequest) {
    return this.getNotificationsUseCase.execute(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('count')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener conteo de notificaciones no leídas del usuario autenticado' })
  @ApiOkResponse({ description: 'Conteo de no leídas', type: NotificationCountDto })
  getNotificationCount(@Req() req: AuthenticatedRequest) {
    return this.getNotificationCountUseCase.execute(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Marcar todas las notificaciones del usuario como leídas' })
  @ApiOkResponse({ description: 'Cantidad de notificaciones actualizadas' })
  markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.markAllNotificationsReadUseCase.execute(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  @ApiOkResponse({ description: 'Notificación actualizada', type: InAppNotificationDto })
  @ApiNotFoundResponse({ description: 'Notificación no encontrada' })
  markAsRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.markNotificationReadUseCase.execute(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener preferencias de notificación agrupadas por tipo' })
  @ApiOkResponse({ description: 'Preferencias agrupadas', type: [PreferencesGroupedDto] })
  getPreferences(@Req() req: AuthenticatedRequest) {
    return this.getNotificationPreferencesUseCase.execute(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('preferences')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Actualizar preferencias de notificación del usuario autenticado' })
  @ApiOkResponse({ description: 'Preferencias actualizadas' })
  @ApiNotFoundResponse({ description: 'Tipo de notificación no encontrado' })
  updatePreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.updatePreferencesUseCase.execute(req.user.id, dto);
  }
}
