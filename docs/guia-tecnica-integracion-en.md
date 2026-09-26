# Technical Integration Guide — Bimex

Reference for developers who want to integrate the Bimex contract into their own applications.

## Deployed contract

| Network | Contract ID |
|---|---|
| Testnet | `CDFFTEQLNIG2RAUONFXSQX2YS2UTQTCBEUAPK6S42XFNIOQEYPBJVH5T` |
| Mainnet | (pending deployment) |

MXNe SAC (Testnet): `CDDIGHPVTW4PSCQCU67NQ4NXZ4NX5GDLNL3O67WT5RQ4GT6RXIEYPC4T`

---

## ABI — Public functions

### Write (require a signature)

| Function | Parameters | Required auth |
|---|---|---|
| `inicializar` | `admin: Address, token_mxne: Address, yield_cetes_bps: u32, yield_amm_bps: u32` | — (only once) |
| `crear_proyecto` | `dueno: Address, nombre: String, meta: i128, doc_hash: BytesN<32>` | `dueno` |
| `contribuir` | `backer: Address, id_proyecto: u32, cantidad: i128` | `backer` |
| `retirar_principal` | `backer: Address, id_proyecto: u32` | `backer` |
| `reclamar_yield` | `id_proyecto: u32` | project `dueno` |
| `abandonar_proyecto` | `id_proyecto: u32` | project `dueno` |
| `solicitar_continuar` | `nuevo_dueno: Address, id_proyecto: u32` | `nuevo_dueno` |
| `admin_aprobar` | `id_proyecto: u32` | `admin` |
| `admin_rechazar` | `id_proyecto: u32, motivo: String` | `admin` |

### Read (no signature, no cost)

| Function | Parameters | Returns |
|---|---|---|
| `obtener_proyecto` | `id: u32` | `Proyecto` |
| `obtener_aportacion` | `id_proyecto: u32, backer: Address` | `Aportacion` |
| `total_proyectos` | — | `u32` |
| `calcular_yield` | `id_proyecto: u32, backer: Address` | `i128` (stroops) |
| `calcular_yield_detallado` | `id_proyecto: u32` | `YieldDetallado` |
| `estado_capital` | `id_proyecto: u32` | `CapitalEstado` |

### Return types

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

> Units: all amounts are in **stroops** (1 MXNe = 10,000,000 stroops).

---

## Invoking with the Stellar CLI

```bash
# Read the total number of projects
stellar contract invoke \
  --id CDFFTEQLNIG2RAUONFXSQX2YS2UTQTCBEUAPK6S42XFNIOQEYPBJVH5T \
  --network testnet \
  -- total_proyectos

# Read one project
stellar contract invoke \
  --id <CONTRACT_ID> --network testnet \
  -- obtener_proyecto --id 0

# Compute a backer's yield
stellar contract invoke \
  --id <CONTRACT_ID> --network testnet \
  -- calcular_yield --id_proyecto 0 --backer <BACKER_ADDRESS>

# Contribute (requires --source with funds)
stellar contract invoke \
  --id <CONTRACT_ID> --source <BACKER_KEYPAIR> --network testnet \
  -- contribuir \
  --backer <BACKER_ADDRESS> \
  --id_proyecto 0 \
  --cantidad 10000000000
```

---

## Integration with stellar-sdk (JavaScript)

### Installation

```bash
npm install @stellar/stellar-sdk @stellar/freighter-api
```

### Environment variables

```env
VITE_CONTRACT_ID=CDFFTEQLNIG2RAUONFXSQX2YS2UTQTCBEUAPK6S42XFNIOQEYPBJVH5T
VITE_TOKEN_MXNE=CDDIGHPVTW4PSCQCU67NQ4NXZ4NX5GDLNL3O67WT5RQ4GT6RXIEYPC4T
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

### Read (no signature)

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

### Write (signed with Freighter)

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

> For the full reference, see [`bimex-frontend/src/stellar/contrato.js`](../bimex-frontend/src/stellar/contrato.js).

---

## Integration notes

- **Stroops**: all amounts are in stroops. Convert before calling: `mxne * 10_000_000`.
- **Storage TTL**: persistent storage expires after ~30 days. If you build an indexer, extend the TTL periodically.
- **Freighter v6+**: use `signTransaction`, which returns `{ signedTxXdr, signerAddress }`. Do not support earlier versions.
- **Simulate before sending**: always call `simulateTransaction` to get the correct footprint before signing.
