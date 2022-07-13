/* eslint-disable @typescript-eslint/no-var-requires */
import {
  BadRequestException,
  CACHE_MANAGER,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  MisdirectedException,
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
import { RaidStatus } from './dto/raidStatus.dto';
import { Cache } from 'cache-manager';
import { RequestRaidDto } from './dto/requestRaid.dto';
import { RankingInfo } from './rankingInfo.interface';
import { ResponseRaidDto } from './dto/responseRaid.dto';
import { ErrorType } from 'src/common/error.enum';

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
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /* 
    작성자 : 박신영
  */
  async enterBossRaid(createRaidDto: CreateRaidDTO): Promise<EnterBossRaidOption> {
    // 레이드 상태 조회
    let redisResult: RaidStatus;
    let dbResult: RaidStatus;
    try {
      // 레디스 조회시 결과
      redisResult = await this.getStatusFromRedis();
    } catch (error) {
      console.log(error);
      //레디스 에러 시 DB에서의 상태 조회 결과
      dbResult = await this.getStatusFromDB();
    }
    // 레이드 시작 불가능

    if (!redisResult?.canEnter) {
      throw new ForbiddenException('보스 레이드가 실행 중입니다.');
    }
    // 레이드 시작 가능
    try {
      const newBossRaid = this.raidRecordRepository.create({
        ...createRaidDto,
        score: 0,
      });
      const result = await this.raidRecordRepository.insert(newBossRaid);
      const raidRecordId = result.identifiers[0].id;

      const setRedis: RaidStatus = { canEnter: false, enteredUserId: createRaidDto.userId };
      await this.cacheManager.set('raidStatus', setRedis, { ttl: 180 });

      const enterOption: EnterBossRaidOption = {
        isEntered: true,
        raidRecordId,
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
  // - 3분이 지났는데 종료 요청이 들어오지 않은 경우 레디스는 어떻게??
  // 센트리로 에러 관리 추가 필요
  // 에러 타입화 추가 필요
  // 과제 예시에는 성공 시 body가 없음.. 레이드 시간초과 시 에러??
  async endRaid(raidEndDto: RaidEndDto) {
    const { userId, raidRecordId } = raidEndDto;
    const setRedis: RaidStatus = {
      canEnter: true,
      enteredUserId: null,
    };
    let raidRedisStatus: RaidStatus;

    try {
      raidRedisStatus = await this.cacheManager.get('raidStatus');
      // raidRadisStatus가 없다면 레이드 제한시간이 지난 경우
      if (!raidRedisStatus) {
        await this.cacheManager.set('raidStatus', setRedis, { ttl: 0 });

        const record: RaidRecord = await this.raidRecordRepository.findOne({
          where: { id: raidRecordId },
        });

        record.score = 0;
        await this.raidRecordRepository.save(record);
        return;
      }

      // 레이드 종료인데 입장 가능 상태 or 사용자 불일치 or 레이드 기록 불일치
      if (raidRedisStatus.canEnter || raidRedisStatus.enteredUserId !== userId) {
        throw new BadRequestException('레이드 상태와 일치하지 않은 요청입니다.');
      }

      const record: RaidRecord = await this.raidRecordRepository.findOne({
        where: {
          id: raidRecordId,
        },
        relations: ['user'],
      });
      // RaidRecord, User 일치하지 않으면 예외처리
      if (!record) {
        throw new NotFoundException('해당 레이드 기록을 찾을 수 없습니다.');
      }
      if (record.user.id !== userId) {
        throw new ForbiddenException('해당 사용자의 레이드 기록이 아닙니다.');
      }

      const response = await axios({
        url: process.env.STATIC_DATA_URL,
        method: 'GET',
      });
      const bossRaid = response.data.bossRaids[0];

      // 레벨에 따른 스코어 반영
      for (const l of bossRaid.levels) {
        if (l.level === record.level) {
          record.score = l.score;
          break;
        }
      }

      const user: User = await this.userRepository.findOne({
        where: { id: userId },
      });
      user.totalScore = user.totalScore + record.score;

      // 레디스 레이드 상태 초기화
      await this.cacheManager.set('raidStatus', setRedis, { ttl: 0 });

      // 레디스 레이드 랭킹 업뎃
      const ranking = await this.cacheManager.get('ranking');
      const scoreList = [];
      await this.cacheManager.set(`${userId}`, user.totalScore, { ttl: 0 });

      // raidRecord transaction.. manager +
      await this.raidRecordRepository.save(record);
      await this.userRepository.save(user);

      return record;
    } catch (error) {
      console.error(error);
    }
  }

  /* 
    작성자 : 김태영
  */
  async getStatusFromDB(): Promise<RaidStatus> {
    let raidRecord;
    try {
      raidRecord = await this.raidRecordRepository
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.user', 'user')
        .orderBy('enterTime', 'DESC')
        .getOne();
    } catch (error) {
      throw new InternalServerErrorException(ErrorType.databaseServerError.msg);
    }

    if (!raidRecord) throw new NotFoundException(ErrorType.raidRecordNotFound.msg);

    let bossRaid;
    try {
      const response = await axios({
        url: process.env.STATIC_DATA_URL,
        method: 'GET',
      });
      bossRaid = response.data.bossRaids[0];
    } catch (error) {
      throw new MisdirectedException(ErrorType.axiosError.msg);
    }

    const now = moment();
    const startedAt = moment(raidRecord.enterTime);

    const duration = moment.duration(now.diff(startedAt)).asSeconds();

    const result: RaidStatus =
      duration < bossRaid.bossRaidLimitSeconds
        ? { canEnter: false, enteredUserId: raidRecord.user.id }
        : { canEnter: true, enteredUserId: null };

    return result;
  }

  async getStatusFromRedis(): Promise<RaidStatus> {
    try {
      const getRedis: RaidRecord = await this.cacheManager.get('raidStatus');

      const result: RaidStatus = getRedis
        ? { canEnter: false, enteredUserId: getRedis.userId }
        : { canEnter: true, enteredUserId: null };

      return result;
    } catch (error) {
      throw new InternalServerErrorException(ErrorType.redisError.msg);
    }
  }

  /* 작성자 : 염하늘
    - raid 랭킹 조회 로직 구현
  */

  async rankRaid(dto: RequestRaidDto) {
    // 1유저 조회
    const findUser: User = await this.userRepository.findOne({
      where: {
        id: dto.userId,
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

    console.log(111111, bossRaid.levels);

    const myInfo: RankingInfo = {
      ranking: 1,
      userId: findUser.id,
      totalScore: findUser.totalScore,
    };

    const res: RankingInfo = {
      ranking: bossRaid.ranking,
      userId: 7,
      totalScore: bossRaid,
    };

    const result = ResponseRaidDto.usersInfo(myInfo, res);

    return result;
  }
}
