import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdditionalFeatureResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    name!: string;

    @ApiPropertyOptional({ nullable: true })
    description!: string | null;

    @ApiProperty({ example: 'text', description: 'Value type: numeric or text' })
    type!: string;

    @ApiProperty({ example: 'text_field', description: 'UI element: text_field, dropdown, checkbox, number_field' })
    element!: string;

    @ApiProperty()
    active!: boolean;

    @ApiProperty({ description: 'true = basic filter section; false = advanced filters' })
    main!: boolean;

    @ApiProperty({ description: 'Whether the field is required in listing creation' })
    required!: boolean;

    @ApiPropertyOptional({ nullable: true, description: 'Custom validation error message for required fields' })
    errorMessage!: string | null;
}
