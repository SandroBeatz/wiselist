<script setup lang="ts">
import { 
  IonAvatar, 
  IonInput, 
  IonButton, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonLabel,
  IonText,
  IonItem,
  IonIcon,
  toastController
} from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import { storeToRefs } from 'pinia'
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/entities/user'
import { PageWrapper } from '@shared/ui/Page'
import { 
  useProfileAvatarForm,
  ChangeEmailDialog,
  ChangePasswordDialog
} from '@/features/Profile'

const userStore = useUserStore()
const { info } = storeToRefs(userStore)

// Avatar and name form management
const { 
  formData, 
  errors, 
  isLoading, 
  hasChanges, 
  initializeForm, 
  resetForm, 
  clearFieldError, 
  submitForm 
} = useProfileAvatarForm()

// Dialog states
const isEmailDialogOpen = ref(false)
const isPasswordDialogOpen = ref(false)

// UI state
const isEditMode = ref(false)

// Initialize form when component mounts or user info changes
const userInfo = computed(() => {
  if (info.value) {
    initializeForm()
  }
  return info.value
})

onMounted(() => {
  if (info.value) {
    initializeForm()
  }
})

// Avatar color options
const avatarColors = [
  { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { name: 'Green', value: 'green', class: 'bg-green-500' },
  { name: 'Red', value: 'red', class: 'bg-red-500' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
  { name: 'Teal', value: 'teal', class: 'bg-teal-500' }
]

// Toggle edit mode for avatar and name
const toggleEditMode = () => {
  if (isEditMode.value) {
    resetForm()
  } else {
    initializeForm()
  }
  isEditMode.value = !isEditMode.value
}

// Save avatar and name changes
const saveProfile = async () => {
  const success = await submitForm()
  
  if (success) {
    isEditMode.value = false
    
    // Show success toast
    const toast = await toastController.create({
      message: 'Profile updated successfully',
      duration: 3000,
      color: 'success',
      position: 'top'
    })
    await toast.present()
  } else {
    // Show error toast
    const toast = await toastController.create({
      message: 'Please check the form for errors',
      duration: 3000,
      color: 'danger',
      position: 'top'
    })
    await toast.present()
  }
}

// Open dialogs
const openEmailDialog = () => {
  isEmailDialogOpen.value = true
}

const openPasswordDialog = () => {
  isPasswordDialogOpen.value = true
}

// Get avatar display
const getAvatarDisplay = (avatarIcon: string | null | undefined) => {
  if (avatarIcon && avatarIcon.startsWith('http')) {
    return avatarIcon
  }
  return null
}

// Get avatar color class
const getAvatarColorClass = (avatarIcon: string | null | undefined) => {
  if (!avatarIcon) return 'bg-gray-500'
  const colorOption = avatarColors.find(color => color.value === avatarIcon)
  return colorOption ? colorOption.class : 'bg-gray-500'
}

// Show avatar as color or image
const showColorAvatar = (avatarIcon: string | null | undefined) => {
  return avatarIcon && !avatarIcon.startsWith('http')
}
</script>

<template>
  <PageWrapper is-inner title="Profile" default-href="/tabs/settings">
    <div v-if="userInfo">
      <!-- Avatar and Name Form -->
      <div v-if="!isEditMode" class="p-4">
        <div class="flex items-center space-x-4 mb-6">
          <ion-avatar class="!w-20 !h-20">
            <img 
              v-if="getAvatarDisplay(userInfo.profile.avatar_icon || userInfo.profile.avatar)"
              :alt="userInfo.profile.fullName" 
              :src="getAvatarDisplay(userInfo.profile.avatar_icon || userInfo.profile.avatar)!" 
            />
            <div 
              v-else-if="showColorAvatar(userInfo.profile.avatar_icon || userInfo.profile.avatar)"
              :class="['w-full h-full rounded-full flex items-center justify-center text-white font-bold text-xl', getAvatarColorClass(userInfo.profile.avatar_icon || userInfo.profile.avatar)]"
            >
              {{ userInfo.profile.fullName.charAt(0).toUpperCase() }}
            </div>
            <img 
              v-else
              alt="Default avatar" 
              src="https://ionicframework.com/docs/img/demos/avatar.svg" 
            />
          </ion-avatar>
          <div class="flex-1">
            <h2 class="text-2xl font-bold mb-1">{{ userInfo.profile.fullName }}</h2>
            <ion-button 
              fill="clear" 
              size="small" 
              color="primary"
              @click="toggleEditMode"
            >
              Edit Avatar & Name
            </ion-button>
          </div>
        </div>
      </div>

      <!-- Edit Avatar and Name Mode -->
      <div v-else class="p-4">
        <!-- Avatar Selection -->
        <div class="mb-6">
          <ion-label class="block mb-3 font-medium">Avatar</ion-label>
          <div class="flex items-center mb-4">
            <ion-avatar class="!w-20 !h-20 mr-4">
              <img 
                v-if="getAvatarDisplay(formData.avatar_icon)"
                :alt="formData.fullName" 
                :src="getAvatarDisplay(formData.avatar_icon)!" 
              />
              <div 
                v-else-if="showColorAvatar(formData.avatar_icon)"
                :class="['w-full h-full rounded-full flex items-center justify-center text-white font-bold text-xl', getAvatarColorClass(formData.avatar_icon)]"
              >
                {{ formData.fullName.charAt(0).toUpperCase() || 'A' }}
              </div>
              <img 
                v-else
                alt="Default avatar" 
                src="https://ionicframework.com/docs/img/demos/avatar.svg" 
              />
            </ion-avatar>
            <div class="text-sm text-gray-600">
              Choose a color for your avatar
            </div>
          </div>
          
          <!-- Color Options -->
          <ion-grid>
            <ion-row>
              <ion-col 
                v-for="color in avatarColors" 
                :key="color.value"
                size="3" 
                size-sm="2"
              >
                <div 
                  :class="[
                    'w-10 h-10 rounded-full cursor-pointer border-2 mx-auto',
                    color.class,
                    formData.avatar_icon === color.value ? 'border-gray-800' : 'border-gray-300'
                  ]"
                  @click="formData.avatar_icon = color.value"
                ></div>
                <div class="text-xs text-center mt-1">{{ color.name }}</div>
              </ion-col>
            </ion-row>
          </ion-grid>
        </div>

        <!-- Name Input -->
        <div class="mb-6">
          <ion-label position="stacked">Full Name</ion-label>
          <ion-input 
            v-model="formData.fullName"
            fill="outline"
            placeholder="Enter your full name"
            class="mt-2"
            :class="{ 'ion-invalid': errors.fullName }"
            @ion-input="clearFieldError('fullName')"
          ></ion-input>
          <ion-text v-if="errors.fullName" color="danger" class="text-sm">
            {{ errors.fullName }}
          </ion-text>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-3">
          <ion-button 
            fill="solid" 
            color="primary"
            @click="saveProfile"
            :disabled="isLoading || !hasChanges"
            class="flex-1"
          >
            {{ isLoading ? 'Saving...' : 'Save Changes' }}
          </ion-button>
          <ion-button 
            fill="outline" 
            color="medium"
            @click="toggleEditMode"
            class="flex-1"
          >
            Cancel
          </ion-button>
        </div>
      </div>

      <!-- Settings List Items -->
      <div v-if="!isEditMode" class="mt-6">
        <ion-item button @click="openEmailDialog" lines="none" class="px-4">
          <ion-label>
            <h3 class="text-base font-medium">Change Email</h3>
            <p class="text-sm text-gray-600">{{ userInfo.email }}</p>
          </ion-label>
          <ion-icon :icon="chevronForward" slot="end" class="text-gray-400"></ion-icon>
        </ion-item>

        <ion-item button @click="openPasswordDialog" lines="none" class="px-4 mt-2">
          <ion-label>
            <h3 class="text-base font-medium">Change Password</h3>
            <p class="text-sm text-gray-600">Update your password</p>
          </ion-label>
          <ion-icon :icon="chevronForward" slot="end" class="text-gray-400"></ion-icon>
        </ion-item>
      </div>

      <!-- Email Change Dialog -->
      <ChangeEmailDialog
        :is-open="isEmailDialogOpen"
        :current-email="userInfo?.email || ''"
        @close="isEmailDialogOpen = false"
      />

      <!-- Password Change Dialog -->
      <ChangePasswordDialog
        :is-open="isPasswordDialogOpen"
        @close="isPasswordDialogOpen = false"
      />
    </div>
  </PageWrapper>
</template>

<style scoped>

</style>
