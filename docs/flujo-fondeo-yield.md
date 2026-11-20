# Flujo de fondeo de yield — end-to-end

> Documento técnico que explica cómo se genera, acumula, fondea y paga el
> rendimiento (yield) en el contrato Bimex, y quién asume el riesgo de
> déficit (shortfall).

---

## 1. ¿De dónde viene el yield?

El contrato **no genera rendimiento por sí mismo**. Requiere que el admin
transfiera MXNe externos al contrato mediante la función `fondear_yield`
antes de que un dueño de proyecto pueda reclamar.

Las tasas (`DEFAULT_CETES_BPS = 945`, `DEFAULT_AMM_BPS = 400`) son
**parámetros de referencia** que indican el rendimiento que el operador
(Bimex) se compromete a replicar off-chain:

| Fuente | Mecanismo off-chain | Tasa de referencia |
|---|---|---|
| CETES | Etherfuse Stablebonds | 9.45 % APY sobre `capital_en_cetes` |
| AMM | Liquidez en DEX Stellar | 4.00 % APY sobre `capital_en_amm` |

Dado que cada contribución se divide 50/50, el **APY efectivo sobre el
capital total** es:

```
APY efectivo = (9.45% × 50%) + (4.00% × 50%) = 4.725% + 2.00% = 6.725%
```

---

## 2. Ciclo de vida del yield — diagrama

```
Contribuidores depositan MXNe
        │
        ▼
  contribuir()
  ┌─────────────────────────────────────┐
  │  capital_en_cetes += cantidad / 2   │
  │  capital_en_amm   += cantidad - ÷2  │
  │  acumular_yield_pendiente()         │
  └─────────────────────────────────────┘
        │
        │  (tiempo transcurrido, medido en minutos)
        ▼
  acumular_yield_pendiente()  ← se llama en cada contribuir / retirar
  ┌──────────────────────────────────────────────────────────────────┐
  │  yield_cetes = capital_en_cetes × cetes_bps × minutos           │
  │               ─────────────────────────────────────────          │
  │                       10_000 × 525_600                           │
  │                                                                  │
  │  yield_amm   = capital_en_amm × amm_bps × minutos               │
  │               ─────────────────────────────────────              │
  │                       10_000 × 525_600                           │
  │                                                                  │
  │  Acumulados en YieldPendiente { cetes, amm, residuo_* }          │
  └──────────────────────────────────────────────────────────────────┘
        │
        │  (el admin fondea MXNe externos al contrato)
        ▼
  fondear_yield(admin, cantidad)
  ┌─────────────────────────────────────────────────────────────────┐
  │  1. Verifica que caller == admin guardado en storage            │
  │  2. reserva_yield += cantidad  (EFFECTS antes de INTERACTION)   │
  │  3. token::transfer(admin → contrato, cantidad)                 │
  │  4. Emite evento fon_yield                                      │
  └─────────────────────────────────────────────────────────────────┘
        │
        │  (dueño del proyecto reclama)
        ▼
  reclamar_yield(dueno, id_proyecto)
  ┌──────────────────────────────────────────────────────────────────┐
  │  1. acumular_yield_pendiente() → calcula yield hasta ahora       │
  │  2. total_reclamable = pendiente.cetes + pendiente.amm           │
  │  3. Verifica reserva_yield >= total_reclamable (solvencia)       │
  │  4. reserva_yield -= total_reclamable                            │
  │  5. yield_entregado += total_reclamable                          │
  │  6. token::transfer(contrato → dueno, total_reclamable)          │
  └──────────────────────────────────────────────────────────────────┘
        │
        ▼
  Dueño recibe MXNe; contribuidores retiran su principal íntegro
  mediante retirar_principal() en cualquier momento.
```

---

## 3. Funciones clave del contrato

### `fondear_yield(admin, cantidad)`

| Atributo | Detalle |
|---|---|
| **Quién la llama** | Exclusivamente el admin del contrato |
| **Qué hace** | Transfiere `cantidad` de MXNe desde la wallet del admin al contrato e incrementa `ReservaYield` en storage |
| **Cuándo llamarla** | Antes de que cualquier dueño de proyecto ejecute `reclamar_yield`; también durante incidentes de solvencia aunque el contrato esté pausado |
| **Efecto en storage** | `Clave::ReservaYield += cantidad` |
| **Evento emitido** | `fon_yield` con `(cantidad, nueva_reserva, timestamp)` |

### `reserva_yield()`

Función de consulta pública. Retorna el saldo disponible en la reserva
(en stroops) para cubrir próximos reclamos. Útil para que el admin monitoree
si necesita recargar fondos antes del próximo ciclo de reclamos.

### `calcular_yield_detallado(id_proyecto)`

Función de consulta pública. Retorna `YieldDetallado { cetes, amm, total }`
con el yield acumulado hasta el momento actual para el proyecto dado. No
modifica el estado. Útil para que el frontend muestre el yield en tiempo
real sin gas.

### `reclamar_yield(dueno, id_proyecto)`

Transfiere el yield acumulado desde la `ReservaYield` al dueño del proyecto.
El contrato verifica que `reserva_yield >= yield_total` antes de transferir;
si no hay saldo suficiente, la transacción falla con `"Reserva de yield
insuficiente"`.

---

## 4. Responsable del riesgo de shortfall

**El operador de la plataforma Bimex (el admin del contrato) asume
íntegramente el riesgo de déficit.**

Los contribuidores **nunca** están expuestos a un shortfall: el contrato
garantiza en todo momento que `retirar_principal()` devuelve exactamente la
cantidad aportada, independientemente del saldo de `ReservaYield`. La reserva
solo cubre los pagos al dueño del proyecto, no el principal de los backers.

| Escenario | Impacto en contribuidor | Impacto en dueño del proyecto |
|---|---|---|
| `ReservaYield` bien fondeada | Principal íntegro recuperable | Puede reclamar yield acumulado |
| `ReservaYield` insuficiente | **Ninguno** — principal siempre protegido | `reclamar_yield` falla hasta que el admin recargue |
| Admin no fondea nunca | **Ninguno** — retira principal sin problema | No recibe yield hasta que el admin fondee |

### Obligaciones del operador

Para que el modelo funcione según lo prometido, el operador debe:

1. **Replicar las tasas de referencia off-chain**: mantener el capital
   equivalente en CETES (vía Etherfuse) y en un pool AMM de Stellar para
   generar el rendimiento real que luego depositará en el contrato.

2. **Fondear la reserva periódicamente**: transferir el MXNe generado
   off-chain al contrato mediante `fondear_yield` antes de que los dueños
   reclamen, típicamente mensual o antes de cada reclamo esperado.

3. **Monitorear `reserva_yield()`**: si la reserva cae por debajo del yield
   acumulado pendiente, el operador debe recargar antes de que los dueños
   intenten reclamar.

4. **Comunicar shortfalls**: si existe un retraso en el fondeo, el operador
   debe notificar a los dueños de proyectos activos con transparencia y un
   calendario de recuperación.

---

## 5. Riesgo de divergencia de tasas

Las tasas almacenadas en el contrato (`yield_cetes_bps`, `yield_amm_bps`)
son configurables por el admin. Si las tasas de mercado de CETES o del AMM
bajan, el operador puede reducirlas con `actualizar_yield_bps` para evitar
prometer más de lo que genera off-chain. Cualquier cambio de tasa debe
anunciarse con anticipación y documentarse en el CHANGELOG.

Si el operador **no ajusta** las tasas cuando el rendimiento off-chain baja,
el shortfall crece y recae íntegramente en el operador.

---

## 6. Flujo resumido para el admin

```
Mensualmente (o antes de un reclamo esperado):

1. Consultar reserva actual:
   stellar contract invoke --id $CONTRACT_ID \
     --fn reserva_yield

2. Calcular yield pendiente de todos los proyectos activos
   (usar calcular_yield_detallado para cada id_proyecto).

3. Si reserva < yield_total_pendiente:
   stellar contract invoke --id $CONTRACT_ID \
     --fn fondear_yield \
     --arg admin=$ADMIN_ADDRESS \
     --arg cantidad=$MONTO_STROOP

4. Verificar que la reserva cubre el yield pendiente.
```

---

## 7. Referencias

- Código fuente: [`bimex/contracts/bimex/src/lib.rs`](../bimex/contracts/bimex/src/lib.rs) —
  funciones `fondear_yield`, `reserva_yield`, `reclamar_yield`,
  `acumular_yield_pendiente`, `calcular_yield_detallado`.
- Invariantes del contrato: [`docs/CONTRACT-INVARIANTS.md`](CONTRACT-INVARIANTS.md)
- Guía del creador de proyectos: [`docs/guia-creador-proyecto.md`](guia-creador-proyecto.md)
- FAQ en español: [`docs/faq-es.md`](faq-es.md)
- FAQ en inglés: [`docs/faq-en.md`](faq-en.md)

---

**Última actualización**: 2026-11-18  
**Relacionado con**: issue #466 — Corregir consistencia del APY publicado vs. el real del contrato
