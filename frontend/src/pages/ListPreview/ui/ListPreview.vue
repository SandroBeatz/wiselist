<script setup lang="ts">
import {
  IonSpinner,
  IonButton,
  onIonViewWillEnter,
  IonButtons,
  alertController, IonFabButton, IonFab
} from "@ionic/vue";
import {useRoute, useRouter} from "vue-router";
import {computed, ref} from "vue";
import {ListItem, useList} from "@/entities/list";
import {
  Ellipsis,
  ShoppingCart,
  CheckSquare,
  List as ListIcon,
  Trash,
  SquarePen,
  Plus,
  LayoutList
} from "lucide-vue-next";
import {useDeleteList} from "@/features/List/Delete";
import {CreateEditListDialogService} from "@/features/List/CreateEdit";
import {ActionDropdown, type ActionItem} from "@/shared/ui/ActionDropdown";
import {EmptyContent, PageWrapper} from "@shared/ui";

const route = useRoute();
const router = useRouter();
const {list, isLoading, error, fetchList} = useList();
const {deleteList} = useDeleteList();

const pageRef = ref()
const presentingElement = computed(() => pageRef.value?.$el)

const getListIcon = (type: string) => {
  switch (type) {
    case 'SHOPPING':
      return ShoppingCart;
    case 'TODO':
      return CheckSquare;
    default:
      return ListIcon;
  }
};

const getListTypeColor = (type: string) => {
  switch (type) {
    case 'SHOPPING':
      return 'text-blue-500';
    case 'TODO':
      return 'text-green-500';
    default:
      return 'text-zinc-500';
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

onIonViewWillEnter(() => {
  const listId = String(route.params.id);
  if (listId) {
    void fetchList(listId);
  }
});
</script>

<template>
  <PageWrapper
      is-inner
      ref="pageRef"
      default-href="/tabs/lists"
      :title="list?.title ?? ''"
  >
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
    <div v-if="isLoading && !list" class="flex justify-center items-center py-12">
      <ion-spinner name="circular" class="size-8"></ion-spinner>
    </div>

    <EmptyContent
        v-else-if="!list?.items.length"
        :icon="LayoutList"
        title="No items yet"
        description="Start adding items to this list to get organized!"
    >
      <div class="flex justify-center">
        <ion-button @click="router.push({name: 'AddItem', params: {id: list.id}})">
          Add Item
        </ion-button>
      </div>
    </EmptyContent>

    <div v-else>
      <ion-list class="bg-transparent">
        <ListItem
            v-for="item in list.items"
            :key="item.id"
            :item="item"
            @toggle="handleItemToggle"
        />
      </ion-list>
    </div>

    <ion-fab v-if="list?.items.length" slot="fixed" vertical="bottom" horizontal="end" class="p-3">
      <ion-fab-button @click="router.push({name: 'AddItem', params: {id: list.id}})">
        <Plus/>
      </ion-fab-button>
    </ion-fab>
  </PageWrapper>
</template>

<style scoped>

</style>
