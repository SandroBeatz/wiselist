import type { BaseFormData } from '@shared/composables/useFormHandler'
import type { User } from "@entities/user/@x/contact";
import type {Nullable} from "@shared/types/global";

export type ContactId = string

export interface Contact {
  id: ContactId
  user: User
  nickname: Nullable<string>
}

export type  ContactsResponse = Contact[]

export interface ContactFormData extends BaseFormData {
  contactEmail: string
  contactName: string
}

export interface CreateContactRequest {
  contactEmail: string
  contactName?: string
}

export interface UpdateContactRequest {
  contactName?: string
}
