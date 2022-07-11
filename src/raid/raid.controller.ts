import {
  CACHE_MANAGER,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { RaidService } from './raid.service';

@Controller('bossRaid')
export class RaidController {
  constructor(
    private readonly raidService: RaidService,
    @Inject(CACHE_MANAGER)
    cacheManager: Cache,
  ) {}

  @Get()
  getRaid() {}

  @Post('enter')
  enterRaid() {}

  @Patch('end')
  endRaid() {}
}
