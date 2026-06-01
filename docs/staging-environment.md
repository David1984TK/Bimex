# Staging Environment Guide

## Overview

Bimex uses a three-environment deployment strategy:

| Environment | Network | Purpose | Branch | URL |
|-------------|---------|---------|--------|-----|
| **Development** | Testnet | Active development | `main` | bimex-frontend.vercel.app |
| **Staging** | Testnet | QA & PR validation | `staging` | bimex-staging.vercel.app |
| **Production** | Mainnet | Live production | `main` | TBD |

## Why Staging?

Previously, changes went directly from testnet development to production. The staging environment provides:

- **Risk mitigation**: Test PRs in an isolated environment before merging to main
- **QA validation**: Dedicated space for quality assurance testing
- **Separate data**: Staging has its own contract, preventing test data pollution
- **Production parity**: Staging mirrors production configuration (except network)

## Architecture

### Staging Contract

Staging uses a **dedicated Soroban contract** deployed on Testnet, separate from the development contract:

```
Development:  CAEYEIIH4MHXDVEBAPNGV2LJ7DAO4JSVBIN3E3I6TBK56AMRWERNRM3B
Staging:      CSTAGING_REPLACE_AFTER_DEPLOY (deploy with scripts/deploy-staging.sh)
Production:   REEMPLAZAR_CON_CONTRACT_ID_DE_MAINNET (Mainnet)
```

### Environment Variables

Each environment has its own `.env` file:

- `.env.testnet` - Development (main branch on testnet)
- `.env.staging` - Staging (staging branch on testnet)
- `.env.production` - Production (main branch on mainnet)

## Deployment Workflow

### 1. Feature Development

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

### 2. Create Pull Request

```bash
# Create PR targeting staging branch
gh pr create --base staging --title "feat: my feature" --body "Description"
```

### 3. Deploy to Staging

When PR is merged to `staging`:

```bash
# Vercel automatically deploys to bimex-staging.vercel.app
# Badge shows "STAGING" in the navbar
```

### 4. QA Validation

- Test all functionality on staging
- Verify contract interactions
- Check UI/UX changes
- Validate with real wallet interactions

### 5. Merge to Main

Once validated on staging:

```bash
# Create PR from staging to main
git checkout staging
git pull origin staging
gh pr create --base main --title "Release: staging to main" --body "Validated changes"

# After approval, merge to main
# This deploys to production (bimex-frontend.vercel.app)
```

## Visual Flow

```
┌─────────────┐
│   Feature   │
│   Branch    │
└──────┬──────┘
       │ PR
       ▼
┌─────────────┐      ┌──────────────────┐
│   Staging   │─────▶│  QA Validation   │
│   Branch    │      │  on Testnet      │
└──────┬──────┘      └──────────────────┘
       │ PR (after QA)
       ▼
┌─────────────┐      ┌──────────────────┐
│    Main     │─────▶│   Production     │
│   Branch    │      │   on Mainnet     │
└─────────────┘      └──────────────────┘
```

## Setup Instructions

### 1. Deploy Staging Contract

```bash
# Set environment variables
export STAGING_ADMIN_SECRET=S...  # Staging admin secret key
export TOKEN_MXNE=CDDIGHPVTW4PSCQCU67NQ4NXZ4NX5GDLNL3O67WT5RQ4GT6RXIEYPC4P
export YIELD_CETES_BPS=945
export YIELD_AMM_BPS=400

# Deploy contract
bash scripts/deploy-staging.sh

# Output will show:
# Contract ID : CXXXXXXX...
# Admin       : GXXXXXXX...
```

### 2. Update Environment File

Update `bimex-frontend/.env.staging` with the deployed contract:

```bash
VITE_CONTRACT_ID=CXXXXXXX...  # From deploy output
VITE_ADMIN_ADDRESS=GXXXXXXX...  # From deploy output
```

### 3. Configure Vercel

Create a new Vercel project for staging:

```bash
# In Vercel dashboard:
# 1. Create new project "bimex-staging"
# 2. Connect to GitHub repository
# 3. Set production branch to "staging"
# 4. Add environment variables from .env.staging
# 5. Deploy
```

Environment variables to add in Vercel:

```
VITE_NETWORK=testnet
VITE_CONTRACT_ID=CXXXXXXX...
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_TOKEN_MXNE=CDDIGHPVTW4PSCQCU67NQ4NXZ4NX5GDLNL3O67WT5RQ4GT6RXIEYPC4P
VITE_ADMIN_ADDRESS=GXXXXXXX...
VITE_INDEXER_URL=https://bimex-indexer-staging.vercel.app
```

### 4. Create Staging Branch

```bash
# Create staging branch from main
git checkout main
git pull origin main
git checkout -b staging
git push origin staging

# Protect staging branch in GitHub:
# Settings → Branches → Add rule
# - Require pull request reviews
# - Require status checks to pass
```

## Building for Staging

### Local Build

```bash
cd bimex-frontend
npm run build:staging
```

This uses Vite's `--mode staging` flag, which:
- Loads `.env.staging` file
- Sets `import.meta.env.MODE` to `"staging"`
- Shows purple "STAGING" badge in navbar

### Vercel Build

Vercel automatically runs `npm run build` but uses environment variables from the Vercel dashboard, which override the `.env.staging` file.

## Staging Badge

The staging environment displays a purple "STAGING" badge in the navbar to clearly indicate you're not in production:

```jsx
{IS_STAGING && (
  <span style={st.stagingBadge}>STAGING</span>
)}
```

Badge styling:
- **Color**: Purple (#8B5CF6)
- **Position**: Next to "Testnet" badge in navbar
- **Visibility**: Always visible on staging environment

## Testing Checklist

Before merging staging to main, verify:

- [ ] All contract functions work correctly
- [ ] Wallet connection and disconnection
- [ ] Project creation with IPFS document upload
- [ ] Project contribution flow
- [ ] Project abandonment and continuation
- [ ] Admin panel functionality (if admin)
- [ ] Responsive design on mobile/tablet
- [ ] Language switching (ES/EN)
- [ ] Real-time updates via SSE
- [ ] Error handling and user feedback
- [ ] STAGING badge is visible

## Troubleshooting

### Staging badge not showing

Check that Vercel environment variable `VITE_MODE` is not set. The mode should be determined by the build command.

### Contract not found

Verify `VITE_CONTRACT_ID` in Vercel matches the deployed staging contract.

### Wrong network

Ensure `VITE_NETWORK=testnet` in Vercel environment variables.

### IPFS upload fails

Check `VITE_PINATA_API_KEY` and `VITE_PINATA_SECRET` are set correctly.

## Best Practices

1. **Always test on staging first** - Never merge directly to main without staging validation
2. **Keep staging in sync** - Regularly merge main into staging to avoid drift
3. **Use staging for demos** - Show stakeholders features on staging before production
4. **Monitor staging** - Set up alerts for staging errors (Sentry, etc.)
5. **Document changes** - Update CHANGELOG.md with each staging deployment

## Branch Protection Rules

### Staging Branch

- Require pull request reviews (1 approver)
- Require status checks to pass
- Require branches to be up to date
- Do not allow force pushes

### Main Branch

- Require pull request reviews (2 approvers)
- Require status checks to pass
- Require branches to be up to date
- Do not allow force pushes
- Require deployments to succeed on staging first

## Related Documentation

- [Deployment Guide](../DOCUMENTACION.txt)
- [Technical Integration](guia-tecnica-integracion.md)
- [Disaster Recovery](disaster-recovery.md)
