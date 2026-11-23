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

    assert.equal((await page.locator('main').innerText()).trim(), (await page.locator('.page-intro').innerText()).trim());
    assert.equal(await page.locator('.gallery-belts button:not(.gallery-open)').count(), 0);
    assert.equal(await page.locator('.gallery-belts figcaption').count(), 0);
    assert.match(await page.locator('footer').innerText(), /Get in touch/);

    const firstViewport = page.locator('.gallery-viewport').first();
    await firstViewport.hover();
    const hovered = await positions(page);
    await page.waitForTimeout(200);
    assert.equal((await positions(page))[0], hovered[0]);
    assert.notEqual((await positions(page))[1], hovered[1]);
    await page.mouse.move(2, 2);
    await page.waitForFunction(initial => document.querySelector('.gallery-viewport').scrollLeft !== initial, hovered[0]);

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

    await page.getByRole('button', {name: 'View Inside a garden cabin', exact: true}).press('Enter');
    assert.equal(await page.locator('#lightbox').isVisible(), true);
    assert.equal(await page.locator('#lightbox p').count(), 0);
    await page.locator('#lightbox-image').evaluate(image => image.decode());
    assert.match(await page.locator('#lightbox-image').evaluate(image => image.currentSrc), /cabin-room\.jpg$/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#lightbox').isVisible(), false);
    assert.equal(await page.getByRole('button', {name: 'View Inside a garden cabin', exact: true}).evaluate(button => button === document.activeElement), true);

    for (const width of [390, 320]) {
      const mobile = await browser.newPage({viewport: {width, height: 844}, hasTouch: true, isMobile: true, reducedMotion: 'reduce'});
      await mobile.goto(base + '/gallery/');
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const still = await positions(mobile);
      await mobile.waitForTimeout(180);
      assert.deepEqual(await positions(mobile), still);

      if (width === 390) {
        const viewport = mobile.locator('.gallery-viewport').first();
        await mobile.emulateMedia({reducedMotion: 'no-preference'});
        await mobile.waitForFunction(initial => document.querySelector('.gallery-viewport').scrollLeft !== initial, still[0]);
        await viewport.evaluate(element => element.scrollIntoView({block: 'center', behavior: 'instant'}));
        const box = await viewport.boundingBox();
        const y = Math.round(box.y + box.height / 2);
        const session = await mobile.context().newCDPSession(mobile);
        await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: 315, y}]});
        const held = await viewport.evaluate(element => element.scrollLeft);
        await mobile.waitForTimeout(1500);
        assert.equal(await viewport.evaluate(element => element.scrollLeft), held);
        await session.send('Input.dispatchTouchEvent', {type: 'touchCancel', touchPoints: []});
        await mobile.waitForFunction(initial => document.querySelector('.gallery-viewport').scrollLeft !== initial, held);
        await mobile.emulateMedia({reducedMotion: 'reduce'});
        const beforeSwipe = await viewport.evaluate(element => element.scrollLeft);
        await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: 315, y}]});
        for (const x of [287, 252, 215, 172, 130, 88]) {
          await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x, y}]});
        }
        await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
        await mobile.waitForFunction(initial => document.querySelector('.gallery-viewport').scrollLeft > initial + 42, beforeSwipe);
        assert.equal(await mobile.locator('#lightbox').isVisible(), false);
      }
      await mobile.getByRole('button', {name: 'View Inside a garden cabin', exact: true}).tap();
      assert.equal(await mobile.locator('#lightbox').isVisible(), true);
      await mobile.getByRole('button', {name: 'Close image'}).tap();
      assert.equal(await mobile.locator('#lightbox').isVisible(), false);
      await mobile.close();
    }
    console.log('PASS: two moving belts, 19 full-proportion photos, hover and touch pause, phone swiping, keyboard and touch lightbox, and reduced motion.');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exit(1);});
