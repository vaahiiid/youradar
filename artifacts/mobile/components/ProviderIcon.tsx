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

type MciName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export function ProviderIcon({ provider, size = 36 }: ProviderIconProps) {
  const colors = useColors();
  const radius = size / 2;
  const iconSize = size * 0.55;

  // Instagram uses the multi-stop brand gradient.
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

  if (provider === "x") {
    return (
      <View
        style={[
          styles.wrap,
          { width: size, height: size, borderRadius: radius, backgroundColor: colors.x },
        ]}
      >
        <Text style={[styles.xGlyph, { fontSize: iconSize * 1.05 }]}>𝕏</Text>
      </View>
    );
  }

  if (provider === "aol") {
    return (
      <View
        style={[
          styles.wrap,
          { width: size, height: size, borderRadius: radius, backgroundColor: colors.aol },
        ]}
      >
        <Text style={[styles.textGlyph, { fontSize: iconSize * 0.7 }]}>AOL</Text>
      </View>
    );
  }

  let bg: string = colors.gmail;
  let iconName: MciName = "gmail";
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
    case "yahoo":
      bg = colors.yahoo;
      iconName = "yahoo";
      break;
    case "hotmail":
      bg = colors.hotmail;
      iconName = "email";
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
    case "evri":
      bg = colors.evri;
      iconName = "package-variant";
      break;
    case "dpd":
      bg = colors.dpd;
      iconName = "truck-fast";
      break;
    case "royalmail":
      bg = colors.royalmail;
      iconName = "email-fast";
      break;
    case "amazon":
      bg = colors.amazon;
      useFontAwesome = true;
      faName = "amazon";
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
  xGlyph: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
    lineHeight: undefined,
  },
  textGlyph: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
