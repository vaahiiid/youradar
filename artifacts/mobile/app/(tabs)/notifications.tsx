import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { NotificationCard } from "@/components/NotificationCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useInbox } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";

type Filter = "all" | "unread" | "gmail" | "outlook";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "gmail", label: "Gmail" },
  { id: "outlook", label: "Outlook" },
];

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, unseenTotal, markAllSeen } = useInbox();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    switch (filter) {
      case "unread":
        return notifications.filter((n) => !n.isSeen);
      case "gmail":
        return notifications.filter((n) => n.provider === "gmail");
      case "outlook":
        return notifications.filter((n) => n.provider === "outlook");
      default:
        return notifications;
    }
  }, [filter, notifications]);

  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom + 80) + 24;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Alerts"
        subtitle={
          unseenTotal > 0
            ? `${unseenTotal} new notification${unseenTotal === 1 ? "" : "s"}`
            : "You're all caught up"
        }
        right={
          unseenTotal > 0 ? (
            <Pressable
              onPress={markAllSeen}
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: colors.secondary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="check" size={16} color={colors.secondaryForeground} />
              <Text
                style={[
                  styles.actionText,
                  { color: colors.secondaryForeground },
                ]}
              >
                Mark all
              </Text>
            </Pressable>
          ) : null
        }
      />

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad },
          filtered.length === 0 && { flexGrow: 1, justifyContent: "center" },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <NotificationCard
            item={item}
            onPress={() => router.push(`/notification/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bell-off"
            title="No notifications"
            message={
              filter === "unread"
                ? "Nothing unread right now. Trigger a simulation from the dashboard to see how alerts feel."
                : "When new email arrives in any connected inbox, it shows up here instantly."
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  actionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
