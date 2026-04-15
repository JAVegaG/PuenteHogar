import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '@src/shared/decorators/public.decorator';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { InitiatePaymentDto } from './application/dtos/initiate-payment.dto';
import { PaymentWebhookDto } from './application/dtos/payment-webhook.dto';
import { PaymentResponseDto } from './application/dtos/payment-response.dto';
import { GetPaymentHistoryUseCase } from './application/use-cases/get-payment-history.use-case';
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
    private readonly handlePaymentWebhookUseCase: HandlePaymentWebhookUseCase,
  ) {}

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
