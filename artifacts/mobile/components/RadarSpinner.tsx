import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";

import colors from "@/constants/colors";

interface RadarSpinnerProps {
  size?: number;
  color?: string;
  reducedMotion?: boolean;
  style?: ViewStyle;
}

export function RadarSpinner({
  size = 18,
  color = colors.dark.softCyan,
  reducedMotion = false,
  style,
}: RadarSpinnerProps) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, sweep]);

  const rotate = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color + "55",
        },
        style,
      ]}
    >
      <View
        style={[
          styles.innerRing,
          {
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: (size * 0.5) / 2,
            borderColor: color + "33",
            top: size * 0.25 - 1,
            left: size * 0.25 - 1,
          },
        ]}
      />
      {!reducedMotion ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { transform: [{ rotate }] },
          ]}
          pointerEvents="none"
        >
          <View
            style={{
              position: "absolute",
              left: size / 2,
              top: size / 2 - 0.75,
              width: size / 2 - 1,
              height: 1.5,
              backgroundColor: color,
              shadowColor: color,
              shadowOpacity: 1,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          <View
            style={{
              position: "absolute",
              left: size - 3,
              top: size / 2 - 1.5,
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: color,
              shadowColor: color,
              shadowOpacity: 1,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        </Animated.View>
      ) : (
        <View
          style={{
            position: "absolute",
            left: size / 2,
            top: size / 2 - 0.75,
            width: size / 2 - 1,
            height: 1.5,
            backgroundColor: color,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  innerRing: {
    position: "absolute",
    borderWidth: 1,
  },
});
