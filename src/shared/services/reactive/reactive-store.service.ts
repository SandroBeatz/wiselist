import { BehaviorSubject, Observable } from 'rxjs'
import { map, filter } from 'rxjs/operators'
import { BaseReactiveService, ReactiveServiceConfig } from './base-reactive.service'

export interface ReactiveStoreState<T = any> {
  data: T
  lastUpdated: number
  version: number
}

export abstract class ReactiveStoreService<T> extends BaseReactiveService {
  protected readonly _state$ = new BehaviorSubject<ReactiveStoreState<T>>(
    this.getInitialState()
  )

  constructor(config: ReactiveServiceConfig = {}) {
    super(config)
  }

  protected abstract getInitialState(): ReactiveStoreState<T>

  get state$(): Observable<ReactiveStoreState<T>> {
    return this.createObservable(this._state$)
  }

  get data$(): Observable<T> {
    return this._state$.pipe(
      map(state => state.data),
      filter(data => data !== null && data !== undefined)
    )
  }

  get currentState(): ReactiveStoreState<T> {
    return this._state$.getValue()
  }

  get currentData(): T {
    return this.currentState.data
  }

  protected updateState(data: T, version?: number): void {
    const currentState = this.currentState
    const newState: ReactiveStoreState<T> = {
      data,
      lastUpdated: Date.now(),
      version: version ?? currentState.version + 1
    }

    this._state$.next(newState)
    this.log('State updated', { 
      version: newState.version, 
      timestamp: newState.lastUpdated 
    })
  }

  protected patchState(partialData: Partial<T>, version?: number): void {
    const currentData = this.currentData
    if (typeof currentData === 'object' && currentData !== null) {
      const updatedData = { ...currentData, ...partialData } as T
      this.updateState(updatedData, version)
    } else {
      this.log('Cannot patch non-object state', { currentData })
    }
  }

  reset(): void {
    this.updateState(this.getInitialState().data, 0)
    this.clearError()
  }

  destroy(): void {
    this._state$.complete()
    super.destroy()
  }
}