import { Feather } from "@expo/vector-icons";
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

import { ProviderIcon } from "@/components/ProviderIcon";
import { RadarSpinner } from "@/components/RadarSpinner";
import { useColors } from "@/hooks/useColors";
import { useInbox } from "@/context/InboxContext";
import {
  PROVIDER_LABELS,
  isProviderImplemented,
  type ConnectedAccount,
  type Provider,
} from "@/types";

interface ConnectAccountSheetProps {
  visible: boolean;
  provider: Provider | null;
  onClose: () => void;
  onConnect: (
    provider: Provider,
    handleOrEmail: string,
    extras?: { instagramKind?: ConnectedAccount["instagramKind"] },
  ) => void;
}

const KIND_OPTIONS: { id: ConnectedAccount["instagramKind"]; label: string }[] = [
  { id: "creator", label: "Creator" },
  { id: "business", label: "Business" },
  { id: "professional", label: "Professional" },
];

interface ProviderCopy {
  inputLabel: string;
  inputPlaceholder: string;
  keyboard: "email-address" | "default" | "phone-pad";
  validation: (v: string) => boolean;
  blurb: string;
  apiNote: string;
  scopesHint: string;
}

function getProviderCopy(provider: Provider): ProviderCopy {
  switch (provider) {
    case "gmail":
      return {
        inputLabel: "Email address",
        inputPlaceholder: "you@gmail.com",
        keyboard: "email-address",
        validation: (v) => v.trim().includes("@"),
        blurb: "Add another inbox to your unified feed",
        apiNote:
          "In production this opens secure Google OAuth (Gmail API). YourRadar requests read-only metadata scopes only.",
        scopesHint: "Inbox · labels · read-only metadata",
      };
    case "outlook":
      return {
        inputLabel: "Email address",
        inputPlaceholder: "you@outlook.com",
        keyboard: "email-address",
        validation: (v) => v.trim().includes("@"),
        blurb: "Add another inbox to your unified feed",
        apiNote:
          "In production this opens secure Microsoft OAuth (Microsoft Graph API). YourRadar requests Mail.Read scope only.",
        scopesHint: "Inbox · folders · read-only mail",
      };
    case "instagram":
      return {
        inputLabel: "Instagram handle",
        inputPlaceholder: "@yourhandle",
        keyboard: "default",
        validation: (v) => v.trim().length >= 2,
        blurb: "Track DMs, comments, mentions, and insights",
        apiNote:
          "Instagram monitoring works through official Meta APIs and may require a professional Instagram account and Meta app permissions. In production this opens secure Meta OAuth.",
        scopesHint: "Messaging · comments · mentions · insights",
      };
    case "linkedin":
      return {
        inputLabel: "LinkedIn email or vanity URL",
        inputPlaceholder: "linkedin.com/in/yourname",
        keyboard: "default",
        validation: (v) => v.trim().length >= 4,
        blurb: "Track engagement on your profile and pages",
        apiNote:
          "LinkedIn integrations use the official LinkedIn API. Available events depend on your account type and approved partner permissions. We never scrape LinkedIn or use unofficial endpoints.",
        scopesHint: "Profile views · post engagement · messages (where supported)",
      };
    case "facebook":
      return {
        inputLabel: "Facebook page or profile name",
        inputPlaceholder: "Your Page name",
        keyboard: "default",
        validation: (v) => v.trim().length >= 2,
        blurb: "Track page comments, mentions, and messages",
        apiNote:
          "Facebook integrations use the Meta Graph API and Webhooks. Page-related events require Page admin permissions. Personal Facebook notifications are not available through official APIs.",
        scopesHint: "Page comments · mentions · Messenger conversations",
      };
    case "telegram":
      return {
        inputLabel: "Bot token or @channel handle",
        inputPlaceholder: "@yourchannel or 123456:ABC...",
        keyboard: "default",
        validation: (v) => v.trim().length >= 4,
        blurb: "Connect a Telegram bot, channel, or group",
        apiNote:
          "Telegram uses the official Bot API with webhooks. Connect a bot you own to receive updates from chats and channels it has access to.",
        scopesHint: "Bot updates · channel posts · group messages",
      };
    case "whatsapp":
      return {
        inputLabel: "WhatsApp Business number",
        inputPlaceholder: "+1 555 555 5555",
        keyboard: "phone-pad",
        validation: (v) => v.trim().length >= 6,
        blurb: "Receive WhatsApp Business message alerts",
        apiNote:
          "WhatsApp uses the official WhatsApp Business Cloud API. Personal WhatsApp messages and personal app notifications cannot be monitored — only Business API conversations are supported.",
        scopesHint: "Business inbox · template responses · webhook events",
      };
    case "tiktok":
      return {
        inputLabel: "TikTok handle",
        inputPlaceholder: "@yourhandle",
        keyboard: "default",
        validation: (v) => v.trim().length >= 2,
        blurb: "Track creator and business events on TikTok",
        apiNote:
          "TikTok integrations use the official TikTok for Developers APIs. Available events depend on creator/business account access and app review approval. We never scrape TikTok.",
        scopesHint: "Comments · follows · video performance (where supported)",
      };
  }
}

export function ConnectAccountSheet({
  visible,
  provider,
  onClose,
  onConnect,
}: ConnectAccountSheetProps) {
  const colors = useColors();
  const { settings } = useInbox();
  const [value, setValue] = useState("");
  const [kind, setKind] =
    useState<ConnectedAccount["instagramKind"]>("creator");
  const [connecting, setConnecting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setConnecting(false);
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const reset = () => {
    setValue("");
    setKind("creator");
  };

  const handleClose = () => {
    if (connecting) return;
    reset();
    onClose();
  };

  if (!provider) return null;

  const copy = getProviderCopy(provider);
  const isInstagram = provider === "instagram";
  const isImplemented = isProviderImplemented(provider);
  const isValid = copy.validation(value);

  const handleConnect = () => {
    if (!provider || !isValid || connecting) return;
    setConnecting(true);
    const submittedProvider = provider;
    const submittedValue = value.trim();
    const submittedKind = kind;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onConnect(
        submittedProvider,
        submittedValue,
        isInstagram ? { instagramKind: submittedKind } : undefined,
      );
      reset();
      setConnecting(false);
      onClose();
    }, 750);
  };

  const providerName = PROVIDER_LABELS[provider];

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
                  Connect {providerName}
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.mutedForeground }]}
                >
                  {copy.blurb}
                </Text>
              </View>
            </View>

            {!isImplemented ? (
              <View
                style={[
                  styles.roadmapBadge,
                  {
                    backgroundColor: "rgba(139, 92, 246, 0.10)",
                    borderColor: "rgba(139, 92, 246, 0.40)",
                  },
                ]}
              >
                <Feather name="clock" size={12} color={colors.violetAccent} />
                <Text
                  style={[styles.roadmapText, { color: colors.violetAccent }]}
                >
                  Coming soon · API setup required
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
                {copy.apiNote}
              </Text>
            </View>

            <View style={styles.scopesRow}>
              <Feather name="check-circle" size={12} color={colors.success} />
              <Text style={[styles.scopesText, { color: colors.mutedForeground }]}>
                {copy.scopesHint}
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {copy.inputLabel}
            </Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder={copy.inputPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={copy.keyboard}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceElevated,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
            />

            {isInstagram ? (
              <>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Account type
                </Text>
                <View style={styles.kindRow}>
                  {KIND_OPTIONS.map((opt) => {
                    const active = kind === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setKind(opt.id)}
                        style={({ pressed }) => [
                          styles.kindChip,
                          {
                            backgroundColor: active
                              ? colors.radarBlue
                              : colors.surfaceElevated,
                            borderColor: active ? colors.radarBlue : colors.border,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.kindChipText,
                            {
                              color: active
                                ? colors.primaryForeground
                                : colors.foreground,
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <View style={styles.buttonRow}>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryBtn,
                  {
                    backgroundColor: colors.secondary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: colors.secondaryForeground },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConnect}
                disabled={!isValid || connecting}
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.radarBlue,
                    opacity: !isValid ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {connecting ? (
                  <View style={styles.connectingRow}>
                    <RadarSpinner
                      size={16}
                      color={colors.primaryForeground}
                      reducedMotion={settings.reducedMotion}
                    />
                    <Text
                      style={[
                        styles.buttonText,
                        { color: colors.primaryForeground },
                      ]}
                    >
                      Connecting...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.buttonText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    {isImplemented ? "Connect" : "Add to roadmap"}
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11, 16, 32, 0.45)",
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
  scopesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    marginTop: -4,
  },
  scopesText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  kindRow: {
    flexDirection: "row",
    gap: 8,
  },
  kindChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  kindChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryBtn: {},
  primaryBtn: {},
  buttonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  connectingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
