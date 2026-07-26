const ROUTE_TITLES = {
  "/": "Bimex — Crowdfunding de Impacto Social",
  "/proyectos": "Proyectos · Bimex",
  "/cuenta": "Mi Cuenta · Bimex",
  "/transparencia": "Transparencia · Bimex",
  "/impacto": "Historias de Impacto · Bimex",
  "/novedades": "Novedades · Bimex",
  "/terminos": "Términos · Bimex",
  "/privacidad": "Privacidad · Bimex",
  "/admin": "Admin · Bimex",
};

export function getRouteTitle(pathname) {
  return ROUTE_TITLES[pathname] ?? null;
}
