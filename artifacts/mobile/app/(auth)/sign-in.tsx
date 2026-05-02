import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Link, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { BrandLogo } from "@/components/BrandLogo";
import { RadarPulse } from "@/components/RadarPulse";
import colors from "@/constants/colors";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFFFFF"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c11.045 0 20-8.955 20-20 0-1.341-.138-2.65-.389-3.917z"
      />
    </Svg>
  );
}

export default function SignInLandingScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleGoogle = useCallback(async () => {
    try {
      setOauthLoading(true);
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: ({ session }) => {
            if (session?.currentTask) return;
            router.replace("/(tabs)");
          },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      Alert.alert("Sign-in failed", msg);
    } finally {
      setOauthLoading(false);
    }
  }, [startSSOFlow, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSpacer} />

        {/* Logo with subtle radar pulse behind */}
        <View style={styles.logoBlock}>
          <View
            style={styles.pulseWrap}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <RadarPulse size={220} rings={2} showSweep={false} />
          </View>
          <View style={styles.logoMask}>
            <BrandLogo height={48} />
          </View>
        </View>

        <Text style={styles.headline}>
          Stop checking everything. Let everything check in with you.
        </Text>
        <Text style={styles.subtext}>
          Connect your apps. See everything that matters in one place.
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              oauthLoading && styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
            onPress={handleGoogle}
            disabled={oauthLoading}
            accessibilityLabel="Continue with Google"
          >
            {oauthLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.btnInner}>
                <GoogleGlyph size={18} />
                <Text style={styles.primaryBtnText}>Continue with Google</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => router.push("/(auth)/sign-in-email")}
            accessibilityLabel="Continue with Email"
          >
            <Text style={styles.secondaryBtnText}>Continue with Email</Text>
          </Pressable>
        </View>

        <View style={styles.linksBlock}>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable hitSlop={8}>
              <Text style={styles.primaryLink}>Create an account</Text>
            </Pressable>
          </Link>
          <View style={styles.altLine}>
            <Text style={styles.altText}>Already have an account? </Text>
            <Link href="/(auth)/sign-in-email" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.altLink}>Log in</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.flexSpacer} />

        <View style={styles.trust}>
          <Text style={styles.trustText}>
            We never ask for your passwords. Your data is encrypted and only visible to you.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 28,
    alignItems: "center",
  },
  topSpacer: { height: 24 },
  logoBlock: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  pulseWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.32,
  },
  logoMask: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  headline: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    lineHeight: 30,
    color: colors.light.foreground,
    textAlign: "center",
    letterSpacing: -0.5,
    marginTop: 12,
    maxWidth: 360,
  },
  subtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: colors.light.mutedForeground,
    textAlign: "center",
    marginTop: 12,
    maxWidth: 320,
  },
  actions: {
    width: "100%",
    maxWidth: 360,
    marginTop: 36,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.light.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.light.primary,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryBtnText: {
    color: colors.light.primaryForeground,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: 0.1,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  secondaryBtnText: {
    color: colors.light.foreground,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: 0.1,
  },
  btnDisabled: { opacity: 0.6 },
  btnPressed: { opacity: 0.88 },
  linksBlock: {
    width: "100%",
    alignItems: "center",
    marginTop: 24,
    gap: 10,
  },
  primaryLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: colors.light.primary,
    letterSpacing: 0.1,
    paddingVertical: 4,
  },
  altLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  altText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: colors.light.mutedForeground,
  },
  altLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: colors.light.foreground,
  },
  flexSpacer: { flexGrow: 1, minHeight: 24 },
  trust: {
    width: "100%",
    maxWidth: 360,
    paddingTop: 16,
    alignItems: "center",
  },
  trustText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: colors.light.mutedForeground,
    textAlign: "center",
  },
});
