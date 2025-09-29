<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon?: Component
  iconClass?: string
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="flex-1 flex flex-col justify-center items-center text-center py-12">
    <div v-if="icon" class="mb-4 flex justify-center">
      <component :is="icon" class="size-10 text-zinc-400" :class="iconClass"></component>
    </div>
    <h3 v-if="title" class="text-xl font-bold text-zinc-700 mb-2">{{title}}</h3>
    <p v-if="description" class="text-zinc-500 mb-6">{{description}}</p>
    <slot></slot>
  </div>
</template>

<style scoped>

</style>
