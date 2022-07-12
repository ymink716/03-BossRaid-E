import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { BaseAPIDocumentation } from './config/baseApiDocs';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('/api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());

  // Swagger API Docs
  const documentOptions = new BaseAPIDocumentation().initializeOptions();
  const document = SwaggerModule.createDocument(app, documentOptions);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
