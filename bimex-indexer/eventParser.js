import { scValToNative, xdr } from '@stellar/stellar-sdk';

export const TOPIC_TO_EVENT = {
  aportar:    'nueva_aportacion',
  contribuir: 'nueva_aportacion',
  yield:      'yield_reclamado',
  retiro:     'retiro_principal',
  aprobar:    'cambio_estado',
  rechazar:   'cambio_estado',
  adm_chg:    'admin_action',
  pausar:     'admin_action',
  reanudar:   'admin_action',
  prop_upg:   'admin_action',
  upgrade:    'admin_action',
};

export const CONTRACT_EVENT_SYMBOLS = [
  'aportar',
  'yield',
  'retiro',
  'aprobar',
  'rechazar',
  'adm_chg',
  'pausar',
  'reanudar',
  'prop_upg',
  'upgrade',
];

function normalizeArg(arg) {
  if (arg == null) return arg;
  if (typeof arg === 'object' && arg._switch !== undefined) {
    try {
      const native = scValToNative(arg);
      return native === undefined ? arg : native;
    } catch {
      return arg;
    }
  }
  if (typeof arg === 'string') {
    try {
      const scVal = xdr.ScVal.fromXDR(arg, 'base64');
      const native = scValToNative(scVal);
      if (native !== undefined) return native;
    } catch {
      // Valor string plano sin codificación XDR
    }
    return arg;
  }
  try {
    const native = scValToNative(arg);
    return native === undefined && arg !== undefined ? arg : native;
  } catch {
    return arg;
  }
}

function normalizeArgs(data) {
  if (data == null) return [];
  if (typeof data === 'object' && data.xdr) {
    const parsed = normalizeArg(data.xdr);
    return Array.isArray(parsed) ? parsed.map(normalizeArg) : [normalizeArg(parsed)];
  }
  const parsed = normalizeArg(data);
  if (Array.isArray(parsed)) return parsed.map(normalizeArg);
  if (Array.isArray(data)) return data.map(normalizeArg);
  return [parsed];
}

function getContractId(event) {
  const cid = event.contractId ?? event.contract_id;
  if (!cid) return null;
  if (typeof cid === 'string') return cid;
  if (typeof cid.toString === 'function') return cid.toString();
  return String(cid);
}

function getTopicField(event, index) {
  const topics = event.topic ?? event.topics ?? [];
  const value = topics[index];
  if (value == null) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  return normalizeArg(raw);
}

function parseEventRecord(event, contractId) {
  const evContractId = getContractId(event);
  if (evContractId !== contractId) return null;

  const topic = getTopicField(event, 0);
  const actor = getTopicField(event, 1);
  if (!topic) return null;

  const createdAt = event.created_at ?? event.createdAt ?? event.ledgerClosedAt;
  const timestamp = typeof createdAt === 'string'
    ? createdAt
    : createdAt != null
      ? new Date(createdAt * 1000).toISOString()
      : null;

  const rawData = event.value ?? event.data ?? event.args ?? event.values;
  const args = normalizeArgs(rawData);

  const tipo = TOPIC_TO_EVENT[topic] ?? topic;
  const evento = {
    tipo,
    contract_id: contractId,
    fn_name: topic,
    data: args,
    ledger: event.ledger,
    timestamp,
    tx_hash: event.txHash || event.tx_hash || event.transaction_hash || event.transactionHash || null,
  };

  let proyecto = null;
  let aportacion = null;
  let audit = null;

  if (topic === 'aportar' || topic === 'contribuir') {
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
    audit = {
      action: 'aprobar',
      actor_address: String(actor),
      target: `proyecto_${args[0]}`,
      metadata: {},
      tx_hash: evento.tx_hash,
      block_time: timestamp,
    };
  } else if (topic === 'rechazar') {
    proyecto = { id: Number(args[0]), estado: 'Rechazado', motivo_rechazo: String(args[1]) };
    audit = {
      action: 'rechazar',
      actor_address: String(actor),
      target: `proyecto_${args[0]}`,
      metadata: { motivo: String(args[1]) },
      tx_hash: evento.tx_hash,
      block_time: timestamp,
    };
  } else if (topic === 'adm_chg') {
    const nuevoAdmin = getTopicField(event, 2) ?? args[0];
    audit = {
      action: 'adm_chg',
      actor_address: String(actor),
      target: 'contract',
      metadata: {
        admin_actual: String(actor),
        nuevo_admin: String(nuevoAdmin ?? ''),
      },
      tx_hash: evento.tx_hash,
      block_time: timestamp,
    };
  } else if (topic === 'pausar') {
    audit = {
      action: 'pausar',
      actor_address: String(actor),
      target: 'contract',
      metadata: {},
      tx_hash: evento.tx_hash,
      block_time: timestamp,
    };
  } else if (topic === 'reanudar') {
    audit = {
      action: 'reanudar',
      actor_address: String(actor),
      target: 'contract',
      metadata: {},
      tx_hash: evento.tx_hash,
      block_time: timestamp,
    };
  } else if (topic === 'prop_upg') {
    let wasm_hash = args[0];
    if (wasm_hash && typeof wasm_hash === 'object' && wasm_hash.toString) {
      wasm_hash = Buffer.isBuffer(wasm_hash) ? wasm_hash.toString('hex') : wasm_hash.toString();
    }
    audit = {
      action: 'prop_upg',
      actor_address: String(actor),
      target: 'contract',
      metadata: {
        new_wasm_hash: String(wasm_hash),
        timestamp_propuesta: String(args[1] ?? timestamp),
      },
      tx_hash: evento.tx_hash,
      block_time: timestamp,
    };
  } else if (topic === 'upgrade') {
    let wasm_hash = args[0];
    if (wasm_hash && typeof wasm_hash === 'object' && wasm_hash.toString) {
      wasm_hash = Buffer.isBuffer(wasm_hash) ? wasm_hash.toString('hex') : wasm_hash.toString();
    }
    audit = {
      action: 'upgrade',
      actor_address: String(actor),
      target: 'contract',
      metadata: { new_wasm_hash: String(wasm_hash) },
      tx_hash: evento.tx_hash,
      block_time: timestamp,
    };
  }

  return { evento, proyecto, aportacion, audit };
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
