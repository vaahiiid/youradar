# YourRadar — Provider Credentials Setup Checklist

This is the complete, step-by-step list of credentials you need to flip every provider from **Setup required** to **Tap to connect**.

> **Naming convention.** Every variable name below is the **exact** name the server reads from `process.env`. Copy them literally into Replit Secrets — do not rename them.

---

## 0. Common — applies to ALL providers

You must set ONE redirect base URL that every provider's callback will hang off of:

```
OAUTH_REDIRECT_BASE_URL=https://<your-public-domain>
```

- **Development (current Replit dev URL):**
  ```
  OAUTH_REDIRECT_BASE_URL=https://db3e1819-ae2e-462a-8eab-eed74b754422-00-bstsvhgladz2.worf.replit.dev
  ```
- **Production (after you publish):** the `.replit.app` domain Replit gives you, or your custom domain — for example:
  ```
  OAUTH_REDIRECT_BASE_URL=https://yourradar.replit.app
  ```

If you don't set `OAUTH_REDIRECT_BASE_URL`, the server falls back to the first entry in `REPLIT_DOMAINS`, which works for the dev URL automatically. **For production you should set it explicitly** so your custom domain is used.

> **Important:** every provider below uses a callback URL of the form
> `<OAUTH_REDIRECT_BASE_URL>/api/oauth/<provider>/callback`.
> You must register **both** the dev URL and the production URL with each provider — most consoles let you list multiple redirect URIs.

---

## 1. GMAIL — Google Cloud Console

```
GOOGLE_OAUTH_CLIENT_ID=000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to create:** Google Cloud Console → APIs & Services → Credentials
URL: <https://console.cloud.google.com/apis/credentials>

**Redirect URIs to register (add BOTH):**
```
https://db3e1819-ae2e-462a-8eab-eed74b754422-00-bstsvhgladz2.worf.replit.dev/api/oauth/gmail/callback
https://<your-prod-domain>/api/oauth/gmail/callback
```

**Scopes (already requested by the server):**
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `openid`

**Steps:**
1. Create (or pick) a Google Cloud project at <https://console.cloud.google.com/>.
2. APIs & Services → **Library** → search **"Gmail API"** → click **Enable**.
3. APIs & Services → **OAuth consent screen** → User Type **External** → fill in App name, support email, developer email → save.
4. On the consent screen, **Scopes** step → add the four scopes above (use the search box).
5. **Test users** step → add every Gmail address you'll use for testing (the app stays in "Testing" mode until you submit it for verification).
6. APIs & Services → **Credentials** → **Create Credentials** → **OAuth client ID** → Application type **Web application**.
7. Under **Authorized redirect URIs** paste both URLs above. Save.
8. Copy the **Client ID** and **Client secret** into Replit Secrets as the two env vars above.

**Production extras:** when you're ready to invite real users beyond your test list, click **Publish app** on the consent screen. Google requires a verification process (privacy policy URL, app demo video) for sensitive scopes like `gmail.readonly` — budget 1–2 weeks.

---

## 2. OUTLOOK / HOTMAIL — Microsoft Azure (Entra ID)

```
MICROSOFT_OAUTH_CLIENT_ID=00000000-0000-0000-0000-000000000000
MICROSOFT_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to create:** Azure Portal → Microsoft Entra ID → App registrations
URL: <https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade>

**Redirect URIs to register (Web platform, add BOTH):**
```
https://db3e1819-ae2e-462a-8eab-eed74b754422-00-bstsvhgladz2.worf.replit.dev/api/oauth/outlook/callback
https://<your-prod-domain>/api/oauth/outlook/callback
```

**Scopes (already requested by the server):**
- `offline_access`
- `openid`
- `profile`
- `email`
- `https://graph.microsoft.com/Mail.Read`
- `https://graph.microsoft.com/User.Read`

**Steps:**
1. Sign in to <https://portal.azure.com/> (a free Microsoft account works).
2. Search **Microsoft Entra ID** → in the left nav click **App registrations** → **+ New registration**.
3. Name: `YourRadar`. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (this is what enables both work Outlook **and** personal Hotmail/Outlook.com).
4. **Redirect URI:** select platform **Web**, paste the dev URL. Click **Register**.
5. After it's created, go to **Authentication** in the left nav → under **Web → Redirect URIs** click **Add URI** and paste the production URL too. Save.
6. Left nav **Certificates & secrets** → **+ New client secret** → 24 months → **Add**. **Copy the `Value` (NOT the `Secret ID`) immediately** — Azure only shows it once. This is your `MICROSOFT_OAUTH_CLIENT_SECRET`.
7. Left nav **API permissions** → **+ Add a permission** → **Microsoft Graph** → **Delegated permissions** → tick `Mail.Read`, `User.Read`, `email`, `offline_access`, `openid`, `profile` → **Add**.
8. From the **Overview** page copy the **Application (client) ID** → that's `MICROSOFT_OAUTH_CLIENT_ID`.

**Same credentials work for Hotmail** because Microsoft uses the `/common/` tenant — you do not register a separate app.

**Production extras:** for personal accounts, no admin consent required. For organizational tenants, an admin must consent (`Grant admin consent` button) — but that's per-tenant, not per-deploy.

---

## 3. INSTAGRAM + FACEBOOK — Meta for Developers

```
META_APP_ID=000000000000000
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_VERIFY_TOKEN=any_long_random_string_you_pick
INSTAGRAM_REDIRECT_URI=https://<your-public-domain>/api/oauth/instagram/callback
INSTAGRAM_WEBHOOK_SECRET=any_long_random_string_you_pick
```

> One Meta app powers both Instagram and Facebook. You do not need two apps.

**Where to create:** Meta for Developers
URL: <https://developers.facebook.com/apps/>

**Redirect URIs to register (Valid OAuth Redirect URIs — add BOTH):**
```
https://db3e1819-ae2e-462a-8eab-eed74b754422-00-bstsvhgladz2.worf.replit.dev/api/oauth/instagram/callback
https://<your-prod-domain>/api/oauth/instagram/callback
```

**Scopes / permissions (already requested by the server):**
- `instagram_basic`
- `instagram_manage_messages`
- `instagram_manage_comments`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`
- `business_management`

**Steps:**
1. Go to <https://developers.facebook.com/apps/> → **Create app**.
2. Use case: **Other** → app type **Business**.
3. App name: `YourRadar`. Contact email: yours.
4. After creation, in the left sidebar add the **Instagram** product (click **Set up** on the Instagram card).
5. Instagram → **API setup with Instagram login** → **Set up** → click **Generate access token** later for testing.
6. **App settings → Basic** (left sidebar): copy the **App ID** → `META_APP_ID`. Click **Show** next to App secret → `META_APP_SECRET`. Add a **Privacy Policy URL** and **App icon** (1024x1024) — required even in dev.
7. In the same Basic settings, scroll to **App Domains** and add:
   ```
   db3e1819-ae2e-462a-8eab-eed74b754422-00-bstsvhgladz2.worf.replit.dev
   <your-prod-domain>
   ```
8. Add the **Facebook Login for Business** product (left sidebar) → **Settings** → paste both redirect URIs into **Valid OAuth Redirect URIs**. Save.
9. Pick any random ~32-char string and use it for both `META_VERIFY_TOKEN` and `INSTAGRAM_WEBHOOK_SECRET` (they are values you choose — Meta does not generate them).
10. Set `INSTAGRAM_REDIRECT_URI` to your production callback URL exactly: `https://<your-prod-domain>/api/oauth/instagram/callback`.

**Test users:** Apps in Development mode can only authenticate with **Instagram testers** you've added. Go to App Roles → Testers → invite the Instagram handles you'll test with, then accept the invite at `instagram.com/accounts/manage_access/`.

**Production extras:** All `instagram_manage_*` permissions are **Advanced** and require **App Review**. You'll need a screencast showing the feature, a published privacy policy, and a verified business. Budget 2–4 weeks.

---

## 4. LINKEDIN — LinkedIn Developers

```
LINKEDIN_OAUTH_CLIENT_ID=xxxxxxxxxxxxxx
LINKEDIN_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxx
```

**Where to create:** LinkedIn Developer portal
URL: <https://www.linkedin.com/developers/apps>

**Redirect URIs to register (add BOTH):**
```
https://db3e1819-ae2e-462a-8eab-eed74b754422-00-bstsvhgladz2.worf.replit.dev/api/oauth/linkedin/callback
https://<your-prod-domain>/api/oauth/linkedin/callback
```

**Scopes:**
- `openid`
- `profile`
- `email`
- `r_member_social` (read your posts/comments — requires Marketing API approval)
- `r_organization_social` (only if you'll connect Pages)

**Steps:**
1. Go to <https://www.linkedin.com/developers/apps> → **Create app**.
2. Provide an associated **LinkedIn Company Page** (you can create a free one if you don't have one).
3. Fill app name, logo (100×100 minimum), legal agreement.
4. Tab **Auth** → copy **Client ID** and **Client secret**.
5. Same tab → **OAuth 2.0 settings → Authorized redirect URLs** → add both URLs above. Save.
6. Tab **Products** → request **Sign In with LinkedIn using OpenID Connect** (instant approval — gives you `openid profile email`). For mention/engagement reading, request **Share on LinkedIn** + **Marketing Developer Platform** (manual review, ~5 business days).

**Production extras:** Marketing Developer Platform requires you to fill a use-case survey and link a verified Company Page. Sign In with OpenID Connect needs no review.

---

## 5. X (TWITTER) — X Developer Portal

```
X_OAUTH_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
X_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to create:** X Developer Portal
URL: <https://developer.x.com/en/portal/dashboard>

**Redirect URIs to register (Callback URI / Redirect URL — add BOTH):**
```
https://db3e1819-ae2e-462a-8eab-eed74b754422-00-bstsvhgladz2.worf.replit.dev/api/oauth/x/callback
https://<your-prod-domain>/api/oauth/x/callback
```

**Scopes (OAuth 2.0):**
- `tweet.read`
- `users.read`
- `offline.access`
- `like.read`
- `follows.read`
- `mute.read`
- `space.read`
- `dm.read` *(Pro tier only — see below)*

**Steps:**
1. Sign in at <https://developer.x.com/en/portal/dashboard> and create a project + app. Free tier works for read-only mention/engagement polling at low volume; **DM read requires the Pro tier ($5,000/month)** — be aware before you promise users DMs.
2. Inside your app → **User authentication settings** → **Set up**.
3. App permissions: **Read**.
4. Type of App: **Web App, Automated App or Bot** (this is what enables OAuth 2.0 with PKCE — required by our flow).
5. **Callback URI / Redirect URL:** paste both URLs above.
6. **Website URL:** your production domain.
7. Save → X will show you the **OAuth 2.0 Client ID** and **Client Secret** **once** — copy them now into Replit Secrets.

**Production extras:** Free tier is rate-limited to ~1 request per 15 min for mentions. For real product use you need Basic ($100/mo) or Pro ($5k/mo).

---

## 6. TIKTOK — TikTok for Developers

```
TIKTOK_OAUTH_CLIENT_KEY=awxxxxxxxxxxxxxxxx
TIKTOK_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> Note: TikTok calls it `client_key`, not `client_id`. The env var name reflects that.

**Where to create:** TikTok for Developers
URL: <https://developers.tiktok.com/apps>

**Redirect URIs to register (add BOTH):**
```
https://db3e1819-ae2e-462a-8eab-eed74b754422-00-bstsvhgladz2.worf.replit.dev/api/oauth/tiktok/callback
https://<your-prod-domain>/api/oauth/tiktok/callback
```

**Scopes:**
- `user.info.basic`
- `user.info.profile`
- `user.info.stats`
- `video.list` *(if you'll show recent videos)*

**Steps:**
1. Sign up / log in at <https://developers.tiktok.com/>.
2. **Manage apps** → **Connect an app**.
3. Fill app info (name, icon, description, category, terms URL, privacy policy URL — all mandatory before you can save).
4. In the app, under **Login Kit** → **Configure** → add both redirect URIs.
5. Add **scopes** from the list above and submit each one for review (TikTok reviews per-scope).
6. Copy **Client Key** and **Client Secret** from the **Basic information** tab.

**Production extras:** All scopes require manual review. `user.info.basic` is usually approved in 24–48h. Anything else can take 1–2 weeks.

---

## 7. YAHOO MAIL — Yahoo Developer Network

```
YAHOO_OAUTH_CLIENT_ID=dj0yJmk9xxxxxxxxxxxxxxxxxxxxxx
YAHOO_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to create:** Yahoo Developer Network
URL: <https://developer.yahoo.com/apps/create/>

**Redirect URIs to register (Yahoo allows ONLY ONE, so use prod and a separate dev app):**
```
https://<your-prod-domain>/api/oauth/yahoo/callback
```
For dev, create a **second** Yahoo app with:
```
https://db3e1819-ae2e-462a-8eab-eed74b754422-00-bstsvhgladz2.worf.replit.dev/api/oauth/yahoo/callback
```
…and put the dev app's credentials in Replit Secrets while developing.

**Scopes / API permissions:**
- **Mail** → **Read**

**Steps:**
1. Go to <https://developer.yahoo.com/apps/create/>.
2. Application Name: `YourRadar`.
3. Application Type: **Confidential Client**.
4. Description, Homepage URL, Redirect URI (use the URL above — exact match, including trailing slash status).
5. API Permissions: tick **Mail → Read**.
6. **Create App**.
7. Copy the **Client ID (Consumer Key)** and **Client Secret (Consumer Secret)**.

**Production extras:** Mail-read access requires Yahoo to approve your app for the `mail-r` scope — submit via the dashboard's **Request access** button. Approval is manual and can take 1–3 weeks.

---

## 8. TELEGRAM — BotFather (no OAuth — bot token only)

```
TELEGRAM_BOT_TOKEN=000000000:AA-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_BOT_USERNAME=YourRadarBot
TELEGRAM_WEBHOOK_SECRET=any_long_random_string_you_pick
```

> Telegram does NOT use OAuth in the normal sense. Users connect by either (a) DMing your bot a `/start` deep-link, or (b) adding it to a channel/group. So instead of a redirect URI you register a **webhook URL**.

**Webhook URL the server will register:**
```
https://<your-prod-domain>/api/oauth/telegram/webhook
```

**Steps:**
1. Open Telegram → search **@BotFather** → start a chat → send `/newbot`.
2. Pick a display name → pick a username ending in `bot` (e.g. `YourRadarBot`).
3. BotFather replies with a **token** like `123456789:AA...` → that's `TELEGRAM_BOT_TOKEN`.
4. Send `/setdomain` to BotFather → pick your bot → send your production domain (`<your-prod-domain>`). This is required for Login-Widget-based connect flows.
5. Pick any random ~32-char string for `TELEGRAM_WEBHOOK_SECRET`. The server uses it to verify Telegram is the only thing posting to your webhook.
6. Once `TELEGRAM_BOT_TOKEN` is in Replit Secrets, the server will register the webhook automatically on boot.

**Production extras:** none — Telegram bots have no review process. You can hit the API immediately after creating the bot. Same token works in dev and prod, but you must `setWebhook` to whichever URL you're testing against (the server handles this).

---

## 9. WHATSAPP BUSINESS — Meta Cloud API

```
WHATSAPP_PHONE_NUMBER_ID=000000000000000
WHATSAPP_BUSINESS_ACCOUNT_ID=000000000000000
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_VERIFY_TOKEN=any_long_random_string_you_pick
WHATSAPP_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> WhatsApp Business uses the same Meta app you created for Instagram (you can reuse `META_APP_ID` / `META_APP_SECRET`). The app secret here is intentionally the same value.

**Where to create:** the Meta app from section 3 → add the **WhatsApp** product
URL: <https://developers.facebook.com/apps/>

**Webhook URL to register (NOT a redirect URI — WhatsApp uses webhooks):**
```
https://<your-prod-domain>/api/oauth/whatsapp/webhook
```

**Steps:**
1. Open your existing Meta app from section 3.
2. Add product: **WhatsApp** → **Set up**.
3. **Getting started** screen gives you a **test phone number** for free → copy its **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`.
4. Same screen → **WhatsApp Business Account ID** → `WHATSAPP_BUSINESS_ACCOUNT_ID`.
5. **Temporary access token** (24h) is shown for testing → use it as `WHATSAPP_ACCESS_TOKEN` for now. For production, follow the **System User** flow in Business Manager (<https://business.facebook.com/settings/system-users>) to mint a **never-expiring** token.
6. **Configuration** → **Webhook** → **Edit** → Callback URL = the webhook URL above. Verify token = any random string you pick (must match `WHATSAPP_VERIFY_TOKEN`).
7. Subscribe to fields: `messages`, `message_status`.
8. `WHATSAPP_APP_SECRET` is the same value as `META_APP_SECRET` from section 3 — copy it.

**Production extras:** the test phone number is free but limited to 5 destinations and Meta-prefixed templates. To use your own phone number you must (a) verify your business in Meta Business Manager, (b) add a real phone number that has never been used on WhatsApp before, (c) submit message templates for review (~24h each).

---

## 10. AOL MAIL

AOL was acquired by Yahoo, so AOL Mail authentication uses the **same Yahoo app** from section 7. No separate credentials. Just make sure the Yahoo app has Mail → Read enabled, and AOL inboxes will work through the same OAuth flow.

---

## Quick-glance table

| Provider | Required env vars | Where | Approval needed for prod? |
|---|---|---|---|
| Gmail | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud Console | Yes — sensitive scope verification (1–2 wk) |
| Outlook / Hotmail | `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET` | Azure Entra ID | No (personal accounts) |
| Instagram / Facebook | `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `INSTAGRAM_REDIRECT_URI`, `INSTAGRAM_WEBHOOK_SECRET` | Meta for Developers | Yes — App Review (2–4 wk) |
| LinkedIn | `LINKEDIN_OAUTH_CLIENT_ID`, `LINKEDIN_OAUTH_CLIENT_SECRET` | LinkedIn Developers | Partial — Marketing API needs review |
| X (Twitter) | `X_OAUTH_CLIENT_ID`, `X_OAUTH_CLIENT_SECRET` | X Developer Portal | Paid tier needed for real volume |
| TikTok | `TIKTOK_OAUTH_CLIENT_KEY`, `TIKTOK_OAUTH_CLIENT_SECRET` | TikTok for Developers | Yes — per-scope (1–2 wk) |
| Yahoo / AOL | `YAHOO_OAUTH_CLIENT_ID`, `YAHOO_OAUTH_CLIENT_SECRET` | Yahoo Developer Network | Yes — Mail-r approval (1–3 wk) |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` | @BotFather in Telegram | No |
| WhatsApp | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | Meta app from section 3 | Yes — business verification + template review |
| Common | `OAUTH_REDIRECT_BASE_URL` | Replit Secrets only | n/a |

---

## How to give them to me

When you have any of the values, just paste them into Replit's **Secrets** panel using the exact env-var names above. I'll detect them on the next server restart and the matching provider tile will flip from **Setup required** to **Tap to connect** automatically — no code changes needed.

If you only have a subset (say, just Gmail and Outlook), that's fine — those two will go live immediately, and the others will keep showing **Setup required** with the helpful note explaining what's missing.
