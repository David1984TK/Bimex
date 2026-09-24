# Auditoría de Cobertura i18n (`react-i18next`)

> Documento generado como parte de la resolución de la **Issue #353**: *test: auditar cobertura real de i18n (react-i18next) — confirmar que no queden textos hardcodeados*.

## Resumen Ejecutivo

El frontend de Bimex implementó soporte i18n (Español / Inglés) con `react-i18next` (#53). Tras iteraciones y nuevas características (Admin, Recompensas, Changelog, Landing), se realizó una auditoría automatizada exhaustiva de todos los archivos en `bimex-frontend/src/**` para identificar y migrar textos en español que aún estuvieran hardcodeados.

### Métricas de Cobertura
- **Archivos auditados**: Todos los componentes, hooks y utilidades en `bimex-frontend/src/` (excluyendo tests, que mantienen fixtures deliberadas).
- **Textos migrados**: ~150 textos hardcodeados trasladados a claves en `es.json` y `en.json`.
- **Hallazgos restantes no migrados**: **0** (verificado vía `node scripts/i18n-audit.mjs` y suite `src/test/i18nCoverage.test.jsx`).

---

## 1. Inventario de Componentes y Textos Migrados

A continuación se detalla la lista de componentes que contenían textos sin traducir y las secciones/claves correspondientes añadidas:

| Componente / Módulo | Textos Encontrados | Claves i18n Creadas / Asignadas | Estado |
| :--- | :--- | :--- | :--- |
| **`src/App.jsx`** (Landing y Shell) | - Hero: badge, títulos, descripción<br>- Yield card: etiquetas, porcentajes, subtítulos<br>- Stats bar: proyectos activos, MXNe invertidos, APY CETES/AMM<br>- Features: 3 bloques (títulos y descripciones)<br>- Cómo funciona: 4 pasos explicativos<br>- CTA final de invitación y footer<br>- Atributos de accesibilidad (`aria-label`, `title`) y botón de retorno | `landing.hero*`<br>`landing.yieldCard.*`<br>`landing.stats*`<br>`landing.features.*`<br>`landing.steps.*`<br>`landing.ready*`<br>`landing.footer*`<br>`comun.faucetTitle`<br>`comun.cerrarToastAria`<br>`comun.volver` | **Migrado** |
| **`src/utils/errores.js`** | 43 mensajes de error traducidos al usuario en toasts (`parsearError`) que cubren conectividad, Soroban RPC, Freighter, IPFS, contratos y validaciones de saldo | `errores.*` (43 claves estructuradas en ES y EN) | **Migrado** |
| **`src/components/Recompensas.jsx`** | - Nombres de niveles (`Semilla`, `Brote`, `Árbol`, `Selva`)<br>- Nombres y descripciones de las 8 insignias/recompensas | `recompensas.tiers.*`<br>`recompensas.items.*` | **Migrado** |
| **`src/components/Changelog.jsx`** | - Título, subtítulo, etiqueta "Próximamente"<br>- Nombres de secciones (Agregado, Mejorado, Corregido, etc.)<br>- Lista completa de notas de versiones 1.0.0, 2.0.0, 2.1.0 y próximas | `changelog.title`<br>`changelog.subtitle`<br>`changelog.upcoming`<br>`changelog.sections.*`<br>`changelog.releases` | **Migrado** |
| **`src/components/CrearProyecto.jsx`** | - Atributo `aria-label="Eliminar archivo"`<br>- Texto "Ganarías como inversor"<br>- Inicialización de categoría por defecto | `crear.removeFileAria`<br>`crear.investorYieldLabel`<br>Uso dinámico de `crear.categories` | **Migrado** |
| **`src/components/MiCuenta.jsx`** | - Título y descripción de "Notificaciones por email"<br>- `aria-label` del campo de suscripción<br>- Placeholder genérico de correo | `cuenta.notificationsTitle`<br>`cuenta.notificationsDesc` | **Migrado** |
| **`src/components/AdminPanel.jsx`** | - Atributo `aria-label="Cargando proyectos"` en spinner | `admin.loadingProjectsAria` | **Migrado** |

---

## 2. Excepciones Justificadas (Whitelist)

Los siguientes archivos fueron excluidos intencionalmente de la traducción mediante i18next tras un análisis de dependencias de runtime:

1. **`src/utils/socialPreview.js`**:
   - *Razón*: Se importa desde `middleware.js` (Vercel Edge Runtime) y desde la serverless function `/api/og`. No tiene acceso al DOM, al `localStorage` ni al detector de lenguaje del navegador cliente donde opera i18next. Los metadatos SEO por defecto se sirven en español.
2. **`src/utils/metaTags.js`**:
   - *Razón*: Módulo auxiliar de `socialPreview.js` que inyecta etiquetas Open Graph / Twitter estáticas en el HTML. Mismo entorno de ejecución no-cliente.
3. **`src/stellar/contrato.js`**:
   - *Razón*: Capa de transporte de bajo nivel que interactúa directamente con Soroban SDK y Freighter. Los mensajes de error técnicos lanzados (`throw new Error(...)`) son interceptados por `src/utils/errores.js` (`parsearError`), el cual sí traduce el mensaje para el usuario mediante `i18n.t("errores.*")`.

---

## 3. Automatización y Prevención de Regresiones

Para garantizar que futuros cambios no reintroduzcan textos hardcodeados:
1. **Script CLI**: `bimex-frontend/scripts/i18n-audit.mjs` analiza el AST/código fuente buscando textos en español en JSX, atributos y literales de datos fuera de llamadas `t()`.
2. **Test Guard**: `bimex-frontend/src/test/i18nCoverage.test.jsx` se ejecuta en cada corrida de `npm run test:run` y en el pipeline de CI, fallando si se detectan cadenas no traducidas fuera de la whitelist documentada.
