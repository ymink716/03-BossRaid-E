import {
  CACHE_MANAGER,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { raidStatus } from './dto/raidStatusDto';
import { RaidRecord } from './entities/raid.entity';
import { RaidService } from './raid.service';

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

  @Patch('end')
  endRaid() {}
}
