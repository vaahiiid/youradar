import { Platform } from "react-native";

/**
 * Privacy-safe analytics helper.
 *
 * Loads Google Analytics (gtag) on web only, and only when a measurement ID
 * is present in the environment. On native (iOS/Android) all calls are no-ops
 * so existing call sites remain safe. On web with no measurement ID the
 * helper is also a no-op — analytics is strictly opt-in via configuration.
 *
 * Privacy contract — what we DO track:
 *   - page_view (path only, no query strings with personal data)
 *   - sign_up_started / sign_up_completed
 *   - login_completed
 *   - provider_connect_started / provider_connect_completed
 *   - provider_disconnect
 *   - push_permission_requested / push_permission_granted
 *   - notification_opened (provider name only)
 *
 * Privacy contract — what we NEVER track:
 *   - Email subjects, snippets, or bodies
 *   - Sender names or addresses
 *   - Tracking numbers, package contents, or merchant data
 *   - Account email addresses, handles, or phone numbers
 *
 * Configure with VITE_GA_MEASUREMENT_ID (we also accept the Expo-style
 * EXPO_PUBLIC_GA_MEASUREMENT_ID alias).
 */

export type AnalyticsEvent =
  | "page_view"
  | "sign_up_started"
  | "sign_up_completed"
  | "login_completed"
  | "provider_connect_started"
  | "provider_connect_completed"
  | "provider_disconnect"
  | "push_permission_requested"
  | "push_permission_granted"
  | "notification_opened";

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

function readMeasurementId(): string | null {
  // Vite-style and Expo-style env var names are both honored so the same
  // measurement ID works across the project's web and Expo surfaces.
  const fromVite =
    typeof process !== "undefined" && process.env
      ? process.env.VITE_GA_MEASUREMENT_ID
      : undefined;
  const fromExpo =
    typeof process !== "undefined" && process.env
      ? process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID
      : undefined;
  const id = (fromVite ?? fromExpo ?? "").trim();
  return id.length > 0 ? id : null;
}

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (Platform.OS !== "web") return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const id = readMeasurementId();
  if (!id) return;

  initialized = true;
  const w = window as Window & { dataLayer?: unknown[]; gtag?: GtagFn };
  w.dataLayer = w.dataLayer || [];
  const gtag: GtagFn = (...args: unknown[]) => {
    w.dataLayer!.push(args);
  };
  w.gtag = gtag;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  gtag("config", id, {
    // We never want to send raw paths with notification IDs etc — page_view
    // is fired manually with sanitized paths via trackEvent("page_view").
    send_page_view: false,
  });
}

/**
 * Strip notification IDs and other potentially identifying segments from a
 * path so we never send personal data to GA.
 */
export function sanitizePath(path: string): string {
  return path
    .replace(/\/notification\/[^/?#]+/i, "/notification/:id")
    .replace(/\/account\/[^/?#]+/i, "/account/:id")
    .replace(/\?.*$/, "");
}

export function trackEvent(
  event: AnalyticsEvent,
  params?: Record<string, string | number | boolean>,
): void {
  if (Platform.OS !== "web") return;
  if (typeof window === "undefined") return;
  if (!initialized) return;
  const w = window as Window & { gtag?: GtagFn };
  if (typeof w.gtag !== "function") return;

  // Whitelist of safe param keys. Anything not on this list is dropped.
  const safe: Record<string, string | number | boolean> = {};
  if (params) {
    const allowed = new Set([
      "provider",
      "category",
      "path",
      "method",
      "result",
      "outcome",
    ]);
    for (const [k, v] of Object.entries(params)) {
      if (!allowed.has(k)) continue;
      if (typeof v === "string" && v.length > 64) continue;
      safe[k] = v;
    }
  }
  w.gtag("event", event, safe);
}

export function trackPageView(path: string): void {
  trackEvent("page_view", { path: sanitizePath(path) });
}

export function isAnalyticsEnabled(): boolean {
  return initialized;
}
