import { modalController } from '@ionic/vue'
import ThemeSwitcherDialog from '../ui/ThemeSwitcherDialog.vue'

interface DialogInstance {
  present: () => Promise<void>
  dismiss: (data?: any, role?: string) => Promise<boolean>
  onDidDismiss: () => Promise<{ data?: any; role?: string }>
}

export function useThemeSwitcherDialog() {
  const open = async (): Promise<DialogInstance> => {
    const modal = await modalController.create({
      component: ThemeSwitcherDialog,
      initialBreakpoint: 1,
      breakpoints: [0, 1],
      cssClass: 'height-auto',
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
