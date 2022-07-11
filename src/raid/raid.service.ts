import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { RaidRecord } from './entities/raid.entity';

@Injectable()
export class RaidService {
  constructor(
    @InjectRepository(RaidRecord)
    private readonly raidRecordRepositroy: Repository<RaidRecord>,
    @InjectRepository(User)
    private readonly userRepositroy: Repository<User>,
  ) {}
}
