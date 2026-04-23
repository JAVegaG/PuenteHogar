import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiConflictResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '@src/shared/decorators';
import type { IPortfolioRepository } from './domain/ports/portfolio-repository.port';
import { PORTFOLIO_REPOSITORY } from './application/use-cases/create-portfolio-unit.use-case';
import { PropertyTypeResponseDto, DepartmentResponseDto, CityResponseDto } from './application/dtos';
import { Request } from 'express';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { UpdatePortfolioUnitDto } from './application/dtos/update-portfolio-unit.dto';
import { PortfolioUnitResponseDto } from './application/dtos/portfolio-unit-response.dto';
import { ListPortfoliosQueryDto } from './application/dtos/list-portfolios-query.dto';
import { CreatePortfolioDto } from './application/dtos/create-portfolio.dto';
import { CreateEnrichedUnitDto } from './application/dtos/create-enriched-unit.dto';
import { PaginatedPortfoliosResponseDto } from './application/dtos/paginated-portfolios-response.dto';
import { PortfolioSummaryResponseDto } from './application/dtos/portfolio-summary-response.dto';
import { EnrichedUnitResponseDto } from './application/dtos/enriched-unit-response.dto';
import { LeaseListItemDto } from './application/dtos/lease-list-item.dto';
import { LeaseDetailDto } from './application/dtos/lease-detail.dto';
import { CreateLeaseDto } from './application/dtos/create-lease.dto';
import { GetPortfolioUseCase } from './application/use-cases/get-portfolio.use-case';
import { UpdatePortfolioUnitUseCase } from './application/use-cases/update-portfolio-unit.use-case';
import { ListPortfoliosUseCase } from './application/use-cases/list-portfolios.use-case';
import { CreatePortfolioUseCase } from './application/use-cases/create-portfolio.use-case';
import { CreateEnrichedUnitUseCase } from './application/use-cases/create-enriched-unit.use-case';
import { GetUnitLeasesUseCase } from './application/use-cases/get-unit-leases.use-case';
import { GetLeaseDetailUseCase } from './application/use-cases/get-lease-detail.use-case';
import { CreateLeaseUseCase } from './application/use-cases/create-lease.use-case';
import { UpdatePortfolioUseCase } from './application/use-cases/update-portfolio.use-case';
import { DeletePortfolioUseCase } from './application/use-cases/delete-portfolio.use-case';
import { DeleteUnitUseCase } from './application/use-cases/delete-unit.use-case';
import { UpdatePortfolioDto } from './application/dtos/update-portfolio.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; roles: string[] };
}

@ApiTags('portfolio')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('portfolio')
export class LandlordPortfolioController {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY) private readonly portfolioRepository: IPortfolioRepository,
    private readonly getPortfolioUseCase: GetPortfolioUseCase,
    private readonly updatePortfolioUnitUseCase: UpdatePortfolioUnitUseCase,
    private readonly listPortfoliosUseCase: ListPortfoliosUseCase,
    private readonly createPortfolioUseCase: CreatePortfolioUseCase,
    private readonly createEnrichedUnitUseCase: CreateEnrichedUnitUseCase,
    private readonly getUnitLeasesUseCase: GetUnitLeasesUseCase,
    private readonly getLeaseDetailUseCase: GetLeaseDetailUseCase,
    private readonly createLeaseUseCase: CreateLeaseUseCase,
    private readonly updatePortfolioUseCase: UpdatePortfolioUseCase,
    private readonly deletePortfolioUseCase: DeletePortfolioUseCase,
    private readonly deleteUnitUseCase: DeleteUnitUseCase,
  ) { }

  @Public()
  @Get('property-types')
  @ApiOperation({
    summary: 'Listar tipos de propiedad válidos',
    description: 'Retorna el catálogo de tipos de propiedad activos para poblar dropdowns en el frontend.',
  })
  @ApiOkResponse({ description: 'Lista de tipos de propiedad activos', type: [PropertyTypeResponseDto] })
  getPropertyTypes() {
    return this.portfolioRepository.findAllPropertyTypes();
  }

  @Public()
  @Get('departments')
  @ApiOperation({
    summary: 'Listar departamentos activos',
    description: 'Retorna el catálogo de departamentos colombianos activos, ordenados por nombre.',
  })
  @ApiOkResponse({ description: 'Lista de departamentos activos', type: [DepartmentResponseDto] })
  getDepartments() {
    return this.portfolioRepository.findAllDepartments();
  }

  @Public()
  @Get('departments/:departmentCode/cities')
  @ApiOperation({
    summary: 'Listar ciudades de un departamento',
    description: 'Retorna las ciudades/municipios activos del departamento especificado, ordenados por nombre.',
  })
  @ApiParam({ name: 'departmentCode', description: 'Código DANE del departamento (2 dígitos)', example: '05' })
  @ApiOkResponse({ description: 'Lista de ciudades activas del departamento', type: [CityResponseDto] })
  getCitiesByDepartment(@Param('departmentCode') departmentCode: string) {
    return this.portfolioRepository.findCitiesByDepartmentCode(departmentCode);
  }

  @Get('')
  @ApiOperation({ summary: 'Listar portafolios del arrendador autenticado', description: 'Retorna un listado paginado de portafolios con estadísticas agregadas.' })
  @ApiOkResponse({ description: 'Listado paginado de portafolios', type: PaginatedPortfoliosResponseDto })
  listPortfolios(@Query() query: ListPortfoliosQueryDto, @Req() req: AuthenticatedRequest) {
    return this.listPortfoliosUseCase.execute(req.user.id, query);
  }

  @Post('')
  @ApiOperation({ summary: 'Crear un nuevo portafolio', description: 'Crea un portafolio para el arrendador autenticado. Requiere rol LANDLORD.' })
  @ApiCreatedResponse({ description: 'Portafolio creado', type: PortfolioSummaryResponseDto })
  @ApiForbiddenResponse({ description: 'Acceso denegado — requiere rol LANDLORD' })
  createPortfolio(@Body() dto: CreatePortfolioDto, @Req() req: AuthenticatedRequest) {
    return this.createPortfolioUseCase.execute(dto, req.user.id, req.user.roles);
  }

  @Post(':portfolioId/units')
  @ApiOperation({ summary: 'Agregar unidad enriquecida a un portafolio', description: 'Crea Property + Address + PortfolioUnit en transacción. Requiere rol LANDLORD.' })
  @ApiCreatedResponse({ description: 'Unidad enriquecida creada', type: EnrichedUnitResponseDto })
  @ApiForbiddenResponse({ description: 'Acceso denegado — requiere rol LANDLORD' })
  @ApiNotFoundResponse({ description: 'Portafolio no encontrado' })
  createEnrichedUnit(
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CreateEnrichedUnitDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.createEnrichedUnitUseCase.execute(portfolioId, dto, req.user.id, req.user.roles);
  }

  @Get(':portfolioId/units')
  @ApiOperation({ summary: 'Listar unidades de un portafolio', description: 'Retorna las unidades del portafolio especificado.' })
  @ApiOkResponse({ description: 'Lista de unidades de portafolio', type: [PortfolioUnitResponseDto] })
  @ApiNotFoundResponse({ description: 'Portafolio no encontrado' })
  getUnits(
    @Param('portfolioId') _portfolioId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.getPortfolioUseCase.execute(req.user.id);
  }

  @Patch(':portfolioId/units/:id')
  @ApiOperation({ summary: 'Actualizar unidad de portafolio' })
  @ApiOkResponse({ description: 'Unidad actualizada', type: PortfolioUnitResponseDto })
  @ApiForbiddenResponse({ description: 'No tienes permiso sobre esta unidad' })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  updateUnit(
    @Param('portfolioId') _portfolioId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioUnitDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.updatePortfolioUnitUseCase.execute(id, dto, req.user.id);
  }

  @Get(':portfolioId/units/:unitId/leases')
  @ApiOperation({ summary: 'Listar arriendos de una unidad', description: 'Retorna los arriendos asociados a una unidad del portafolio.' })
  @ApiOkResponse({ description: 'Lista de arriendos', type: [LeaseListItemDto] })
  @ApiForbiddenResponse({ description: 'No tienes permiso para ver los arriendos de esta unidad' })
  @ApiNotFoundResponse({ description: 'Portafolio o unidad no encontrada' })
  getUnitLeases(
    @Param('portfolioId') portfolioId: string,
    @Param('unitId') unitId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.getUnitLeasesUseCase.execute(portfolioId, unitId, req.user.id);
  }

  @Get(':portfolioId/units/:unitId/leases/:leaseId')
  @ApiOperation({ summary: 'Obtener detalle de un arriendo', description: 'Retorna el detalle completo de un arriendo incluyendo datos del arrendatario e inmueble.' })
  @ApiOkResponse({ description: 'Detalle del arriendo', type: LeaseDetailDto })
  @ApiForbiddenResponse({ description: 'No tienes permiso para ver este arriendo' })
  @ApiNotFoundResponse({ description: 'Arriendo no encontrado' })
  getLeaseDetail(
    @Param('portfolioId') portfolioId: string,
    @Param('unitId') unitId: string,
    @Param('leaseId') leaseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.getLeaseDetailUseCase.execute(portfolioId, unitId, leaseId, req.user.id);
  }

  @Post(':portfolioId/units/:unitId/leases')
  @ApiOperation({ summary: 'Crear un arriendo para una unidad', description: 'Crea un nuevo arriendo asociando un arrendatario por email.' })
  @ApiCreatedResponse({ description: 'Arriendo creado', type: LeaseListItemDto })
  @ApiForbiddenResponse({ description: 'No tienes permiso para crear arriendos en esta unidad' })
  @ApiNotFoundResponse({ description: 'Arrendatario no encontrado' })
  @ApiConflictResponse({ description: 'La unidad ya tiene un arriendo activo' })
  createLease(
    @Param('portfolioId') portfolioId: string,
    @Param('unitId') unitId: string,
    @Body() dto: CreateLeaseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.createLeaseUseCase.execute(portfolioId, unitId, dto, req.user.id);
  }

  @Patch(':portfolioId')
  @ApiOperation({ summary: 'Actualizar portafolio', description: 'Actualiza el nombre y/o descripción de un portafolio. Requiere rol LANDLORD.' })
  @ApiOkResponse({ description: 'Portafolio actualizado', type: PortfolioSummaryResponseDto })
  @ApiForbiddenResponse({ description: 'Acceso denegado — requiere rol LANDLORD o no es propietario' })
  @ApiNotFoundResponse({ description: 'Portafolio no encontrado' })
  updatePortfolio(
    @Param('portfolioId') portfolioId: string,
    @Body() dto: UpdatePortfolioDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.updatePortfolioUseCase.execute(portfolioId, dto, req.user.id, req.user.roles);
  }

  @Delete(':portfolioId')
  @ApiOperation({ summary: 'Eliminar portafolio', description: 'Elimina un portafolio sin unidades asociadas. Requiere rol LANDLORD.' })
  @ApiOkResponse({ description: 'Portafolio eliminado' })
  @ApiForbiddenResponse({ description: 'Acceso denegado — requiere rol LANDLORD o no es propietario' })
  @ApiNotFoundResponse({ description: 'Portafolio no encontrado' })
  @ApiConflictResponse({ description: 'El portafolio tiene unidades asociadas y no puede ser eliminado' })
  deletePortfolio(
    @Param('portfolioId') portfolioId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.deletePortfolioUseCase.execute(portfolioId, req.user.id, req.user.roles);
  }

  @Delete(':portfolioId/units/:id')
  @ApiOperation({ summary: 'Eliminar unidad de portafolio', description: 'Elimina una unidad sin arriendos activos.' })
  @ApiOkResponse({ description: 'Unidad eliminada' })
  @ApiForbiddenResponse({ description: 'Acceso denegado — no es propietario de la unidad' })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  @ApiConflictResponse({ description: 'La unidad tiene arriendos activos y no puede ser eliminada' })
  deleteUnit(
    @Param('portfolioId') portfolioId: string,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.deleteUnitUseCase.execute(portfolioId, id, req.user.id);
  }
}
