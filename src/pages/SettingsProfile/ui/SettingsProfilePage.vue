<script setup lang="ts">
import { IonAvatar } from '@ionic/vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/entities/user'
import { PageWrapper } from '@shared/ui/Page'

const { info } = storeToRefs(useUserStore())
</script>

<template>
  <PageWrapper is-inner title="Profile" default-href="/tabs/settings">
    <ion-item v-if="info" button>
      <ion-avatar slot="start" class="!w-12 !h-12">
        <img alt="Silhouette of a person's head" src="https://ionicframework.com/docs/img/demos/avatar.svg" />
      </ion-avatar>
      <div class="flex flex-col pl-4 py-3">
        <h2 class="text-base font-semibold !m-0">{{ info.profile.fullName }}</h2>
        <p class="text-sm text-muted">{{ info.email }}</p>
      </div>
    </ion-item>
  </PageWrapper>
</template>

<style scoped>

</style>
