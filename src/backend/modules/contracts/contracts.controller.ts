import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { Public } from '@src/shared/decorators/public.decorator';
import { InitiateSigningDto } from './application/dtos/initiate-signing.dto';
import { LandlordContractListItemDto } from './application/dtos/landlord-contract-list-item.dto';
import { TenantContractListItemDto } from './application/dtos/tenant-contract-list-item.dto';
import { SigningWebhookDto } from './application/dtos/signing-webhook.dto';
import { CreateContractDto } from './application/dtos/create-contract.dto';
import { ContractSummaryDto } from './application/dtos/contract-summary.dto';
import { GetContractSummaryUseCase } from './application/use-cases/get-contract-summary.use-case';
import { GetLandlordContractsUseCase } from './application/use-cases/get-landlord-contracts.use-case';
import { GetTenantContractsUseCase } from './application/use-cases/get-tenant-contracts.use-case';
import { HandleSigningWebhookUseCase } from './application/use-cases/handle-signing-webhook.use-case';
import { InitiateSigningUseCase } from './application/use-cases/initiate-signing.use-case';
import { UploadContractUseCase } from './application/use-cases/upload-contract.use-case';
import { ReplaceContractFileUseCase } from './application/use-cases/replace-contract-file.use-case';
import { DeleteContractUseCase } from './application/use-cases/delete-contract.use-case';

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
    private readonly getLandlordContractsUseCase: GetLandlordContractsUseCase,
    private readonly getTenantContractsUseCase: GetTenantContractsUseCase,
    private readonly replaceContractFileUseCase: ReplaceContractFileUseCase,
    private readonly deleteContractUseCase: DeleteContractUseCase,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('JWT')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cargar contrato', description: 'Sube un contrato PDF asociado a un lease. Requiere rol LANDLORD.' })
  @ApiCreatedResponse({ description: 'Contrato creado', type: ContractSummaryDto })
  @ApiForbiddenResponse({ description: 'No tienes permiso sobre este lease' })
  @ApiUnprocessableEntityResponse({ description: 'Solo se permiten archivos PDF o el archivo supera 10 MB' })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateContractDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new UnprocessableEntityException('El archivo es obligatorio');
    }
    return this.uploadContractUseCase.execute(file, dto, req.user.id, req.user.roles);
  }

  @UseGuards(JwtAuthGuard)
  @Get('landlord')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Listar contratos del arrendador' })
  @ApiOkResponse({ type: [LandlordContractListItemDto] })
  getLandlordContracts(@Req() req: AuthenticatedRequest) {
    return this.getLandlordContractsUseCase.execute(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tenant')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Listar contratos del arrendatario' })
  @ApiOkResponse({ type: [TenantContractListItemDto] })
  getTenantContracts(@Req() req: AuthenticatedRequest) {
    return this.getTenantContractsUseCase.execute(req.user.id);
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
  @Put(':id/file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('JWT')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Reemplazar archivo del contrato' })
  @ApiOkResponse({ type: ContractSummaryDto })
  @ApiConflictResponse({ description: 'No se puede reemplazar el archivo en este estado' })
  @ApiForbiddenResponse({ description: 'No tienes permiso' })
  @ApiUnprocessableEntityResponse({ description: 'Archivo inválido' })
  replaceFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new UnprocessableEntityException('El archivo es obligatorio');
    }
    return this.replaceContractFileUseCase.execute(id, file, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Eliminar contrato' })
  @ApiOkResponse({ description: 'Contrato eliminado' })
  @ApiConflictResponse({ description: 'No se puede eliminar en este estado' })
  @ApiForbiddenResponse({ description: 'No tienes permiso' })
  @ApiNotFoundResponse({ description: 'Contrato no encontrado' })
  deleteContract(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.deleteContractUseCase.execute(id, req.user.id);
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