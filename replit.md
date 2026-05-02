# My Radar (YourRadar)

## Overview
My Radar (YourRadar) is a personal notification dashboard designed to centralize important signals like emails, social media interactions, and parcel deliveries into a single, calm interface. The project's vision is to provide a unified overview of all critical personal updates, reducing information overload and ensuring users are always aware of what matters most. It aims to be the go-to solution for busy individuals seeking an organized and consolidated view of their digital life.

## User Preferences
I want the agent to prioritize information on core architectural decisions and design patterns. I prefer high-level feature descriptions over granular implementation details. I want the agent to remove all changelogs, update logs, and date-wise entries. When discussing external dependencies, focus only on those actually integrated into the project.

## System Architecture

### Monorepo Structure and Technologies
The project is structured as a pnpm workspace monorepo using TypeScript 5.9 and Node.js 24.
- **Mobile App (`artifacts/mobile`):** Built with Expo SDK 54, expo-router, React Native, Reanimated, and Inter font for iOS, Android, and web.
- **API Server (`artifacts/api-server`):** Implemented with Express 5, Pino logging, Zod for schema validation, and Drizzle ORM. API code generation uses Orval from an OpenAPI specification.
- **Design Sandbox (`artifacts/mockup-sandbox`):** Used for variant exploration and design mockups.

### Brand System (Light Theme)
The mobile app features a light-only design with a consistent color palette:
- **Background:** `#FFFFFF` (primary background and cards)
- **Foreground (Navy):** `#0B1020` (primary text, brand logo tint)
- **Electric Blue:** `#2F80ED` (primary accent, CTAs, radar rings)
- **Soft Cyan:** `#56CCF2` (inner radar ring, signal-dot glow)
- **Violet Accent:** `#8B5CF6` ("Coming soon" badges)
- **Cool Grey:** `#667085` (secondary text)
- **Surface Elevated:** `#F7F9FC` (inputs, subtle fills)
- **Border:** `#E5E7EB` (card and input borders)
- **Notification Red:** `#FF3B30` (unread/urgent badges)

Provider-specific brand colors are also defined. The `<BrandLogo />` defaults to navy on white and can be recolored.

### Loading Experience
The application incorporates a cohesive loading experience using the radar motif:
- **`LoadingScreen.tsx`:** Full-screen startup with `RadarPulse` rings, rotating sweep, navy wordmark, and an animated progress bar.
- **`RadarPulse.tsx`:** Concentric pulsing rings, rotating sweep, signal dots, and a cross-hair grid for visual feedback.
- **`RadarLoader.tsx`:** Full radar with a centered wordmark badge and custom messages, used for empty states.
- **`RadarSpinner.tsx`:** Small inline radar sweep for loaders within components.
- **`ScanSkeleton.tsx`:** Animated scan-line skeleton card for initial content loading.
- **`EmptyState.tsx`:** Customizable empty states, defaulting to a mini radar variant.
All loading components respect the user's "Reduced motion" setting.

### Progressive Web App (PWA)
The web version is configured as a standalone PWA with "YourRadar" as its name and `#FFFFFF` for theme and background colors.

### Push Notifications
The system supports push notifications, with permission requested per-platform via Expo. The current implementation uses in-app toasts and per-account unread badges. Future plans involve storing Expo Push tokens and fanning out notifications from the API server.

### Connected Sources and Providers
The app supports 16 providers across Email (Gmail, Outlook, Yahoo, AOL, Hotmail), Social (Instagram, LinkedIn, Facebook, Telegram, WhatsApp, TikTok, X), and Deliveries (Evri, DPD, Royal Mail, Amazon). Each provider's status (implemented or roadmap) is indicated. A "connected-only visibility rule" ensures that only providers with active connections or historical notifications appear on the dashboard and in filter chips.

#### Multi-Account / ConnectedSource Model
Each connection is a distinct **ConnectedSource** (`ConnectedAccount` in code) — users can connect unlimited accounts per provider (e.g. five Gmail inboxes, two Instagram handles). Every notification is permanently bound to its source via `accountId`, so muting, disconnecting, or filtering a single source affects only its own notifications.

- **Optional friendly label**: When connecting, users can give the source a nickname like "Personal" or "Work". Sources can also be renamed inline from the Sources page.
- **Duplicate detection**: `connectAccount` returns `{ status: "created" | "duplicate" | "invalid" }`. The Sources page surfaces an inline toast when an address is already connected.
- **Per-source UI surfacing**: When a provider has more than one connected account, notification cards (in the Alerts feed and Dashboard recent list) automatically show the source label, and the Alerts filter exposes a second-tier sub-chip row to filter to a specific source.
- **Per-source unread counts**: `unseenByAccount` tracks unread per source; `unseenByProvider` aggregates across all of a provider's sources.

### Delivery Tracking
Delivery accounts store `deliveryDetails` including `trackingNumber`, `label`, `merchant`, `expectedAt`, `status`, and `publicTrackingUrl`. Notifications for deliveries feature a status pill, and detail screens show comprehensive delivery information.

### Privacy Posture
The system emphasizes privacy by exclusively using official APIs (Google, Microsoft, Meta, etc.) for integrations. It never requests user passwords, and tokens are securely managed on the server. The design explicitly avoids scraping or mirroring personal app notifications not exposed by official APIs.

### Development Mock Mode
A development mock mode is included, allowing for instant simulation of fake notifications across all 16 providers. This mode helps in testing UI/UX for various notification types and account states without requiring actual API credentials or external calls. It mints synthetic demo accounts if no real ones are connected, ensuring immediate visibility in the dashboard.

## External Dependencies

- **Expo SDK:** Mobile application development framework.
- **React Native:** UI framework for mobile applications.
- **Express:** Web application framework for the API server.
- **Pino:** Logger for the API server.
- **Zod:** Schema declaration and validation library.
- **Drizzle ORM:** Object-Relational Mapper for database interactions.
- **Orval:** API client code generator from OpenAPI specifications.
- **Google OAuth / Gmail API:** For Gmail integration.
- **Microsoft OAuth / Microsoft Graph:** For Outlook and Hotmail integration.
- **Meta OAuth / Instagram Graph / Messaging API:** For Instagram integration, requiring `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `INSTAGRAM_REDIRECT_URI`, and `INSTAGRAM_WEBHOOK_SECRET` environment variables.
- **Google Analytics (`gtag`):** For privacy-safe, opt-in analytics on web only, enabled via `VITE_GA_MEASUREMENT_ID`.
- **Expo Notifications:** For handling push notifications.
- **AsyncStorage:** For client-side state persistence.
- **Courier APIs:**
    - **Evri Tracking API:** For Evri parcel tracking.
    - **DPD Local API:** For DPD parcel tracking.
    - **Royal Mail Tracking API:** For Royal Mail parcel tracking.
    - **Amazon Selling Partner API / official OAuth:** For Amazon order tracking.