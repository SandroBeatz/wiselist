<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/entities/user'
import { useLogout } from '@/features/Auth'
import { useRouter } from 'vue-router'
import { PageWrapper, List } from '@shared/ui'
import { useConfirmationDialog } from '@shared/ui/ConfirmationDialog'
import { SunMoon, LogOut, Bell, Languages } from 'lucide-vue-next'
import { computed } from 'vue'
import type { ListProps } from '@shared/ui'
import { db } from '@shared/db'


const router = useRouter()

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

const listData = computed<ListProps>(() => ({
  sections: [
    {
      title: 'Profile',
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
      title: 'General',
      items: [
        {
          label: 'Appearance',
          icon: SunMoon,
          button: true,
          onClick: () => db.clearAll()
        },
        {
          label: 'Notifications',
          icon: Bell,
          button: true
        },
        {
          label: 'Language',
          icon: Languages,
          detail: 'EN',
          button: true
        }
      ]
    },
    {
      items: [
        {
          label: 'Logout',
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
  <PageWrapper title="Settings">
    <List v-if="info" :sections="listData.sections" />
  </PageWrapper>
</template>

