/**
 * Structured JSON Logger for bimex-indexer.
 * Emits newline-delimited JSON objects with level, ts, msg, and contextual metadata.
 * Redacts known secrets, JWTs, Stellar secret keys, sensitive headers, and PII (emails).
 */

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SECRET_KEYS_REGEX = /^(authorization|cookie|secret|password|token|apikey|api_key|supabase_key|pinata_jwt|private_key|resend_api_key)$/i;
const PII_KEYS_REGEX = /^(email|to_email|toemail|user_email)$/i;
const STELLAR_SECRET_REGEX = /\bS[A-Z0-9]{55}\b/g;
const JWT_REGEX = /\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/g;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const KNOWN_ENV_SECRETS = [
  "SUPABASE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "PINATA_JWT",
  "PINATA_API_KEY",
  "PINATA_API_SECRET",
  "ADMIN_SECRET",
  "SOROBAN_SECRET_KEY",
  "SESSION_SECRET",
  "JWT_SECRET",
  "ETHERFUSE_API_KEY",
];

function maskEmail(email) {
  if (typeof email !== "string") return email;
  const parts = email.split("@");
  if (parts.length !== 2) return "[REDACTED_EMAIL]";
  const name = parts[0];
  const domain = parts[1];
  const visible = name.slice(0, 1);
  return `${visible}***@${domain}`;
}

function sanitizeString(str) {
  if (typeof str !== "string") return str;
  let result = str;

  // Redact known environment variable secrets
  for (const envKey of KNOWN_ENV_SECRETS) {
    const val = process.env[envKey];
    if (val && typeof val === "string" && val.length > 5) {
      result = result.split(val).join("[REDACTED]");
    }
  }

  result = result.replace(BEARER_REGEX, "Bearer [REDACTED]");
  result = result.replace(STELLAR_SECRET_REGEX, "[REDACTED_STELLAR_SECRET]");
  result = result.replace(JWT_REGEX, "[REDACTED_JWT]");
  result = result.replace(EMAIL_REGEX, (match) => maskEmail(match));
  return result;
}

function sanitizeValue(val, seen = new WeakSet()) {
  if (val === null || val === undefined) return val;
  if (typeof val === "string") return sanitizeString(val);
  if (typeof val === "bigint") return val.toString();
  if (typeof val === "number" || typeof val === "boolean") return val;

  if (val instanceof Error) {
    return {
      message: sanitizeString(val.message),
      code: val.code,
      stack: sanitizeString(val.stack),
    };
  }

  if (typeof val === "object") {
    if (seen.has(val)) return "[Circular]";
    seen.add(val);

    if (Array.isArray(val)) {
      return val.map((item) => sanitizeValue(item, seen));
    }

    const cleanObj = {};
    for (const [k, v] of Object.entries(val)) {
      if (SECRET_KEYS_REGEX.test(k)) {
        cleanObj[k] = "[REDACTED]";
      } else if (PII_KEYS_REGEX.test(k) && typeof v === "string") {
        cleanObj[k] = maskEmail(v);
      } else {
        cleanObj[k] = sanitizeValue(v, seen);
      }
    }
    return cleanObj;
  }

  return String(val);
}

export class Logger {
  constructor(options = {}) {
    this.level = (options.level || process.env.LOG_LEVEL || "info").toLowerCase();
    this.defaultMeta = options.defaultMeta || {};
    this.destination = options.destination || null;
  }

  setLevel(level) {
    if (LEVELS[level?.toLowerCase()]) {
      this.level = level.toLowerCase();
    }
  }

  getLevel() {
    return this.level;
  }

  setDestination(destination) {
    this.destination = destination;
  }

  shouldLog(level) {
    const currentWeight = LEVELS[this.level] ?? LEVELS.info;
    const msgWeight = LEVELS[level] ?? LEVELS.info;
    return msgWeight >= currentWeight;
  }

  log(level, msgOrMeta, meta) {
    if (!this.shouldLog(level)) return;

    let message = "";
    let extra = {};

    if (typeof msgOrMeta === "string") {
      message = msgOrMeta;
      if (meta && typeof meta === "object") {
        extra = meta;
      }
    } else if (msgOrMeta instanceof Error) {
      message = msgOrMeta.message;
      extra = { err: msgOrMeta, ...(meta || {}) };
    } else if (typeof msgOrMeta === "object" && msgOrMeta !== null) {
      if (typeof meta === "string") {
        message = meta;
        extra = msgOrMeta;
      } else {
        extra = msgOrMeta;
        message = extra.msg || extra.message || "";
        delete extra.msg;
        delete extra.message;
      }
    }

    const merged = {
      level,
      ts: new Date().toISOString(),
      msg: sanitizeString(message),
      ...sanitizeValue(this.defaultMeta),
      ...sanitizeValue(extra),
    };

    const line = JSON.stringify(merged) + "\n";

    if (this.destination) {
      if (typeof this.destination.write === "function") {
        this.destination.write(line);
      } else if (Array.isArray(this.destination)) {
        this.destination.push(merged);
      }
    } else {
      if (level === "error") {
        process.stderr.write(line);
      } else {
        process.stdout.write(line);
      }
    }
  }

  debug(msg, meta) {
    this.log("debug", msg, meta);
  }

  info(msg, meta) {
    this.log("info", msg, meta);
  }

  warn(msg, meta) {
    this.log("warn", msg, meta);
  }

  error(msg, meta) {
    this.log("error", msg, meta);
  }

  child(bindings = {}) {
    return new Logger({
      level: this.level,
      defaultMeta: { ...this.defaultMeta, ...bindings },
      destination: this.destination,
    });
  }
}

export const logger = new Logger();
export default logger;
