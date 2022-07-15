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
import { Connection, getConnection, Repository } from 'typeorm';
import { RaidEndDto } from './dto/raidEnd.dto';
import { RaidRecord } from './entities/raid.entity';
import { RaidEnterDto } from './dto/raidEnter.dto';
import { EnterBossRaidOption } from 'src/common/enterBossOption.interface';
import { RaidStatus } from './dto/raidStatus.dto';
import { Cache } from 'cache-manager';
import { TopRankerListDto } from './dto/topRankerList.dto';
import { IRankingInfo } from './rankingInfo.interface';
import { ErrorType } from 'src/common/error.enum';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import AxiosHelper from '../utils/axiosHelper';
import moment from 'moment';
import { UserService } from 'src/user/user.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { IRaidStatus } from './raidStatus.interface';

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
    @InjectRedis() private readonly redis: Redis,
    private readonly connection: Connection,
  ) {}

  /**
   * @작성자 박신영
   * @description 레이드 시작에 관한 비지니스 로직 구현
   */
  async enterBossRaid(raidEnterDto: RaidEnterDto): Promise<EnterBossRaidOption> {
    // - 레이드 상태 조회
    let redisResult: IRaidStatus;
    let dbResult: IRaidStatus;
    try {
      redisResult = await this.getStatusFromRedis();
      console.log(redisResult);
    } catch (error) {
      console.log(error);
      dbResult = await this.getStatusFromDB();
    }
    // 레이드 시작 불가능

    if (!redisResult?.canEnter) {
      throw new ForbiddenException('보스 레이드가 실행 중입니다.');
    }

    // queue에 저장
    try {
      const user = await this.addPlayerQueue(raidEnterDto);
      console.log(user);
    } catch (e) {
      console.error('E', e);
      throw new InternalServerErrorException(ErrorType.serverError);
    }

    // 레이드 시작 가능
    try {
      const user = await this.userRepository.findOne({ where: { id: raidEnterDto.userId } });
      const newBossRaid = this.raidRecordRepository.create({
        user,
        level: raidEnterDto.level,
        score: 0,
      });

      const raidRecord = await this.raidRecordRepository.save(newBossRaid);
      const setRedis: IRaidStatus = {
        canEnter: false,
        enteredUserId: raidEnterDto.userId,
        raidRecordId: raidRecord.id,
      };
      await this.cacheManager.set('raidStatus', setRedis, { ttl: 180 });

      const enterOption: EnterBossRaidOption = {
        isEntered: true,
        raidRecordId: newBossRaid.id,
      };

      return enterOption;
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * @작성자 박신영
   * @description queue에 사용자 추가
   */
  async addPlayerQueue(playerData: RaidEnterDto): Promise<object> {
    try {
      const { userId, level } = playerData;
      const player = await this.playerQueue.add('player', {
        userId,
        level,
      });

      return player;
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * @작성자 박신영
   * @description queue 비우기
   */
  async emptyPlayerQueue() {
    try {
      this.playerQueue.empty();
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * @작성자 김용민
   * @description 레이드 종료에 관한 비지니스 로직 구현
   */
  async endRaid(raidEndDto: RaidEndDto): Promise<void> {
    const { userId, raidRecordId } = raidEndDto;
    let raidStatus: IRaidStatus;

    try {
      raidStatus = await this.cacheManager.get('raidStatus');
      // 레이드 상태가 유효한 값인지 확인
      await this.checkRaidStatus(raidStatus, userId, raidRecordId);

      // S3에서 보스레이드 정보 가져오기
      const response = await AxiosHelper.getInstance();
      const bossRaid = response.data.bossRaids[0];

      const record: RaidRecord = await this.getRaidRecordById(raidRecordId);

      for (const l of bossRaid.levels) {
        if (l.level === record.level) {
          record.score = l.score; // 레이드 기록에 보스 레벨에 따른 스코어 반영
          break;
        }
      }
      const user: User = await this.userService.getUserById(userId);
      user.totalScore = user.totalScore + record.score; // 유저의 totalScore 변경

      await this.saveRaidRecord(user, record); // 레이드 기록 DB에 저장
      await this.cacheManager.del('raidStatus'); // 진행 중인 보스레이드 레디스에서 삭제
      await this.updateUserRanking(userId, record.score); // 유저 랭킹 업데이트
    } catch (error) {
      throw new InternalServerErrorException(ErrorType.serverError.msg);
    }
  }

  /**
   * @작성자 김태영
   * @description 데이터베이스에서 최근 레이드 기록을 통해 레이드 상태 정보 불러오기
   */
  async getStatusFromDB(): Promise<IRaidStatus> {
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

    const result: IRaidStatus =
      duration < bossRaid.bossRaidLimitSeconds
        ? { canEnter: false, enteredUserId: raidRecord.user.id, raidRecordId: raidRecord.id }
        : { canEnter: true, enteredUserId: null, raidRecordId: null };

    return result;
  }

  /**
   * @작성자 김태영
   * @description 레디스에서 레이드 상태 정보 불러오기
   */
  async getStatusFromRedis(): Promise<IRaidStatus> {
    try {
      const getRedis: IRaidStatus = await this.cacheManager.get('raidStatus');

      const result: IRaidStatus = getRedis ? getRedis : { canEnter: true, enteredUserId: null, raidRecordId: null };

      return result;
    } catch (error) {
      throw new InternalServerErrorException(ErrorType.redisError.msg);
    }
  }

  /**
   * @작성자 염하늘
   * @description 레이드 랭킹 조회 로직 구현
   */
  async rankRaid(dto: TopRankerListDto) {
    const user = await this.userService.getUserById(dto.userId);

    await this.staticDataCaching();

    // const response = await AxiosHelper.getInstance();
    // const bossRaid = response.data.bossRaids[0];

    const topRankerList = await this.getTopRankerList();

    const myInfo: IRankingInfo = {
      ranking: 1, // 변경
      userId: user.id,
      totalScore: user.totalScore,
    };
    return topRankerList;
  }

  /**
   * @작성자 염하늘
   * @description static data redis caching
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

  /**
   * @작성자 김태영, 염하늘
   * @description 랭크 탑 10 리스트 불러오기
   */
  async getTopRankerList(): Promise<IRankingInfo[]> {
    const member = await this.redis.zrevrange('Raid-Rank', 0, 9);

    // 해당 total 랭킹 리스트를 들고온다. 0 1 2 3 4

    const result: IRankingInfo[] = await Promise.all(
      member.map(async el => {
        const score = await this.redis.zscore('Raid-Rank', el);

        const sameScoreList = await this.redis.zrevrangebyscore('Raid-Rank', score, score);

        // 랭킹 리스트의 맨 처음 Key의 랭킹을 가져온다. 0
        const firstKey = sameScoreList[0];
        const rank = await this.redis.zrevrank('Raid-Rank', firstKey);

        const result: IRankingInfo = { ranking: rank + 1, userId: Number(el), totalScore: Number(score) };
        return result;
      }),
    );
    return result;
  }

  /**
   * @작성자 김용민
   * @description 레이드 종료 시 레이드 기록과 유저 정보를 트랜잭션으로 DB에 저장
   */
  async saveRaidRecord(user: User, record: RaidRecord): Promise<void> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');
    try {
      await queryRunner.manager.save(user);
      await queryRunner.manager.save(record);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * @작성자 김태영, 염하늘
   * @description 레이드 종료 시 유저 랭킹을 레디스에 업데이트
   */
  async updateUserRanking(userId: number, score: number): Promise<void> {
    try {
      await this.redis.zincrby('Raid-Rank', score, userId);
    } catch (error) {
      throw new InternalServerErrorException(ErrorType.redisError.msg);
    }
  }

  /**
   * @작성자 김용민
   * @description 레이드 상태가 유효한 값인지 확인
   */
  checkRaidStatus(raidStatus: IRaidStatus, userId: number, raidRecordId: number) {
    // raidStatus가 없다면 레이드가 진행 중이지 않거나 시간 초과
    if (!raidStatus) {
      throw new NotFoundException(ErrorType.raidStatusNotFound);
    }

    // 사용자 불일치 or 레이드 기록 불일치
    if (raidStatus.enteredUserId !== userId || raidStatus.raidRecordId !== raidRecordId) {
      throw new BadRequestException(ErrorType.raidStatusBadRequest);
    }
  }

  /**
   * @작성자 김용민
   * @description 레이드 기록 가져오기
   */
  async getRaidRecordById(raidStatusId: number) {
    const record = await this.raidRecordRepository.findOne({ where: { id: raidStatusId } });

    if (!record) {
      throw new NotFoundException(ErrorType.raidRecordNotFound);
    }

    return record;
  }
}
