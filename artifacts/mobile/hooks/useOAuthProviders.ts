import { useEffect, useState, useCallback } from "react";
import { customFetch } from "@workspace/api-client-react";

import type { Provider } from "@/types";

export type OAuthProviderStatus =
  | "configured"
  | "setup_required"
  | "coming_soon";

export interface OAuthProviderInfo {
  id: Provider;
  label: string;
  category: "email" | "social" | "delivery";
  status: OAuthProviderStatus;
  setupNotes: string;
  requiredEnv: string[];
}

interface ProvidersResponse {
  providers: OAuthProviderInfo[];
}

export interface UseOAuthProvidersResult {
  providers: OAuthProviderInfo[];
  byId: Record<string, OAuthProviderInfo | undefined>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches the server-side OAuth provider catalog. The server is the single
 * source of truth for whether a provider is fully configured (real OAuth
 * runs), needs credentials (setup_required → 501), or is not yet wired
 * (coming_soon).
 */
export function useOAuthProviders(): UseOAuthProvidersResult {
  const [providers, setProviders] = useState<OAuthProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    customFetch<ProvidersResponse>("/api/oauth/providers", {
      responseType: "json",
    })
      .then((data: ProvidersResponse) => {
        if (cancelled) return;
        setProviders(Array.isArray(data?.providers) ? data.providers : []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "failed_to_load_providers");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const byId: Record<string, OAuthProviderInfo | undefined> = {};
  for (const p of providers) byId[p.id] = p;

  return { providers, byId, loading, error, refetch };
}
