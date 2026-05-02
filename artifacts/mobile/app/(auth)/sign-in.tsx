import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSignIn, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useRouter, Link } from "expo-router";

import { BrandLogo } from "@/components/BrandLogo";
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

export default function SignInScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) {
      setSubmitError(error.message ?? "Could not sign in");
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session }) => {
          if (session?.currentTask) return;
          router.replace("/(tabs)");
        },
      });
    } else {
      setSubmitError("Sign-in incomplete. Please try again.");
    }
  }, [emailAddress, password, signIn, router]);

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

  const busy = fetchStatus === "fetching" || oauthLoading;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <BrandLogo height={36} />
        </View>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to keep your inbox on the radar.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.googleBtn,
            (busy || pressed) && styles.btnPressed,
          ]}
          onPress={handleGoogle}
          disabled={busy}
        >
          {oauthLoading ? (
            <ActivityIndicator color={colors.light.foreground} />
          ) : (
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.light.mutedForeground}
          value={emailAddress}
          onChangeText={setEmailAddress}
        />
        {errors.fields.identifier && (
          <Text style={styles.error}>{errors.fields.identifier.message}</Text>
        )}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          autoComplete="current-password"
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.light.mutedForeground}
          value={password}
          onChangeText={setPassword}
        />
        {errors.fields.password && (
          <Text style={styles.error}>{errors.fields.password.message}</Text>
        )}
        {submitError && <Text style={styles.error}>{submitError}</Text>}

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            (busy || !emailAddress || !password) && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
          onPress={handleSubmit}
          disabled={busy || !emailAddress || !password}
        >
          {fetchStatus === "fetching" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Sign in</Text>
          )}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New to YourRadar? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text style={styles.linkText}>Create an account</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.light.background },
  scroll: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 48,
  },
  logoWrap: { alignItems: "flex-start", marginBottom: 32 },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.light.input,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
  },
  error: {
    color: colors.light.destructive,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  primaryBtnText: {
    color: colors.light.primaryForeground,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  googleBtn: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.light.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  googleBtnText: {
    color: colors.light.foreground,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.light.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.light.mutedForeground,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    fontSize: 14,
  },
  linkText: {
    fontFamily: "Inter_600SemiBold",
    color: colors.light.primary,
    fontSize: 14,
  },
});
