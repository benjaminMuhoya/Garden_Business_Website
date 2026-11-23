const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

const base = (process.env.PREVIEW_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const chrome = process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {};
const originals = '.gallery-sequence:not([aria-hidden]) .gallery-item';
const positions = page => page.locator('.gallery-viewport').evaluateAll(viewports =>
  viewports.map(viewport => viewport.scrollLeft));

(async () => {
  const browser = await chromium.launch({headless: true, ...chrome});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 950}});
    assert.equal((await page.goto(base + '/gallery/')).status(), 200);
    assert.equal(await page.locator('.gallery-belt').count(), 2);
    assert.equal(await page.locator(originals).count(), 19);
    assert.deepEqual(await page.locator('.gallery-belt').evaluateAll(belts =>
      belts.map(belt => belt.querySelectorAll('.gallery-sequence:not([aria-hidden]) .gallery-item').length)), [9, 10]);
    assert.equal(await page.locator('.gallery-sequence[aria-hidden] button:not([tabindex="-1"])').count(), 0);

    const start = await positions(page);
    await page.waitForFunction(([upper, lower]) => {
      const [first, second] = document.querySelectorAll('.gallery-viewport');
      const lowerCycle = second.querySelector('.gallery-sequence').getBoundingClientRect().width;
      const lowerTravel = (lower - second.scrollLeft + lowerCycle) % lowerCycle;
      return first.scrollLeft > upper + 2 && lowerTravel > 2 && lowerTravel < 100;
    }, start);

    await page.getByRole('button', {name: 'Pause motion'}).click();
    const pause = await positions(page);
    await page.waitForTimeout(180);
    assert.deepEqual(await positions(page), pause);
    const firstBelt = page.locator('.gallery-belt').first();
    await firstBelt.getByRole('button', {name: 'Next'}).click();
    const next = await positions(page);
    assert.ok(next[0] > pause[0] + 200);
    assert.equal(next[1], pause[1]);
    await firstBelt.getByRole('button', {name: 'Previous'}).click();
    assert.ok(Math.abs((await positions(page))[0] - pause[0]) < 2);

    await page.locator(originals + ' img').evaluateAll(images =>
      Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
    const intact = await page.locator(originals).evaluateAll(figures => figures.every(figure => {
      const image = figure.querySelector('img');
      const button = image.parentElement;
      return Math.abs(image.offsetWidth / image.offsetHeight - image.naturalWidth / image.naturalHeight) < .025 &&
        getComputedStyle(button).backgroundColor === 'rgba(0, 0, 0, 0)' &&
        button.offsetHeight === image.offsetHeight;
    }));
    assert.equal(intact, true);

    for (const [category, count] of [['Gardens', 7], ['Rooms', 2], ['Celebrations', 3], ['Dining', 7]]) {
      await page.getByRole('button', {name: category, exact: true}).click();
      assert.equal(await page.locator(originals + ':visible').count(), count);
      assert.equal(await page.locator('.gallery-belt:visible').count(), 1);
    }
    await page.getByRole('button', {name: 'Rooms', exact: true}).click();
    await page.getByRole('button', {name: 'View Inside a garden cabin', exact: true}).press('Enter');
    assert.equal(await page.locator('#lightbox').isVisible(), true);
    await page.locator('#lightbox-image').evaluate(image => image.decode());
    assert.match(await page.locator('#lightbox-image').evaluate(image => image.currentSrc), /cabin-room\.jpg$/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#lightbox').isVisible(), false);
    assert.equal(await page.getByRole('button', {name: 'View Inside a garden cabin', exact: true}).evaluate(button => button === document.activeElement), true);

    for (const width of [390, 320]) {
      const mobile = await browser.newPage({viewport: {width, height: 844}, hasTouch: true, isMobile: true, reducedMotion: 'reduce'});
      await mobile.goto(base + '/gallery/');
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await mobile.getByRole('button', {name: 'Pause motion'}).count(), 0);
      const still = await positions(mobile);
      await mobile.waitForTimeout(180);
      assert.deepEqual(await positions(mobile), still);
      const mobileBelt = mobile.locator('.gallery-belt').first();
      await mobileBelt.getByRole('button', {name: 'Next', exact: true}).tap();
      const travel = await mobileBelt.locator('.gallery-viewport').evaluate((viewport, initial) => {
        const cycle = viewport.querySelector('.gallery-sequence').getBoundingClientRect().width;
        return (viewport.scrollLeft - initial + cycle) % cycle;
      }, still[0]);
      assert.ok(travel > 150 && travel < 400);
      await mobile.getByRole('button', {name: 'Rooms', exact: true}).tap();
      await mobile.getByRole('button', {name: 'View Inside a garden cabin', exact: true}).tap();
      assert.equal(await mobile.locator('#lightbox').isVisible(), true);
      await mobile.getByRole('button', {name: 'Close image'}).tap();
      assert.equal(await mobile.locator('#lightbox').isVisible(), false);
      await mobile.close();
    }
    console.log('PASS: two moving belts, 19 full-proportion photos, navigation, categories, keyboard and touch lightbox, and reduced motion.');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exit(1);});
