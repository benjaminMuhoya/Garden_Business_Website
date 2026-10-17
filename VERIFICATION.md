# Verification record

Verified locally on October 16, 2026. This project has no hosted deployment or external service integration.

## Checks performed

- `npm run build`: passed; seven distinct HTML pages plus local CSS, JavaScript and image assets were generated. Build checks enforce unique menu/room identifiers, valid numeric prices and the presence of referenced image files.
- `npm test`: four domain test groups passed, covering cart sanitization/counts/subtotals, single/double occupancy, meal multiplication, invalid/past/reversed dates, stay-length limits and calendar/daylight-saving boundaries.
- `npm run test:browser`: passed against the built output served on loopback, using headless Chrome via Playwright. The test follows the actual rendered controls into client calculations and draft summaries.
- All seven pages were checked at widths of 1440, 768, 390 and 320 pixels: one main heading per page and no horizontal overflow or broken loaded images.
- Mobile menu navigation, menu category filtering, quantity changes, cart persistence after reload, correct subtotal, draft creation/download, and empty-cart behavior passed.
- Venue inquiry drafting with name, email, future date and guest count passed; counts exceeding the sample capacity were rejected.
- A two-person Garden Room stay for two nights with breakfast, lunch and dinner produced **$450 USD** in both the live summary and booking draft. A one-person Terrace Suite stay for two nights with bed only produced **$250 USD**. Reversed dates were rejected; room-card selection updated the real booking form.
- Gallery filters, image dialog opening and Escape dismissal passed.
- The tested browser workflows produced no JavaScript page errors, failed HTTP responses or external network requests.
- Desktop and mobile screenshots were inspected visually. Full-page Chrome captures exhibited a compositor artifact involving the off-screen skip link; separate viewport screenshots and DOM measurements confirmed it remains off-screen until focused.
- Git changes were inspected for scope, and source/assets remain inside the independent repository.

## Reproduce the browser checks

Start the built site's preview server in one terminal. The website itself has no npm dependencies. To run the optional browser tests, make Playwright available and supply a Chrome executable when using an existing browser:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
CHROME_PATH=/absolute/path/to/chrome \
npm run test:browser
```

If Playwright and its browsers are already installed in the project, simply run `npm run test:browser`. `PREVIEW_URL` defaults to `http://127.0.0.1:4173`; `QA_OUTPUT_DIR` defaults to ignored `work/qa/`. The sample data and browser fixtures must be updated together when changing prices or labels.

## Limits

The **local prototype workflows were verified end to end**. Real order submission, email, payment, booking inventory, hosted deployment and provider error handling were not run because those services are not implemented. Chrome was tested; Safari, Firefox, real-device testing and a formal screen-reader/accessibility audit remain unperformed. No claims are made about real availability, capacity, pricing, dietary suitability or photographic accuracy.
