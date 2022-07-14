import { IRankingInfo } from "../rankingInfo.interface"

export class TopRankerListResDto {

    topRankerInfoList: IRankingInfo[]
    myRankingInfo: IRankingInfo  

        
  public static usersInfo(a: any, b: any) {
    const response = new TopRankerListResDto();

    response.topRankerInfoList = a;
    response.myRankingInfo = b;

    return response;
  }

}