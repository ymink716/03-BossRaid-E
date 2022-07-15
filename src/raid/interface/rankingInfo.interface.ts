/**
 * @작성자 염하늘
 * @description 랭킹을 처리하는 interface 구현
 */

export interface IRankingInfo {
    ranking: number; // 랭킹 1위의 ranking 값은 0입니다.
    userId: number;
    totalScore: number;
}