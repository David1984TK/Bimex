import { useTranslation } from "react-i18next";

function IconIPFS() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function DocChip({ label, nombre }) {
  if (!nombre) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "var(--green-dim)", border: "1px solid rgba(22,163,74,0.25)",
      borderRadius: 99, padding: "3px 10px",
      fontSize: "0.72rem", color: "var(--green)", fontWeight: 600,
    }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      {label}
    </span>
  );
}

export default function PasoConfirmar({ forma, docs, docCid, ipfsCids, cargando, error, manejarSubmit, setPaso, setError }) {
  const { t } = useTranslation();
  const hexHash = docCid ?? "";

  return (
    <>
      <div style={estilos.resumenCard}>
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>{forma.nombre}</p>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
            {forma.categoria} · Meta: ${Number(forma.meta).toLocaleString("es-MX")} MXNe
          </p>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <DocChip nombre={docs.ine?.name} label="INE" />
          <DocChip nombre={docs.plan?.name} label="Plan" />
          <DocChip nombre={docs.presupuesto?.name} label="Presupuesto" />
        </div>

        <div style={estilos.hashPanel}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <IconIPFS />
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {ipfsCids ? "Documentos en IPFS" : t("crear.hashTitle")}
            </p>
          </div>
          {ipfsCids ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[["INE", ipfsCids.ine], ["Plan", ipfsCids.plan], ["Presupuesto", ipfsCids.presupuesto]].map(([label, cid]) => (
                <div key={cid} style={{ fontSize: "0.72rem" }}>
                  <span style={{ color: "var(--muted)", marginRight: 6 }}>{label}</span>
                  <a href={`https://ipfs.io/ipfs/${cid}`} target="_blank" rel="noreferrer"
                     style={{ fontFamily: "monospace", color: "var(--navy)", wordBreak: "break-all" }}>
                    {cid.slice(0, 20)}…
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <code style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--navy)", wordBreak: "break-all", lineHeight: 1.6 }}>
              {hexHash.slice(0, 32)}<br />{hexHash.slice(32)}
            </code>
          )}
          <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 8 }}>
            {ipfsCids ? "Tus documentos están guardados en IPFS y verificables públicamente." : t("crear.hashNote")}
          </p>
        </div>
      </div>

      <div style={estilos.infoBanner}>
        <IconInfo />
        <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
          <p style={{ marginBottom: 8 }}>
            {t("crear.yieldInfoTitle")}
            <strong style={{ color: "var(--navy)" }}>{t("crear.yieldInfoYou")}</strong>
            {t("crear.yieldInfoThey")}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={estilos.badgeVerde}>9.45% CETES · Etherfuse</span>
            <span style={estilos.badgeNavy}>4% AMM · Stellar</span>
            <span style={estilos.badgeAmber}>= 13.45% anual</span>
          </div>
        </div>
      </div>

      {error && <p style={estilos.error}>{error}</p>}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={() => { setPaso(2); setError(""); }} style={{ flex: 1 }}>
          {t("crear.back")}
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={cargando}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {cargando ? t("crear.submitting") : t("crear.submit")}
        </button>
      </div>
    </>
  );
}

const estilos = {
  resumenCard: {
    background: "var(--bg)", border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)", padding: 18, marginBottom: 16,
  },
  hashPanel: {
    background: "#fff", border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)", padding: "12px 14px",
  },
  infoBanner: {
    display: "flex", gap: 10, alignItems: "flex-start",
    background: "var(--navy-dim)", border: "1.5px solid rgba(30,58,95,0.14)",
    borderRadius: "var(--radius-sm)", padding: "12px 14px", marginTop: 4,
  },
  badgeVerde: {
    background: "var(--green-dim)", border: "1px solid rgba(22,163,74,0.25)",
    borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700, color: "var(--green)",
  },
  badgeNavy: {
    background: "var(--navy-dim)", border: "1px solid rgba(30,58,95,0.20)",
    borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700, color: "var(--navy)",
  },
  badgeAmber: {
    background: "var(--amber-dim)", border: "1px solid rgba(217,119,6,0.20)",
    borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700, color: "var(--amber)",
  },
  error: {
    color: "var(--error, #DC2626)", fontSize: "0.83rem",
    background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)",
    padding: "10px 14px", borderRadius: "var(--radius-sm)", marginTop: 12,
  },
};
