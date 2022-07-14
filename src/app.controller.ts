import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Get('cache')
  async aaa() {
    const hello = { hello: 'ddsds' };
    // await this.redis.set('hi', 1, 'EX', 5);

    await this.redis.set('hi', JSON.stringify(hello), 'EX', 5);
    const get = await this.redis.get('hi');
    await this.redis.zadd('zadd', 300, 1);
    await this.redis.zadd('zadd', 20, 2);

    const zadd = await this.redis.zrank('zadd', 1);
    console.log(zadd);
    const js = JSON.parse(get);
    console.log(js.hello);
  }
}
