import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { TransitionLeaseStateDto, LeaseStatusResponseDto, ActiveLeaseSummaryDto } from './application/dtos/lease-status.dto';
import { GetActiveLeasesSummaryUseCase } from './application/use-cases/get-active-leases-summary.use-case';
import { GetLeaseStatusUseCase } from './application/use-cases/get-lease-status.use-case';
import { TransitionLeaseStateUseCase } from './application/use-cases/transition-lease-state.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string; roles: string[] };
}

@ApiTags('tracking')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class RentalTrackingController {
  constructor(
    private readonly transitionLeaseStateUseCase: TransitionLeaseStateUseCase,
    private readonly getLeaseStatusUseCase: GetLeaseStatusUseCase,
    private readonly getActiveLeasesSummaryUseCase: GetActiveLeasesSummaryUseCase,
  ) {}

  @Post('leases/transition')
  @ApiOperation({ summary: 'Registrar transición de estado del lease' })
  @ApiOkResponse({ description: 'Transición registrada exitosamente' })
  @ApiForbiddenResponse({ description: 'No eres parte de este lease' })
  @ApiNotFoundResponse({ description: 'Lease no encontrado' })
  transition(@Body() dto: TransitionLeaseStateDto, @Req() req: AuthenticatedRequest) {
    return this.transitionLeaseStateUseCase.execute(dto, req.user.id);
  }

  @Get('leases/:leaseId/status')
  @ApiOperation({ summary: 'Obtener estado actual e historial del lease' })
  @ApiOkResponse({ description: 'Estado actual e historial de transiciones', type: LeaseStatusResponseDto })
  @ApiForbiddenResponse({ description: 'No eres parte de este lease' })
  @ApiNotFoundResponse({ description: 'Lease no encontrado' })
  getStatus(@Param('leaseId') leaseId: string, @Req() req: AuthenticatedRequest) {
    return this.getLeaseStatusUseCase.execute(leaseId, req.user.id);
  }

  @Get('leases/active')
  @ApiOperation({ summary: 'Obtener resumen de leases activos del usuario autenticado' })
  @ApiOkResponse({ description: 'Lista de leases activos con estado actual y fecha de último cambio', type: [ActiveLeaseSummaryDto] })
  getActive(@Req() req: AuthenticatedRequest) {
    return this.getActiveLeasesSummaryUseCase.execute(req.user.id);
  }
}
