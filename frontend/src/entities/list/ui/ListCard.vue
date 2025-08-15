<script setup lang="ts">
import {IonRippleEffect} from "@ionic/vue";
import {ShoppingBasket, CheckSquare, ListTodo, Calendar} from "lucide-vue-next";
import type {List} from "../model/types";

interface Props {
  list: List;
}

defineProps<Props>();

const getListIcon = (type: string) => {
  switch (type) {
    case 'SHOPPING':
      return ShoppingBasket;
    case 'TODO':
      return CheckSquare;
    default:
      return ListTodo;
  }
};

const getListTypeColor = (type: string) => {
  switch (type) {
    case 'SHOPPING':
      return 'text-blue-500';
    case 'TODO':
      return 'text-green-500';
    default:
      return 'text-zinc-500';
  }
};

const getListTypeBg = (type: string) => {
  switch (type) {
    case 'SHOPPING':
      return 'bg-blue-100';
    case 'TODO':
      return 'bg-green-100';
    default:
      return 'bg-zinc-100';
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
  <div class="relative flex-1 flex">
<!--    <ion-buttons class="absolute top-2 right-2 z-10">-->
<!--      <ion-button size="small" fill="clear">-->
<!--        <EllipsisVertical class="size-5" slot="icon-only"/>-->
<!--      </ion-button>-->
<!--    </ion-buttons>-->
    <router-link
        :to="{ name: 'ListPreview', params: { id: list.id } }"
        class="flex w-full flex-1 flex-col ion-activatable ripple-parent overflow-hidden relative bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-shadow"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="rounded-full size-8 flex justify-center items-center" :class="getListTypeBg(list.type)">
          <component
              :is="getListIcon(list.type)"
              :class="getListTypeColor(list.type)"
              class="size-4"
          />
        </div>
      </div>

      <h3 class="text-xl font-semibold text-zinc-800 mb-2 line-clamp-2">
        {{ list.title }}
      </h3>
      <div class="flex items-center text-xs text-zinc-400 mb-3">
        <Calendar class="size-4 mr-1"/>
        {{ formatDate(list.createdAt) }}
      </div>

      <div class="w-full bg-zinc-200 rounded-full overflow-hidden h-1.5">
        <div
            class="bg-primary h-1.5 rounded-full transition-all duration-300"
            :style="{ width: `${list.items.length > 0 ? +(list.items.filter(item => item.checked).length / list.items.length) * 100 : 0}%` }"
        ></div>
      </div>
      <div class="flex justify-between items-center">
        <div class="flex">

        </div>
        <div class="flex justify-between text-xs text-zinc-400 mt-1">
          <template v-if="!list.items.length">
            0
          </template>
          <template v-else>
            <span>{{
                list.items.filter(item => item.checked).length
              }}</span>/<span>{{ list.items.filter(item => !item.checked).length }}</span>
          </template>
        </div>
      </div>

      <ion-ripple-effect></ion-ripple-effect>
    </router-link>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
