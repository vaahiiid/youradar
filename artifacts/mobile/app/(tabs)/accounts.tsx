import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountCard } from "@/components/AccountCard";
import { ConnectAccountSheet } from "@/components/ConnectAccountSheet";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useInbox } from "@/context/InboxContext";
import { useColors } from "@/hooks/useColors";
import type { Provider } from "@/types";

export default function AccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    accounts,
    unseenByAccount,
    instagramConfigured,
    connectAccount,
    disconnectAccount,
    reconnectAccount,
  } = useInbox();
  const [sheetProvider, setSheetProvider] = useState<Provider | null>(null);

  const confirmDisconnect = (id: string, label: string) => {
    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" && window.confirm(`Disconnect ${label}?`);
      if (ok) disconnectAccount(id);
      return;
    }
    Alert.alert(
      "Disconnect source",
      `Stop receiving signals from ${label}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => disconnectAccount(id),
        },
      ],
    );
  };

  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom + 80) + 24;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Sources"
        subtitle="Email, social, and more — unified"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.connectGrid}>
          <ConnectButton
            provider="gmail"
            label="Gmail"
            color={colors.gmail}
            onPress={() => setSheetProvider("gmail")}
          />
          <ConnectButton
            provider="outlook"
            label="Outlook"
            color={colors.outlook}
            onPress={() => setSheetProvider("outlook")}
          />
          <ConnectButton
            provider="instagram"
            label="Instagram"
            color={colors.instagram}
            onPress={() => setSheetProvider("instagram")}
            full
          />
        </View>

        {!instagramConfigured ? (
          <View
            style={[
              styles.warnCard,
              {
                backgroundColor: "rgba(245, 165, 36, 0.10)",
                borderColor: "rgba(245, 165, 36, 0.45)",
              },
            ]}
          >
            <View style={styles.warnHeader}>
              <Feather name="alert-triangle" size={16} color={colors.warning} />
              <Text style={[styles.warnTitle, { color: colors.warning }]}>
                Instagram is in preview mode
              </Text>
            </View>
            <Text style={[styles.warnBody, { color: colors.coolGrey }]}>
              Instagram integration is not fully configured yet. Connect a
              professional Instagram account and complete Meta app setup to
              receive supported Instagram events.
            </Text>
            <Text style={[styles.warnBody, { color: colors.coolGrey, marginTop: 6 }]}>
              Personal Instagram app notifications cannot be imported directly
              unless supported by official APIs.
            </Text>
          </View>
        ) : null}

        {accounts.length === 0 ? (
          <EmptyState
            icon="users"
            title="No sources yet"
            message="Connect Gmail, Outlook, or Instagram to start receiving unified signals."
          />
        ) : (
          accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              unseen={unseenByAccount[account.id] ?? 0}
              rightSlot={
                <View style={styles.rowActions}>
                  {account.status !== "connected" ? (
                    <Pressable
                      onPress={() => reconnectAccount(account.id)}
                      style={({ pressed }) => [
                        styles.iconBtn,
                        {
                          backgroundColor: colors.secondary,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Feather
                        name="refresh-cw"
                        size={16}
                        color={colors.radarGreen}
                      />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() =>
                      confirmDisconnect(account.id, account.emailAddress)
                    }
                    style={({ pressed }) => [
                      styles.iconBtn,
                      {
                        backgroundColor: colors.secondary,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Feather
                      name="trash-2"
                      size={16}
                      color={colors.destructive}
                    />
                  </Pressable>
                </View>
              }
            />
          ))
        )}

        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.infoHeader}>
            <View
              style={[styles.infoIcon, { backgroundColor: colors.secondary }]}
            >
              <Feather name="lock" size={16} color={colors.radarGreen} />
            </View>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>
              How connections work
            </Text>
          </View>
          <Text style={[styles.infoBody, { color: colors.coolGrey }]}>
            YourRadar never stores your password. Real connections use Google
            and Microsoft OAuth for email, and official Meta APIs for Instagram —
            tokens stay on the server, refresh automatically, and never reach
            this device.
          </Text>
        </View>
      </ScrollView>

      <ConnectAccountSheet
        visible={sheetProvider !== null}
        provider={sheetProvider}
        onClose={() => setSheetProvider(null)}
        onConnect={(p, value, extras) => connectAccount(p, value, extras)}
      />
    </View>
  );
}

function ConnectButton({
  provider: _provider,
  label,
  color,
  onPress,
  full,
}: {
  provider: Provider;
  label: string;
  color: string;
  onPress: () => void;
  full?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.connectBtn,
        {
          backgroundColor: color,
          opacity: pressed ? 0.9 : 1,
          flexBasis: full ? "100%" : "48%",
        },
      ]}
    >
      <Feather name="plus" size={18} color="#FFFFFF" />
      <Text style={styles.connectBtnText}>Connect {label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  connectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  connectBtn: {
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  connectBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  warnCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  warnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  warnTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  warnBody: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  rowActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  infoBody: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
});
