import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ProviderIcon } from "@/components/ProviderIcon";
import { useColors } from "@/hooks/useColors";
import type { ConnectedAccount, Provider } from "@/types";

interface ConnectAccountSheetProps {
  visible: boolean;
  provider: Provider | null;
  onClose: () => void;
  onConnect: (
    provider: Provider,
    handleOrEmail: string,
    extras?: { instagramKind?: ConnectedAccount["instagramKind"] },
  ) => void;
}

const KIND_OPTIONS: { id: ConnectedAccount["instagramKind"]; label: string }[] = [
  { id: "creator", label: "Creator" },
  { id: "business", label: "Business" },
  { id: "professional", label: "Professional" },
];

export function ConnectAccountSheet({
  visible,
  provider,
  onClose,
  onConnect,
}: ConnectAccountSheetProps) {
  const colors = useColors();
  const [value, setValue] = useState("");
  const [kind, setKind] =
    useState<ConnectedAccount["instagramKind"]>("creator");

  const reset = () => {
    setValue("");
    setKind("creator");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const isInstagram = provider === "instagram";

  const isValid = isInstagram
    ? value.trim().length >= 2
    : value.trim().includes("@");

  const handleConnect = () => {
    if (!provider || !isValid) return;
    onConnect(
      provider,
      value.trim(),
      isInstagram ? { instagramKind: kind } : undefined,
    );
    reset();
    onClose();
  };

  if (!provider) return null;
  const providerName =
    provider === "gmail"
      ? "Gmail"
      : provider === "outlook"
        ? "Outlook"
        : "Instagram";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kbWrap}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.handle}>
              <View
                style={[styles.handleBar, { backgroundColor: colors.border }]}
              />
            </View>

            <View style={styles.headerRow}>
              <ProviderIcon provider={provider} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.foreground }]}>
                  Connect {providerName}
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.mutedForeground }]}
                >
                  {isInstagram
                    ? "Track DMs, comments, mentions, and insights"
                    : "Add another inbox to your unified feed"}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.note,
                { backgroundColor: colors.secondary, borderColor: colors.border },
              ]}
            >
              <Feather name="shield" size={14} color={colors.radarGreen} />
              <Text style={[styles.noteText, { color: colors.secondaryForeground }]}>
                {isInstagram
                  ? "Instagram monitoring works through official Meta APIs and may require a professional Instagram account and Meta app permissions. In production this opens secure Meta OAuth."
                  : "In production this opens secure OAuth. For preview, enter the inbox address you'd like to track."}
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {isInstagram ? "Instagram handle" : "Email address"}
            </Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder={
                isInstagram
                  ? "@yourhandle"
                  : provider === "gmail"
                    ? "you@gmail.com"
                    : "you@outlook.com"
              }
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={isInstagram ? "default" : "email-address"}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
            />

            {isInstagram ? (
              <>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Account type
                </Text>
                <View style={styles.kindRow}>
                  {KIND_OPTIONS.map((opt) => {
                    const active = kind === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setKind(opt.id)}
                        style={({ pressed }) => [
                          styles.kindChip,
                          {
                            backgroundColor: active
                              ? colors.radarGreen
                              : colors.background,
                            borderColor: active ? colors.radarGreen : colors.border,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.kindChipText,
                            {
                              color: active ? colors.brandNavy : colors.foreground,
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <View style={styles.buttonRow}>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryBtn,
                  {
                    backgroundColor: colors.secondary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: colors.secondaryForeground },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConnect}
                disabled={!isValid}
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.radarGreen,
                    opacity: !isValid ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.buttonText, { color: colors.brandNavy }]}
                >
                  Connect
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  kbWrap: {
    width: "100%",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  handle: {
    alignItems: "center",
    marginBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_500Medium",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  kindRow: {
    flexDirection: "row",
    gap: 8,
  },
  kindChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  kindChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryBtn: {},
  primaryBtn: {},
  buttonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
