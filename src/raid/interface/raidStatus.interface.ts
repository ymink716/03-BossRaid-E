/**
 * @작성자 김태영
 * @description 레디스에 저장하는 레이드 상태 인터페이스
 */
export interface IRaidStatus {
  canEnter: boolean;
  enteredUserId: number;
  raidRecordId: number;
}
