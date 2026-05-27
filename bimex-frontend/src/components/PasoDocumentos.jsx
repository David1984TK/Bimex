import { useState } from "react";
import { useTranslation } from "react-i18next";

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function IconID() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <circle cx="8" cy="12" r="2"/>
      <path d="M14 9h4M14 12h4M14 15h2"/>
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  );
}

function IconPaperclip() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  );
}

function IconLightbulb() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="2" x2="12" y2="3"/>
      <path d="M12 6a6 6 0 0 1 6 6c0 2.2-1.2 4.1-3 5.2V19a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1.8C7.2 16.1 6 14.2 6 12a6 6 0 0 1 6-6z"/>
      <line x1="9" y1="22" x2="15" y2="22"/>
    </svg>
  );
}

function CampoDocumento({ id, label, descripcion, accept, icono, archivo, onChange, selectLabel, maxSizeLabel }) {
  const [sizeError, setSizeError] = useState(false);
  return (
    <div style={estilos.campoDoc}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={estilos.docIcono}>{icono}</div>
        <div style={{ flex: 1 }}>
          <label htmlFor={id} style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text2)", display: "block", marginBottom: 2 }}>
            {label} <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginBottom: 8 }}>{descripcion}</p>
          <label htmlFor={id} className="file-label-touch" style={estilos.fileLabel}>
            {archivo ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: "0.78rem", color: "var(--green)", fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {archivo.name}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>({(archivo.size / 1024).toFixed(0)} KB)</span>
              </>
            ) : (
              <>
                <IconPaperclip />
                <span style={{ fontSize: "0.8rem", color: "var(--navy)", fontWeight: 600 }}>{selectLabel}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{maxSizeLabel}</span>
              </>
            )}
          </label>
          <input
            id={id}
            type="file"
            accept={accept}
            style={{ display: "none" }}
            onChange={e => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 10_000_000) { e.target.value = ""; setSizeError(true); onChange(null); return; }
              setSizeError(false);
              onChange(f);
            }}
          />
          {sizeError && (
            <p style={{ fontSize: "0.74rem", color: "#DC2626", marginTop: 6 }}>
              El archivo supera el límite de 10 MB.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PasoDocumentos({ docs, setDoc, error, hasheando, avanzarAPaso3, setPaso, setError }) {
  const { t } = useTranslation();

  return (
    <>
      <div style={estilos.docsBanner}>
        <IconLock />
        <div>
          <p style={{ fontSize: "0.82rem", color: "var(--text2)", fontWeight: 700, marginBottom: 4 }}>
            {t("crear.docsPrivacyTitle")}
          </p>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>
            {t("crear.docsPrivacyDesc")}
          </p>
        </div>
      </div>

      <CampoDocumento
        id="doc-ine"
        label={t("crear.docIneLabel")}
        descripcion={t("crear.docIneDesc")}
        accept=".pdf,image/jpeg,image/png,image/webp"
        icono={<IconID />}
        archivo={docs.ine}
        onChange={f => setDoc("ine", f)}
        selectLabel={t("crear.selectFile")}
        maxSizeLabel={t("crear.maxSize")}
      />

      <CampoDocumento
        id="doc-plan"
        label={t("crear.docPlanLabel")}
        descripcion={t("crear.docPlanDesc")}
        accept=".pdf"
        icono={<IconFileText />}
        archivo={docs.plan}
        onChange={f => setDoc("plan", f)}
        selectLabel={t("crear.selectFile")}
        maxSizeLabel={t("crear.maxSize")}
      />

      <CampoDocumento
        id="doc-presupuesto"
        label={t("crear.docBudgetLabel")}
        descripcion={t("crear.docBudgetDesc")}
        accept=".pdf"
        icono={<IconBriefcase />}
        archivo={docs.presupuesto}
        onChange={f => setDoc("presupuesto", f)}
        selectLabel={t("crear.selectFile")}
        maxSizeLabel={t("crear.maxSize")}
      />

      <div style={estilos.docsTip}>
        <IconLightbulb />
        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          {t("crear.docsTip")}
        </span>
      </div>

      {error && <p style={estilos.error}>{error}</p>}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={() => { setPaso(1); setError(""); }} style={{ flex: 1 }}>
          {t("crear.back")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={avanzarAPaso3}
          disabled={hasheando}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {hasheando ? t("crear.processing") : t("crear.generateHash")}
        </button>
      </div>
    </>
  );
}

const estilos = {
  docsBanner: {
    display: "flex", gap: 12, alignItems: "flex-start",
    background: "var(--navy-dim)", border: "1.5px solid rgba(30,58,95,0.14)",
    borderRadius: "var(--radius-sm)", padding: 14, margin: "14px 0 18px",
  },
  campoDoc: {
    background: "var(--bg)", border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)", padding: 14, marginBottom: 10,
  },
  docIcono: {
    background: "var(--navy-dim)", borderRadius: "var(--radius-sm)",
    padding: "8px", flexShrink: 0, marginTop: 2,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  fileLabel: {
    display: "inline-flex", alignItems: "center", gap: 8,
    border: "1.5px dashed rgba(30,58,95,0.28)", borderRadius: "var(--radius-sm)",
    padding: "8px 14px", cursor: "pointer", background: "#fff", transition: "all 0.15s",
  },
  docsTip: {
    display: "flex", gap: 8, alignItems: "center",
    padding: "8px 12px", background: "rgba(0,0,0,0.03)",
    borderRadius: "var(--radius-sm)", marginTop: 4,
  },
  error: {
    color: "var(--error, #DC2626)", fontSize: "0.83rem",
    background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)",
    padding: "10px 14px", borderRadius: "var(--radius-sm)", marginTop: 12,
  },
};
