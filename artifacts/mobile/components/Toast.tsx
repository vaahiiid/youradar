import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProviderIcon } from "@/components/ProviderIcon";
import { useColors } from "@/hooks/useColors";
import { PROVIDER_LABELS, type EmailNotification } from "@/types";

interface ToastProps {
  notification: EmailNotification | null;
  onPress: () => void;
  onDismiss: () => void;
}

export function Toast({ notification, onPress, onDismiss }: ToastProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const translate = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    if (!notification) return;
    Animated.spring(translate, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(translate, {
        toValue: -200,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDismiss();
      });
    }, 3500);
    return () => clearTimeout(timer);
  }, [notification, translate, onDismiss]);

  if (!notification) return null;
  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const providerLabel = PROVIDER_LABELS[notification.provider];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        { top: topInset + 8, transform: [{ translateY: translate }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.toast,
          {
            backgroundColor: colors.card,
            borderColor: colors.primary,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={[styles.accent, { backgroundColor: colors.destructive }]} />
        <ProviderIcon provider={notification.provider} size={36} />
        <View style={styles.body}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: colors.foreground }]}
          >
            New {providerLabel} signal · {notification.senderName}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.subject, { color: colors.mutedForeground }]}
          >
            {notification.subject}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: "#544f4d",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  subject: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
