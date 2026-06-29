import { StellarWalletsKit, WalletConnectModule, FreighterModule } from "@creit.tech/stellar-wallets-kit";
import { Networks } from "@stellar/stellar-sdk";
import { CONFIG } from "./contrato.js";

const _isMainnet = CONFIG.NETWORK === "mainnet";

let kit = null;
let currentWallet = null;

function initializeKit() {
  if (kit) return kit;

  const wcProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

  const modules = [
    new FreighterModule(),
    ...(wcProjectId ? [new WalletConnectModule({ projectId: wcProjectId, name: "Bimex" })] : []),
  ];

  kit = new StellarWalletsKit({
    network: _isMainnet ? Networks.PUBLIC : Networks.TESTNET,
    selectedWalletId: "freighter",
    modules,
  });

  return kit;
}

export function getWalletKit() {
  return initializeKit();
}

export async function openWalletModal() {
  const walletKit = getWalletKit();
  const wallet = await walletKit.openModal();

  if (wallet) {
    localStorage.setItem("lastWallet", wallet.id);
    currentWallet = wallet;
  }

  return wallet;
}

export async function getConnectedWallet() {
  if (currentWallet) {
    return currentWallet;
  }

  const walletKit = getWalletKit();
  const lastWalletId = localStorage.getItem("lastWallet");

  if (lastWalletId) {
    try {
      const wallet = walletKit.getWallet(lastWalletId);
      if (wallet) {
        await wallet.connect();
        currentWallet = wallet;
        return wallet;
      }
    } catch {
      localStorage.removeItem("lastWallet");
    }
  }

  return null;
}

export async function signWithWalletKit(tx, address) {
  let wallet = currentWallet;

  if (!wallet) {
    wallet = await getConnectedWallet();
  }

  if (!wallet) {
    wallet = await openWalletModal();
  }

  if (!wallet) {
    throw new Error("No wallet selected");
  }

  const result = await wallet.signTransaction(tx.toXDR(), {
    networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
  });

  return result;
}
