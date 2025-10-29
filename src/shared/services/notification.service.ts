import { toastController } from '@ionic/vue'

/**
 * NotificationService - Toast notifications for sync events
 *
 * Features:
 * - Sync success/failure notifications
 * - Conflict detection alerts
 * - Connection status updates
 * - Non-intrusive toasts
 * - Auto-dismiss with configurable duration
 */

export class NotificationService {
  private static instance: NotificationService | null = null

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Show sync success notification
   */
  async showSyncSuccess(itemCount: number = 0): Promise<void> {
    const message = itemCount > 0
      ? `Successfully synced ${itemCount} item${itemCount > 1 ? 's' : ''}`
      : 'All changes synced'

    const toast = await toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle',
    })

    await toast.present()
  }

  /**
   * Show sync failure notification
   */
  async showSyncError(error: string, retryCount?: number): Promise<void> {
    const message = retryCount !== undefined
      ? `Sync failed (retry ${retryCount}): ${error}`
      : `Sync failed: ${error}`

    const toast = await toastController.create({
      message,
      duration: 4000,
      position: 'bottom',
      color: 'danger',
      icon: 'alert-circle',
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel',
        },
      ],
    })

    await toast.present()
  }

  /**
   * Show conflict detected notification
   */
  async showConflict(entityType: string, resolution: string): Promise<void> {
    const message = `Conflict detected in ${entityType}. ${resolution}`

    const toast = await toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'warning',
      icon: 'warning',
    })

    await toast.present()
  }

  /**
   * Show connection restored notification
   */
  async showConnectionRestored(): Promise<void> {
    const toast = await toastController.create({
      message: 'Connection restored. Syncing...',
      duration: 2000,
      position: 'bottom',
      color: 'primary',
      icon: 'wifi',
    })

    await toast.present()
  }

  /**
   * Show offline mode notification
   */
  async showOfflineMode(): Promise<void> {
    const toast = await toastController.create({
      message: 'Working offline. Changes will sync when online.',
      duration: 3000,
      position: 'bottom',
      color: 'medium',
      icon: 'cloud-offline',
    })

    await toast.present()
  }

  /**
   * Show large pending queue warning
   */
  async showLargePendingQueue(count: number): Promise<void> {
    const toast = await toastController.create({
      message: `${count} changes pending sync. Connect to sync.`,
      duration: 4000,
      position: 'bottom',
      color: 'warning',
      icon: 'cloud-upload',
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
        },
      ],
    })

    await toast.present()
  }

  /**
   * Show generic info notification
   */
  async showInfo(message: string, duration: number = 2000): Promise<void> {
    const toast = await toastController.create({
      message,
      duration,
      position: 'bottom',
      color: 'primary',
    })

    await toast.present()
  }

  /**
   * Show generic error notification
   */
  async showError(message: string, duration: number = 3000): Promise<void> {
    const toast = await toastController.create({
      message,
      duration,
      position: 'bottom',
      color: 'danger',
      icon: 'alert-circle',
    })

    await toast.present()
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()
