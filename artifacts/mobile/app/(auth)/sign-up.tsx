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
import { useSignUp, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Link, useRouter } from "expo-router";

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

export default function SignUpScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    setSubmitError(null);
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      setSubmitError(error.message ?? "Could not start sign-up");
      return;
    }
    await signUp.verifications.sendEmailCode();
  }, [emailAddress, password, signUp]);

  const handleVerify = useCallback(async () => {
    setSubmitError(null);
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session }) => {
          if (session?.currentTask) return;
          router.replace("/(tabs)");
        },
      });
    } else {
      setSubmitError("Verification incomplete. Please try again.");
    }
  }, [code, signUp, router]);

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
      const msg = err instanceof Error ? err.message : "Google sign-up failed";
      Alert.alert("Sign-up failed", msg);
    } finally {
      setOauthLoading(false);
    }
  }, [startSSOFlow, router]);

  const busy = fetchStatus === "fetching" || oauthLoading;
  const needsVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

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

        {needsVerification ? (
          <>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to {emailAddress}.
            </Text>

            <Text style={styles.label}>Verification code</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor={colors.light.mutedForeground}
              value={code}
              onChangeText={setCode}
            />
            {errors.fields.code && (
              <Text style={styles.error}>{errors.fields.code.message}</Text>
            )}
            {submitError && <Text style={styles.error}>{submitError}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                (busy || code.length < 4) && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
              onPress={handleVerify}
              disabled={busy || code.length < 4}
            >
              {fetchStatus === "fetching" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => signUp.verifications.sendEmailCode()}
              style={styles.resendBtn}
            >
              <Text style={styles.linkText}>Resend code</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Get smarter notifications across all your inboxes.
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
            {errors.fields.emailAddress && (
              <Text style={styles.error}>
                {errors.fields.emailAddress.message}
              </Text>
            )}

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              autoComplete="new-password"
              secureTextEntry
              placeholder="At least 8 characters"
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
              onPress={handleStart}
              disabled={busy || !emailAddress || !password}
            >
              {fetchStatus === "fetching" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Create account</Text>
              )}
            </Pressable>

            {/* Required for sign-up flows. Clerk's bot protection is on by default. */}
            <View nativeID="clerk-captcha" />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/sign-in" asChild>
                <Pressable>
                  <Text style={styles.linkText}>Sign in</Text>
                </Pressable>
              </Link>
            </View>
          </>
        )}
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
  resendBtn: { alignSelf: "center", marginTop: 16, padding: 8 },
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
