import { describe, it, expect } from "vitest";
import { auditar, WHITELIST } from "../../scripts/i18n-audit.mjs";

describe("i18n coverage audit guard (#353)", () => {
  it("confirms there are zero un-migrated Spanish strings in src/** outside the documented whitelist", () => {
    const { hallazgos, excepciones } = auditar();
    if (hallazgos.length > 0) {
      const summary = hallazgos.map(h => `${h.file}:${h.line} [${h.tipo}] ${h.texto}`).join("\n");
      expect.fail(`Se encontraron ${hallazgos.length} textos en español hardcodeados sin i18n:\n${summary}`);
    }
    expect(hallazgos).toHaveLength(0);
    expect(excepciones.length).toBeGreaterThan(0);
    expect(WHITELIST.map(w => w.file)).toEqual([
      "src/utils/socialPreview.js",
      "src/utils/metaTags.js",
      "src/stellar/contrato.js"
    ]);
  });
});
