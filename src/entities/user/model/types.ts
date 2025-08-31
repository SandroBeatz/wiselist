import {Nullable} from "@shared/types/global";

export type UserId = string

export type UserProfile = {
    fullName: string
    avatar: Nullable<string>
}

export interface User {
    id: UserId
    email: string
    profile: UserProfile
}
