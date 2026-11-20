const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');

const base=(process.env.PREVIEW_URL || 'http://127.0.0.1:4173').replace(/\/$/,'');
const chrome=process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {};

(async()=>{
  const browser=await chromium.launch({headless:true,...chrome});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.goto(base+'/gallery/');
    assert.equal(await page.locator('.gallery-item').count(),8);
    await page.locator('.gallery-open img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));
    const frames=await page.locator('.gallery-open').evaluateAll(buttons=>buttons.map(button=>{
      const image=button.querySelector('img');
      return {ratio:button.offsetWidth/button.offsetHeight,fit:getComputedStyle(image).objectFit,loaded:image.naturalWidth>0};
    }));
    assert.equal(frames.every(frame=>Math.abs(frame.ratio-4/3)<.01 && frame.fit==='contain' && frame.loaded),true);
    assert.equal(await page.locator('.gallery-item').first().evaluate(item=>getComputedStyle(item).animationPlayState),'running');
    await page.getByRole('button',{name:'Rooms',exact:true}).click();
    assert.equal(await page.locator('.gallery-item:visible').count(),1);
    await page.getByRole('button',{name:'View Stay a little longer'}).click({force:true});
    assert.equal(await page.locator('#lightbox').isVisible(),true);
    assert.equal(await page.locator('.gallery-item').first().evaluate(item=>getComputedStyle(item).animationPlayState),'paused');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.gallery-item')).animationPlayState==='running');

    for(const width of [390,320]) {
      const touchPage=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true});
      await touchPage.goto(base+'/gallery/');
      assert.equal(await touchPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`gallery overflow ${width}`);
      assert.equal(await touchPage.locator('.gallery-item').first().evaluate(item=>getComputedStyle(item).animationName),'gallery-drift-mobile');
      const photo=touchPage.getByRole('button',{name:'View Family moments'});
      await photo.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));
      const tapPhoto=async()=>{const box=await photo.boundingBox();await touchPage.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);};
      await tapPhoto();
      assert.equal(await touchPage.locator('#lightbox').isVisible(),false);
      assert.equal(await touchPage.locator('.gallery-item').first().evaluate(item=>getComputedStyle(item).animationPlayState),'paused');
      await tapPhoto();
      assert.equal(await touchPage.locator('#lightbox').isVisible(),true);
      await touchPage.locator('#lightbox-image').evaluate(image=>image.decode());
      assert.match(await touchPage.locator('#lightbox-image').evaluate(image=>image.currentSrc),/Children%20gallery\.JPG$/);
      await touchPage.getByRole('button',{name:'Close image'}).tap();
      await touchPage.waitForFunction(()=>getComputedStyle(document.querySelector('.gallery-item')).animationPlayState==='running');
      if(width===390) {
        await tapPhoto();
        assert.equal(await touchPage.locator('.gallery-item').first().evaluate(item=>getComputedStyle(item).animationPlayState),'paused');
        await touchPage.waitForFunction(()=>getComputedStyle(document.querySelector('.gallery-item')).animationPlayState==='running',undefined,{timeout:6000});
      }
      await touchPage.close();
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.gallery-item').first().evaluate(item=>getComputedStyle(item).animationName),'none');
    await page.close();
    console.log('PASS: gallery motion, filter, touch pause, full image, exit, and narrow layouts.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
