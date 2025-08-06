# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wiselist is a mobile-first list management application built with Ionic Vue 3 and NestJS backend. The project allows users to create, share, and collaboratively edit lists with real-time synchronization and offline support.

### Tech Stack
- **Frontend**: Ionic Vue 3 + TypeScript + Tailwind CSS + Capacitor
- **Backend**: NestJS + TypeScript + Prisma ORM + PostgreSQL
- **Mobile**: iOS/Android support via Capacitor
- **Authentication**: Google OAuth integration

## Development Commands

### Frontend (frontend/)
```bash
# Development server
npm run dev

# Build for production
npm run build

# Build and run on iOS
npm run build:ios

# Type checking and build
vue-tsc && vite build

# Run tests
npm run test:unit    # Vitest unit tests
npm run test:e2e     # Cypress e2e tests

# Linting
npm run lint
```

### Backend (backend/)
```bash
# Development server with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod

# Database management
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema changes
npx prisma studio      # Open database GUI

# Testing
npm run test           # Jest unit tests
npm run test:e2e       # End-to-end tests
npm run test:cov       # Test coverage

# Code quality
npm run lint          # ESLint
npm run format        # Prettier
```

## Architecture

### Frontend Structure (FSD-inspired)
- `src/app/` - Application-level configuration (routing, theme, main app)
- `src/pages/` - Page-level components (Auth, Lists, Settings, etc.)
- `src/features/` - Business logic features (Auth flows, etc.)
- `src/entities/` - Domain entities (User, List models and stores)  
- `src/shared/` - Shared utilities, UI components, and instances
- Path aliases: `@app`, `@pages`, `@shared` are configured in vite.config.ts

### Backend Structure
- `src/auth/` - Authentication module (Google OAuth, JWT strategies)
- `src/user/` - User management 
- `src/profile/` - User profile management
- `src/prisma/` - Database service and module
- Database schema in `prisma/schema.prisma`

### Key Configuration
- Frontend runs on port 5173 (Vite default)
- Backend runs on port 3000 with CORS enabled
- Capacitor config for mobile builds in `capacitor.config.ts`
- Google OAuth client ID configured for mobile authentication

## Database

Uses PostgreSQL with Prisma ORM. Current schema includes:
- Users with Google OAuth support
- User profiles with notification preferences
- Provider enum: EMAIL, GOOGLE, APPLE

When making database changes:
1. Update `prisma/schema.prisma`
2. Run `npx prisma db push` to apply changes
3. Run `npx prisma generate` to update client

## Mobile Development

This is a Capacitor-based app supporting iOS and Android:
- iOS project in `frontend/ios/`
- Android project in `frontend/android/`
- Use `npm run build:ios` for iOS builds
- Google Auth configured with proper client IDs

## Testing Strategy

- Frontend: Vitest for unit tests, Cypress for e2e
- Backend: Jest for all testing (unit, integration, e2e)
- Always run tests before committing changes