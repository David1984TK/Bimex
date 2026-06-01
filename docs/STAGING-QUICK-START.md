# Staging Environment - Quick Start

## TL;DR

Staging is a separate environment on Testnet for QA validation before production.

**Workflow**: `feature` → `staging` (QA) → `main` (production)

## Setup (One-time)

### 1. Deploy Staging Contract

```bash
export STAGING_ADMIN_SECRET=S...
bash scripts/deploy-staging.sh
```

Copy the output `CONTRACT_ID` and `ADMIN_ADDRESS`.

### 2. Update .env.staging

```bash
# bimex-frontend/.env.staging
VITE_CONTRACT_ID=<CONTRACT_ID_FROM_DEPLOY>
VITE_ADMIN_ADDRESS=<ADMIN_ADDRESS_FROM_DEPLOY>
```

### 3. Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. New Project → Import `bimex` repository
3. Project name: `bimex-staging`
4. Production branch: `staging`
5. Add environment variables from `.env.staging`
6. Deploy

### 4. Create Staging Branch

```bash
git checkout main
git pull origin main
git checkout -b staging
git push origin staging
```

## Daily Workflow

### Create Feature

```bash
git checkout main
git pull origin main
git checkout -b feature/my-feature

# Make changes
git add .
git commit -m "feat: my feature"
git push origin feature/my-feature
```

### Deploy to Staging

```bash
# Create PR to staging
gh pr create --base staging --title "feat: my feature"

# After review, merge PR
# Vercel auto-deploys to bimex-staging.vercel.app
```

### QA on Staging

1. Open https://bimex-staging.vercel.app
2. Verify purple "STAGING" badge is visible
3. Test all functionality
4. Check contract interactions
5. Validate UI/UX

### Deploy to Production

```bash
# Create PR from staging to main
git checkout staging
git pull origin staging
gh pr create --base main --title "Release: staging to main"

# After review, merge PR
# Vercel auto-deploys to production
```

## Visual Indicators

### Staging Badge

Purple "STAGING" badge appears in navbar:

```
┌─────────────────────────────────────┐
│ [STAGING] [Testnet] [100 MXNe] ... │
└─────────────────────────────────────┘
```

### Environment URLs

- Development: `bimex-frontend.vercel.app`
- Staging: `bimex-staging.vercel.app` ← **QA here**
- Production: TBD (Mainnet)

## Common Commands

```bash
# Build for staging locally
npm run build:staging

# Check current branch
git branch --show-current

# Sync staging with main
git checkout staging
git merge main
git push origin staging

# View staging logs
vercel logs bimex-staging
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Badge not showing | Check `import.meta.env.MODE === "staging"` |
| Contract not found | Verify `VITE_CONTRACT_ID` in Vercel |
| Wrong data showing | Ensure staging uses separate contract |
| Build fails | Check `npm run build:staging` locally |

## Key Points

✅ **DO**:
- Always test on staging before merging to main
- Use staging for demos and QA
- Keep staging branch in sync with main

❌ **DON'T**:
- Merge directly to main without staging validation
- Use production contract on staging
- Skip QA validation

## Full Documentation

See [Staging Environment Guide](staging-environment.md) for complete details.
