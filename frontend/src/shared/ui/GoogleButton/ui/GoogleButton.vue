<script setup lang="ts">
import {IonButton} from "@ionic/vue";
import {IconGoogle} from "@shared/ui/Icons";

interface Props {
  square?: boolean;
}

withDefaults(defineProps<Props>(), {
  square: false
});
</script>

<template>
  <ion-button
    color="light"
    :class="square ? 'square-button' : ''"
  >
    <IconGoogle :class="square ? 'size-10' : 'size-8 absolute left-0 top-1/2 -translate-y-1/2'"/>
    <slot v-if="!square"></slot>
  </ion-button>
</template>

<style scoped>
.square-button {
  --min-width: 54px;
  --min-height: 54px;
  width: 54px;
  height: 54px;
  --border-radius: 12px;
}
</style>
