import { ApiProperty } from '@nestjs/swagger';
import { RaidRecord } from '../entities/raid.entity';

export class RaidStatus {
  @ApiProperty({ description: '레이드 입장가능 여부', example: true })
  canEnter: boolean;

  @ApiProperty({ description: '레이드를 이미 진행중인 유저의 id', example: 1 })
  enteredUserId: number;

  @ApiProperty({ description: '레이드 기록'})
  raidRecord: RaidRecord;
}

export const defaultRaidStatus: RaidStatus = {
  canEnter: true,
  enteredUserId: null,
  raidRecord: null,
};
