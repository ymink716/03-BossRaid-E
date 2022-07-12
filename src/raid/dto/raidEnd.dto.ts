import { IsNotEmpty, IsNumber } from 'class-validator';

export class RaidEndDto {
  @IsNotEmpty()
  @IsNumber()
  readonly userId: number;

  @IsNotEmpty()
  @IsNumber()
  readonly raidRecordId: number;
}
