import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { Public } from '@src/shared/decorators/public.decorator';
import { InitiateSigningDto } from './application/dtos/initiate-signing.dto';
import { SigningWebhookDto } from './application/dtos/signing-webhook.dto';
import { UploadContractDto } from './application/dtos/upload-contract.dto';
import { ContractSummaryDto } from './application/dtos/contract-summary.dto';
import { GetContractSummaryUseCase } from './application/use-cases/get-contract-summary.use-case';
import { HandleSigningWebhookUseCase } from './application/use-cases/handle-signing-webhook.use-case';
import { InitiateSigningUseCase } from './application/use-cases/initiate-signing.use-case';
import { UploadContractUseCase } from './application/use-cases/upload-contract.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string; roles: string[] };
}

@ApiTags('contracts')
@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly uploadContractUseCase: UploadContractUseCase,
    private readonly getContractSummaryUseCase: GetContractSummaryUseCase,
    private readonly initiateSigningUseCase: InitiateSigningUseCase,
    private readonly handleSigningWebhookUseCase: HandleSigningWebhookUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cargar contrato', description: 'Sube un contrato PDF asociado a un lease. Requiere rol LANDLORD.' })
  @ApiCreatedResponse({ description: 'Contrato creado', type: ContractSummaryDto })
  @ApiForbiddenResponse({ description: 'No tienes permiso sobre este lease' })
  @ApiUnprocessableEntityResponse({ description: 'Solo se permiten archivos PDF o el archivo supera 10 MB' })
  upload(@Body() dto: UploadContractDto, @Req() req: AuthenticatedRequest) {
    return this.uploadContractUseCase.execute(dto, req.user.id, req.user.roles);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener resumen del contrato' })
  @ApiOkResponse({ description: 'Resumen del contrato con partes y URL del documento', type: ContractSummaryDto })
  @ApiForbiddenResponse({ description: 'No eres parte de este contrato' })
  @ApiNotFoundResponse({ description: 'Contrato no encontrado' })
  getSummary(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.getContractSummaryUseCase.execute(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/sign')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Iniciar proceso de firma digital' })
  @ApiOkResponse({ description: 'Proceso de firma iniciado' })
  @ApiForbiddenResponse({ description: 'No eres parte de este contrato' })
  initiateSigning(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const dto = new InitiateSigningDto();
    dto.contractId = id;
    return this.initiateSigningUseCase.execute(dto, req.user.id);
  }

  @Public()
  @Post('webhook/signing')
  @ApiOperation({ summary: 'Webhook del proveedor de firma', description: 'Endpoint interno para recibir confirmaciones del proveedor de firma electrónica.' })
  @ApiOkResponse({ description: 'Webhook procesado' })
  handleWebhook(@Body() dto: SigningWebhookDto) {
    return this.handleSigningWebhookUseCase.execute(dto);
  }
}