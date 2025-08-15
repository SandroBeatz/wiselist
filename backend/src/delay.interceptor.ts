import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

@Injectable()
export class DelayInterceptor implements NestInterceptor {
    constructor(private delayMs: number = 2000) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        console.log(`Добавляем задержку ${this.delayMs}мс для ${request.url}`);

        return next.handle().pipe(
            delay(this.delayMs),
            tap(() => console.log(`Запрос ${request.url} завершен с задержкой`))
        );
    }
}
