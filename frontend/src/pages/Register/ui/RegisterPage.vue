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
