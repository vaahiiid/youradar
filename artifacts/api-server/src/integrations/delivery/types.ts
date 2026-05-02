/**
 * Shared types for the delivery courier integrations.
 *
 * Each courier module (evri/dpd/royalmail/amazon) implements this interface
 * so the rest of the API server can talk to any courier through a single
 * uniform contract. Today these modules return placeholder data — they're
 * designed as the integration seams that real API/webhook code can be
 * dropped into without touching callers.
 */

export type DeliveryStatus =
  | "added"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delayed"
  | "exception"
  | "unknown";

export interface DeliveryStatusEvent {
  status: DeliveryStatus;
  message: string;
  occurredAt: number;
  location?: string;
}

export interface DeliveryFetchResult {
  status: DeliveryStatus;
  message: string;
  lastCheckedAt: number;
  expectedAt?: number;
  history?: DeliveryStatusEvent[];
  publicTrackingUrl?: string;
}

export interface DeliveryProvider {
  /** Stable provider id used by the mobile app and API. */
  readonly id: "evri" | "dpd" | "royalmail" | "amazon";
  /** Human-readable provider name. */
  readonly displayName: string;
  /**
   * Fetch the current status of a tracked parcel.
   * Real integrations will hit official courier APIs; the placeholder
   * implementation returns a deterministic "unknown" so callers wire up
   * cleanly without leaking fake data.
   */
  fetchStatus(trackingNumber: string): Promise<DeliveryFetchResult>;
  /**
   * Build a public, no-login URL for tracking the parcel on the courier's
   * own website. Useful as a fallback link in notifications.
   */
  generateTrackingUrl(trackingNumber: string): string;
}

export function placeholderResult(): DeliveryFetchResult {
  return {
    status: "unknown",
    message:
      "Delivery API not yet wired up. Connect the official courier API and webhook to enable live status updates.",
    lastCheckedAt: Date.now(),
  };
}
