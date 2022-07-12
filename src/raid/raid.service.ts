/* eslint-disable @typescript-eslint/no-var-requires */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { RaidEndDto } from './dto/raidEnd.dto';
import { RaidRecord } from './entities/raid.entity';
import { CreateRaidDTO } from './dto/createRaid.dto';
import { EnterBossRaidOption } from 'src/common/enterBossOption.interface';
import { RequestRaidDto } from './dto/requestRaid.dto';
import { RankingInfo } from './rankingInfo.interface';
import { userInfo } from 'os';
import { ResponseRaidDto } from './dto/responseRaid.dto';
import { GetUser } from 'src/common/getUserDecorator';

const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault('Asia/Seoul');

@Injectable()
export class RaidService {
  constructor(
    @InjectRepository(RaidRecord)
    private readonly raidRecordRepository: Repository<RaidRecord>,
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
      const newBossRaid = this.raidRecordRepository.create({
        ...createRaidDto,
        userId: user.id,
        score: 0,
      });
      const result = await this.raidRecordRepository.insert(newBossRaid);
      const enterOption: EnterBossRaidOption = {
        isEntered: true,
        raidRecordId: result.identifiers[0].id,
      };
      return enterOption;
    } catch (e) {
      console.error(e);
    }

  }
  /* 
    작성자 : 김용민
  */
  // 레디스 사용 부분 추가 필요
  // - 레이드 종료 시 보스레이드 canEnter=true
  // - 레이드 종료 시 ㅂ랭킹에 업뎃
  // axios 에러 추가 필요
  // 센트리로 에러 관리 추가 필요
  // StaticData 웹서버 캐싱?
  async endRaid(raidEndDto: RaidEndDto) {
    const { userId, raidRecordId } = raidEndDto;

    try {
      const record: RaidRecord = await this.raidRecordRepository.findOne({
        where: {
          id: raidRecordId,
        },
        relations: ['user'],
      });

      if (!record) {
        throw new NotFoundException('해당 레이드 기록을 찾을 수 없습니다.');
      }

      // 저장된 userId와 raidRecordId 일치하지 않다면 예외 처리
      if (record.user.id !== userId) {
        throw new ForbiddenException('해당 사용자의 레이드 기록이 아닙니다.');
      }

      const response = await axios({
        url: process.env.STATIC_DATA_URL,
        method: 'GET',
      });
      const bossRaid = response.data.bossRaids[0];

      // 시작한 시간으로부터 레이드 제한시간이 지났다면 예외 처리
      const now = moment();
      const startedAt = moment(record.enterTime);
      console.log(now, startedAt);
      const duration = moment.duration(now.diff(startedAt)).asSeconds();
      if (duration > bossRaid.bossRaidLimitSeconds) {
        throw new BadRequestException('레이드 제한시간이 지났습니다.');
      }
      record.endTime = now.toDate();

      // 레벨에 따른 스코어 반영
      for (const l of bossRaid.levels) {
        if (l.level === record.level) {
          record.score = l.score;
          break;
        }
      }

      const user: User = await this.userRepository.findOne({
        where: {
          id: userId,
        },
      });

      if (!user) {
        throw new NotFoundException('해당 사용자를 찾을 수 없습니다.');
      }

      //user.total = user.total + record.score;

      // db transaction.. manager +

      await this.raidRecordRepository.save(record);
      await this.userRepository.save(user);

      return record;
    } catch (error) {
      console.error(error);
    }
  }
  async fetchRecentRaidRecord() {
    const db = await this.raidRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.user', 'user')
      .orderBy('enterTime', 'DESC')
      .getOne();
    if (db) return db;
  }

  /* 작성자 : 염하늘
    - raid 랭킹 조회 로직 구현
  */
  
  async rankRaid(dto : RequestRaidDto) {

    // 1유저 조회
    const findUser: User = await this.userRepository.findOne({
        where: {
          id:  dto.userId
        },
      });
      if (!findUser) {
        throw new NotFoundException('해당 사용자를 찾을 수 없습니다.');
      }
      // 모든 유저 조회

      const response = await axios({
        url: process.env.STATIC_DATA_URL,
        method: 'GET',
      });

      const bossRaid = response.data.bossRaids[0];

      console.log(111111,bossRaid.levels)

      const myInfo : RankingInfo = {
        ranking: 1,
        userId: findUser.id,
        totalScore : findUser.totalScore
      }

      const res : RankingInfo = {
      ranking:bossRaid.ranking,
      userId:7, 
     totalScore : bossRaid
      }

      const result  = ResponseRaidDto.usersInfo(myInfo,res)

    return  result
  }
}
