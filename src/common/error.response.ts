import { BaseResponse } from 'src/common/baseResponse.dto';

export class DefaultError extends BaseResponse {
  constructor() {
    super();
  }

  public static error(statusCode?: number, message?: string) {
    const response = new DefaultError();

    response.message = message;
    response.statusCode = statusCode || 400;

    return response;
  }
}
