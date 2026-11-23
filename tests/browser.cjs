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
  const submissions=[];
  const customerEmails=[];
  await page.route('https://formsubmit.co/**',async route=>{
    assert.equal(route.request().url(),'https://formsubmit.co/ajax/jothamgardens.online@gmail.com');
    const submission=route.request().postDataJSON();
    submissions.push(submission);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true})});
  });
  await page.route('https://api.emailjs.com/**',async route=>{
    customerEmails.push(route.request().postDataJSON());
    await route.fulfill({status:200,contentType:'text/plain',body:'OK'});
  });
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)badResponses.push(`${response.url()}: ${response.status()}`);});
  page.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('blob:')&&!request.url().startsWith('https://formsubmit.co/')&&!request.url().startsWith('https://api.emailjs.com/'))external.push(request.url());});

  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/');
  const homeText=await page.locator('main').innerText();
  assert.doesNotMatch(homeText,/A little closer to what matters|However you find us|make it your moment|Wake up somewhere softer|Made for you/);
  assert.equal((homeText.match(/Some places invite you/g)||[]).length,1);
  assert.match(homeText,/Welcome to\s+Jotham Gardens/i);
  assert.match(homeText,/best moments happen when we slow down to appreciate not only our surroundings, but also the people around us/i);
  assert.doesNotMatch(homeText,/Jotham Ngaina|30 years as a teacher|mother of three/i);
  assert.match(homeText,/Rooted in nature\./);
  assert.equal(await page.locator('footer').getByText("Let’s plan something beautiful",{exact:false}).count(),0);
  assert.equal(await page.locator('main').getByRole('link',{name:/^Meet the Host/}).count(),1);
  const [heroBox,heroContentBox,heroBottomBox]=await Promise.all([
    page.locator('.hero').boundingBox(),
    page.locator('.hero-content').boundingBox(),
    page.locator('.hero-bottom').boundingBox()
  ]);
  assert.equal(heroContentBox.y>=heroBox.y&&heroContentBox.y+heroContentBox.height<=heroBox.y+heroBox.height,true,'mobile hero content stays within image');
  assert.equal(heroBottomBox.y+heroBottomBox.height<=heroBox.y+heroBox.height,true,'mobile explore link stays within image');

  for(const width of [1440,1030,390,320]){
    await page.setViewportSize({width,height:844});
    const journey=await page.evaluate(async()=>{
      const day=document.querySelector('.home-day .home-photo');
      const night=document.querySelector('.home-night .home-photo');
      const images=[day.querySelector('img'),night.querySelector('img')];
      await Promise.all(images.map(image=>image.decode()));
      const hero=document.querySelector('.hero');
      const welcome=document.querySelector('.welcome');
      const footer=document.querySelector('footer');
      const dayBounds=day.getBoundingClientRect();
      const nightBounds=night.getBoundingClientRect();
      const fade=getComputedStyle(night).maskImage;
      return {
        filenames:images.map(image=>new URL(image.src).pathname.split('/').pop()),
        dayCoversWelcome:dayBounds.top===hero.getBoundingClientRect().top && dayBounds.bottom===welcome.getBoundingClientRect().bottom,
        heroBackground:getComputedStyle(hero).backgroundColor,
        fadeMeetsNight:nightBounds.top<dayBounds.bottom && fade.startsWith('linear-gradient('),
        nightMeetsFooter:nightBounds.bottom===footer.getBoundingClientRect().top
      };
    });
    assert.deepEqual(journey.filenames,['Opening_pic.jpg','Garden_evening_journey.jpg']);
    assert.equal(journey.dayCoversWelcome,true,`continuous photo at ${width}px`);
    assert.equal(journey.heroBackground,'rgba(0, 0, 0, 0)',`transparent hero at ${width}px`);
    assert.equal(journey.fadeMeetsNight,true,`completed fade at ${width}px`);
    assert.equal(journey.nightMeetsFooter,true,`night photo reaches footer at ${width}px`);
  }
  await page.getByRole('link',{name:/^explore the gardens$/i}).click();
  await page.waitForURL('**/#discover');
  for(const path of ['reserve','menu','accommodation','facilities','team','gallery']){
    assert.equal(await page.locator(`main .experience-link[href$="/${path}/"], main .discovery-link[href$="/${path}/"]`).count(),1);
  }
  console.log('PASS: continuous daylight, night fade, and welcome link at desktop and mobile widths.');

  const routes=['/','/reserve/','/facilities/','/menu/','/accommodation/','/team/','/gallery/'];
  const contactEmail='jothamgardens.online@gmail.com';
  const mapUrl='https://maps.app.goo.gl/zVXSmxbScTZKDVaY7';
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const route of routes){
      const response=await page.goto(base+route);
      assert.equal(response.status(),200,route);
      await page.locator('h1').waitFor();
      assert.equal(await page.locator('h1').count(),1,`${route} one h1`);
      assert.equal(await page.locator('footer').locator(`a[href="mailto:${contactEmail}"]`).count(),1);
      assert.equal(await page.locator('footer').locator(`a[href="${mapUrl}"]`).count(),1);
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

  await page.goto(base+'/team/');
  const hostText=await page.locator('main').innerText();
  assert.match(hostText,/Jane/);
  assert.match(hostText,/mother of three/i);
  assert.match(hostText,/retired teacher/i);
  assert.match(hostText,/Jotham Ngaina/);
  assert.doesNotMatch(hostText,/Alex Morgan|Jamie Ellis|Sam Rivers/);
  const hostPhoto=page.locator('.host-portrait');
  assert.equal(await hostPhoto.count(),1);
  assert.match(await hostPhoto.getAttribute('src'),/\/assets\/Jane_host\.png$/);
  assert.equal(await hostPhoto.evaluate(image=>image.naturalWidth===1600&&image.naturalHeight===1600),true);
  console.log('PASS: Jane is the sole host with the owner-provided story and portrait.');

  await page.goto(base+'/');
  const options=page.getByRole('button',{name:'Options',exact:true});
  await options.click();
  assert.equal(await options.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');
  assert.equal(await options.getAttribute('aria-expanded'),'false');
  await options.click();
  await page.getByRole('navigation').getByRole('link',{name:'Menu',exact:true}).click();
  await page.waitForURL('**/menu/');
  console.log('PASS: focused homepage copy, mobile hero flow, Options navigation and keyboard dismissal.');

  assert.equal(await page.locator('.menu-card').count(),40);
  assert.equal(await page.locator('.menu-card:visible').count(),40);
  assert.equal(await page.locator('[data-menu-photo]:visible').getAttribute('data-menu-photo'),'All');
  const categoryCounts={Meats:11,Sides:4,Breakfast:5,Snacks:5,'Hot Drinks':6,'Cold Drinks':3,'Alcoholic Drinks':4,'Groups & Events':2};
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
  assert.equal(await page.locator('.menu-card-info').count(),3);
  assert.equal(await page.locator('.menu-card-info .quantity').count(),0);
  assert.match(await page.locator('.menu-card').filter({hasText:'Freshly Made Coffee'}).innerText(),/KSh 200/);
  assert.match(await page.locator('.menu-card').filter({hasText:'Chai with Milk'}).innerText(),/KSh 150/);
  assert.match(await page.locator('.menu-card').filter({hasText:'Cocktails'}).innerText(),/KSh 650/);
  assert.match(await page.locator('.menu-card').filter({hasText:'Beer'}).innerText(),/KSh 300/);
  const sideNames=await page.locator('.menu-card[data-category="Sides"] h2').allTextContents();
  assert.equal(sideNames.at(-1),'Any Side Plate (Large)');
  const currentPhone=await page.evaluate(()=>JSON.parse(document.querySelector('#site-content').textContent).contact.phoneDisplay);
  assert.ok((await page.locator('.menu-card').filter({hasText:'Custom Group & Event Offers'}).innerText()).includes(currentPhone));
  await page.getByRole('button',{name:'Add one Beef · 1 kg',exact:true}).click({clickCount:2});
  await page.getByRole('button',{name:'Add one Fries · plate',exact:true}).click();
  assert.equal(await page.locator('#cart-total').textContent(),'KSh 3,050');
  assert.equal(await page.locator('#cart-count').textContent(),'3');
  await page.getByRole('button',{name:'Sides',exact:true}).click();
  assert.equal(await page.locator('#cart-total').textContent(),'KSh 3,050');
  await page.reload();
  assert.equal(await page.locator('#cart-total').textContent(),'KSh 3,050');
  await page.getByLabel('Name',{exact:true}).fill('Test Guest');
  await page.getByLabel('Phone number').fill('+254 700 000 000');
  await page.getByRole('button',{name:'Place order'}).click();
  assert.match(await page.locator('#draft-text').textContent(),/Subtotal: KSh 3,050/);
  assert.match(await page.locator('#draft-text').textContent(),/Phone: \+254 700 000 000/);
  assert.equal(submissions.at(-1)._subject,'New Jotham Gardens Food order');
  assert.equal(submissions.at(-1).Phone,'+254 700 000 000');
  assert.equal(submissions.at(-1).Email,'Not provided');
  assert.equal('_cc' in submissions.at(-1),false);
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download invoice'}).click();
  const download=await downloadPromise;
  const downloadPath=path.join(out,'order-details.txt');
  await download.saveAs(downloadPath);
  assert.match(await fs.readFile(downloadPath,'utf8'),/ORDER INVOICE/);
  await page.getByRole('button',{name:'Empty basket'}).click();
  assert.equal(await page.locator('#cart-total').textContent(),'KSh 0');
  assert.equal(await page.locator('#order-button').isDisabled(),true);
  console.log('PASS: all menu categories, contextual backgrounds, KSh basket, persistence and review download.');

  await page.goto(base+'/reserve/');
  await page.getByLabel('Your name').fill('Test Guest');
  await page.getByLabel('Phone number').fill('+254 711 111 111');
  await page.getByLabel('Email address').fill('guest@example.com');
  await page.getByLabel('Email me an invoice or copy').check();
  await page.getByLabel('Preferred date').fill('2030-06-10');
  await page.getByLabel('Guests',{exact:true}).fill('45');
  await page.getByRole('button',{name:'Send inquiry'}).click();
  assert.match(await page.locator('#draft-text').textContent(),/Guests: 45/);
  assert.equal(submissions.at(-1)._subject,'New Jotham Gardens Event inquiry');
  assert.equal('_cc' in submissions.at(-1),false);
  assert.equal('_autoresponse' in submissions.at(-1),false);
  assert.equal(customerEmails.at(-1).service_id,'service_phhdqe9');
  assert.equal(customerEmails.at(-1).template_id,'template_hdinv6x');
  assert.equal(customerEmails.at(-1).user_id,'A3-jSSaFomV5yB1e0');
  assert.equal(customerEmails.at(-1).template_params.customer_email,'guest@example.com');
  assert.equal(customerEmails.at(-1).template_params.customer_name,'Test Guest');
  assert.equal(customerEmails.at(-1).template_params.request_type,'Event inquiry');
  assert.match(customerEmails.at(-1).template_params.receipt,/EVENT INQUIRY/);
  assert.match(await page.locator('#draft-message').textContent(),/separate copy was emailed/i);
  await page.getByLabel('Guests',{exact:true}).fill('1001');
  await page.getByRole('button',{name:'Send inquiry'}).click();
  assert.equal(await page.locator('#draft-result').isVisible(),false);
  console.log('PASS: reservation inquiry and capacity constraint.');

  await page.goto(base+'/accommodation/');
  await page.getByRole('combobox',{name:/Guests/}).selectOption('2');
  await page.getByLabel('Arrival',{exact:true}).fill('2030-06-10');
  await page.getByLabel('Departure',{exact:true}).fill('2030-06-12');
  assert.match(await page.locator('#stay-summary').textContent(),/KES\s*5,600/);
  await page.getByLabel('Your name').fill('Test Guest');
  await page.getByLabel('Phone number').fill('+254 722 222 222');
  await page.getByRole('button',{name:'Send booking request'}).click();
  assert.match(await page.locator('#draft-text').textContent(),/Estimated total: KES\s*5,600/);
  assert.match(await page.locator('#draft-text').textContent(),/Breakfast: Included/);
  assert.equal(submissions.at(-1)._subject,'New Jotham Gardens Accommodation booking');
  assert.equal(submissions.at(-1).Phone,'+254 722 222 222');
  assert.equal('_cc' in submissions.at(-1),false);
  await page.getByLabel('Departure',{exact:true}).fill('2030-06-09');
  await page.getByRole('button',{name:'Send booking request'}).click();
  assert.equal(await page.locator('#draft-result').isVisible(),false);
  assert.match(await page.locator('#stay-summary').textContent(),/departure after arrival/);
  await page.getByLabel('Departure',{exact:true}).fill('2030-06-12');
  await page.getByRole('combobox',{name:/Guests/}).selectOption('1');
  await page.getByRole('button',{name:'Plan this stay'}).nth(1).click();
  assert.match(await page.locator('#stay-summary').textContent(),/KES\s*7,000/);
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
