import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import CircuitBreaker from 'opossum';

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private breakers: Map<string, CircuitBreaker> = new Map();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handlerName = context.getHandler().name;
    let breaker = this.breakers.get(handlerName);

    if (!breaker) {
      breaker = new CircuitBreaker(async () => next.handle().toPromise(), {
        timeout: 3000, // 3 seconds
        errorThresholdPercentage: 50,
        resetTimeout: 30000, // 30 seconds
      });

      breaker.fallback(() => {
        throw new ServiceUnavailableException('Service temporarily unavailable (Circuit Open)');
      });

      this.breakers.set(handlerName, breaker);
    }

    return from(breaker.fire()).pipe(
      catchError((err) => throwError(() => err))
    );
  }
}
