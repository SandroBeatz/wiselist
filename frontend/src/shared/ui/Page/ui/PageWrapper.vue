<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonFooter,
} from '@ionic/vue'

defineProps<{
  title?: string
  isInner?: boolean
  defaultHref?: string
  noContentPadding?: boolean
}>()
</script>

<template>
  <IonPage ref="pageRef">
    <!-- Header Section -->
    <IonHeader v-if="isInner" mode="md" class="header-inner-page">
      <ion-toolbar class="header-inner-page__toolbar">
        <ion-buttons slot="start">
          <ion-back-button :default-href="defaultHref" text=""></ion-back-button>
        </ion-buttons>

        <ion-title class="ion-text-base ion-no-padding">{{title}}</ion-title>

        <ion-buttons slot="end" class="header-inner-page__tools">
          <slot name="header-tools"></slot>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="$slots['header']">
        <slot name="header"></slot>
      </ion-toolbar>
    </IonHeader>
    <template v-else>
      <div class="ios-top-space"></div>
      <IonHeader class="header-page">
        <ion-toolbar v-if="title || $slots['header-tools']" class="header-page__toolbar">
          <div class="text-3xl font-bold">{{title}}</div>

          <ion-buttons slot="end" class="header-page__tools">
            <slot name="header-tools"></slot>
          </ion-buttons>
        </ion-toolbar>
        <slot v-if="$slots['header']" name="header"></slot>
      </IonHeader>
    </template>

    <!-- Content Section -->
    <IonContent :class="{'ion-padding': !noContentPadding}" class="flex" fullscreen>
      <slot></slot>
    </IonContent>

    <IonFooter v-if="$slots['footer']" class="footer-page" mode="md">
      <ion-toolbar class="footer-page__toolbar">
        <slot name="footer"></slot>
      </ion-toolbar>
    </IonFooter>
  </IonPage>
</template>

<style scoped>
ion-content::part(scroll) {
  display: flex;
  flex-direction: column;
}

.header-page {
  box-shadow: none!important;
  --background: rgba(var(--ion-background-color-rgb), 0.3);
  background-color: rgba(var(--ion-background-color-rgb), 0.3);
  backdrop-filter: blur(10px);
}

.header-page__toolbar {
  background: none!important;
  --background: none!important;
  --padding-top: 20px;
  --padding-bottom: 11px;
  --padding-start: 20px;
  --padding-end: 20px;
  --border-width: 0!important;
}

.header-page__tools {
  padding: 0;
  margin-right: -10px;
}

.header-inner-page {
  box-shadow: none;
  --background: rgba(var(--ion-background-color-rgb), 0.3);
  background-color: rgba(var(--ion-background-color-rgb), 0.3);
  backdrop-filter: blur(10px);
}

.header-inner-page__toolbar {
  --min-height: 80px;
  background: none!important;
  --background: none!important;
  --border-width: 0!important;
}
.header-inner-page__tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6px;
}

.footer-page {
  box-shadow: none;
  background: transparent;
}

.footer-page__toolbar {
}
</style>
