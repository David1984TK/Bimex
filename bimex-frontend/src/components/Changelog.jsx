const RELEASES = [
  {
    version: "Próximamente",
    date: null,
    sections: {
      "Agregado": [
        "Actualizaciones en tiempo real vía SSE: el indexer notifica cambios al instante (#62)",
        "Esta página de changelog (#81)",
      ],
    },
  },
  {
    version: "2.1.0",
    date: "2026-05-27",
    sections: {
      "Agregado": [
        "Dark mode con toggle en navbar (#59)",
        "Búsqueda de proyectos con debounce (#60)",
        "Compartir proyecto con código QR (#61)",
        "Página de transparencia con estadísticas on-chain (#57)",
        "Panel de recompensas conectado a datos reales del contrato (#56)",
        "Tasa CETES en vivo vía Etherfuse en la landing (#55)",
        "Soporte i18n español / inglés (#53)",
        "Skeleton loading states en todos los componentes (#48)",
        "Sistema de toasts reemplazando errores inline (#50)",
      ],
      "Mejorado": [
        "Code splitting: bundle reducido ~40% (#47)",
        "Diseño responsive mobile-first (#49)",
        "Panel admin con flujo de aprobación y rechazo (#46)",
      ],
      "Corregido": [
        "TTL management en storage del contrato (#64)",
        "Security headers en despliegue Vercel (#65)",
      ],
    },
  },
  {
    version: "2.0.0",
    date: "2026-04-23",
    sections: {
      "Agregado": [
        "Estado EnRevision: proyectos requieren aprobación del admin antes de aceptar fondos",
        "Funciones admin_aprobar() y admin_rechazar() en el contrato",
        "Estado Rechazado con campo motivo_rechazo",
        "doc_hash (BytesN<32>): hash SHA-256 del documento almacenado on-chain",
        "calcular_yield_detallado(): yield desglosado por CETES y AMM",
        "estado_capital(): distribución actual del capital",
        "solicitar_continuar(): permite a un nuevo dueño retomar un proyecto abandonado",
        "bimex-indexer: servicio de indexación on-chain",
      ],
      "Corregido (auditoría de seguridad)": [
        "Patrón CEI aplicado en contribuir(), retirar_principal(), reclamar_yield() y abandonar_proyecto()",
        "require_auth() movido al inicio de cada función antes de cualquier lectura de storage",
        "Cap de contribución: cantidad = cantidad.min(restante) previene overfunding",
        "Top-up preserva el timestamp original del backer",
        "calcular_yield_seguro() usa división anticipada para evitar overflow en i128",
        "Bounds check en inicializar(): yield_cetes_bps y yield_amm_bps no pueden exceder 10,000,000 bps",
      ],
      "Cambiado": [
        "Tasas actualizadas a producción: CETES 9.45% APY, AMM 4.00% APY",
      ],
    },
  },
  {
    version: "1.0.0",
    date: "2026-03-15",
    sections: {
      "Agregado": [
        "Demo inicial presentada en Hack+ Alebrije (Stellar | CDMX)",
        "Funciones base del contrato: crear_proyecto, contribuir, retirar_principal, reclamar_yield",
        "Frontend React con integración Freighter",
        "Despliegue en Stellar Testnet",
      ],
    },
  },
];

const SECTION_COLOR = {
  "Agregado": "var(--green)",
  "Mejorado": "var(--navy)",
  "Corregido": "var(--amber)",
  "Corregido (auditoría de seguridad)": "var(--amber)",
  "Cambiado": "var(--muted)",
  "Próximamente": "var(--navy)",
};

export default function Changelog() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
        Novedades
      </h1>
      <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 36 }}>
        Historial de cambios de Bimex. Formato{" "}
        <a href="https://keepachangelog.com/es/1.0.0/" target="_blank" rel="noreferrer" style={{ color: "var(--navy)" }}>
          Keep a Changelog
        </a>.
      </p>

      {RELEASES.map((release) => (
        <section key={release.version} style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>
              {release.version === "Próximamente" ? (
                <span style={{ background: "var(--navy-dim)", color: "var(--navy)", padding: "2px 10px", borderRadius: 99, fontSize: "0.82rem", fontWeight: 600 }}>
                  Próximamente
                </span>
              ) : (
                `v${release.version}`
              )}
            </h2>
            {release.date && (
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{release.date}</span>
            )}
          </div>

          {Object.entries(release.sections).map(([section, items]) => (
            <div key={section} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: SECTION_COLOR[section] ?? "var(--muted)", marginBottom: 8 }}>
                {section}
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 5 }}>
                {items.map((item) => (
                  <li key={item} style={{ fontSize: "0.88rem", color: "var(--text2)", lineHeight: 1.6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
