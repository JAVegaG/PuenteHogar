import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateSigningDto {
  @ApiProperty({ description: 'ID del contrato a firmar' })
  @IsString()
  @IsNotEmpty()
  contractId!: string;
}
