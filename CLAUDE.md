# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wiselist is a **monorepo** containing both a NestJS backend API and an Ionic Vue 3 frontend mobile application. This is a collaborative smart shopping list application built with TypeScript throughout, featuring real-time updates, multi-provider authentication, and cross-platform deployment.

```
wiselist/
├── backend/          # NestJS API server with PostgreSQL
├── frontend/         # Ionic Vue mobile app with Capacitor
└── CLAUDE.md         # This documentation file
```

## Backend Development (NestJS)

### Commands
Run these commands from the `backend/` directory:

```bash
# Development
yarn start:dev        # Watch mode development (recommended)
yarn start:debug      # Debug mode with inspector
yarn start:prod       # Production mode

# Database (Prisma)
yarn prisma:migrate   # Run database migrations
yarn prisma:generate  # Generate Prisma client after schema changes
yarn prisma:studio    # Open Prisma Studio (database GUI)

# Testing
yarn test            # Unit tests
yarn test:e2e        # End-to-end tests
yarn test:cov        # Test coverage
yarn test:watch      # Unit tests in watch mode

# Code Quality
yarn lint            # ESLint with auto-fix
yarn format          # Prettier formatting

# Build
yarn build           # Build for production
```

### Backend Architecture

**Core Modules**:
- `AuthModule` - Multi-provider authentication (Email, Google, Apple)
- `UserModule` - User management with provider enum support
- `ProfileModule` - User profile management with avatar support
- `ListModule` - Shopping list CRUD with ownership and type classification
- `ListItemModule` - List item management with checked state
- `PrismaModule` - Database connection and transaction management

**Key Technologies**:
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt, Passport strategies (Google OAuth, Apple Sign-in)
- **Real-time**: WebSocket implementation for collaborative features
- **Validation**: class-validator and class-transformer
- **Testing**: Jest with comprehensive unit, E2E, and performance test suites

**Database Schema** (PostgreSQL):
```prisma
User { id, email, password, provider, googleId, isSubscribed }
Profile { userId, fullName, avatar, notificationsEnabled }
List { id, title, type: SHOPPING|TODO|OTHER, ownerId }
ListItem { id, listId, content, checked }
```

## Frontend Development (Ionic Vue)

### Commands
Run these commands from the `frontend/` directory:

```bash
# Development
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build with TypeScript compilation
npm run preview      # Preview production build
npm run lint         # ESLint

# Testing
npm run test:unit    # Vitest unit tests
npm run test:e2e     # Cypress E2E tests (requires dev server running)

# Mobile Development (Capacitor)
npx cap sync         # Sync web assets to native platforms
npx cap run android  # Run on Android device/emulator
npx cap build android # Build Android APK
```

### Frontend Architecture (Feature-Sliced Design)

The frontend follows **Feature-Sliced Design (FSD)** methodology:

```
src/
├── app/         # Application layer (router, layouts, global config)
├── pages/       # Page components (route handlers)
├── features/    # Business features (Auth, List management, Profile)
├── entities/    # Business entities (User, List, ListItem)
├── shared/      # Shared utilities, services, UI components
└── widgets/     # Composite UI components
```

**Path Aliases** (configured in `vite.config.ts` and `tsconfig.json`):
- `@/` → `src/`
- `@app/` → `src/app/`
- `@pages/` → `src/pages/`
- `@shared/` → `src/shared/`
- `@features/` → `src/features/`
- `@entities/` → `src/entities/`

**Key Architecture Patterns**:
- **Authentication**: JWT tokens with automatic refresh, multi-provider support
- **State Management**: Pinia stores with feature-specific organization
- **Request Handling**: Axios with interceptors for token attachment and refresh
- **Route Protection**: Middleware-based auth guards via `meta.middleware`
- **Request Queuing**: Offline-capable request queuing service
- **Token Monitoring**: Real-time token validation with automatic refresh

**Technology Stack**:
- **Framework**: Vue 3 + Composition API + Ionic Vue + Capacitor
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS + Ionic CSS variables
- **State**: Pinia stores
- **Routing**: Vue Router + Ionic Router
- **Testing**: Vitest (unit) + Cypress (E2E)
- **Build**: Vite with legacy browser support
- **Authentication**: Firebase + Google Social Login (@capgo/capacitor-social-login)
- **Icons**: Ionicons + Lucide Vue Next
- **Utilities**: VueUse + Auto-animate

## Monorepo Development Workflow

### Environment Setup
1. **Backend**: Create `backend/.env` from `backend/.env.example`
   - PostgreSQL connection string
   - JWT secrets (access + refresh)
   - OAuth client IDs (Google, Apple)
2. **Frontend**: Create `frontend/.env` from `frontend/.env.example`
   - `VITE_API_URL` (typically `http://localhost:3000`)

### Development Process
1. **Start Backend**: `cd backend && yarn start:dev` (runs on port 3000)
2. **Start Frontend**: `cd frontend && npm run dev` (runs on port 5173)
3. **Database Setup**: `cd backend && yarn prisma:migrate && yarn prisma:generate`

### Integration Points
- **API Communication**: Frontend uses Axios to communicate with NestJS backend
- **Authentication Flow**: JWT tokens managed by frontend, validated by backend
- **Real-time Features**: WebSocket connection for collaborative list updates
- **Mobile Deployment**: Capacitor bundles frontend for Android platform

## Authentication Architecture

**Multi-Provider Support**:
- Email/password with bcrypt hashing
- Google OAuth with server-side token verification
- Apple Sign-in integration

**Token Management**:
- Access tokens (short-lived) + Refresh tokens (long-lived)
- Automatic token refresh with request queuing
- localStorage persistence with secure token handling
- 401 response handling with transparent token refresh

## Development Notes

- **Feature-Sliced Design**: Follow FSD patterns when adding frontend features
- **TypeScript**: Strict mode enabled across entire codebase
- **Mobile-First**: Ionic components with Android deployment focus
- **Testing**: E2E tests require both backend and frontend servers running
- **Database**: All schema changes require Prisma migrations
- **Real-time**: WebSocket events documented for collaborative features
- **Security**: JWT validation, input validation, rate limiting implemented

## Task Management

- Comments in codebase are in English for consistency
- Follow existing architectural patterns for new features
- Test both backend and frontend when making cross-stack changes

## RxJS Migration

The project is planning a migration to RxJS for reactive state management, offline-first architecture, and enhanced real-time collaboration features.