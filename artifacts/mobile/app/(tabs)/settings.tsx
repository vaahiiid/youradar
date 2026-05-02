import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { BrandLogo } from "@/components/BrandLogo";
import { RadarPulse } from "@/components/RadarPulse";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Toast } from "@/components/Toast";
import { useInbox } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";
import type { EmailNotification } from "@/types";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    settings,
    updateSettings,
    accounts,
    notifications,
    clearAll,
    simulateIncoming,
  } = useInbox();
  const [toast, setToast] = useState<EmailNotification | null>(null);

  const totalCount = notifications.length;
  const accountsCount = accounts.length;

  const handleTestPush = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    }
    if (accounts.length === 0) return;
    const provider = accounts[0]!.provider;
    const created = simulateIncoming(provider, accounts[0]!.id);
    if (created) setToast(created);
  };

  const confirmClear = () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Clear all notifications?")) {
        clearAll();
      }
      return;
    }
    Alert.alert("Clear notifications", "This removes all alerts on this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearAll },
    ]);
  };

  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom + 80) + 24;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Settings" subtitle="Tune your radar" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <Stat label="Sources" value={String(accountsCount)} />
          <Stat label="Signals" value={String(totalCount)} />
        </View>

        <SectionTitle>Notifications</SectionTitle>
        <Group>
          <Row icon="bell" title="Push notifications" subtitle="Send alerts to this device">
            <Switch
              value={settings.pushEnabled}
              onValueChange={(v) => updateSettings({ pushEnabled: v })}
              trackColor={{ true: colors.radarBlue, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </Row>
          <Divider />
          <Row icon="message-square" title="In-app toasts" subtitle="Show banner when a new signal arrives">
            <Switch
              value={settings.inAppToastsEnabled}
              onValueChange={(v) => updateSettings({ inAppToastsEnabled: v })}
              trackColor={{ true: colors.radarBlue, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </Row>
          <Divider />
          <Row icon="volume-2" title="Sounds" subtitle="Play a chime for new signals">
            <Switch
              value={settings.soundsEnabled}
              onValueChange={(v) => updateSettings({ soundsEnabled: v })}
              trackColor={{ true: colors.radarBlue, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </Row>
          <Divider />
          <Row icon="eye-off" title="Reduced motion" subtitle="Calm the radar animations">
            <Switch
              value={settings.reducedMotion}
              onValueChange={(v) => updateSettings({ reducedMotion: v })}
              trackColor={{ true: colors.radarBlue, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </Row>
        </Group>

        <SectionTitle>Quick actions</SectionTitle>
        <Group>
          <ActionRow
            icon="zap"
            title="Send test signal"
            subtitle={accounts.length === 0 ? "Connect a source first" : "Trigger a sample alert"}
            onPress={handleTestPush}
            disabled={accounts.length === 0}
          />
          <Divider />
          <ActionRow
            icon="trash-2"
            title="Clear all signals"
            subtitle="Remove every alert on this device"
            onPress={confirmClear}
            destructive
            disabled={totalCount === 0}
          />
        </Group>

        <SectionTitle>About</SectionTitle>
        <Group>
          <InfoRow label="Version" value="1.0.0" />
          <Divider />
          <InfoRow label="Build" value="MVP · Phase 1" />
        </Group>

        <View style={styles.brandFooter}>
          <View style={styles.miniRadar}>
            <RadarPulse
              size={40}
              rings={2}
              showSweep={!settings.reducedMotion}
              reducedMotion={settings.reducedMotion}
            />
          </View>
          <BrandLogo height={18} tintColor={colors.brandNavy} />
          <Text style={[styles.poweredBy, { color: colors.coolGrey }]}>
            powered by you group
          </Text>
        </View>
      </ScrollView>

      <Toast
        notification={toast}
        onPress={() => setToast(null)}
        onDismiss={() => setToast(null)}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
      {String(children).toUpperCase()}
    </Text>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.group,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function Row({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={16} color={colors.radarBlue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
  destructive,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        { opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: destructive
              ? "rgba(255, 59, 48, 0.14)"
              : colors.secondary,
          },
        ]}
      >
        <Feather
          name={icon}
          size={16}
          color={destructive ? colors.destructive : colors.radarBlue}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.rowTitle,
            { color: destructive ? colors.destructive : colors.foreground },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowTitle, { color: colors.foreground, flex: 1 }]}>
        {label}
      </Text>
      <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  stat: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  group: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  rowSubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  brandFooter: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  miniRadar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  poweredBy: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "lowercase",
  },
});
