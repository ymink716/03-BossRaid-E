import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class RaidEnterDto {
  @ApiProperty({ description: '유저 아이디', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  readonly userId: number;

  @ApiProperty({ description: '보스 레이드 레벨', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  readonly level: number;
}
