import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import {
  Badge as NTBadge,
  Icon,
  Label,
  NativeTabs,
} from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { Badge } from "@/components/Badge";
import { CustomTabBar } from "@/components/CustomTabBar";
import { useInbox } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  const { unseenTotal } = useInbox();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "dot.radiowaves.left.and.right", selected: "dot.radiowaves.left.and.right" }} />
        <Label>Radar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>Alerts</Label>
        {unseenTotal > 0 ? (
          <NTBadge>{unseenTotal > 99 ? "99+" : String(unseenTotal)}</NTBadge>
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="accounts">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Sources</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { unseenTotal } = useInbox();

  return (
    <Tabs
      tabBar={isWeb ? (props) => <CustomTabBar {...props} /> : undefined}
      screenOptions={{
        tabBarActiveTintColor: colors.radarBlue,
        tabBarInactiveTintColor: colors.coolGrey,
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          elevation: 0,
        },
        tabBarItemStyle: {
          backgroundColor: "transparent",
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Radar",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView
                name="dot.radiowaves.left.and.right"
                tintColor={color}
                size={24}
              />
            ) : (
              <Feather name="radio" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => (
            <View>
              {isIOS ? (
                <SymbolView name="bell" tintColor={color} size={24} />
              ) : (
                <Feather name="bell" size={22} color={color} />
              )}
              {unseenTotal > 0 ? (
                <Badge
                  count={unseenTotal}
                  size="sm"
                  style={{ position: "absolute", top: -6, right: -10 }}
                />
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Sources",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={24} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gearshape" tintColor={color} size={24} />
            ) : (
              <Feather name="settings" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
