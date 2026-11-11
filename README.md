# Jotham Gardens — business website

An independent, seven-page garden venue and hospitality website. **Jotham Gardens is the owner-provided business name.** The motto is “Your Nature Haven for Food, Drinks & Events.”

The repository is independent on `main`. No personal-website files were reused. It is linked to `https://github.com/benjaminMuhoya/Garden_Business_Website` and publishes through GitHub Actions to GitHub Pages. The site uses local assets and FormSubmit for event inquiries, food orders and accommodation booking requests.

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

Then open http://127.0.0.1:4174/Garden_Business_Website/. Run `npm run build` again to restore a root-path local build. FormSubmit must be activated from the confirmation message sent to the venue inbox before it will forward live submissions.

## Pages

- `/`: cinematic garden introduction, editable origin story, and six purposeful destinations.
- `/reserve/`: event information, occasion types, capacity, and a working inquiry form.
- `/facilities/`: nine venue facilities with concise descriptions.
- `/menu/`: category filtering, quantity controls, a persistent basket, order submission and invoice download.
- `/accommodation/`: room rates, date-based estimates, optional breakfast and booking submission.
- `/team/`: editable example profiles and explicit headshot placeholders.
- `/gallery/`: seven inspiration slots, category filtering, accessible native image dialog.

## Edit the content

- `src/content.js`: business name, motto, draft story, venue capacity, facilities, menu, room rates, meal prices, team profiles and gallery entries. Identifiers such as menu `id` values connect controls to basket lines; preserve unique identifiers when replacing items.
- `src/templates.js`: page structure, form labels, supporting copy, navigation and footer. The wordmark is currently composed in HTML/SVG and uses the approved Jotham Gardens name.
- `src/styles.css`: shared colors, typography, layout, responsive breakpoints and component styling.
- `src/assets/`: local inspiration photographs and rose SVG. See `ASSETS.md` before replacing/publishing imagery.
- `src/domain.js`: bounded cart quantities and pricing calculations, shared by the real browser caller and unit tests.
- `src/app.js`: client interactions, validation, form delivery and confirmation downloads.
- `scripts/build.mjs`: generates all seven pages and copies local assets.

## Ordering and booking behavior

Cart quantities (only) persist in the current browser under `rosewood-cart-v1`. Unknown item IDs and invalid quantities are discarded; each dish is limited to 20. Names, phone numbers, emails and notes are not written to browser storage. Every order, booking and inquiry requires a customer phone number. Email is optional and becomes required only when the customer asks for an emailed invoice or copy. Successful submissions can also be downloaded as text confirmations.

Room rates are per room per night and depend on one or two guests. Breakfast is optional and its extra charge is confirmed by the venue, so it is not included in the website estimate. Date arithmetic uses whole calendar days, avoiding daylight-saving hour differences. Stays are limited to 1–30 nights. The site sends order and inquiry details but does not process payment or automatically confirm inventory or availability.

Native labels, field validation, focus indicators, a skip link, responsive navigation, live summaries, descriptive image alternatives and reduced-motion support are included. Team images are abstract placeholders, not portraits of real employees.

## Verify

```sh
npm test
npm run build
```

`tests/domain.test.mjs` covers malformed basket data, subtotals and counts, occupancy pricing, meal multiplication, date errors, and date boundaries. Browser integration checks are described in `VERIFICATION.md`; the reproducible browser script is `tests/browser.cjs`. It requires Playwright and an installed Chrome browser and is optional for running the site. See the environment-variable example in `VERIFICATION.md`.

Before accepting real orders or bookings, activate the FormSubmit endpoint, approve the content and brand, and confirm the photographs. No payment provider has been selected.
