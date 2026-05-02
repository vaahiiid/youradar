import {
  placeholderResult,
  type DeliveryFetchResult,
  type DeliveryProvider,
} from "./types";

/**
 * Evri (formerly Hermes) integration stub.
 *
 * Production wiring will use the Evri Tracking API. Webhook deliveries from
 * Evri update parcel status; the API is also polled as a fallback. We never
 * scrape the Evri website and never ask users for an Evri password.
 */
export const evri: DeliveryProvider = {
  id: "evri",
  displayName: "Evri",
  async fetchStatus(_trackingNumber: string): Promise<DeliveryFetchResult> {
    return placeholderResult();
  },
  generateTrackingUrl(trackingNumber: string): string {
    return `https://www.evri.com/track/parcel/${encodeURIComponent(trackingNumber.trim())}`;
  },
};
