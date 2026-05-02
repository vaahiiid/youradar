import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ConnectedAccount,
  EmailNotification,
  Provider,
  SettingsState,
} from "@/types";
import { uid } from "@/utils/format";

const STORAGE_KEY = "inbox_pulse_state_v1";

interface PersistedState {
  accounts: ConnectedAccount[];
  notifications: EmailNotification[];
  settings: SettingsState;
}

interface InboxContextValue {
  ready: boolean;
  accounts: ConnectedAccount[];
  notifications: EmailNotification[];
  settings: SettingsState;
  unseenTotal: number;
  unseenByAccount: Record<string, number>;
  connectAccount: (provider: Provider, emailAddress: string) => void;
  disconnectAccount: (accountId: string) => void;
  reconnectAccount: (accountId: string) => void;
  simulateIncoming: (provider: Provider, accountId?: string) => EmailNotification | null;
  markSeen: (id: string) => void;
  markAllSeen: () => void;
  clearAll: () => void;
  updateSettings: (patch: Partial<SettingsState>) => void;
  getNotification: (id: string) => EmailNotification | undefined;
  getAccount: (id: string) => ConnectedAccount | undefined;
}

const InboxContext = createContext<InboxContextValue | null>(null);

const SAMPLE_SENDERS: { name: string; email: string; subject: string; snippet: string; body: string }[] = [
  {
    name: "Linear",
    email: "notifications@linear.app",
    subject: "New comment on ENG-432",
    snippet: "Sara: I think we should ship this behind a feature flag and then…",
    body: "Sara replied on the ticket: I think we should ship this behind a feature flag and then graduate it next week once we've validated the metrics on the staging cohort.",
  },
  {
    name: "Stripe",
    email: "receipts@stripe.com",
    subject: "Your receipt from Acme Inc.",
    snippet: "Thanks for your payment of $49.00 USD. View invoice or manage…",
    body: "Thanks for your payment of $49.00 USD. View invoice or manage your billing in the Stripe dashboard.",
  },
  {
    name: "GitHub",
    email: "noreply@github.com",
    subject: "[repo] PR #1284 ready for review",
    snippet: "@you was requested as a reviewer on pull request #1284 in repo…",
    body: "@you was requested as a reviewer on pull request #1284 'Refactor notification fan-out' in your repository.",
  },
  {
    name: "Calendar",
    email: "calendar-noreply@google.com",
    subject: "Reminder: Standup at 10:00 AM",
    snippet: "This is a reminder that 'Standup' starts in 15 minutes. Join the…",
    body: "This is a reminder that 'Standup' starts in 15 minutes. Join the meeting from your Calendar event.",
  },
  {
    name: "Maya Lin",
    email: "maya@designstudio.co",
    subject: "Quick thought on the onboarding flow",
    snippet: "Hey — looking at the prototype again and I'm wondering if we…",
    body: "Hey — looking at the prototype again and I'm wondering if we should split the permission ask into a separate step. WDYT?",
  },
  {
    name: "Notion",
    email: "team@mail.notion.so",
    subject: "Weekly digest: 12 updates in your workspace",
    snippet: "Catch up on what changed across your shared docs this week…",
    body: "Catch up on what changed across your shared docs this week. 12 updates from 4 collaborators are waiting.",
  },
  {
    name: "Vercel",
    email: "no-reply@vercel.com",
    subject: "Deployment ready: inbox-pulse",
    snippet: "Your latest deployment for inbox-pulse is now live in production…",
    body: "Your latest deployment for inbox-pulse is now live in production. Build completed in 38s. Click to inspect.",
  },
];

const DEFAULT_SETTINGS: SettingsState = {
  pushEnabled: true,
  inAppToastsEnabled: true,
  soundsEnabled: false,
};

function buildSampleNotification(account: ConnectedAccount): EmailNotification {
  const sample = SAMPLE_SENDERS[Math.floor(Math.random() * SAMPLE_SENDERS.length)]!;
  const id = uid();
  const baseLink =
    account.provider === "gmail"
      ? `https://mail.google.com/mail/u/0/#inbox/${id}`
      : `https://outlook.office.com/mail/inbox/id/${id}`;
  return {
    id,
    accountId: account.id,
    provider: account.provider,
    emailAddress: account.emailAddress,
    senderName: sample.name,
    senderEmail: sample.email,
    subject: sample.subject,
    snippet: sample.snippet,
    bodyPreview: sample.body,
    receivedAt: Date.now(),
    providerWebLink: baseLink,
    isSeen: false,
  };
}

function makeSeed(): PersistedState {
  const now = Date.now();
  const accounts: ConnectedAccount[] = [
    {
      id: uid(),
      provider: "gmail",
      emailAddress: "you@gmail.com",
      displayName: "Personal",
      status: "connected",
      lastSyncAt: now - 1000 * 60 * 2,
      createdAt: now - 1000 * 60 * 60 * 24 * 7,
    },
    {
      id: uid(),
      provider: "outlook",
      emailAddress: "you@company.com",
      displayName: "Work",
      status: "connected",
      lastSyncAt: now - 1000 * 60 * 12,
      createdAt: now - 1000 * 60 * 60 * 24 * 14,
    },
  ];

  const notifications: EmailNotification[] = [];
  const offsets = [3, 18, 47, 95, 180, 360, 720];
  for (let i = 0; i < 7; i++) {
    const account = accounts[i % accounts.length]!;
    const sample = SAMPLE_SENDERS[i % SAMPLE_SENDERS.length]!;
    const id = uid();
    notifications.push({
      id,
      accountId: account.id,
      provider: account.provider,
      emailAddress: account.emailAddress,
      senderName: sample.name,
      senderEmail: sample.email,
      subject: sample.subject,
      snippet: sample.snippet,
      bodyPreview: sample.body,
      receivedAt: now - offsets[i]! * 60 * 1000,
      providerWebLink:
        account.provider === "gmail"
          ? `https://mail.google.com/mail/u/0/#inbox/${id}`
          : `https://outlook.office.com/mail/inbox/id/${id}`,
      isSeen: i >= 3,
    });
  }

  return { accounts, notifications, settings: DEFAULT_SETTINGS };
}

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as PersistedState;
          setAccounts(parsed.accounts ?? []);
          setNotifications(parsed.notifications ?? []);
          setSettings({ ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) });
        } else {
          const seed = makeSeed();
          setAccounts(seed.accounts);
          setNotifications(seed.notifications);
          setSettings(seed.settings);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        }
      } catch {
        const seed = makeSeed();
        if (!cancelled) {
          setAccounts(seed.accounts);
          setNotifications(seed.notifications);
          setSettings(seed.settings);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const state: PersistedState = { accounts, notifications, settings };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [ready, accounts, notifications, settings]);

  const connectAccount = useCallback((provider: Provider, emailAddress: string) => {
    const trimmed = emailAddress.trim().toLowerCase();
    if (!trimmed.includes("@")) return;
    setAccounts((prev) => {
      if (prev.some((a) => a.emailAddress === trimmed && a.provider === provider)) {
        return prev;
      }
      const account: ConnectedAccount = {
        id: uid(),
        provider,
        emailAddress: trimmed,
        displayName: trimmed.split("@")[0]!,
        status: "connected",
        lastSyncAt: Date.now(),
        createdAt: Date.now(),
      };
      return [...prev, account];
    });
  }, []);

  const disconnectAccount = useCallback((accountId: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    setNotifications((prev) => prev.filter((n) => n.accountId !== accountId));
  }, []);

  const reconnectAccount = useCallback((accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId ? { ...a, status: "connected", lastSyncAt: Date.now() } : a,
      ),
    );
  }, []);

  const simulateIncoming = useCallback(
    (provider: Provider, accountId?: string): EmailNotification | null => {
      const candidates = accounts.filter(
        (a) => a.provider === provider && a.status === "connected",
      );
      if (candidates.length === 0) return null;
      const account = accountId
        ? candidates.find((a) => a.id === accountId) ?? candidates[0]!
        : candidates[Math.floor(Math.random() * candidates.length)]!;
      const notif = buildSampleNotification(account);
      setNotifications((prev) => [notif, ...prev]);
      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, lastSyncAt: Date.now() } : a)),
      );
      return notif;
    },
    [accounts],
  );

  const markSeen = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isSeen: true } : n)),
    );
  }, []);

  const markAllSeen = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isSeen: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateSettings = useCallback((patch: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const getNotification = useCallback(
    (id: string) => notifications.find((n) => n.id === id),
    [notifications],
  );

  const getAccount = useCallback(
    (id: string) => accounts.find((a) => a.id === id),
    [accounts],
  );

  const unseenByAccount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of notifications) {
      if (!n.isSeen) map[n.accountId] = (map[n.accountId] ?? 0) + 1;
    }
    return map;
  }, [notifications]);

  const unseenTotal = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.isSeen ? 0 : 1), 0),
    [notifications],
  );

  const value: InboxContextValue = {
    ready,
    accounts,
    notifications,
    settings,
    unseenTotal,
    unseenByAccount,
    connectAccount,
    disconnectAccount,
    reconnectAccount,
    simulateIncoming,
    markSeen,
    markAllSeen,
    clearAll,
    updateSettings,
    getNotification,
    getAccount,
  };

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxContextValue {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used within InboxProvider");
  return ctx;
}
