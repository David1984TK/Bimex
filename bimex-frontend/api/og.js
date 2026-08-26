// Genera la imagen OG dinámica por proyecto: /api/og?id=42
//
// Runtime edge de Vercel (@vercel/og requiere edge). Sin JSX: satori acepta
// elementos como objetos planos { type, props }.
// Si falta INDEXER_URL o falla la consulta, redirige al og-image.png genérico
// para que los crawlers nunca reciban una imagen rota.
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const ANCHO = 1200;
const ALTO = 630;
const NAVY = "#0f172a";
const TEAL = "#14b8a6";

async function obtenerProyecto(id) {
  const base = process.env.INDEXER_URL || process.env.VITE_INDEXER_URL || "";
  if (!base || !Number.isInteger(id)) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/proyectos/${id}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function aNumero(valor) {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatoMXNe(stroops) {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(aNumero(stroops) / 10_000_000);
}

function tarjeta(proyecto) {
  const nombre = String(proyecto?.nombre ?? "").slice(0, 90) || "Proyecto Bimex";
  const meta = aNumero(proyecto?.meta);
  const aportado = aNumero(proyecto?.total_aportado ?? proyecto?.aportado);
  const porcentaje = meta > 0 ? Math.min((aportado / meta) * 100, 100) : 0;
  const barra = Math.max(porcentaje > 0 ? 4 : 0, porcentaje);

  return {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        backgroundColor: NAVY,
        backgroundImage: "linear-gradient(135deg, #0f172a 60%, #134e4a 100%)",
        color: "#f8fafc",
        fontFamily: "sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: 16 },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    backgroundColor: TEAL,
                    color: NAVY,
                    fontSize: 32,
                    fontWeight: 700,
                  },
                  children: "B",
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: 1 },
                  children: "BIMEX",
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 22, color: "#94a3b8" },
                  children: "Crowdfunding de Impacto Social",
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.15,
            },
            children: nombre,
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: 20 },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    width: "100%",
                    height: 22,
                    borderRadius: 99,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    overflow: "hidden",
                  },
                  children: {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        width: `${barra}%`,
                        backgroundColor: TEAL,
                      },
                    },
                  },
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 28,
                    color: "#cbd5e1",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", color: "#5eead4", fontWeight: 700 },
                        children: `${formatoMXNe(aportado)} MXNe recaudados`,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: { display: "flex" },
                        children: `Meta: ${formatoMXNe(meta)} MXNe · ${porcentaje.toFixed(0)}%`,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export default async function GET(request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  const proyecto = await obtenerProyecto(id);

  if (!proyecto) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/og-image.png" },
    });
  }

  try {
    return new ImageResponse(tarjeta(proyecto), {
      width: ANCHO,
      height: ALTO,
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: "/og-image.png" },
    });
  }
}
