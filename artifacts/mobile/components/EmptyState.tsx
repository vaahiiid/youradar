import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { BrandLogo } from "@/components/BrandLogo";
import { RadarPulse } from "@/components/RadarPulse";
import { useColors } from "@/hooks/useColors";
import { useInbox } from "@/context/InboxContext";

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
  variant?: "radar" | "icon";
}

export function EmptyState({
  icon = "inbox",
  title,
  message,
  variant = "radar",
}: EmptyStateProps) {
  const colors = useColors();
  const { settings } = useInbox();

  return (
    <View style={styles.wrap}>
      {variant === "radar" ? (
        <View style={styles.radarStack}>
          <RadarPulse size={140} rings={3} reducedMotion={settings.reducedMotion} />
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: "#FFFFFF",
                borderColor: "rgba(0, 151, 178, 0.25)",
              },
            ]}
            pointerEvents="none"
          >
            <BrandLogo height={24} />
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Feather name={icon} size={28} color={colors.primary} />
        </View>
      )}
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 10,
  },
  radarStack: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  logoBadge: {
    position: "absolute",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
});
