import {mkdir, cp, writeFile, rm, stat} from 'node:fs/promises';
import {renderPage, pageKeys} from '../src/templates.js';
import {content} from '../src/content.js';
import {normalizeBasePath, applyBasePath} from './hosting.mjs';
const basePath = normalizeBasePath(process.env.BASE_PATH);
for (const group of [content.menu, content.rooms]) {
  const ids = group.map(x => x.id);
  if (new Set(ids).size !== ids.length || ids.some(id => !/^[a-z0-9-]+$/.test(id))) throw new Error('Invalid or duplicate content IDs');
}
const rates = [...content.menu.map(x => x.price), ...content.rooms.flatMap(x => [x.single, x.double]), ...Object.values(content.meals)];
if (rates.some(rate => !Number.isFinite(rate) || rate < 0)) throw new Error('Invalid sample price');
const assets = new Set(['garden', 'flowers', 'venue', 'food', 'room', ...[...content.facilities, ...content.menu, ...content.rooms, ...content.gallery].map(x => x.image)]);
for(const asset of assets) if((await stat(`src/assets/${asset}.jpg`)).size<1000) throw new Error('Missing asset '+asset);
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of ['app.js','domain.js','styles.css']) await cp(`src/${file}`,`dist/${file}`);
await cp('src/assets','dist/assets',{recursive:true});
for(const key of pageKeys){const dir=key==='home'?'dist':`dist/${key}`;await mkdir(dir,{recursive:true});await writeFile(`${dir}/index.html`,applyBasePath(renderPage(key), basePath));}
await writeFile('dist/.nojekyll', '');
await writeFile('dist/robots.txt','User-agent: *\nDisallow: /\n');
console.log(`Built ${pageKeys.length} pages with local assets in dist/ for ${basePath}. No deployment performed.`);
