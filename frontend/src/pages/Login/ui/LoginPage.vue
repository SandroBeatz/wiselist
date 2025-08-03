<script setup lang="ts">
import {LoginForm} from "@/features/Auth";
import {PageWrapper} from "@shared/ui/Page";
</script>

<template>
  <PageWrapper is-inner title="Login">
    <div class="flex-1 flex flex-col items-center justify-center">
      <div class="mb-14">
        <div class="text-2xl font-semibold">Wiselist</div>
      </div>

      <LoginForm/>

      <div class="pt-14">
        <div class="text-sm">Don't have an account? <router-link :to="{name: 'Register'}">Sign up</router-link></div>
      </div>
    </div>
  </PageWrapper>
</template>

<style scoped>
</style>
