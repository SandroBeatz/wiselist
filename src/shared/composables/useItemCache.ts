import { ref, computed } from 'vue'
import type { ListType } from '@/entities/list/model/types'
import { getShoppingItemsByLanguage } from '@/shared/data/shoppingItems'

interface CachedItem {
  content: string
  addedAt: string
}

type ItemCache = Record<ListType, CachedItem[]>

const CACHE_STORAGE_KEY = 'wiselist_item_cache'
const PRELOADED_FLAG_KEY = 'wiselist_preloaded_shopping_items'

class ItemCacheService {
  private cache = ref<ItemCache>({
    SHOPPING: [],
    TODO: [],
    OTHER: [],
  })

  constructor() {
    this.loadFromStorage()
    this.initializeDefaultShoppingItems()
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY)
      if (stored) {
        const parsedCache = JSON.parse(stored)
        this.cache.value = { ...this.cache.value, ...parsedCache }
      }
    } catch (error) {
      console.error('Failed to load item cache from storage:', error)
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(this.cache.value))
    } catch (error) {
      console.error('Failed to save item cache to storage:', error)
    }
  }

  private initializeDefaultShoppingItems() {
    try {
      // Check if default items have already been loaded
      const isPreloaded = localStorage.getItem(PRELOADED_FLAG_KEY)

      if (!isPreloaded) {
        // Detect user language (fallback to 'en')
        // const userLanguage = navigator.language.startsWith('ru') ? 'ru' : 'en';
        const userLanguage = 'ru'

        // Get shopping items for user's language
        const defaultItems = getShoppingItemsByLanguage(userLanguage as 'en' | 'ru')

        // Add default items to shopping cache
        const shoppingItems = (this.cache.value as ItemCache)['SHOPPING']
        const currentTime = new Date().toISOString()

        defaultItems.forEach((item) => {
          // Only add if not already exists
          const exists = shoppingItems.some(
            (cachedItem: CachedItem) => cachedItem.content.toLowerCase() === item.toLowerCase()
          )

          if (!exists) {
            shoppingItems.push({
              content: item,
              addedAt: currentTime,
            })
          }
        })

        // Save to storage and mark as preloaded
        this.saveToStorage()
        localStorage.setItem(PRELOADED_FLAG_KEY, 'true')

        console.log(`Preloaded ${defaultItems.length} default shopping items (${userLanguage})`)
      }
    } catch (error) {
      console.error('Failed to initialize default shopping items:', error)
    }
  }

  getItemsForType(type: ListType): CachedItem[] {
    return (this.cache.value as ItemCache)[type] || []
  }

  addItem(type: ListType, content: string) {
    if (!content.trim()) return

    const items = (this.cache.value as ItemCache)[type]
    const exists = items.some(
      (item: CachedItem) => item.content.toLowerCase() === content.toLowerCase()
    )

    if (!exists) {
      items.unshift({
        content: content.trim(),
        addedAt: new Date().toISOString(),
      })

      // Keep only the last 50 items to prevent cache from growing too large
      if (items.length > 50) {
        items.splice(50)
      }

      this.saveToStorage()
    }
  }

  removeItem(type: ListType, content: string) {
    const items = (this.cache.value as ItemCache)[type]
    const index = items.findIndex(
      (item: CachedItem) => item.content.toLowerCase() === content.toLowerCase()
    )

    if (index !== -1) {
      items.splice(index, 1)
      this.saveToStorage()
    }
  }

  hasItem(type: ListType, content: string): boolean {
    const items = (this.cache.value as ItemCache)[type]
    return items.some((item: CachedItem) => item.content.toLowerCase() === content.toLowerCase())
  }

  clearType(type: ListType) {
    ;(this.cache.value as ItemCache)[type] = []
    this.saveToStorage()
  }

  clearAll() {
    this.cache.value = {
      SHOPPING: [],
      TODO: [],
      OTHER: [],
    }
    this.saveToStorage()
  }
}

// Singleton instance
const itemCacheService = new ItemCacheService()

export const useItemCache = () => {
  const getCachedItems = (type: ListType) => {
    return computed(() => itemCacheService.getItemsForType(type))
  }

  const addToCache = (type: ListType, content: string) => {
    itemCacheService.addItem(type, content)
  }

  const removeFromCache = (type: ListType, content: string) => {
    itemCacheService.removeItem(type, content)
  }

  const isInCache = (type: ListType, content: string): boolean => {
    return itemCacheService.hasItem(type, content)
  }

  const clearCache = (type: ListType) => {
    itemCacheService.clearType(type)
  }

  const clearAllCache = () => {
    itemCacheService.clearAll()
  }

  return {
    getCachedItems,
    addToCache,
    removeFromCache,
    isInCache,
    clearCache,
    clearAllCache,
  }
}
