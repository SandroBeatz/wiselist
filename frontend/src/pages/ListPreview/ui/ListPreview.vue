<script setup lang="ts">
import {IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonSpinner, IonButton, onIonViewWillEnter, IonList, IonItem, IonPopover, IonButtons, IonLabel, IonText, alertController} from "@ionic/vue";
import {useRoute, useRouter} from "vue-router";
import {useList, ListItem} from "@/entities/list";
import {Ellipsis, ShoppingCart, CheckSquare, List as ListIcon, Calendar, User, Trash} from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const { list, isLoading, error, fetchList, deleteList } = useList();

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
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const handleItemToggle = (itemId: string, checked: boolean) => {
  // TODO: Implement item toggle functionality
  console.log('Toggle item:', itemId, checked);
};

const handleDeleteList = async () => {
  if (!list.value) return;

  const alert = await alertController.create({
    header: 'Delete List',
    message: `Are you sure you want to delete "${list.value.title}"? This action cannot be undone.`,
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Delete',
        role: 'destructive',
        handler: async () => {
          try {
            await deleteList(list.value!.id);
            await router.replace({name: 'TabLists'});
          } catch (error) {
            console.error('Failed to delete list:', error);
          }
        }
      }
    ]
  });

  await alert.present();
};

onIonViewWillEnter(() => {
  const listId = String(route.params.id);
  if (listId) {
    void fetchList(listId);
  }
});
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{list?.title}}</ion-title>

        <ion-buttons slot="end">
          <ion-button id="popover-button" size="small">
            <Ellipsis slot="icon-only" class="size-6"/>
          </ion-button>

          <ion-popover trigger="popover-button" dismiss-on-select>
            <ion-content>
              <ion-list>
                <ion-item button :detail="false" @click="handleDeleteList">
                  <ion-text slot="start" color="danger">
                    <Trash class="size-5" />
                  </ion-text>
                  <ion-label>Delete</ion-label>
                </ion-item>
              </ion-list>
            </ion-content>
          </ion-popover>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content fullscreen class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ list?.title || 'Loading...' }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <ion-spinner name="circular" class="size-8"></ion-spinner>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <div class="mb-4 text-red-500">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-zinc-700 mb-2">Failed to load list</h3>
        <p class="text-zinc-500 mb-4">{{ error }}</p>
        <ion-button fill="outline" @click="fetchList(String(route.params.id))">
          Try Again
        </ion-button>
      </div>

      <!-- List Content -->
      <div v-else-if="list" class="pb-4">
        <!-- List Header -->
        <div class="mb-6">
          <div class="flex items-center gap-3 mb-2">
            <component
              :is="getListIcon(list.type)"
              class="size-6"
              :class="getListTypeColor(list.type)"
            />
            <span class="text-sm font-medium text-zinc-500 uppercase tracking-wide">
              {{ list.type.toLowerCase() }}
            </span>
          </div>

          <h1 class="text-2xl font-bold text-zinc-800 mb-2">{{ list.title }}</h1>

          <div class="flex items-center gap-4 text-sm text-zinc-500">
            <div class="flex items-center gap-1">
              <Calendar class="size-4" />
              <span>{{ formatDate(list.createdAt) }}</span>
            </div>
            <div class="flex items-center gap-1">
              <User class="size-4" />
              <span>{{ list.owner.profile.fullName }}</span>
            </div>
          </div>

          <!-- Progress Summary -->
          <div v-if="list.items.length > 0" class="mt-4 p-4 bg-zinc-50 rounded-lg">
            <div class="flex justify-between text-sm text-zinc-600 mb-2">
              <span>Progress</span>
              <span>{{ list.items.filter(item => item.checked).length }} / {{ list.items.length }}</span>
            </div>
            <div class="w-full bg-zinc-200 rounded-full h-2">
              <div
                class="bg-primary h-2 rounded-full transition-all duration-300"
                :style="{ width: `${(list.items.filter(item => item.checked).length / list.items.length) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- List Items -->
        <div v-if="list.items.length > 0">
          <h2 class="text-lg font-semibold text-zinc-800 mb-3">Items</h2>
          <ion-list class="bg-transparent">
            <ListItem
              v-for="item in list.items"
              :key="item.id"
              :item="item"
              @toggle="handleItemToggle"
            />
          </ion-list>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8">
          <div class="mb-4 flex justify-center">
            <component
              :is="getListIcon(list.type)"
              class="size-16 text-zinc-300"
            />
          </div>
          <h3 class="text-lg font-semibold text-zinc-600 mb-2">No items yet</h3>
          <p class="text-zinc-500">Start adding items to this list to get organized!</p>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<style scoped>

</style>
