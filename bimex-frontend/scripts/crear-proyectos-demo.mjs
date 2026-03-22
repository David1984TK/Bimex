/**
 * Script para crear proyectos demo en el contrato Bimex
 * Uso: node scripts/crear-proyectos-demo.mjs
 */

import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  Keypair,
  Address,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";

// ─── Config ───────────────────────────────────────────────────────────────────

const CONTRACT_ID   = "CCQNPIHSPWX4AJG5ZU7KLDKWI33236EZC3CJI2JXKAE6AKVAUPRZL2IS";
const RPC_URL       = "https://soroban-testnet.stellar.org";
const ADMIN_SECRET  = "ADMIN_SECRET_REMOVED";
const NET_PASSPHRASE = Networks.TESTNET;

const servidor = new rpc.Server(RPC_URL, { allowHttp: false });
const adminKP  = Keypair.fromSecret(ADMIN_SECRET);

// ─── Proyectos a crear ────────────────────────────────────────────────────────
// meta en stroops (1 MXNe = 10_000_000 stroops)
const MXNe = (n) => BigInt(n) * 10_000_000n;

const PROYECTOS = [
  {
    nombre: "Huerto Comunitario Tlalpan",
    meta: MXNe(8000),
    desc: "Comunitario",
  },
  {
    nombre: "Clinica Movil Sierra Norte",
    meta: MXNe(25000),
    desc: "Salud",
  },
  {
    nombre: "Biblioteca Digital Rural Oaxaca",
    meta: MXNe(12000),
    desc: "Educacion",
  },
  {
    nombre: "Paneles Solares Comunidad Mixteca",
    meta: MXNe(40000),
    desc: "Energia",
  },
  {
    nombre: "Cruz Roja Delegacion Monterrey",
    meta: MXNe(60000),
    desc: "ONG Salud",
  },
  {
    nombre: "Fundacion Ninos con Futuro",
    meta: MXNe(18000),
    desc: "ONG Educacion",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docHashFake(seed) {
  // BytesN<32> — genera bytes deterministas a partir del seed
  const buf = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) buf[i] = (seed * 7 + i * 13) % 256;
  return xdr.ScVal.scvBytes(buf);
}

async function enviarTx(metodo, args) {
  const contrato  = new Contract(CONTRACT_ID);
  const cuenta    = await servidor.getAccount(adminKP.publicKey());

  const tx = new TransactionBuilder(cuenta, {
    fee: "1000000",
    networkPassphrase: NET_PASSPHRASE,
  })
    .addOperation(contrato.call(metodo, ...args))
    .setTimeout(300)
    .build();

  const prepared = await servidor.prepareTransaction(tx);
  prepared.sign(adminKP);

  const envio = await servidor.sendTransaction(prepared);
  if (envio.status === "ERROR") {
    throw new Error(`TX rechazada: ${JSON.stringify(envio.errorResult)}`);
  }

  // Polling
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const estado = await servidor.getTransaction(envio.hash);
    if (estado.status === "SUCCESS") return estado;
    if (estado.status === "FAILED")  throw new Error(`TX fallida: ${envio.hash}`);
  }
  throw new Error(`Timeout TX: ${envio.hash}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Creando proyectos demo en Bimex...\n");
  console.log(`   Admin: ${adminKP.publicKey()}`);
  console.log(`   Contrato: ${CONTRACT_ID}\n`);

  for (let i = 0; i < PROYECTOS.length; i++) {
    const p = PROYECTOS[i];
    const metaStr = (p.meta / 10_000_000n).toLocaleString();
    process.stdout.write(`[${i + 1}/${PROYECTOS.length}] Creando "${p.nombre}" (meta: ${metaStr} MXNe)...`);

    try {
      // 1. crear_proyecto
      const args = [
        new Address(adminKP.publicKey()).toScVal(),
        nativeToScVal(p.nombre, { type: "string" }),
        nativeToScVal(p.meta, { type: "i128" }),
        docHashFake(i + 1),
      ];

      await enviarTx("crear_proyecto", args);
      process.stdout.write(" ✅ creado");

      // 2. admin_aprobar
      process.stdout.write(", aprobando...");
      await enviarTx("admin_aprobar", [nativeToScVal(i, { type: "u32" })]);
      console.log(" ✅ aprobado");

    } catch (err) {
      console.log(` ❌ Error: ${err.message}`);
    }
  }

  console.log("\n✨ Listo. Recarga la app para ver los proyectos.");
}

main().catch(console.error);
