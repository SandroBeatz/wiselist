<script setup lang="ts">
import { LoginForm, useGoogleAuth } from '@/features/Auth'
import { PageWrapper } from '@shared/ui/Page'
import { GoogleButton } from '@shared/ui/GoogleButton'
import { AppleButton } from '@shared/ui/AppleButton'

const { googleAuth } = useGoogleAuth()
</script>

<template>
  <PageWrapper is-inner title="Login" default-href="/auth">
    <div class="flex-1 flex flex-col items-center justify-center">

      <!-- Header Section -->
      <div class="text-center mb-8">
        <!-- Simple List Icon -->
<!--        <div class="mb-4 flex justify-center">-->
<!--          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-zinc-600">-->
<!--            <rect x="10" y="15" width="60" height="50" rx="8" stroke="currentColor" stroke-width="2" fill="none"/>-->
<!--            <circle cx="22" cy="28" r="2" fill="currentColor"/>-->
<!--            <line x1="30" y1="28" x2="55" y2="28" stroke="currentColor" stroke-width="2"/>-->
<!--            <circle cx="22" cy="40" r="2" fill="currentColor"/>-->
<!--            <line x1="30" y1="40" x2="55" y2="40" stroke="currentColor" stroke-width="2"/>-->
<!--            <circle cx="22" cy="52" r="2" fill="currentColor"/>-->
<!--            <line x1="30" y1="52" x2="55" y2="52" stroke="currentColor" stroke-width="2"/>-->
<!--          </svg>-->
<!--        </div>-->

        <h2 class="text-2xl font-bold text-zinc-800 mb-2">Welcome back!</h2>
        <p class="text-zinc-500 text-base px-4">Sign in to continue organizing your lists and get things done.</p>
      </div>

      <LoginForm/>

      <div class="pt-8">
        <p class="text-sm text-center text-zinc-500 mb-8">
          Don't have an account? <router-link :to="{name: 'Register'}" class="text-primary">Sign up</router-link>
        </p>

        <div class="flex items-center justify-center gap-4 mb-4">
          <GoogleButton @click="googleAuth" square />
          <ion-text>or</ion-text>
          <AppleButton square />
        </div>
      </div>
    </div>
  </PageWrapper>
</template>

<style scoped>
</style>
