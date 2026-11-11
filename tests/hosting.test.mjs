import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile, stat} from 'node:fs/promises';
import {normalizeBasePath} from '../scripts/hosting.mjs';
import {pageKeys} from '../src/templates.js';

test('base path accepts repository names and rejects external or traversing paths', () => {
  assert.equal(normalizeBasePath(), '/');
  assert.equal(normalizeBasePath('Garden_Business_Website'), '/Garden_Business_Website/');
  assert.equal(normalizeBasePath('/Garden_Business_Website/'), '/Garden_Business_Website/');
  for (const value of ['//evil.test/', '/../', '/foo/bar/', '/x?y/', '/x"/']) assert.throws(() => normalizeBasePath(value));
});

test('real build resolves every page link and asset for project hosting and local previews', async () => {
  for (const base of ['/Garden_Business_Website/', '/']) {
    execFileSync(process.execPath, ['scripts/build.mjs'], {env: {...process.env, BASE_PATH: base}});
    for (const key of pageKeys) {
      const html = await readFile(`dist/${key === 'home' ? '' : key + '/'}index.html`, 'utf8');
      for (const [, value] of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
        if (value.startsWith('#')) continue;
        assert.ok(value.startsWith(base), `${key}: ${value} escaped ${base}`);
        const relative = value.slice(base.length);
        const path = `dist/${relative}${relative === '' || relative.endsWith('/') ? 'index.html' : ''}`;
        assert.ok((await stat(path)).isFile(), path);
      }
      assert.doesNotMatch(html, /WEBSITE PREVIEW|PRIVATE CONCEPT|interactive prototype/i);
      assert.doesNotMatch(html, /PRIVATE CONCEPT/);
      assert.doesNotMatch(html, /↗|→|↓|GARDENS · GATHERINGS · GETAWAYS|MAKE YOURSELF AT HOME|A beautiful beginning|GATHER BEAUTIFULLY|YOUR OCCASION, NATURALLY|ROOM FOR MEANINGFUL MOMENTS|Plan an inquiry|SPACES TO ENJOY|A little room|A THOUGHTFUL VISIT|YOUR OWN PACE|breakfast included/i);
      assert.match(html, /© 2026 Jotham Garden and Restaurant/);
      if (key === 'home') {
        assert.match(html, /Slow moments/);
        assert.match(html, /Fresh flavours/);
        assert.doesNotMatch(html, /card-number|Meet Jane, your host/);
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
      if (key === 'facilities') assert.equal((html.match(/class="facility-card"/g) || []).length, 9);
      if (key === 'accommodation') assert.match(html, /Breakfast is available on request for an additional charge/);
      if (key === 'team') assert.match(html, /Twajikaza Kisabuni/);
    }
    const css = await readFile('dist/styles.css', 'utf8');
    assert.match(css, /--accent-pink:#d81b60/);
    assert.match(css, /\.site-header \.brand \{[^}]*font-size:29px/s);
    assert.match(css, /\.footer-main \.brand svg \{\s*stroke:var\(--accent-pink\)/s);
  }
});
