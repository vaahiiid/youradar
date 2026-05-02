import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
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
import {
  PROVIDER_LABELS,
  PROVIDER_ORDER,
  isProviderImplemented,
  type Provider,
} from "@/types";

export default function AccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    accounts,
    unseenByAccount,
    connectAccount,
    disconnectAccount,
    reconnectAccount,
    toggleAccountNotifications,
    settings,
  } = useInbox();
  const [sheetProvider, setSheetProvider] = useState<Provider | null>(null);

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
        subtitle="Email, social, and more — unified"
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
        <View style={styles.providerGrid}>
          {PROVIDER_ORDER.map((p) => {
            const implemented = isProviderImplemented(p);
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
                  {!implemented ? (
                    <View
                      style={[
                        styles.roadmapPill,
                        {
                          backgroundColor: "rgba(139, 92, 246, 0.10)",
                          borderColor: "rgba(139, 92, 246, 0.40)",
                        },
                      ]}
                    >
                      <Feather name="clock" size={9} color={colors.violetAccent} />
                      <Text
                        style={[
                          styles.roadmapPillText,
                          { color: colors.violetAccent },
                        ]}
                      >
                        API setup required
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.providerTileMeta,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {accountsByProvider(p).length > 0
                        ? `${accountsByProvider(p).length} connected`
                        : "Tap to connect"}
                    </Text>
                  )}
                </View>
                <Feather name="plus" size={16} color={colors.radarBlue} />
              </Pressable>
            );
          })}
        </View>

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
            YourRadar never asks for your password. We only connect through official
            provider APIs and OAuth — Google, Microsoft, Meta, LinkedIn, Telegram
            Bot API, WhatsApp Business API, and TikTok Developer APIs. Tokens stay
            on the server, refresh automatically, and never reach this device.
          </Text>
          <Text
            style={[
              styles.privacyBody,
              { color: colors.mutedForeground, marginTop: 6 },
            ]}
          >
            Personal app notifications that are not exposed by official APIs (for
            example consumer Facebook or personal WhatsApp messages) cannot be
            mirrored — by design.
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
                      onPress={() =>
                        confirmDisconnect(account.id, account.emailAddress)
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
        onConnect={(p, value, extras) => connectAccount(p, value, extras)}
      />
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
  providerGrid: {
    gap: 8,
    marginBottom: 16,
  },
  providerTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#0B1020",
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
    shadowColor: "#2F80ED",
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  emptyWrap: {
    paddingVertical: 8,
  },
});
