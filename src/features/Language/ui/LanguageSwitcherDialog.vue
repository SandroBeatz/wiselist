<script setup lang="ts">
import { computed } from 'vue'
import { IonButton, IonButtons, modalController } from '@ionic/vue'
import { List } from '@shared/ui'
import { languageService } from '../model/language.service'
import { X } from 'lucide-vue-next'
import type { ListProps } from '@shared/ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const currentLocale = computed(() => languageService.getLocale())
const languages = languageService.getSupportedLocales()

const handleSelectLanguage = async (locale: string) => {
  languageService.setLocale(locale as any)
  await closeModal()
}

const closeModal = () => {
  modalController.dismiss()
}

const languageListData = computed<ListProps>(() => ({
  sections: [
    {
      items: languages.map(lang => ({
        label: lang.name,
        detail: currentLocale.value === lang.code ? '✓' : undefined,
        button: false,
        onClick: () => handleSelectLanguage(lang.code)
      }))
    }
  ]
}))
</script>

<template>
  <div class="h-5 ion-padding flex-1 flex flex-col pt-8">
    <ion-buttons class="absolute right-1 top-1">
      <ion-button @click="closeModal" size="small">
        <X slot="icon-only" class="size-6"/>
      </ion-button>
    </ion-buttons>

    <div class="text-2xl font-semibold mb-8">{{ t('language.title') }}</div>

    <List :sections="languageListData.sections" />
  </div>
</template>
