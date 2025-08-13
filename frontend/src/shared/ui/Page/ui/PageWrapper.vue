<script setup lang="ts">
import {IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonFooter} from "@ionic/vue";

defineProps<{
  title?: string
  isInner?: boolean
  defaultHref?: string
  noContentPadding?: boolean
}>()
</script>

<template>
  <ion-page ref="pageRef">
    <!-- Header Section -->
    <ion-header v-if="isInner" mode="md" class="header-inner-page">
      <ion-toolbar class="header-inner-page__toolbar">
        <ion-buttons slot="start">
          <ion-back-button :default-href="defaultHref" text=""></ion-back-button>
        </ion-buttons>

        <slot v-if="$slots['header']" name="header"></slot>
        <ion-title v-else class="ion-text-base ion-no-padding">{{title}}</ion-title>

        <ion-buttons slot="end" class="header-inner-page__tools">
          <slot name="header-tools"></slot>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <template v-else>
      <div class="ios-top-space"></div>
      <ion-header class="header-page">
        <ion-toolbar v-if="title || $slots['header-tools']" class="header-page__toolbar">
          <ion-title class="ion-text-lg ion-text-semibold">{{title}}</ion-title>

          <ion-buttons slot="end" class="header-inner-page__tools">
            <slot name="header-tools"></slot>
          </ion-buttons>
        </ion-toolbar>
        <slot v-if="$slots['header']" name="header"></slot>
      </ion-header>
    </template>

    <!-- Content Section -->
    <ion-content :class="{'ion-padding': !noContentPadding}" fullscreen>
      <slot></slot>
    </ion-content>

    <ion-footer v-if="$slots['footer']" class="footer-page" mode="md">
      <ion-toolbar class="footer-page__toolbar">
        <slot name="footer"></slot>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<style scoped>
ion-content::part(scroll) {
  display: flex;
  flex-direction: column;
}



.header-page {
  box-shadow: none!important;
  background: var(--ion-background-color);
  --background: var(--ion-background-color);
}

.header-page__toolbar {
  background: var(--ion-background-color);
  --background: var(--ion-background-color);
  --padding-top: 10px;
  --padding-bottom: 10px;
}

.header-inner-page {
  box-shadow: none;
  background: transparent;
}

.header-inner-page__toolbar {
  --min-height: 80px;
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
