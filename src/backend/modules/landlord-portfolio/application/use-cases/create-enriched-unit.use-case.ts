import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import { CreateEnrichedUnitDto } from '@modules/landlord-portfolio/application/dtos/create-enriched-unit.dto';
import { EnrichedUnitResponseDto } from '@modules/landlord-portfolio/application/dtos/enriched-unit-response.dto';
import { EnrichedPortfolioUnitEntity } from '@modules/landlord-portfolio/domain/entities/enriched-portfolio-unit.entity';
import { PORTFOLIO_REPOSITORY } from './create-portfolio-unit.use-case';

@Injectable()
export class CreateEnrichedUnitUseCase {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: IPortfolioRepository,
  ) { }

  async execute(
    portfolioId: string,
    dto: CreateEnrichedUnitDto,
    userId: string,
    userRoles: string[],
  ): Promise<EnrichedUnitResponseDto> {
    if (!userRoles.includes('LANDLORD')) {
      throw new ForbiddenException('Acceso denegado');
    }

    const portfolio = await this.portfolioRepository.findPortfolioById(portfolioId);

    if (!portfolio) {
      throw new NotFoundException('Portafolio no encontrado');
    }

    if (portfolio.userId !== userId) {
      throw new NotFoundException('Portafolio no encontrado');
    }

    const propertyType = await this.portfolioRepository.findPropertyTypeByCode(dto.propertyType);
    if (!propertyType) {
      throw new BadRequestException(
        `Tipo de propiedad no válido: "${dto.propertyType}". Consulte GET /portfolio/property-types para ver los tipos disponibles.`,
      );
    }

    const department = await this.portfolioRepository.findDepartmentByCode(dto.departmentCode);
    if (!department) {
      throw new BadRequestException(
        `Departamento no válido: "${dto.departmentCode}". Consulte GET /portfolio/departments para ver los departamentos disponibles.`,
      );
    }
    const departmentName = department.name;

    const city = await this.portfolioRepository.findCityByCode(dto.cityCode);
    if (!city || city.departmentCode !== dto.departmentCode) {
      throw new BadRequestException(
        `Ciudad no válida: "${dto.cityCode}" para el departamento "${dto.departmentCode}". Consulte GET /portfolio/departments/${dto.departmentCode}/cities para ver las ciudades disponibles.`,
      );
    }
    const cityName = city.name;

    const unit = await this.portfolioRepository.createEnrichedUnit({
      portfolioId,
      name: dto.name,
      propertyType: dto.propertyType,
      address: dto.address,
      length: dto.length,
      width: dto.width,
      numberOfRooms: dto.numberOfRooms ?? 0,
      numberOfBathrooms: dto.numberOfBathrooms ?? 0,
      description: dto.description,
      leaseBaseAmount: dto.leaseBaseAmount,
      leaseBaseCurrency: dto.leaseBaseCurrency ?? 'COP',
      departmentName,
      cityName,
      departmentCode: dto.departmentCode,
      cityCode: dto.cityCode,
    });

    return this.toResponseDto(unit);
  }

  private toResponseDto(entity: EnrichedPortfolioUnitEntity): EnrichedUnitResponseDto {
    const dto = new EnrichedUnitResponseDto();
    dto.id = entity.id;
    dto.portfolioId = entity.portfolioId;
    dto.name = entity.name;
    dto.propertyType = entity.propertyType;
    dto.address = entity.address;
    dto.area = entity.area;
    dto.numberOfRooms = entity.numberOfRooms;
    dto.numberOfBathrooms = entity.numberOfBathrooms;
    dto.description = entity.description;
    dto.leaseBaseAmount = entity.leaseBaseAmount;
    dto.leaseBaseCurrency = entity.leaseBaseCurrency;
    dto.departmentCode = entity.departmentCode;
    dto.cityCode = entity.cityCode;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
