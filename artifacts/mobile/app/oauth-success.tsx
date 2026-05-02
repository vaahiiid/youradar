import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProviderIcon } from "@/components/ProviderIcon";
import { useColors } from "@/hooks/useColors";
import { PROVIDER_LABELS, type Provider } from "@/types";

const KNOWN_PROVIDERS = new Set<Provider>([
  "gmail",
  "outlook",
  "yahoo",
  "aol",
  "hotmail",
  "instagram",
  "linkedin",
  "facebook",
  "telegram",
  "whatsapp",
  "tiktok",
  "x",
  "evri",
  "dpd",
  "royalmail",
  "amazon",
]);

function asProvider(value: string | string[] | undefined): Provider | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;
  return KNOWN_PROVIDERS.has(raw as Provider) ? (raw as Provider) : null;
}

function asString(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

export default function OAuthSuccessScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const provider = asProvider(params.provider);
  const status = asString(params.status);
  const account = asString(params.account);
  const reason = asString(params.reason);

  const isOk = status === "ok" && provider !== null && account.length > 0;
  const providerName = provider ? PROVIDER_LABELS[provider] : "Provider";

  const headline = useMemo(() => {
    if (isOk) return `${account} is now connected to YourRadar.`;
    if (reason === "missing_code") return "The connection didn't complete.";
    if (reason === "callback_error")
      return "Something went wrong while finishing the connection.";
    if (reason === "invalid_state")
      return "The connection link expired. Please try again.";
    if (reason && reason.length > 0)
      return "We couldn't finish connecting your account.";
    return "We couldn't finish connecting your account.";
  }, [isOk, account, reason]);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.body}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: isOk
                ? "rgba(0, 151, 178, 0.08)"
                : "rgba(220, 38, 38, 0.08)",
              borderColor: isOk
                ? "rgba(0, 151, 178, 0.2)"
                : "rgba(220, 38, 38, 0.2)",
            },
          ]}
        >
          {provider ? (
            <ProviderIcon provider={provider} size={56} />
          ) : (
            <Feather
              name={isOk ? "check-circle" : "alert-triangle"}
              size={56}
              color={isOk ? colors.radarBlue : colors.destructive}
            />
          )}
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isOk
                ? "rgba(0, 151, 178, 0.08)"
                : "rgba(220, 38, 38, 0.08)",
              borderColor: isOk
                ? "rgba(0, 151, 178, 0.3)"
                : "rgba(220, 38, 38, 0.3)",
            },
          ]}
        >
          <Feather
            name={isOk ? "check-circle" : "alert-triangle"}
            size={12}
            color={isOk ? colors.radarBlue : colors.destructive}
          />
          <Text
            style={[
              styles.statusText,
              { color: isOk ? colors.radarBlue : colors.destructive },
            ]}
          >
            {isOk ? `${providerName} connected` : `${providerName} not connected`}
          </Text>
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>
          {headline}
        </Text>

        <Text style={[styles.subline, { color: colors.mutedForeground }]}>
          {isOk
            ? "Your token is stored encrypted on our server. Notifications from this account will appear in your unified feed."
            : "No account was added. You can try again from the Sources screen."}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: colors.radarBlue,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
            Open my radar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace("/(tabs)/accounts")}
          style={({ pressed }) => [
            styles.secondaryBtn,
            {
              borderColor: colors.radarBlue,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.radarBlue }]}>
            {isOk ? "Add another source" : "Back to Sources"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  headline: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  subline: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 360,
  },
  actions: {
    gap: 10,
    paddingTop: 12,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
