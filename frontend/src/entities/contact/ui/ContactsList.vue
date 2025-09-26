<script setup lang="ts">
import {ref, computed, onMounted} from 'vue'
import {
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonSkeletonText,
  toastController
} from '@ionic/vue'
import {Users, Search, User} from 'lucide-vue-next'
import type {ContactId} from '@entities/share'
import {useContactStore} from "@entities/contact";
import {EmptyContent} from "@shared/ui";

interface Props {
  selectedContacts?: ContactId[]
  disabled?: boolean
}

interface Emits {
  (e: 'contactAdded', contact: any): void
  (e: 'share', email: string): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedContacts: () => [],
  disabled: false
})

const emit = defineEmits<Emits>()

// Store
const contactStore = useContactStore()

// Local state
const searchQuery = ref('')
const selectedContactIds = ref<ContactId[]>([...props.selectedContacts])

// Computed
const contacts = computed(() => contactStore.sortedContacts)

const filteredContacts = computed(() => {
  if (!searchQuery.value.trim()) {
    return contacts.value
  }

  const query = searchQuery.value.toLowerCase()
  return contacts.value.filter(contact =>
      contact.user.profile.fullName.toLowerCase().includes(query) || contact.user.email.toLowerCase().includes(query)
  )
})

const showAddNewContact = computed(() => {
  const query = searchQuery.value.trim()
  if (!query) return false

  // Check if it looks like an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(query)) return false

  // Check if contact already exists
  const existingContact = contacts.value.find(c => c.user.email.toLowerCase() === query.toLowerCase())
  return !existingContact
})


const onSearchInput = (event: CustomEvent) => {
  searchQuery.value = event.detail.value
}

const onSearchClear = () => {
  searchQuery.value = ''
}

const addNewContact = async () => {
  try {
    const email = searchQuery.value.trim()
    const newContact = await contactStore.createContact(email)

    // Add the new contact to selection
    selectedContactIds.value.push(newContact.id)
    emit('contactAdded', newContact)

    // Clear search
    searchQuery.value = ''

    // Show success toast
    const toast = await toastController.create({
      message: `${email} added to contacts`,
      duration: 2000,
      color: 'success',
      position: 'top'
    })
    await toast.present()

  } catch (error) {
    console.error('Failed to add contact:', error)

    const toast = await toastController.create({
      message: 'Failed to add contact. Please try again.',
      duration: 3000,
      color: 'danger',
      position: 'top'
    })
    await toast.present()
  }
}

// Lifecycle
onMounted(async () => {
  try {
    await contactStore.fetchContacts()
  } catch (error) {
    console.error('Failed to load contacts:', error)
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Search input -->
    <div class="relative">
      <ion-searchbar
          v-model="searchQuery"
          placeholder="Search contacts or add email..."
          :debounce="300"
          @ionInput="onSearchInput"
          @ionClear="onSearchClear"
          class="!p-0"
      ></ion-searchbar>
    </div>

    <!-- Add new contact button (shown when search query looks like email) -->
    <div v-if="showAddNewContact" class="border-b pb-4">
      <ion-item
          button
          @click="addNewContact"
          class="rounded-md"
      >
        <User slot="start"/>
        <ion-label>
          <h3 class="text-primary">Add "{{ searchQuery }}" as contact</h3>
          <p>This person will be added to your contacts</p>
        </ion-label>
      </ion-item>
    </div>

    <!-- Loading state -->
    <div v-if="contactStore.isLoading && !filteredContacts.length" class="space-y-2">
      <ion-skeleton-text animated style="width: 100%; height: 60px"></ion-skeleton-text>
      <ion-skeleton-text animated style="width: 100%; height: 60px"></ion-skeleton-text>
      <ion-skeleton-text animated style="width: 100%; height: 60px"></ion-skeleton-text>
    </div>
    <template v-else>
      <!-- Contacts list -->
      <div v-if="filteredContacts.length > 0" class="space-y-2">
        <div class="text-sm font-medium text-gray-600 px-4">
          Suggested ({{ filteredContacts.length }})
        </div>

        <ion-list class="rounded-md">
          <ion-item
              v-for="contact in filteredContacts"
              :key="contact.id"
          >
            <ion-avatar slot="start">
              <img
                  v-if="contact.user.profile.avatar"
                  :src="contact.user.profile.avatar"
                  :alt="contact.user.profile.fullName"
              />
              <div
                  v-else
                  class="w-full h-full bg-gray-200 flex items-center justify-center rounded-full"
              >
                <User class="size-4 text-gray-500"/>
              </div>
            </ion-avatar>

            <ion-label>
              <h3 class="font-medium">{{ contact.user.profile.fullName || 'No name' }}</h3>
              <p class="text-sm text-gray-500">{{ contact.user.email }}</p>
            </ion-label>

            <ion-buttons slot="end">
              <ion-button @click="$emit('share', contact.user.email)">Share</ion-button>
            </ion-buttons>
          </ion-item>
        </ion-list>
      </div>

      <EmptyContent
          v-else-if="!contactStore.isLoading && contacts.length === 0"
          :icon="Users"
          title="No contacts yet"
          description="Start by adding an email address above"
      />

      <EmptyContent
          v-else-if="searchQuery && filteredContacts.length === 0"
          :icon="Search"
          title="No contacts yet"
          description="Try a different search term"
      />
    </template>
  </div>
</template>

