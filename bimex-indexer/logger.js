// Minimal structured JSON logger. No dependencies.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE_FIELD = /(secret|token|password|passwd|authorization|cookie|mnemonic|seed|private|api[_-]?key|service[_-]?role|supabase[_-]?key|email|phone)/i;
const SENSITIVE_ENV_NAME = /(key|secret|token|password|passwd|private|mnemonic|seed)/i;
const MAX_DEPTH = 5;

function knownSecrets(env) {
  return Object.entries(env)
    .filter(([name, value]) => SENSITIVE_ENV_NAME.test(name) && typeof value === 'string' && value.length >= 8)
    .map(([, value]) => value);
}

function scrubString(str, secrets) {
  let out = str;
  for (const s of secrets) out = out.split(s).join('[REDACTED]');
  return out;
}

function sanitize(value, secrets, depth = 0) {
  if (typeof value === 'string') return scrubString(value, secrets);
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrubString(value.message, secrets),
      stack: value.stack ? scrubString(value.stack, secrets) : undefined,
    };
  }
  if (depth >= MAX_DEPTH) return '[Truncated]';
  if (Array.isArray(value)) return value.map((v) => sanitize(v, secrets, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_FIELD.test(k) ? '[REDACTED]' : sanitize(v, secrets, depth + 1);
  }
  return out;
}

function parseArgs(args) {
  const data = {};
  const extra = [];
  let route;
  let msg = '';
  const [first, ...rest] = args;
  if (first instanceof Error) {
    msg = first.message;
    data.err = first;
  } else if (typeof first === 'string') {
    const m = first.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
    if (m) { route = m[1]; msg = m[2]; } else { msg = first; }
  } else if (first !== undefined) {
    msg = typeof first === 'object' ? JSON.stringify(first) : String(first);
  }
  for (const a of rest) {
    if (a instanceof Error) data.err = a;
    else if (a && typeof a === 'object' && !Array.isArray(a)) Object.assign(data, a);
    else extra.push(a);
  }
  if (extra.length) data.args = extra;
  return { msg, route, data };
}

function createLogger({
  level = process.env.LOG_LEVEL,
  out = process.stdout,
  err = process.stderr,
  bindings = {},
  env = process.env,
} = {}) {
  const threshold = LEVELS[String(level || 'info').toLowerCase()] ?? LEVELS.info;

  function emit(name, args) {
    if (LEVELS[name] < threshold) return;
    const secrets = knownSecrets(env);
    const { msg, route, data } = parseArgs(args);
    const body = sanitize({ ...bindings, ...data }, secrets);
    delete body.ts; delete body.level; delete body.msg;
    const line = { ts: new Date().toISOString(), level: name, msg: scrubString(msg, secrets) };
    if (route) line.route = route;
    else if (bindings.route) line.route = bindings.route;
    Object.assign(line, body);
    (name === 'warn' || name === 'error' ? err : out).write(JSON.stringify(line) + '\n');
  }

  return {
    debug: (...a) => emit('debug', a),
    info: (...a) => emit('info', a),
    warn: (...a) => emit('warn', a),
    error: (...a) => emit('error', a),
    child: (extra) => createLogger({ level, out, err, env, bindings: { ...bindings, ...extra } }),
  };
}

const logger = createLogger();

// ESM (package.json has "type": "module"):
export { createLogger, logger, LEVELS };
export default logger;
// CJS instead: delete the two export lines above and use
// module.exports = { createLogger, logger, LEVELS };