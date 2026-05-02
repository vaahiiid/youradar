import { Router, type IRouter } from "express";

const router: IRouter = Router();

const PRIVACY_NOTICE = {
  encryption:
    "YourRadar encrypts sensitive data at rest using field-level encryption. Admins cannot read user data directly from the database or logs.",
  passwords:
    "We never store your passwords. All connections use secure provider authentication (OAuth).",
  scope:
    "This is not full end-to-end encryption yet, because the backend decrypts data at runtime only for the authenticated owner. You must trust the running server while your request is being handled. True client-side / end-to-end encryption is on the roadmap.",
  details: {
    algorithm: "AES-256-GCM with per-record IV and authentication tag",
    keyDerivation: "HKDF-SHA256 derives a unique key for every user",
    encryptedFields: [
      "OAuth access and refresh tokens",
      "Account identifiers (email, username)",
      "Sender names and sender identifiers",
      "Message titles and snippets",
      "Delivery tracking numbers",
    ],
    plaintextFields: [
      "Provider name (e.g. gmail, instagram)",
      "Timestamps",
      "Status and seen flags",
    ],
    adminAccess:
      "Admins cannot read user notification content or connected account details from the database or logs.",
  },
  roadmap: [
    "Client-side encryption / true end-to-end encryption mode — decryption happens on your device, the server only ever holds ciphertext.",
  ],
};

router.get("/", (_req, res): void => {
  res.json(PRIVACY_NOTICE);
});

export default router;
