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
The mobile app uses a light-only palette derived directly from the YourRadar logo (charcoal "You" + teal "Radar"):
- **Background:** `#FFFFFF` (primary background and cards)
- **Charcoal (foreground / text):** `#544f4d` (primary text, shadows, "You" wordmark)
- **Teal (primary brand):** `#0097b2` (primary accent, CTAs, radar rings, "Radar" wordmark, active tab)
- **Teal Deep:** `#007A91` (hover/active darker teal — token `brandTealDeep`)
- **Soft Teal:** `#56C5D6` (inner radar ring, signal-dot glow)
- **Charcoal Muted:** `#6B6B6B` (secondary text)
- **Surface Elevated:** `#F7F9FC` (inputs, subtle fills)
- **Border:** `#E5E7EB` (card and input borders)
- **Notification Red:** `#FF3B30` (unread/urgent badges)

Token aliases in `constants/colors.ts` keep historical names but point to the new values: `radarBlue→teal`, `brandNavy/foreground/text→charcoal`, `softCyan/violetAccent→soft teal`, `coolGrey→charcoal muted`. Provider-specific brand colors (Gmail red, etc.) are unchanged.

The `<BrandLogo />` renders the full-color wordmark PNG untinted by default so the brand teal+charcoal show through; an optional `tintColor` prop is available for monochrome contexts.

### Loading Experience
The application incorporates a cohesive loading experience using the radar motif:
- **`LoadingScreen.tsx`:** Full-screen startup with `RadarPulse` rings, rotating sweep, the full-color wordmark badge, an animated teal progress bar, and a "powered by you group" footer.
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

### Zero-Trust Field-Level Encryption
YourRadar encrypts sensitive data at rest using field-level encryption with AES-256-GCM and per-user keys. Admins cannot read user data directly from the database or logs.

**Important honest scope note:** this is **not full end-to-end encryption yet**. The backend decrypts data at runtime only for the authenticated owner. A user must trust the running server while their request is in flight. True client-side / end-to-end encryption is tracked as a roadmap item below.

- **Key derivation:** Two independent master keys (`ENCRYPTION_MASTER_KEY` for content, `TOKEN_ENCRYPTION_KEY` for OAuth tokens) are stored as 32-byte base64 secrets. Per-user, per-domain keys are derived via HKDF-SHA256 with a userId-bound salt and a domain-separated `info` string. Derived key buffers are explicitly zeroized after use.
- **Encrypted payload shape:** Sensitive columns are stored as `jsonb { v, ct, iv, tag }` blobs. Each record uses a fresh random 12-byte IV and a 16-byte GCM auth tag. Decryption is only possible by the owning user's session.
- **Encrypted fields:** OAuth access/refresh tokens, account identifiers (email/username), display labels, sender names and identifiers, message titles and snippets, and delivery tracking numbers. Provider name, kind, timestamps, status, and seen flags remain plaintext for indexing.
- **Authorization model:** Every read and write filters by `req.userId` enforced by middleware (`x-user-id` header today, real session/OAuth integration later). Cross-tenant access returns empty results or 404; ownership is re-verified on every mutation; `source_id` ownership is checked before notifications can attach to it.
- **Logging discipline:** Pino is configured with `redact` paths covering tokens, decrypted titles/snippets, account identifiers, and the `x-user-id` header. Route handlers log only opaque IDs, provider, kind, and boolean presence flags — never decrypted content. OAuth tokens are masked via `maskToken()` when referenced.
- **Hardening:** Express enforces a 128 KB JSON body limit (32 KB for url-encoded) to bound abuse; route validators reject oversized strings, unknown providers/kinds, and short/invalid user IDs (401).
- **Public privacy notice:** `GET /api/privacy` returns the user-facing encryption summary, also surfaced in the mobile **Privacy & Security** card on the Settings screen, including the honest "not full end-to-end yet" disclosure.

### Roadmap
- **Client-side encryption / true end-to-end encryption mode.** Move encryption and decryption into the user's device so the server only ever sees ciphertext. The backend would never hold the decryption key, even transiently, and notification content could not be read by the running server — only by the user's authenticated client. This is a significant architectural change (key management, search/sort over ciphertext, recovery flows) and is the natural successor to the current at-rest field-level encryption.
- Real session-based authentication (replacing the placeholder `x-user-id` header) integrated with provider OAuth flows.
- Server-side OAuth token refresh using the encrypted refresh tokens.

### Development Mock Mode
A development mock mode is included, allowing for instant simulation of fake notifications across all 16 providers. This mode helps in testing UI/UX for various notification types and account states without requiring actual API credentials or external calls. It mints synthetic demo accounts if no real ones are connected, ensuring immediate visibility in the dashboard.

## External Dependencies

- **Expo SDK:** Mobile application development framework.
- **React Native:** UI framework for mobile applications.
- **Express:** Web application framework for the API server.
- **Pino:** Logger for the API server.
- **Zod:** Schema declaration and validation library.
- **Drizzle ORM:** Object-Relational Mapper for database interactions. Schemas in `lib/db/src/schema/` define `users`, `connected_sources`, and `notifications` tables with sensitive columns stored as `jsonb` ciphertext; non-sensitive metadata is indexed for query performance.
- **Node `node:crypto`:** Native HKDF-SHA256 + AES-256-GCM primitives used by `artifacts/api-server/src/lib/crypto.ts`.
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