import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useInbox } from "@/context/InboxContext";

interface ScanSkeletonProps {
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function ScanSkeleton({
  height = 72,
  borderRadius = 18,
  style,
}: ScanSkeletonProps) {
  const colors = useColors();
  const { settings } = useInbox();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (settings.reducedMotion) return;
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [settings.reducedMotion, sweep]);

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 360],
  });

  return (
    <View
      style={[
        styles.wrap,
        {
          height,
          borderRadius,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {!settings.reducedMotion ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.scanLine,
            {
              transform: [{ translateX }, { skewX: "-20deg" }],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 10,
  },
  scanLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 120,
    backgroundColor: "rgba(86, 204, 242, 0.12)",
  },
});
