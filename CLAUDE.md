# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wiselist is an Ionic Vue 3 mobile application built with TypeScript and Capacitor for cross-platform deployment. The project uses a Feature-Sliced Design (FSD) architecture and targets Android platform primarily.

## Development Commands

- `npm run dev` - Start development server (Vite on port 5173)
- `npm run build` - Build for production (includes TypeScript compilation with vue-tsc)
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test:unit` - Run unit tests with Vitest
- `npm run test:e2e` - Run E2E tests with Cypress
 
## Capacitor Commands

- `npx cap sync` - Sync web assets to native platforms
- `npx cap run android` - Run on Android device/emulator
- `npx cap build android` - Build Android APK

## Architecture

The project follows Feature-Sliced Design (FSD) methodology with the following structure:

### Layer Structure
- `src/app/` - Application layer (router, main app configuration, layouts)
- `src/pages/` - Page-level components (route handlers)
- `src/features/` - Business features (Auth, List management, etc.)
- `src/entities/` - Business entities (User, List, ListItem)
- `src/shared/` - Shared utilities, services, and UI components

### Path Aliases
All configured in both `vite.config.ts` and `tsconfig.json`:
- `@/` - src root
- `@app/` - src/app
- `@pages/` - src/pages
- `@shared/` - src/shared
- `@widgets/` - src/widgets
- `@features/` - src/features
- `@entities/` - src/entities

### Key Architecture Patterns

**Token Management**: The app uses JWT tokens with automatic refresh. Token service (`@shared/services/token.service.ts`) manages access/refresh tokens with localStorage persistence.

**Route Protection**: Router has middleware system for auth/guest route protection via `meta.middleware` configuration.

**State Management**: Uses Pinia for global state management, with feature-specific stores in respective entity folders.

**Request Handling**: Axios instance configured with interceptors for token attachment and refresh logic (`@shared/instances/axios.ts`). Includes request queuing service for offline capability (`@shared/services/request-queue.service.ts`).

## Technology Stack

- **Framework**: Vue 3 + Ionic Vue + Capacitor
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS + Ionic CSS variables
- **State**: Pinia
- **Routing**: Vue Router + Ionic Router
- **Testing**: Vitest (unit) + Cypress (e2e)
- **Build**: Vite
- **Authentication**: Firebase + Google Social Login (@capgo/capacitor-social-login)
- **Icons**: Ionicons + Lucide Vue Next
- **Utilities**: VueUse + Auto-animate

## Development Notes

- Uses Feature-Sliced Design - follow existing patterns when adding new features
- All new components should be properly typed with TypeScript
- Authentication flows are handled through Firebase and token-based system
- Mobile-first design with Ionic components
- E2E tests run against localhost:5173 (dev server must be running)
- Android development requires Android Studio and proper SDK setup

## Task Management

- Track tasks and issues in CLAUDE_TASKS.md, after completion set status to "done" below task description
- Add commit text below (short)
- All comments in codebase are in English for consistency

## RxJS Migration

The project is currently planning a migration to RxJS for reactive state management, offline-first architecture, and real-time collaboration features. See Task 4 in CLAUDE_TASKS.md for detailed implementation plan with 12 subtasks across 4 phases.
