import { createI18n } from 'vue-i18n'
import { i18nConfig } from './config'
import en from './locales/en'
import ru from './locales/ru'
import de from './locales/de'
import fr from './locales/fr'
import type { MessageSchema } from './types'

const i18n = createI18n<[MessageSchema], 'en' | 'ru' | 'de' | 'fr'>({
  ...i18nConfig,
  messages: {
    en,
    ru,
    de,
    fr,
  },
})

export default i18n
