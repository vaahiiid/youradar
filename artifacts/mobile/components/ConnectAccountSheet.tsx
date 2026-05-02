import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { customFetch, ApiError } from "@workspace/api-client-react";

import { ProviderIcon } from "@/components/ProviderIcon";
import { RadarSpinner } from "@/components/RadarSpinner";
import { useColors } from "@/hooks/useColors";
import {
  useOAuthProviders,
  type OAuthProviderInfo,
  type OAuthProviderStatus,
} from "@/hooks/useOAuthProviders";
import { useInbox } from "@/context/InboxContext";
import {
  PROVIDER_LABELS,
  isDeliveryProvider,
  type Provider,
} from "@/types";

interface ConnectAccountSheetProps {
  visible: boolean;
  provider: Provider | null;
  onClose: () => void;
  onAddDelivery?: (
    provider: Provider,
    details: {
      trackingNumber: string;
      label: string;
      merchant?: string;
    },
  ) => void;
}

interface StartResponse {
  ok: boolean;
  authorizeUrl?: string;
  reason?: string;
  message?: string;
  requiredEnv?: string[];
}

function getProviderBlurb(provider: Provider): string {
  switch (provider) {
    case "gmail":
      return "Add a Gmail inbox to your unified feed.";
    case "outlook":
    case "hotmail":
      return "Add a Microsoft inbox to your unified feed.";
    case "yahoo":
      return "Add a Yahoo Mail inbox to your unified feed.";
    case "aol":
      return "Add an AOL Mail inbox to your unified feed.";
    case "instagram":
      return "Track DMs, comments, mentions, and insights.";
    case "linkedin":
      return "Track engagement on your profile and pages.";
    case "facebook":
      return "Track Facebook page comments, mentions, and messages.";
    case "telegram":
      return "Connect a Telegram bot, channel, or group.";
    case "whatsapp":
      return "Receive WhatsApp Business message alerts.";
    case "tiktok":
      return "Track creator and business events on TikTok.";
    case "x":
      return "Track mentions and engagement on X.";
    case "evri":
    case "dpd":
    case "royalmail":
    case "amazon":
      return "Track a delivery and get status alerts.";
  }
}

export function ConnectAccountSheet({
  visible,
  provider,
  onClose,
  onAddDelivery,
}: ConnectAccountSheetProps) {
  const colors = useColors();
  const router = useRouter();
  const { settings } = useInbox();
  const { byId } = useOAuthProviders();

  // Delivery flow state — delivery is not OAuth, it's a real tracking-number form.
  const [trackingNumber, setTrackingNumber] = useState("");
  const [label, setLabel] = useState("");
  const [merchant, setMerchant] = useState("");

  const [working, setWorking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      cancelledRef.current = false;
      setWorking(false);
      setErrorMsg(null);
      setTrackingNumber("");
      setLabel("");
      setMerchant("");
    }
  }, [visible]);

  if (!provider) return null;

  const isDelivery = isDeliveryProvider(provider);
  const providerName = PROVIDER_LABELS[provider];
  const info: OAuthProviderInfo | undefined = byId[provider];
  const status: OAuthProviderStatus = info?.status ?? "coming_soon";

  const handleClose = () => {
    if (working) return;
    onClose();
  };

  // -----------------------------------------------------------------
  // Delivery flow (manual tracking number — not OAuth, not a password)
  // -----------------------------------------------------------------
  const handleAddDelivery = () => {
    if (!provider || working) return;
    const tn = trackingNumber.trim();
    const lbl = label.trim();
    if (tn.length < 4 || lbl.length < 1) return;
    setWorking(true);
    onAddDelivery?.(provider, {
      trackingNumber: tn,
      label: lbl,
      merchant: merchant.trim() || undefined,
    });
    setWorking(false);
    onClose();
  };

  // -----------------------------------------------------------------
  // OAuth flow (Gmail / Outlook / Instagram once configured)
  // -----------------------------------------------------------------
  const handleConnectOAuth = async () => {
    if (!provider || working) return;
    setErrorMsg(null);
    setWorking(true);

    const returnUrl = Linking.createURL("oauth-success");

    try {
      // 1. Ask server for an authorize URL. If provider is not configured,
      //    server returns 501 — we surface the message to the user.
      const start = await customFetch<StartResponse>(
        `/api/oauth/${provider}/start`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ returnUrl }),
          responseType: "json",
        },
      );

      if (!start.authorizeUrl) {
        setErrorMsg(start.message ?? "Provider is not configured yet.");
        setWorking(false);
        return;
      }

      // 2. Open the provider's authorize URL.
      if (Platform.OS === "web") {
        // Full-page redirect — server callback will redirect back to
        // /oauth-success which renders our success route.
        if (typeof window !== "undefined") {
          window.location.href = start.authorizeUrl;
        }
        return; // unmounting — no further work
      }

      const result = await WebBrowser.openAuthSessionAsync(
        start.authorizeUrl,
        returnUrl,
      );

      if (cancelledRef.current) return;

      if (result.type !== "success" || !result.url) {
        setWorking(false);
        if (result.type === "cancel" || result.type === "dismiss") {
          setErrorMsg("Connection cancelled.");
        } else {
          setErrorMsg("Connection did not complete.");
        }
        return;
      }

      // 3. Parse return params and navigate to success screen.
      const parsed = Linking.parse(result.url);
      const params = parsed.queryParams ?? {};
      const status = typeof params.status === "string" ? params.status : "";
      const account = typeof params.account === "string" ? params.account : "";
      const reason = typeof params.reason === "string" ? params.reason : "";
      const sourceId =
        typeof params.sourceId === "string" ? params.sourceId : "";

      onClose();
      router.push({
        pathname: "/oauth-success",
        params: { provider, status, account, reason, sourceId },
      });
    } catch (err) {
      let message = "Could not start connection. Please try again.";
      if (err instanceof ApiError) {
        const data = err.data as
          | { message?: string; reason?: string; requiredEnv?: string[] }
          | null;
        if (data?.message) message = data.message;
        else if (data?.reason) message = data.reason;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setErrorMsg(message);
      setWorking(false);
    }
  };

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  const isValidDelivery =
    isDelivery && trackingNumber.trim().length >= 4 && label.trim().length >= 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kbWrap}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.handle}>
              <View
                style={[styles.handleBar, { backgroundColor: colors.border }]}
              />
            </View>

            <View style={styles.headerRow}>
              <ProviderIcon provider={provider} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.foreground }]}>
                  {isDelivery ? `Track ${providerName}` : `Connect ${providerName}`}
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.mutedForeground }]}
                >
                  {getProviderBlurb(provider)}
                </Text>
              </View>
            </View>

            {isDelivery ? (
              <DeliveryBody
                providerName={providerName}
                trackingNumber={trackingNumber}
                setTrackingNumber={setTrackingNumber}
                label={label}
                setLabel={setLabel}
                merchant={merchant}
                setMerchant={setMerchant}
                colors={colors}
                onCancel={handleClose}
                onSubmit={handleAddDelivery}
                disabled={!isValidDelivery || working}
                working={working}
                reducedMotion={settings.reducedMotion}
              />
            ) : (
              <OAuthBody
                providerName={providerName}
                info={info}
                status={status}
                colors={colors}
                onCancel={handleClose}
                onConnect={handleConnectOAuth}
                working={working}
                errorMsg={errorMsg}
                reducedMotion={settings.reducedMotion}
              />
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// OAuth body — status-aware. NO password / handle text-input fields.
// ---------------------------------------------------------------------------
interface OAuthBodyProps {
  providerName: string;
  info: OAuthProviderInfo | undefined;
  status: OAuthProviderStatus;
  colors: ReturnType<typeof useColors>;
  onCancel: () => void;
  onConnect: () => void;
  working: boolean;
  errorMsg: string | null;
  reducedMotion: boolean;
}

function OAuthBody({
  providerName,
  info,
  status,
  colors,
  onCancel,
  onConnect,
  working,
  errorMsg,
  reducedMotion,
}: OAuthBodyProps) {
  const showStatusBadge = status !== "configured";
  const badgeLabel =
    status === "setup_required"
      ? "Setup required"
      : status === "coming_soon"
        ? "Coming soon · API setup required"
        : "";

  return (
    <>
      {showStatusBadge ? (
        <View
          style={[
            styles.roadmapBadge,
            {
              backgroundColor: "rgba(84, 79, 77, 0.06)",
              borderColor: "rgba(84, 79, 77, 0.25)",
            },
          ]}
        >
          <Feather name="clock" size={12} color={colors.coolGrey} />
          <Text style={[styles.roadmapText, { color: colors.coolGrey }]}>
            {badgeLabel}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.note,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <Feather name="shield" size={14} color={colors.radarBlue} />
        <Text style={[styles.noteText, { color: colors.secondaryForeground }]}>
          You will be redirected to the provider. We never see your password.
        </Text>
      </View>

      {info?.setupNotes && status !== "configured" ? (
        <View
          style={[
            styles.note,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="info" size={14} color={colors.coolGrey} />
          <Text
            style={[styles.noteText, { color: colors.mutedForeground }]}
          >
            {info.setupNotes}
          </Text>
        </View>
      ) : null}

      {errorMsg ? (
        <View
          style={[
            styles.note,
            {
              backgroundColor: "rgba(220, 38, 38, 0.08)",
              borderColor: "rgba(220, 38, 38, 0.35)",
            },
          ]}
        >
          <Feather name="alert-triangle" size={14} color={colors.destructive} />
          <Text style={[styles.noteText, { color: colors.destructive }]}>
            {errorMsg}
          </Text>
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.button,
            styles.secondaryBtn,
            {
              backgroundColor: "#FFFFFF",
              borderColor: colors.radarBlue,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.radarBlue }]}>
            {status === "configured" ? "Cancel" : "Close"}
          </Text>
        </Pressable>
        {status === "configured" ? (
          <Pressable
            onPress={onConnect}
            disabled={working}
            style={({ pressed }) => [
              styles.button,
              styles.primaryBtn,
              {
                backgroundColor: colors.radarBlue,
                opacity: working ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {working ? (
              <View style={styles.connectingRow}>
                <RadarSpinner
                  size={16}
                  color={colors.primaryForeground}
                  reducedMotion={reducedMotion}
                />
                <Text
                  style={[
                    styles.buttonText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Opening provider…
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.primaryForeground },
                ]}
              >
                {`Continue to ${providerName}`}
              </Text>
            )}
          </Pressable>
        ) : (
          <View
            style={[
              styles.button,
              styles.primaryBtn,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.mutedForeground }]}>
              {status === "setup_required" ? "Awaiting credentials" : "Not yet available"}
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Delivery body — manual tracking-number entry (not OAuth)
// ---------------------------------------------------------------------------
interface DeliveryBodyProps {
  providerName: string;
  trackingNumber: string;
  setTrackingNumber: (v: string) => void;
  label: string;
  setLabel: (v: string) => void;
  merchant: string;
  setMerchant: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  onCancel: () => void;
  onSubmit: () => void;
  disabled: boolean;
  working: boolean;
  reducedMotion: boolean;
}

function DeliveryBody({
  providerName,
  trackingNumber,
  setTrackingNumber,
  label,
  setLabel,
  merchant,
  setMerchant,
  colors,
  onCancel,
  onSubmit,
  disabled,
  working,
  reducedMotion,
}: DeliveryBodyProps) {
  return (
    <>
      <View
        style={[
          styles.note,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <Feather name="package" size={14} color={colors.radarBlue} />
        <Text style={[styles.noteText, { color: colors.secondaryForeground }]}>
          Paste the tracking number for your parcel. We never ask for your
          courier-account password.
        </Text>
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        Tracking number
      </Text>
      <TextInput
        value={trackingNumber}
        onChangeText={setTrackingNumber}
        placeholder="Paste your tracking number"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceElevated,
            color: colors.foreground,
            borderColor: colors.border,
          },
        ]}
      />

      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        Order label
      </Text>
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. New running shoes"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="sentences"
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceElevated,
            color: colors.foreground,
            borderColor: colors.border,
          },
        ]}
      />

      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        Merchant (optional)
      </Text>
      <TextInput
        value={merchant}
        onChangeText={setMerchant}
        placeholder="e.g. ASOS, Etsy, Amazon"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="words"
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceElevated,
            color: colors.foreground,
            borderColor: colors.border,
          },
        ]}
      />

      <View style={styles.buttonRow}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.button,
            styles.secondaryBtn,
            {
              backgroundColor: "#FFFFFF",
              borderColor: colors.radarBlue,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.radarBlue }]}>
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={onSubmit}
          disabled={disabled}
          style={({ pressed }) => [
            styles.button,
            styles.primaryBtn,
            {
              backgroundColor: colors.radarBlue,
              opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {working ? (
            <View style={styles.connectingRow}>
              <RadarSpinner
                size={16}
                color={colors.primaryForeground}
                reducedMotion={reducedMotion}
              />
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.primaryForeground },
                ]}
              >
                Adding…
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.buttonText,
                { color: colors.primaryForeground },
              ]}
            >
              {`Track ${providerName}`}
            </Text>
          )}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(84, 79, 77, 0.45)",
    justifyContent: "flex-end",
  },
  kbWrap: {
    width: "100%",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  handle: {
    alignItems: "center",
    marginBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  roadmapBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  roadmapText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_500Medium",
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.6,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {},
  secondaryBtn: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  connectingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
