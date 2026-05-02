import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { RadarPulse } from "@/components/RadarPulse";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Toast } from "@/components/Toast";
import { useInbox } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";
import type { EmailNotification, InstagramEventKind, Provider } from "@/types";

interface SimChip {
  id: string;
  label: string;
  provider: Provider;
  instagramKind?: InstagramEventKind;
  icon: keyof typeof Feather.glyphMap;
  color: string;
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
    simulateIncoming,
    settings,
  } = useInbox();

  const [toast, setToast] = useState<EmailNotification | null>(null);
  const recent = notifications.slice(0, 4);
  const gmailCount = accounts.filter((a) => a.provider === "gmail").length;
  const outlookCount = accounts.filter((a) => a.provider === "outlook").length;
  const instagramCount = accounts.filter((a) => a.provider === "instagram").length;

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
    {
      id: "gmail",
      label: "Gmail",
      provider: "gmail",
      icon: "zap",
      color: colors.gmail,
    },
    {
      id: "outlook",
      label: "Outlook",
      provider: "outlook",
      icon: "zap",
      color: colors.outlook,
    },
    {
      id: "ig-dm",
      label: "IG DM",
      provider: "instagram",
      instagramKind: "dm",
      icon: "send",
      color: colors.instagram,
    },
    {
      id: "ig-comment",
      label: "Comment",
      provider: "instagram",
      instagramKind: "comment",
      icon: "message-circle",
      color: colors.instagram,
    },
    {
      id: "ig-mention",
      label: "Mention",
      provider: "instagram",
      instagramKind: "mention",
      icon: "at-sign",
      color: colors.instagram,
    },
    {
      id: "ig-insight",
      label: "Insight",
      provider: "instagram",
      instagramKind: "insight",
      icon: "trending-up",
      color: colors.instagram,
    },
  ];

  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom + 80) + 24;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Radar"
        subtitle="Every signal, on your radar"
        showBrand
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
        <LinearGradient
          colors={["#0F1830", "#0B1020"]}
          style={[styles.heroCard, { borderColor: "rgba(57,255,136,0.18)" }]}
        >
          <View style={styles.heroLeft}>
            <Text style={[styles.heroLabel, { color: colors.coolGrey }]}>
              Active signals
            </Text>
            <Text style={[styles.heroNumber, { color: colors.offWhite }]}>
              {unseenTotal}
            </Text>
            <View style={styles.heroChipsRow}>
              <ProviderChip
                color={colors.gmail}
                count={unseenByProvider.gmail}
                label={`${gmailCount} Gmail`}
                icon={
                  <MaterialCommunityIcons name="gmail" size={11} color="#FFFFFF" />
                }
              />
              <ProviderChip
                color={colors.outlook}
                count={unseenByProvider.outlook}
                label={`${outlookCount} Outlook`}
                icon={
                  <MaterialCommunityIcons
                    name="microsoft-outlook"
                    size={11}
                    color="#FFFFFF"
                  />
                }
              />
              <ProviderChip
                color={colors.instagram}
                count={unseenByProvider.instagram}
                label={`${instagramCount} IG`}
                icon={
                  <MaterialCommunityIcons
                    name="instagram"
                    size={11}
                    color="#FFFFFF"
                  />
                }
              />
            </View>
          </View>
          <View style={styles.heroRadar}>
            <RadarPulse size={120} reducedMotion={settings.reducedMotion} />
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Simulate signal
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {simChips.map((chip) => {
            const enabled =
              chip.provider === "gmail"
                ? gmailCount > 0
                : chip.provider === "outlook"
                  ? outlookCount > 0
                  : instagramCount > 0;
            return (
              <Pressable
                key={chip.id}
                onPress={() => fire(chip.provider, chip.instagramKind)}
                disabled={!enabled}
                style={({ pressed }) => [
                  styles.simChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: !enabled ? 0.4 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={[styles.simChipIcon, { backgroundColor: chip.color }]}
                >
                  <Feather name={chip.icon} size={12} color="#FFFFFF" />
                </View>
                <Text style={[styles.simChipLabel, { color: colors.foreground }]}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Connected sources
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/accounts")}
            hitSlop={10}
          >
            <Text style={[styles.link, { color: colors.radarGreen }]}>
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
            <Feather name="plus-circle" size={20} color={colors.radarGreen} />
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
            <Text style={[styles.link, { color: colors.radarGreen }]}>
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

function ProviderChip({
  color,
  count,
  label,
  icon,
}: {
  color: string;
  count: number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={[chipStyles.wrap, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
      <View style={[chipStyles.dot, { backgroundColor: color }]}>{icon}</View>
      <Text style={chipStyles.label}>{label}</Text>
      {count > 0 ? (
        <View style={chipStyles.countWrap}>
          <Text style={chipStyles.count}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#F7F9FC",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  countWrap: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
  },
});

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
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  heroLeft: {
    flex: 1,
    minWidth: 0,
  },
  heroRadar: {
    width: 120,
    height: 120,
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
  heroChipsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap",
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
