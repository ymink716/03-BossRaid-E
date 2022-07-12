import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { RaidRecord } from './entities/raid.entity';
import { CreateRaidDTO } from './dto/createRaid.dto';
import { EnterBossRaidOption } from 'src/common/enterBossOption.interface';

@Injectable()
export class RaidService {
  constructor(
    @InjectRepository(RaidRecord)
    private readonly raidRecordRepositroy: Repository<RaidRecord>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async enterBossRaid(
    createRaidDto: CreateRaidDTO,
    user: User,
  ): Promise<EnterBossRaidOption> {
    // 레이드 상태 조회
    // 레이드 시작 불가능

    // 레이드 시작 가능
    try {
      const newBossRaid = this.raidRecordRepositroy.create({
        ...createRaidDto,
        userId: user.id,
        score: 0,
      });
      const result = await this.raidRecordRepositroy.insert(newBossRaid);
      const enterOption: EnterBossRaidOption = {
        isEntered: true,
        raidRecordId: result.identifiers[0].id,
      };
      return enterOption;
    } catch (e) {
      console.error(e);
    }
  }
}
