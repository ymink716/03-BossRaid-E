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
import { getConnection, Repository } from 'typeorm';
import { RaidEndDto } from './dto/raidEnd.dto';
import { RaidRecord } from './entities/raid.entity';
import { CreateRaidDTO } from './dto/createRaid.dto';
import { EnterBossRaidOption } from 'src/common/enterBossOption.interface';
import { defaultRaidStatus, RaidStatus } from './dto/raidStatus.dto';
import { Cache } from 'cache-manager';
import { RequestRaidDto } from './dto/requestRaid.dto';
import { RankingInfo } from './rankingInfo.interface';
import { ResponseRaidDto } from './dto/responseRaid.dto';
import { ErrorType } from 'src/common/error.enum';
import AxiosHelper from './axiosHelper';
import moment from 'moment';

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
      - 레이드 종료에 관한 비지니스 로직 구현
  */
  // 센트리로 에러 관리 추가 필요
  // 에러 타입화 추가 필요
  // 유저 랭킹 업데이트 추가 필요
  async endRaid(raidEndDto: RaidEndDto) {
    const { userId, raidRecordId } = raidEndDto;
    let raidStatus: RaidStatus;


    try {
      raidStatus = await this.cacheManager.get('raidStatus');
      // raidStatus가 없다면 레이드가 진행 중이지 않거나 시간 초과
      if (!raidStatus) {
        await this.cacheManager.set('raidStatus', defaultRaidStatus, { ttl: 0 });
        throw new NotFoundException('진행 중인 레이드 정보가 없습니다.');
      }

      // 레이드 종료인데 입장 가능 상태 or 사용자 불일치 or 레이드 기록 불일치
      if (raidStatus.canEnter || raidStatus.enteredUserId !== userId || raidStatus.raidRecord.id !== raidRecordId) {
        throw new BadRequestException('진행 중인 레이드 정보와 일치하지 않습니다.');

      }

      const response = await axios({
        url: process.env.STATIC_DATA_URL,
        method: 'GET',
      });
      const bossRaid = response.data.bossRaids[0];

      const record: RaidRecord = raidStatus.raidRecord;
      for (const l of bossRaid.levels) {
        if (l.level === record.level) {
          record.score = l.score;  // 보스 레벨에 따른 스코어 반영
          break;
        }
      }

      const user: User = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('해당 사용자를 찾을 수 없습니다.');
      }
      user.totalScore = user.totalScore + record.score;  // 유저의 totalScore 변경

      // 레이드 상태 DB에 저장
      await this.saveRaidRecord(user, record);
      // 레이드 상태 초기화
      await this.cacheManager.set('raidStatus', defaultRaidStatus, { ttl: 0 });
      // 유저 랭킹 업데이트
      await this.updateUserRanking(userId, user.totalScore);
      
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
    
    const user = await this.existUser(dto);
    console.log(111, user);

    const response = await AxiosHelper.getInstance();
    const bossRaid = response.data.bossRaids[0];
    console.log(222, bossRaid);

    const myInfo: RankingInfo = {
      ranking: 1,
      userId: user.id,
      totalScore: user.totalScore,
    };
    return myInfo;
  }
  /*
     작성자 : 염하늘
     - user 조회 로직 함수화
  */
  public async existUser(requestDto: CreateRaidDTO | RaidEndDto | RequestRaidDto) {
    const existUser: User = await this.userRepository.findOne({
      where: {
        id: requestDto.userId,
      },
    });
    if (!existUser) {
      throw new NotFoundException(ErrorType.userNotFound.msg);
    } else {
      return existUser;
    }
  }

  /* 
    작성자 : 김용민
      - 레이드 종료 시 레이드 기록과 유저 정보를 트랜잭션으로 DB에 저장
  */
  async saveRaidRecord(user: User, record: RaidRecord): Promise<void> {
    const queryRunner = getConnection().createQueryRunner();

    try {
      queryRunner.startTransaction();
      await this.raidRecordRepository.save(record);
      await this.userRepository.save(user);
      queryRunner.commitTransaction();
    } catch (error) {
      queryRunner.rollbackTransaction();
    } finally {
      queryRunner.release();
    }
  }

  /* 
    작성자 : 김용민
      - 레이드 종료 시 유저 랭킹을 레디스에 업데이트
  */
  async updateUserRanking(userId: number, totalScore: number): Promise<void> {
    let ranking;
    ranking = await this.cacheManager.get('ranking');
  
    if (!ranking) {
      ranking = new Map();
    }

    ranking.set(`${userId}`, totalScore);
    await this.cacheManager.set('ranking', ranking, { ttl: 0 })
  }
}
