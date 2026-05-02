import { Image, ImageStyle } from "expo-image";
import React from "react";
import { StyleProp } from "react-native";

const wordmark = require("@/assets/images/youradar-wordmark.png");

// New YourRadar logo: charcoal "You" + teal "Radar". The image is full-color
// (charcoal #544f4d + teal #0097b2) and is rendered untinted by default so the
// brand colors come through. Pass `tintColor` only for monochrome contexts
// (e.g. printing on a dark background).
interface BrandLogoProps {
  height?: number;
  style?: StyleProp<ImageStyle>;
  tintColor?: string;
}

// Keep the original logo aspect ratio (matches both the old and new artwork).
const ASPECT = 4375 / 1238;

export function BrandLogo({ height = 28, style, tintColor }: BrandLogoProps) {
  const width = height * ASPECT;
  return (
    <Image
      source={wordmark}
      style={[{ height, width }, style]}
      contentFit="contain"
      tintColor={tintColor}
    />
  );
}
