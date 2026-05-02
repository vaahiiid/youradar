import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/BrandLogo";
import { RadarPulse } from "@/components/RadarPulse";
import { useColors } from "@/hooks/useColors";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  showBrand?: boolean;
  /** Tone down the screen heading when the brand is the primary mark. */
  compactTitle?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  right,
  showBrand,
  compactTitle,
}: ScreenHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset + 8 }]}>
      {showBrand ? (
        <View style={styles.brandRow}>
          <View style={styles.brandLeft}>
            <View style={styles.miniRadar}>
              <RadarPulse size={36} rings={2} showSweep={false} />
            </View>
            <BrandLogo height={32} />
          </View>
          {right}
        </View>
      ) : null}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              compactTitle ? styles.titleCompact : styles.title,
              { color: colors.foreground },
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {!showBrand ? right : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  brandLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  miniRadar: {
    width: 36,
    height: 36,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  titleCompact: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
