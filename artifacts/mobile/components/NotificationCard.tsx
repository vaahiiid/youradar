import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ProviderIcon } from "@/components/ProviderIcon";
import { getInstagramEventLabel } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";
import type { EmailNotification, InstagramEventKind } from "@/types";
import { formatRelativeTime } from "@/utils/format";

interface NotificationCardProps {
  item: EmailNotification;
  onPress: () => void;
}

const INSTAGRAM_ICONS: Record<InstagramEventKind, keyof typeof Feather.glyphMap> = {
  dm: "send",
  comment: "message-circle",
  mention: "at-sign",
  insight: "trending-up",
  system: "shield",
};

export function NotificationCard({ item, onPress }: NotificationCardProps) {
  const colors = useColors();

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => undefined);
    }
    onPress();
  };

  const isInstagram = item.provider === "instagram";
  const eventKind = item.instagramEventKind;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: item.isSeen ? colors.border : colors.radarBlue,
          borderWidth: item.isSeen ? 1 : 1.5,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <ProviderIcon provider={item.provider} size={40} />
          {!item.isSeen ? (
            <View
              style={[
                styles.unreadDot,
                {
                  backgroundColor: colors.destructive,
                  borderColor: colors.card,
                },
              ]}
            />
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.sender,
                {
                  color: colors.foreground,
                  fontFamily: item.isSeen ? "Inter_500Medium" : "Inter_700Bold",
                },
              ]}
            >
              {item.senderName}
            </Text>
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {formatRelativeTime(item.receivedAt)}
            </Text>
          </View>

          {isInstagram && eventKind ? (
            <View style={styles.tagRow}>
              <View
                style={[
                  styles.tag,
                  { backgroundColor: "rgba(225, 48, 108, 0.16)" },
                ]}
              >
                <Feather
                  name={INSTAGRAM_ICONS[eventKind]}
                  size={10}
                  color={colors.instagram}
                />
                <Text style={[styles.tagText, { color: colors.instagram }]}>
                  {getInstagramEventLabel(eventKind)}
                </Text>
              </View>
              <Text style={[styles.handle, { color: colors.mutedForeground }]}>
                {item.senderEmail}
              </Text>
            </View>
          ) : null}

          <Text
            numberOfLines={1}
            style={[
              styles.subject,
              {
                color: colors.foreground,
                fontFamily: item.isSeen ? "Inter_400Regular" : "Inter_600SemiBold",
              },
            ]}
          >
            {item.subject}
          </Text>

          <Text
            numberOfLines={2}
            style={[styles.snippet, { color: colors.mutedForeground }]}
          >
            {item.snippet}
          </Text>

          {item.mediaCaption ? (
            <View
              style={[
                styles.mediaPreview,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="image" size={12} color={colors.mutedForeground} />
              <Text
                numberOfLines={1}
                style={[styles.mediaCaption, { color: colors.mutedForeground }]}
              >
                {item.mediaCaption}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.account, { color: colors.mutedForeground }]} numberOfLines={1}>
            {isInstagram ? `via ${item.emailAddress}` : item.emailAddress}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  iconWrap: {
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  sender: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  handle: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  subject: {
    fontSize: 14,
    marginBottom: 4,
  },
  snippet: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 8,
  },
  mediaPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  mediaCaption: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  account: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
