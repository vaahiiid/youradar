import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/Badge";
import { ProviderIcon } from "@/components/ProviderIcon";
import { useColors } from "@/hooks/useColors";
import { PROVIDER_LABELS, type ConnectedAccount } from "@/types";
import { formatRelativeTime } from "@/utils/format";

interface AccountCardProps {
  account: ConnectedAccount;
  unseen: number;
  rightSlot?: React.ReactNode;
}

export function AccountCard({ account, unseen, rightSlot }: AccountCardProps) {
  const colors = useColors();
  const statusColor =
    account.status === "connected"
      ? colors.success
      : account.status === "needs_reauth"
        ? colors.warning
        : colors.mutedForeground;
  const statusLabel =
    account.status === "connected"
      ? "Connected"
      : account.status === "needs_reauth"
        ? "Needs reauth"
        : "Disconnected";

  const providerLabel = PROVIDER_LABELS[account.provider];
  const subLabel =
    account.provider === "instagram" && account.instagramKind
      ? `${providerLabel} · ${capitalize(account.instagramKind)}`
      : providerLabel;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <ProviderIcon provider={account.provider} size={44} />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text
              numberOfLines={1}
              style={[styles.email, { color: colors.foreground }]}
            >
              {account.displayName || account.emailAddress}
            </Text>
            {unseen > 0 ? <Badge count={unseen} size="sm" /> : null}
          </View>

          {account.displayName &&
          account.displayName !== account.emailAddress ? (
            <Text
              numberOfLines={1}
              style={[styles.handle, { color: colors.mutedForeground }]}
            >
              {account.emailAddress}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {statusLabel}
            </Text>
            <Feather name="circle" size={4} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {subLabel}
            </Text>
            <Feather name="circle" size={4} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              synced {formatRelativeTime(account.lastSyncAt)}
            </Text>
          </View>
        </View>

        {rightSlot}
      </View>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#544f4d",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  handle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
