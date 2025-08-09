<script setup lang="ts">
import {IonButton} from "@ionic/vue";
import {IconGoogle} from "@shared/ui/Icons";
</script>

<template>
  <ion-button color="light">
    <IconGoogle class="size-8 absolute left-0 top-1/2 -translate-y-1/2"/>
    <slot></slot>
  </ion-button>
</template>

<style scoped>

</style>
