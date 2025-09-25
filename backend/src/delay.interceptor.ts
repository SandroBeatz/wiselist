import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

@Injectable()
export class DelayInterceptor implements NestInterceptor {
    constructor(private delayMs: number = 2000) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        console.log(`\x1b[33mAdding ${this.delayMs}ms delay for ${request.url}\x1b[0m`);

        return next.handle().pipe(
            delay(this.delayMs),
            tap(() => console.log(`\x1b[33mRequest ${request.url} completed with delay\x1b[0m`))
        );
    }
}
