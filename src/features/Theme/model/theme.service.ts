import { useLocalStorage } from '@vueuse/core'
import { ref, watch } from 'vue'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import { storageKeys } from '@shared/constants/storage.constants'
import type { Ref } from 'vue'
import type { ThemeMode, AppliedTheme } from '../types/theme.types'

/**
 * Theme management service for handling light/dark/system themes
 */
class ThemeService {
  private _themeMode: Ref<ThemeMode>
  private _systemTheme: Ref<AppliedTheme>
  private _mediaQuery: MediaQueryList | null = null

  constructor() {
    // Store user preference (light/dark/system) in localStorage
    this._themeMode = useLocalStorage<ThemeMode>(storageKeys.THEME_MODE, 'system')

    // Track system theme
    this._systemTheme = ref<AppliedTheme>(
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    )
  }

  /**
   * Initialize theme system and start monitoring
   * MUST be called from App.vue onBeforeMount
   */
  initialize(): void {
    // Set up system theme listener
    if (window.matchMedia) {
      this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      // Modern listener API (Safari 14+, Chrome 66+)
      const listener = (e: MediaQueryListEvent) => {
        this._systemTheme.value = e.matches ? 'dark' : 'light'
      }

      this._mediaQuery.addEventListener('change', listener)
    }

    // Watch computed appliedTheme and update DOM + StatusBar
    watch(
      () => this.getAppliedTheme(),
      (theme) => {
        this._applyThemeToDOM(theme)
        this._updateStatusBar(theme)
      },
      { immediate: true } // Apply on initialization
    )
  }

  /**
   * Get current theme mode (user preference: light/dark/system)
   */
  getThemeMode(): ThemeMode {
    return this._themeMode.value
  }

  /**
   * Set theme mode
   */
  setThemeMode(mode: ThemeMode): void {
    this._themeMode.value = mode
  }

  /**
   * Get the actual applied theme (resolves 'system' to 'light' or 'dark')
   */
  getAppliedTheme(): AppliedTheme {
    if (this._themeMode.value === 'system') {
      return this._systemTheme.value
    }
    return this._themeMode.value
  }

  /**
   * Get current theme mode display name for Settings UI
   */
  getCurrentThemeLabel(): string {
    const modes = {
      light: 'Light',
      dark: 'Dark',
      system: 'System'
    }
    return modes[this._themeMode.value]
  }

  /**
   * Get reactive theme mode ref
   */
  get themeModeRef(): Ref<ThemeMode> {
    return this._themeMode
  }

  /**
   * Apply theme to DOM via color-theme attribute
   */
  private _applyThemeToDOM(theme: AppliedTheme): void {
    document.body.setAttribute('color-theme', theme)
  }

  /**
   * Update Capacitor StatusBar style (native platforms only)
   */
  private async _updateStatusBar(theme: AppliedTheme): Promise<void> {
    // Guard: Only run on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform()) {
      return
    }

    try {
      await StatusBar.setStyle({
        style: theme === 'dark' ? Style.Dark : Style.Light
      })
    } catch (error) {
      // Graceful degradation if StatusBar unavailable
      console.warn('Failed to update StatusBar:', error)
    }
  }
}

// Create singleton instance
export const themeService = new ThemeService()
