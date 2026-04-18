import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse } from '@nestjs/swagger';
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
import { GetPortfolioUseCase } from './application/use-cases/get-portfolio.use-case';
import { UpdatePortfolioUnitUseCase } from './application/use-cases/update-portfolio-unit.use-case';
import { ListPortfoliosUseCase } from './application/use-cases/list-portfolios.use-case';
import { CreatePortfolioUseCase } from './application/use-cases/create-portfolio.use-case';
import { CreateEnrichedUnitUseCase } from './application/use-cases/create-enriched-unit.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string; roles: string[] };
}

@ApiTags('portfolio')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('portfolio')
export class LandlordPortfolioController {
  constructor(
    private readonly getPortfolioUseCase: GetPortfolioUseCase,
    private readonly updatePortfolioUnitUseCase: UpdatePortfolioUnitUseCase,
    private readonly listPortfoliosUseCase: ListPortfoliosUseCase,
    private readonly createPortfolioUseCase: CreatePortfolioUseCase,
    private readonly createEnrichedUnitUseCase: CreateEnrichedUnitUseCase,
  ) {}

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
}
