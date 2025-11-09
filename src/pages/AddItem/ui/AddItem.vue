<script setup lang="ts">
import {
  onIonViewWillEnter,
  IonItem,
  IonList,
  IonInput,
  IonFab,
} from '@ionic/vue'
import { useRoute, useRouter } from 'vue-router'
import { computed, onMounted, ref } from 'vue'
import { useListRx } from '@/entities/list'
import { PageWrapper } from '@shared/ui'
import type { ListId } from '@/entities/list'
import { useCreateListItemForm } from '@/features/ListItem/Create'
import { Check, Trash, Plus, Minus } from 'lucide-vue-next'
import { useItemCache } from '@shared/composables/useItemCache'
import { listItemRxService } from '@shared/services/rxjs/list-item.service'

const route = useRoute()
const router = useRouter()

const listId = route.params.id as ListId

// Use RxJS composable for reactive list updates
const { list, watchList } = useListRx()
const { getCachedItems, addToCache, removeFromCache } = useItemCache()

const pageRef = ref()

// Watch list changes on page enter
onIonViewWillEnter(() => {
  if (listId) {
    watchList(listId)
  }
})

const { form, handleSubmit, resetForm } = useCreateListItemForm(listId)

// Get cached items for the current list type
const cachedItems = computed(() => {
  if (!list.value) return []
  return getCachedItems(list.value.type).value
})

// Get current list items content for comparison
const currentListItemsContent = computed(() => {
  return list.value?.items.map((item) => item.content.toLowerCase()) || []
})

// Combine cached items with their status (in list or not)
const itemSuggestions = computed(() => {
  if (!list.value) return []

  const suggestions = []

  // Filter cached items based on input
  const filteredCached = cachedItems.value.filter((item) =>
    item.content.toLowerCase().includes(form.content.toLowerCase())
  )

  for (const cachedItem of filteredCached) {
    const isInCurrentList = currentListItemsContent.value.includes(cachedItem.content.toLowerCase())

    suggestions.push({
      content: cachedItem.content,
      isInCurrentList,
      isFromCache: true,
    })
  }

  return suggestions
})

const inputRef = ref<InstanceType<typeof IonInput>>()

const handleKeyPress = async (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()

    await handleSubmit(async () => {
      // Add item to cache after successful creation
      if (list.value && form.content.trim()) {
        addToCache(list.value.type, form.content.trim())
      }
      // No need to fetch list - RxJS will auto-update via observable
      resetForm()
      setTimeout(() => {
        const input = (inputRef.value as any)?.$el?.querySelector('input')
        input?.focus()
      }, 300)
    })
  }
}

const handlerField = (event: CustomEvent) => {
  form.content = (event.target as HTMLInputElement).value
}
// Add item from cache to current list
const handleAddFromCache = async (content: string) => {
  if (!list.value) return

  try {
    form.context = content
    await handleSubmit(async () => {
      // RxJS will auto-update the list
      resetForm()
    })
  } catch (error) {
    console.error('Failed to add item from cache:', error)
  }
}

// Remove item from current list (but keep in cache)
const handleRemoveFromList = async (content: string) => {
  if (!list.value) return

  const item = list.value.items.find((i) => i.content.toLowerCase() === content.toLowerCase())
  if (item) {
    try {
      // Use RxJS service for optimistic delete
      await listItemRxService.deleteListItem(item.id)
      // No need to fetch - RxJS observable will auto-update
    } catch (error) {
      console.error('Failed to remove item from list:', error)
    }
  }
}

// Remove item from cache completely
const handleRemoveFromCache = (content: string) => {
  if (!list.value) return
  removeFromCache(list.value.type, content)
}

onMounted(() => {
  setTimeout(() => {
    const input = (inputRef.value as any)?.$el?.querySelector('input')
    input?.focus()
  }, 300)
})
</script>

<template>
  <PageWrapper ref="pageRef" is-inner title="Add items" :default-href="`/tabs/lists/${listId}`">
    <template #header>
      <div class="ion-padding-horizontal">
        <ion-input
            ref="inputRef"
            :value="form.content"
            @ionInput="handlerField($event)"
            placeholder="Type item name and press Enter"
            type="text"
            :maxlength="500"
            @keydown="handleKeyPress"
            class="w-full"
        />
      </div>
    </template>

    <div class="pb-20">
      <!-- Suggestions from Cache Section -->
      <div v-if="itemSuggestions.length" class="mt-6">
        <ion-list class="p-0 bg-none" lines="none">
          <ion-item
              v-for="(suggestion, index) in itemSuggestions"
              :key="index"
              :detail="false"
              class="suggestion-item mb-2"
              :class="{'active': suggestion.isInCurrentList}"
          >
            <!-- Add button for items not in current list -->
            <ion-button
              v-if="!suggestion.isInCurrentList"
              slot="start"
              fill="clear"
              class="add-btn"
              @click="handleAddFromCache(suggestion.content)"
            >
              <Plus slot="icon-only" class="size-5" />
            </ion-button>

            <!-- Check mark for items already in current list -->
            <ion-avatar
              v-else
              slot="start"
              class="flex justify-center items-center bg-zinc-50"
            >
              <Check class="size-5 text-zinc-500" />
            </ion-avatar>

            <ion-label>{{ suggestion.content }}</ion-label>

            <!-- Remove from cache button -->
            <ion-button
                v-if="!suggestion.isInCurrentList"
              slot="end"
              fill="clear"
              class="cache-delete-btn"
              @click="handleRemoveFromCache(suggestion.content)"
            >
              <Trash slot="icon-only" class="size-4" />
            </ion-button>

            <!-- Remove from current list button -->
            <ion-button
              v-if="suggestion.isInCurrentList"
              slot="end"
              fill="clear"
              class="remove-btn"
              @click="handleRemoveFromList(suggestion.content)"
            >
              <Minus slot="icon-only" class="size-5"/>
            </ion-button>
          </ion-item>
        </ion-list>
      </div>
    </div>

    <ion-fab slot="fixed" vertical="bottom" horizontal="center" class="p-3">
      <ion-button @click="router.go(-1)">
        <Check /> Done
      </ion-button>
    </ion-fab>
  </PageWrapper>
</template>

<style scoped>
ion-list {
  background: none;
}

ion-item {
  overflow: hidden;
  --min-height: 48px;
  --padding-start: 10px;
  --padding-end: 10px;
  --inner-padding-end: 0;
  border-radius: 10px;
  margin-bottom: 10px;
  --background: rgba(var(--ion-item-background-rgb), 0.5);
}

/* Current list items - solid background */
ion-item.list-item {
  --background: var(--ion-item-background);
}

/* Suggestions - lighter background */
ion-item.suggestion-item {
  --background: rgba(var(--ion-item-background-rgb), 0.5);
}

ion-item.suggestion-item.active {
  --background: rgba(var(--ion-item-background-rgb), 0.7);
}

ion-item ion-button, ion-item ion-avatar {
  @apply p-0 size-9 rounded-full min-h-0;
}

.add-btn {
  @apply bg-green-50 text-green-500;
}

.delete-btn {
  @apply bg-red-50 text-red-500;
}

.cache-delete-btn {
  @apply bg-zinc-100 text-zinc-400;
}

.remove-btn {
  @apply bg-orange-50 text-orange-500;
}
</style>
