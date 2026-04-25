# Guía Técnica de Integración — Bimex

Referencia para desarrolladores que quieran integrar el contrato Bimex en sus propias aplicaciones.

## Contrato desplegado

| Red | Contract ID |
|---|---|
| Testnet | `CDFFTEQLNIG2RAUONFXSQX2YS2UTQTCBEUAPK6S42XFNIOQEYPBJVH5T` |
| Mainnet | (pendiente de despliegue) |

MXNe SAC (Testnet): `CDDIGHPVTW4PSCQCU67NQ4NXZ4NX5GDLNL3O67WT5RQ4GT6RXIEYPC4T`

---

## ABI — Funciones públicas

### Escritura (requieren firma)

| Función | Parámetros | Auth requerida |
|---|---|---|
| `inicializar` | `admin: Address, token_mxne: Address, yield_cetes_bps: u32, yield_amm_bps: u32` | — (solo una vez) |
| `crear_proyecto` | `dueno: Address, nombre: String, meta: i128, doc_hash: BytesN<32>` | `dueno` |
| `contribuir` | `backer: Address, id_proyecto: u32, cantidad: i128` | `backer` |
| `retirar_principal` | `backer: Address, id_proyecto: u32` | `backer` |
| `reclamar_yield` | `id_proyecto: u32` | `dueno` del proyecto |
| `abandonar_proyecto` | `id_proyecto: u32` | `dueno` del proyecto |
| `solicitar_continuar` | `nuevo_dueno: Address, id_proyecto: u32` | `nuevo_dueno` |
| `admin_aprobar` | `id_proyecto: u32` | `admin` |
| `admin_rechazar` | `id_proyecto: u32, motivo: String` | `admin` |

### Lectura (sin firma, sin costo)

| Función | Parámetros | Retorna |
|---|---|---|
| `obtener_proyecto` | `id: u32` | `Proyecto` |
| `obtener_aportacion` | `id_proyecto: u32, backer: Address` | `Aportacion` |
| `total_proyectos` | — | `u32` |
| `calcular_yield` | `id_proyecto: u32, backer: Address` | `i128` (stroops) |
| `calcular_yield_detallado` | `id_proyecto: u32` | `YieldDetallado` |
| `estado_capital` | `id_proyecto: u32` | `CapitalEstado` |

### Tipos de retorno

```
Proyecto {
  dueno: Address, nombre: String, meta: i128, total_aportado: i128,
  yield_entregado: i128, estado: EstadoProyecto, timestamp_inicio: u64,
  capital_en_cetes: i128, yield_cetes_acumulado: i128,
  capital_en_amm: i128, yield_amm_acumulado: i128,
  doc_hash: BytesN<32>, motivo_rechazo: String
}

Aportacion { cantidad: i128, timestamp: u64 }

YieldDetallado { cetes: i128, amm: i128, total: i128 }

CapitalEstado { en_cetes: i128, en_amm: i128, total: i128 }

EstadoProyecto: EnRevision | EtapaInicial | EnProgreso | Liberado | Abandonado | Rechazado
```

> Unidades: todos los montos en **stroops** (1 MXNe = 10,000,000 stroops).

---

## Invocación con Stellar CLI

```bash
# Leer total de proyectos
stellar contract invoke \
  --id CDFFTEQLNIG2RAUONFXSQX2YS2UTQTCBEUAPK6S42XFNIOQEYPBJVH5T \
  --network testnet \
  -- total_proyectos

# Leer un proyecto
stellar contract invoke \
  --id <CONTRACT_ID> --network testnet \
  -- obtener_proyecto --id 0

# Calcular yield de un backer
stellar contract invoke \
  --id <CONTRACT_ID> --network testnet \
  -- calcular_yield --id_proyecto 0 --backer <BACKER_ADDRESS>

# Contribuir (requiere --source con fondos)
stellar contract invoke \
  --id <CONTRACT_ID> --source <BACKER_KEYPAIR> --network testnet \
  -- contribuir \
  --backer <BACKER_ADDRESS> \
  --id_proyecto 0 \
  --cantidad 10000000000
```

---

## Integración con stellar-sdk (JavaScript)

### Instalación

```bash
npm install @stellar/stellar-sdk @stellar/freighter-api
```

### Variables de entorno

```env
VITE_CONTRACT_ID=CDFFTEQLNIG2RAUONFXSQX2YS2UTQTCBEUAPK6S42XFNIOQEYPBJVH5T
VITE_TOKEN_MXNE=CDDIGHPVTW4PSCQCU67NQ4NXZ4NX5GDLNL3O67WT5RQ4GT6RXIEYPC4T
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

### Lectura (sin firma)

```js
import { Contract, SorobanRpc, scValToNative, xdr } from '@stellar/stellar-sdk';

const rpc = new SorobanRpc.Server(import.meta.env.VITE_RPC_URL);
const contract = new Contract(import.meta.env.VITE_CONTRACT_ID);

async function totalProyectos() {
  const result = await rpc.simulateTransaction(
    await buildTx(contract.call('total_proyectos'))
  );
  return scValToNative(result.result.retval);
}

async function obtenerProyecto(id) {
  const result = await rpc.simulateTransaction(
    await buildTx(contract.call('obtener_proyecto', xdr.ScVal.scvU32(id)))
  );
  return scValToNative(result.result.retval);
}
```

### Escritura (con firma de Freighter)

```js
import { TransactionBuilder, Networks, BASE_FEE, SorobanRpc } from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

async function contribuir(backerAddress, idProyecto, cantidadMXNe) {
  const cantidadStroops = BigInt(cantidadMXNe) * 10_000_000n;
  const account = await rpc.getAccount(backerAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(
      'contribuir',
      addressToScVal(backerAddress),
      xdr.ScVal.scvU32(idProyecto),
      i128ToScVal(cantidadStroops),
    ))
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();

  const { signedTxXdr } = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE,
  });

  const sendResult = await rpc.sendTransaction(
    TransactionBuilder.fromXDR(signedTxXdr, import.meta.env.VITE_NETWORK_PASSPHRASE)
  );

  // Poll for confirmation
  let status;
  do {
    await new Promise(r => setTimeout(r, 1000));
    status = await rpc.getTransaction(sendResult.hash);
  } while (status.status === 'NOT_FOUND');

  if (status.status !== 'SUCCESS') throw new Error('Transaction failed');
  return status;
}
```

> Para referencia completa, ver [`bimex-frontend/src/stellar/contrato.js`](../bimex-frontend/src/stellar/contrato.js).

---

## Notas de integración

- **Stroops**: todos los montos van en stroops. Convierte antes de llamar: `mxne * 10_000_000`.
- **TTL del storage**: el storage persistent expira ~30 días. Si construyes un indexer, extiende el TTL periódicamente.
- **Freighter v6+**: usa `signTransaction` que retorna `{ signedTxXdr, signerAddress }`. No soportes versiones anteriores.
- **Simulate antes de enviar**: siempre llama `simulateTransaction` para obtener el footprint correcto antes de firmar.
