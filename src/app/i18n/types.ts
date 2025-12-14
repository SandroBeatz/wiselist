import type en from './locales/en'

export type MessageSchema = typeof en
export type SupportedLocale = 'en' | 'ru' | 'de' | 'fr'

export interface LanguageInfo {
  code: SupportedLocale
  name: string
}

// Augment vue-i18n module for type safety
declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends MessageSchema {}
}
