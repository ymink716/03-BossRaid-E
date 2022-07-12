import {
    ExecutionContext,
    Injectable,
    NestInterceptor,
    CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/minimal';
import { HttpErrorType } from 'src/common/httpError.type';

@Injectable()
export class SentryInterceptor implements NestInterceptor{
    intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            catchError((error) => {
                Sentry.captureException(error);

                let errorType = HttpErrorType[status];
                errorType = errorType ?? 'UNEXPECTED_ERROR';

                return of({
                    statusCode: error.status,
                    errorType,
                    message: error.response.message,
                });
            }),
        );
    }
}