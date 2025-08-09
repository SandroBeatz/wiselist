<script setup lang="ts">
import {LoginForm} from "@/features/Auth";
import {PageWrapper} from "@shared/ui/Page";
import {GoogleButton} from "@shared/ui/GoogleButton";
import {AppleButton} from "@shared/ui/AppleButton";
</script>

<template>
  <PageWrapper is-inner title="Login" default-href="/auth">
    <div class="flex-1 flex flex-col items-center justify-center">

      <LoginForm/>

      <div class="pt-8">
        <p class="text-sm text-center text-zinc-500 mb-8">
          Don't have an account? <router-link :to="{name: 'Register'}" class="text-primary">Sign up</router-link>
        </p>

        <div class="flex items-center justify-center gap-4 mb-4">
          <GoogleButton square />
          <ion-text>or</ion-text>
          <AppleButton square />
        </div>
      </div>
    </div>
  </PageWrapper>
</template>

<style scoped>
</style>
