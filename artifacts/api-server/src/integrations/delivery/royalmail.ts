import {
  placeholderResult,
  type DeliveryFetchResult,
  type DeliveryProvider,
} from "./types";

/**
 * Royal Mail integration stub.
 *
 * Production wiring will use the Royal Mail Tracking API. We never scrape
 * the Royal Mail website and never ask users for a Royal Mail password.
 */
export const royalmail: DeliveryProvider = {
  id: "royalmail",
  displayName: "Royal Mail",
  async fetchStatus(_trackingNumber: string): Promise<DeliveryFetchResult> {
    return placeholderResult();
  },
  generateTrackingUrl(trackingNumber: string): string {
    return `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(trackingNumber.trim())}`;
  },
};
