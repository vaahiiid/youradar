import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ProviderIcon } from "@/components/ProviderIcon";
import { getInstagramEventLabel } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";
import {
  PROVIDER_LABELS,
  type EmailNotification,
  type InstagramEventKind,
  type Provider,
} from "@/types";
import { formatRelativeTime } from "@/utils/format";

interface NotificationCardProps {
  item: EmailNotification;
  onPress: () => void;
  /**
   * Friendly source label (e.g. "Personal Gmail") shown when more than one
   * account exists for this provider so the user can tell sources apart.
   * When omitted, only the raw email/handle is shown.
   */
  sourceLabel?: string;
}

const INSTAGRAM_ICONS: Record<InstagramEventKind, keyof typeof Feather.glyphMap> = {
  dm: "send",
  comment: "message-circle",
  mention: "at-sign",
  insight: "trending-up",
  system: "shield",
};

function getProviderTagColor(
  provider: Provider,
  colors: ReturnType<typeof useColors>,
): string {
  switch (provider) {
    case "gmail":
      return colors.gmail;
    case "outlook":
      return colors.outlook;
    case "yahoo":
      return colors.yahoo;
    case "aol":
      return colors.aol;
    case "hotmail":
      return colors.hotmail;
    case "instagram":
      return colors.instagram;
    case "linkedin":
      return colors.linkedin;
    case "facebook":
      return colors.facebook;
    case "telegram":
      return colors.telegram;
    case "whatsapp":
      return colors.whatsapp;
    case "tiktok":
      return colors.tiktok;
    case "x":
      return colors.x;
    case "evri":
      return colors.evri;
    case "dpd":
      return colors.dpd;
    case "royalmail":
      return colors.royalmail;
    case "amazon":
      return colors.amazon;
  }
}

const DELIVERY_STATUS_LABEL: Record<string, string> = {
  added: "Added",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delayed: "Delayed",
  exception: "Exception",
  unknown: "Unknown",
};

export function NotificationCard({ item, onPress, sourceLabel }: NotificationCardProps) {
  const colors = useColors();

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => undefined);
    }
    onPress();
  };

  const isInstagram = item.provider === "instagram";
  const eventKind = item.instagramEventKind;
  const providerColor = getProviderTagColor(item.provider, colors);
  const isHandleProvider =
    isInstagram ||
    item.provider === "linkedin" ||
    item.provider === "telegram" ||
    item.provider === "tiktok" ||
    item.provider === "x";
  const isDelivery =
    item.provider === "evri" ||
    item.provider === "dpd" ||
    item.provider === "royalmail" ||
    item.provider === "amazon";
  const deliveryStatusLabel = item.deliveryStatus
    ? DELIVERY_STATUS_LABEL[item.deliveryStatus] ?? item.deliveryStatus
    : null;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: item.isSeen ? colors.border : colors.radarBlue,
          borderWidth: 1,
          opacity: pressed ? 0.85 : 1,
        },
        !item.isSeen && styles.cardUnread,
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

          <View style={styles.tagRow}>
            <View
              style={[
                styles.providerTag,
                { backgroundColor: providerColor + "1F" },
              ]}
            >
              <View
                style={[styles.providerDot, { backgroundColor: providerColor }]}
              />
              <Text style={[styles.providerTagText, { color: providerColor }]}>
                {PROVIDER_LABELS[item.provider]}
              </Text>
            </View>
            {isInstagram && eventKind ? (
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
            ) : null}
            {isDelivery && deliveryStatusLabel ? (
              <View
                style={[
                  styles.tag,
                  { backgroundColor: providerColor + "1F" },
                ]}
              >
                <Feather name="package" size={10} color={providerColor} />
                <Text style={[styles.tagText, { color: providerColor }]}>
                  {deliveryStatusLabel}
                </Text>
              </View>
            ) : null}
          </View>

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
            {sourceLabel && sourceLabel !== item.emailAddress
              ? `${sourceLabel} · ${item.emailAddress}`
              : isDelivery
                ? `tracking ${item.emailAddress}`
                : isHandleProvider
                  ? `via ${item.emailAddress}`
                  : item.emailAddress}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#544f4d",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardUnread: {
    shadowColor: "#0097b2",
    shadowOpacity: 0.15,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 0 },
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
    marginBottom: 4,
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
    gap: 6,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  providerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  providerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  providerTagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
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
