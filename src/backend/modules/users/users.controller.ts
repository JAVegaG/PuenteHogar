import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiUnauthorizedResponse, ApiConflictResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import type { Request as express_request } from 'express';
import { Public } from '@src/shared/decorators/public.decorator';
import { JwtAuthGuard } from '@src/shared/guards/jwt-auth.guard';
import { LoginDto } from './application/dtos/login.dto';
import { RegisterUserDto } from './application/dtos/register-user.dto';
import { AuthTokenDto } from './application/dtos/auth-token.dto';
import { UserProfileDto } from './application/dtos/user-profile.dto';
import { AddRoleDto } from './application/dtos/add-role.dto';
import { RoleChangeResponseDto } from './application/dtos/role-change-response.dto';
import { RemovableRoleDto } from './application/dtos/removable-role.dto';
import { GetUserProfileUseCase } from './application/use-cases/get-user-profile.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUserUseCase, USER_REPOSITORY } from './application/use-cases/register-user.use-case';
import { AddRoleUseCase } from './application/use-cases/add-role.use-case';
import { RemoveRoleUseCase } from './application/use-cases/remove-role.use-case';
import { GetRemovableRolesUseCase } from './application/use-cases/get-removable-roles.use-case';
import type { IUserRepository } from './domain/ports/user-repository.port';

interface AuthenticatedRequest extends Request {
  user: { id: string; roles: string[] };
}

@ApiTags('auth')
@Controller('auth')
export class UsersController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly addRoleUseCase: AddRoleUseCase,
    private readonly removeRoleUseCase: RemoveRoleUseCase,
    private readonly getRemovableRolesUseCase: GetRemovableRolesUseCase,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) { }

  @Public()
  @Get('document-types')
  @ApiOperation({ summary: 'Listar tipos de documento válidos', description: 'Retorna el catálogo de tipos de documento activos para poblar dropdowns en el frontend.' })
  @ApiOkResponse({ description: 'Lista de tipos de documento activos' })
  getDocumentTypes() {
    return this.userRepository.findAllDocumentTypes();
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario', description: 'Crea una cuenta de arrendador o arrendatario con datos básicos.' })
  @ApiCreatedResponse({ description: 'Usuario registrado exitosamente' })
  @ApiConflictResponse({ description: 'El correo ya está registrado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o tipo de documento no válido' })
  register(@Body() dto: RegisterUserDto) {
    return this.registerUserUseCase.execute(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión', description: 'Autentica al usuario y retorna un JWT.' })
  @ApiOkResponse({ description: 'Token JWT generado', type: AuthTokenDto })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  login(@Body() dto: LoginDto, @Req() req: express_request) {
    const ip = req.ip ?? 'unknown';
    return this.loginUseCase.execute(dto, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Perfil del usuario', type: UserProfileDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  profile(@Req() req: AuthenticatedRequest) {
    return this.getUserProfileUseCase.execute(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('roles/add')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Agregar un rol al usuario autenticado' })
  @ApiOkResponse({ description: 'Rol agregado exitosamente', type: RoleChangeResponseDto })
  @ApiConflictResponse({ description: 'El usuario ya tiene el rol' })
  @ApiBadRequestResponse({ description: 'Rol no válido' })
  addRole(@Body() dto: AddRoleDto, @Req() req: AuthenticatedRequest) {
    return this.addRoleUseCase.execute(req.user.id, dto.roleName);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('roles/:roleName')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Eliminar un rol del usuario autenticado' })
  @ApiOkResponse({ description: 'Rol eliminado exitosamente', type: RoleChangeResponseDto })
  @ApiConflictResponse({ description: 'No se puede eliminar el rol por recursos activos' })
  @ApiBadRequestResponse({ description: 'Rol no válido o es el único rol del usuario' })
  removeRole(@Param('roleName') roleName: string, @Req() req: AuthenticatedRequest) {
    return this.removeRoleUseCase.execute(req.user.id, roleName);
  }

  @UseGuards(JwtAuthGuard)
  @Get('roles/removable')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Consultar eliminabilidad de roles del usuario autenticado' })
  @ApiOkResponse({ description: 'Lista de roles con su eliminabilidad', type: [RemovableRoleDto] })
  getRemovableRoles(@Req() req: AuthenticatedRequest) {
    return this.getRemovableRolesUseCase.execute(req.user.id);
  }
}

