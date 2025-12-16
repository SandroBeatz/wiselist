<script setup lang="ts">
import { EllipsisVertical } from 'lucide-vue-next'
import type { LocalList } from '@shared/db'

interface Props {
  list: LocalList
}

defineProps<Props>()
</script>

<template>
  <ion-card class="flex-1 flex ion-no-margin ion-activatable ripple-parent overflow-hidden relative rounded-2xl p-4 shadow-md hover:shadow-xl transition-shadow">
    <ion-buttons class="absolute top-[13px] right-2 z-10">
      <ion-button size="small" fill="clear">
        <EllipsisVertical class="size-5" slot="icon-only"/>
      </ion-button>
    </ion-buttons>
    <router-link
        :to="{ name: 'ListPreview', params: { id: list.id } }"
        class="flex w-full flex-1 flex-col"
    >
      <!--
      <div class="flex items-center justify-between mb-3">
        <div class="rounded-full size-8 flex justify-center items-center" :class="getListTypeBg(list.type)">
          <component
              :is="getListIcon(list.type)"
              :class="getListTypeColor(list.type)"
              class="size-4"
          />
        </div>
      </div>
      -->

      <h3 class="text-xl font-semibold ion-text-default mb-2 line-clamp-2">
        {{ list.title }}
      </h3>
      <!--
      <div class="flex items-center text-xs text-zinc-400 mb-3">
        <Calendar class="size-4 mr-1"/>
        {{ formatDate(list.createdAt) }}
      </div>
      -->
<!--      <pre>{{list.ownerId}}</pre>-->
<!--      <pre>{{shares}}</pre>-->
      <div class="flex justify-between items-center">
        <div class="flex">

        </div>
        <div class="flex justify-between text-xs ion-text-mute mb-1">
          <template v-if="!list.items.length">
            0
          </template>
          <template v-else>
            <span>{{
                list.items.filter(item => item.checked).length
              }}</span>/<span>{{ list.items.length }}</span>
          </template>
        </div>
      </div>
      <div class="w-full bg-zinc-200 rounded-full overflow-hidden h-1.5">
        <div
            class="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            :style="{ width: `${list.items.length > 0 ? +(list.items.filter(item => item.checked).length / list.items.length) * 100 : 0}%` }"
        ></div>
      </div>

      <ion-ripple-effect></ion-ripple-effect>
    </router-link>
  </ion-card>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
