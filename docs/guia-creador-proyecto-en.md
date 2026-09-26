# Project Creator Guide — Bimex

> Fund your social-impact project with the yield from your backers' capital.

## What kind of projects does Bimex accept?

Bimex is designed for **social-impact** projects in Mexico and Latin America. Examples:

- Education: rural schools, scholarships, teaching materials
- Health: community clinics, vaccination campaigns
- Environment: reforestation, community solar energy
- Social entrepreneurship: cooperatives, local micro-businesses
- Culture: preservation of indigenous languages, cultural spaces

**Not accepted:** projects with private profit motives, projects without verifiable social impact, or projects that cannot provide documentation.

---

## Required documents

Before creating your project, prepare:

| Document | Description |
|---|---|
| Official ID | INE or passport of the project lead |
| Project plan | Description, objectives, beneficiaries, timeline |
| Detailed budget | Breakdown of how the yield received will be used |
| Evidence of impact | Photos, community letters, prior records (if any) |

These documents are combined into a single PDF, its SHA-256 hash is generated, and that hash is registered on-chain when the project is created (the `doc_hash` field). This guarantees the document cannot be modified afterwards.

```bash
# Generate the SHA-256 hash of your document
sha256sum mi-proyecto.pdf
# Example output: a3f2c1... (64 hex characters = 32 bytes)
```

---

## Step-by-step process

### 1. Prepare your wallet

- Install [Freighter](https://www.freighter.app) and create an account
- You need a small amount of XLM for network fees
- Connect your wallet at [bimex-frontend.vercel.app](https://bimex-frontend.vercel.app)

### 2. Create your project

- Go to **"Create Project"**
- Fill in the form:
  - **Name**: descriptive project name (max. 64 characters)
  - **Goal**: amount of MXNe you need to raise as base capital
  - **Document hash**: the first 32 bytes of the SHA-256 of your PDF
- Click **"Create"** and confirm in Freighter
- Your project is now in the **EnRevision** state

### 3. Admin review

The Bimex team will review your project within **2-5 business days**. They will verify:

- That the project has real social impact
- That the documentation is complete
- That the goal is reasonable for the project

If approved → **EtapaInicial** state (ready to receive backers)
If rejected → you'll receive the rejection reason in the `motivo_rechazo` field

### 4. Spread the word

Once approved, share your project link with your community. Backers can contribute from anywhere in the world with MXNe.

### 5. Claim the yield

When your project has active backers (**EnProgreso** or **Liberado** state), you can claim the accumulated yield:

- Go to your project detail page
- Click **"Claim yield"**
- Confirm in Freighter
- The yield MXNe arrives in your wallet

You can claim the yield **at any time** while the project is active. The yield clock resets with each claim.

### 6. Project closure

When you've completed the project's objectives:

- The admin can mark the project as **Liberado** (or it is marked automatically when the goal is reached)
- Backers can withdraw their principal
- You'll have received the total yield generated over the project's lifetime

If you need to cancel the project, use **"Abandon project"** — this lets backers recover their capital immediately.

---

## Calculating the yield you'll receive

```
estimated_yield = goal_mxne × 13.45% × (months / 12)

Example:
  Goal: 50,000 MXNe
  Estimated duration: 12 months
  Total yield: 50,000 × 0.1345 × 1 = 6,725 MXNe ≈ $6,725 MXN
```

> The actual yield depends on how much capital is effectively locked and for how long.

---

## Resources

- [Contributor guide](guia-contribuidor-en.md)
- [Technical documentation](../DOCUMENTACION.txt)
- [FAQ in English](faq-en.md)
- Support: [Stellar Discord](https://discord.gg/stellar-development-foundation)
