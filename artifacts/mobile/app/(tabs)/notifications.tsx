import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
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

type Filter = "all" | "unread" | "gmail" | "outlook" | "instagram";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "gmail", label: "Gmail" },
  { id: "outlook", label: "Outlook" },
  { id: "instagram", label: "Instagram" },
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
      case "outlook":
      case "instagram":
        return notifications.filter((n) => n.provider === filter);
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
            ? `${unseenTotal} new signal${unseenTotal === 1 ? "" : "s"}`
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
              <Feather name="check" size={16} color={colors.radarGreen} />
              <Text
                style={[
                  styles.actionText,
                  { color: colors.foreground },
                ]}
              >
                Mark all
              </Text>
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? colors.radarGreen : colors.card,
                  borderColor: active ? colors.radarGreen : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.brandNavy : colors.foreground },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
            title="No signals"
            message={
              filter === "unread"
                ? "Nothing unread right now. Trigger a simulation from the Radar tab to see how alerts feel."
                : "When new activity arrives in any connected source, it shows up here instantly."
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
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
