import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class RaidEndDto {
  @ApiProperty({
    example: 1,
    description: '사용자 id',
    required: true,
  })  
  @IsNotEmpty()
  @IsNumber()
  readonly userId: number;

  @ApiProperty({
    example: 1,
    description: '레이드 기록 id',
    required: true,
  })  
  @IsNotEmpty()
  @IsNumber()
  readonly raidRecordId: number;
}
