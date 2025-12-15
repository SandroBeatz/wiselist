<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PageWrapper, List } from '@shared/ui'
import { notificationService } from '@/features/Notification'
import { Bell, Share2 } from 'lucide-vue-next'
import { toastController } from '@ionic/vue'
import type { ListProps } from '@shared/ui'

const { t } = useI18n()

// Reactive reference to notification settings
const settings = notificationService.settingsRef

/**
 * Handle list sharing toggle
 * Currently a stub - will integrate with WebSocket when backend ready
 */
const handleListSharingToggle = async (enabled: boolean) => {
  notificationService.setListSharingEnabled(enabled)

  // Show feedback toast
  await showToast(
    enabled ? t('notifications.listSharing.enabled') : t('notifications.listSharing.disabled')
  )
}

/**
 * Handle reminder toggle with permission request
 */
const handleReminderToggle = async (enabled: boolean) => {
  const success = await notificationService.setReminderEnabled(enabled)

  if (!success && enabled) {
    // Permission denied - show message
    await showToast(t('notifications.reminder.permissionDenied'), 'warning')
    // Revert toggle state in UI
    settings.value.reminder = false
  } else {
    await showToast(
      enabled ? t('notifications.reminder.enabled') : t('notifications.reminder.disabled')
    )
  }
}

/**
 * Show feedback toast
 */
const showToast = async (message: string, color: string = 'success') => {
  const toast = await toastController.create({
    message,
    duration: 2000,
    color,
    position: 'bottom',
  })
  await toast.present()
}

/**
 * Compute list data structure
 */
const listData = computed<ListProps>(() => ({
  sections: [
    {
      title: t('notifications.sectionTitle'),
      items: [
        {
          label: t('notifications.listSharing.label'),
          caption: t('notifications.listSharing.caption'),
          icon: Share2,
          hasToggle: true,
          toggleValue: settings.value.listSharing,
          onToggle: handleListSharingToggle,
        },
        {
          label: t('notifications.reminder.label'),
          caption: t('notifications.reminder.caption'),
          icon: Bell,
          hasToggle: true,
          toggleValue: settings.value.reminder,
          onToggle: handleReminderToggle,
        },
      ],
    },
  ],
}))
</script>

<template>
  <PageWrapper :title="t('notifications.title')" is-inner>
    <List :sections="listData.sections" />
  </PageWrapper>
</template>
