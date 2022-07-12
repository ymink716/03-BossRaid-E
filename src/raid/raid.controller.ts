import {
  Body,
  CACHE_MANAGER,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Cache } from 'cache-manager';
import { RaidEndDto } from './dto/raidEnd.dto';
import { RaidService } from './raid.service';

@ApiTags('bossRaid')
@Controller('bossRaid')
export class RaidController {
  constructor(
    private readonly raidService: RaidService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  @Get()
  getRaid() {}

  @Post('enter')
  enterRaid() {}

  /* 
    작성자 : 김용민
  */
  @ApiBody({ type: RaidEndDto })
  @Patch('end')
  endRaid(@Body() raidEndDto: RaidEndDto) {
    return this.raidService.endRaid(raidEndDto);
  }
}
