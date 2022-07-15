import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { EnterBossRaidOption } from './interface/enterBossOption.interface';
import { ErrorType } from 'src/common/error.enum';
import { RaidService } from 'src/raid/raid.service';

/* 
    작성자 : 박신영
    - Queue에서 보스 레이드를 진행할 유저들을 체크합니다.
  */

@Processor('playerQueue')
export class RaidConsumer {
  private readonly logger = new Logger(RaidConsumer.name);
  constructor(
    private raidService: RaidService,
    @InjectQueue('playerQueue')
    private playerQueue: Queue,
  ) {}

  @Process('player')
  async handleQueue(job: Job) {
    this.logger.log(`${JSON.stringify(job.data)}가 추가되었습니다. `);
  }
}
