import {
  Keypair, Asset, TransactionBuilder,
  Operation, Networks, Horizon,
} from "@stellar/stellar-sdk";

const NETWORK = Networks.TESTNET;
const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const [,, secretMiCuenta, secretTokenAdmin] = process.argv;

if (!secretMiCuenta || !secretTokenAdmin) {
  console.error("Uso: node setup-token.mjs SECRET_MI_CUENTA SECRET_TOKEN_ADMIN");
  process.exit(1);
}

const miCuenta   = Keypair.fromSecret(secretMiCuenta);
const tokenAdmin = Keypair.fromSecret(secretTokenAdmin);
const MXNE = new Asset("MXNE", tokenAdmin.publicKey());

async function main() {
  console.log("1️⃣  Creando trustline...");
  const cuentaInfo = await server.loadAccount(miCuenta.publicKey());
  const txTrust = new TransactionBuilder(cuentaInfo, { fee: "100", networkPassphrase: NETWORK })
    .addOperation(Operation.changeTrust({ asset: MXNE }))
    .setTimeout(30).build();
  txTrust.sign(miCuenta);
  const r1 = await server.submitTransaction(txTrust);
  console.log("✅ Trustline:", r1.hash);

  console.log("2️⃣  Minteando 1,000 MXNe...");
  const adminInfo = await server.loadAccount(tokenAdmin.publicKey());
  const txMint = new TransactionBuilder(adminInfo, { fee: "100", networkPassphrase: NETWORK })
    .addOperation(Operation.payment({
      destination: miCuenta.publicKey(),
      asset: MXNE,
      amount: "1000",
    }))
    .setTimeout(30).build();
  txMint.sign(tokenAdmin);
  const r2 = await server.submitTransaction(txMint);
  console.log("✅ Mint:", r2.hash);
  console.log("\n🎉 Listo. Ahora corre el Paso 4.");
}

main().catch(e => {
  console.error("❌", e?.response?.data?.extras?.result_codes ?? e.message);
});