import {
    Controller,
    Get,
    Param,
    Req,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiOkResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { GetTenantLeaseDetailUseCase } from './application/use-cases/get-tenant-lease-detail.use-case';
import { TenantLeaseDetailDto } from './application/dtos/tenant-lease-detail.dto';

interface AuthenticatedRequest extends Request {
    user: { id: string; roles: string[] };
}

@ApiTags('tenant-leases')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('leases')
export class TenantLeasesController {
    constructor(
        private readonly getTenantLeaseDetailUseCase: GetTenantLeaseDetailUseCase,
    ) { }

    @Get(':leaseId/detail')
    @ApiOperation({
        summary: 'Obtener detalle de arriendo para arrendatario',
        description: 'Retorna información del inmueble, canon mensual y próximo pago para el arrendatario autenticado.',
    })
    @ApiOkResponse({ description: 'Detalle del arriendo del arrendatario', type: TenantLeaseDetailDto })
    @ApiForbiddenResponse({ description: 'No tienes permiso para ver este arriendo' })
    @ApiNotFoundResponse({ description: 'Arriendo no encontrado' })
    getTenantLeaseDetail(
        @Param('leaseId') leaseId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.getTenantLeaseDetailUseCase.execute(leaseId, req.user.id);
    }
}
