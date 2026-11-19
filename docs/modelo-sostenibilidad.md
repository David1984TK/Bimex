# Modelo de Sostenibilidad de la Plataforma Bimex

**Estado:** Borrador de propuesta (#461)
**Fecha:** 2026-10-19
**Alcance:** Stellar Wave (200 puntos)

## 1. Contexto actual

Bimex opera actualmente bajo un modelo 100% orientado al usuario y a los proyectos: el rendimiento total generado por los instrumentos subyacentes (CETES + AMM en la red Stellar / Soroban) se transfiere íntegramente a los participantes (backers) y creadores de los proyectos. El contrato inteligente principal (`bimex/contracts/bimex/src/lib.rs`) no contempla ningún hook ni desvío de comisiones hacia una tesorería o cuenta operadora.

Aunque este diseño maximiza el valor y la confianza inicial de los usuarios, plantea un desafío crítico a mediano y largo plazo: **la sostenibilidad operativa de la infraestructura** (nodos RPC de Stellar, bases de datos Supabase, alojamiento en Vercel, indexadores y servicios de monitoreo) recae enteramente sobre los desarrolladores principales, sin un flujo de ingresos autónomo que permita cubrir dichos costos de forma descentralizada o autosuficiente.

---

## 2. Evaluación de Mecanismos de Ingresos

Se han evaluado tres mecanismos principales para financiar la operación de la plataforma:

### Mecanismo A: Comisión opcional sobre el rendimiento (Performance Fee / Take Rate)
- **Descripción:** Retener un porcentaje pequeño (ej. 25 a 50 puntos básicos, 0.25% - 0.50%) del rendimiento generado por CETES o AMM al momento de reclamar o liquidar yields.
- **Ventajas:** 
  - Escalable: Los ingresos crecen de manera directamente proporcional al volumen total depositado y al rendimiento generado.
  - Pasivo y transparente: No requiere aportaciones adicionales por parte de los usuarios, ya que se deduce directamente de los intereses generados.
- **Desventajas:**
  - Reduce ligeramente la tasa efectiva percibida por el backer.
  - Requiere modificar el contrato inteligente (`lib.rs`) para desviar una fracción del yield hacia la dirección de la tesorería de Bimex.

### Mecanismo B: Donación voluntaria al finalizar (Tip / Voluntary Fee)
- **Descripción:** Al momento de retirar el principal o reclamar el rendimiento finalizado un proyecto, la interfaz de usuario ofrece una opción opcional (marcada por defecto con un monto simbólico o cero) para donar una pequeña cantidad a la plataforma.
- **Ventajas:**
  - No requiere cambios en la lógica inmutable del contrato inteligente.
  - Preserva el 100% de la propuesta de valor original sin fricciones regulatorias de comisiones obligatorias.
- **Desventajas:**
  - Altamente impredecible; la tasa de conversión en donaciones voluntarias en Web3 suele ser inferior al 1-2%, lo cual es insuficiente para cubrir costos fijos mensuales.

### Mecanismo C: Patrocinio de proyectos y listados destacados (Project Sponsorship)
- **Descripción:** Cobrar una tarifa fija en MXNe o XLM a los creadores de proyectos que deseen un proceso de revisión prioritaria, insignia de verificación destacada o espacio promocional en el banner principal de la plataforma.
- **Ventajas:**
  - Monetiza el acceso de los emisores (creadores de proyectos) en lugar de gravar a los ahorradores/backers.
- **Desventajas:**
  - Depende de un volumen constante de nuevos proyectos listados.
  - Puede introducir incentivos perversos si la priorización de revisión se confunde con la seguridad o cumplimiento normativo.

---

## 3. Mecanismo Recomendado

Se recomienda adoptar un **modelo híbrido basado principalmente en el Mecanismo A (Comisión opcional/configurable sobre el rendimiento, ej. 25 bps)** complementado opcionalmente con el **Mecanismo C** para creadores institucionales.

- **Por qué se recomienda:** Garantiza un flujo de caja predecible y correlacionado con el crecimiento del TVL (Total Value Locked), asegurando que la plataforma pueda mantenerse activa, auditable y con soporte técnico permanente sin depender de donaciones esporádicas.

---

## 4. Proyección Financiera a 12 Meses

Los siguientes cálculos estiman los costos operativos mensuales y los ingresos proyectados bajo el mecanismo recomendado (asumiendo una comisión del 0.25% sobre el rendimiento generado y un crecimiento moderado del TVL).

### A. Costos operativos mensuales estimados
| Concepto | Proveedor / Detalle | Costo Mensual USD | Costo Anual USD |
|---|---|---:|---:|
| Nodo RPC Stellar / Soroban | Futurenet / Dedicated RPC provider | $50 | $600 |
| Base de datos e Indexador | Supabase Pro / Hosting | $25 | $300 |
| Alojamiento Frontend y CDN | Vercel Pro / Dominio | $20 | $240 |
| Auditorías / Monitoreo / Alertas | Herramientas de seguridad y uptime | $30 | $360 |
| **Total Costos Fijos** | | **$125** | **$1,500** |

### B. Proyección de ingresos (TVL incremental y rendimiento estimado al 10% anual)
- **Mes 1-3:** TVL promedio $50,000 MXN (~$2,940 USD) | Rendimiento anual gen.: $294 | Comisión (0.25% yield): ~$0.74/mes (Fase de arranque, subsidiada).
- **Mes 4-6:** TVL promedio $250,000 MXN (~$14,700 USD) | Rendimiento anual gen.: $1,470 | Comisión (0.25% yield): ~$3.67/mes.
- **Mes 7-9:** TVL promedio $1,000,000 MXN (~$58,800 USD) | Rendimiento anual gen.: $5,880 | Comisión (0.25% yield): ~$14.70/mes.
- **Mes 10-12:** TVL promedio $5,000,000 MXN (~$294,000 USD) | Rendimiento anual gen.: $29,400 | Comisión (0.25% yield): ~$73.50/mes + patrocinios.

*Nota:* Para alcanzar el punto de equilibrio operativo completo ($125 USD/mes), se requiere un TVL sostenido aproximado de **$8.5 millones de MXN** o un esquema de subvenciones / patrocinios iniciales durante el primer año.

---

## 5. Nota Técnica: Cambios requeridos en `lib.rs` (Si se implementa comisión)

En caso de aprobar la implementación técnica de una comisión sobre el rendimiento, el contrato inteligente en `bimex/contracts/bimex/src/lib.rs` requerirá los siguientes cambios estructurales (documentados pero **no implementados** en esta versión):

1. **Almacenamiento de configuración de comisión:**
   - Agregar una nueva clave en el enum `Clave`:
     ```rust
     ComisionYieldBps,
     DireccionTesoreria,
     ```
   - Inicializar estos valores durante `initialize()` con un límite estricto (ej. máximo 100 bps / 1%).

2. **Modificación en `reclamar_yield`:**
   - Al calcular el rendimiento total a pagar al backer (`yield_total`), calcular la comisión:
     ```rust
     let comision = (yield_total * comision_bps as i128) / 10_000;
     let neto_backer = yield_total - comision;
     ```
   - Ejecutar dos transferencias atómicas desde la reserva de yield del contrato:
     - `neto_backer` hacia la dirección del backer.
     - `comision` hacia la `DireccionTesoreria` configurada por el administrador.

3. **Funciones administrativas:**
   - Añadir una función `admin_actualizar_comision(admin: Address, nueva_comision_bps: u32)` protegida por autenticación de administrador para ajustar la tasa de forma transparente.
