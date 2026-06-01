import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '@src/shared/decorators/public.decorator';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { InitiatePaymentDto } from './application/dtos/initiate-payment.dto';
import { PaymentWebhookDto } from './application/dtos/payment-webhook.dto';
import { PaymentResponseDto } from './application/dtos/payment-response.dto';
import { PaymentUnitCardDto } from './application/dtos/payment-unit-card.dto';
import { PaymentDetailDto } from './application/dtos/payment-detail.dto';
import { PaymentHistoryQueryDto } from './application/dtos/payment-history-query.dto';
import { PaginatedPaymentHistoryDto } from './application/dtos/payment-history-item.dto';
import { GetPaymentHistoryUseCase } from './application/use-cases/get-payment-history.use-case';
import { GetPaymentUnitsUseCase } from './application/use-cases/get-payment-units.use-case';
import { GetPaymentHistoryByUnitUseCase } from './application/use-cases/get-payment-history-by-unit.use-case';
import { GetPaymentDetailUseCase } from './application/use-cases/get-payment-detail.use-case';
import { HandlePaymentWebhookUseCase } from './application/use-cases/handle-payment-webhook.use-case';
import { InitiatePaymentUseCase } from './application/use-cases/initiate-payment.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string; roles: string[] };
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly initiatePaymentUseCase: InitiatePaymentUseCase,
    private readonly getPaymentHistoryUseCase: GetPaymentHistoryUseCase,
    private readonly getPaymentUnitsUseCase: GetPaymentUnitsUseCase,
    private readonly getPaymentHistoryByUnitUseCase: GetPaymentHistoryByUnitUseCase,
    private readonly getPaymentDetailUseCase: GetPaymentDetailUseCase,
    private readonly handlePaymentWebhookUseCase: HandlePaymentWebhookUseCase,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get('units')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener unidades con pagos agrupados por propiedad', description: 'Retorna tarjetas de unidad agrupadas por propiedad para el arrendatario autenticado.' })
  @ApiOkResponse({ description: 'Lista de tarjetas de unidad con pagos pendientes', type: [PaymentUnitCardDto] })
  getUnits(@Req() req: AuthenticatedRequest) {
    return this.getPaymentUnitsUseCase.execute(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('units/:unitId/history')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener historial de pagos por unidad', description: 'Retorna el historial de pagos paginado y filtrado por estado para una unidad específica.' })
  @ApiOkResponse({ description: 'Historial de pagos paginado', type: PaginatedPaymentHistoryDto })
  @ApiForbiddenResponse({ description: 'El usuario no es arrendatario de esta unidad' })
  getUnitHistory(
    @Param('unitId') unitId: string,
    @Query() query: PaymentHistoryQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.getPaymentHistoryByUnitUseCase.execute(
      unitId,
      req.user.id,
      query.status ?? 'ALL',
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':paymentId/detail')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener detalle de un pago', description: 'Retorna el detalle completo de un pago programado, incluyendo desglose de ítems y datos de recibo para pagos realizados.' })
  @ApiOkResponse({ description: 'Detalle del pago', type: PaymentDetailDto })
  @ApiForbiddenResponse({ description: 'El usuario no es arrendatario del pago' })
  @ApiNotFoundResponse({ description: 'Pago programado no encontrado' })
  getPaymentDetail(
    @Param('paymentId') paymentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.getPaymentDetailUseCase.execute(paymentId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Iniciar pago del canon', description: 'Inicia el flujo de pago vía pasarela externa. Requiere rol TENANT.' })
  @ApiCreatedResponse({ description: 'Pago iniciado, retorna URL de redirección' })
  @ApiForbiddenResponse({ description: 'Solo arrendatarios pueden iniciar pagos' })
  @ApiNotFoundResponse({ description: 'Pago programado no encontrado' })
  initiate(@Body() dto: InitiatePaymentDto, @Req() req: AuthenticatedRequest) {
    return this.initiatePaymentUseCase.execute(dto, req.user.id, req.user.roles);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Consultar historial de pagos del usuario autenticado' })
  @ApiOkResponse({ description: 'Historial de pagos ordenado por fecha descendente', type: [PaymentResponseDto] })
  history(@Req() req: AuthenticatedRequest) {
    return this.getPaymentHistoryUseCase.execute(req.user.id);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Webhook de la pasarela de pagos', description: 'Endpoint interno para recibir confirmaciones de la pasarela.' })
  @ApiOkResponse({ description: 'Webhook procesado' })
  webhook(@Body() dto: PaymentWebhookDto) {
    return this.handlePaymentWebhookUseCase.execute(dto);
  }
}
