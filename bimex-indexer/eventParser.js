import { xdr, scValToNative, Address } from '@stellar/stellar-sdk';

const CONTRACT_FUNCTIONS = new Set([
  'crear_proyecto', 'contribuir', 'reclamar_yield',
  'retirar_principal', 'abandonar_proyecto', 'solicitar_continuar',
  'admin_aprobar', 'admin_rechazar',
]);

const FN_TO_EVENT = {
  crear_proyecto:     'nuevo_proyecto',
  contribuir:         'nueva_aportacion',
  reclamar_yield:     'yield_reclamado',
  retirar_principal:  'retiro_principal',
  abandonar_proyecto: 'cambio_estado',
  solicitar_continuar:'cambio_estado',
  admin_aprobar:      'cambio_estado',
  admin_rechazar:     'cambio_estado',
};

/**
 * Parse a TransactionInfo object from SorobanRpc.getTransactions().
 * The SDK already decodes XDR fields into xdr.* objects.
 * Returns { evento, proyecto, aportacion } or null if not a Bimex tx.
 */
export function parseTx(tx, contractId) {
  try {
    // envelopeXdr is already an xdr.TransactionEnvelope (SDK-parsed)
    const envelope = tx.envelopeXdr;
    const ops = envelope.v1?.tx?.operations() ?? envelope.tx?.operations() ?? [];

    for (const op of ops) {
      const body = op.body();
      if (body.switch().name !== 'invokeHostFunction') continue;

      const hostFn = body.invokeHostFunction().hostFunction();
      if (hostFn.switch().name !== 'hostFunctionTypeInvokeContract') continue;

      const invokeArgs = hostFn.invokeContract();

      // Convert xdr.ScAddress → Strkey string (C...) for comparison
      const contractStrkey = Address.fromScAddress(
        invokeArgs.contractAddress()
      ).toString();

      if (contractStrkey !== contractId) continue;

      const fnName = invokeArgs.functionName().toString();
      if (!CONTRACT_FUNCTIONS.has(fnName)) continue;

      const args = invokeArgs.args().map(scValToNative);
      const timestamp = new Date(tx.createdAt * 1000).toISOString();

      const evento = {
        tipo:        FN_TO_EVENT[fnName],
        contract_id: contractId,
        fn_name:     fnName,
        data:        args,
        ledger:      tx.ledger,
        timestamp,
        tx_hash:     tx.txHash,
      };

      let proyecto = null;
      let aportacion = null;

      if (fnName === 'crear_proyecto') {
        // args: [dueno, nombre, meta, doc_hash]
        // returnValue is xdr.ScVal (u32 project id), present on SUCCESS
        const id = tx.returnValue ? scValToNative(tx.returnValue) : null;
        proyecto = {
          id,
          dueno:      String(args[0]),
          nombre:     String(args[1]),
          meta:       String(args[2]),
          estado:     'EnRevision',
          created_at: timestamp,
        };
      } else if (fnName === 'contribuir') {
        // args: [backer, id_proyecto, cantidad]
        aportacion = {
          proyecto_id:  Number(args[1]),
          contribuidor: String(args[0]),
          monto:        String(args[2]),
          timestamp,
        };
      } else if (fnName === 'admin_aprobar') {
        proyecto = { id: Number(args[0]), estado: 'EtapaInicial' };
      } else if (fnName === 'admin_rechazar') {
        proyecto = { id: Number(args[0]), estado: 'Rechazado', motivo_rechazo: String(args[1]) };
      } else if (fnName === 'abandonar_proyecto') {
        proyecto = { id: Number(args[0]), estado: 'Abandonado' };
      } else if (fnName === 'solicitar_continuar') {
        // args: [nuevo_dueno, id_proyecto]
        proyecto = { id: Number(args[1]), dueno: String(args[0]), estado: 'EnProgreso' };
      } else if (fnName === 'reclamar_yield') {
        // args: [id_proyecto]; returnValue is the yield amount claimed
        const monto = tx.returnValue ? scValToNative(tx.returnValue) : null;
        proyecto = { id: Number(args[0]), yield_entregado_delta: monto !== null ? String(monto) : null };
      } else if (fnName === 'retirar_principal') {
        // args: [backer, id_proyecto]
        aportacion = {
          proyecto_id:  Number(args[1]),
          contribuidor: String(args[0]),
          monto:        '0',
          retirado:     true,
          timestamp,
        };
      }

      return { evento, proyecto, aportacion };
    }
  } catch {
    // Malformed or irrelevant tx — skip
  }
  return null;
}
