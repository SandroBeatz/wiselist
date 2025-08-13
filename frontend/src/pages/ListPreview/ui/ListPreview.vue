<script setup lang="ts">
import {
  IonSpinner,
  IonButton,
  onIonViewWillEnter,
  IonButtons,
  alertController
} from "@ionic/vue";
import {useRoute, useRouter} from "vue-router";
import {computed, ref} from "vue";
import {ListItem, useList} from "@/entities/list";
import {Ellipsis, ShoppingCart, CheckSquare, List as ListIcon, Calendar, User, Trash, SquarePen} from "lucide-vue-next";
import {useDeleteList} from "@/features/List/Delete";
import {CreateEditListDialogService} from "@/features/List/CreateEdit";
import {ActionDropdown, type ActionItem} from "@/shared/ui/ActionDropdown";
import {PageWrapper} from "@shared/ui";
import {CreateListItemDialogService} from "@/features/ListItem/Create";

const route = useRoute();
const router = useRouter();
const { list, isLoading, error, fetchList } = useList();
const { deleteList } = useDeleteList();

const pageRef = ref()
const presentingElement = computed(() => pageRef.value?.$el)

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

const handleEditList = async () => {
  if (!list.value) return;

  const dialog = await CreateEditListDialogService.open({
    id: list.value.id,
    list: list.value,
    callback: async () => {
      await fetchList(list.value!.id);
    }
  });

  await dialog.present();
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

const dropdownActions = computed((): ActionItem[] => {
  if (!list.value) return [];

  return [
    {
      id: 'edit',
      label: 'Rename list',
      icon: SquarePen,
      color: 'medium',
      action: handleEditList
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash,
      color: 'danger',
      action: handleDeleteList
    }
  ];
});

const handleAddItem = async () => {
  if (!list.value) return;

  const dialog = await CreateListItemDialogService.open({
    listId: list.value.id,
    presentingElement: presentingElement.value,
    callback: async () => {
      console.log(5467890)
    }
  });

  await dialog.present();
};

onIonViewWillEnter(() => {
  const listId = String(route.params.id);
  if (listId) {
    void fetchList(listId);
  }
});
</script>

<template>
  <PageWrapper ref="pageRef" is-inner default-href="/tab/lists">
    <template #header-tools>
      <ion-buttons slot="end">
        <ActionDropdown :actions="dropdownActions" triggerId="list-actions-dropdown">
          <template #trigger="{triggerId}">
            <ion-button :id="triggerId" size="small">
              <Ellipsis slot="icon-only" class="size-6"/>
            </ion-button>
          </template>
        </ActionDropdown>
      </ion-buttons>
    </template>

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

        <ion-button class="mt-4" @click="handleAddItem">
          Add Item
        </ion-button>
      </div>
    </div>
  </PageWrapper>
</template>

<style scoped>

</style>
