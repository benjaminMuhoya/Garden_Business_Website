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
        assert.doesNotMatch(html, /Discover the spaces, the people and the intricate details that bring our garden to life\.|>Slow moments<|A glimpse of life in the gardens/);
        assert.ok(html.includes(`<a class="experience-link" href="${base}reserve/"><span class="experience-title">Reserve Venue</span></a>`));
        assert.ok(html.includes(`<a class="discovery-link" href="${base}gallery/"><div><h3>Photo Gallery</h3><p>Slow moments at Jotham Gardens</p>`));
        assert.match(html, /Fresh flavours/);
        for (const photo of ['Opening_pic.jpg', 'Garden_evening_journey.jpg']) {
          assert.equal(html.split(`src="${base}assets/${photo}"`).length - 1, 1, photo);
        }
        assert.doesNotMatch(html, /A place to slow down, connect and enjoy the gardens/i);
        assert.doesNotMatch(html, /card-number|Meet Jane, your host/);
      }
      if (key === 'reserve') {
        assert.match(html, /The perfect place/);
        assert.match(html, /Up to 1,000/);
        assert.match(html, /Let’s plan your event/);
      }
      if (key === 'events/nye-at-jotham-gardens') {
        assert.ok(html.includes(`src="${base}assets/nye-flyer.jpg"`));
        assert.match(html, /<caption>Per person \(KES\)<\/caption>/);
        assert.match(html, /<th scope="col">Guest<\/th><th scope="col">Early Bird<\/th><th scope="col">At the Gate<\/th>/);
        assert.doesNotMatch(html, /Late Ticket|Late pricing/);
        assert.doesNotMatch(html, />All events<|10% off family and group platters/);
        assert.match(html, /Food buffet from 2 pm to 9:30 pm\. Limit of 2 mocktails per guest\./);
        assert.match(html, /competitive games for young adults with prizes to win/);
        const rows = [...html.matchAll(/<th scope="row">([^<]+)<\/th>\s*<td>([^<]+)<\/td><td>([^<]+)<\/td>\s*<\/tr>/g)];
        assert.deepEqual(rows.map(row => row.slice(1)), [
          ['Kids under 10', '800', '1,300'],
          ['Young adults', '1,500', '2,000'],
          ['Adults', '3,000', '3,500']
        ]);
      }
      if (key === 'events/jamhuri-day') {
        const main = html.split('<main id="main">')[1].split('</main>')[0];
        assert.match(main, />10% off family and group platters<\/h2>/);
        assert.doesNotMatch(main, />All events<|>Tickets<|Price to come|Event photo coming soon|Event Catering/);
        assert.deepEqual([...main.matchAll(/<del>([^<]+)<\/del>\s*<span class="sr-only">Offer price <\/span><strong>([^<]+)<\/strong>/g)].map(match => match.slice(1)), [
          ['KSh 3,200', 'KSh 2,880'],
          ['KSh 4,800', 'KSh 4,320'],
          ['KSh 25,000', 'KSh 22,500']
        ]);
      }
      if (['reserve','menu','accommodation'].includes(key)) {
        assert.match(html, /name="phone"[^>]*required/);
        assert.match(html, /name="email"[^>]*type="email"/);
        assert.doesNotMatch(html, /name="email"[^>]*required/);
        assert.match(html, /name="emailCopy"/);
      }
      if (key === 'menu') {
        assert.ok(html.includes('data-menu-filter="Breakfast, Snacks &amp; Hot Drinks"'));
        for (const group of ['Breakfast','Snacks','Hot Drinks']) {
          assert.equal(html.split('>'+group+'</h3>').length-1,1,group);
          assert.ok(!html.includes('data-menu-filter="'+group+'"'),group);
        }
        assert.equal(content.menu.filter(m=>m.category==='Breakfast, Snacks & Hot Drinks').length,16);
        assert.equal(content.menu.find(m=>m.id==='breakfastchai').group,'Hot Drinks');
        assert.equal(content.menu.find(m=>m.id==='breakfastcoffee').group,'Hot Drinks');
        assert.doesNotMatch(html, /data-menu-filter="All"|data-menu-photo="All"/);
        assert.match(html, /data-menu-filter="Meats" aria-pressed="true"/);
        assert.match(html, /data-menu-filter="Vegetarian" aria-pressed="false"/);
        assert.match(html, /data-menu-view="Meats"/);
        assert.equal(content.menu.filter(m => m.category === 'Vegetarian').length, 4);
        for (const item of ['Freshly Made Coffee','Chai with Milk (Mixed Tea)','Fresh Seasonal Juice','Moscow Mule','Gin and Tonic','Rum and Coke','Dawa Gold','Jotham’s Long Island','Whiskey Sour','Beer','Any Side Plate (Large)']) assert.ok(html.includes(item), item);
        for (const group of ['Wines','Mzinga','375 ml']) assert.equal(html.split('>'+group+'</h3>').length-1,1);
        const expected = {'family-platter-4':3200,'family-platter-6':4800,'mbuzi':25000,'matoke':400,'special-githeri':400,'rice-minji':350,'mukimo-vegetable-stew':350,'fish':750,'fries':200,'caprice':1400,'four-cousins':1500,'captain-morgan':1500,'gilbeys-full':2000,'kenya-cane':1200,'jameson':4000,'johnnie-red':2900,'johnnie-black':4000,'viceroy':1800,'black-white-375':900,'gilbeys-375':900,'cocktail-moscow-mule':650,'cocktail-gin-tonic':650,'cocktail-rum-coke':650,'cocktail-dawa-gold':650,'cocktail-jothams-long-island':650,'cocktail-whiskey-sour':650,'beer':300};
        for (const [id, price] of Object.entries(expected)) {
          const item = content.menu.find(m => m.id === id);
          assert.equal(item?.price, price, id);
          assert.notEqual(item.orderable, false, id);
          const name = item.name.replace(/[&<>"']/g, v => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
          const heading = '<h2>'+name+'</h2><strong>KSh '+price.toLocaleString('en-KE')+'</strong>';
          assert.ok(html.includes(heading), id+' rendered price');
          assert.ok(html.includes('data-count="'+id+'"'), id+' quantity control');
        }
        assert.doesNotMatch(html, /Whisky, Gin &amp; Vodka|Glass KSh 350|Single KSh 250|Any bottle is KSh 4,500|Ask what’s available/);
        assert.doesNotMatch(html, /Wine Shots|Whisky Shots|Gin Shots|Vodka Shots/);
        assert.ok(html.includes('data-menu-filter="Family, Groups &amp; Event Packages"'));
        assert.ok(!html.includes('data-menu-filter="Groups &amp; Events"'));
        for (const group of ['Family Platters','Group Packages','Event Catering']) assert.equal(html.split('>'+group+'</h3>').length-1,1,group);
        const catering = content.menu.find(m=>m.id==='customgroup');
        assert.equal(catering.orderable,false);
        assert.equal(catering.price,null);
        assert.equal(catering.href,'/reserve/');
        assert.ok(html.includes('Contact us to plan your event'));
        assert.ok(html.includes('up to 1,000 guests'));
        assert.ok(html.includes('a venue of your choice'));
        assert.match(html, /coffee, tea and milk for breakfast are sourced from local farmers/i);
      }
      if (key === 'facilities') {
        assert.equal((html.match(/class="facility-card /g) || []).length, 9);
        assert.equal((html.match(/class="parking-gallery"/g) || []).length, 1);
        assert.equal((html.match(/assets\/parking-(?:wall|garden|event)\.jpg/g) || []).length, 3);
        assert.equal((html.match(/class="facility-image"/g) || []).length, 4);
        assert.equal((html.match(/<article class="facility-card "><div class="facility-copy">/g) || []).length, 4);
        const facilityNames = [...html.matchAll(/<article class="facility-card [^"]*">[\s\S]*?<h2>([^<]+)<\/h2>/g)].map(match => match[1]);
        assert.deepEqual(facilityNames.slice(0, 3), ['Garden Lawn','First-Floor Conference Room','Garden Corners']);
        assert.equal(facilityNames.at(-1), 'Parking and Security');
        const facilityCards = html.match(/<article class="facility-card [^"]*">[\s\S]*?<\/article>/g);
        assert.ok(facilityCards[1].includes(`src="${base}assets/facility-first-floor.jpg"`));
        assert.ok(facilityCards[3].includes(`src="${base}assets/facility-ground-floor.png"`));
        assert.ok(facilityCards[3].includes('<h2>Ground-Floor Conference Room</h2>'));
        assert.ok(facilityCards[4].includes('<div class="facility-copy"><h2>Bar</h2></div>'));
        assert.doesNotMatch(html, /Drinks service for relaxed gatherings and private events/);
      }
      if (key === 'accommodation') {
        assert.equal((html.match(/Breakfast included with the price/g) || []).length, 2);
        assert.doesNotMatch(html, /A comfortable stay surrounded by the gardens|A peaceful cabin retreat in the gardens|For one or two guests|Room rate per night · Breakfast included/i);
        for (const price of ['1,500','2,800','3,500','5,000']) assert.match(html, new RegExp(`KES\\s*${price}`));
        assert.doesNotMatch(html, /extra charge|name="breakfast"/i);
        const roomCards = html.match(/<article class="room-card">[\s\S]*?<\/article>/g);
        assert.equal(roomCards.length, 2);
        const roomImageSources = roomCards.map(card => [...card.matchAll(/<img src="([^"]+)"/g)].map(match => match[1]));
        assert.deepEqual(roomImageSources, [
          [`${base}assets/rooms-at-garden.png`],
          [`${base}assets/Luxury_bed_and_house.jpg`, `${base}assets/cabin-room.jpg`]
        ]);
        assert.ok(roomCards[0].includes('<h2>Rooms at the Garden</h2>'));
        assert.ok(roomCards[1].includes('<h2>Cabins at the Garden</h2>'));
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
