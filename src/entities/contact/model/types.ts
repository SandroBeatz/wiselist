import type { User } from "@entities/user/@x/contact";
import type {Nullable} from "@shared/types/global";

export type ContactId = string

export interface Contact {
  id: ContactId
  user: User
  nickname: Nullable<string>
}

export type  ContactsResponse = Contact[]

export interface CreateContactRequest {
  email: string
  nickname?: string
}

export interface UpdateContactRequest {
  nickname?: string
}
