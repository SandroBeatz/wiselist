<script setup lang="ts">
import {PageWrapper} from "@shared/ui/Page";
import {RegisterForm, useGoogleAuth} from "@/features/Auth";
import {GoogleButton} from "@shared/ui/GoogleButton";
import {AppleButton} from "@shared/ui/AppleButton";

const {googleAuth} = useGoogleAuth()
</script>

<template>
  <PageWrapper is-inner title="Sign up" default-href="/login">
    <div class="flex-1 flex flex-col items-center justify-center">

      <!-- Header Section -->
      <div class="text-center mb-8">
        <!-- Simple Checklist Icon -->
<!--        <div class="mb-4 flex justify-center">-->
<!--          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-zinc-600">-->
<!--            <rect x="10" y="10" width="60" height="60" rx="8" stroke="currentColor" stroke-width="2" fill="none"/>-->
<!--            <path d="M25 35L35 45L55 25" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>-->
<!--            <circle cx="22" cy="52" r="2" fill="currentColor"/>-->
<!--            <line x1="30" y1="52" x2="55" y2="52" stroke="currentColor" stroke-width="2"/>-->
<!--            <circle cx="22" cy="60" r="2" fill="currentColor"/>-->
<!--            <line x1="30" y1="60" x2="55" y2="60" stroke="currentColor" stroke-width="2"/>-->
<!--          </svg>-->
<!--        </div>-->

        <h2 class="text-2xl font-bold text-zinc-800 mb-2">Join Wiselist</h2>
        <p class="text-zinc-500 text-base px-4">Create your account and start organizing everything that matters to you.</p>
      </div>

      <RegisterForm/>

      <div class="pt-14">
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
