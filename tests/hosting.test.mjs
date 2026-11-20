import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normalizeBasePath} from '../scripts/hosting.mjs';
import {pageKeys} from '../src/templates.js';
import {content} from '../src/content.js';

test('base path accepts repository names and rejects external or traversing paths', () => {
  assert.equal(normalizeBasePath(), '/');
  assert.equal(normalizeBasePath('Garden_Business_Website'), '/Garden_Business_Website/');
  assert.equal(normalizeBasePath('/Garden_Business_Website/'), '/Garden_Business_Website/');
  for (const value of ['//evil.test/', '/../', '/foo/bar/', '/x?y/', '/x"/']) assert.throws(() => normalizeBasePath(value));
});

test('real build resolves every page link and asset for project hosting and local previews', async () => {
  const appSource = await readFile('src/app.js');
  const appFile = `app-${createHash('sha256').update(appSource).digest('hex').slice(0,12)}.js`;
  for (const base of ['/Garden_Business_Website/', '/']) {
    execFileSync(process.execPath, ['scripts/build.mjs'], {env: {...process.env, BASE_PATH: base}});
    assert.deepEqual(await readFile(`dist/${appFile}`), appSource);
    for (const key of pageKeys) {
      const html = await readFile(`dist/${key === 'home' ? '' : key + '/'}index.html`, 'utf8');
      assert.ok(html.includes(`src="${base}${appFile}"`));
      for (const [, value] of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
        if (value.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(value)) continue;
        assert.ok(value.startsWith(base), `${key}: ${value} escaped ${base}`);
        const relative = value.slice(base.length);
        const path = `dist/${relative}${relative === '' || relative.endsWith('/') ? 'index.html' : ''}`;
        assert.ok((await stat(path)).isFile(), path);
      }
      assert.doesNotMatch(html, /WEBSITE PREVIEW|PRIVATE CONCEPT|interactive prototype/i);
      assert.doesNotMatch(html, /PRIVATE CONCEPT/);
      assert.doesNotMatch(html, /↗|→|↓|GARDENS · GATHERINGS · GETAWAYS|MAKE YOURSELF AT HOME|A beautiful beginning|GATHER BEAUTIFULLY|YOUR OCCASION, NATURALLY|ROOM FOR MEANINGFUL MOMENTS|SPACES TO ENJOY|A little room|A THOUGHTFUL VISIT|YOUR OWN PACE/i);
      assert.match(html, /© 2026 Jotham Garden and Restaurant/);
      const contactCount = key === 'facilities' ? 2 : 1;
      assert.equal(html.split(`href="tel:${content.contact.phoneHref}"`).length - 1, contactCount);
      assert.equal(html.split(`href="mailto:${content.contact.email}"`).length - 1, contactCount);
      assert.equal(html.split(`href="${content.contact.mapUrl}"`).length - 1, contactCount);
      assert.doesNotMatch(html, /bauzbenjamin@gmail\.com/);
      assert.doesNotMatch(html, /0724767617/);
      if (key === 'home') {
        assert.match(html, /Slow moments/);
        assert.match(html, /Fresh flavours/);
        assert.equal((html.match(/class="home-divider wrap"/g) || []).length, 1);
        assert.doesNotMatch(html, /A place to slow down, connect and enjoy the gardens/i);
        assert.doesNotMatch(html, /card-number|Meet Jane, your host/);
      } else {
        assert.doesNotMatch(html, /class="home-divider wrap"/);
      }
      if (key === 'reserve') {
        assert.match(html, /The perfect place/);
        assert.match(html, /Up to 1,000/);
        assert.match(html, /Let’s plan your event/);
      }
      if (['reserve','menu','accommodation'].includes(key)) {
        assert.match(html, /name="phone"[^>]*required/);
        assert.match(html, /name="email"[^>]*type="email"/);
        assert.doesNotMatch(html, /name="email"[^>]*required/);
        assert.match(html, /name="emailCopy"/);
      }
      if (key === 'menu') {
        for (const item of ['Freshly Made Coffee','Chai with Milk (Mixed Tea)','Fresh Seasonal Juice','Cocktails','Beer','Any Side Plate (Large)','Wines','Whisky, Gin &amp; Vodka']) assert.ok(html.includes(item), item);
        for (const price of ['KSh 200','KSh 150','KSh 300','KSh 650','KSh 350','Glass KSh 350 · Bottle KSh 2,000','Single KSh 250 · Double KSh 400','Any bottle is KSh 4,500']) assert.ok(html.includes(price), price);
        assert.equal((html.match(/<p>Ask what’s available\.<\/p>/g) || []).length, 1);
        assert.doesNotMatch(html, /Wine Shots|Whisky Shots|Gin Shots|Vodka Shots/);
        assert.ok(html.includes(`call ${content.contact.phoneDisplay}`));
        assert.match(html, /coffee, tea and milk for breakfast are sourced from local farmers/i);
      }
      if (key === 'facilities') {
        assert.equal((html.match(/class="facility-card /g) || []).length, 9);
        assert.equal((html.match(/class="parking-gallery"/g) || []).length, 1);
        assert.equal((html.match(/assets\/parking-(?:wall|garden|event)\.jpg/g) || []).length, 3);
        assert.equal((html.match(/class="facility-image"/g) || []).length, 3);
        assert.equal((html.match(/<article class="facility-card "><div class="facility-copy">/g) || []).length, 5);
        const facilityNames = [...html.matchAll(/<article class="facility-card [^"]*">[\s\S]*?<h2>([^<]+)<\/h2>/g)].map(match => match[1]);
        assert.deepEqual(facilityNames.slice(0, 3), ['Garden Lawn','First-Floor Conference Room','Garden Corners']);
        assert.equal(facilityNames.at(-1), 'Parking and Security');
      }
      if (key === 'accommodation') {
        assert.match(html, /Breakfast included/);
        for (const price of ['1,500','2,800','3,500','5,000']) assert.match(html, new RegExp(`KES\\s*${price}`));
        assert.doesNotMatch(html, /extra charge|name="breakfast"/i);
        assert.equal((html.match(/Luxury_bed_and_house\.jpg/g) || []).length, 1);
        assert.doesNotMatch(html, /Full_Board\.jpg/);
      }
      if (key === 'team') assert.match(html, /Twajikaza Kisabuni/);
    }
    const css = await readFile('dist/styles.css', 'utf8');
    assert.match(css, /--accent-pink:#d81b60/);
    assert.match(css, /\.site-header \.brand \{[^}]*font-size:29px/s);
    assert.match(css, /\.footer-main \.brand svg \{\s*stroke:var\(--accent-pink\)/s);
  }
});
