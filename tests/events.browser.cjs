const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = (process.env.PREVIEW_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const jamhuriPath = '/events/jamhuri-day/';
const nyePath = '/events/nye-at-jotham-gardens/';

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
    assert.equal(await page.locator('time').getAttribute('datetime'), '2026-12-12');
    assert.deepEqual(await page.locator('dt').allTextContents(), ['Early Bird', 'Late Ticket', 'At the Gate']);
    assert.deepEqual(await page.locator('dd').allTextContents(), Array(3).fill('Price to come'));
    assert.match(await page.locator('main').innerText(), /Event photo coming soon\s+Event details coming soon\./);
    assert.match(await page.locator('main').innerText(), /Late pricing starts five days before the event\./);
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

    await page.getByRole('link', { name: 'All events' }).click();
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

    await page.getByRole('link', { name: 'All events' }).click();
    await upcoming.getByRole('link', { name: 'RSVP for NYE @ Jotham Gardens' }).click();
    assert.equal(page.url(), base + nyePath);
    await form.waitFor();
    assert.equal(await page.locator('time').getAttribute('datetime'), '2026-12-31');
    const prices = page.getByRole('table', { name: 'Per person (KES)' });
    assert.deepEqual(await prices.getByRole('columnheader').allTextContents(), ['Guest', 'Early Bird', 'At the Gate']);
    assert.deepEqual(
      await prices.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))),
      [
        ['Kids under 10', '800', '1,300'],
        ['Young adults', '1,500', '2,000'],
        ['Adults', '3,000', '3,500']
      ]
    );
    assert.ok(await page.getByText('Kids’ tickets include all-day bouncing castle access.').isVisible());
    assert.ok(await page.getByText('You can enter without a package. The buffet and activities require a paid package.').isVisible());
    assert.doesNotMatch(await page.locator('main').innerText(), /Late Ticket|Late pricing/);
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
      assert.deepEqual([dimensions.naturalWidth, dimensions.naturalHeight], [1522, 2280]);
      assert.ok(Math.abs(dimensions.width / dimensions.height - 1522 / 2280) < 0.001, 'full flyer stays in proportion');
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
    await page.getByRole('link', { name: 'All events' }).click();
    await past.waitFor();
    assert.deepEqual(await names(past), ['NYE @ Jotham Gardens', 'Jamhuri Day']);
    assert.equal(await upcoming.count(), 0);
    assert.equal(await past.locator('a[href]').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: Events navigation, NYE flyer and prices, mobile layout, Jamhuri placeholders, RSVP delivery and Nairobi date rollover.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
