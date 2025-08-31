<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { X, Plus } from "lucide-vue-next"
import { 
  IonButton, 
  IonButtons, 
  IonContent, 
  IonInput, 
  IonItem, 
  IonList, 
  IonNote,
  IonSpinner,
  modalController 
} from "@ionic/vue"
import { useCreateListItemForm } from '../composables/useCreateListItemForm'

interface Props {
  listId: string
  callback?: () => Promise<void>
}

const props = defineProps<Props>()

const {
  form,
  errors,
  isLoading,
  isValid,
  filteredSuggestions,
  selectSuggestion,
  submitForm
} = useCreateListItemForm(props.listId)

const inputRef = ref<typeof IonInput>()
const showSuggestions = ref(false)

const closeModal = () => {
  modalController.dismiss()
}

const handleSubmit = async () => {
  const success = await submitForm()
  if (success) {
    if (props.callback) {
      await props.callback()
    }
    closeModal()
  }
}

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && isValid.value && !isLoading.value) {
    event.preventDefault()
    handleSubmit()
  }
}

const handleInputFocus = () => {
  showSuggestions.value = true
}

const handleInputBlur = () => {
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const handleSuggestionClick = (suggestion: string) => {
  selectSuggestion(suggestion)
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
  <ion-content class="ion-padding">
    <ion-buttons class="absolute right-1 top-1 z-10">
      <ion-button @click="closeModal" size="small" fill="clear">
        <X slot="icon-only" class="size-6"/>
      </ion-button>
    </ion-buttons>

    <div class="pt-8">
      <h2 class="text-xl font-semibold mb-6 text-center">Добавить элемент</h2>
      
      <div class="relative">
        <ion-item 
          class="mb-4" 
          :class="{ 'ion-invalid': errors.content }"
        >
          <ion-input
            ref="inputRef"
            v-model="form.content"
            placeholder="Введите новый элемент..."
            type="text"
            :maxlength="500"
            :disabled="isLoading"
            @keydown="handleKeyPress"
            @ionFocus="handleInputFocus"
            @ionBlur="handleInputBlur"
            class="w-full"
          />
        </ion-item>
        
        <ion-note 
          v-if="errors.content" 
          color="danger" 
          class="block px-4 text-sm"
        >
          {{ errors.content }}
        </ion-note>

        <div 
          v-if="showSuggestions && filteredSuggestions.length > 0" 
          class="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          <ion-list class="p-0">
            <ion-item 
              v-for="(suggestion, index) in filteredSuggestions"
              :key="index"
              button
              @click="handleSuggestionClick(suggestion)"
              class="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div class="py-2">
                <span class="text-sm text-gray-700">{{ suggestion }}</span>
              </div>
            </ion-item>
          </ion-list>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <ion-button
          expand="block"
          :disabled="!isValid || isLoading"
          @click="handleSubmit"
          class="font-medium"
        >
          <ion-spinner v-if="isLoading" name="circular" class="mr-2"/>
          <Plus v-else class="size-5 mr-2"/>
          {{ isLoading ? 'Добавление...' : 'Добавить' }}
        </ion-button>
        
        <ion-button
          fill="clear"
          expand="block"
          @click="closeModal"
          :disabled="isLoading"
          class="text-gray-600"
        >
          Отмена
        </ion-button>
      </div>

      <div class="mt-4 text-center">
        <ion-note class="text-xs text-gray-500">
          Нажмите Enter для быстрого добавления
        </ion-note>
      </div>
    </div>
  </ion-content>
</template>

<style scoped>

</style>
