# Cloudflare Pages automation

This repository deploys the existing DBD website to Cloudflare Pages from GitHub Actions.

## Project

- Cloudflare Pages project: `entity-wiki`
- Production branch: `main`
- Deploy directory: `the-entity-wiki/web`

## Required GitHub secrets

Set these on the GitHub repository:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The Cloudflare token should be a custom API token with Account -> Cloudflare Pages -> Edit access.

With GitHub CLI:

```bash
gh auth login -h github.com
cd /home/badeparday/Documents/github-repos/projet-perso-dbdsite-deploy
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set CLOUDFLARE_API_TOKEN
```

After both secrets are set, push to `main` or run the workflow manually from the GitHub Actions tab.
