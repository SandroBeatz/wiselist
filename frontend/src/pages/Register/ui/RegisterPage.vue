<script setup lang="ts">
import {PageWrapper} from "@shared/ui/Page";
import {RegisterForm} from "@/features/Auth";
</script>

<template>
  <PageWrapper is-inner title="Sign up">
    <div class="flex-1 flex flex-col items-center justify-center">
      <RegisterForm/>
    </div>
  </PageWrapper>
</template>

<style scoped>
ion-content::part(scroll) {
  display: flex;
}
</style>
