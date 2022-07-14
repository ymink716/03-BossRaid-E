import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { RaidRecord } from './entities/raid.entity';
import { RaidController } from './raid.controller';
import { RaidService } from './raid.service';

@Module({
  imports: [TypeOrmModule.forFeature([RaidRecord, User])],
  controllers: [RaidController],
  providers: [RaidService, UserService],
})
export class RaidModule {}
