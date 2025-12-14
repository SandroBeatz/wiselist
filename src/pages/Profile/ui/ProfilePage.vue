<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toastController } from '@ionic/vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/entities/user'
import { useLogout } from '@/features/Auth'
import { PageWrapper, List } from '@shared/ui'
import { useConfirmationDialog } from '@shared/ui/ConfirmationDialog'
import { UserPen, KeyRound, UserX, Trash2, LogOut } from 'lucide-vue-next'
import type { ListProps } from '@shared/ui'

const router = useRouter()
const { t } = useI18n()

const { info } = storeToRefs(useUserStore())

const { logout } = useLogout()
const { open: openConfirmationDialog } = useConfirmationDialog()

const showComingSoon = async () => {
  const toast = await toastController.create({
    message: 'Coming soon',
    duration: 2000,
    color: 'medium',
    position: 'bottom',
  })
  await toast.present()
}

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
      items: [
        {
          label: t('profile.editProfile'),
          icon: UserPen,
          button: true,
          onClick: () => router.push({ name: 'SettingsProfile' }),
        },
        {
          label: t('profile.updatePassword'),
          icon: KeyRound,
          button: true,
          onClick: showComingSoon,
        },
        {
          label: t('profile.deleteAccount'),
          icon: UserX,
          button: true,
          onClick: showComingSoon,
        },
        {
          label: t('profile.deleteAllData'),
          icon: Trash2,
          button: true,
          onClick: showComingSoon,
        },
      ],
    },
    {
      items: [
        {
          label: t('common.logout'),
          icon: LogOut,
          button: true,
          detail: false,
          lines: 'none',
          onClick: handleLogout,
        },
      ],
    },
  ],
}))
</script>

<template>
  <PageWrapper is-inner :title="t('profile.title')" default-href="/tabs/settings">
    <List v-if="info" :sections="listData.sections" />
  </PageWrapper>
</template>
