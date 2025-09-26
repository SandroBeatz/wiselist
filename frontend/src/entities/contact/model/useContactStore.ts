import {defineStore} from 'pinia'
import {apiContact} from '../api'
import type {Nullable} from '@shared/types/global'
import type {Contact, ContactId} from "./types";

interface ContactState {
  isLoading: boolean
  contacts: Contact[]
  error: Nullable<string>
}

export const useContactStore = defineStore('contacts', {
  state: (): ContactState => ({
    isLoading: false,
    contacts: [],
    error: null,
  }),

  getters: {
    getContactById: (state) => (contactId: ContactId) => {
      return state.contacts.find(contact => contact.id === contactId)
    },

    getContactByEmail: (state) => (email: string) => {
      return state.contacts.find(contact => contact.user.email === email)
    },

    sortedContacts: (state) => {
      return [...state.contacts].sort((a, b) => {
        // Sort by name, then by email
        const nameA = a.user.profile.fullName || a.user.email
        const nameB = b.user.profile.fullName || b.user.email
        return nameA.localeCompare(nameB)
      })
    },
  },

  actions: {
    setLoading(loading: boolean) {
      this.isLoading = loading
    },

    setError(error: string | null) {
      this.error = error
    },

    async fetchContacts() {
      try {
        this.setLoading(true)
        this.setError(null)
        this.contacts = await apiContact.getContacts()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch contacts'
        this.setError(errorMessage)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    async createContact(contactEmail: string, contactName?: string) {
      try {
        this.setLoading(true)
        this.setError(null)
        const newContact = await apiContact.createContact({
          contactEmail,
          contactName,
        })
        this.contacts.push(newContact)
        return newContact
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create contact'
        this.setError(errorMessage)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    async updateContact(contactId: ContactId, contactName: string) {
      try {
        this.setLoading(true)
        this.setError(null)
        const updatedContact = await apiContact.updateContact(contactId, {
          contactName: contactName || undefined,
        })

        // Update local state
        const contactIndex = this.contacts.findIndex(contact => contact.id === contactId)
        if (contactIndex !== -1) {
          this.contacts[contactIndex] = updatedContact
        }

        return updatedContact
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update contact'
        this.setError(errorMessage)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    async deleteContact(contactId: ContactId) {
      try {
        this.setLoading(true)
        this.setError(null)
        await apiContact.deleteContact(contactId)

        // Remove from local state
        this.contacts = this.contacts.filter(contact => contact.id !== contactId)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete contact'
        this.setError(errorMessage)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    clearError() {
      this.error = null
    },

    clearContacts() {
      this.contacts = []
      this.error = null
    },
  },
})
