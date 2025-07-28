<script setup lang="ts">
import {Page} from "@shared/ui/Page";
import {LoginForm} from "@/features/Auth";
</script>

<template>
  <Page is-inner title="Login">
    <div class="flex-1 flex flex-col items-center justify-center">
      <div class="mb-14">
        <div class="text-2xl font-semibold">Wiselist</div>
      </div>

      <LoginForm/>

      <div class="pt-14">
        <div class="text-sm">Don't have an account? <router-link :to="{name: 'Register'}">Sign up</router-link></div>
      </div>
    </div>
  </Page>
</template>

<style scoped>
</style>
