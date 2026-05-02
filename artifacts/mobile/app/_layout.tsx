import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/LoadingScreen";
import colors from "@/constants/colors";
import { InboxProvider } from "@/context/InboxContext";
import { Platform } from "react-native";

SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync(colors.light.background).catch(() => undefined);

if (Platform.OS === "web" && typeof document !== "undefined") {
  const STYLE_ID = "yourradar-global-reset";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.innerHTML = `
      *, *::before, *::after { box-sizing: border-box; }
      html, body, #root {
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        margin: 0;
        padding: 0;
        background-color: #FFFFFF;
      }
      body {
        min-height: 100dvh;
        -webkit-text-size-adjust: 100%;
        -webkit-tap-highlight-color: transparent;
      }
      *:focus, *:focus-visible, *:focus-within { outline: none !important; }
      button, [role="button"], a, [tabindex] {
        outline: none !important;
        -webkit-tap-highlight-color: transparent;
      }
      button:focus, button:focus-visible, button:focus-within,
      [role="button"]:focus, [role="button"]:focus-visible, [role="button"]:focus-within,
      a:focus, a:focus-visible {
        outline: none !important;
        box-shadow: none !important;
        border-color: inherit;
      }
    `;
    document.head.appendChild(style);
  }
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: colors.light.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="notification/[id]"
        options={{
          headerShown: false,
          presentation: "card",
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView
            style={{ flex: 1, backgroundColor: colors.light.background }}
          >
            <KeyboardProvider>
              <InboxProvider>
                <StatusBar style="dark" />
                <RootLayoutNav />
                {!bootDone ? (
                  <LoadingScreen onComplete={() => setBootDone(true)} />
                ) : null}
              </InboxProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
