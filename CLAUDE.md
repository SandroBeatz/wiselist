# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wiselist is a mobile-first list management application built with Ionic Vue 3. The project is designed to allow users to create, share, and collaboratively edit lists with real-time synchronization and offline support. The frontend is currently implemented and connects to an external API.

### Tech Stack
- **Frontend**: Ionic Vue 3 + TypeScript + Tailwind CSS + Capacitor
- **Mobile**: iOS/Android support via Capacitor
- **Authentication**: Google OAuth integration (configured)
- **Styling**: Custom Tailwind CSS theme with Ionic components
- **Testing**: Vitest for unit tests, Cypress for e2e tests

## Development Commands

### Frontend (current project root)
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

# Linting and Formatting (Biome.js)
npm run lint           # Check code for issues
npm run lint:fix       # Auto-fix issues where possible  
npm run format         # Format code
npm run check          # Combined linting + formatting check
```

## Architecture

### Frontend Structure (FSD-inspired)
- `src/app/` - Application-level configuration (routing, theme, main app)
- `src/pages/` - Page-level components (Auth, Lists, Settings, etc.)
- `src/features/` - Business logic features (Auth flows, List/ListItem operations)
- `src/entities/` - Domain entities (User, List, ListItem models and stores)  
- `src/shared/` - Shared utilities, UI components, services, and instances
- Path aliases: `@`, `@app`, `@pages`, `@shared` are configured in vite.config.ts

### Key Configuration
- Frontend runs on port 5173 (Vite default)
- API base URL configured via `VITE_API_URL` environment variable
- Capacitor config for mobile builds in `capacitor.config.ts`
- Google OAuth client ID configured for mobile authentication
- Tailwind CSS with custom color scheme (primary, text variants)

### Authentication & API Integration
- Axios instance with automatic token refresh handling
- JWT access/refresh token management with service layer
- Request queue for handling failed requests during token refresh
- Google OAuth configured via Capacitor Social Login plugin

## Data Models

The frontend defines the following TypeScript interfaces:

### List Types
- `ListType`: 'SHOPPING' | 'TODO' | 'OTHER'
- `ListId`: string
- `List`: Contains id, title, type, owner info, items, and timestamps
- `ListForm`: Pick<List, 'title' | 'type'> for form handling

### User Types  
- `UserProfile`: User profile information with notification settings
- `ListOwner`: User information with profile data

### List Items
- `ListItem`: Individual items within lists with content, checked status, and timestamps

## API Integration

The app expects these API endpoints to be available:

### Lists (src/entities/list/api/)
- `GET /api/lists` - Get all user's lists
- `POST /api/lists` - Create a new list
- `GET /api/lists/:id` - Get specific list with items  
- `PATCH /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list

### List Items (src/entities/list-item/api/)
- API endpoints for list item operations (structure follows same pattern)

All API calls use the configured Axios instance with automatic authentication.

## Mobile Development

This is a Capacitor-based app supporting iOS and Android:
- iOS project in `ios/`
- Android project in `android/`  
- Use `npm run build:ios` for iOS builds
- Google Auth configured with proper client IDs in capacitor.config.ts
- Capacitor plugins: App, Haptics, Keyboard, StatusBar, Social Login

## Routing & Navigation

- Vue Router with Ionic Vue Router integration
- Tab-based navigation with MainLayout component
- Protected routes using authentication middleware
- Route structure:
  - `/tabs/lists` - Main lists view (authenticated)
  - `/tabs/settings` - Settings (authenticated)
  - `/auth`, `/login`, `/register` - Authentication pages (guest only)
  - Dynamic routes for list previews and item management

## Testing Strategy

- Frontend: Vitest for unit tests, Cypress for e2e
- Test files in `tests/unit/` and `tests/e2e/` 
- Always run tests before committing changes

## Code Quality Tools

- **Biome.js**: Fast, unified linter and formatter (replaces ESLint + Prettier)
- Configuration in `biome.json` with TypeScript and Vue support
- Automatic code formatting with consistent style rules
- Fast linting with TypeScript-aware rules

## Important Implementation Details

- Uses Feature-Sliced Design (FSD) architecture pattern
- Pinia stores for state management (user.store.ts, lists.store.ts)
- Automatic token refresh with request queuing
- Offline-first approach with caching strategies
- Custom Tailwind theme with Ionic component integration
- Modern tooling: Vite + Biome.js for fast development experience