/* 
  작성자 : 염하늘, 김용민
    - 중복되는 token 설정값을 인터페이스화하여 로직 개선
*/
export interface ITokenOption {
  domain: string;
  path: string;
  httpOnly: boolean;
  maxAge?: number;
}

export const defaultTokenOption: ITokenOption = {
  domain: 'localhost',
  path: '/',
  httpOnly: true,
};
