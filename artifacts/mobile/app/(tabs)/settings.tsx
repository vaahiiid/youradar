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
import type {
  EmailNotification,
  InstagramEventKind,
  Provider,
} from "@/types";

interface SimChip {
  id: string;
  label: string;
  provider: Provider;
  instagramKind?: InstagramEventKind;
}

const SIM_CHIPS: SimChip[] = [
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

  const fireChip = (chip: SimChip) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    }
    const created = simulateIncoming(
      chip.provider,
      undefined,
      chip.instagramKind,
    );
    if (created && settings.inAppToastsEnabled) setToast(created);
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

        <SectionTitle>Developer · Test mode</SectionTitle>
        <Group>
          <Row
            icon="sliders"
            title="Enable test mode"
            subtitle="Show signal-simulation tools on the dashboard and below"
          >
            <Switch
              value={settings.testModeEnabled}
              onValueChange={(v) => updateSettings({ testModeEnabled: v })}
              trackColor={{ true: colors.radarBlue, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </Row>
        </Group>

        {settings.testModeEnabled ? (
          <View
            style={[
              styles.devPanel,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[styles.devPanelTitle, { color: colors.foreground }]}
            >
              Simulate signal
            </Text>
            <Text
              style={[
                styles.devPanelHint,
                { color: colors.mutedForeground },
              ]}
            >
              Fire a sample alert from any provider — auto-mints a demo source
              if you haven't connected one yet.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {SIM_CHIPS.map((chip) => {
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
                    onPress={() => fireChip(chip)}
                    style={({ pressed }) => [
                      styles.simChip,
                      {
                        backgroundColor: colors.background,
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
          </View>
        ) : null}

        <SectionTitle>Privacy & Security</SectionTitle>
        <View
          style={[
            styles.privacyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.privacyHeader}>
            <View
              style={[
                styles.privacyBadge,
                { backgroundColor: colors.radarBlue + "1A" },
              ]}
            >
              <Feather name="lock" size={14} color={colors.radarBlue} />
            </View>
            <Text style={[styles.privacyTitle, { color: colors.foreground }]}>
              End-to-end inspired encryption
            </Text>
          </View>
          <Text
            style={[styles.privacyBody, { color: colors.mutedForeground }]}
          >
            YouRadar uses end-to-end inspired encryption principles. Your
            connected data is encrypted and only visible to you. Even system
            administrators cannot read your private notifications.
          </Text>
          <Text
            style={[styles.privacyBody, { color: colors.mutedForeground }]}
          >
            We never store your passwords. All connections use secure provider
            authentication (OAuth).
          </Text>
          <View
            style={[
              styles.privacyNote,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Feather
              name="info"
              size={13}
              color={colors.mutedForeground}
              style={{ marginTop: 2 }}
            />
            <Text
              style={[
                styles.privacyNoteText,
                { color: colors.mutedForeground },
              ]}
            >
              Note: this is not full end-to-end encryption yet. The backend
              decrypts your data at runtime only for you, the authenticated
              owner. Client-side / true end-to-end encryption is on the
              roadmap.
            </Text>
          </View>
          <View
            style={[
              styles.privacyDetail,
              { borderTopColor: colors.border },
            ]}
          >
            <PrivacyDetailRow
              icon="shield"
              label="AES-256-GCM"
              value="Per-record IV + auth tag"
            />
            <PrivacyDetailRow
              icon="key"
              label="HKDF-SHA256"
              value="Unique key per user"
            />
            <PrivacyDetailRow
              icon="eye-off"
              label="Encrypted at rest"
              value="Tokens · titles · senders · trackers"
            />
          </View>
        </View>

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
          <BrandLogo height={20} />
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

function PrivacyDetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.privacyDetailRow}>
      <Feather name={icon} size={13} color={colors.radarBlue} />
      <Text style={[styles.privacyDetailLabel, { color: colors.foreground }]}>
        {label}
      </Text>
      <Text
        style={[styles.privacyDetailValue, { color: colors.mutedForeground }]}
        numberOfLines={1}
      >
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
  privacyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
    gap: 10,
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  privacyBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  privacyBody: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  privacyNote: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  privacyNoteText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  privacyDetail: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 4,
    gap: 8,
  },
  privacyDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  privacyDetailLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  privacyDetailValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    flex: 1,
    textAlign: "right",
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
  devPanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  devPanelTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    marginBottom: 4,
  },
  devPanelHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  chipsScroll: {
    gap: 8,
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
});
