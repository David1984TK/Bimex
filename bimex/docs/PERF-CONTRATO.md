# Contrato de rendimiento Soroban

## Reproducibilidad

Desde `bimex/` (Rust toolchain + target `wasm32-unknown-unknown` instalados):

```sh
cargo test --workspace
cargo build -p bimex --release --target wasm32-unknown-unknown
```

Para mediciones de ledger reales se debe ejecutar cada invocación en una instancia `Env` aislada con entradas equivalentes y registrar `env.cost_estimate().budget()` inmediatamente después de la invocación; guardar CPU instructions, memoria, read entries/bytes y write entries/bytes junto con versiones de SDK, protocolo, toolchain y tamaño del wasm. El costo depende del protocolo/host y del estado de almacenamiento; los snapshots de `test_snapshots` no son datos de benchmark y no deben interpretarse como mediciones.

**Estado de datos:** este repositorio no tenía un arnés de benchmark de costos antes del cambio. No se inventan cifras ni se presenta una tabla de costos estimados como datos medidos. La tabla siguiente documenta la comparación de operaciones verificable por código; CPU/memoria requieren ejecutar con host Soroban y se deben completar con salida del budget antes de publicar cifras absolutas.

## Comparación por función

| Función | Antes: lecturas/escrituras de TTL adicionales | Después | CPU / memoria cuantitativa |
|---|---:|---:|---|
| contribuir | refresca instancia, proyecto y aportación | igual (necesario: escritura de negocio y mantener vivas entradas activas) | por medir con host |
| retirar_principal | 3 TTL, incluida aportación inmediatamente antes de remove | 2 TTL; sin TTL de la entrada eliminada | por medir; elimina una operación inútil |
| retiro_anticipado | 3 TTL, incluida aportación inmediatamente antes de remove | 2 TTL; sin TTL de la entrada eliminada | por medir; elimina una operación inútil |
| calcular_yield | refrescaba instancia y aportación en consulta | cero escrituras TTL | por medir; -2 escrituras TTL |
| calcular_yield_detallado | refrescaba instancia y proyecto en consulta | cero escrituras TTL | por medir; -2 escrituras TTL |
| estado_capital | refrescaba proyecto en consulta | cero escrituras TTL | por medir; -1 escritura TTL |
| obtener_proyecto | refrescaba proyecto en consulta | cero escrituras TTL | por medir; -1 escritura TTL |
| obtener_aportacion | refrescaba aportación en consulta | cero escrituras TTL | por medir; -1 escritura TTL |
| total_proyectos | refrescaba instancia en consulta | cero escrituras TTL | por medir; -1 escritura TTL |
| reclamar_yield | mantiene TTL de instancia/proyecto para operación mutante | igual | por medir con host |

No se cambiaron las aserciones de los tests. El límite técnico es importante: almacenamiento persistente expira si no se renueva; las consultas ahora son realmente de solo lectura y no pueden garantizar supervivencia del registro. Las operaciones mutantes que dependen de la vigencia de los registros continúan extendiendo TTL. Un cliente que necesite conservar datos debe realizar operaciones de mantenimiento explícitas; convertir cada consulta pública en una escritura oculta impone costos de ledger y hace que las lecturas sean mutaciones.

## Tasas e invariantes

No se combinaron las claves `YieldCetesBps`, `YieldAmmBps` ni `TokenMXNe`: agruparlas alteraría el formato de almacenamiento persistido y exigiría migración/compatibilidad con contratos ya inicializados. Los clones de claves/address son valores administrados por Soroban y la evidencia del código no basta para justificar cambios de representación. El cambio medible sin riesgo es eliminar renovaciones de TTL redundantes en `remove()` y de lecturas.

## Límites y margen

Soroban aplica límites de CPU, memoria, entradas/bytes de lectura y escritura por transacción, definidos por la configuración de red/protocolo; no son constantes universales del contrato. Los valores efectivos deben tomarse del protocolo de red objetivo y de `env.cost_estimate()`. Este contrato fija como margen de aceptación que ninguna función aumente escrituras y que las seis consultas listadas no escriban; no se declara margen porcentual de CPU sin medidas reproducibles del host objetivo. La reducción de TTL es directa, pero **no se afirma** que por sí sola alcance 10% de CPU en contribución/retiros.
