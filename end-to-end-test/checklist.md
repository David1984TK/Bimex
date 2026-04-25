# Checklist de Prueba End-to-End

## Pre-requisitos

- [ ] Issues #6, #7, #8 completados
- [ ] Contrato desplegado en Mainnet
- [ ] Frontend desplegado en Vercel (producción)
- [ ] 3 wallets Freighter configuradas con fondos
- [ ] Cada wallet tiene suficiente XLM para fees
- [ ] Al menos una wallet tiene MXNe para contribuir

## Preparación del Ambiente

- [ ] Verificar que el contrato está activo en Mainnet
- [ ] Confirmar la dirección del contrato en el frontend
- [ ] Verificar tasas CETES configuradas
- [ ] Tener acceso a Stellar Expert para verificar transacciones
- [ ] Preparar herramienta para capturas de pantalla

## Ejecución de Pruebas

### Paso 1: Crear Proyecto
- [ ] Conectar wallet del dueño
- [ ] Llenar formulario completo
- [ ] Subir documentos requeridos
- [ ] Verificar cálculo de hash SHA-256
- [ ] Enviar transacción
- [ ] Confirmar estado: EnRevision
- [ ] Guardar hash de transacción
- [ ] Tomar captura de pantalla

### Paso 2: Aprobar Proyecto
- [ ] Conectar wallet admin
- [ ] Localizar proyecto en panel admin
- [ ] Revisar documentos
- [ ] Aprobar proyecto
- [ ] Confirmar estado: EtapaInicial
- [ ] Guardar hash de transacción
- [ ] Tomar captura de pantalla

### Paso 3: Contribuir
- [ ] Conectar wallet contribuidor
- [ ] Navegar al proyecto aprobado
- [ ] Registrar balance inicial
- [ ] Contribuir 10 MXNe
- [ ] Confirmar transacción
- [ ] Verificar balance después
- [ ] Verificar capital registrado
- [ ] Guardar hash de transacción
- [ ] Tomar captura de pantalla

### Paso 4: Verificar Yield
- [ ] Esperar 5 minutos
- [ ] Refrescar página del proyecto
- [ ] Verificar yield visible en UI
- [ ] Llamar a calcular_yield_detallado
- [ ] Comparar con cálculo esperado
- [ ] Verificar tasas reales aplicadas
- [ ] Tomar captura de pantalla

### Paso 5: Retirar Principal
- [ ] Conectar wallet contribuidor
- [ ] Registrar balance antes del retiro
- [ ] Hacer clic en "Retirar Principal"
- [ ] Confirmar transacción
- [ ] Verificar balance después
- [ ] Confirmar cantidad exacta (10 MXNe)
- [ ] Verificar en Stellar Explorer
- [ ] Guardar hash de transacción
- [ ] Tomar captura de pantalla

### Paso 6: Reclamar Yield
- [ ] Conectar wallet dueño del proyecto
- [ ] Verificar estado del proyecto: Liberado
- [ ] Registrar balance antes
- [ ] Hacer clic en "Reclamar Yield"
- [ ] Confirmar transacción
- [ ] Verificar balance después
- [ ] Confirmar yield recibido
- [ ] Guardar hash de transacción
- [ ] Tomar captura de pantalla

## Verificaciones Finales

- [ ] Todas las transacciones verificadas en Stellar Expert
- [ ] Zero-loss confirmado (contribuidor recuperó capital exacto)
- [ ] Yield calculado correctamente
- [ ] Yield transferido al proyecto
- [ ] No hay fondos bloqueados en el contrato
- [ ] Todas las capturas de pantalla guardadas
- [ ] Todos los hashes de transacción documentados

## Documentación

- [ ] Completar test-script.md con todos los datos
- [ ] Adjuntar capturas de pantalla
- [ ] Documentar problemas encontrados
- [ ] Escribir conclusiones
- [ ] Crear reporte final
- [ ] Publicar resultados en el issue

## Aprobación

- [ ] Prueba completada exitosamente
- [ ] Todos los criterios de aceptación cumplidos
- [ ] Sin bugs críticos encontrados
- [ ] Aprobado para producción pública
