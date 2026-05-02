import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Provider } from "@/types";

interface ProviderIconProps {
  provider: Provider;
  size?: number;
}

export function ProviderIcon({ provider, size = 36 }: ProviderIconProps) {
  const colors = useColors();
  const radius = size / 2;
  const iconSize = size * 0.55;

  if (provider === "instagram") {
    return (
      <LinearGradient
        colors={["#F58529", "#DD2A7B", "#8134AF", "#515BD4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.wrap,
          { width: size, height: size, borderRadius: radius },
        ]}
      >
        <MaterialCommunityIcons name="instagram" size={iconSize} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  const bg = provider === "gmail" ? colors.gmail : colors.outlook;
  const iconName = provider === "gmail" ? "gmail" : "microsoft-outlook";

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius, backgroundColor: bg },
      ]}
    >
      <MaterialCommunityIcons name={iconName} size={iconSize} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
