import { modalController } from '@ionic/vue'
import CreateEditListDialog from '../ui/CreateEditListDialog.vue'
import type { ListId, List } from '@/entities/list'

interface OpenDialogOptions {
  id?: ListId
  list?: List
  callback?: () => Promise<void>
}

interface DialogInstance {
  present: () => Promise<void>
  dismiss: (data?: any, role?: string) => Promise<boolean>
  onDidDismiss: () => Promise<{ data?: any; role?: string }>
}

export function useCreateEditListDialog() {
  const open = async (options: OpenDialogOptions = {}): Promise<DialogInstance> => {
    const modal = await modalController.create({
      component: CreateEditListDialog,
      componentProps: {
        id: options.id,
        list: options.list,
        callback: options.callback,
      },
      initialBreakpoint: 1,
      breakpoints: [0, 1],
    })

    return {
      present: () => modal.present(),
      dismiss: (data?: any, role?: string) => modal.dismiss(data, role),
      onDidDismiss: () => modal.onDidDismiss(),
    }
  }

  return {
    open,
  }
}

// Static method for the component
export const CreateEditListDialogService = {
  open: async (options: OpenDialogOptions = {}): Promise<DialogInstance> => {
    const modal = await modalController.create({
      component: CreateEditListDialog,
      componentProps: {
        id: options.id,
        list: options.list,
        callback: options.callback,
      },
      initialBreakpoint: 1,
      breakpoints: [0, 1],
      cssClass: 'height-auto',
    })

    return {
      present: () => modal.present(),
      dismiss: (data?: any, role?: string) => modal.dismiss(data, role),
      onDidDismiss: () => modal.onDidDismiss(),
    }
  },
}
