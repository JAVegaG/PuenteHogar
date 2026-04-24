import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class AddRoleDto {
    @ApiProperty({ enum: ['LANDLORD', 'TENANT'], description: 'Nombre del rol a agregar' })
    @IsIn(['LANDLORD', 'TENANT'])
    roleName!: string;
}
