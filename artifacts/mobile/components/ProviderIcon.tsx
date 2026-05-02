import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  const bg = provider === "gmail" ? colors.gmail : colors.outlook;
  const iconName = provider === "gmail" ? "gmail" : "microsoft-outlook";
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <MaterialCommunityIcons
        name={iconName}
        size={size * 0.55}
        color="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
