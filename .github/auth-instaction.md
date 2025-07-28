# Backend Authentication Task for Wiselist Project

## Task Overview
Implement backend authentication system for the Wiselist application using NestJS, Prisma, and PostgreSQL with Google/Apple OAuth integration.

## Requirements

### Tech Stack
- **Backend Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Google OAuth 2.0 and Apple Sign-In
- **Language**: TypeScript

### Features to Implement

#### 1. Database Setup
- Set up PostgreSQL database
- Create Prisma schema with User entity:
  ```prisma
  model User {
    id        String   @id @default(uuid())
    email     String   @unique
    name      String
    avatarUrl String?
    provider  Provider
    createdAt DateTime @default(now())
    
    // Relations for future features
    ownedLists     List[] @relation("ListOwner")
    listAccesses   UserListAccess[]
    notifications  Notification[]
  }
  
  enum Provider {
    GOOGLE
    APPLE
  }
  ```

#### 2. Authentication Module
- Create authentication module with the following endpoints:
    - `POST /auth/google` - Google OAuth login
    - `POST /auth/apple` - Apple Sign-In login
    - `GET /auth/profile` - Get current user profile (protected)
    - `POST /auth/logout` - Logout user

#### 3. JWT Implementation
- Implement JWT token generation and validation
- Create JWT strategy for protecting routes
- Set appropriate token expiration (e.g., 7 days)

#### 4. OAuth Integration
- Google OAuth 2.0 integration
- Apple Sign-In integration
- Handle OAuth callbacks and token exchange
- Extract user information (email, name, avatar) from OAuth providers

#### 5. Guards and Decorators
- Create JWT authentication guard
- Create user decorator to extract current user from request
- Implement proper error handling for authentication failures

#### 6. Environment Configuration
- Set up environment variables for:
    - Database connection string
    - JWT secret
    - Google OAuth credentials (client ID, client secret)
    - Apple Sign-In credentials

## File Structure Expected
```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── google.strategy.ts
│   │   └── apple.strategy.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── decorators/
│   │   └── authorised-user.decorator.ts
│   └── dto/
│       ├── login.dto.ts
│       └── auth-response.dto.ts
├── users/
│   ├── users.service.ts
│   └── users.module.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── app.module.ts
```

## API Endpoints Specification

### POST /auth/google
**Request Body:**
```json
{
  "token": "google_oauth_token"
}
```

**Response:**
```json
{
  "access_token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "https://...",
    "provider": "GOOGLE"
  }
}
```

### POST /auth/apple
**Request Body:**
```json
{
  "identityToken": "apple_identity_token",
  "user": {
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "email": "user@example.com"
  }
}
```

**Response:** Same as Google auth

### GET /auth/profile
**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatarUrl": "https://...",
  "provider": "GOOGLE",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Implementation Notes

1. **User Creation/Update Logic**:
    - If user exists (by email), update their information
    - If user doesn't exist, create new user
    - Handle edge cases where email might change

2. **Security Considerations**:
    - Validate OAuth tokens server-side
    - Implement rate limiting on auth endpoints
    - Use secure JWT settings (strong secret, appropriate expiration)

3. **Error Handling**:
    - Invalid OAuth tokens
    - Expired JWT tokens
    - Database connection errors
    - Validation errors

4. **Testing Requirements**:
    - Unit tests for AuthService
    - Integration tests for auth endpoints
    - Mock OAuth providers for testing

## Environment Variables (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/wiselist"
JWT_SECRET="your-super-secret-jwt-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
APPLE_CLIENT_ID="your-apple-client-id"
APPLE_TEAM_ID="your-apple-team-id"
APPLE_KEY_ID="your-apple-key-id"
APPLE_PRIVATE_KEY="your-apple-private-key"
```

## Dependencies to Install
```json
{
  "@nestjs/passport": "^10.0.0",
  "@nestjs/jwt": "^10.0.0",
  "passport": "^0.6.0",
  "passport-jwt": "^4.0.0",
  "passport-google-oauth20": "^2.0.0",
  "apple-signin-auth": "^1.7.0",
  "@prisma/client": "^5.0.0",
  "prisma": "^5.0.0"
}
```

## Success Criteria
- [ ] User can authenticate with Google OAuth
- [ ] User can authenticate with Apple Sign-In
- [ ] JWT tokens are properly generated and validated
- [ ] Protected routes work with JWT authentication
- [ ] User profile can be retrieved
- [ ] Database schema is properly set up
- [ ] All endpoints return appropriate HTTP status codes
- [ ] Proper error handling is implemented
- [ ] Environment configuration is working
