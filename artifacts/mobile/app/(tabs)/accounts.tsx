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
    connectAccount,
    disconnectAccount,
    reconnectAccount,
  } = useInbox();
  const [sheetProvider, setSheetProvider] = useState<Provider | null>(null);

  const confirmDisconnect = (id: string, email: string) => {
    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" && window.confirm(`Disconnect ${email}?`);
      if (ok) disconnectAccount(id);
      return;
    }
    Alert.alert(
      "Disconnect account",
      `Stop receiving notifications from ${email}?`,
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
        title="Accounts"
        subtitle="Connect as many inboxes as you like"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.connectRow}>
          <Pressable
            onPress={() => setSheetProvider("gmail")}
            style={({ pressed }) => [
              styles.connectBtn,
              {
                backgroundColor: colors.gmail,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.connectBtnText}>Connect Gmail</Text>
          </Pressable>
          <Pressable
            onPress={() => setSheetProvider("outlook")}
            style={({ pressed }) => [
              styles.connectBtn,
              {
                backgroundColor: colors.outlook,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.connectBtnText}>Connect Outlook</Text>
          </Pressable>
        </View>

        {accounts.length === 0 ? (
          <EmptyState
            icon="mail"
            title="No inboxes yet"
            message="Connect a Gmail or Outlook account to start receiving unified notifications."
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
                        color={colors.primary}
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
              <Feather name="lock" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>
              How connections work
            </Text>
          </View>
          <Text style={[styles.infoBody, { color: colors.mutedForeground }]}>
            Inbox Pulse never stores your password. Real connections use Google
            and Microsoft OAuth — tokens stay on the server, refresh
            automatically, and never reach this device.
          </Text>
        </View>
      </ScrollView>

      <ConnectAccountSheet
        visible={sheetProvider !== null}
        provider={sheetProvider}
        onClose={() => setSheetProvider(null)}
        onConnect={(p, email) => connectAccount(p, email)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  connectRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  connectBtn: {
    flex: 1,
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
