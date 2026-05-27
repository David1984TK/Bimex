export const NIVELES = [
  {
    id: "semilla", nombre: "Semilla", icono: "🌱", min: 0, max: 999,
    color: "var(--navy)", bg: "var(--navy-dim)", border: "rgba(30,58,95,0.18)",
    recompensas: [
      { id: "r1", nombre: "Badge Semilla", desc: "Tu primer paso en Bimex",     icono: "🏅", umbral: 0, desbloqueado: true  },
      { id: "r2", nombre: "Primer aporte", desc: "Contribuiste tu primer MXNe", icono: "💚", umbral: 1, desbloqueado: false },
    ],
  },
  {
    id: "brote", nombre: "Brote", icono: "🌿", min: 1_000, max: 9_999,
    color: "var(--green)", bg: "var(--green-dim)", border: "rgba(22,163,74,0.20)",
    recompensas: [
      { id: "r3", nombre: "Inversor Brote",  desc: "Invertiste 1,000+ MXNe en total",   icono: "🌿", umbral: 1_000, desbloqueado: false },
      { id: "r4", nombre: "Regalo sorpresa", desc: "Desbloquea al llegar a 5,000 MXNe", icono: "🎁", umbral: 5_000, desbloqueado: false },
    ],
  },
  {
    id: "arbol", nombre: "Árbol", icono: "🌳", min: 10_000, max: 99_999,
    color: "var(--amber)", bg: "var(--amber-dim)", border: "rgba(217,119,6,0.20)",
    recompensas: [
      { id: "r5", nombre: "Árbol de impacto", desc: "Invertiste 10,000+ MXNe",          icono: "🌳", umbral: 10_000, desbloqueado: false },
      { id: "r6", nombre: "Caja misteriosa",  desc: "Acceso exclusivo a proyectos VIP", icono: "📦", umbral: 50_000, desbloqueado: false },
    ],
  },
  {
    id: "selva", nombre: "Selva", icono: "🌲", min: 100_000, max: Infinity,
    color: "#065F46", bg: "rgba(6,95,70,0.07)", border: "rgba(6,95,70,0.20)",
    recompensas: [
      { id: "r7", nombre: "Guardián Selva", desc: "Invertiste 100,000+ MXNe",      icono: "🌲", umbral: 100_000, desbloqueado: false },
      { id: "r8", nombre: "NFT exclusivo",  desc: "NFT de colección arte mexicano", icono: "🎨", umbral: 200_000, desbloqueado: false },
    ],
  },
];

export function nivelActual(totalMXNe) {
  return NIVELES.slice().reverse().find(n => totalMXNe >= n.min) ?? NIVELES[0];
}

export function nivelSiguiente(totalMXNe) {
  return NIVELES.find(n => n.min > totalMXNe) ?? null;
}

export function calcularRecompensas(totalMXNe) {
  return NIVELES.flatMap(n =>
    n.recompensas.map(r => ({ ...r, desbloqueado: totalMXNe >= r.umbral }))
  );
}
