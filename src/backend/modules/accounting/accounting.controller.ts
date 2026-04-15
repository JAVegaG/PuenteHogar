import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { PeriodDto } from './application/dtos/period.dto';
import { AggregatedReportResponseDto } from './application/dtos/aggregated-report-response.dto';
import { IndividualReportResponseDto } from './application/dtos/individual-report-response.dto';
import { GetAggregatedReportUseCase } from './application/use-cases/get-aggregated-report.use-case';
import { GetIndividualReportUseCase } from './application/use-cases/get-individual-report.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string; roles: string[] };
}

@ApiTags('accounting')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(
    private readonly getAggregatedReportUseCase: GetAggregatedReportUseCase,
    private readonly getIndividualReportUseCase: GetIndividualReportUseCase,
  ) {}

  @Post('reports/aggregated')
  @ApiOperation({ summary: 'Reporte agregado de ingresos del portafolio por periodo' })
  @ApiOkResponse({ description: 'Reporte de ingresos agregado', type: AggregatedReportResponseDto })
  @ApiForbiddenResponse({ description: 'Solo arrendadores pueden acceder a reportes contables' })
  getAggregated(@Body() period: PeriodDto, @Req() req: AuthenticatedRequest) {
    return this.getAggregatedReportUseCase.execute(req.user.id, req.user.roles, period);
  }

  @Post('reports/units/:unitId')
  @ApiOperation({ summary: 'Reporte individual de ingresos por unidad de portafolio' })
  @ApiOkResponse({ description: 'Reporte de ingresos por unidad', type: IndividualReportResponseDto })
  @ApiForbiddenResponse({ description: 'Solo arrendadores pueden acceder a reportes contables' })
  getIndividual(
    @Param('unitId') unitId: string,
    @Body() period: PeriodDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.getIndividualReportUseCase.execute(unitId, req.user.roles, period);
  }
}
