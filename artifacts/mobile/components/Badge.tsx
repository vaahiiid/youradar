import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface BadgeProps {
  count: number;
  style?: ViewStyle;
  size?: "sm" | "md";
}

export function Badge({ count, style, size = "md" }: BadgeProps) {
  const colors = useColors();
  if (count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);
  const dim = size === "sm" ? 18 : 22;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.destructive,
          minWidth: dim,
          height: dim,
          borderRadius: dim / 2,
          paddingHorizontal: count > 9 ? 6 : 0,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colors.destructiveForeground, fontSize: size === "sm" ? 11 : 12 },
        ]}
      >
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: "Inter_700Bold",
    lineHeight: 14,
  },
});
