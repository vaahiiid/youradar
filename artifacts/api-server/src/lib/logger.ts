import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-user-id']",
      "res.headers['set-cookie']",
      "*.accessToken",
      "*.refreshToken",
      "*.access_token",
      "*.refresh_token",
      "*.token",
      "*.password",
      "*.title",
      "*.snippet",
      "*.senderName",
      "*.senderIdentifier",
      "*.accountIdentifier",
      "*.email",
      "*.body.title",
      "*.body.snippet",
      "*.body.senderName",
      "*.body.senderIdentifier",
      "*.body.accountIdentifier",
      "*.body.accessToken",
      "*.body.refreshToken",
    ],
    censor: "[REDACTED]",
    remove: false,
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
