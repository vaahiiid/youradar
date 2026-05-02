import {
  placeholderResult,
  type DeliveryFetchResult,
  type DeliveryProvider,
} from "./types";

/**
 * DPD integration stub.
 *
 * Production wiring will use the DPD Local API and webhooks for real-time
 * status updates including precise delivery windows. We never scrape DPD
 * and never ask users for a DPD password.
 */
export const dpd: DeliveryProvider = {
  id: "dpd",
  displayName: "DPD",
  async fetchStatus(_trackingNumber: string): Promise<DeliveryFetchResult> {
    return placeholderResult();
  },
  generateTrackingUrl(trackingNumber: string): string {
    return `https://track.dpd.co.uk/search?reference=${encodeURIComponent(trackingNumber.trim())}`;
  },
};
