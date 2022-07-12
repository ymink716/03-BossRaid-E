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
import { raidStatus } from './dto/raidStatusDto';
import { RaidRecord } from './entities/raid.entity';
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
  async getRaidStatus() {
    let result: raidStatus;

    try {
      const redis: RaidRecord = await this.cacheManager.get('raidRecord');

      if (redis) {
        result = {
          canEnter: false,
          enteredUserId: redis.user.id,
        };
        return result;
      } else {
        result = {
          canEnter: true,
          enteredUserId: null,
        };
        return result;
      }
    } catch (error) {
      console.log(error);
      const db = await this.raidService.fetchRecentRaidRecord();

      if (db) {
        result = {
          canEnter: false,
          enteredUserId: db.user.id,
        };
        return result;
      } else {
        result = {
          canEnter: true,
          enteredUserId: null,
        };
        return result;
      }
    }
  }

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
