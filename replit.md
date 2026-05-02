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

## Brand system

| Token             | Hex       | Use                                                |
|-------------------|-----------|----------------------------------------------------|
| Deep Navy         | `#0B1020` | Primary background                                 |
| Electric Blue     | `#2F80ED` | Primary accent / CTAs / radar rings / active state |
| Soft Cyan         | `#56CCF2` | Sweep + signal-dot glow / "live scan" indicators   |
| Violet Accent     | `#8B5CF6` | Secondary highlight (reserved)                     |
| Cool Grey         | `#A7B0C0` | Secondary text                                     |
| Off White         | `#F7F9FC` | Foreground / on-dark text                          |
| Notification Red  | `#FF3B30` | Unread / urgent badges only                        |

Tokens live in `artifacts/mobile/constants/colors.ts` (exposed as `radarBlue`, `softCyan`, `violetAccent`, `coolGrey`, `offWhite`, `brandNavy`, `notificationRed`). The mobile app is dark-only by design. The previous bright-green palette (`#39FF88`) has been fully removed.

### Logo

- Wordmark: `artifacts/mobile/assets/images/youradar-wordmark.png`
- App icon: `artifacts/mobile/assets/images/icon.png`
- Logo mark: `artifacts/mobile/assets/images/logo-mark.png`

To replace the logo:

1. Drop the new wordmark PNG (transparent background recommended) into `artifacts/mobile/assets/images/youradar-wordmark.png`.
2. For the rounded app icon, replace `icon.png` (1024×1024 recommended).
3. The wordmark renders through `<BrandLogo />`; pass `tintColor` to recolor it for any background.

The wordmark is composed onto a frosted badge inside the radar pulse on the loading screen — no extra editing needed.

## Loading experience

All loading / scanning UI in the app is radar-themed and uses the blue/cyan palette:

- **`LoadingScreen.tsx`** — full-screen startup with `RadarPulse` rings, rotating sweep, glowing wordmark badge, and an animated 0–100% progress bar (electric-blue fill + soft-cyan glow). Honors `AccessibilityInfo.isReduceMotionEnabled()` and the Settings → Reduced motion toggle.
- **`RadarPulse.tsx`** — concentric pulsing rings + rotating sweep + signal dots. Used in hero, empty states, and the full RadarLoader.
- **`RadarLoader.tsx`** — full radar + centred wordmark badge + custom message ("Scanning your signals…"). Has `sm` / `md` / `lg` size presets. Used as the empty state on Sources before the first account is connected.
- **`RadarSpinner.tsx`** — small inline radar sweep (default 18 px) for inline / button loaders. Used in the bottom-sheet **Connect** button (replaces "Connect" with a spinner + "Connecting…" while the simulated OAuth runs) and inside the "Live scan" pills on Alerts and Sources.
- **`ScanSkeleton.tsx`** — animated scan-line skeleton card. Three skeletons render briefly on the Alerts tab during the initial mount before the notification list appears.
- **`EmptyState.tsx`** — defaults to the `radar` variant (mini RadarPulse + wordmark badge); pass `variant="icon"` for a Feather-icon style state.

All five components honor the in-app Reduced motion setting via `useInbox().settings.reducedMotion`.

## PWA / installable web app

Configured via `artifacts/mobile/app.json` under `expo.web`:

- `name` and `shortName` → "YourRadar"
- `themeColor` and `backgroundColor` → `#0B1020`
- `display` → `standalone`
- Favicon and install icon → `assets/images/icon.png`

To customize, edit `expo.web` in `app.json`. Expo regenerates the manifest on build.

## Push notifications

Push permission is requested per-platform by Expo. The current MVP uses the in-app toast system (`components/Toast.tsx`) and a per-account unread badge for the unified feed. To wire real push:

1. Provision Expo push credentials (`expo credentials:manager`) or supply your own VAPID keys for web push.
2. Add an Expo Push token registration call on app start (`expo-notifications`).
3. POST tokens to a new `/api/push/register` route on the API server and store them per user / account.
4. From the Instagram webhook handler in `artifacts/api-server/src/routes/instagram.ts`, fan out to each device using the Expo Push API or web-push.

The `Settings → Push notifications` toggle already exists (`SettingsState.pushEnabled`) and is the right gate for any send.

## Connected sources

The unified feed currently supports:

- **Gmail** — connect by email (placeholder UI for OAuth flow)
- **Outlook** — connect by email (placeholder UI for OAuth flow)
- **Instagram** — connect by handle, with account type (Creator / Business / Professional)

State lives in `InboxContext` and persists to AsyncStorage under the key `yourradar_state_v2`.

## Instagram integration (official Meta APIs only)

YourRadar's Instagram support is built strictly on official Meta APIs. **No scraping, password capture, browser automation, or unofficial endpoints are used.** Personal-app push notifications cannot be imported by third parties — only events surfaced by official APIs are shown.

### Supported event types

- `dm` — Direct messages (Instagram Messaging API)
- `comment` — Comments on your media (Webhooks: `comments` field)
- `mention` — Mentions in posts/stories (Webhooks: `mentions` field)
- `insight` — Account / media insights (Insights API)
- `system` — Account or login alerts

Each notification carries the event kind, sender, snippet, optional media caption / thumbnail, and a deep link back into Instagram via `Open in Instagram`.

### Required environment variables

Add these to `.env` / Replit Secrets on the API server:

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
5. Required permissions (use the minimum set you actually need):
   - `instagram_basic`
   - `instagram_manage_messages`
   - `instagram_manage_comments`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`

### Webhook setup

The API server exposes:

- `GET  /api/instagram/webhook` — Meta verification challenge (echoes `hub.challenge` when `hub.verify_token` matches `META_VERIFY_TOKEN`)
- `POST /api/instagram/webhook` — Event receiver, validates `X-Hub-Signature-256` HMAC against `META_APP_SECRET`
- `GET  /api/instagram/oauth/start` — Returns a Meta authorize URL with the requested scopes
- `GET  /api/instagram/oauth/callback` — Exchanges the OAuth `code` for an access token (server-side only)
- `GET  /api/instagram/healthz` — Reports configuration status (no secrets returned)

In the Meta dashboard, set the Webhook callback URL to `https://your.host/api/instagram/webhook` and the verify token to the value of `META_VERIFY_TOKEN`. Subscribe to the `messages`, `comments`, and `mentions` fields on the Instagram object.

### Known Instagram limitations

- Only **professional** Instagram accounts (Creator / Business) can be connected via the Graph API; personal accounts are not supported by Meta.
- DM access requires Instagram Messaging API permissions and Meta app review.
- Generic mobile push notifications from the Instagram app cannot be imported by third parties — YourRadar only surfaces what the official APIs expose.
- During development, mock events (see below) work without any Meta credentials.

## Development mock mode

The Radar tab includes simulate buttons that fire fake notifications instantly:

- Gmail / Outlook — sample email
- IG DM, IG Comment, IG Mention, IG Insight — sample Instagram event of that kind

Mock events flow through the same `simulateIncoming` path used by the webhook handlers, so they exercise the unread badging, toasts, and detail view. They never hit Meta and don't require any API credentials.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/mobile run dev` — run the Expo app

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
