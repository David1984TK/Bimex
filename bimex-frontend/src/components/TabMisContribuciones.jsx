import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { parsearError } from "../utils/errores.js";
import { usePaginacion, ControlPagina } from "../hooks/usePaginacion.jsx";
import { obtenerAportacion, calcularYield, stroopsAMXNe } from "../stellar/contrato";

const ESTADO_CFG = {
  EtapaInicial: { labelKey: "status.EtapaInicial", badgeClass: "badge-muted"  },
  EnProgreso:   { labelKey: "status.EnProgreso",   badgeClass: "badge-teal"   },
  Liberado:     { labelKey: "status.Liberado",     badgeClass: "badge-amber"  },
  Abandonado:   { labelKey: "status.Abandonado",   badgeClass: "badge-red"    },
  EnRevision:   { labelKey: "status.EnRevision",   badgeClass: null, customStyle: { background: "var(--amber-dim)", color: "var(--amber)", border: "1px solid rgba(217,119,6,0.20)" } },
  Rechazado:    { labelKey: "status.Rechazado",    badgeClass: "badge-red"    },
};

function getBadgeCfg(estado) {
  return ESTADO_CFG[estado] ?? ESTADO_CFG.EtapaInicial;
}

function puedeRetirar(estado) {
  return estado === "Liberado" || estado === "Abandonado";
}

function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function IconInbox() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  );
}

function EstadoBadge({ estado }) {
  const { t } = useTranslation();
  const cfg = getBadgeCfg(estado);
  if (cfg.customStyle) {
    return <span className="badge" style={cfg.customStyle}>{t(cfg.labelKey)}</span>;
  }
  return <span className={`badge ${cfg.badgeClass}`}>{t(cfg.labelKey)}</span>;
}

export function SkeletonTableRows({ count = 5 }) {
  return (
    <div aria-hidden="true" style={{ pointerEvents: "none", userSelect: "none" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 16, padding: "12px 14px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
          <div className="skeleton" style={{ height: 16, width: "25%" }} />
          <div className="skeleton" style={{ height: 16, width: "10%" }} />
          <div className="skeleton" style={{ height: 16, width: "12%" }} />
          <div className="skeleton" style={{ height: 16, width: "12%" }} />
          <div className="skeleton" style={{ height: 16, width: "15%" }} />
          <div className="skeleton" style={{ height: 16, width: "10%" }} />
          <div className="skeleton" style={{ height: 28, width: "16%", borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

export default function TabMisContribuciones({ proyectos, direccion, onVerProyecto }) {
  const { t } = useTranslation();
  const [contribuciones, setContribuciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorContrib, setErrorContrib] = useState(null);
  const tableRef = useRef(null);

  useEffect(() => {
    if (proyectos.length === 0) {
      setCargando(false);
      return;
    }

    async function cargarContribuciones() {
      setCargando(true);
      setErrorContrib(null);
      try {
        const resultados = await Promise.all(
          proyectos.map(async (p) => {
            const [aportacion, yieldAcum] = await Promise.all([
              obtenerAportacion(p.id, direccion),
              calcularYield(p.id, direccion),
            ]);
            return { proyecto: p, aportacion, yieldAcum };
          })
        );
        setContribuciones(resultados.filter((r) => r.aportacion > BigInt(0)));
      } catch (e) {
        setErrorContrib(parsearError(e));
      } finally {
        setCargando(false);
      }
    }

    cargarContribuciones();
  }, [proyectos, direccion]);

  const { datosPagina, pagina, setPagina, totalPaginas, cargandoPagina } =
    usePaginacion(contribuciones, [contribuciones]);

  const handlePaginaChange = (nuevaPagina) => {
    setPagina(nuevaPagina);
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (cargando) {
    return (
      <div role="status" aria-live="polite" aria-label={t("cuenta.loading")}>
        <SkeletonTableRows count={5} />
      </div>
    );
  }

  if (errorContrib) {
    return (
      <div role="alert" style={{ color: "var(--error, #DC2626)", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)", borderRadius: "var(--radius-sm)", padding: "14px 18px", fontSize: "0.86rem", marginTop: 8 }}>
        {errorContrib}
      </div>
    );
  }

  if (contribuciones.length === 0) {
    return (
      <div style={estilos.empty}>
        <IconInbox />
        <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", marginTop: 16 }}>
          {t("cuenta.noContributions")}
        </p>
        <p style={{ fontSize: "0.86rem", color: "var(--muted)", marginTop: 6 }}>
          {t("cuenta.noContributionsHint")}
        </p>
      </div>
    );
  }

  return (
    <div ref={tableRef} style={{ overflowX: "auto", opacity: cargandoPagina ? 0.5 : 1, transition: "opacity 0.15s" }}>
      {cargandoPagina && <SkeletonTableRows count={5} />}
      {!cargandoPagina && (
        <table style={estilos.table}>
          <thead>
            <tr>
              <th style={estilos.th}>{t("cuenta.colProyecto")}</th>
              <th style={estilos.th}>{t("cuenta.colModo")}</th>
              <th style={{ ...estilos.th, textAlign: "right" }}>{t("cuenta.colCapital")}</th>
              <th style={{ ...estilos.th, textAlign: "right" }}>{t("cuenta.colRendimiento")}</th>
              <th style={estilos.th}>{t("cuenta.colEstado")}</th>
              <th style={estilos.th}>{t("cuenta.colCierre")}</th>
              <th style={estilos.th} />
            </tr>
          </thead>
          <tbody>
            {datosPagina.map(({ proyecto, aportacion, yieldAcum }) => {
              const puedeRet = puedeRetirar(proyecto.estado);
              const modo = proyecto.modo ?? "Inversor";
              return (
                <tr key={proyecto.id} style={estilos.tr}>
                  <td style={estilos.td}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{proyecto.nombre}</span>
                  </td>
                  <td style={estilos.td}>
                    <span className={modo === "Mecenas" ? "badge badge-teal" : "badge badge-navy"}>{modo}</span>
                  </td>
                  <td style={{ ...estilos.td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {stroopsAMXNe(aportacion)}
                  </td>
                  <td style={{ ...estilos.td, textAlign: "right", color: "var(--green)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {stroopsAMXNe(yieldAcum)}
                  </td>
                  <td style={estilos.td}>
                    <EstadoBadge estado={proyecto.estado} />
                  </td>
                  <td style={{ ...estilos.td, color: "var(--muted)", fontSize: "0.83rem" }}>
                    {proyecto.fecha_cierre ?? "—"}
                  </td>
                  <td style={{ ...estilos.td, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                        onClick={() => onVerProyecto(proyecto)}
                        aria-label={`${t("cuenta.viewDetailsShort")} ${proyecto.nombre}`}
                      >
                        <IconFile />
                      </button>
                      {puedeRet && (
                        <button
                          className="btn btn-amber"
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          onClick={() => onVerProyecto(proyecto)}
                          aria-label={`${t("cuenta.withdraw")} ${proyecto.nombre}`}
                        >
                          {t("cuenta.withdraw")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <ControlPagina pagina={pagina} totalPaginas={totalPaginas} onChange={handlePaginaChange} t={t} />
    </div>
  );
}

const estilos = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th: { padding: "10px 14px", textAlign: "left", fontSize: "0.70rem", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, color: "var(--muted)", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "12px 14px", color: "var(--text2)", verticalAlign: "middle" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", textAlign: "center" },
};
