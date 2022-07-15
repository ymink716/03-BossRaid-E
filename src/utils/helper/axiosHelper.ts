import axios from 'axios';

/**
 * @작성자 염하늘
  * @description 보스레이드 정보를 가져온다.
  */
export default class AxiosHelper {
  public static async getInstance() {
    const url = process.env.STATIC_DATA_URL;
    return await axios.get(url);
  }
}
