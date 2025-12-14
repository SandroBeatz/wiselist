export type ThemeMode = 'light' | 'dark' | 'system'
export type AppliedTheme = 'light' | 'dark'

export interface ThemeInfo {
  mode: ThemeMode
  label: string
  icon?: string
}
