import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiUnprocessableEntityResponse, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { ContactEventDto } from './application/dtos/contact-event.dto';
import { CreateListingDto } from './application/dtos/create-listing.dto';
import { ListingFiltersDto } from './application/dtos/listing-filters.dto';
import { ListingResponseDto } from './application/dtos/listing-response.dto';
import { PaginatedListingsResponseDto } from './application/dtos/paginated-listings-response.dto';
import { ListingDetailResponseDto } from './application/dtos/listing-detail-response.dto';
import { CreateListingUseCase, UploadedFile } from './application/use-cases/create-listing.use-case';
import { GetListingDetailUseCase } from './application/use-cases/get-listing-detail.use-case';
import { RegisterContactEventUseCase } from './application/use-cases/register-contact-event.use-case';
import { SearchListingsUseCase } from './application/use-cases/search-listings.use-case';
import { UnpublishListingUseCase } from './application/use-cases/unpublish-listing.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string; roles: string[] };
}

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@ApiTags('listings')
@Controller('listings')
export class PropertyListingsController {
  constructor(
    private readonly createListingUseCase: CreateListingUseCase,
    private readonly searchListingsUseCase: SearchListingsUseCase,
    private readonly getListingDetailUseCase: GetListingDetailUseCase,
    private readonly unpublishListingUseCase: UnpublishListingUseCase,
    private readonly registerContactEventUseCase: RegisterContactEventUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Buscar inmuebles publicados', description: 'Retorna el listado de inmuebles activos. Accesible sin autenticación.' })
  @ApiOkResponse({ description: 'Listado paginado de inmuebles', type: PaginatedListingsResponseDto })
  search(@Query() filters: ListingFiltersDto) {
    return this.searchListingsUseCase.execute(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un inmueble' })
  @ApiOkResponse({ description: 'Detalle del inmueble', type: ListingDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Inmueble no encontrado' })
  getDetail(@Param('id') id: string) {
    return this.getListingDetailUseCase.execute(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Publicar inmueble', description: 'Crea una publicación. Requiere rol LANDLORD y al menos una foto.' })
  @ApiCreatedResponse({ description: 'Publicación creada', type: ListingResponseDto })
  @ApiForbiddenResponse({ description: 'Solo arrendadores pueden publicar' })
  @ApiUnprocessableEntityResponse({ description: 'Se requiere al menos una fotografía' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FilesInterceptor('photos', 10))
  create(
    @Body() dto: CreateListingDto,
    @Req() req: AuthenticatedRequest,
    @UploadedFiles() files?: MulterFile[],
  ) {
    const uploadedFiles: UploadedFile[] | undefined = files?.map((f) => ({
      buffer: f.buffer,
      originalname: f.originalname,
      mimetype: f.mimetype,
    }));
    return this.createListingUseCase.execute(dto, req.user.id, req.user.roles, uploadedFiles);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/unpublish')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Despublicar inmueble' })
  @ApiOkResponse({ description: 'Inmueble despublicado' })
  @ApiForbiddenResponse({ description: 'No tienes permiso sobre esta publicación' })
  unpublish(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.unpublishListingUseCase.execute(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('contact')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Registrar contacto con arrendador', description: 'Registra el evento de contacto y notifica al arrendador.' })
  @ApiCreatedResponse({ description: 'Solicitud de contacto registrada' })
  registerContact(
    @Body() dto: ContactEventDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.registerContactEventUseCase.execute(dto, req.user.id);
  }
}