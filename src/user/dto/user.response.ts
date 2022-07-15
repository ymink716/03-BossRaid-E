import { ApiProperty } from '@nestjs/swagger';
import { BaseResponse } from '../../utils/responseHandler/baseResponse.dto';
import { User } from '../entities/user.entity';
import { BossRaidRecord } from './userInfo.dto';

export abstract class LoginResponseData {
  @ApiProperty({ description: 'User 정보' })
  user: User;
}

export abstract class SignUpResponse {
  @ApiProperty({ description: 'User 식별 고유 번호', example: 1 })
  userId: number;
}

export abstract class LookupUserResponse {
  @ApiProperty({ description: 'User 레이드 총 점수', example: 30 })
  totalScore: number;

  @ApiProperty({
    description: 'User 레이드 참여 기록',
    example: [
      {
        raidRecordId: 1,
        score: 30,
        enterTime: '입장 시간',
        endTime: '종료 시간',
      },
      {
        raidRecordId: 2,
        score: 50,
        enterTime: '입장 시간',
        endTime: '종료 시간',
      },
      {
        raidRecordId: 3,
        score: 0,
        enterTime: '입장 시간',
        endTime: '종료 시간',
      },
    ],
  })
  bossRaidHistory: BossRaidRecord[];
}

export class UserResponse extends BaseResponse {
  constructor() {
    super();
  }

  @ApiProperty()
  data: LoginResponseData | SignUpResponse | LookupUserResponse;

  public static response(data: any, statusCode?: number, message?: string) {
    const response = new UserResponse();
    response.data = data;
    response.message = message;
    response.statusCode = statusCode || 200;

    return response;
  }
}
