import { useLocalStorage } from '@vueuse/core'
import { watch } from 'vue'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { storageKeys } from '@shared/constants/storage.constants'
import type { Ref } from 'vue'
import type { NotificationSettings, NotificationPermission } from '../types/notification.types'

/**
 * Notification management service for handling local notifications and settings
 */
class NotificationService {
  private _settings: Ref<NotificationSettings>
  private _permission: Ref<NotificationPermission>
  private _isInitialized = false

  // Smart reminder schedule IDs
  private readonly REMINDER_IDS = {
    DAILY_MORNING: 1,
    WEEKEND: 2,
    // Holiday IDs will be 100+
  }

  constructor() {
    // Store notification settings in localStorage
    this._settings = useLocalStorage<NotificationSettings>(storageKeys.NOTIFICATION_SETTINGS, {
      listSharing: false,
      reminder: false,
    })

    this._permission = useLocalStorage<NotificationPermission>(storageKeys.NOTIFICATION_PERMISSION, {
      granted: false,
    })
  }

  /**
   * Initialize notification service and set up watchers
   * MUST be called from App.vue onBeforeMount
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) return

    // Only setup notifications on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.warn('Local notifications only available on native platforms')
      this._isInitialized = true
      return
    }

    // Check and update permission status
    await this._checkPermissionStatus()

    // Watch reminder setting changes
    watch(
      () => this._settings.value.reminder,
      async (enabled) => {
        if (enabled && this._permission.value.granted) {
          await this._scheduleSmartReminders()
        } else if (!enabled) {
          await this._cancelAllReminders()
        }
      },
      { immediate: true }
    )

    this._isInitialized = true
  }

  /**
   * Get current notification settings
   */
  getSettings(): NotificationSettings {
    return this._settings.value
  }

  /**
   * Get reactive settings ref
   */
  get settingsRef(): Ref<NotificationSettings> {
    return this._settings
  }

  /**
   * Check if user has granted notification permissions
   */
  hasPermission(): boolean {
    return this._permission.value.granted
  }

  /**
   * Request notification permissions from user
   */
  async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false
    }

    try {
      const result = await LocalNotifications.requestPermissions()
      this._permission.value = {
        granted: result.display === 'granted',
        requestedAt: new Date(),
      }

      return this._permission.value.granted
    } catch (error) {
      console.error('Failed to request notification permissions:', error)
      return false
    }
  }

  /**
   * Enable/disable list sharing notifications (stub for now)
   */
  setListSharingEnabled(enabled: boolean): void {
    this._settings.value.listSharing = enabled
    // TODO: Implement WebSocket notification subscription when backend is ready
  }

  /**
   * Enable/disable smart reminders
   */
  async setReminderEnabled(enabled: boolean): Promise<boolean> {
    // Request permission if not granted
    if (enabled && !this._permission.value.granted) {
      const granted = await this.requestPermission()
      if (!granted) {
        return false // User denied permission
      }
    }

    this._settings.value.reminder = enabled
    return true
  }

  /**
   * Check current permission status
   */
  private async _checkPermissionStatus(): Promise<void> {
    try {
      const status = await LocalNotifications.checkPermissions()
      this._permission.value.granted = status.display === 'granted'
    } catch (error) {
      console.warn('Failed to check notification permissions:', error)
    }
  }

  /**
   * Schedule smart reminders with predefined times
   */
  private async _scheduleSmartReminders(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return

    try {
      // Cancel existing reminders first
      await this._cancelAllReminders()

      // Create notification channel for Android
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: 'wiselist_reminders',
          name: 'Shopping Reminders',
          description: 'Smart reminders for your shopping lists',
          importance: 3, // Default importance
          visibility: 1, // Private
          sound: 'default',
          vibration: true,
        })
      }

      const notifications = []

      // Daily morning reminder (9:00 AM)
      notifications.push({
        id: this.REMINDER_IDS.DAILY_MORNING,
        title: 'Good morning!',
        body: "Don't forget to check your shopping list today",
        schedule: {
          on: {
            hour: 9,
            minute: 0,
          },
          every: 'day' as any,
          allowWhileIdle: true,
        },
        channelId: 'wiselist_reminders',
      })

      // Weekend reminder (Saturday 10:00 AM)
      notifications.push({
        id: this.REMINDER_IDS.WEEKEND,
        title: 'Weekend planning',
        body: 'Time to plan your weekly shopping list',
        schedule: {
          on: {
            weekday: 7, // Saturday (1 = Sunday, 7 = Saturday)
            hour: 10,
            minute: 0,
          },
          every: 'week' as any,
          allowWhileIdle: true,
        },
        channelId: 'wiselist_reminders',
      })

      // Schedule holiday reminders (examples)
      const holidays = this._getUpcomingHolidays()
      holidays.forEach((holiday, index) => {
        notifications.push({
          id: 100 + index,
          title: `${holiday.name} is coming!`,
          body: 'Prepare your shopping list for the celebration',
          schedule: {
            at: holiday.reminderDate,
            allowWhileIdle: true,
          },
          channelId: 'wiselist_reminders',
        })
      })

      await LocalNotifications.schedule({ notifications })
    } catch (error) {
      console.error('Failed to schedule reminders:', error)
    }
  }

  /**
   * Cancel all scheduled reminders
   */
  private async _cancelAllReminders(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return

    try {
      const pending = await LocalNotifications.getPending()
      const ids = pending.notifications.map((n) => ({ id: n.id }))

      if (ids.length > 0) {
        await LocalNotifications.cancel({ notifications: ids })
      }
    } catch (error) {
      console.error('Failed to cancel reminders:', error)
    }
  }

  /**
   * Get upcoming holidays for the current year
   * TODO: Make this configurable or fetch from API
   */
  private _getUpcomingHolidays() {
    const now = new Date()
    const currentYear = now.getFullYear()

    const holidays = [
      { name: 'Christmas', date: new Date(currentYear, 11, 25) },
      { name: 'New Year', date: new Date(currentYear + 1, 0, 1) },
      { name: 'Thanksgiving', date: new Date(currentYear, 10, 24) }, // Approximate
    ]

    // Filter only future holidays and set reminder 3 days before
    return holidays
      .filter((h) => h.date > now)
      .map((h) => ({
        name: h.name,
        date: h.date,
        reminderDate: new Date(h.date.getTime() - 3 * 24 * 60 * 60 * 1000),
      }))
      .filter((h) => h.reminderDate > now)
  }
}

// Create singleton instance
export const notificationService = new NotificationService()
