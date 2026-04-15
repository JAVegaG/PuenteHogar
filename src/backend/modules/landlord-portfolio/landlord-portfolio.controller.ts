import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { CreatePortfolioUnitDto } from './application/dtos/create-portfolio-unit.dto';
import { UpdatePortfolioUnitDto } from './application/dtos/update-portfolio-unit.dto';
import { PortfolioUnitResponseDto } from './application/dtos/portfolio-unit-response.dto';
import { CreatePortfolioUnitUseCase } from './application/use-cases/create-portfolio-unit.use-case';
import { GetPortfolioUseCase } from './application/use-cases/get-portfolio.use-case';
import { UpdatePortfolioUnitUseCase } from './application/use-cases/update-portfolio-unit.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string; roles: string[] };
}

@ApiTags('portfolio')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('portfolio')
export class LandlordPortfolioController {
  constructor(
    private readonly createPortfolioUnitUseCase: CreatePortfolioUnitUseCase,
    private readonly getPortfolioUseCase: GetPortfolioUseCase,
    private readonly updatePortfolioUnitUseCase: UpdatePortfolioUnitUseCase,
  ) {}

  @Post('units')
  @ApiOperation({ summary: 'Agregar unidad al portafolio', description: 'Crea una unidad de portafolio. Requiere rol LANDLORD.' })
  @ApiCreatedResponse({ description: 'Unidad creada', type: PortfolioUnitResponseDto })
  @ApiForbiddenResponse({ description: 'Solo arrendadores pueden gestionar el portafolio' })
  createUnit(@Body() dto: CreatePortfolioUnitDto, @Req() req: AuthenticatedRequest) {
    return this.createPortfolioUnitUseCase.execute(dto, req.user.id, req.user.roles);
  }

  @Get('units')
  @ApiOperation({ summary: 'Listar unidades del portafolio del arrendador autenticado' })
  @ApiOkResponse({ description: 'Lista de unidades de portafolio', type: [PortfolioUnitResponseDto] })
  getUnits(@Req() req: AuthenticatedRequest) {
    return this.getPortfolioUseCase.execute(req.user.id);
  }

  @Patch('units/:id')
  @ApiOperation({ summary: 'Actualizar unidad de portafolio' })
  @ApiOkResponse({ description: 'Unidad actualizada', type: PortfolioUnitResponseDto })
  @ApiForbiddenResponse({ description: 'No tienes permiso sobre esta unidad' })
  @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
  updateUnit(
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioUnitDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.updatePortfolioUnitUseCase.execute(id, dto, req.user.id);
  }
}
