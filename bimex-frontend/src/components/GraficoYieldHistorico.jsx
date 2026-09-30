/**
 * Gráfico de yield histórico (issue #352).
 *
 * Lee `GET /yield/historico` del indexer: un agregado de los eventos de yield
 * que YA están indexados en la cadena (nunca se recalcula yield por visita).
 * El backend expone una serie `total` y, si el contrato llegara a publicar el
 * desglose en el evento, también `cetes` y `amm`. Mientras eso no ocurra,
 * `desglose_disponible` es `false` y el componente solo dibuja el total,
 * mostrando la nota que explica la limitación.
 *
 * El dibujo es SVG a mano (sin librerías de gráficas) para mantener el bundle
 * del proyecto igual que el resto de las vistas.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { stroopsAMXNe } from "../stellar/contrato";
import { formatearNumero } from "../utils/formato.js";
import { aStroops, formatearEjeY, indicesEtiquetasX, techoSerie, MAX_ETIQUETAS_X } from "../utils/yieldChart.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/** Granularidad inicial: la semana agrupa los reclamos en un eje legible. */
const GRANULARIDAD_POR_DEFECTO = "semana";

const GRANULARIDADES_UI = [
  { clave: "dia", claveI18n: "transp.yieldChartGranoDia" },
  { clave: "semana", claveI18n: "transp.yieldChartGranoSemana" },
  { clave: "mes", claveI18n: "transp.yieldChartGranoMes" },
];

/** Color de cada fuente de yield, alineado con la paleta de la página. */
const COLORES_SERIE = {
  total: { trazo: "var(--navy)", relleno: "var(--navy-dim)" },
  cetes: { trazo: "var(--green)", relleno: "var(--green-dim)" },
  amm: { trazo: "var(--amber)", relleno: "var(--amber-dim)" },
};

const ETIQUETAS_SERIE = {
  total: "transp.yieldChartSerieTotal",
  cetes: "transp.yieldChartSerieCetes",
  amm: "transp.yieldChartSerieAmm",
};

// Lienzo del gráfico (viewBox): el SVG escala al ancho del contenedor.
const ANCHO = 640;
const ALTO = 240;
const MARGEN = { arriba: 14, derecha: 18, abajo: 30, izquierda: 78 };
const DIVISIONES_Y = 4;

const ANCHO_UTIL = ANCHO - MARGEN.izquierda - MARGEN.derecha;
const ALTO_UTIL = ALTO - MARGEN.arriba - MARGEN.abajo;
const BASE_Y = MARGEN.arriba + ALTO_UTIL;

function redondear(valor) {
  return Number(valor.toFixed(2));
}

function xEnIndice(indice, total) {
  if (total <= 1) return MARGEN.izquierda + ANCHO_UTIL / 2;
  return MARGEN.izquierda + (indice * ANCHO_UTIL) / (total - 1);
}

function yEnValor(valor, techo) {
  const proporcion = techo > 0 ? Math.min(Math.max(valor / techo, 0), 1) : 0;
  return BASE_Y - proporcion * ALTO_UTIL;
}

function formatearMonto(stroops) {
  return stroopsAMXNe(aStroops(stroops));
}

/** Trazo, relleno y puntos de una serie dentro del gráfico compartido. */
function SerieYield({ fuente, puntos, techo, rellenar, textoPunto }) {
  const cfg = COLORES_SERIE[fuente] ?? { trazo: "var(--muted)", relleno: "var(--navy-dim)" };
  const coords = puntos.map((punto, i) => [
    redondear(xEnIndice(i, puntos.length)),
    redondear(yEnValor(Math.max(0, Number(punto.yield ?? 0)), techo)),
  ]);
  const trazo = coords.map(([cx, cy]) => `${cx},${cy}`).join(" ");
  const area = `${redondear(xEnIndice(0, puntos.length))},${redondear(BASE_Y)} ${trazo} ${redondear(xEnIndice(puntos.length - 1, puntos.length))},${redondear(BASE_Y)}`;

  return (
    <g data-serie={fuente}>
      {rellenar && <polygon points={area} fill={cfg.relleno} stroke="none" aria-hidden="true" />}
      <polyline
        points={trazo}
        fill="none"
        stroke={cfg.trazo}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      />
      {coords.map(([cx, cy], i) => (
        <circle
          key={puntos[i].periodo}
          cx={cx}
          cy={cy}
          r={3.5}
          fill="var(--card)"
          stroke={cfg.trazo}
          strokeWidth="2"
          data-punto={puntos[i].periodo}
        >
          <title>{textoPunto(puntos[i].periodo, formatearMonto(puntos[i].yield))}</title>
        </circle>
      ))}
    </g>
  );
}

function ResumenItem({ etiqueta, valor }) {
  return (
    <div style={estilos.resumenItem}>
      <div style={estilos.resumenEtiqueta}>{etiqueta}</div>
      <div style={estilos.resumenValor}>{valor}</div>
    </div>
  );
}

export default function GraficoYieldHistorico({ apiUrl = API_URL, proyectoId = null }) {
  const { t } = useTranslation();
  const [granularidad, setGranularidad] = useState(GRANULARIDAD_POR_DEFECTO);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [seriesOcultas, setSeriesOcultas] = useState([]);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const params = new URLSearchParams({ granularidad });
        if (proyectoId != null) params.set("proyecto_id", String(proyectoId));
        const res = await fetch(`${apiUrl}/yield/historico?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelado) return;
        setDatos(json);
      } catch (e) {
        if (cancelado) return;
        setDatos(null);
        setError(e?.message || "error");
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => { cancelado = true; };
  }, [apiUrl, granularidad, proyectoId, intento]);

  const series = datos?.series ?? [];
  const serieBase = series.find((s) => s.fuente === "total") ?? series[0];
  const periodos = serieBase?.puntos?.map((p) => p.periodo) ?? [];
  const visibles = series.filter((s) => !seriesOcultas.includes(s.fuente));
  const techo = techoSerie(visibles);
  const hayDesglose = Boolean(datos?.desglose_disponible) && series.length > 1;

  function alternarSerie(fuente) {
    setSeriesOcultas((prev) => {
      if (prev.includes(fuente)) return prev.filter((f) => f !== fuente);
      // Nunca se ocultan todas las series: el gráfico quedaría vacío.
      if (visibles.length <= 1) return prev;
      return [...prev, fuente];
    });
  }

  function etiquetaSerie(fuente) {
    return t(ETIQUETAS_SERIE[fuente] ?? fuente);
  }

  const textoPunto = (periodo, monto) => t("transp.yieldChartPointAria", { periodo, monto });
  const ariaGrafico = t("transp.yieldChartAria", {
    serie: visibles.map((s) => etiquetaSerie(s.fuente)).join(", "),
    puntos: formatearNumero(periodos.length),
  });

  return (
    <section className="card" style={estilos.seccion} aria-labelledby="yield-historico-titulo">
      <div style={estilos.encabezado}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h2 id="yield-historico-titulo" style={estilos.titulo}>{t("transp.yieldChartTitle")}</h2>
          <p style={estilos.subtitulo}>{t("transp.yieldChartSubtitle")}</p>
        </div>

        <div style={estilos.grupo}>
          <span style={estilos.grupoEtiqueta}>{t("transp.yieldChartGranularity")}</span>
          <div role="group" aria-label={t("transp.yieldChartGranularity")} style={estilos.botonesGrupo}>
            {GRANULARIDADES_UI.map((g) => {
              const activo = granularidad === g.clave;
              return (
                <button
                  key={g.clave}
                  type="button"
                  onClick={() => setGranularidad(g.clave)}
                  aria-pressed={activo}
                  style={estilos.botonToggle(activo)}
                >
                  {t(g.claveI18n)}
                </button>
              );
            })}
          </div>
        </div>
      </div>


      {cargando && (
        <div role="status" aria-live="polite" data-testid="yield-historico-cargando">
          <span style={estilos.soloLectores}>{t("transp.yieldChartLoading")}</span>
          <div className="skeleton" style={{ height: 200 }} aria-hidden="true" />
        </div>
      )}

      {!cargando && error && (
        <div role="alert" data-testid="yield-historico-error" style={estilos.error}>
          <span>
            {t("transp.yieldChartError")}{" "}
            <span style={estilos.errorDetalle}>({error})</span>
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setIntento((n) => n + 1)}
            style={estilos.botonReintentar}
          >
            {t("transp.retry")}
          </button>
        </div>
      )}

      {!cargando && !error && periodos.length === 0 && (
        <div style={estilos.vacio} data-testid="yield-historico-vacio">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--border2)" }} aria-hidden="true">
            <path d="M3 3v18h18" />
            <polyline points="7 15 11 10 15 13 20 6" />
          </svg>
          <p style={estilos.vacioTitulo}>{t("transp.yieldChartEmpty")}</p>
          <p style={estilos.vacioHint}>{t("transp.yieldChartEmptyHint")}</p>
        </div>
      )}

      {!cargando && !error && periodos.length > 0 && (
        <>
          {series.length > 1 && (
            <div role="group" aria-label={t("transp.yieldChartSerie")} style={estilos.leyenda}>
              {series.map((s) => {
                const visible = !seriesOcultas.includes(s.fuente);
                return (
                  <button
                    key={s.fuente}
                    type="button"
                    onClick={() => alternarSerie(s.fuente)}
                    aria-pressed={visible}
                    style={estilos.botonLeyenda(visible)}
                  >
                    <span style={estilos.muestra(COLORES_SERIE[s.fuente]?.trazo)} aria-hidden="true" />
                    {etiquetaSerie(s.fuente)}
                  </button>
                );
              })}
            </div>
          )}

          <figure style={estilos.figura} data-testid="yield-historico-grafico">
            <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} style={estilos.svg} role="img" aria-label={ariaGrafico}>
              {Array.from({ length: DIVISIONES_Y + 1 }, (_, i) => {
                const valor = (techo * i) / DIVISIONES_Y;
                const y = redondear(yEnValor(valor, techo));
                return (
                  <g key={`linea-y-${i}`} aria-hidden="true">
                    <line
                      x1={MARGEN.izquierda}
                      y1={y}
                      x2={ANCHO - MARGEN.derecha}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth="1"
                      strokeDasharray={i === 0 ? undefined : "4 4"}
                    />
                    <text
                      x={MARGEN.izquierda - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="var(--muted)"
                      fontFamily="'SFMono-Regular','Consolas',monospace"
                    >
                      {formatearEjeY(valor)}{i === DIVISIONES_Y ? " MXNe" : ""}
                    </text>
                  </g>
                );
              })}

              {indicesEtiquetasX(periodos.length, MAX_ETIQUETAS_X).map((i) => (
                <text
                  key={`etiqueta-x-${periodos[i]}`}
                  x={redondear(xEnIndice(i, periodos.length))}
                  y={BASE_Y + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--muted)"
                  aria-hidden="true"
                >
                  {periodos[i]}
                </text>
              ))}

              {visibles.map((s) => (
                <SerieYield
                  key={s.fuente}
                  fuente={s.fuente}
                  puntos={s.puntos}
                  techo={techo}
                  rellenar={visibles.length === 1}
                  textoPunto={textoPunto}
                />
              ))}
            </svg>
          </figure>

          <div style={estilos.resumen}>
            <ResumenItem etiqueta={t("transp.yieldChartTotal")} valor={formatearMonto(datos.total_yield)} />
            <div style={estilos.separador} aria-hidden="true" />
            <ResumenItem etiqueta={t("transp.yieldChartEvents")} valor={formatearNumero(datos.total_eventos ?? 0)} />
            <div style={estilos.separador} aria-hidden="true" />
            <ResumenItem etiqueta={t("transp.yieldChartPeriods")} valor={formatearNumero(periodos.length)} />
          </div>

          {!hayDesglose && (
            <p style={estilos.nota} data-testid="yield-historico-nota">
              {t("transp.yieldChartSplitNota")}
            </p>
          )}
        </>
      )}
    </section>
  );
}

const estilos = {
  seccion: { marginTop: 28 },
  encabezado: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    gap: 16, flexWrap: "wrap", marginBottom: 18,
  },
  titulo: { fontSize: "1.1rem", fontWeight: 700, marginBottom: 6, color: "var(--text)" },
  subtitulo: { fontSize: "0.82rem", color: "var(--muted)", margin: 0, lineHeight: 1.6, maxWidth: 640 },
  grupo: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" },
  grupoEtiqueta: { fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 },
  botonesGrupo: { display: "flex", gap: 6, flexWrap: "wrap" },
  botonToggle: (activo) => ({
    padding: "5px 12px", borderRadius: "var(--radius-sm)",
    fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: "0.78rem",
    cursor: "pointer", transition: "all 0.15s",
    background: activo ? "var(--navy)" : "var(--card)",
    color: activo ? "#fff" : "var(--text2)",
    border: `1px solid ${activo ? "var(--navy)" : "var(--border2)"}`,
  }),
  leyenda: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 },
  botonLeyenda: (visible) => ({
    display: "flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: "99px",
    fontFamily: "Inter, sans-serif", fontSize: "0.76rem", fontWeight: 600,
    cursor: "pointer", transition: "all 0.15s",
    background: visible ? "var(--bg)" : "var(--card)",
    color: visible ? "var(--text2)" : "var(--subtle)",
    border: `1px solid ${visible ? "var(--border2)" : "var(--border)"}`,
    textDecoration: visible ? "none" : "line-through",
  }),
  muestra: (color) => ({
    width: 10, height: 10, borderRadius: "99px",
    background: color ?? "var(--muted)", flexShrink: 0,
  }),
  figura: { margin: 0 },
  svg: { width: "100%", height: "auto", display: "block", overflow: "visible" },
  resumen: {
    display: "flex", alignItems: "center", flexWrap: "wrap",
    background: "var(--bg)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "12px 18px", marginTop: 16,
  },
  resumenItem: { flex: 1, minWidth: 120, textAlign: "center" },
  resumenEtiqueta: {
    fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase",
    letterSpacing: "0.07em", fontWeight: 600, marginBottom: 4,
  },
  resumenValor: {
    fontFamily: "'SFMono-Regular','Consolas',monospace",
    fontSize: "0.9rem", fontWeight: 700, color: "var(--text2)",
  },
  separador: { width: 1, height: 28, background: "var(--border)", flexShrink: 0 },
  nota: {
    fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.6,
    margin: "12px 0 0", padding: "10px 12px",
    background: "var(--bg)", border: "1px dashed var(--border2)",
    borderRadius: "var(--radius-sm)",
  },
  vacio: { display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", textAlign: "center" },
  vacioTitulo: { fontSize: "1rem", fontWeight: 600, color: "var(--text)", marginTop: 14 },
  vacioHint: { fontSize: "0.85rem", color: "var(--muted)", marginTop: 6, maxWidth: 420 },
  error: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    color: "var(--error, #DC2626)", background: "rgba(220,38,38,0.06)",
    border: "1px solid rgba(220,38,38,0.18)", borderRadius: "var(--radius-sm)",
    padding: "12px 16px", fontSize: "0.86rem",
  },
  errorDetalle: { color: "var(--muted)", fontSize: "0.78rem" },
  botonReintentar: { whiteSpace: "nowrap" },
  soloLectores: {
    position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
    overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
  },
};

