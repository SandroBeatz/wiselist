import { modalController } from '@ionic/vue'
import LanguageSwitcherDialog from '../ui/LanguageSwitcherDialog.vue'

interface DialogInstance {
  present: () => Promise<void>
  dismiss: (data?: any, role?: string) => Promise<boolean>
  onDidDismiss: () => Promise<{ data?: any; role?: string }>
}

export function useLanguageSwitcherDialog() {
  const open = async (): Promise<DialogInstance> => {
    const modal = await modalController.create({
      component: LanguageSwitcherDialog,
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
