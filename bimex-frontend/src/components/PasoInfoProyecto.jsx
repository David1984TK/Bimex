import { useTranslation } from "react-i18next";

export default function PasoInfoProyecto({
  forma,
  manejarCambio,
  metaFormateada,
  yieldEstimado,
  yieldNote,
  error,
  avanzarAPaso2,
  onCerrar,
}) {
  const { t } = useTranslation();
  const categorias = Object.keys(t("crear.categories", { returnObjects: true }));

  return (
    <>
      <div className="campo">
        <label htmlFor="campo-nombre">{t("crear.nameLabel")}</label>
        <input
          id="campo-nombre"
          className="input"
          name="nombre"
          value={forma.nombre}
          onChange={manejarCambio}
          placeholder={t("crear.namePlaceholder")}
          maxLength={60}
          style={estilos.input}
          onFocus={e => { e.target.style.borderColor = "var(--navy)"; }}
          onBlur={e => { e.target.style.borderColor = "var(--border2)"; }}
        />
      </div>

      <div className="campo">
        <label htmlFor="campo-descripcion">{t("crear.descLabel")}</label>
        <textarea
          id="campo-descripcion"
          className="input"
          name="descripcion"
          value={forma.descripcion}
          onChange={manejarCambio}
          placeholder={t("crear.descPlaceholder")}
          rows={3}
          style={{ ...estilos.input, resize: "none" }}
          onFocus={e => { e.target.style.borderColor = "var(--navy)"; }}
          onBlur={e => { e.target.style.borderColor = "var(--border2)"; }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="campo" style={{ marginBottom: 0 }}>
          <label htmlFor="campo-categoria">{t("crear.categoryLabel")}</label>
          <select
            id="campo-categoria"
            className="input"
            name="categoria"
            value={forma.categoria}
            onChange={manejarCambio}
            style={{ ...estilos.input, cursor: "pointer" }}
            onFocus={e => { e.target.style.borderColor = "var(--navy)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--border2)"; }}
          >
            {categorias.map(c => <option key={c} value={c}>{t(`crear.categories.${c}`)}</option>)}
          </select>
        </div>
        <div className="campo" style={{ marginBottom: 0 }}>
          <label htmlFor="campo-tiempo">{t("crear.timeLabel")}</label>
          <input
            id="campo-tiempo"
            className="input"
            name="tiempoMeses"
            type="number"
            value={forma.tiempoMeses}
            onChange={manejarCambio}
            placeholder={t("crear.timePlaceholder")}
            min="1"
            max="120"
            style={estilos.input}
            onFocus={e => { e.target.style.borderColor = "var(--navy)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--border2)"; }}
          />
        </div>
      </div>

      <div className="campo" style={{ marginTop: 18 }}>
        <label htmlFor="campo-meta">{t("crear.goalLabel")}</label>
        <input
          id="campo-meta"
          className="input"
          name="meta"
          type="text"
          inputMode="numeric"
          value={metaFormateada}
          onChange={manejarCambio}
          placeholder="Ej. 10,000"
          style={estilos.input}
          onFocus={e => { e.target.style.borderColor = "var(--navy)"; }}
          onBlur={e => { e.target.style.borderColor = "var(--border2)"; }}
        />
      </div>

      {yieldEstimado && (
        <div style={estilos.yieldResumen}>
          <span style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Ganarías como inversor
          </span>
          <p style={{ color: "var(--green)", fontWeight: 700, fontSize: "1.15rem", fontVariantNumeric: "tabular-nums", margin: "4px 0" }}>
            ≈ ${yieldEstimado} MXNe
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: 0 }}>{yieldNote}</p>
        </div>
      )}

      {error && <p style={estilos.error}>{error}</p>}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={onCerrar} style={{ flex: 1 }}>
          {t("crear.cancel")}
        </button>
        <button type="button" className="btn btn-primary" onClick={avanzarAPaso2} style={{ flex: 2, justifyContent: "center" }}>
          {t("crear.nextDocs")}
        </button>
      </div>
    </>
  );
}

const estilos = {
  input: { borderColor: "var(--border2)", outline: "none" },
  yieldResumen: {
    background: "var(--green-dim)",
    border: "1.5px solid rgba(22,163,74,0.22)",
    borderRadius: "var(--radius-sm)",
    padding: "14px",
    marginTop: 16, marginBottom: 4,
    textAlign: "center",
  },
  error: {
    color: "var(--error, #DC2626)",
    fontSize: "0.83rem",
    background: "rgba(220,38,38,0.06)",
    border: "1px solid rgba(220,38,38,0.18)",
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    marginTop: 12,
  },
};
