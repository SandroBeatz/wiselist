import {defineStore} from 'pinia'
import {apiContact} from '../api'
import type {Nullable} from '@shared/types/global'
import type {Contact, ContactId} from "./types";

interface ContactState {
  isLoading: boolean
  contacts: Contact[]
  error: Nullable<string>
}

export const useContactsStore = defineStore('contacts', {
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
  },

  actions: {
    toggleLoader(value?: boolean) {
      this.isLoading = typeof value === 'boolean' ? value : !this.isLoading
    },

    setError(error: string | null) {
      this.error = error
    },

    async fetchData() {
      try {
        this.toggleLoader(true)
        this.setError(null)
        this.contacts = await apiContact.getContacts()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch contacts'
        this.setError(errorMessage)
        throw error
      } finally {
        this.toggleLoader(false)
      }
    },

    async createContact(email: string, nickname?: string) {
      try {
        this.toggleLoader(true)
        this.setError(null)
        const newContact = await apiContact.createContact({
          email,
          nickname,
        })
        this.contacts.push(newContact)
        return newContact
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create contact'
        this.setError(errorMessage)
        throw error
      } finally {
        this.toggleLoader(false)
      }
    },

    async updateContact(contactId: ContactId, nickname: string) {
      try {
        this.toggleLoader(true)
        this.setError(null)
        const updatedContact = await apiContact.updateContact(contactId, {
          nickname: nickname || undefined,
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
        this.toggleLoader(false)
      }
    },

    async deleteContact(contactId: ContactId) {
      try {
        this.toggleLoader(true)
        this.setError(null)
        await apiContact.deleteContact(contactId)

        // Remove from local state
        this.contacts = this.contacts.filter(contact => contact.id !== contactId)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete contact'
        this.setError(errorMessage)
        throw error
      } finally {
        this.toggleLoader(false)
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
