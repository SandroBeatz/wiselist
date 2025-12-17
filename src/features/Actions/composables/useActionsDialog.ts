import { modalController } from '@ionic/vue'
import ActionsDialog from '../ui/ActionsDialog.vue'
import type { ActionsDialogProps, ActionsDialogResult } from '../model/actions.types'

interface DialogInstance {
  present: () => Promise<void>
  dismiss: (data?: ActionsDialogResult, role?: string) => Promise<boolean>
  onDidDismiss: () => Promise<{ data?: ActionsDialogResult; role?: string }>
}

export function useActionsDialog() {
  const open = async (props: ActionsDialogProps): Promise<DialogInstance> => {
    const modal = await modalController.create({
      component: ActionsDialog,
      componentProps: props,
      initialBreakpoint: 1,
      breakpoints: [0, 1],
      cssClass: 'height-auto',
    })

    return {
      present: () => modal.present(),
      dismiss: (data?: ActionsDialogResult, role?: string) => modal.dismiss(data, role),
      onDidDismiss: () => modal.onDidDismiss(),
    }
  }

  return {
    open,
  }
}
