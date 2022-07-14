import { IRankingInfo } from "../rankingInfo.interface"

export class ResponseRaidDto {

    topRankerInfoList: IRankingInfo[]
    myRankingInfo: IRankingInfo  

        
  public static usersInfo(a: any, b: any) {
    const response = new ResponseRaidDto();

    response.topRankerInfoList = a;
    response.myRankingInfo = b;

    return response;
  }

}