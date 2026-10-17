const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const out=process.env.QA_OUTPUT_DIR || 'work/qa';
const base=process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH}: {})});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];const badResponses=[];const external=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)badResponses.push(response.url()+': '+response.status());});
 page.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('blob:'))external.push(request.url());});
 const routes=['/','/reserve/','/facilities/','/menu/','/accommodation/','/team/','/gallery/'];
 for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:1000});
   for(const route of routes){
    await page.goto(base+route);await page.locator('h1').waitFor();
    assert.equal(await page.locator('h1').count(),1,route+' one h1');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route} overflow ${width}`);
    const badImages=await page.locator('img[src]').evaluateAll(imgs=>imgs.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src));assert.deepEqual(badImages,[],`${route} images`);
    if(width===1440 || width===390) { await page.locator('footer').scrollIntoViewIfNeeded(); await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('img[src]')].map(i=>i.decode().catch(()=>{})));window.scrollTo(0,0);}); await page.waitForTimeout(250); }
    if(width===1440 || width===390)await page.screenshot({path:`${out}/${route==='/'?'home':route.replaceAll('/','')}-${width}.png`,fullPage:true});
   }
 }
 console.log('PASS: all 7 pages at 1440, 768, 390 and 320px; no horizontal overflow or broken loaded images.');
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/');
 await page.getByRole('button',{name:'Menu',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'true');
 await page.getByRole('navigation').getByRole('link',{name:'Our Menu',exact:true}).click();await page.waitForURL('**/menu/');
 await page.getByRole('button',{name:'Add one Garden harvest salad',exact:true}).click({clickCount:2});
 await page.getByRole('button',{name:'Add one Garden tea service',exact:true}).click();
 assert.equal(await page.locator('#cart-total').textContent(),'$34');assert.equal(await page.locator('#cart-count').textContent(),'3');
 await page.reload();assert.equal(await page.locator('#cart-total').textContent(),'$34');
 await page.getByRole('button',{name:'To sip',exact:true}).click();assert.equal(await page.locator('.menu-card:visible').count(),1);
 await page.getByLabel('Name for your draft').fill('Test Guest');await page.getByRole('button',{name:'Review order draft'}).click();
 assert.match(await page.locator('#draft-text').textContent(),/Sample subtotal: \$34 USD/);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download draft'}).click();const download=await downloadPromise;await download.saveAs(path.join(out,'order-draft.txt'));assert.match(await fs.readFile(path.join(out,'order-draft.txt'),'utf8'),/LOCAL PROTOTYPE ONLY/);
 await page.getByRole('button',{name:'Empty basket'}).click();assert.equal(await page.locator('#cart-total').textContent(),'$0');assert.equal(await page.locator('#order-button').isDisabled(),true);assert.equal(await page.locator('#draft-result').isVisible(),false);
 console.log('PASS: mobile navigation, cart quantity/subtotal, persistence, filters, order draft download and clear.');
 await page.goto(base+'/reserve/');
 await page.getByLabel('Your name').fill('Test Guest');await page.getByLabel('Email address').fill('guest@example.com');await page.getByLabel('Preferred date').fill('2030-06-10');await page.getByLabel('Guests',{exact:true}).fill('45');
 await page.getByRole('button',{name:'Review inquiry draft'}).click();assert.match(await page.locator('#draft-text').textContent(),/Guests: 45/);assert.match(await page.locator('#draft-text').textContent(),/2030-06-10/);
 await page.getByLabel('Guests',{exact:true}).fill('121');await page.getByRole('button',{name:'Review inquiry draft'}).click();assert.equal(await page.locator('#draft-result').isVisible(),false);
 console.log('PASS: reservation draft and capacity constraint.');
 await page.goto(base+'/accommodation/');
 await page.getByRole('combobox',{name:/Guests/}).selectOption('2');await page.getByLabel('Arrival',{exact:true}).fill('2030-06-10');await page.getByLabel('Departure',{exact:true}).fill('2030-06-12');await page.getByLabel('Bed & breakfast',{exact:false}).check();await page.getByLabel('Lunch',{exact:false}).check();await page.getByLabel('Dinner',{exact:false}).check();
 assert.match(await page.locator('#stay-summary').textContent(),/\$450/);
 await page.getByLabel('Your name').fill('Test Guest');await page.getByLabel('Email address').fill('guest@example.com');await page.getByRole('button',{name:'Review booking draft'}).click();assert.match(await page.locator('#draft-text').textContent(),/Sample total: \$450 USD/);
 await page.getByLabel('Departure',{exact:true}).fill('2030-06-09');await page.getByRole('button',{name:'Review booking draft'}).click();assert.equal(await page.locator('#draft-result').isVisible(),false);assert.match(await page.locator('#stay-summary').textContent(),/departure after arrival/);
 await page.getByLabel('Departure',{exact:true}).fill('2030-06-12');await page.getByRole('combobox',{name:/Guests/}).selectOption('1');await page.getByLabel('Bed only',{exact:false}).check();await page.getByLabel('Lunch',{exact:false}).uncheck();await page.getByLabel('Dinner',{exact:false}).uncheck();await page.getByRole('button',{name:'Plan this stay'}).nth(1).click();assert.match(await page.locator('#stay-summary').textContent(),/\$250/);
 await page.getByRole('button',{name:'Review booking draft'}).click();assert.match(await page.locator('#draft-text').textContent(),/Terrace Suite/);assert.match(await page.locator('#draft-text').textContent(),/Sample total: \$250 USD/);
 console.log('PASS: two-person meal-inclusive pricing, invalid dates, room CTA, single-person bed-only price and booking draft.');
 await page.goto(base+'/gallery/');await page.getByRole('button',{name:'Rooms',exact:true}).click();assert.equal(await page.locator('.gallery-item:visible').count(),1);await page.getByRole('button',{name:'View Stay a little longer'}).click();assert.equal(await page.locator('#lightbox').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#lightbox').isVisible(),false);
 assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);assert.deepEqual(external,[]);
 console.log('PASS: gallery filters and keyboard modal dismissal; no console errors, HTTP errors or external requests.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
