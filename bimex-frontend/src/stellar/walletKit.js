import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { CONFIG } from "./contrato.js";

let initialized = false;

function initializeKit() {
  if (initialized) return StellarWalletsKit;
  initialized = true;

  const wcProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  const modules = [new FreighterModule()];
  const network = CONFIG.NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

  StellarWalletsKit.init({ network, modules, selectedWalletId: "freighter" });

  if (wcProjectId) {
    import("@creit.tech/stellar-wallets-kit/modules/wallet-connect").then(({ WalletConnectModule }) => {
      modules.push(new WalletConnectModule({ projectId: wcProjectId, name: "Bimex" }));
      StellarWalletsKit.init({ network, modules, selectedWalletId: "freighter" });
    }).catch(() => {});
  }

  return StellarWalletsKit;
}

export function getWalletKit() {
  return initializeKit();
}

export async function openWalletModal() {
  const walletKit = getWalletKit();

  try {
    const { address } = await walletKit.authModal();
    if (address) localStorage.setItem("lastWallet", walletKit.selectedModule.productId);
    return address || null;
  } catch {
    return null;
  }
}

export async function getConnectedAddress() {
  const walletKit = getWalletKit();
  const lastWalletId = localStorage.getItem("lastWallet");
  if (!lastWalletId) return null;

  try {
    walletKit.setWallet(lastWalletId);
    const { address } = await walletKit.fetchAddress();
    return address || null;
  } catch {
    localStorage.removeItem("lastWallet");
    return null;
  }
}

export async function signWithWalletKit(tx, address) {
  const walletKit = getWalletKit();
  const lastWalletId = localStorage.getItem("lastWallet");
  if (lastWalletId) walletKit.setWallet(lastWalletId);

  const { signedTxXdr } = await walletKit.signTransaction(tx.toXDR(), {
    networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
    address,
  });

  return signedTxXdr;
}
