import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProviderIcon } from "@/components/ProviderIcon";
import { getInstagramEventLabel, useInbox } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";
import { formatFullDate, getInitials } from "@/utils/format";

const PROVIDER_NAMES = {
  gmail: "Gmail",
  outlook: "Outlook",
  instagram: "Instagram",
} as const;

export default function NotificationDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const { getNotification, getAccount, markSeen } = useInbox();

  const notification = id ? getNotification(id) : undefined;
  const account = notification ? getAccount(notification.accountId) : undefined;

  useEffect(() => {
    if (notification && !notification.isSeen) {
      markSeen(notification.id);
    }
  }, [notification, markSeen]);

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom + 80) + 24;

  if (!notification) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: colors.background, paddingTop: topInset + 16 },
        ]}
      >
        <View style={styles.headerRow}>
          <BackButton onPress={() => router.back()} />
        </View>
        <View style={styles.missing}>
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
          <Text style={[styles.missingText, { color: colors.foreground }]}>
            Signal not found
          </Text>
        </View>
      </View>
    );
  }

  const providerName = PROVIDER_NAMES[notification.provider];
  const isInstagram = notification.provider === "instagram";
  const eventKind = notification.instagramEventKind;

  const openInProvider = async () => {
    if (!notification.providerWebLink) return;
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => undefined);
    }
    try {
      await WebBrowser.openBrowserAsync(notification.providerWebLink);
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.headerRow, { paddingTop: topInset + 8 }]}>
        <BackButton onPress={() => router.back()} />
        <ProviderIcon provider={notification.provider} size={32} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subject, { color: colors.foreground }]}>
          {notification.subject}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.tagText, { color: colors.radarGreen }]}>
              {providerName}
            </Text>
          </View>
          {isInstagram && eventKind ? (
            <View
              style={[
                styles.tag,
                { backgroundColor: "rgba(225, 48, 108, 0.14)" },
              ]}
            >
              <Text style={[styles.tagText, { color: colors.instagram }]}>
                {getInstagramEventLabel(eventKind)}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {formatFullDate(notification.receivedAt)}
          </Text>
        </View>

        <View
          style={[
            styles.senderCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: isInstagram ? colors.instagram : colors.radarGreen },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: isInstagram ? "#FFFFFF" : colors.brandNavy },
              ]}
            >
              {getInitials(notification.senderName)}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.senderName, { color: colors.foreground }]}>
              {notification.senderName}
            </Text>
            <Text
              style={[styles.senderEmail, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {notification.senderEmail}
            </Text>
            <Text
              style={[styles.toLine, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {isInstagram ? "via" : "to"}{" "}
              {account?.emailAddress ?? notification.emailAddress}
            </Text>
          </View>
        </View>

        {notification.mediaCaption ? (
          <View
            style={[
              styles.mediaCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.mediaIconWrap, { backgroundColor: colors.secondary }]}
            >
              <Feather name="image" size={18} color={colors.instagram} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mediaLabel, { color: colors.mutedForeground }]}>
                Related post
              </Text>
              <Text
                style={[styles.mediaCaption, { color: colors.foreground }]}
                numberOfLines={2}
              >
                {notification.mediaCaption}
              </Text>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.bodyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.bodyLabel, { color: colors.mutedForeground }]}>
            {isInstagram ? "Event detail" : "Preview"}
          </Text>
          <Text style={[styles.bodyText, { color: colors.foreground }]}>
            {notification.bodyPreview ?? notification.snippet}
          </Text>
        </View>

        <Pressable
          onPress={openInProvider}
          disabled={!notification.providerWebLink}
          style={({ pressed }) => [
            styles.openBtn,
            {
              backgroundColor: colors.radarGreen,
              opacity: !notification.providerWebLink ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="external-link" size={18} color={colors.brandNavy} />
          <Text style={[styles.openBtnText, { color: colors.brandNavy }]}>
            Open in {providerName}
          </Text>
        </Pressable>

        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
          Marked as seen automatically when you open this view.
        </Text>
      </ScrollView>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [
        styles.backBtn,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Feather name="chevron-left" size={22} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 20,
  },
  subject: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  metaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  senderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  senderName: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  senderEmail: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  toLine: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 4,
  },
  mediaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  mediaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  mediaCaption: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  bodyCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 18,
  },
  bodyLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  bodyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 23,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  openBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  footnote: {
    textAlign: "center",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 4,
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
  },
  missingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
});
