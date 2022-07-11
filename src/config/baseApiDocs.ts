import { DocumentBuilder } from '@nestjs/swagger';

export class BaseAPIDocumentation {
  public builder = new DocumentBuilder();

  public initializeOptions() {
    return this.builder
      .setTitle('Boss Raid API Server')
      .setDescription('boss Raid API 서버입니다.')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'access_token',
          description: 'access token을 입력하세요.',
          in: 'header',
        },
        'access_token',
      )
      .build();
  }
}
