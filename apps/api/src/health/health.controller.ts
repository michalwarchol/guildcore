import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export interface HealthResponse {
  status: 'ok';
  service: 'api';
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness check independent of database readiness' })
  @ApiOkResponse({
    schema: {
      example: { status: 'ok', service: 'api' },
    },
  })
  getHealth(): HealthResponse {
    return { status: 'ok', service: 'api' };
  }
}
