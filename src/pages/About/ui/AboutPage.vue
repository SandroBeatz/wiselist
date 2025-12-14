<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { PageWrapper } from '@shared/ui'

const { t } = useI18n()

const versionInfo = ref({
  version: '0.0.1',
  build: 'web'
})

onMounted(async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo()
      versionInfo.value = {
        version: info.version,
        build: info.build
      }
    } catch (error) {
      console.warn('Failed to get app info:', error)
    }
  }
})

const features = [
  'smartOrganization',
  'realTimeCollaboration',
  'easySignIn',
  'worksOffline',
  'crossPlatform'
]
</script>

<template>
  <PageWrapper is-inner :title="t('about.title')" default-href="/tabs/settings">
    <div class="ion-padding-horizontal pb-4 space-y-6">
      <!-- Intro -->
      <p class="text-base">{{ t('about.intro') }}</p>

      <!-- What is Wiselist -->
      <section class="space-y-2">
        <h2 class="text-xl font-semibold">{{ t('about.whatIs.title') }}</h2>
        <p class="text-base">{{ t('about.whatIs.content') }}</p>
      </section>

      <!-- Key Features -->
      <section class="space-y-3">
        <h2 class="text-xl font-semibold">{{ t('about.features.title') }}</h2>
        <div class="space-y-3">
          <div v-for="feature in features" :key="feature" class="space-y-1">
            <h3 class="text-base font-semibold">
              {{ t(`about.features.items.${feature}.title`) }}
            </h3>
            <p class="text-sm ion-text-mute">
              {{ t(`about.features.items.${feature}.description`) }}
            </p>
          </div>
        </div>
      </section>

      <!-- Why Wiselist -->
      <section class="space-y-2">
        <h2 class="text-xl font-semibold">{{ t('about.why.title') }}</h2>
        <p class="text-base whitespace-pre-line">{{ t('about.why.content') }}</p>
        <p class="text-base font-medium italic mt-4">{{ t('about.why.tagline') }}</p>
      </section>

      <!-- Version Info -->
      <section class="pt-4 border-t border-step-200">
        <p class="text-sm ion-text-quiet">
          {{ t('about.version.label') }} {{ versionInfo.version }}
          <span v-if="versionInfo.build !== 'web'">
            ({{ t('about.version.build') }} {{ versionInfo.build }})
          </span>
        </p>
      </section>
    </div>
  </PageWrapper>
</template>
