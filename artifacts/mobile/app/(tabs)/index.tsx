import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { ScreenHeader } from "@/components/ScreenHeader";
import { Toast } from "@/components/Toast";
import { useInbox } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";
import type { EmailNotification, Provider } from "@/types";

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    accounts,
    notifications,
    unseenTotal,
    unseenByAccount,
    simulateIncoming,
    settings,
  } = useInbox();

  const [toast, setToast] = useState<EmailNotification | null>(null);
  const recent = notifications.slice(0, 4);
  const gmailCount = accounts.filter((a) => a.provider === "gmail").length;
  const outlookCount = accounts.filter((a) => a.provider === "outlook").length;

  const fire = (provider: Provider) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    }
    const created = simulateIncoming(provider);
    if (created && settings.inAppToastsEnabled) {
      setToast(created);
    }
  };

  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom + 80) + 24;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Inbox Pulse"
        subtitle="Every inbox, one signal"
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
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={styles.heroLabel}>Unseen across all inboxes</Text>
          <Text style={styles.heroNumber}>{unseenTotal}</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroChip}>
              <Feather name="mail" size={12} color="#FFFFFF" />
              <Text style={styles.heroChipText}>
                {gmailCount} Gmail · {outlookCount} Outlook
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => fire("gmail")}
            disabled={gmailCount === 0}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: gmailCount === 0 ? 0.45 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.gmail }]}>
              <Feather name="zap" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.foreground }]}>
                Simulate Gmail
              </Text>
              <Text
                style={[styles.actionSubtitle, { color: colors.mutedForeground }]}
              >
                Trigger a test push
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => fire("outlook")}
            disabled={outlookCount === 0}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: outlookCount === 0 ? 0.45 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={[styles.actionIcon, { backgroundColor: colors.outlook }]}
            >
              <Feather name="zap" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.foreground }]}>
                Simulate Outlook
              </Text>
              <Text
                style={[styles.actionSubtitle, { color: colors.mutedForeground }]}
              >
                Trigger a test push
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Connected accounts
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/accounts")}
            hitSlop={10}
          >
            <Text style={[styles.link, { color: colors.primary }]}>Manage</Text>
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
            <Feather name="plus-circle" size={20} color={colors.primary} />
            <Text style={[styles.emptyAccountsText, { color: colors.foreground }]}>
              Connect your first inbox
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
            Recent activity
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/notifications")}
            hitSlop={10}
          >
            <Text style={[styles.link, { color: colors.primary }]}>See all</Text>
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
              No new emails yet
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
    padding: 22,
    marginBottom: 18,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroNumber: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 56,
    letterSpacing: -1.5,
    marginTop: 4,
  },
  heroRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroChipText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  actionSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
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
