import {
  Body,
  CACHE_MANAGER,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { RaidService } from './raid.service';
import { CreateRaidDTO } from './dto/createRaid.dto';
import { EnterBossRaidOption } from 'src/common/enterBossOption.interface';
import { GetUser } from 'src/common/getUserDecorator';
import { User } from 'src/user/entities/user.entity';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/passport/guard/jwtAuthGuard';
import { MSG } from 'src/common/response.enum';

@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard)
@ApiTags('BossRaid')
@Controller('bossRaid')
export class RaidController {
  constructor(
    private readonly raidService: RaidService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  @Get()
  getRaid() {}

  @ApiBody({ type: CreateRaidDTO })
  @ApiCreatedResponse({
    description: MSG.enterBossRaid.msg,
  })
  @Post('enter')
  async enterRaid(@Body() createRaidDto: CreateRaidDTO, @GetUser() user: User) {
    const result = await this.raidService.enterBossRaid(createRaidDto, user);

    // 캐시에 항목 추가
    await this.cacheManager.set('raidRecord', result, { ttl: 180 });
    return this.cacheManager.get('raidRecord');
  }

  @Patch('end')
  endRaid() {}
}
