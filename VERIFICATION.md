# Verification record

Latest verification: November 10, 2026.

## Checks performed

- `npm test`: passed all automated domain and hosting tests.
- `npm run build`: generated all seven pages and their local assets successfully.
- Hosting tests built the site at both `/` and `/Garden_Business_Website/`, then verified that every emitted page link and asset resolves to a generated file.
- Content assertions verify the requested homepage, event, facilities, accommodation, host and footer text; nine facilities; a capacity of up to 1,000 guests; and removal of the unwanted prototype phrases, arrows and circled card numbers.
- Domain tests verify cart sanitization and totals, room pricing, optional breakfast handling, invalid dates, occupancy limits and stay-length boundaries.
- Generated-form assertions verify that phone numbers are required while email addresses remain optional on event, food and accommodation forms. The updated browser test also checks that email becomes required for copy delivery and that phone numbers reach submission payloads.
- The opening photograph uses full-container cover sizing and a subtle responsive pan-and-zoom animation. Existing reduced-motion CSS disables the animation for visitors who request reduced motion.
- The browser integration test was updated for the submitted order, event inquiry and accommodation booking workflows, including invoice-copy opt-in and downloads. It was not rerun during this revision because the user confirmed Playwright had already been tested and asked to finish the changes.
- `git diff --check` is run before committing.

## Email workflow

The static GitHub Pages site submits event inquiries, food orders and accommodation booking requests through FormSubmit. Every request is addressed to the private venue inbox configured in `src/app.js`. Customers may opt in to an emailed copy and can download their confirmation or invoice.

FormSubmit requires the venue owner to click its activation message before live submissions are forwarded. After activation, replace the exposed email endpoint with FormSubmit's random endpoint token if the inbox address must also be hidden from page source.

## Limits

- The site submits requests but does not process payments or automatically confirm inventory, room availability or event availability.
- The optional breakfast price was not supplied, so the website marks it as an extra charge and excludes it from the estimate until the venue confirms the amount.
- Live email delivery is not end-to-end verified until FormSubmit is activated and a real submission is confirmed in the venue inbox.
