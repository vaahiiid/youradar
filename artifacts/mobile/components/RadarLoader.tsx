import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { BrandLogo } from "@/components/BrandLogo";
import { RadarPulse } from "@/components/RadarPulse";
import { useColors } from "@/hooks/useColors";
import { useInbox } from "@/context/InboxContext";

interface RadarLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  showLogo?: boolean;
  style?: ViewStyle;
}

const SIZES = {
  sm: { radar: 96, logo: 14, fontSize: 12 },
  md: { radar: 160, logo: 18, fontSize: 13 },
  lg: { radar: 220, logo: 26, fontSize: 14 },
};

export function RadarLoader({
  message = "Scanning your signals...",
  size = "md",
  showLogo = true,
  style,
}: RadarLoaderProps) {
  const colors = useColors();
  const { settings } = useInbox();
  const dim = SIZES[size];

  return (
    <View style={[styles.wrap, style]}>
      <View style={{ width: dim.radar, height: dim.radar, alignItems: "center", justifyContent: "center" }}>
        <RadarPulse
          size={dim.radar}
          rings={size === "sm" ? 2 : 3}
          reducedMotion={settings.reducedMotion}
        />
        {showLogo ? (
          <View
            style={[
              styles.logoBadge,
              { backgroundColor: "rgba(20, 26, 48, 0.78)", borderColor: "rgba(47, 128, 237, 0.45)" },
            ]}
            pointerEvents="none"
          >
            <BrandLogo height={dim.logo} tintColor={colors.offWhite} />
          </View>
        ) : null}
      </View>
      {message ? (
        <Text style={[styles.message, { color: colors.coolGrey, fontSize: dim.fontSize }]}>
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
    gap: 14,
    paddingVertical: 24,
  },
  logoBadge: {
    position: "absolute",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  message: {
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.4,
    textAlign: "center",
  },
});
