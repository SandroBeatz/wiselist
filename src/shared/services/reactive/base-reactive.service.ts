import { BehaviorSubject, Observable, Subject } from 'rxjs'
import { takeUntil, distinctUntilChanged } from 'rxjs/operators'

export interface ReactiveServiceConfig {
  enableLogging?: boolean
}

export abstract class BaseReactiveService {
  protected readonly destroy$ = new Subject<void>()
  protected readonly _loading$ = new BehaviorSubject<boolean>(false)
  protected readonly _error$ = new BehaviorSubject<string | null>(null)
  
  protected config: ReactiveServiceConfig

  constructor(config: ReactiveServiceConfig = {}) {
    this.config = { enableLogging: false, ...config }
  }

  get isLoading$(): Observable<boolean> {
    return this._loading$.asObservable()
  }

  get error$(): Observable<string | null> {
    return this._error$.asObservable()
  }

  protected setLoading(loading: boolean): void {
    this._loading$.next(loading)
  }

  protected setError(error: string | null): void {
    this._error$.next(error)
  }

  protected clearError(): void {
    this._error$.next(null)
  }

  protected log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[${this.constructor.name}] ${message}`, data || '')
    }
  }

  protected createObservable<K>(subject: BehaviorSubject<K>): Observable<K> {
    return subject.asObservable().pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    )
  }

  destroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
    this._loading$.complete()
    this._error$.complete()
  }
}