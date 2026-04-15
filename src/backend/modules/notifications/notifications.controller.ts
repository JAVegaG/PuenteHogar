import { Body, Controller, Put, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { UpdateNotificationPreferencesDto } from './application/dtos/update-preferences.dto';
import { UpdateNotificationPreferencesUseCase } from './application/use-cases/update-notification-preferences.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string; roles: string[] };
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly updatePreferencesUseCase: UpdateNotificationPreferencesUseCase,
  ) {}

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
