import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountCard } from "@/components/AccountCard";
import { Badge } from "@/components/Badge";
import { NotificationCard } from "@/components/NotificationCard";
import { ProviderIcon } from "@/components/ProviderIcon";
import { RadarPulse } from "@/components/RadarPulse";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Toast } from "@/components/Toast";
import { useInbox } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";
import {
  PROVIDER_LABELS,
  PROVIDER_ORDER,
  type EmailNotification,
  type InstagramEventKind,
  type Provider,
} from "@/types";

interface SimChip {
  id: string;
  label: string;
  provider: Provider;
  instagramKind?: InstagramEventKind;
}

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    accounts,
    notifications,
    unseenTotal,
    unseenByAccount,
    unseenByProvider,
    connectedProviders,
    simulateIncoming,
    settings,
  } = useInbox();

  const [toast, setToast] = useState<EmailNotification | null>(null);
  const recent = notifications.slice(0, 4);

  const fire = (provider: Provider, instagramKind?: InstagramEventKind) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    }
    const created = simulateIncoming(provider, undefined, instagramKind);
    if (created && settings.inAppToastsEnabled) {
      setToast(created);
    }
  };

  const simChips: SimChip[] = [
    { id: "gmail", label: "Gmail", provider: "gmail" },
    { id: "outlook", label: "Outlook", provider: "outlook" },
    { id: "yahoo", label: "Yahoo", provider: "yahoo" },
    { id: "aol", label: "AOL", provider: "aol" },
    { id: "hotmail", label: "Hotmail", provider: "hotmail" },
    { id: "ig-dm", label: "IG · DM", provider: "instagram", instagramKind: "dm" },
    {
      id: "ig-comment",
      label: "IG · Comment",
      provider: "instagram",
      instagramKind: "comment",
    },
    {
      id: "ig-mention",
      label: "IG · Mention",
      provider: "instagram",
      instagramKind: "mention",
    },
    {
      id: "ig-insight",
      label: "IG · Insight",
      provider: "instagram",
      instagramKind: "insight",
    },
    { id: "linkedin", label: "LinkedIn", provider: "linkedin" },
    { id: "facebook", label: "Facebook", provider: "facebook" },
    { id: "telegram", label: "Telegram", provider: "telegram" },
    { id: "whatsapp", label: "WhatsApp", provider: "whatsapp" },
    { id: "tiktok", label: "TikTok", provider: "tiktok" },
    { id: "x", label: "X", provider: "x" },
    { id: "evri", label: "Evri", provider: "evri" },
    { id: "dpd", label: "DPD", provider: "dpd" },
    { id: "royalmail", label: "Royal Mail", provider: "royalmail" },
    { id: "amazon", label: "Amazon", provider: "amazon" },
  ];

  // Visibility rule: hero summary grid only includes providers that have at
  // least one connected account OR have at least one historical notification.
  const visibleProviders = useMemo<Provider[]>(() => {
    const set = new Set<Provider>(connectedProviders);
    for (const n of notifications) set.add(n.provider);
    return PROVIDER_ORDER.filter((p) => set.has(p));
  }, [connectedProviders, notifications]);

  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom + 80) + 24;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="My Radar"
        subtitle="Every signal, on your radar"
        showBrand
        compactTitle
        right={
          <Pressable
            onPress={() => router.push("/(tabs)/notifications")}
            style={({ pressed }) => [
              styles.bell,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="bell" size={20} color={colors.foreground} />
            {unseenTotal > 0 ? (
              <Badge
                count={unseenTotal}
                size="sm"
                style={{ position: "absolute", top: -4, right: -4 }}
              />
            ) : null}
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.heroLeft}>
            <Text style={[styles.heroLabel, { color: colors.coolGrey }]}>
              Active signals
            </Text>
            <Text style={[styles.heroNumber, { color: colors.foreground }]}>
              {unseenTotal}
            </Text>
            <Text style={[styles.heroHint, { color: colors.mutedForeground }]}>
              {accounts.length === 0
                ? "Connect a source to start scanning"
                : `Scanning ${accounts.length} source${accounts.length === 1 ? "" : "s"} in real time`}
            </Text>
          </View>
          <View style={styles.heroRadar}>
            <RadarPulse size={130} reducedMotion={settings.reducedMotion} />
          </View>
        </View>

        {visibleProviders.length > 0 ? (
          <View style={styles.providerSummaryGrid}>
            {visibleProviders.map((p) => {
              const count = accounts.filter((a) => a.provider === p).length;
              const unread = unseenByProvider[p];
              return (
                <View
                  key={p}
                  style={[
                    styles.providerSummary,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.providerSummaryHead}>
                    <ProviderIcon provider={p} size={22} />
                    {unread > 0 ? (
                      <View
                        style={[
                          styles.unreadPill,
                          { backgroundColor: colors.destructive },
                        ]}
                      >
                        <Text style={styles.unreadPillText}>{unread}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.providerSummaryLabel,
                      { color: colors.foreground },
                    ]}
                  >
                    {PROVIDER_LABELS[p]}
                  </Text>
                  <Text
                    style={[
                      styles.providerSummaryMeta,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {count > 0 ? `${count} connected` : "Recent activity"}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {settings.testModeEnabled ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Simulate signal
              </Text>
              <Text
                style={[styles.sectionHint, { color: colors.mutedForeground }]}
              >
                Test mode
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {simChips.map((chip) => {
                const tint =
                  chip.provider === "instagram"
                    ? colors.instagram
                    : chip.provider === "tiktok"
                      ? colors.brandNavy
                      : (colors as unknown as Record<string, string>)[
                          chip.provider
                        ] ?? colors.radarBlue;
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => fire(chip.provider, chip.instagramKind)}
                    style={({ pressed }) => [
                      styles.simChip,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[styles.simChipIcon, { backgroundColor: tint }]}
                    >
                      <Feather name="zap" size={11} color="#FFFFFF" />
                    </View>
                    <Text
                      style={[
                        styles.simChipLabel,
                        { color: colors.foreground },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Connected sources
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/accounts")}
            hitSlop={10}
          >
            <Text style={[styles.link, { color: colors.radarBlue }]}>
              Manage
            </Text>
          </Pressable>
        </View>

        {accounts.length === 0 ? (
          <Pressable
            onPress={() => router.push("/(tabs)/accounts")}
            style={({ pressed }) => [
              styles.emptyAccounts,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="plus-circle" size={20} color={colors.radarBlue} />
            <Text style={[styles.emptyAccountsText, { color: colors.foreground }]}>
              Connect your first source
            </Text>
          </Pressable>
        ) : (
          accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              unseen={unseenByAccount[account.id] ?? 0}
            />
          ))
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent signals
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/notifications")}
            hitSlop={10}
          >
            <Text style={[styles.link, { color: colors.radarBlue }]}>
              See all
            </Text>
          </Pressable>
        </View>

        {recent.length === 0 ? (
          <View
            style={[
              styles.emptyAccounts,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="inbox" size={20} color={colors.mutedForeground} />
            <Text style={[styles.emptyAccountsText, { color: colors.mutedForeground }]}>
              No new signals yet
            </Text>
          </View>
        ) : (
          recent.map((n) => (
            <NotificationCard
              key={n.id}
              item={n}
              onPress={() => router.push(`/notification/${n.id}`)}
            />
          ))
        )}
      </ScrollView>

      <Toast
        notification={toast}
        onPress={() => {
          if (toast) {
            const id = toast.id;
            setToast(null);
            router.push(`/notification/${id}`);
          }
        }}
        onDismiss={() => setToast(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#0B1020",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  heroLeft: {
    flex: 1,
    minWidth: 0,
  },
  heroRadar: {
    width: 130,
    height: 130,
    marginLeft: 8,
  },
  heroLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 56,
    letterSpacing: -1.5,
    marginTop: 4,
    lineHeight: 60,
  },
  heroHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  providerSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  providerSummary: {
    width: "23.5%",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
    gap: 6,
  },
  providerSummaryHead: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  unreadPill: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadPillText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
  },
  providerSummaryLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  providerSummaryMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  sectionHint: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  link: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 18,
    paddingRight: 8,
  },
  simChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  simChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  simChipLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  emptyAccounts: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  emptyAccountsText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
