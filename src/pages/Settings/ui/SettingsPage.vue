<script setup lang="ts">
import { IonList, IonItemGroup, IonItem, IonLabel, IonAvatar, IonBadge } from '@ionic/vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/entities/user'
import { useLogout } from '@/features/Auth'
import { useRouter } from 'vue-router'
import { PageWrapper } from '@shared/ui'
import { useConfirmationDialog } from '@shared/ui/ConfirmationDialog'
import { Pencil, SunMoon, LogOut, Bell, Languages } from 'lucide-vue-next'
import { computed } from 'vue'

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
</script>

<template>
  <PageWrapper title="Settings">
    <template #header-tools>
      <div v-if="info" slot="end">
        <RouterLink :to="{name: 'SettingsProfile'}">
          <ion-avatar>
            <img :alt="info.profile.fullName" :src="avatarUrl" />
            <ion-badge>
              <Pencil class="size-2" />
            </ion-badge>
          </ion-avatar>
        </RouterLink>
      </div>
    </template>

    <ion-list lines="full">
      <ion-item-divider>
        <ion-label> <span class="text-slate-500">General</span> </ion-label>
      </ion-item-divider>
      <ion-item-group>
        <ion-item button>
          <SunMoon class="size-5 text-slate-500" slot="start" />
          <ion-label>Appearance</ion-label>
        </ion-item>
        <ion-item button>
          <Bell class="size-5 text-slate-500" slot="start" />
          <ion-label>Notifications</ion-label>
        </ion-item>
        <ion-item button>
          <Languages class="size-5 text-slate-500" slot="start" />
          <ion-label>Language</ion-label>
        </ion-item>
      </ion-item-group>

      <ion-item-group>
        <ion-item button :detail="false" @click="handleLogout" lines="none">
          <LogOut class="size-5 text-slate-500" slot="start" />
          <ion-label>Logout</ion-label>
        </ion-item>
      </ion-item-group>
    </ion-list>
  </PageWrapper>
</template>

<style scoped>
ion-list {
  background: none;
  content: none;
}
ion-item-divider {
  --background: transparent;
  margin-bottom: 8px;
}
ion-item-group {
  overflow: hidden;
  margin-bottom: 18px;
  border-radius: 12px;
  @apply shadow-xl;
}
ion-item {
  --min-height: 52px;
}

ion-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  --padding-end: 0px;
  --padding-start: 0px;
  --padding-top: 0px;
  --padding-bottom: 0px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
