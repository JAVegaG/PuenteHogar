import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@src/shared/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
    @Get()
    @Public()
    @ApiOperation({ summary: 'Health check endpoint for ALB' })
    @ApiOkResponse({ description: 'Service is healthy' })
    check() {
        return { status: 'ok' };
    }
}
