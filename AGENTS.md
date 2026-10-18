# AGENTS.md - DBD site (projet-perso-dbdsite-deploy)

> Applies ONLY when cwd is inside `projet-perso-dbdsite-deploy/`.
> Global `~/AGENTS.md` still applies. On conflict, global security/safety wins, otherwise this file wins.
> Sibling repo: `projet-perso-dbdapp/` (app). See its AGENTS.md when porting.

## 0. Scope

- Work in DBD site + app repos only. Never touch R6 or other game repos unless explicitly asked.
- Role of this repo: source of truth. When a change spans site + app, implement and live-check here first, port to app after.

## 1. Workflow

- Map before doing (game updates): run the sync scripts first, map what changed, report. Wait for user go-ahead before implementing.
- No unasked work. Do exactly what was asked. Stop and ask rather than expanding scope.
- No release builds unasked. Never rebuild bundles, bump versions, or push deploys without an explicit request.

## 2. Porting to app

- Data-only exports. The app takes data only (content JSON, generated bundles, images, meta/changelog). Never push UI, engine, or native code to the app unless asked.

## 3. Visual changes

- For visual/embed work (favicons, covers, art): render previews into `~/Downloads/` and wait for approve/deny before touching the repo.
