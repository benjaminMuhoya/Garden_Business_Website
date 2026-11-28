const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = (process.env.PREVIEW_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const jamhuriPath = '/events/jamhuri-day/';
const nyePath = '/events/nye-at-jotham-gardens/';

async function checkNotesGuidance(form) {
  const notes = form.getByLabel('Notes', { exact: true });
  const guidance = form.locator('#notes-guidance');
  assert.ok(await guidance.isVisible());
  assert.match(await guidance.innerText(), /sharing your preferences in Notes helps us prepare for your visit/);
  assert.equal(await notes.getAttribute('aria-describedby'), 'notes-guidance');
  assert.equal(await notes.evaluate(input => input.closest('label').previousElementSibling.id), 'notes-guidance');
  return notes;
}

async function run() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  try {
    const page = await browser.newPage({ timezoneId: 'America/New_York' });
    const errors = [];
    const submissions = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://formsubmit.co/**', async route => {
      assert.equal(route.request().url(), 'https://formsubmit.co/ajax/jothamgardens.online@gmail.com');
      submissions.push(route.request().postDataJSON());
      await route.fulfill({ json: { success: submissions.length === 1 ? 'false' : true } });
    });
    await page.clock.install({ time: new Date('2026-12-12T20:00:00Z') });
    await page.goto(base + '/');
    await page.getByRole('navigation').getByRole('link', { name: 'Events', exact: true }).click();

    const upcoming = page.getByRole('region', { name: 'Upcoming events' });
    const past = page.getByRole('region', { name: 'Past events' });
    const names = group => group.locator('li span').allTextContents();
    await upcoming.getByRole('link', { name: 'RSVP for NYE @ Jotham Gardens' }).waitFor();
    assert.deepEqual(await names(upcoming), ['NYE @ Jotham Gardens', 'Jamhuri Day']);
    assert.equal(await past.count(), 0);
    assert.equal(await upcoming.getByRole('link').count(), 2);
    assert.doesNotMatch(await page.locator('main').innerText(), /\d/);

    for (const width of [1440, 901, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await upcoming.getByRole('link', { name: 'RSVP for Jamhuri Day' }).click();
    assert.equal(page.url(), base + jamhuriPath);
    const form = page.locator('#event-rsvp');
    await form.waitFor();
    await checkNotesGuidance(form);
    assert.equal(await page.locator('time').getAttribute('datetime'), '2026-12-12');
    const offer = page.getByRole('region', { name: '10% off family and group platters' });
    assert.deepEqual(await offer.getByRole('heading', { level: 3 }).allTextContents(), ['Family Platters', 'Group Packages']);
    assert.deepEqual(await offer.locator('.event-offer-item > strong').allTextContents(), ['Platter for 4', 'Platter for 6', 'Whole Mbuzi']);
    assert.deepEqual(await offer.locator('del').allTextContents(), ['KSh 3,200', 'KSh 4,800', 'KSh 25,000']);
    assert.deepEqual(await offer.locator('.event-offer-prices strong').allTextContents(), ['KSh 2,880', 'KSh 4,320', 'KSh 22,500']);
    assert.ok(await offer.locator('del').first().evaluate(price => getComputedStyle(price).textDecorationLine === 'line-through'));
    assert.doesNotMatch(await page.locator('main').innerText(), /Tickets|Price to come|All events/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(await form.locator('input[required], textarea[required]').count(), 4);
    await form.getByLabel('Name', { exact: true }).fill('Test Guest');
    await form.getByLabel('Phone Number').fill('+254 700 000 000');
    await form.getByLabel('Group Size').fill('4');
    await form.getByRole('button', { name: 'Send RSVP' }).click();
    assert.equal(submissions.length, 0);
    await form.getByLabel('Notes').fill('   ');
    await form.getByRole('button', { name: 'Send RSVP' }).click();
    assert.equal(submissions.length, 0);
    await form.getByLabel('Notes').fill('Test request');
    await form.getByRole('button', { name: 'Send RSVP' }).click();
    await form.getByRole('alert').waitFor();
    assert.equal(await page.getByText('We’ll call to finalize your booking.').isVisible(), false);
    await form.getByRole('button', { name: 'Send RSVP' }).click();
    await page.getByText('We’ll call to finalize your booking.').waitFor();
    assert.equal(await form.isVisible(), false);
    assert.equal(submissions.length, 2);
    assert.deepEqual(submissions[1], {
      Event: 'Jamhuri Day',
      'Event date': '2026-12-12',
      Name: 'Test Guest',
      Phone: '+254 700 000 000',
      'Group size': 4,
      Notes: 'Test request',
      _subject: 'New Jotham Gardens event RSVP',
      _template: 'table',
      _captcha: 'false'
    });

    await page.goto(base + '/events/');
    await upcoming.getByRole('link', { name: 'RSVP for Jamhuri Day' }).waitFor();
    await page.clock.fastForward('01:00:01');
    assert.deepEqual(await names(upcoming), ['NYE @ Jotham Gardens']);
    assert.deepEqual(await names(past), ['Jamhuri Day']);
    assert.equal(await past.locator('a[href]').count(), 0);
    await page.goto(base + jamhuriPath);
    await page.getByText('RSVPs are closed.').waitFor();
    assert.equal(await form.isVisible(), false);
    await form.evaluate(element => element.dispatchEvent(new Event('submit', { cancelable: true })));
    assert.equal(submissions.length, 2);

    await page.goto(base + '/events/');
    await upcoming.getByRole('link', { name: 'RSVP for NYE @ Jotham Gardens' }).click();
    assert.equal(page.url(), base + nyePath);
    await form.waitFor();
    await checkNotesGuidance(form);
    assert.equal(await page.locator('time').getAttribute('datetime'), '2026-12-31');
    const prices = page.getByRole('table', { name: 'Per person (KES)' });
    assert.deepEqual(await prices.getByRole('columnheader').allTextContents(), ['Guest', 'Early Bird', 'At the Venue']);
    assert.deepEqual(
      await prices.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))),
      [
        ['Kids under 10', '500', '600'],
        ['Young adults', '1,000', '1,200'],
        ['Adults', '1,500', '1,800']
      ]
    );
    const ticketDetails = page.getByRole('region', { name: 'Tickets' });
    assert.ok(await ticketDetails.getByText('Kids’ tickets include all-day bouncing castle access. Young adults can compete for prizes.', { exact: true }).isVisible());
    assert.ok(await page.getByText('You can enter without a package. The buffet and activities require a paid package.').isVisible());
    assert.ok(await ticketDetails.getByText('Food buffet from 5:30 pm until late into the night. Limit of 2 mocktails per guest.', { exact: true }).isVisible());
    const introText = await page.locator('.event-description').innerText();
    assert.match(introText, /activities for the whole family, including kids and young adults\./);
    assert.doesNotMatch(introText, /compete for prizes/);
    assert.doesNotMatch(await page.locator('main').innerText(), /Late Ticket|Late pricing|All events/);
    const flyerLink = page.getByRole('link', { name: 'View full-size event flyer' });
    const flyer = flyerLink.getByRole('img', { name: 'New Year’s Eve at Jotham Gardens flyer' });
    assert.equal(await flyerLink.getAttribute('href'), await flyer.getAttribute('src'));
    await flyer.evaluate(img => img.decode());
    for (const viewport of [
      { width: 320, height: 844 }, { width: 390, height: 844 },
      { width: 820, height: 768 }, { width: 1440, height: 844 }, { width: 1024, height: 360 }
    ]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const dimensions = await flyer.evaluate(img => {
        const { width, height } = img.getBoundingClientRect();
        return { width, height, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight };
      });
      assert.deepEqual([dimensions.naturalWidth, dimensions.naturalHeight], [1517, 2280]);
      assert.ok(Math.abs(dimensions.width / dimensions.height - 1517 / 2280) < 0.001, 'full flyer stays in proportion');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const poster = await flyer.boundingBox();
      if (viewport.width < 800) {
        const intro = await page.locator('.event-description').boundingBox();
        assert.ok(poster.y >= intro.y + intro.height && poster.y + poster.height <= (await prices.boundingBox()).y);
        assert.ok(poster.width <= 192 && await flyerLink.evaluate(link => getComputedStyle(link).position === 'static'));
        continue;
      }
      const title = await page.locator('.page-intro').boundingBox();
      assert.ok(poster.x >= title.x + title.width && poster.width <= 300);
      for (const target of [prices, form]) {
        await target.evaluate(element => {
          const top = element.getBoundingClientRect().top + window.scrollY - 110;
          window.scrollTo({ top, behavior: 'instant' });
        });
        const pinned = await flyer.boundingBox();
        assert.ok(Math.abs(pinned.y - 24) < 2, 'flyer remains pinned beside the section');
        assert.ok(pinned.y + pinned.height <= viewport.height, 'pinned flyer fits in the viewport');
      }
    }
    await form.getByLabel('Name', { exact: true }).fill('NYE Test Guest');
    await form.getByLabel('Phone Number').fill('+254 700 000 000');
    await form.getByLabel('Group Size').fill('3');
    await form.getByLabel('Notes').fill('NYE test request');
    await form.getByRole('button', { name: 'Send RSVP' }).click();
    await page.getByText('We’ll call to finalize your booking.').waitFor();
    assert.equal(submissions.length, 3);
    assert.equal(submissions[2].Event, 'NYE @ Jotham Gardens');
    assert.equal(submissions[2]['Event date'], '2026-12-31');
    assert.equal(submissions[2]['Group size'], 3);
    await page.reload();
    await form.waitFor();
    await page.clock.setFixedTime(new Date('2026-12-31T21:00:00Z'));
    await form.evaluate(element => element.dispatchEvent(new Event('submit', { cancelable: true })));
    await page.getByText('RSVPs are closed.').waitFor();
    assert.equal(submissions.length, 3);
    await page.goto(base + '/events/');
    await past.waitFor();
    assert.deepEqual(await names(past), ['NYE @ Jotham Gardens', 'Jamhuri Day']);
    assert.equal(await upcoming.count(), 0);
    assert.equal(await past.locator('a[href]').count(), 0);

    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [path, formId, requestType, prepare] of [
      ['/reserve/', '#reservation-form', 'Event inquiry', async form => {
        await form.locator('[name="date"]').fill('2030-06-10');
      }],
      ['/menu/', '#order-form', 'Food order', async () => {
        await page.locator('[data-qty="1"]:visible').first().click();
      }]
    ]) {
      await page.goto(base + path);
      const orderForm = page.locator(formId);
      const notes = await checkNotesGuidance(orderForm);
      assert.equal(await notes.getAttribute('required'), null);
      await orderForm.locator('[name="name"]').fill('Test Guest');
      await orderForm.locator('[name="phone"]').fill('+254 700 000 000');
      await notes.fill('Test preference');
      await prepare(orderForm);
      await orderForm.locator('[type="submit"]').click();
      await page.locator('#draft-result').waitFor();
      assert.equal(submissions.at(-1)._subject, `New Jotham Gardens ${requestType}`);
      assert.equal(submissions.at(-1).Notes, 'Test preference');
    }
    assert.equal(submissions.length, 5);
    assert.deepEqual(errors, []);
    console.log('PASS: Notes guidance and form submissions for events, reservations, and food orders, plus NYE prices, flyer layout, and event cutoff.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
