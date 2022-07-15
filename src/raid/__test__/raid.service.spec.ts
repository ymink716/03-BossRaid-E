/* 
    작성자 : 김태영
      - raid.service 유닛 테스트 파일 작성
  */

import { CacheModule, CACHE_MANAGER } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { User } from '@sentry/node';
import { Queue } from 'bullmq';

import { RedisModule } from 'nestjs-redis';
import { UserService } from 'src/user/user.service';
import { Connection, DataSource, QueryBuilder, QueryRunner, Repository } from 'typeorm';
import { RaidRecord } from '../entities/raid.entity';
import { RaidService } from '../raid.service';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn().mockReturnThis(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    delete: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
  }),
});

const mockUserService = () => ({});

describe('RaidService', () => {
  let raidService: RaidService;
  let raidRecordRepository: MockRepository<RaidRecord>;
  let userRepository: MockRepository<User>;
  let dataSource: DataSource;
  let cacheModule: CacheModule;

  const qb = {
    connection: {},
  } as QueryBuilder<RaidRecord>;

  const qr = {
    manager: {},
  } as QueryRunner;

  class MockDataSource {
    createQueryRunner(): QueryRunner {
      return qr;
    }

    createQueryBuilder(): QueryBuilder<RaidRecord> {
      return qb;
    }
  }

  qr.connect = jest.fn();
  qr.startTransaction = jest.fn();
  qr.commitTransaction = jest.fn();
  qr.rollbackTransaction = jest.fn();
  qr.release = jest.fn();

  beforeAll(async () => {
    Object.assign(qr.manager, { save: jest.fn() });

    const module = await Test.createTestingModule({
      providers: [
        RedisModule,
        CacheModule,
        RaidService,
        {
          provide: 'RaidRecordRepository',
          useFactory: mockRepository,
        },
        {
          provide: 'UserRepository',
          useFactory: mockRepository,
        },
        {
          provide: UserService,
          useFactory: mockUserService,
        },
        { provide: DataSource, useClass: MockDataSource },
        {
          provide: CACHE_MANAGER,
          useValue: CACHE_MANAGER,
        },
        { provide: 'BullQueue_playerQueue', useValue: [] },
        { provide: 'default_IORedisModuleConnectionToken', useExisting: RedisModule },
        { provide: Connection, useClass: MockDataSource },
      ],
    }).compile();

    raidService = module.get<RaidService>(RaidService);
    raidRecordRepository = module.get('RaidRecordRepository') as MockRepository<RaidRecord>;
    userRepository = module.get('UserRepository') as MockRepository<User>;
    dataSource = module.get<DataSource>(DataSource);
    cacheModule = module.get<CacheModule>(CacheModule);
  });

  it('isDefined 테스트', () => {
    expect(raidService).toBeDefined();
  });
});
