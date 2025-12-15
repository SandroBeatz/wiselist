<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/entities/user'
import { useRouter } from 'vue-router'
import { PageWrapper, List } from '@shared/ui'
import { useLanguageSwitcherDialog, languageService } from '@/features/Language'
import { useThemeSwitcherDialog, themeService } from '@/features/Theme'
import { SunMoon, Bell, Languages, Mail, Info, HelpCircle, Crown, Share2, Star } from 'lucide-vue-next'
import { toastController } from '@ionic/vue'
import { computed } from 'vue'
import type { ListProps } from '@shared/ui'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

const { info } = storeToRefs(useUserStore())

const avatarUrl = computed(
  () => info.value?.profile.avatar ?? 'https://ionicframework.com/docs/img/demos/avatar.svg'
)

const handleLanguageClick = async () => {
  const dialog = await useLanguageSwitcherDialog().open()
  await dialog.present()
}

const handleThemeClick = async () => {
  const dialog = await useThemeSwitcherDialog().open()
  await dialog.present()
}

const showComingSoon = async () => {
  const toast = await toastController.create({
    message: 'Coming soon',
    duration: 2000,
    color: 'medium',
    position: 'bottom',
  })
  await toast.present()
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
          onClick: () => router.push({ name: 'Profile' })
        }
      ]
    },
    {
      title: t('settings.general'),
      items: [
        {
          label: t('settings.notifications'),
          icon: Bell,
          button: true,
          onClick: () => router.push({ name: 'NotificationSettings' })
        },
        {
          label: t('settings.contacts'),
          icon: Mail,
          button: true,
          onClick: showComingSoon
        },
        {
          label: t('settings.appearance'),
          icon: SunMoon,
          detail: themeService.getCurrentThemeLabel(),
          button: true,
          onClick: handleThemeClick
        },
        {
          label: t('settings.language'),
          icon: Languages,
          detail: languageService.getCurrentLocaleName(),
          button: true,
          onClick: handleLanguageClick
        }
      ]
    },
    {
      title: t('settings.supportAndAbout'),
      items: [
        {
          label: t('settings.aboutApp'),
          icon: Info,
          button: true,
          onClick: () => router.push({ name: 'About' })
        },
        {
          label: t('settings.helpAndSupport'),
          icon: HelpCircle,
          button: true,
          onClick: showComingSoon
        }
      ]
    },
    {
      title: t('settings.more'),
      items: [
        {
          label: t('settings.subscription'),
          icon: Crown,
          button: true,
          onClick: showComingSoon
        },
        {
          label: t('settings.share'),
          icon: Share2,
          button: true,
          onClick: showComingSoon
        },
        {
          label: t('settings.rateTheApp'),
          icon: Star,
          button: true,
          onClick: showComingSoon
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

