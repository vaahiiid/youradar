# YourRadar

## Overview

**YourRadar** is a personal notification dashboard for busy people who want every important signal — email, social media, market alerts, and more — in one calm place. Brand promise: *every signal, on your radar.*

This monorepo contains:

- `artifacts/mobile` — the YourRadar Expo (iOS / Android / web) app
- `artifacts/api-server` — Express API + webhook receiver for Meta / Instagram
- `artifacts/mockup-sandbox` — design sandbox for variant exploration

## Stack

- pnpm workspace monorepo, TypeScript 5.9, Node.js 24
- Mobile: Expo SDK 54, expo-router, React Native, Reanimated, Inter font
- API: Express 5, Pino logging, Zod, Drizzle ORM
- API codegen: Orval (from OpenAPI spec)

## Brand system (light theme)

The mobile app is **light-only by design** — white cards on a white background, navy text, with bold blue/cyan radar accents.

| Token             | Hex       | Use                                                |
|-------------------|-----------|----------------------------------------------------|
| Background        | `#FFFFFF` | Primary background and cards                       |
| Foreground (Navy) | `#0B1020` | Primary text and `<BrandLogo />` tint              |
| Electric Blue     | `#2F80ED` | Primary accent / CTAs / radar rings / active state |
| Soft Cyan         | `#56CCF2` | Inner radar ring + signal-dot glow                 |
| Violet Accent     | `#8B5CF6` | "Coming soon · API setup required" badges          |
| Cool Grey         | `#667085` | Secondary text on light backgrounds                |
| Surface Elevated  | `#F7F9FC` | Inputs and subtle surface fills                    |
| Border            | `#E5E7EB` | Card and input borders                             |
| Notification Red  | `#FF3B30` | Unread / urgent badges only                        |

Tokens live in `artifacts/mobile/constants/colors.ts` (exposed as `radarBlue`, `softCyan`, `violetAccent`, `coolGrey`, `surfaceElevated`, `brandNavy`, `notificationRed`, plus per-provider brand colors `gmail` / `outlook` / `instagram` / `linkedin` / `facebook` / `telegram` / `whatsapp` / `tiktok`).

`primaryForeground` is `#FFFFFF` — text on `radarBlue` buttons is white.

### Logo

- Wordmark: `artifacts/mobile/assets/images/youradar-wordmark.png`
- App icon: `artifacts/mobile/assets/images/icon.png`
- Logo mark: `artifacts/mobile/assets/images/logo-mark.png`

`<BrandLogo />` defaults to `tintColor={colors.light.brandNavy}` (navy on white). Pass an explicit `tintColor` to recolor for any other surface.

## Loading experience

All loading / scanning UI uses the bold blue/cyan radar palette on a white background:

- **`LoadingScreen.tsx`** — full-screen startup with `RadarPulse` rings, rotating sweep, navy wordmark on a white badge with a soft blue shadow, and an animated 0–100% progress bar (electric-blue fill + soft-cyan glow). Honors `AccessibilityInfo.isReduceMotionEnabled()` and the Settings → Reduced motion toggle.
- **`RadarPulse.tsx`** — concentric pulsing rings + rotating sweep + signal dots + cross-hair grid. Opacity tuned to read clearly on white (`rgba(47,128,237,0.45–0.55)` for the static rings).
- **`RadarLoader.tsx`** — full radar + centred wordmark badge + custom message. `sm` / `md` / `lg` size presets. Used as the empty state on Sources.
- **`RadarSpinner.tsx`** — small inline radar sweep (default 18 px) for inline / button loaders. Used in the bottom-sheet **Connect** button and inside the "Live scan" pills on Alerts and Sources.
- **`ScanSkeleton.tsx`** — animated scan-line skeleton card. Three skeletons render briefly on Alerts during the initial mount.
- **`EmptyState.tsx`** — defaults to the `radar` variant (mini RadarPulse + wordmark badge); pass `variant="icon"` for a Feather-icon style state.

All five components honor the in-app Reduced motion setting via `useInbox().settings.reducedMotion`.

## PWA / installable web app

Configured via `artifacts/mobile/app.json` under `expo.web`:

- `name` and `shortName` → "YourRadar"
- `themeColor` and `backgroundColor` → `#FFFFFF`
- `display` → `standalone`
- Favicon and install icon → `assets/images/icon.png`

## Push notifications

Push permission is requested per-platform by Expo. The current MVP uses the in-app toast system (`components/Toast.tsx`) and a per-account unread badge for the unified feed. To wire real push:

1. Provision Expo push credentials (`expo credentials:manager`) or supply your own VAPID keys for web push.
2. Add an Expo Push token registration call on app start (`expo-notifications`).
3. POST tokens to a new `/api/push/register` route on the API server and store them per user / account.
4. From the Instagram webhook handler in `artifacts/api-server/src/routes/instagram.ts`, fan out to each device using the Expo Push API or web-push.

The `Settings → Push notifications` toggle (global) and the per-source `notificationsEnabled` toggle on the Sources tab are the right gates for any send.

## Connected sources (8 providers)

The unified feed surfaces **eight** providers — three with full mock OAuth + sample data today, and five additional providers visible as part of the roadmap with a "Coming soon · API setup required" badge.

| Provider   | Status                  | Identifier                   | Underlying API                          |
|------------|-------------------------|------------------------------|-----------------------------------------|
| Gmail      | Implemented (mock OAuth)| Email address                | Google OAuth + Gmail API (read-only)    |
| Outlook    | Implemented (mock OAuth)| Email address                | Microsoft OAuth + Microsoft Graph (Mail.Read) |
| Instagram  | Implemented (mock + real webhook handler in API) | Handle (`@you`) + account type | Meta OAuth + Instagram Graph / Messaging |
| LinkedIn   | Roadmap                 | Email or vanity URL          | LinkedIn API (partner permissions)      |
| Facebook   | Roadmap                 | Page name                    | Meta Graph API + Webhooks (Page admin)  |
| Telegram   | Roadmap                 | Bot token or `@channel`      | Telegram Bot API (webhooks)             |
| WhatsApp   | Roadmap                 | Business phone number        | WhatsApp Business Cloud API             |
| TikTok     | Roadmap                 | Handle (`@you`)              | TikTok for Developers APIs              |

`isProviderImplemented(provider)` from `types/index.ts` is the source of truth for which providers are fully supported today. The `ConnectAccountSheet` shows a violet "Coming soon · API setup required" badge for non-implemented providers but still lets users add them so the source list reflects intent.

State lives in `InboxContext` and persists to AsyncStorage under the key `yourradar_state_v3` (bumped from `v2` when `notificationsEnabled` was added per account and the eight-provider type widened). The reducer migrates older payloads on load by backfilling `notificationsEnabled = true`.

### Privacy posture (visible to users on the Sources tab)

> Official APIs only · no scraping, no passwords. YourRadar never asks for your password. We only connect through official provider APIs and OAuth — Google, Microsoft, Meta, LinkedIn, Telegram Bot API, WhatsApp Business API, and TikTok Developer APIs. Tokens stay on the server, refresh automatically, and never reach this device. Personal app notifications that are not exposed by official APIs (for example consumer Facebook or personal WhatsApp messages) cannot be mirrored — by design.

## Instagram integration (official Meta APIs only)

Instagram support is built strictly on official Meta APIs. **No scraping, password capture, browser automation, or unofficial endpoints are used.**

### Supported event types

- `dm` — Direct messages (Instagram Messaging API)
- `comment` — Comments on your media (Webhooks: `comments` field)
- `mention` — Mentions in posts/stories (Webhooks: `mentions` field)
- `insight` — Account / media insights (Insights API)
- `system` — Account or login alerts

Each notification carries the event kind, sender, snippet, optional media caption / thumbnail, and a deep link back into Instagram via `Open in Instagram`.

### Required environment variables (API server)

| Variable                       | Description                                                 |
|--------------------------------|-------------------------------------------------------------|
| `META_APP_ID`                  | Meta app ID from developers.facebook.com                    |
| `META_APP_SECRET`              | Meta app secret (server-side only, never expose to client)  |
| `META_VERIFY_TOKEN`            | Random string you choose; matched during webhook verify     |
| `INSTAGRAM_REDIRECT_URI`       | OAuth callback, e.g. `https://your.host/api/instagram/oauth/callback` |
| `INSTAGRAM_WEBHOOK_SECRET`     | Optional shared secret for additional signature checks      |
| `INSTAGRAM_GRAPH_API_VERSION`  | Defaults to `v20.0`                                         |

### Meta developer app setup

1. Create an app at <https://developers.facebook.com/apps>.
2. Add products: **Instagram Graph API**, **Instagram Messaging**, **Webhooks**.
3. Under "App Roles" add testers; for production submit each permission for App Review.
4. Configure OAuth redirect URI to match `INSTAGRAM_REDIRECT_URI`.
5. Required permissions: `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`.

### Webhook setup

The API server exposes:

- `GET  /api/instagram/webhook` — Meta verification challenge
- `POST /api/instagram/webhook` — Event receiver, validates `X-Hub-Signature-256` HMAC
- `GET  /api/instagram/oauth/start` — Returns a Meta authorize URL
- `GET  /api/instagram/oauth/callback` — Exchanges the OAuth `code` for an access token
- `GET  /api/instagram/healthz` — Reports configuration status

### Known Instagram limitations

- Only **professional** Instagram accounts (Creator / Business) can be connected via the Graph API.
- DM access requires Instagram Messaging API permissions and Meta app review.
- Personal-app push notifications cannot be imported by third parties.

## Development mock mode

The Radar tab includes simulate chips that fire fake notifications instantly for **all eight providers**:

- Gmail / Outlook — sample email
- IG · DM, IG · Comment, IG · Mention, IG · Insight — sample Instagram event of that kind
- LinkedIn / Facebook / Telegram / WhatsApp / TikTok — sample social/messaging event for each

If no real account is connected for a provider, `simulateIncoming` mints a synthetic demo account so every chip works out of the box. Mock events flow through the same path used by the real webhook handlers (unread badging, toasts, detail view). They never hit any external API and don't require credentials.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/mobile run dev` — run the Expo app

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
