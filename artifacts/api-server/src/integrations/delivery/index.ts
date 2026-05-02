import { amazon } from "./amazon";
import { dpd } from "./dpd";
import { evri } from "./evri";
import { royalmail } from "./royalmail";
import type { DeliveryProvider } from "./types";

export const deliveryProviders = {
  evri,
  dpd,
  royalmail,
  amazon,
} as const;

export type DeliveryProviderId = keyof typeof deliveryProviders;

export function getDeliveryProvider(id: DeliveryProviderId): DeliveryProvider {
  return deliveryProviders[id];
}

export type {
  DeliveryFetchResult,
  DeliveryProvider,
  DeliveryStatus,
  DeliveryStatusEvent,
} from "./types";
