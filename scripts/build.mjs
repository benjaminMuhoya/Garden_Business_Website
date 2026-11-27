import {mkdir, cp, writeFile, rm, stat, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {renderPage, pageKeys} from '../src/templates.js';
import {content} from '../src/content.js';
import {eventTicketTiers} from '../src/events.js';
import {normalizeBasePath, applyBasePath} from './hosting.mjs';
const basePath = normalizeBasePath(process.env.BASE_PATH);
for (const group of [content.menu, content.rooms, content.events]) {
  const ids = group.map(x => x.id);
  if (new Set(ids).size !== ids.length || ids.some(id => !/^[a-z0-9-]+$/.test(id))) throw new Error('Invalid or duplicate content IDs');
}
const rates = [...content.menu.filter(x => x.orderable !== false).map(x => x.price), ...content.rooms.flatMap(x => [x.single, x.double]), ...Object.values(content.meals)];
if (rates.some(rate => !Number.isFinite(rate) || rate < 0)) throw new Error('Invalid sample price');
if (content.menu.some(item => item.orderable === false && (!item.priceLabel || item.price !== null))) throw new Error('Invalid informational menu item');
for (const {id, prices} of content.events.filter(event => !event.menuOffer)) {
  const rows = prices.groups ?? [prices];
  const tiers = eventTicketTiers(prices);
  if (!rows.length) throw new Error(`Missing ticket groups for ${id}`);
  if (!tiers.length || (prices.tiers && tiers.length !== prices.tiers.length)) throw new Error(`Invalid ticket tiers for ${id}`);
  for (const row of rows) {
    if (prices.groups && !row.label?.trim()) throw new Error(`Missing ticket group label for ${id}`);
    for (const [, tier] of tiers) {
      const price = row[tier];
      if (price === null && !prices.groups) continue;
      if (!Number.isFinite(price) || price < 0) throw new Error(`Invalid event price for ${id}: ${tier}`);
    }
  }
}
const assets = new Set([
  'garden', 'flowers', 'venue', 'food', 'room',
  ...content.facilities.flatMap(x => [x.image, ...(x.images || []).map(photo => photo.src)]).filter(Boolean),
  ...content.rooms.flatMap(room => room.images.map(photo => photo.src)),
  ...[...content.menu, ...content.team, ...content.gallery].map(x => x.image).filter(Boolean),
  ...content.events.map(event => event.image?.src).filter(Boolean)
]);
const assetFile = asset => ({'Children gallery':'Children gallery.JPG',Jane_host:'Jane_host.png','facility-ground-floor':'facility-ground-floor.png','rooms-at-garden':'rooms-at-garden.png'}[asset] || `${asset}.jpg`);
for(const asset of assets) if((await stat(`src/assets/${assetFile(asset)}`)).size<1000) throw new Error('Missing asset '+asset);
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
const appSource = await readFile('src/app.js');
const appFile = `app-${createHash('sha256').update(appSource).digest('hex').slice(0,12)}.js`;
await writeFile(`dist/${appFile}`, appSource);
for(const file of ['domain.js','events.js','styles.css']) await cp(`src/${file}`,`dist/${file}`);
await cp('src/assets','dist/assets',{recursive:true});
for(const key of pageKeys){const dir=key==='home'?'dist':`dist/${key}`;await mkdir(dir,{recursive:true});await writeFile(`${dir}/index.html`,applyBasePath(renderPage(key, appFile), basePath));}
await writeFile('dist/.nojekyll', '');
await writeFile('dist/CNAME', 'JothamGardens.com\n');
await writeFile('dist/robots.txt','User-agent: *\nDisallow: /\n');
console.log(`Built ${pageKeys.length} pages with local assets in dist/ for ${basePath}. No deployment performed.`);
