import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface RadarPulseProps {
  size: number;
  rings?: number;
  reducedMotion?: boolean;
  style?: ViewStyle;
  showSweep?: boolean;
}

export function RadarPulse({
  size,
  rings = 3,
  reducedMotion = false,
  style,
  showSweep = true,
}: RadarPulseProps) {
  const colors = useColors();
  const sweep = useRef(new Animated.Value(0)).current;
  const ringAnims = useRef(
    Array.from({ length: rings }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (reducedMotion) return;
    const sweepLoop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    sweepLoop.start();

    const ringLoops = ringAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 700),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    ringLoops.forEach((l) => l.start());

    return () => {
      sweepLoop.stop();
      ringLoops.forEach((l) => l.stop());
    };
  }, [reducedMotion, ringAnims, sweep]);

  const sweepRotate = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {ringAnims.map((anim, i) => {
        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.15, 1],
          outputRange: [0, 0.85, 0],
        });
        return (
          <Animated.View
            key={i}
            style={[
              StyleSheet.absoluteFillObject,
              styles.ring,
              {
                borderColor: colors.radarBlue,
                opacity: reducedMotion ? 0.4 : opacity,
                transform: [{ scale: reducedMotion ? 0.85 : scale }],
                borderRadius: size / 2,
              },
            ]}
          />
        );
      })}

      <View
        style={[
          StyleSheet.absoluteFillObject,
          styles.staticRing,
          { borderColor: "rgba(47, 128, 237, 0.55)", borderRadius: size / 2 },
        ]}
      />
      <View
        style={[
          styles.innerRing,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: (size * 0.7) / 2,
            borderColor: "rgba(47, 128, 237, 0.45)",
            top: size * 0.15,
            left: size * 0.15,
          },
        ]}
      />
      <View
        style={[
          styles.innerRing,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: (size * 0.4) / 2,
            borderColor: "rgba(86, 204, 242, 0.55)",
            top: size * 0.3,
            left: size * 0.3,
          },
        ]}
      />

      {/* Cross-hair grid */}
      <View
        style={[
          styles.gridLine,
          {
            width: size,
            height: 1,
            top: size / 2 - 0.5,
            backgroundColor: "rgba(47, 128, 237, 0.18)",
          },
        ]}
      />
      <View
        style={[
          styles.gridLine,
          {
            width: 1,
            height: size,
            left: size / 2 - 0.5,
            backgroundColor: "rgba(47, 128, 237, 0.18)",
          },
        ]}
      />

      {showSweep && !reducedMotion ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { transform: [{ rotate: sweepRotate }] },
          ]}
        >
          <View
            style={[
              styles.sweepHalf,
              {
                width: size / 2,
                height: 2,
                left: size / 2,
                top: size / 2 - 1,
                backgroundColor: colors.radarBlue,
                shadowColor: colors.softCyan,
              },
            ]}
          />
          <View
            style={[
              styles.sweepWedge,
              {
                width: size / 2,
                height: size / 2,
                left: size / 2,
                top: size / 2 - size / 2,
                borderTopRightRadius: size / 2,
                backgroundColor: "rgba(47, 128, 237, 0.18)",
              },
            ]}
          />
        </Animated.View>
      ) : null}

      <View
        style={[
          styles.signalDot,
          {
            top: size * 0.25,
            left: size * 0.7,
            backgroundColor: colors.radarBlue,
            shadowColor: colors.radarBlue,
          },
        ]}
      />
      <View
        style={[
          styles.signalDot,
          {
            top: size * 0.6,
            left: size * 0.18,
            backgroundColor: colors.softCyan,
            shadowColor: colors.softCyan,
          },
        ]}
      />
      <View
        style={[
          styles.signalDot,
          {
            top: size * 0.78,
            left: size * 0.62,
            backgroundColor: colors.violetAccent,
            shadowColor: colors.violetAccent,
            opacity: 0.85,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ring: {
    borderWidth: 1.5,
  },
  staticRing: {
    borderWidth: 1.25,
  },
  innerRing: {
    position: "absolute",
    borderWidth: 1.25,
  },
  gridLine: {
    position: "absolute",
  },
  sweepHalf: {
    position: "absolute",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  sweepWedge: {
    position: "absolute",
  },
  signalDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
