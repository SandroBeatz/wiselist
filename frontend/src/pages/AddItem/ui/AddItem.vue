<script setup lang="ts">
import {
  onIonViewWillEnter,
  IonItem, IonList, IonNote, IonInput, IonFabButton, IonFab
} from "@ionic/vue";
import {useRoute, useRouter} from "vue-router";
import {computed, onMounted, ref} from "vue";
import {useList} from "@/entities/list";
import {PageWrapper} from "@shared/ui";
import type {ListId} from "@/entities/list";
import {useCreateListItemForm} from "@/features/ListItem/Create";
import {Check, Trash, Plus, Minus} from "lucide-vue-next";
import {useItemCache} from "@shared/composables/useItemCache";
import {useListItem} from "@/entities/list-item";

const route = useRoute();
const router = useRouter();

const { list, fetchList } = useList();
const { getCachedItems, addToCache, removeFromCache } = useItemCache();
const { deleteItem } = useListItem();

const listId = route.params.id as ListId

const pageRef = ref()

onIonViewWillEnter(() => {
  if (listId) {
    void fetchList(listId);
  }
});

const {
  isSubmitting,
  form,
  errors,
  handleSubmit,
    resetForm
} = useCreateListItemForm(listId)

// Get cached items for the current list type
const cachedItems = computed(() => {
  if (!list.value) return [];
  return getCachedItems(list.value.type).value;
});

// Get current list items content for comparison
const currentListItemsContent = computed(() => {
  return list.value?.items.map(item => item.content.toLowerCase()) || [];
});

// Combine cached items with their status (in list or not)
const itemSuggestions = computed(() => {
  if (!list.value) return [];
  
  const suggestions = [];
  
  // Filter cached items based on input
  const filteredCached = cachedItems.value.filter(item =>
    item.content.toLowerCase().includes(form.content.toLowerCase())
  );
  
  for (const cachedItem of filteredCached) {
    const isInCurrentList = currentListItemsContent.value.includes(cachedItem.content.toLowerCase());
    
    suggestions.push({
      content: cachedItem.content,
      isInCurrentList,
      isFromCache: true
    });
  }
  
  return suggestions;
});

const inputRef = ref<typeof IonInput>()

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleSubmit(async () => {
      // Add item to cache after successful creation
      if (list.value && form.content.trim()) {
        addToCache(list.value.type, form.content.trim());
      }
      await fetchList(listId)
      resetForm()
      setTimeout(() => {
        inputRef.value?.$el.querySelector('input')?.focus()
      }, 300)
    })
  }
}

// Add item from cache to current list
const handleAddFromCache = async (content: string) => {
  if (!list.value) return;
  
  try {
    form.content = content;
    await handleSubmit(async () => {
      await fetchList(listId);
      resetForm();
    });
  } catch (error) {
    console.error('Failed to add item from cache:', error);
  }
};

// Remove item from current list (but keep in cache)
const handleRemoveFromList = async (content: string) => {
  if (!list.value) return;
  
  const item = list.value.items.find(i => i.content.toLowerCase() === content.toLowerCase());
  if (item) {
    try {
      await deleteItem(item.id);
      await fetchList(listId);
    } catch (error) {
      console.error('Failed to remove item from list:', error);
    }
  }
};

// Remove item from cache completely
const handleRemoveFromCache = (content: string) => {
  if (!list.value) return;
  removeFromCache(list.value.type, content);
};

onMounted(() => {
  setTimeout(() => {
    inputRef.value?.$el.querySelector('input')?.focus()
  }, 300)
})
</script>

<template>
  <PageWrapper ref="pageRef" is-inner title="Add items" :default-href="`/tabs/lists/${listId}`">
    <!-- List Content -->
    <div class="pb-12">
      <!-- List Header -->
      <div class="mb-6">
        <ion-input
            ref="inputRef"
            v-model="form.content"
            placeholder="Type item content"
            type="text"
            :maxlength="500"
            :disabled="isSubmitting"
            @keydown="handleKeyPress"
            class="w-full"
        />

        <ion-note
            v-if="errors?.content"
            color="danger"
            class="block px-4 text-sm"
        >
          {{ errors.content }}
        </ion-note>
      </div>
      <!-- Cached items list with proper logic -->
      <ion-list class="p-0 bg-none" lines="none">
        <ion-item
            v-for="(suggestion, index) in itemSuggestions"
            :key="index"
            :detail="false"
            class="transition-colors mb-2"
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
            class="flex justify-center items-center bg-green-50"
          >
            <Check class="size-5 text-green-500" />
          </ion-avatar>
          
          <ion-label>{{ suggestion.content }}</ion-label>

          <!-- Remove from cache button (always visible) -->
          <ion-button 
            slot="end" 
            fill="clear" 
            class="delete-btn"
            @click="handleRemoveFromCache(suggestion.content)"
          >
            <Trash slot="icon-only" class="size-5" />
          </ion-button>

          <!-- Remove from current list button (only for items in list) -->
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

    <ion-fab v-if="itemSuggestions.length" slot="fixed" vertical="bottom" horizontal="center" class="p-3">
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

.remove-btn {
  @apply bg-orange-50 text-orange-500;
}
</style>
