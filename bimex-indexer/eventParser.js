import { scValToNative } from '@stellar/stellar-sdk';

const TOPIC_TO_EVENT = {
  contribuir: 'nueva_aportacion',
  yield:      'yield_reclamado',
  retiro:     'retiro_principal',
  aprobar:    'cambio_estado',
  rechazar:   'cambio_estado',
};

function normalizeArg(arg) {
  try {
    return scValToNative(arg);
  } catch {
    return arg;
  }
}

function normalizeArgs(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data.map(normalizeArg);
  return [normalizeArg(data)];
}

function getTopicField(event, index) {
  const topics = event.topics ?? [];
  const value = topics[index];
  if (value == null) return null;
  return Array.isArray(value) ? value[0] : value;
}

function parseEventRecord(event, contractId) {
  if (event.contract_id !== contractId) return null;

  const topic = getTopicField(event, 0);
  const actor = getTopicField(event, 1);
  if (!topic) return null;

  const createdAt = event.created_at ?? event.createdAt;
  const timestamp = typeof createdAt === 'string'
    ? createdAt
    : createdAt != null
      ? new Date(createdAt * 1000).toISOString()
      : null;

  const rawData = event.data ?? event.args ?? event.values;
  const args = normalizeArgs(rawData);

  const tipo = TOPIC_TO_EVENT[topic] ?? topic;
  const evento = {
    tipo,
    contract_id: contractId,
    fn_name: topic,
    data: args,
    ledger: event.ledger,
    timestamp,
    tx_hash: event.transaction_hash || event.tx_hash || event.transactionHash || null,
  };

  let proyecto = null;
  let aportacion = null;

  if (topic === 'contribuir') {
    aportacion = {
      proyecto_id:  Number(args[0]),
      contribuidor: String(actor),
      monto:        String(args[1]),
      timestamp:    String(args[2] ?? timestamp),
    };
  } else if (topic === 'yield') {
    proyecto = {
      id: Number(args[0]),
      yield_entregado_delta: args[1] != null ? String(args[1]) : null,
    };
  } else if (topic === 'retiro') {
    aportacion = {
      proyecto_id:  Number(args[0]),
      contribuidor: String(actor),
      monto:        String(args[1]),
      retirado:     true,
      timestamp:    String(args[2] ?? timestamp),
    };
  } else if (topic === 'aprobar') {
    proyecto = { id: Number(args[0]), estado: 'EtapaInicial' };
  } else if (topic === 'rechazar') {
    proyecto = { id: Number(args[0]), estado: 'Rechazado', motivo_rechazo: String(args[1]) };
  }

  return { evento, proyecto, aportacion };
}

export function parseEvent(event, contractId) {
  try {
    return parseEventRecord(event, contractId);
  } catch {
    return null;
  }
}

export function parseTx(tx, contractId) {
  return parseEvent(tx, contractId);
}
