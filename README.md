# DBD App: The Entity's Wiki Website

Deployment repo for the public website version of the Dead by Daylight companion app.

## Project Structure
- `the-entity-wiki/web/` static site files
- `the-entity-wiki/scripts/` deployment helpers for Cloudflare Pages and R2
- `the-entity-wiki/deploy-cloudflare.md` deployment notes
- `api/` data files and helper scripts
- `assets/` shared images and resources

## Local Setup
```bash
cd the-entity-wiki
npm install
```

## Deploy To Cloudflare Pages
```bash
cd the-entity-wiki
npm run cf:pages -- your-pages-project-name
```

## Upload Assets To Cloudflare R2
```bash
cd the-entity-wiki
npm run cf:r2:upload -- --bucket your-bucket --public-base-url https://assets.example.com --source web/dbd_images
```

For the full deployment flow, see `the-entity-wiki/deploy-cloudflare.md`.
