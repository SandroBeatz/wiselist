import { modalController } from '@ionic/vue'
import ConfirmationDialog from '../ui/ConfirmationDialog.vue'

interface OpenDialogOptions {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  confirmColor?: string
  onConfirm?: () => void | Promise<void>
}

interface DialogInstance {
  present: () => Promise<void>
  dismiss: (data?: any, role?: string) => Promise<boolean>
  onDidDismiss: () => Promise<{ data?: any; role?: string }>
}

export function useConfirmationDialog() {
  const open = async (options: OpenDialogOptions = {}): Promise<DialogInstance> => {
    const modal = await modalController.create({
      component: ConfirmationDialog,
      componentProps: {
        title: options.title,
        message: options.message,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        confirmColor: options.confirmColor,
        onConfirm: options.onConfirm,
      },
      cssClass: 'height-auto confirmation-dialog',
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
