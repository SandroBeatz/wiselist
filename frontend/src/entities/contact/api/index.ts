import { API } from '@shared/instances/axios'
import type {
  ContactId,
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  ContactsResponse,
} from '../model/types'

// API endpoints
const CONTACTS_ROUTE = 'contacts'

const CONTACT_ROUTE = (contactId: ContactId) => `contacts/${contactId}`

const createContact = (payload: CreateContactRequest) =>
  new Promise<Contact>((resolve, reject) => {
    API.post(CONTACTS_ROUTE, payload)
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Failed to create contact'), {
            response: e.response,
          })
        )
      )
  })

const getContacts = () =>
  new Promise<ContactsResponse>((resolve, reject) => {
    API.get(CONTACTS_ROUTE)
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Failed to get contacts'), {
            response: e.response,
          })
        )
      )
  })

const updateContact = (contactId: ContactId, payload: UpdateContactRequest) =>
  new Promise<Contact>((resolve, reject) => {
    API.patch(CONTACT_ROUTE(contactId), payload)
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Failed to update contact'), {
            response: e.response,
          })
        )
      )
  })

const deleteContact = (contactId: ContactId) =>
  new Promise<{ message: string }>((resolve, reject) => {
    API.delete(CONTACT_ROUTE(contactId))
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Failed to delete contact'), {
            response: e.response,
          })
        )
      )
  })

export const apiContact = {
  createContact,
  getContacts,
  updateContact,
  deleteContact,
} as const
