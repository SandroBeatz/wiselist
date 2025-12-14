import type { SupportedLocale } from './types'

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'ru', 'de', 'fr']
export const DEFAULT_LOCALE: SupportedLocale = 'en'
export const FALLBACK_LOCALE: SupportedLocale = 'en'

export const i18nConfig = {
  legacy: false, // Use Composition API
  locale: DEFAULT_LOCALE,
  fallbackLocale: FALLBACK_LOCALE,
  globalInjection: true,
  missingWarn: false,
  fallbackWarn: false,
}
