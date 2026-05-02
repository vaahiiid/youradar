import { Image, ImageStyle } from "expo-image";
import React from "react";
import { StyleProp } from "react-native";

const wordmark = require("@/assets/images/youradar-wordmark.png");

interface BrandLogoProps {
  height?: number;
  style?: StyleProp<ImageStyle>;
  tintColor?: string;
}

export function BrandLogo({ height = 28, style, tintColor }: BrandLogoProps) {
  const width = height * (1024 / 280);
  return (
    <Image
      source={wordmark}
      style={[{ height, width }, style]}
      contentFit="contain"
      tintColor={tintColor}
    />
  );
}
