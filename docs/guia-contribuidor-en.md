# Contributor Guide — Bimex

> Support social-impact projects without risking your money.

## What is Bimex?

Bimex is a crowdfunding platform built on Stellar where **your capital is always recoverable**. Instead of donating money, you lock it temporarily in a smart contract. That capital generates yield (~13.45% APY), and that yield is what funds the project. When the project ends, you get back exactly what you put in.

```
You deposit 1,000 MXNe
        │
        ├─ The yield (~134 MXNe/year) goes to the project
        │
        └─ You recover your 1,000 MXNe at the end
```

**It's not a donation. It's an interest-free loan where the yield is the social benefit.**

---

## Requirements before you start

1. **Freighter Wallet** — the official Stellar wallet.
   - Download: https://www.freighter.app
   - Available as a browser extension for Chrome, Firefox and Brave.
   - Set the network to **Testnet** to try it out, or **Mainnet** for production.

2. **MXNe** — the Mexican-peso stablecoin on Stellar.
   - 1 MXNe ≈ 1 MXN (Mexican peso).
   - Issued by Etherfuse: https://etherfuse.com

### How do I get MXNe?

| Option | Description |
|---|---|
| Etherfuse | Buy directly with a bank transfer (SPEI) at https://etherfuse.com |
| Stellar DEX | Swap XLM or other assets for MXNe at https://stellarterm.com |
| Faucet (Testnet only) | Use the "100 free MXNe" button in the app for testing |

> You also need a small amount of **XLM** in your account to pay network fees (usually less than 0.01 XLM per transaction).

---

## Step by step: contributing to a project

### 1. Connect your wallet

- Open [bimex-frontend.vercel.app](https://bimex-frontend.vercel.app)
- Click **"Connect with Freighter"**
- Freighter will ask for authorization — accept it
- You'll see your address and MXNe balance in the top bar

### 2. Explore the projects

- Go to the **"Projects"** section
- Filter by status: *Open* (EtapaInicial / EnProgreso) or *Completed* (Liberado)
- Each project shows: name, goal, current progress, estimated yield and time active

### 3. Contribute

- Open the project detail page you're interested in
- Enter the amount in MXNe you want to contribute
- The system checks that you have enough balance
- Click **"Confirm"** — Freighter opens a window to sign the transaction
- Approve the transaction in Freighter
- Within seconds your contribution shows up on the project

### 4. Track your yield

- Go to **"My Account"** to see all your active projects
- You'll see: locked principal, yield generated so far, and elapsed time
- The yield is calculated per minute and keeps growing

### 5. Withdraw your principal

Your money isn't locked up — you can withdraw your original capital **at any time you want**, with no forced lockup:

- Go to the **"My Investment"** section on the project detail page
- Click **"Withdraw capital"**
- Confirm the exact amount to recover (if you withdraw early, we'll transparently tell you the yield the project will stop receiving)
- Confirm in Freighter
- The MXNe returns to your wallet immediately

---

## Security and FAQ

**Can I lose my money?**
No. The smart contract guarantees that your principal is always 100% recoverable. The code is public and auditable on the Stellar blockchain.

**What if I need my money before the project ends?**
You can withdraw whenever you want. Under our immediate-liquidity policy, you're never trapped. Withdrawing early has no penalty on your capital; it only stops the yield generated for the social project.

**Who controls the contract?**
The contract is immutable once deployed. Nobody can move your principal without your authorization. The admin can only approve or reject new projects.

**Is Freighter safe?**
Freighter is the official wallet from the Stellar Foundation. Your private key never leaves your device.

**How much yield does my contribution generate?**
About 13.45% APY (9.45% from CETES + 4% from AMM). Example: 1,000 MXNe for 6 months generates ~67 MXNe of yield for the project.

---

## Resources

- [Full technical documentation](../DOCUMENTACION.txt)
- [FAQ en español](faq-es.md)
- [FAQ in English](faq-en.md)
- [Stellar Community](https://stellar.org/community)
- [Freighter Wallet](https://www.freighter.app)
