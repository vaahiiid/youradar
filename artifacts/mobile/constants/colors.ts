// YourRadar brand palette.
// Primary brand colors come from the logo: teal (#0097b2) and charcoal (#544f4d).
// Token names like `radarBlue` / `brandNavy` / `softCyan` are kept as semantic
// aliases so the rest of the codebase doesn't need to be touched, but they now
// point to the new teal/charcoal values.
const TEAL = "#0097b2";
const TEAL_DEEP = "#007A91"; // hover/active darker teal
const TEAL_SOFT = "#56C5D6"; // lighter teal for inner radar rings, glows
const CHARCOAL = "#544f4d";
const CHARCOAL_MUTED = "#6B6B6B";

const lightPalette = {
  text: CHARCOAL,
  tint: TEAL,

  background: "#FFFFFF",
  foreground: CHARCOAL,

  card: "#FFFFFF",
  cardForeground: CHARCOAL,
  surfaceElevated: "#F7F9FC",

  primary: TEAL,
  primaryForeground: "#FFFFFF",

  secondary: "#F7F9FC",
  secondaryForeground: CHARCOAL,

  muted: "#F7F9FC",
  mutedForeground: CHARCOAL_MUTED,

  accent: "#F7F9FC",
  accentForeground: TEAL,

  destructive: "#FF3B30",
  destructiveForeground: "#FFFFFF",

  border: "#E5E7EB",
  input: "#E5E7EB",

  // Brand colors per provider (unchanged — they're external brands)
  gmail: "#EA4335",
  outlook: "#0078D4",
  yahoo: "#6001D2",
  aol: "#FF0B00",
  hotmail: "#0072C6",
  instagram: "#E1306C",
  linkedin: "#0A66C2",
  facebook: "#1877F2",
  telegram: "#229ED9",
  whatsapp: "#25D366",
  tiktok: "#010101",
  x: "#0F1419",
  evri: "#2E2872",
  dpd: "#DC0032",
  royalmail: "#ED1C24",
  amazon: "#FF9900",

  success: TEAL,
  warning: "#F5A524",

  // Semantic aliases used throughout the app — values now align with the new
  // logo brand. Keep these names so call sites continue to work.
  brandNavy: CHARCOAL,
  brandTealDeep: TEAL_DEEP,
  radarBlue: TEAL,
  softCyan: TEAL_SOFT,
  violetAccent: TEAL_SOFT,
  coolGrey: CHARCOAL_MUTED,
  offWhite: "#F7F9FC",
  notificationRed: "#FF3B30",
};

const colors = {
  light: lightPalette,
  dark: lightPalette,
  radius: 16,
};

export default colors;
