import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountCard } from "@/components/AccountCard";
import { ConnectAccountSheet } from "@/components/ConnectAccountSheet";
import { ProviderIcon } from "@/components/ProviderIcon";
import { RadarLoader } from "@/components/RadarLoader";
import { RadarSpinner } from "@/components/RadarSpinner";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useInbox } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";
import { useOAuthProviders } from "@/hooks/useOAuthProviders";
import {
  CATEGORY_LABELS,
  PROVIDER_LABELS,
  isDeliveryProvider,
  providersInCategory,
  type Provider,
  type ProviderCategory,
} from "@/types";

const CATEGORY_ORDER: ProviderCategory[] = ["email", "social", "delivery"];

export default function AccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    accounts,
    unseenByAccount,
    addDelivery,
    disconnectAccount,
    reconnectAccount,
    renameAccount,
    toggleAccountNotifications,
    settings,
  } = useInbox();
  const { byId: providerStatusById } = useOAuthProviders();
  const [sheetProvider, setSheetProvider] = useState<Provider | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "info" | "warn";
    message: string;
  } | null>(null);
  // Cross-platform rename modal state. We avoid Alert.prompt because it's
  // iOS-only — Android (and web) silently no-op without a custom UI.
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    current: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  React.useEffect(() => {
    if (!feedback) return;
    // 5 seconds gives the user (and automated UI tests) a reliable window to
    // notice the in-app feedback after the connect sheet closes.
    const t = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(t);
  }, [feedback]);

  const promptRename = (id: string, current: string) => {
    setRenameValue(current);
    setRenameTarget({ id, current });
  };

  const submitRename = () => {
    if (!renameTarget) return;
    const next = renameValue.trim();
    if (next && next !== renameTarget.current) {
      renameAccount(renameTarget.id, next);
      setFeedback({ tone: "info", message: `Renamed to "${next}".` });
    }
    setRenameTarget(null);
  };


  const confirmDisconnect = (id: string, label: string) => {
    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" && window.confirm(`Disconnect ${label}?`);
      if (ok) disconnectAccount(id);
      return;
    }
    Alert.alert(
      "Disconnect source",
      `Stop receiving signals from ${label}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => disconnectAccount(id),
        },
      ],
    );
  };

  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom + 80) + 24;

  const accountsByProvider = (p: Provider) => accounts.filter((a) => a.provider === p);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Sources"
        subtitle="Email, social, and deliveries — unified"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {accounts.length > 0 ? (
          <View
            style={[
              styles.scanRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <RadarSpinner
              size={18}
              color={colors.radarBlue}
              reducedMotion={settings.reducedMotion}
            />
            <Text style={[styles.scanText, { color: colors.coolGrey }]}>
              {`Live scan · ${accounts.length} source${accounts.length === 1 ? "" : "s"} on radar`}
            </Text>
            <View style={[styles.liveDot, { backgroundColor: colors.radarBlue }]} />
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          ADD A SOURCE
        </Text>

        {CATEGORY_ORDER.map((category) => (
          <View key={category} style={styles.categoryBlock}>
            <Text
              style={[styles.categoryLabel, { color: colors.foreground }]}
            >
              {CATEGORY_LABELS[category]}
            </Text>
            <View style={styles.providerGrid}>
              {providersInCategory(category).map((p) => {
                // Delivery providers always show the real tracking flow (the
                // ConnectAccountSheet branches on isDelivery), so they keep
                // the "Tap to track" affordance regardless of OAuth catalog.
                const isDelivery = isDeliveryProvider(p);
                const status = providerStatusById[p]?.status;
                const tileMode: "ready" | "setup_required" | "coming_soon" =
                  isDelivery
                    ? "ready"
                    : status === "configured"
                      ? "ready"
                      : status === "setup_required"
                        ? "setup_required"
                        : "coming_soon";
                const connected = accountsByProvider(p).length;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setSheetProvider(p)}
                    style={({ pressed }) => [
                      styles.providerTile,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <ProviderIcon provider={p} size={36} />
                    <View style={styles.providerTileBody}>
                      <Text
                        style={[
                          styles.providerTileLabel,
                          { color: colors.foreground },
                        ]}
                      >
                        {PROVIDER_LABELS[p]}
                      </Text>
                      {tileMode === "ready" ? (
                        <Text
                          style={[
                            styles.providerTileMeta,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {connected > 0
                            ? `${connected} connected`
                            : category === "delivery"
                              ? "Tap to track"
                              : "Tap to connect"}
                        </Text>
                      ) : (
                        <View
                          style={[
                            styles.roadmapPill,
                            {
                              backgroundColor: "rgba(84, 79, 77, 0.06)",
                              borderColor: "rgba(84, 79, 77, 0.25)",
                            },
                          ]}
                        >
                          <Feather name="clock" size={9} color={colors.coolGrey} />
                          <Text
                            style={[
                              styles.roadmapPillText,
                              { color: colors.coolGrey },
                            ]}
                          >
                            {tileMode === "setup_required"
                              ? "Setup required"
                              : "Coming soon"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Feather
                      name={category === "delivery" ? "package" : "plus"}
                      size={16}
                      color={colors.radarBlue}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <View
          style={[
            styles.privacyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.privacyHeader}>
            <View
              style={[styles.privacyIcon, { backgroundColor: colors.secondary }]}
            >
              <Feather name="shield" size={16} color={colors.radarBlue} />
            </View>
            <Text style={[styles.privacyTitle, { color: colors.foreground }]}>
              Official APIs only · no scraping, no passwords
            </Text>
          </View>
          <Text style={[styles.privacyBody, { color: colors.mutedForeground }]}>
            My Radar never asks for your password. We only connect through
            official provider APIs and OAuth — Google, Microsoft, Yahoo, Meta,
            LinkedIn, X, Telegram Bot API, WhatsApp Business API, and TikTok
            Developer APIs. Tokens stay on the server, refresh automatically,
            and never reach this device.
          </Text>
          <Text
            style={[
              styles.privacyBody,
              { color: colors.mutedForeground, marginTop: 6 },
            ]}
          >
            Delivery tracking uses official courier APIs and webhooks where
            available — Evri, DPD, Royal Mail, and Amazon. We never scrape
            courier accounts or ask for courier passwords.
          </Text>
          <Text
            style={[
              styles.privacyBody,
              { color: colors.mutedForeground, marginTop: 6 },
            ]}
          >
            Personal app notifications that are not exposed by official APIs
            (for example consumer Facebook or personal WhatsApp messages)
            cannot be mirrored — by design.
          </Text>
        </View>

        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, marginTop: 18 },
          ]}
        >
          YOUR CONNECTED SOURCES
        </Text>

        {accounts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <RadarLoader
              size="md"
              message="Waiting for your first source — connect one above to start scanning."
            />
          </View>
        ) : (
          accounts.map((account) => (
            <View key={account.id}>
              <AccountCard
                account={account}
                unseen={unseenByAccount[account.id] ?? 0}
                rightSlot={
                  <View style={styles.rowActions}>
                    {account.status !== "connected" ? (
                      <Pressable
                        onPress={() => reconnectAccount(account.id)}
                        style={({ pressed }) => [
                          styles.iconBtn,
                          {
                            backgroundColor: colors.secondary,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Feather
                          name="refresh-cw"
                          size={16}
                          color={colors.radarBlue}
                        />
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => promptRename(account.id, account.displayName)}
                      style={({ pressed }) => [
                        styles.iconBtn,
                        {
                          backgroundColor: colors.secondary,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Feather name="edit-2" size={16} color={colors.radarBlue} />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        confirmDisconnect(
                          account.id,
                          account.displayName || account.emailAddress,
                        )
                      }
                      style={({ pressed }) => [
                        styles.iconBtn,
                        {
                          backgroundColor: colors.secondary,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Feather
                        name="trash-2"
                        size={16}
                        color={colors.destructive}
                      />
                    </Pressable>
                  </View>
                }
              />
              <View
                style={[
                  styles.toggleRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather
                  name={account.notificationsEnabled ? "bell" : "bell-off"}
                  size={14}
                  color={
                    account.notificationsEnabled ? colors.radarBlue : colors.mutedForeground
                  }
                />
                <Text
                  style={[styles.toggleLabel, { color: colors.foreground }]}
                >
                  Notifications
                </Text>
                <Text
                  style={[styles.toggleHint, { color: colors.mutedForeground }]}
                >
                  {account.notificationsEnabled ? "On" : "Muted"}
                </Text>
                <Switch
                  value={account.notificationsEnabled}
                  onValueChange={() => toggleAccountNotifications(account.id)}
                  trackColor={{ true: colors.radarBlue, false: colors.border }}
                  thumbColor={Platform.OS === "android" ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <ConnectAccountSheet
        visible={sheetProvider !== null}
        provider={sheetProvider}
        onClose={() => setSheetProvider(null)}
        onAddDelivery={(p, details) => addDelivery(p, details)}
      />

      {feedback ? (
        <View
          pointerEvents="none"
          style={[
            styles.feedbackWrap,
            { bottom: (Platform.OS === "web" ? 100 : insets.bottom + 80) + 12 },
          ]}
        >
          <View
            style={[
              styles.feedbackPill,
              {
                backgroundColor:
                  feedback.tone === "warn" ? colors.destructive : colors.foreground,
              },
            ]}
          >
            <Feather
              name={feedback.tone === "warn" ? "alert-triangle" : "check-circle"}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.feedbackText}>{feedback.message}</Text>
          </View>
        </View>
      ) : null}

      <Modal
        visible={renameTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameTarget(null)}
      >
        <Pressable
          style={styles.renameBackdrop}
          onPress={() => setRenameTarget(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.renameKbWrap}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.renameSheet,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.renameTitle, { color: colors.foreground }]}>
                Rename source
              </Text>
              <Text
                style={[styles.renameSubtitle, { color: colors.mutedForeground }]}
              >
                Give this connected source a friendly label like "Personal" or
                "Work".
              </Text>
              <TextInput
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="Source label"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                autoCapitalize="words"
                onSubmitEditing={submitRename}
                returnKeyType="done"
                style={[
                  styles.renameInput,
                  {
                    backgroundColor: colors.surfaceElevated,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />
              <View style={styles.renameButtons}>
                <Pressable
                  onPress={() => setRenameTarget(null)}
                  style={({ pressed }) => [
                    styles.renameBtn,
                    {
                      backgroundColor: colors.secondary,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.renameBtnText,
                      { color: colors.secondaryForeground },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={submitRename}
                  disabled={!renameValue.trim()}
                  style={({ pressed }) => [
                    styles.renameBtn,
                    {
                      backgroundColor: colors.radarBlue,
                      opacity: !renameValue.trim() ? 0.5 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.renameBtnText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    Save
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  categoryBlock: {
    marginBottom: 14,
  },
  categoryLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  providerGrid: {
    gap: 8,
  },
  providerTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#544f4d",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  providerTileBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  providerTileLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  providerTileMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  roadmapPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  roadmapPillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.3,
  },
  privacyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    marginBottom: 4,
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  privacyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    flex: 1,
  },
  privacyBody: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  rowActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  toggleLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    flex: 1,
  },
  toggleHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  scanText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: "#0097b2",
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  emptyWrap: {
    paddingVertical: 8,
  },
  feedbackWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    // Sit above the bottom tab bar and above any closing modal fade.
    zIndex: 1000,
    elevation: 10,
  },
  feedbackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    maxWidth: "100%",
    shadowColor: "#544f4d",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  feedbackText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    flexShrink: 1,
  },
  renameBackdrop: {
    flex: 1,
    backgroundColor: "rgba(84, 79, 77, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  renameKbWrap: {
    width: "100%",
    alignItems: "center",
  },
  renameSheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  renameTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  renameSubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  renameButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  renameBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  renameBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});
