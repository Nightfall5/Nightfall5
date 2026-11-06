# Project Deployment Policy

This document records the hosting standard for projects in the Nightfall5 account. The goal is simple: every completed project that is safe and technically ready should have a public HTTPS demo, and the portfolio should link to both the live application and its source repository.

## Deployment rules

1. A project is considered **deployed** only after the hosting workflow succeeds and the public URL has been checked.
2. Completed static websites and frontend demos should use GitHub Pages with GitHub Actions unless a project already has a suitable live host.
3. Vite project sites must use the repository base path (for example, `/repository-name/`) when deployed under `username.github.io`.
4. Framework applications that require a backend, database, background scheduler, uploads, or persistent storage must use an application host that supports those requirements. GitHub Pages is static hosting and must not be used as a substitute for an API server.
5. Supabase-backed projects require valid deployment environment variables, database migrations/schema, and production-safe Row Level Security policies before the public demo can be considered usable.
6. Do not commit `.env` files, private keys, service-role keys, database files containing personal data, or production credentials.
7. Incomplete exercises, empty repositories, UI-only fragments, and projects without a usable application flow should not be deployed merely to increase the project count.
8. Add or update a portfolio live-demo link only after the deployment is successful. Keep the repository/source link alongside it.
9. Every newly completed project should be reviewed for hosting needs and given an automatic deployment workflow before it is marked complete.

## Deployment inventory

| Repository / project | Architecture | Current status | Deployment target |
| --- | --- | --- | --- |
| [Nightfall5](https://github.com/Nightfall5/Nightfall5) — Developer portfolio | Static HTML/CSS/JS + Three.js | Live | GitHub Pages |
| [sensorktp](https://github.com/Nightfall5/sensorktp) — SensorKTP | React + TypeScript + Vite; browser-only image processing | Live | GitHub Pages |
| [Landing-Page-Parfume](https://github.com/Nightfall5/Landing-Page-Parfume) — LUXU landing page | Static HTML/CSS/JS | Live; automatic deployment workflow passed successfully. [Live demo](https://nightfall5.github.io/Landing-Page-Parfume/). | GitHub Pages |
| [Luxu_Parfume_Market-Place](https://github.com/Nightfall5/Luxu_Parfume_Market-Place) — TokoKita storefront | React + Vite + Supabase | Not deployed: requires Supabase URL/key, schema, and production RLS configuration | Static host + Supabase |
| [MinatBakat-TI](https://github.com/Nightfall5/MinatBakat-TI) — MINBAK TI | Laravel 11 + PHP + relational database | Not deployed: requires a PHP application host, production database, app key, storage, and environment configuration | PHP application host |
| [analisis-dan-design-pl](https://github.com/Nightfall5/analisis-dan-design-pl) — KuliaTrack | React + Vite + Express + file-backed data/uploads + SSE | Private repository; backend requires persistent application hosting and persistent storage | Node.js application host + persistent disk |
| [pbp-240511056](https://github.com/Nightfall5/pbp-240511056) — PBP login exercise | Static login UI / academic exercise | Intentionally excluded: partial academic interface, not a complete standalone product | No deployment |
| [Project_Kuliah](https://github.com/Nightfall5/Project_Kuliah) | Empty repository | Excluded | No deployment |

The E-Commerce Website already has an existing external demo: https://e-commerce-websitesederhana.netlify.app/.

## GitHub Pages workflow convention

For static repositories, keep a workflow at `.github/workflows/deploy-pages.yml` that:

- runs on pushes to `main` and manual dispatch;
- builds the site into a clean output directory;
- grants `pages: write` and `id-token: write`;
- uploads the build output with `actions/upload-pages-artifact`;
- publishes it with `actions/deploy-pages`.

The repository's Pages publishing source must be set to **GitHub Actions**. The `configure-pages` action can read/configure the site after Pages is enabled; automatic first-time enablement requires an appropriately privileged token separate from the default `GITHUB_TOKEN`.

## Completion checklist for a new project

- [ ] Confirm the project is complete enough to demonstrate.
- [ ] Identify static, frontend-plus-service, or full-stack architecture.
- [ ] Check secrets, environment variables, migrations, storage, and third-party services.
- [ ] Add the correct deployment workflow.
- [ ] Set the hosting platform's required project settings and secrets.
- [ ] Confirm build and deployment pass.
- [ ] Open the public HTTPS URL and test the main user flow.
- [ ] Add the live URL and source URL to the portfolio and profile README.
