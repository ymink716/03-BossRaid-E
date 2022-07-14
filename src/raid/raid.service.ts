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
import { CreateRaidDTO } from './dto/raidEnter.dto';
import { EnterBossRaidOption } from 'src/common/enterBossOption.interface';
import { RaidStatus } from './dto/raidStatus.dto';
import { Cache } from 'cache-manager';
import { RequestRaidDto } from './dto/requestRaid.dto';
import { IRankingInfo } from './rankingInfo.interface';
import { ErrorType } from 'src/common/error.enum';
import { InjectQueue, Processor } from '@nestjs/bull';
import { Queue } from 'bull';
import AxiosHelper from './axiosHelper';
import moment from 'moment';
import { UserService } from 'src/user/user.service';
import { Job } from 'bullmq';

// require('moment-timezone');
// moment.tz.setDefault('Asia/Seoul');

@Injectable()
@Processor('playerQueue')
export class RaidService {
  constructor(
    @InjectRepository(RaidRecord)
    private readonly raidRecordRepository: Repository<RaidRecord>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private userService: UserService,
    @InjectQueue('playerQueue')
    private playerQueue: Queue,
  ) {}

  /* 
    작성자 : 박신영
  */
  async enterBossRaid(createRaidDto: CreateRaidDTO): Promise<EnterBossRaidOption> {
    // queue에 보스 레이드를 시작하려는 유저를 넣습니다.
    let queueData;
    try {
      await this.addPlayerQueue(createRaidDto);
      queueData = await this.playerQueue.getJobs(['delayed'], 0, 0, false);
      console.log(queueData);
    } catch (e) {
      throw new InternalServerErrorException(ErrorType.bullError);
    }

    // - 레이드 상태 조회
    let redisResult: RaidStatus;
    let dbResult: RaidStatus;
    try {
      redisResult = await this.getStatusFromRedis();
    } catch (error) {
      dbResult = await this.getStatusFromDB();
    }
    // 레이드 시작 불가능
    if (!redisResult?.canEnter) {
      throw new ForbiddenException('보스 레이드가 실행 중입니다.');
    }

    // 레이드 생성
    const { userId, level } = queueData[0].data;
    try {
      const raidData = await this.startBossRaid({ userId, level });
      return raidData;
    } catch (e) {
      throw new InternalServerErrorException(ErrorType.redisError);
    }
  }

  async startBossRaid(createRaidDto: CreateRaidDTO): Promise<EnterBossRaidOption> {
    try {
      const newBossRaid = this.raidRecordRepository.create({
        ...createRaidDto,
        score: 0,
      });
      const raidRecord = await this.raidRecordRepository.save(newBossRaid);
      const setRedis: RaidStatus = {
        canEnter: false,
        enteredUserId: createRaidDto.userId,
        raidRecordId: raidRecord.id,
      };
      await this.cacheManager.set('raidStatus', setRedis, { ttl: 180 });

      const enterOption: EnterBossRaidOption = {
        isEntered: true,
        raidRecordId: newBossRaid.id,
      };

      return enterOption;
    } catch (e) {
      throw new InternalServerErrorException(ErrorType.redisError);
    }
  }
  /* 
    작성자 : 박신영
    - 2. Producer
    - queue에 userId와 level을 추가합니다. (큐에 추가한 데이터를 Job이라고 합니다)
    - Job은 Consumer(raid.consumer)이 데이터를 처리하는데 필요한 데이터를 포함한 개체입니다. 
    - option은 지연(생성 시점 부터 작업을 실행할 시기), 시도(작업 실패 시 재시도 횟수)와 같은 옵션 등이 있습니다. 
  */

  async addPlayerQueue(playerData: CreateRaidDTO) {
    try {
      const player = await this.playerQueue.add('player', playerData, {
        removeOnComplete: true,
        removeOnFail: true,
        delay: 1,
      });
      return player;
    } catch (e) {
      throw new InternalServerErrorException(ErrorType.serverError);
    }
  }

  /* 
    작성자 : 김용민
      - 레이드 종료에 관한 비지니스 로직 구현
  */
  // 센트리로 에러 관리 추가 필요
  // 유저 랭킹 업데이트 추가 필요
  async endRaid(raidEndDto: RaidEndDto) {
    const { userId, raidRecordId } = raidEndDto;
    let raidStatus: RaidStatus;

    try {
      raidStatus = await this.cacheManager.get('raidStatus');
      // 레이드 상태가 유효한 값인지 확인
      await this.checkRaidStatus(raidStatus, userId, raidRecordId);

      // S3에서 보스레이드 정보 가져오기 (캐싱 이용하면 수정)
      const response = await AxiosHelper.getInstance();
      const bossRaid = response.data.bossRaids[0];

      const record: RaidRecord = await this.getRaidRecordById(raidRecordId);

      for (const l of bossRaid.levels) {
        if (l.level === record.level) {
          record.score = l.score; // 보스 레벨에 따른 스코어 반영
          break;
        }
      }

      const user: User = await this.userService.getUserById(userId);
      user.totalScore = user.totalScore + record.score; // 유저의 totalScore 변경

      await this.saveRaidRecord(user, record); // 레이드 기록 DB에 저장
      await this.cacheManager.del('raidStatus'); // 진행 중인 보스레이드 레디스에서 삭제
      await this.updateUserRanking(userId, user.totalScore); // 유저 랭킹 업데이트

      return record; // 과제에서는 응답 리스폰스 없음 (테스트 후 수정)
    } catch (error) {
      throw new InternalServerErrorException(ErrorType.serverError.msg);
    }
  }

  /**
   * @작성자 김태영
   * @description 데이터베이스에서 최근 레이드 기록을 통해 레이드 상태 정보 불러오기
   */
  async getStatusFromDB(): Promise<RaidStatus> {
    let raidRecord: RaidRecord;
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
        ? { canEnter: false, enteredUserId: raidRecord.user.id, raidRecordId: raidRecord.id }
        : { canEnter: true, enteredUserId: null, raidRecordId: null };

    return result;
  }

  /**
   * @작성자 김태영
   * @description 레디스에서 레이드 상태 정보 불러오기
   */
  async getStatusFromRedis(): Promise<RaidStatus> {
    try {
      const getRedis: RaidRecord = await this.cacheManager.get('raidStatus');

      const result: RaidStatus = getRedis
        ? { canEnter: false, enteredUserId: getRedis.userId, raidRecordId: getRedis.id }
        : { canEnter: true, enteredUserId: null, raidRecordId: null };

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

    await this.staticDataCaching();

    // const response = await AxiosHelper.getInstance();
    // const bossRaid = response.data.bossRaids[0];

    const myInfo: IRankingInfo = {
      ranking: 1, // 변경
      userId: user.id,
      totalScore: user.totalScore,
    };
    return myInfo;
  }

  /* 작성자 : 염하늘
  static data redis caching
  */
  public async staticDataCaching() {
    // S3 static data 가져오기
    const staticData = await AxiosHelper.getInstance();
    const bossRaid = staticData.data.bossRaids[0];
    console.log(111, bossRaid);

    await this.cacheManager.set('bossRaidLimitSeconds', bossRaid.bossRaidLimitSeconds);

    await this.cacheManager.set('level_0', bossRaid.levels[0].score);
    await this.cacheManager.set('level_1', bossRaid.levels[1].score);
    await this.cacheManager.set('level_2', bossRaid.levels[2].score);

    //   console log
    console.log(await this.cacheManager.get('bossRaidLimitSeconds'));
    console.log(await this.cacheManager.get('level_0'));
    console.log(await this.cacheManager.get('level_1'));
    console.log(await this.cacheManager.get('level_2'));
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
    try {
      let ranking;
      ranking = await this.cacheManager.get('ranking');

      if (!ranking) {
        ranking = new Map();
      }

      ranking.set(`${userId}`, totalScore);
      await this.cacheManager.set('ranking', ranking, { ttl: 0 });
    } catch (error) {
      throw new InternalServerErrorException(ErrorType.redisError.msg);
    }
  }

  /* 
    작성자 : 김용민
      - 레이드 상태가 유효한 값인지 확인
  */
  checkRaidStatus(raidStatus: RaidStatus, userId: number, raidRecordId: number) {
    // raidStatus가 없다면 레이드가 진행 중이지 않거나 시간 초과
    if (!raidStatus) {
      throw new NotFoundException(ErrorType.raidStatusNotFound);
    }

    // 사용자 불일치 or 레이드 기록 불일치
    if (raidStatus.enteredUserId !== userId || raidStatus.raidRecordId !== raidRecordId) {
      throw new BadRequestException(ErrorType.raidStatusBadRequest);
    }
  }

  async getRaidRecordById(raidStatusId: number) {
    const record = await this.raidRecordRepository.findOne({ where: { id: raidStatusId } });

    if (!record) {
      throw new NotFoundException(ErrorType.raidRecordNotFound);
    }

    return record;
  }
}
