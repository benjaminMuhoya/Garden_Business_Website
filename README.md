# Rosewood Gardens — website prototype

An independent, seven-page garden venue and hospitality website. **Rosewood Gardens is a provisional name.** All business descriptions, team profiles, capacities, rates and photographs are illustrative. The motto is “In Touch with Nature.”

The repository is independent on `main`. No personal-website files were reused. It is linked to `https://github.com/benjaminMuhoya/Garden_Business_Website` and publishes through GitHub Actions to GitHub Pages, matching the personal website’s hosting method. The site uses local assets and no third-party requests. The public website remains clearly labeled as a prototype; `noindex` metadata is retained and is not access control.

## Run locally

Requires a current Node.js installation; no package installation is needed for the website.

```sh
npm run build
npm run preview
```

Open http://127.0.0.1:4173. Stop the server with Ctrl+C. Rebuild after editing source; refreshing the browser loads the new build. `npm run dev` is an alias for the preview server and also expects `dist/` to have been built. `dist/` is generated and ignored by Git.

## Publishing

- Repository: https://github.com/benjaminMuhoya/Garden_Business_Website
- Website: https://benjaminmuhoya.github.io/Garden_Business_Website/
- Workflow: `.github/workflows/deploy.yml`

Pushing a commit to `main` runs the tests, builds the site using the base path supplied by GitHub Pages, uploads `dist/`, and deploys it. No GitHub credentials are stored in the source. The local Git remote is `origin`; normal updates use `git push origin main` after review and testing.

Local builds default to `/`. To preview the hosted path locally:

```sh
BASE_PATH=/Garden_Business_Website/ npm run build
BASE_PATH=/Garden_Business_Website/ PORT=4174 npm run preview
```

Then open http://127.0.0.1:4174/Garden_Business_Website/. Run `npm run build` again to restore a root-path local build. No real orders, bookings, email or payments are enabled by publication.

## Pages

- `/`: cinematic garden introduction, editable origin story, and six purposeful destinations.
- `/reserve/`: venue concept, occasion types, capacity, and local inquiry draft.
- `/facilities/`: four facility concepts with photographic scaffolds.
- `/menu/`: six sample menu items, category filtering, quantity controls, persistent basket, draft order and text download.
- `/accommodation/`: two sample room types, separate single/double rates, date-based estimates, board and meal choices, local booking draft.
- `/team/`: editable example profiles and explicit headshot placeholders.
- `/gallery/`: seven inspiration slots, category filtering, accessible native image dialog.

## Edit the content

- `src/content.js`: provisional brand, story, venue capacity, facilities, menu, room rates, meal prices, team profiles and gallery entries. Identifiers such as menu `id` values connect controls to basket lines; preserve unique identifiers when replacing items.
- `src/templates.js`: page structure, form labels, supporting copy, navigation and footer. The wordmark is currently composed in HTML/SVG and must also be changed here when approving a final brand.
- `src/styles.css`: shared colors, typography, layout, responsive breakpoints and component styling.
- `src/assets/`: local inspiration photographs and rose SVG. See `ASSETS.md` before replacing/publishing imagery.
- `src/domain.js`: bounded cart quantities and pricing calculations, shared by the real browser caller and unit tests.
- `src/app.js`: client interactions, validation and local draft downloads.
- `scripts/build.mjs`: generates all seven pages and copies local assets.

## Prototype behavior

Cart quantities (only) persist in the current browser under `rosewood-cart-v1`. Unknown item IDs and invalid quantities are discarded; each dish is limited to 20. No names, emails or notes are written to browser storage. Drafts remain in memory until downloaded by the visitor or the page is left/reloaded. Updating the form or basket hides stale draft summaries.

Room rates are per room per night and depend on one or two guests. Breakfast, lunch and dinner are per person per night and apply to every night. Date arithmetic uses whole calendar days, avoiding daylight-saving hour differences. Stays are limited to 1–30 nights. The prototype does not manage actual inventory, taxes, fees, bookings, delivery, payments, email or order submission. These flows intentionally stop at a reviewable local draft.

Native labels, field validation, focus indicators, a skip link, responsive navigation, live summaries, descriptive image alternatives and reduced-motion support are included. Team images are abstract placeholders, not portraits of real employees.

## Verify

```sh
npm test
npm run build
```

`tests/domain.test.mjs` covers malformed basket data, subtotals and counts, occupancy pricing, meal multiplication, date errors, and date boundaries. Browser integration checks are described in `VERIFICATION.md`; the reproducible browser script is `tests/browser.cjs`. It requires Playwright and an installed Chrome browser and is optional for running the site. See the environment-variable example in `VERIFICATION.md`.

Before accepting real orders or bookings, complete `CONTENT-CHECKLIST.md`, replace the photographs and team placeholders, approve content/brand, choose providers, and implement/test the real server workflows. No payment or booking provider has been selected.
