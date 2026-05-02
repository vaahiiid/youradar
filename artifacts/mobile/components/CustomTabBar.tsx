import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/Badge";
import { useInbox } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";

type IconName = keyof typeof Feather.glyphMap;

const TAB_ICONS: Record<string, IconName> = {
  index: "radio",
  notifications: "bell",
  accounts: "users",
  settings: "settings",
};

const TAB_LABELS: Record<string, string> = {
  index: "Radar",
  notifications: "Alerts",
  accounts: "Sources",
  settings: "Settings",
};

interface TabRoute {
  key: string;
  name: string;
  params?: object;
}

interface CustomTabBarProps {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
}

export function CustomTabBar({ state, navigation }: CustomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unseenTotal } = useInbox();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          paddingBottom: insets.bottom,
          height: 64 + insets.bottom,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const iconName = TAB_ICONS[route.name] ?? "circle";
        const label = TAB_LABELS[route.name] ?? route.name;
        const tint = isFocused ? colors.brandTealDeep : "#8A8A8A";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const showBadge = route.name === "notifications" && unseenTotal > 0;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            android_ripple={null}
            focusable={false}
            {...({ tabIndex: -1 } as object)}
            onPressIn={
              Platform.OS === "web"
                ? (e) => {
                    const target = e?.currentTarget as
                      | { blur?: () => void }
                      | undefined;
                    target?.blur?.();
                  }
                : undefined
            }
            style={({ pressed }) => [
              styles.item,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.iconWrap}>
              <Feather name={iconName} size={22} color={tint} />
              {showBadge ? (
                <Badge
                  count={unseenTotal}
                  size="sm"
                  style={styles.badge}
                />
              ) : null}
            </View>
            <Text style={[styles.label, { color: tint }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    borderTopWidth: 1,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 8,
  },
  iconWrap: {
    position: "relative",
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
