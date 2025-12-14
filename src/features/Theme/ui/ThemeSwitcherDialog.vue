<script setup lang="ts">
import { computed } from 'vue'
import { IonButton, IonButtons, modalController } from '@ionic/vue'
import { List } from '@shared/ui'
import { themeService } from '../model/theme.service'
import { X, Sun, Moon, MonitorSmartphone } from 'lucide-vue-next'
import type { ListProps } from '@shared/ui'
import { useI18n } from 'vue-i18n'
import type { ThemeMode } from '../types/theme.types'

const { t } = useI18n()

const currentTheme = computed(() => themeService.getThemeMode())

const themes: { mode: ThemeMode; label: string; icon: any }[] = [
  { mode: 'light', label: t('theme.light'), icon: Sun },
  { mode: 'dark', label: t('theme.dark'), icon: Moon },
  { mode: 'system', label: t('theme.system'), icon: MonitorSmartphone }
]

const handleSelectTheme = async (mode: ThemeMode) => {
  themeService.setThemeMode(mode)
  await closeModal()
}

const closeModal = () => {
  modalController.dismiss()
}

const themeListData = computed<ListProps>(() => ({
  sections: [
    {
      items: themes.map(theme => ({
        label: theme.label,
        icon: theme.icon,
        detail: currentTheme.value === theme.mode ? '✓' : undefined,
        button: true,
        onClick: () => handleSelectTheme(theme.mode)
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

    <div class="text-2xl font-semibold mb-8">{{ t('theme.title') }}</div>

    <List :sections="themeListData.sections" />
  </div>
</template>
