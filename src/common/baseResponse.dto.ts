import { ApiProperty } from '@nestjs/swagger';

/* 
  작성자 : 박신영
    - base response template 작성
*/
export abstract class BaseResponse {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;
}
