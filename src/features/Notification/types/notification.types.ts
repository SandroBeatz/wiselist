export interface NotificationSettings {
  listSharing: boolean
  reminder: boolean
}

export interface NotificationPermission {
  granted: boolean
  requestedAt?: Date
}
