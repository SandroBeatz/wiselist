// Common RxJS operators re-exports for consistent imports
export {
  // Creation operators
  of,
  from,
  fromEvent,
  timer,
  interval,
  throwError,
  EMPTY,
  NEVER
} from 'rxjs'

// Transformation operators
export {
  map,
  mergeMap,
  switchMap,
  concatMap,
  exhaustMap,
  scan,
  buffer,
  bufferTime,
  windowTime,
  groupBy
} from 'rxjs/operators'

// Filtering operators
export {
  filter,
  distinctUntilChanged,
  debounceTime,
  throttleTime,
  take,
  takeUntil,
  takeWhile,
  skip,
  first,
  last
} from 'rxjs/operators'

// Combination operators
export {
  combineLatest,
  merge,
  zip,
  forkJoin
} from 'rxjs'

export {
  mergeWith,
  combineLatestWith,
  startWith,
  withLatestFrom
} from 'rxjs/operators'

// Error handling operators
export {
  catchError,
  retry,
  retryWhen,
  finalize
} from 'rxjs/operators'

// Utility operators
export {
  tap,
  delay,
  timeout,
  share,
  shareReplay
} from 'rxjs/operators'