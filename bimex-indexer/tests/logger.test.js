import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Logger } from "../logger.js";

describe("Structured JSON Logger", () => {
  let logs = [];
  let testLogger;

  beforeEach(() => {
    logs = [];
    testLogger = new Logger({
      level: "debug",
      destination: logs,
    });
  });

  afterEach(() => {
    logs = [];
  });

  it("emite logs como objetos JSON válidos con level, ts y msg", () => {
    testLogger.info("Servidor iniciado en puerto 3000");

    expect(logs).toHaveLength(1);
    const entry = logs[0];
    expect(entry.level).toBe("info");
    expect(entry.msg).toBe("Servidor iniciado en puerto 3000");
    expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("respeta LOG_LEVEL y filtra los niveles inferiores", () => {
    testLogger.setLevel("warn");

    testLogger.debug("Esto es debug y debe ignorarse");
    testLogger.info("Esto es info y debe ignorarse");
    testLogger.warn("Alerta de memoria alta");
    testLogger.error("Fallo crítico en base de datos");

    expect(logs).toHaveLength(2);
    expect(logs[0].level).toBe("warn");
    expect(logs[0].msg).toBe("Alerta de memoria alta");
    expect(logs[1].level).toBe("error");
    expect(logs[1].msg).toBe("Fallo crítico en base de datos");
  });

  it("redacta secretos conocidos de variables de entorno", () => {
    const originalKey = process.env.SUPABASE_KEY;
    process.env.SUPABASE_KEY = "super_secret_supabase_api_key_123456789";

    try {
      testLogger.info("Conectando con llave super_secret_supabase_api_key_123456789 en base de datos");

      expect(logs).toHaveLength(1);
      expect(logs[0].msg).not.toContain("super_secret_supabase_api_key_123456789");
      expect(logs[0].msg).toContain("[REDACTED]");
    } finally {
      if (originalKey !== undefined) {
        process.env.SUPABASE_KEY = originalKey;
      } else {
        delete process.env.SUPABASE_KEY;
      }
    }
  });

  it("redacta llaves secretas de Stellar, JWTs y tokens Bearer", () => {
    const stellarSecret = "SBZ2H2N5FAGQ3P5RJH432W2GOGY22U3H2F3P3637O2J43V5RJH432W2G";
    const jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const bearer = "Bearer secret_bearer_token_xyz";

    testLogger.warn(`Transacción fallida con secret=${stellarSecret} auth=${bearer} token=${jwtToken}`);

    expect(logs).toHaveLength(1);
    const msg = logs[0].msg;
    expect(msg).not.toContain(stellarSecret);
    expect(msg).not.toContain(jwtToken);
    expect(msg).not.toContain("secret_bearer_token_xyz");
    expect(msg).toContain("[REDACTED_STELLAR_SECRET]");
    expect(msg).toContain("[REDACTED_JWT]");
    expect(msg).toContain("Bearer [REDACTED]");
  });

  it("redacta propiedades sensibles en objetos de metadatos", () => {
    testLogger.error("Petición rechazada", {
      authorization: "Bearer 123456789",
      password: "mySecretPassword123",
      apiKey: "pinata_api_key_secret",
      route: "/faucet",
      ip: "127.0.0.1",
    });

    expect(logs).toHaveLength(1);
    const entry = logs[0];
    expect(entry.route).toBe("/faucet");
    expect(entry.ip).toBe("127.0.0.1");
    expect(entry.authorization).toBe("[REDACTED]");
    expect(entry.password).toBe("[REDACTED]");
    expect(entry.apiKey).toBe("[REDACTED]");
  });

  it("enmascara direcciones de correo electrónico para prevenir fugas de PII", () => {
    testLogger.info("Enviando reporte a usuario juan.perez@example.com", {
      email: "maria.lopez@bimex.fi",
      toEmail: "inversor123@gmail.com",
    });

    expect(logs).toHaveLength(1);
    const entry = logs[0];
    expect(entry.msg).toBe("Enviando reporte a usuario j***@example.com");
    expect(entry.email).toBe("m***@bimex.fi");
    expect(entry.toEmail).toBe("i***@gmail.com");
  });

  it("crea child loggers con metadatos contextuales persistentes", () => {
    const routeLogger = testLogger.child({ route: "/proyectos", service: "api" });

    routeLogger.info("Consultando listado de proyectos", { status: 200, count: 5 });

    expect(logs).toHaveLength(1);
    const entry = logs[0];
    expect(entry.msg).toBe("Consultando listado de proyectos");
    expect(entry.route).toBe("/proyectos");
    expect(entry.service).toBe("api");
    expect(entry.count).toBe(5);
  });

  it("serializa errores adecuadamente preservando mensaje, código y stack", () => {
    const err = new Error("Error de conexión al nodo Soroban RPC");
    err.code = "ECONNREFUSED";

    testLogger.error("Fallo de red", { err });

    expect(logs).toHaveLength(1);
    const entry = logs[0];
    expect(entry.err.message).toBe("Error de conexión al nodo Soroban RPC");
    expect(entry.err.code).toBe("ECONNREFUSED");
    expect(entry.err.stack).toBeDefined();
  });
});
