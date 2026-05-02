import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

export type EncryptedField = {
  ct: string;
  iv: string;
  tag: string;
  v: 1;
};

const ALGO = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HKDF_HASH = "sha256";

const CONTENT_INFO = "yourradar:user-content:v1";
const TOKEN_INFO = "yourradar:user-token:v1";

function loadMaster(envKey: string): Buffer {
  const raw = process.env[envKey];
  if (!raw) {
    throw new Error(
      `${envKey} is not set. Refusing to perform any encryption operation without a master key.`,
    );
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(raw, "base64");
  } catch {
    throw new Error(`${envKey} is not valid base64`);
  }
  if (buf.length < KEY_BYTES) {
    throw new Error(
      `${envKey} must decode to at least ${KEY_BYTES} bytes (got ${buf.length})`,
    );
  }
  return buf.subarray(0, KEY_BYTES);
}

let cachedContentMaster: Buffer | null = null;
let cachedTokenMaster: Buffer | null = null;

function getContentMaster(): Buffer {
  cachedContentMaster ??= loadMaster("ENCRYPTION_MASTER_KEY");
  return cachedContentMaster;
}

function getTokenMaster(): Buffer {
  cachedTokenMaster ??= loadMaster("TOKEN_ENCRYPTION_KEY");
  return cachedTokenMaster;
}

function deriveUserKey(master: Buffer, info: string, userId: string): Buffer {
  const salt = Buffer.from(`yourradar:salt:${userId}`, "utf8");
  const out = hkdfSync(HKDF_HASH, master, salt, Buffer.from(info, "utf8"), KEY_BYTES);
  const key = Buffer.alloc(KEY_BYTES);
  Buffer.from(out).copy(key);
  new Uint8Array(out).fill(0);
  return key;
}

function encryptWith(key: Buffer, plaintext: string): EncryptedField {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: TAG_BYTES });
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ct: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    v: 1,
  };
}

function decryptWith(key: Buffer, blob: EncryptedField): string {
  const iv = Buffer.from(blob.iv, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const ct = Buffer.from(blob.ct, "base64");
  if (iv.length !== IV_BYTES) throw new Error("invalid iv length");
  if (tag.length !== TAG_BYTES) throw new Error("invalid tag length");
  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: TAG_BYTES });
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  return dec.toString("utf8");
}

export function encryptForUser(userId: string, plaintext: string): EncryptedField {
  const key = deriveUserKey(getContentMaster(), CONTENT_INFO, userId);
  try {
    return encryptWith(key, plaintext);
  } finally {
    key.fill(0);
  }
}

export function decryptForUser(userId: string, blob: EncryptedField): string {
  const key = deriveUserKey(getContentMaster(), CONTENT_INFO, userId);
  try {
    return decryptWith(key, blob);
  } finally {
    key.fill(0);
  }
}

export function encryptTokenForUser(userId: string, plaintext: string): EncryptedField {
  const key = deriveUserKey(getTokenMaster(), TOKEN_INFO, userId);
  try {
    return encryptWith(key, plaintext);
  } finally {
    key.fill(0);
  }
}

export function decryptTokenForUser(userId: string, blob: EncryptedField): string {
  const key = deriveUserKey(getTokenMaster(), TOKEN_INFO, userId);
  try {
    return decryptWith(key, blob);
  } finally {
    key.fill(0);
  }
}

export function maybeEncryptForUser(
  userId: string,
  plaintext: string | null | undefined,
): EncryptedField | null {
  if (plaintext == null) return null;
  return encryptForUser(userId, plaintext);
}

export function maybeDecryptForUser(
  userId: string,
  blob: unknown,
): string | null {
  if (!blob || typeof blob !== "object") return null;
  return decryptForUser(userId, blob as EncryptedField);
}

export function maybeEncryptTokenForUser(
  userId: string,
  plaintext: string | null | undefined,
): EncryptedField | null {
  if (plaintext == null) return null;
  return encryptTokenForUser(userId, plaintext);
}

export function isEncryptedField(value: unknown): value is EncryptedField {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.ct === "string" &&
    typeof v.iv === "string" &&
    typeof v.tag === "string" &&
    v.v === 1
  );
}

export function newId(): string {
  return randomUUID();
}

export function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function maskToken(token: string | null | undefined): string {
  if (!token) return "<none>";
  if (token.length <= 8) return "***";
  return `${token.slice(0, 3)}…${token.slice(-2)}(${token.length})`;
}
