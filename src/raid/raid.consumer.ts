import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
/* 
    작성자 : 박신영
    - Queue에 사용자 추가 시 로그 메세지 출력
  */
@Processor('playerQueue')
export class RaidConsumer {
  private readonly logger = new Logger(RaidConsumer.name);

  @Process('player')
  async handle(job: Job<unknown>) {
    this.logger.log(`${JSON.stringify(job.data)}가 추가되었습니다. `);
  }
}
