<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/entities/user'
import { useLogout } from '@/features/Auth'
import { useRouter } from 'vue-router'
import { PageWrapper, List } from '@shared/ui'
import { useConfirmationDialog } from '@shared/ui/ConfirmationDialog'
import { useLanguageSwitcherDialog, languageService } from '@/features/Language'
import { SunMoon, LogOut, Bell, Languages, OctagonX } from 'lucide-vue-next'
import { computed } from 'vue'
import type { ListProps } from '@shared/ui'
import { db } from '@shared/db'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

const { info } = storeToRefs(useUserStore())

const avatarUrl = computed(
  () => info.value?.profile.avatar ?? 'https://ionicframework.com/docs/img/demos/avatar.svg'
)

const { logout } = useLogout()
const { open: openConfirmationDialog } = useConfirmationDialog()

const handleLogout = async () => {
  const dialog = await openConfirmationDialog({
    title: 'Logout',
    message: 'Are you sure you want to logout?',
    confirmText: 'Logout',
    cancelText: 'Cancel',
    onConfirm: logout,
  })

  await dialog.present()
}

const handleLanguageClick = async () => {
  const dialog = await useLanguageSwitcherDialog().open()
  await dialog.present()
}

const listData = computed<ListProps>(() => ({
  sections: [
    {
      title: t('settings.profile'),
      items: [
        {
          label: info.value?.profile.fullName || '',
          caption: info.value?.email || '',
          avatar: avatarUrl.value,
          button: true,
          onClick: () => router.push({ name: 'SettingsProfile' })
        }
      ]
    },
    {
      title: t('settings.general'),
      items: [
        {
          label: t('settings.appearance'),
          icon: SunMoon,
          button: true,
        },
        {
          label: t('settings.notifications'),
          icon: Bell,
          button: true
        },
        {
          label: t('settings.language'),
          icon: Languages,
          detail: languageService.getCurrentLocaleName(),
          button: true,
          onClick: handleLanguageClick
        },
        {
          label: t('settings.clearDatabase'),
          icon: OctagonX,
          button: true,
          onClick: () => db.clearAll()
        }
      ]
    },
    {
      items: [
        {
          label: t('common.logout'),
          icon: LogOut,
          button: true,
          detail: false,
          lines: 'none',
          onClick: handleLogout
        }
      ]
    }
  ]
}))
</script>

<template>
  <PageWrapper :title="t('settings.title')">
    <List v-if="info" :sections="listData.sections" />
  </PageWrapper>
</template>

