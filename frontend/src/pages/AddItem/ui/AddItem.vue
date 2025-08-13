<script setup lang="ts">
import {
  onIonViewWillEnter,
  IonItem, IonList, IonNote, IonInput
} from "@ionic/vue";
import {useRoute} from "vue-router";
import {computed, onMounted, ref} from "vue";
import {useList} from "@/entities/list";
import {PageWrapper} from "@shared/ui";
import {useCreateListItemForm} from "@/features/ListItem/Create/composables/useCreateListItemForm";
import {ListId} from "@/entities/list/model/types";

const route = useRoute();
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
    })
  }
}

const handleSuggestionClick = (suggestion: string) => {
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
  <PageWrapper ref="pageRef" is-inner :default-href="`/tabs/lists/${listId}`">
    <template #header-tools>
<!--      <ion-buttons slot="end">-->
<!--        <ActionDropdown :actions="dropdownActions" triggerId="list-actions-dropdown">-->
<!--          <template #trigger="{triggerId}">-->
<!--            <ion-button :id="triggerId" size="small">-->
<!--              <Ellipsis slot="icon-only" class="size-6"/>-->
<!--            </ion-button>-->
<!--          </template>-->
<!--        </ActionDropdown>-->
<!--      </ion-buttons>-->
    </template>

<!--    &lt;!&ndash; Loading State &ndash;&gt;-->
<!--    <div v-if="isLoading" class="flex justify-center items-center py-12">-->
<!--      <ion-spinner name="circular" class="size-8"></ion-spinner>-->
<!--    </div>-->

    <!-- List Content -->
    <div class="pb-4">
      <!-- List Header -->
      <div class="relative mb-4">
        <ion-input
            ref="inputRef"
            v-model="form.content"
            placeholder="Введите новый элемент..."
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

        <div
            class="pt-6"
        >
          <ion-list class="p-0">
            <ion-item
                v-for="(suggestion, index) in filteredSuggestions"
                :key="index"
                button
                @click="handleSuggestionClick(suggestion.content)"
                class="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div class="py-2">
                <span class="text-sm text-gray-700">{{ suggestion.content }}</span>
              </div>
            </ion-item>
          </ion-list>
        </div>
      </div>
    </div>

  </PageWrapper>
</template>

<style scoped>

</style>
