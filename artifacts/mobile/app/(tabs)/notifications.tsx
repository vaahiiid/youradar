import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import { RadarSpinner } from "@/components/RadarSpinner";
import { ScanSkeleton } from "@/components/ScanSkeleton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useInbox } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";
import { PROVIDER_LABELS, PROVIDER_ORDER, type Provider } from "@/types";

type Filter = "all" | "unread" | Provider;
type SourceFilter = "all" | string; // "all" or accountId

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    accounts,
    notifications,
    unseenTotal,
    markAllSeen,
    settings,
    connectedProviders,
  } = useInbox();
  const [filter, setFilter] = useState<Filter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [initialScanning, setInitialScanning] = useState(true);

  // Reset the source sub-filter whenever the top filter changes.
  useEffect(() => {
    setSourceFilter("all");
  }, [filter]);

  useEffect(() => {
    const t = setTimeout(() => setInitialScanning(false), 700);
    return () => clearTimeout(t);
  }, []);

  // Visibility rule: filter chips only show providers that are either
  // connected on this device OR have at least one historical notification.
  const visibleProviders = useMemo<Provider[]>(() => {
    const set = new Set<Provider>(connectedProviders);
    for (const n of notifications) set.add(n.provider);
    return PROVIDER_ORDER.filter((p) => set.has(p));
  }, [connectedProviders, notifications]);

  const filters: { id: Filter; label: string }[] = useMemo(
    () => [
      { id: "all", label: "All" },
      { id: "unread", label: "Unread" },
      ...visibleProviders.map((p) => ({
        id: p as Filter,
        label: PROVIDER_LABELS[p],
      })),
    ],
    [visibleProviders],
  );

  // Sub-filter is only relevant when a specific provider is selected AND
  // that provider has more than one connected source on this device.
  const sourcesForActiveProvider = useMemo(() => {
    if (filter === "all" || filter === "unread") return [];
    return accounts.filter((a) => a.provider === filter);
  }, [filter, accounts]);

  const showSourceFilter = sourcesForActiveProvider.length > 1;

  const filtered = useMemo(() => {
    let base: typeof notifications;
    if (filter === "all") base = notifications;
    else if (filter === "unread") base = notifications.filter((n) => !n.isSeen);
    else base = notifications.filter((n) => n.provider === filter);

    if (showSourceFilter && sourceFilter !== "all") {
      base = base.filter((n) => n.accountId === sourceFilter);
    }
    return base;
  }, [filter, notifications, showSourceFilter, sourceFilter]);

  // Map of provider -> account count, used to decide whether to show the
  // source label on each notification card so users can tell sources apart
  // (e.g. "Personal" vs "Work" Gmail).
  const providerAccountCount = useMemo(() => {
    const m: Partial<Record<Provider, number>> = {};
    for (const a of accounts) {
      m[a.provider] = (m[a.provider] ?? 0) + 1;
    }
    return m;
  }, [accounts]);

  const accountById = useMemo(() => {
    const m: Record<string, (typeof accounts)[number]> = {};
    for (const a of accounts) m[a.id] = a;
    return m;
  }, [accounts]);

  const bottomPad = (Platform.OS === "web" ? 96 : insets.bottom + 80) + 24;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingBottom: 0 },
      ]}
    >
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
              <Feather name="check" size={16} color={colors.radarBlue} />
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
          {unseenTotal > 0 ? "Scanning new signals..." : "Live scan active"}
        </Text>
        <View style={[styles.liveDot, { backgroundColor: colors.radarBlue }]} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersScroll}
      >
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? colors.radarBlue : colors.card,
                  borderColor: active ? colors.radarBlue : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: active ? colors.primaryForeground : colors.foreground,
                  },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {showSourceFilter ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFiltersRow}
          style={styles.filtersScroll}
        >
          {[
            { id: "all" as SourceFilter, label: "All sources" },
            ...sourcesForActiveProvider.map((a) => ({
              id: a.id as SourceFilter,
              label: a.displayName || a.emailAddress,
            })),
          ].map((s) => {
            const active = sourceFilter === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSourceFilter(s.id)}
                style={({ pressed }) => [
                  styles.subChip,
                  {
                    backgroundColor: active ? colors.secondary : "transparent",
                    borderColor: active ? colors.radarBlue : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subChipText,
                    {
                      color: active ? colors.radarBlue : colors.mutedForeground,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {initialScanning ? (
        <View style={styles.scanList}>
          <ScanSkeleton height={84} />
          <ScanSkeleton height={84} />
          <ScanSkeleton height={84} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPad },
            filtered.length === 0 && { flexGrow: 1, justifyContent: "center" },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const acct = accountById[item.accountId];
            const showLabel = (providerAccountCount[item.provider] ?? 0) > 1;
            const sourceLabel =
              showLabel && acct ? acct.displayName || acct.emailAddress : undefined;
            return (
              <NotificationCard
                item={item}
                sourceLabel={sourceLabel}
                onPress={() => router.push(`/notification/${item.id}`)}
              />
            );
          }}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: "100%", maxWidth: "100%", overflow: "hidden" },
  filtersScroll: {
    flexGrow: 0,
    maxWidth: "100%",
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 16,
    // Add extra right padding so the last filter chip is fully visible
    // and not clipped by the screen edge while horizontally scrolling.
    paddingRight: 24,
    paddingBottom: 8,
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  subFiltersRow: {
    flexDirection: "row",
    gap: 6,
    paddingLeft: 16,
    paddingRight: 24,
    paddingBottom: 8,
    marginTop: -2,
  },
  subChip: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 200,
  },
  subChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  scanList: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    // Hug content but cap so the pill never spans the full screen on
    // wider mobile widths.
    alignSelf: "flex-start",
    maxWidth: "90%",
    minWidth: 0,
    flexShrink: 1,
  },
  scanText: {
    flexShrink: 1,
    minWidth: 0,
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
});
