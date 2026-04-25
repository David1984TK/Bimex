# Prueba End-to-End en Mainnet — Bimex

## ¿Por qué importa?

Antes de abrir Bimex al público en Mainnet, necesitamos confirmar que el flujo completo funciona con fondos reales. Un bug en producción podría resultar en pérdida de fondos de usuarios.

**Dependencias:** Issues #6, #7, #8 deben estar completados.

## Estado de la Prueba

- [ ] 1. Crear proyecto
- [ ] 2. Aprobar proyecto (admin)
- [ ] 3. Contribuir
- [ ] 4. Verificar yield
- [ ] 5. Retirar principal
- [ ] 6. Reclamar yield

## Archivos Relacionados

- `bimex-frontend/src/stellar/contrato.js` — todas las funciones de interacción
- `bimex-frontend/src/components/DetalleProyecto.jsx` — UI principal del flujo

## Criterios de Aceptación

- ✅ Los 6 pasos ejecutados exitosamente en Mainnet
- ✅ Todas las transacciones verificables en Stellar Expert
- ✅ El principal del contribuidor se devuelve exacto (0 pérdida)
- ✅ El yield generado coincide con las tasas reales configuradas

## Reporte Esperado

Documentar cada paso con capturas de pantalla y hash de transacción en un comentario de este issue.

## Recursos

- URL de producción: https://bimex-frontend.vercel.app
- Stellar Expert Mainnet: https://stellar.expert/explorer/public
- Tasa CETES esperada: ~9.45% anual

## Notas de Seguridad

- Usar cantidades pequeñas de MXNe real (ej: 10 MXNe)
- Tener al menos 3 wallets preparadas:
  - Wallet 1: Dueño del proyecto
  - Wallet 2: Admin
  - Wallet 3: Contribuidor
- Verificar cada transacción en Stellar Expert antes de continuar
