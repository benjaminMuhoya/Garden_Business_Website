const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');

const out=process.env.QA_OUTPUT_DIR || 'work/qa';
const base=(process.env.PREVIEW_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');

(async()=>{
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH}: {})});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  const badResponses=[];
  const external=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)badResponses.push(`${response.url()}: ${response.status()}`);});
  page.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('blob:'))external.push(request.url());});

  const routes=['/','/reserve/','/facilities/','/menu/','/accommodation/','/team/','/gallery/'];
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const route of routes){
      const response=await page.goto(base+route);
      assert.equal(response.status(),200,route);
      await page.locator('h1').waitFor();
      assert.equal(await page.locator('h1').count(),1,`${route} one h1`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route} overflow ${width}`);
      const badImages=await page.locator('img[src]').evaluateAll(images=>images.filter(image=>image.complete&&!image.naturalWidth).map(image=>image.src));
      assert.deepEqual(badImages,[],`${route} images`);
      if(width===1440 || width===390){
        await page.locator('footer').scrollIntoViewIfNeeded();
        await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('img[src]')].filter(image=>image.getClientRects().length).map(image=>image.decode().catch(()=>{})));window.scrollTo(0,0);});
        await page.screenshot({path:`${out}/${route==='/'?'home':route.replaceAll('/','')}-${width}.png`,fullPage:route!=='/menu/'});
      }
    }
  }
  console.log('PASS: all 7 pages at 1440, 768, 390 and 320px; no overflow or broken loaded images.');

  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/');
  const homeText=await page.locator('main').innerText();
  assert.doesNotMatch(homeText,/A little closer to what matters|However you find us|make it your moment|Wake up somewhere softer|Made for you/);
  assert.equal((homeText.match(/Some places invite you/g)||[]).length,1);
  assert.match(homeText,/Welcome to\s+Jotham Gardens/i);
  assert.match(homeText,/Rooted in nature\./);
  assert.equal(await page.locator('footer').getByText("Let’s plan something beautiful",{exact:false}).count(),0);
  const options=page.getByRole('button',{name:'Options',exact:true});
  await options.click();
  assert.equal(await options.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');
  assert.equal(await options.getAttribute('aria-expanded'),'false');
  await options.click();
  await page.getByRole('navigation').getByRole('link',{name:'Menu',exact:true}).click();
  await page.waitForURL('**/menu/');
  console.log('PASS: requested homepage copy, footer removal, Options navigation and keyboard dismissal.');

  assert.equal(await page.locator('.menu-card').count(),31);
  assert.equal(await page.locator('.menu-card:visible').count(),31);
  assert.equal(await page.locator('[data-menu-photo]:visible').getAttribute('data-menu-photo'),'All');
  const categoryCounts={Meats:11,Sides:4,Breakfast:2,Snacks:5,'Hot Drinks':6,'Cold Drinks':2,'Groups & Events':1};
  for(const [category,count] of Object.entries(categoryCounts)){
    await page.getByRole('button',{name:category,exact:true}).click();
    assert.equal(await page.locator('.menu-card:visible').count(),count,category);
    assert.equal(await page.locator('.menu-stage').getAttribute('data-menu-view'),category);
    assert.equal(await page.locator('#menu-view-title').textContent(),category);
    const photoCount=await page.locator('[data-menu-photo]:visible').count();
    if(category==='Meats' || category==='Sides'){
      assert.equal(photoCount,1,`${category} photo`);
      assert.equal(await page.locator('[data-menu-photo]:visible').getAttribute('data-menu-photo'),category);
    }else{
      assert.equal(photoCount,0,`${category} neutral background`);
    }
  }
  await page.getByRole('button',{name:'All',exact:true}).click();
  await page.getByRole('button',{name:'Add one Beef · 1 kg',exact:true}).click({clickCount:2});
  await page.getByRole('button',{name:'Add one Fries · plate',exact:true}).click();
  assert.equal(await page.locator('#cart-total').textContent(),'KSh 3,050');
  assert.equal(await page.locator('#cart-count').textContent(),'3');
  await page.getByRole('button',{name:'Sides',exact:true}).click();
  assert.equal(await page.locator('#cart-total').textContent(),'KSh 3,050');
  await page.reload();
  assert.equal(await page.locator('#cart-total').textContent(),'KSh 3,050');
  await page.getByLabel('Name',{exact:true}).fill('Test Guest');
  await page.getByRole('button',{name:'Review selections'}).click();
  assert.match(await page.locator('#draft-text').textContent(),/Subtotal: KSh 3,050/);
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download details'}).click();
  const download=await downloadPromise;
  const downloadPath=path.join(out,'order-details.txt');
  await download.saveAs(downloadPath);
  assert.match(await fs.readFile(downloadPath,'utf8'),/LOCAL PROTOTYPE ONLY/);
  await page.getByRole('button',{name:'Empty basket'}).click();
  assert.equal(await page.locator('#cart-total').textContent(),'KSh 0');
  assert.equal(await page.locator('#order-button').isDisabled(),true);
  console.log('PASS: all menu categories, contextual backgrounds, KSh basket, persistence and review download.');

  await page.goto(base+'/reserve/');
  await page.getByLabel('Your name').fill('Test Guest');
  await page.getByLabel('Email address').fill('guest@example.com');
  await page.getByLabel('Preferred date').fill('2030-06-10');
  await page.getByLabel('Guests',{exact:true}).fill('45');
  await page.getByRole('button',{name:'Review inquiry'}).click();
  assert.match(await page.locator('#draft-text').textContent(),/Guests: 45/);
  await page.getByLabel('Guests',{exact:true}).fill('121');
  await page.getByRole('button',{name:'Review inquiry'}).click();
  assert.equal(await page.locator('#draft-result').isVisible(),false);
  console.log('PASS: reservation inquiry and capacity constraint.');

  await page.goto(base+'/accommodation/');
  await page.getByRole('combobox',{name:/Guests/}).selectOption('2');
  await page.getByLabel('Arrival',{exact:true}).fill('2030-06-10');
  await page.getByLabel('Departure',{exact:true}).fill('2030-06-12');
  assert.match(await page.locator('#stay-summary').textContent(),/KES\s*6,000/);
  await page.getByLabel('Your name').fill('Test Guest');
  await page.getByLabel('Email address').fill('guest@example.com');
  await page.getByRole('button',{name:'Review stay details'}).click();
  assert.match(await page.locator('#draft-text').textContent(),/Sample total: KES\s*6,000/);
  await page.getByLabel('Departure',{exact:true}).fill('2030-06-09');
  await page.getByRole('button',{name:'Review stay details'}).click();
  assert.equal(await page.locator('#draft-result').isVisible(),false);
  assert.match(await page.locator('#stay-summary').textContent(),/departure after arrival/);
  await page.getByLabel('Departure',{exact:true}).fill('2030-06-12');
  await page.getByRole('combobox',{name:/Guests/}).selectOption('1');
  await page.getByRole('button',{name:'Plan this stay'}).nth(1).click();
  assert.match(await page.locator('#stay-summary').textContent(),/KES\s*9,000/);
  console.log('PASS: current KSh accommodation pricing, invalid dates and room selection.');

  await page.goto(base+'/gallery/');
  await page.getByRole('button',{name:'Rooms',exact:true}).click();
  assert.equal(await page.locator('.gallery-item:visible').count(),1);
  await page.getByRole('button',{name:'View Stay a little longer'}).click();
  assert.equal(await page.locator('#lightbox').isVisible(),true);
  await page.locator('#lightbox-image').evaluate(image=>image.decode());
  assert.equal(await page.locator('#lightbox-image').evaluate(image=>image.naturalWidth>0),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#lightbox').isVisible(),false);
  assert.deepEqual(errors,[]);
  assert.deepEqual(badResponses,[]);
  assert.deepEqual(external,[]);
  console.log('PASS: gallery modal; no console errors, HTTP errors or external requests.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
