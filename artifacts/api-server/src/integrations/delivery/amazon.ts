import {
  placeholderResult,
  type DeliveryFetchResult,
  type DeliveryProvider,
} from "./types";

/**
 * Amazon integration stub.
 *
 * Production wiring will use the Amazon Selling Partner API for sellers
 * and Amazon's order/tracking endpoints for buyers (via official OAuth).
 * We never scrape Amazon and never ask users for an Amazon password.
 */
export const amazon: DeliveryProvider = {
  id: "amazon",
  displayName: "Amazon",
  async fetchStatus(_trackingNumber: string): Promise<DeliveryFetchResult> {
    return placeholderResult();
  },
  generateTrackingUrl(trackingNumber: string): string {
    return `https://www.amazon.co.uk/gp/your-account/order-details?orderID=${encodeURIComponent(trackingNumber.trim())}`;
  },
};
