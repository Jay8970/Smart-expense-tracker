import crypto from "crypto";

const ENCRYPTION_PREFIX = "enc::";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_SOURCE = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || "";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(KEY_SOURCE).digest();

export function isUsingDedicatedEncryptionKey() {
  return Boolean(process.env.DATA_ENCRYPTION_KEY);
}

function encryptString(value) {
  if (typeof value !== "string" || value.length === 0 || value.startsWith(ENCRYPTION_PREFIX)) {
    return value;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptString(value) {
  if (typeof value !== "string" || value.length === 0 || !value.startsWith(ENCRYPTION_PREFIX)) {
    return value;
  }

  const raw = value.slice(ENCRYPTION_PREFIX.length);
  const [ivHex, authTagHex, encryptedHex] = raw.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    return value;
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

export function encryptedStringField(options = {}) {
  const { default: defaultValue = "", required = false, trim = false } = options;

  return {
    type: String,
    required,
    default: defaultValue,
    set(value) {
      if (typeof value !== "string") return value;
      const normalized = trim ? value.trim() : value;
      return encryptString(normalized);
    },
    get(value) {
      return decryptString(value);
    }
  };
}
