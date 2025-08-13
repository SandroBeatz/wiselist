<script setup lang="ts">
import { IonRippleEffect } from "@ionic/vue";
import { ShoppingCart, CheckSquare, List as ListIcon, Clock, User } from "lucide-vue-next";
import type { List } from "../model/types";

interface Props {
  list: List;
}

defineProps<Props>();

const getListIcon = (type: string) => {
  switch (type) {
    case 'SHOPPING': return ShoppingCart;
    case 'TODO': return CheckSquare;
    default: return ListIcon;
  }
};

const getListTypeColor = (type: string) => {
  switch (type) {
    case 'SHOPPING': return 'text-blue-500';
    case 'TODO': return 'text-green-500';
    default: return 'text-zinc-500';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};
</script>

<template>
  <router-link
    :to="{ name: 'ListPreview', params: { id: list.id } }"
    class="ion-activatable ripple-parent relative bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
  >
    <!-- Header with icon and type -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <component
          :is="getListIcon(list.type)"
          class="size-5"
          :class="getListTypeColor(list.type)"
        />
        <span class="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          {{ list.type.toLowerCase() }}
        </span>
      </div>
      <div class="flex items-center gap-1 text-xs text-zinc-400">
        <Clock class="size-3" />
        {{ formatDate(list.createdAt) }}
      </div>
    </div>

    <!-- Title -->
    <h3 class="text-lg font-semibold text-zinc-800 mb-3 line-clamp-2">
      {{ list.title }}
    </h3>

    <!-- Stats -->
    <div class="flex items-center justify-between text-sm text-zinc-500">
      <div class="flex items-center gap-1">
        <component :is="getListIcon(list.type)" class="size-4" />
        <span>{{ list.items.length }} items</span>
      </div>
      
      <div class="flex items-center gap-1">
        <User class="size-4" />
        <span>{{ list.owner.profile.fullName.split(' ')[0] }}</span>
      </div>
    </div>

    <!-- Progress bar if there are items -->
    <div v-if="list.items.length > 0" class="mt-3">
      <div class="w-full bg-zinc-200 rounded-full h-1.5">
        <div
          class="bg-primary h-1.5 rounded-full transition-all duration-300"
          :style="{ width: `${(list.items.filter(item => item.checked).length / list.items.length) * 100}%` }"
        ></div>
      </div>
      <div class="flex justify-between text-xs text-zinc-400 mt-1">
        <span>{{ list.items.filter(item => item.checked).length }} completed</span>
        <span>{{ list.items.filter(item => !item.checked).length }} remaining</span>
      </div>
    </div>

    <ion-ripple-effect></ion-ripple-effect>
  </router-link>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>