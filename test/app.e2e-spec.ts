import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as cookieParser from 'cookie-parser';
import { TypeOrmModule } from '@nestjs/typeorm';

// import { AppController } from 'src/app.controller';
// import { AppService } from 'src/app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('/api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe());

    await app.init();
  });

  // describe('회원가입', () => {
  //   it('POST 201', () => {
  //     return request(app.getHttpServer())
  //       .post('api/signup')
  //       .send({
  //         email: 'test@test.com',
  //         password: 'testpassword',
  //         confirmPassword: 'testpassword',
  //       })
  //       .expect(201);
  //   });

  //   it('POST 400', () => {
  //     return request(app.getHttpServer())
  //       .post('api/signup')
  //       .send({
  //         email: 'test',
  //         password: '1234',
  //         confirmPassword: '1234',
  //       })
  //       .expect(400);
  //   });
  // });
});
