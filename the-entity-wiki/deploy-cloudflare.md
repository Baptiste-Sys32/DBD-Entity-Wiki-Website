# Cloudflare deploy (custom domain + incremental uploads)

This project can be hosted with:
- **Cloudflare Pages** for the static site (`the-entity-wiki/web`)
- **Cloudflare R2** for heavy assets (`the-entity-wiki/web/dbd_images`)

This keeps the website fast and lets you upload large asset sets progressively.

## 1) Create Cloudflare resources

1. In Cloudflare dashboard, create a **Pages project** (you can deploy manually first).
2. Create an **R2 bucket** (example: `entity-wiki-assets`).
3. In R2 bucket settings, make objects public using one of:
   - an R2 custom domain, or
   - a public bucket URL.

Save your public base URL, for example:

`https://assets.yourdomain.com`

## 2) Deploy the site to Pages

From `the-entity-wiki`:

```bash
npm install
npx wrangler pages deploy web --project-name your-pages-project
```

If this is your first use of Wrangler, it will ask for Cloudflare login/authorization.

## 3) Upload images incrementally to R2

Use the helper script:

```bash
./scripts/upload-r2-assets.sh \
  --bucket entity-wiki-assets \
  --public-base-url https://assets.yourdomain.com \
  --source web/dbd_images
```

You can upload one subfolder at a time:

```bash
./scripts/upload-r2-assets.sh --bucket entity-wiki-assets --public-base-url https://assets.yourdomain.com --source web/dbd_images/perks --prefix perks
./scripts/upload-r2-assets.sh --bucket entity-wiki-assets --public-base-url https://assets.yourdomain.com --source web/dbd_images/killers --prefix killers
```

The script uses `rclone sync`, so re-running only transfers changed/missing files.

## 4) Point site asset URLs to R2

Set this in your website before production:

- `window.DBD_IMAGE_BASE_URL = "https://assets.yourdomain.com"`

Then image URLs should resolve to:

`https://assets.yourdomain.com/<prefix>/<file>`

If your website currently uses relative local paths, keep them for development and switch to this base URL in production.

## 5) Attach custom domain

In Cloudflare Pages project:

1. Open **Custom domains**
2. Add your domain/subdomain (example: `wiki.yourdomain.com`)
3. Cloudflare handles DNS + SSL automatically if your domain is on Cloudflare.

## Cost notes

- Cloudflare Pages has a generous free tier for personal projects.
- R2 has free allowances, then pay-as-you-go for storage/operations/egress beyond limits.
