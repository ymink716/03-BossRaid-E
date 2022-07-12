import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

export class CreateRaidDTO {
  // @IsNumber()
  // @IsNotEmpty()
  // readonly userId: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(2)
  readonly level: number;
}
