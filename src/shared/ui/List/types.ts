import type { Component } from 'vue'

export interface ListItemProps {
  label: string
  caption?: string
  detail?: string | boolean
  icon?: Component | string
  avatar?: string
  button?: boolean
  lines?: 'full' | 'inset' | 'none'
  onClick?: () => void

  // Toggle support
  hasToggle?: boolean
  toggleValue?: boolean
  toggleDisabled?: boolean
  onToggle?: (value: boolean) => void
}

export interface ListSectionProps {
  title?: string
  items: ListItemProps[]
}

export interface ListProps {
  sections: ListSectionProps[]
  lines?: 'full' | 'inset' | 'none'
}