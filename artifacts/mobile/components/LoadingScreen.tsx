import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BrandLogo } from "@/components/BrandLogo";
import { RadarPulse } from "@/components/RadarPulse";
import colors from "@/constants/colors";
import { useInbox } from "@/context/InboxContext";

interface LoadingScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export function LoadingScreen({ onComplete, durationMs = 2400 }: LoadingScreenProps) {
  const { settings } = useInbox();
  const [percent, setPercent] = useState(0);
  const [osReducedMotion, setOsReducedMotion] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const completedRef = useRef(false);
  const reducedMotion = osReducedMotion || settings.reducedMotion;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setOsReducedMotion(v);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      setPercent(Math.min(100, Math.round(value)));
    });

    const progressTiming = Animated.timing(progressAnim, {
      toValue: 100,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    let fadeTiming: Animated.CompositeAnimation | null = null;

    progressTiming.start(({ finished }) => {
      if (!finished || completedRef.current) return;
      completedRef.current = true;
      fadeTiming = Animated.timing(fade, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      });
      fadeTiming.start(({ finished: fadeFinished }) => {
        if (fadeFinished) onComplete();
      });
    });

    return () => {
      progressAnim.removeListener(listenerId);
      progressTiming.stop();
      if (fadeTiming) fadeTiming.stop();
    };
  }, [durationMs, fade, progressAnim, onComplete]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      <View style={styles.center}>
        <View style={styles.radarStack}>
          <RadarPulse size={300} reducedMotion={reducedMotion} />
          <View style={styles.logoBadge} pointerEvents="none">
            <BrandLogo height={36} tintColor={colors.dark.offWhite} />
          </View>
        </View>

        <Text style={styles.tagline}>Every signal, on your radar</Text>

        <Text style={styles.percent}>{percent}%</Text>

        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
          <Animated.View
            style={[
              styles.barGlow,
              {
                width: barWidth,
                opacity: reducedMotion ? 0.4 : 0.85,
              },
            ]}
          />
        </View>

        <View style={styles.dotsRow}>
          <View style={[styles.dot, { opacity: percent > 20 ? 1 : 0.25 }]} />
          <View style={[styles.dot, { opacity: percent > 50 ? 1 : 0.25 }]} />
          <View style={[styles.dot, { opacity: percent > 80 ? 1 : 0.25 }]} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>powered by you group</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.dark.brandNavy,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  radarStack: {
    width: 300,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadge: {
    position: "absolute",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(20, 26, 48, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(47, 128, 237, 0.45)",
    shadowColor: "#2F80ED",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    color: colors.dark.coolGrey,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.4,
    marginTop: 24,
  },
  percent: {
    color: colors.dark.offWhite,
    fontFamily: "Inter_700Bold",
    fontSize: 38,
    letterSpacing: -1,
    marginTop: 16,
    marginBottom: 14,
    fontVariant: ["tabular-nums"],
  },
  barTrack: {
    width: 220,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(167, 176, 192, 0.18)",
    overflow: "hidden",
    position: "relative",
  },
  barFill: {
    height: "100%",
    backgroundColor: colors.dark.radarBlue,
    borderRadius: 3,
  },
  barGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: colors.dark.softCyan,
    borderRadius: 3,
    shadowColor: colors.dark.softCyan,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dark.softCyan,
  },
  footer: {
    position: "absolute",
    bottom: 48,
    alignItems: "center",
  },
  footerText: {
    color: colors.dark.coolGrey,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "lowercase",
  },
});
