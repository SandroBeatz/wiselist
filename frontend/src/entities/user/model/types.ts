export type UserId = string

export type UserProfile = {
    fullName: string
}

export interface User {
    id: UserId
    email: string
    profile: UserProfile
}
