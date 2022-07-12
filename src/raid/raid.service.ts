import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { RaidRecord } from './entities/raid.entity';

@Injectable()
export class RaidService {
  constructor(
    @InjectRepository(RaidRecord)
    private readonly raidRecordRepository: Repository<RaidRecord>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async fetchRecentRaidRecord() {
    const db = await this.raidRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.user', 'user')
      .orderBy('enterTime', 'DESC')
      .getOne();
    if (db) return db;
  }
}
