import React from "react";
import { useTranslation } from "react-i18next";

export default function Paginacion({ pagina, totalPaginas, onChange }) {
  const { t } = useTranslation();
  if (!totalPaginas || totalPaginas <= 1) return null;
  return (
    <div className="paginacion" role="navigation" aria-label={t("pagination.aria")}
      style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
      <button onClick={() => onChange(Math.max(0, pagina - 1))} disabled={pagina === 0} aria-label={t("pagination.prevAria")} className="btn btn-ghost">
        ← {t("pagination.prev")}
      </button>
      <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>{t("pagination.pageOf", { page: pagina + 1, total: totalPaginas })}</span>
      <button onClick={() => onChange(Math.min(totalPaginas - 1, pagina + 1))} disabled={pagina >= totalPaginas - 1} aria-label={t("pagination.nextAria")} className="btn btn-ghost">
        {t("pagination.next")} →
      </button>
    </div>
  );
}
