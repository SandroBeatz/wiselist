import { useLocalStorage } from '@vueuse/core'
import { storageKeys } from '@shared/constants/storage.constants'
import i18n from '@/app/i18n'
import type { Ref } from 'vue'
import type { SupportedLocale, LanguageInfo } from '@/app/i18n/types'

const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
]

/**
 * Language management service for handling locale switching
 */
class LanguageService {
  private _locale: Ref<string>

  constructor() {
    this._locale = useLocalStorage<string>(storageKeys.LOCALE, 'en')
  }

  /**
   * Initialize language service and sync with vue-i18n
   * Should be called in App.vue onBeforeMount
   */
  initialize(): void {
    // Sync locale from localStorage to vue-i18n
    if (this._locale.value) {
      (i18n.global.locale as any).value = this._locale.value as SupportedLocale
    }
  }

  /**
   * Get current locale
   */
  getLocale(): SupportedLocale {
    return this._locale.value as SupportedLocale
  }

  /**
   * Set new locale and sync with vue-i18n
   */
  setLocale(locale: SupportedLocale): void {
    this._locale.value = locale
    ;(i18n.global.locale as any).value = locale
  }

  /**
   * Get all supported languages
   */
  getSupportedLocales(): LanguageInfo[] {
    return SUPPORTED_LANGUAGES
  }

  /**
   * Get current language name in native form
   */
  getCurrentLocaleName(): string {
    const current = SUPPORTED_LANGUAGES.find(lang => lang.code === this._locale.value)
    return current?.name || 'English'
  }

  /**
   * Get reactive locale ref
   */
  get localeRef(): Ref<string> {
    return this._locale
  }
}

// Create singleton instance
export const languageService = new LanguageService()
