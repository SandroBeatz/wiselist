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

const route = useRoute();
const router = useRouter();

const { list, fetchList } = useList();

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

const filteredSuggestions = computed(() => {
  return list.value?.items.filter(i =>
    i.content.toLowerCase().includes(form.content.toLowerCase()) &&
    !list.value?.items.some(item => item.content === form.content)
  ) || [];
})

const inputRef = ref<typeof IonInput>()
const showSuggestions = ref(false)

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleSubmit(async () => {
      await fetchList(listId)
      resetForm()
      setTimeout(() => {
        inputRef.value?.$el.querySelector('input')?.focus()
      }, 300)
    })
  }
}

const handleSuggestionClick = (suggestion?: string) => {
  showSuggestions.value = false
  inputRef.value?.$el.querySelector('input')?.focus()
}

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
      <ion-list class="p-0 bg-none" lines="none">
        <ion-item
            v-for="(suggestion, index) in filteredSuggestions"
            :key="index"
            :detail="false"
            @click="handleSuggestionClick(suggestion.content)"
            class="cursor-pointer hover:bg-gray-50 transition-colors mb-2"
        >
<!--          <ion-button slot="start" fill="clear" class="add-btn">-->
<!--            <Plus slot="icon-only" class="size-5" />-->
<!--          </ion-button>-->
          <ion-avatar slot="start" class="flex justify-center items-center bg-gray-50">
            <Check class="size-5" />
          </ion-avatar>
          <ion-label>{{ suggestion.content }}</ion-label>
<!--          <ion-button slot="end" fill="clear" class="delete-btn">-->
<!--            <Trash slot="icon-only" class="size-5" />-->
<!--          </ion-button>-->
          <ion-button slot="end" fill="clear" class="remove-btn">
            <Minus slot="icon-only" class="size-5"/>
          </ion-button>
        </ion-item>
      </ion-list>
    </div>

    <ion-fab v-if="filteredSuggestions.length" slot="fixed" vertical="bottom" horizontal="center" class="p-3">
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
