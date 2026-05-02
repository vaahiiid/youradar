import { Router, type IRouter } from "express";

const router: IRouter = Router();

const PRIVACY_NOTICE = {
  encryption:
    "YouRadar uses end-to-end inspired encryption principles. Your connected data is encrypted and only visible to you. Even system administrators cannot read your private notifications.",
  passwords:
    "We never store your passwords. All connections use secure provider authentication.",
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
      "Admins cannot read user notification content or connected account details.",
  },
};

router.get("/", (_req, res): void => {
  res.json(PRIVACY_NOTICE);
});

export default router;
