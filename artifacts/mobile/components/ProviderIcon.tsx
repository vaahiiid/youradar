import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

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

  if (provider === "tiktok") {
    return (
      <View
        style={[
          styles.wrap,
          { width: size, height: size, borderRadius: radius, backgroundColor: "#010101" },
        ]}
      >
        <Text style={[styles.tiktokGlyph, { fontSize: iconSize * 1.1 }]}>♪</Text>
      </View>
    );
  }

  let bg = colors.gmail;
  let iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"] = "gmail";
  let useFontAwesome = false;
  let faName: React.ComponentProps<typeof FontAwesome5>["name"] = "envelope";

  switch (provider) {
    case "gmail":
      bg = colors.gmail;
      iconName = "gmail";
      break;
    case "outlook":
      bg = colors.outlook;
      iconName = "microsoft-outlook";
      break;
    case "linkedin":
      bg = colors.linkedin;
      iconName = "linkedin";
      break;
    case "facebook":
      bg = colors.facebook;
      iconName = "facebook";
      break;
    case "telegram":
      bg = colors.telegram;
      iconName = "send";
      break;
    case "whatsapp":
      bg = colors.whatsapp;
      iconName = "whatsapp";
      break;
  }

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius, backgroundColor: bg },
      ]}
    >
      {useFontAwesome ? (
        <FontAwesome5 name={faName} size={iconSize * 0.85} color="#FFFFFF" />
      ) : (
        <MaterialCommunityIcons name={iconName} size={iconSize} color="#FFFFFF" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  tiktokGlyph: {
    color: "#FE2C55",
    fontFamily: "Inter_700Bold",
    lineHeight: undefined,
    fontWeight: "900",
  },
});
