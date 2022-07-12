import { ExecutionContext, Injectable, NestInterceptor, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as Sentry from '@sentry/minimal';
import { ErrorType } from 'src/common/error.enum';
import { Code } from 'typeorm';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        Sentry.captureException(error);

        let errorType = 'e';
        errorType = errorType ?? 'UNEXPECTED_ERROR';

        return of({
          statusCode: error.status,
          errorType,
          message: error.response.message,
          //   timestamp: new Date().getTime(),
        });
      }),
    );
  }
}
