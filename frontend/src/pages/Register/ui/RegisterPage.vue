<script setup lang="ts">
import {Page} from "@shared/ui/Page";
import {RegisterForm} from "@/features/Auth";
</script>

<template>
  <Page is-inner title="Sign up">
    <div class="flex-1 flex flex-col items-center justify-center">
      <RegisterForm/>
    </div>
  </Page>
</template>

<style scoped>
ion-content::part(scroll) {
  display: flex;
}
</style>
