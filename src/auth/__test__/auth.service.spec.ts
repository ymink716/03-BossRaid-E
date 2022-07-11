import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entities/user.entity';
import { DataSource, QueryBuilder } from 'typeorm';
import { LoginDto } from 'src/user/dto/login.dto';
import { classToPlain } from 'class-transformer';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { compare } from 'bcryptjs';

const mockUserRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;

  const qb = {
    connection: {},
  } as QueryBuilder<User>;

  class MockDataSource {
    createQueryBuilder(): QueryBuilder<User> {
      return qb;
    }
  }

  let email: string;
  let plainPassword: string;
  let hashedPassword: string;
  let payload: LoginDto;
  let user: User;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        JwtService,

        { provide: 'UserRepository', useFactory: mockUserRepository },
        { provide: DataSource, useClass: MockDataSource },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    plainPassword = 'password1234';
    payload = { email, password: plainPassword };
    const salt = await bcrypt.genSalt();
    hashedPassword = await bcrypt.hash(plainPassword, salt);

    user = {
      id: 1,
      email: 'team01@naver.com',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      hashedRefreshToken: 'string',
      moneyBooks: [],
      toJSON() {
        return classToPlain(this);
      },
    };

    jest.spyOn(userService, 'getUserByEmail').mockRejectedValue(user);
  });

  it('기본 테스트', () => {
    expect(authService).toBeDefined();
  });

  describe('validateUser', () => {
    it('기본 테스트', async () => {
      expect(authService.validateUser).toBeDefined();
    });
  });

  describe('verifyPassword ', () => {
    it('기본 테스트', async () => {
      expect(authService.verifyPassword).toBeDefined();
    });
  });

  describe('getTokens', () => {
    it('기본 테스트', async () => {
      expect(authService.getTokens).toBeDefined();
    });
  });

  describe('getJwtAccessToken', () => {
    it('기본 테스트', async () => {
      expect(authService.getJwtAccessToken).toBeDefined();
    });
  });

  describe('getJwtRefreshToken', () => {
    it('기본 테스트', async () => {
      expect(authService.getJwtRefreshToken).toBeDefined();
    });
  });

  describe('getCookiesForLogOut', () => {
    it('기본 테스트', async () => {
      expect(authService.getCookiesForLogOut).toBeDefined();
    });
  });
});
