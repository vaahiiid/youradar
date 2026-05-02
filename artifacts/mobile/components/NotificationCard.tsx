import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ProviderIcon } from "@/components/ProviderIcon";
import { useColors } from "@/hooks/useColors";
import type { EmailNotification } from "@/types";
import { formatRelativeTime } from "@/utils/format";

interface NotificationCardProps {
  item: EmailNotification;
  onPress: () => void;
}

export function NotificationCard({ item, onPress }: NotificationCardProps) {
  const colors = useColors();

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => undefined);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: item.isSeen ? colors.border : colors.primary,
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

          <Text style={[styles.account, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.emailAddress}
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
  account: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
