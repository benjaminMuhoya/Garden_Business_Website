# Rosewood Gardens — local website concept

An independent, seven-page garden venue and hospitality website. **Rosewood Gardens is a provisional name.** All business descriptions, team profiles, capacities, rates and photographs are illustrative. The motto is “In Touch with Nature.”

The repository is initialized independently on `main`. No personal-website files were reused. Nothing is registered with Sites or published. The preview server binds only to `127.0.0.1`; the site makes no external requests. Robots metadata is included for the prototype, but is not an access-control mechanism.

## Run locally

Requires a current Node.js installation; no package installation is needed for the website.

```sh
npm run build
npm run preview
```

Open http://127.0.0.1:4173. Stop the server with Ctrl+C. Rebuild after editing source; refreshing the browser loads the new build. `npm run dev` is an alias for the preview server and also expects `dist/` to have been built. `dist/` is generated and ignored by Git.

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

Before any real publication, complete `CONTENT-CHECKLIST.md`, replace the photographs and team placeholders, approve content/brand, choose providers, and implement/test the real server workflows. No payment or booking provider has been selected.
