import {money, sanitizeCart, cartSummary, localToday, stayQuote} from './domain.js';
const content = JSON.parse(document.querySelector('#site-content').textContent);
const cash = value => money(value, content.currency);
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const announce = text => { $('#announcement').textContent = text; };
const escape = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
$('.nav-toggle').addEventListener('click', () => {
  const open = $('.nav-toggle').getAttribute('aria-expanded') !== 'true';
  $('.nav-toggle').setAttribute('aria-expanded', String(open));
  $('#site-nav').classList.toggle('is-open', open);
});
document.addEventListener('keydown', event => {
  if(event.key === 'Escape' && $('#site-nav').classList.contains('is-open')) {
    $('#site-nav').classList.remove('is-open'); $('.nav-toggle').setAttribute('aria-expanded','false'); $('.nav-toggle').focus();
  }
});
$$('[data-future]').forEach(input => {input.min = localToday();});
let draft = '';
let downloadName = 'jotham-gardens-request.txt';
const formEndpoint = 'https://formsubmit.co/ajax/jothamgardens.online@gmail.com';
const emailjsEndpoint = 'https://api.emailjs.com/api/v1.0/email/send';
const emailjsConfig = {service_id:'service_phhdqe9',template_id:'template_hdinv6x',user_id:'A3-jSSaFomV5yB1e0'};
function hideDraft(){ const result=$('#draft-result'); if(result){result.hidden=true;draft='';} }
function showDraft(text, filename, emailStatus='none') {
  draft = text;
  downloadName = filename;
  $('#draft-text').textContent = draft;
  $('#draft-message').textContent = emailStatus==='sent'
    ? 'The venue has received your details, and a separate copy was emailed to you.'
    : emailStatus==='failed'
      ? 'The venue has received your details, but your email copy could not be sent. You can download it below.'
      : 'The venue has received your details. You can download a copy below.';
  $('#draft-result').hidden = false;
  $('#draft-result').focus();
  announce(emailStatus==='failed' ? 'Your request was submitted, but the email copy could not be sent.' : 'Your request has been submitted.');
}
async function sendCustomerCopy(customerEmail, customerName, kind, receipt) {
  const response=await fetch(emailjsEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...emailjsConfig,template_params:{customer_email:customerEmail,customer_name:customerName,request_type:kind,receipt,title:kind,name:customerName,email:customerEmail,message:receipt}})});
  if(!response.ok) throw new Error(await response.text() || 'Customer email failed');
}
async function submitRequest(form, kind, details, receipt) {
  const button=form.querySelector('[type="submit"]');
  form.querySelector('.submission-error')?.remove();
  button.disabled=true;button.setAttribute('aria-busy','true');
  const sendCopy=form.elements.emailCopy?.checked;
  const customerEmail=form.elements.email?.value.trim();
  const customerName=form.elements.name?.value.trim() || details.Name || 'Guest';
  const payload={...details,_subject:`New Jotham Gardens ${kind}`,_template:'table',_captcha:'false'};
  if(customerEmail) payload._replyto=customerEmail;
  const filename=`jotham-gardens-${kind.toLowerCase().replace(/[^a-z]+/g,'-')}.txt`;
  try {
    const response=await fetch(formEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok || result.success===false) throw new Error(result.message || 'Submission failed');
    if(sendCopy) {
      try {await sendCustomerCopy(customerEmail,customerName,kind,receipt);}
      catch {showDraft(receipt,filename,'failed');return false;}
    }
    showDraft(receipt,filename,sendCopy?'sent':'none');
    return true;
  } catch {
    const error=document.createElement('p');error.className='submission-error';error.setAttribute('role','alert');
    error.textContent='We could not send your request. Please check your connection and try again.';
    button.insertAdjacentElement('afterend',error);announce(error.textContent);return false;
  } finally {button.disabled=false;button.removeAttribute('aria-busy');}
}
$$('form').forEach(form=>{
  const copy=form.elements.emailCopy, email=form.elements.email;
  if(!copy || !email) return;
  const syncEmailRequirement=()=>{
    email.required=copy.checked;
    email.setCustomValidity(copy.checked && !email.value.trim() ? 'Enter your email address to receive a copy.' : '');
  };
  copy.addEventListener('change',syncEmailRequirement);
  email.addEventListener('input',syncEmailRequirement);
  syncEmailRequirement();
});
$('#download-draft')?.addEventListener('click',()=>{
  const blob = new Blob([draft],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url; link.download=downloadName; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$$('form').forEach(form=>form.addEventListener('input',hideDraft));
$('#reservation-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const data=Object.fromEntries(new FormData(event.currentTarget));
  if(data.date<localToday()) {event.currentTarget.elements.date.setCustomValidity('Choose today or a future date.');event.currentTarget.reportValidity();return;}
  const email=data.email || 'Not provided';
  const receipt=`EVENT INQUIRY\n\nName: ${data.name}\nPhone: ${data.phone}\nEmail: ${email}\nPreferred date: ${data.date}\nGuests: ${data.guests}\nOccasion: ${data.occasion}\nNotes: ${data.notes || 'None'}\n\nThe venue will confirm availability and arrangements.`;
  await submitRequest(event.currentTarget,'Event inquiry',{Name:data.name,Phone:data.phone,Email:email,'Preferred date':data.date,Guests:data.guests,Occasion:data.occasion,Notes:data.notes || 'None'},receipt);
});
$('#reservation-form [name="date"]')?.addEventListener('input',event=>event.target.setCustomValidity(''));

if($('.page-menu')) {
  const menuCash = value => `KSh ${Number(value).toLocaleString('en-KE')}`;
  let cart={};
  try {cart=sanitizeCart(JSON.parse(localStorage.getItem('rosewood-cart-v1') || '{}'),content.menu);}catch{}
  function renderCart() {
    const summary=cartSummary(cart,content.menu);
    $$('[data-count]').forEach(output=>{output.textContent=cart[output.dataset.count] || 0;});
    $$('[data-qty]').forEach(button=>{const qty=cart[button.dataset.id]||0;button.disabled=Number(button.dataset.qty)<0?qty===0:qty>=20;});
    $('#cart-count').textContent=summary.count;
    $('#cart-total').textContent=menuCash(summary.total);
    $('#cart-lines').innerHTML=summary.lines.length?summary.lines.map(line=>`<div class="cart-line"><div><strong>${escape(line.name)}</strong><span>${line.quantity} × ${menuCash(line.price)}</span></div><strong>${menuCash(line.total)}</strong></div>`).join(''):'<p class="empty-basket">A little something delicious?<br>Add a dish to start your order.</p>';
    $('#order-button').disabled=!summary.count; $('#clear-cart').disabled=!summary.count;
    try{localStorage.setItem('rosewood-cart-v1',JSON.stringify(cart));}catch{}
  }
  $$('[data-qty]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.id;
    const next=Math.min(20,Math.max(0,(cart[id]||0)+Number(button.dataset.qty)));
    if(next) cart[id]=next; else delete cart[id];
    hideDraft();renderCart();announce(`${content.menu.find(item=>item.id===id).name}: ${next} in basket.`);
  }));
  $('#clear-cart').addEventListener('click',()=>{cart={};hideDraft();renderCart();announce('Basket emptied.');});
  $$('[data-menu-filter]').forEach(button=>button.addEventListener('click',()=>{
    const category=button.dataset.menuFilter;
    $$('[data-menu-filter]').forEach(other=>{other.classList.toggle('active',other===button);other.setAttribute('aria-pressed',String(other===button));});
    $$('[data-category]').forEach(card=>{card.hidden=category!=='All'&&card.dataset.category!==category;});
    $$('[data-menu-photo]').forEach(panel=>{panel.hidden=panel.dataset.menuPhoto!==category;});
    $('.menu-stage').dataset.menuView=category;
    $('#menu-view-title').textContent=category;
    announce(`${category} menu selected.`);
  }));
  $('#order-form').addEventListener('submit',async event=>{
    event.preventDefault();const summary=cartSummary(cart,content.menu);if(!summary.count)return;
    const data=Object.fromEntries(new FormData(event.currentTarget));
    const lines=summary.lines.map(line=>`${line.quantity} × ${line.name}: ${menuCash(line.total)}`).join('\n');
    const email=data.email || 'Not provided';
    const receipt=`ORDER INVOICE\n\nName: ${data.name}\nPhone: ${data.phone}\nEmail: ${email}\n\n${lines}\n\nSubtotal: ${menuCash(summary.total)}\nNotes: ${data.notes || 'None'}\n\nThe restaurant will confirm availability, service and delivery details.`;
    await submitRequest(event.currentTarget,'Food order',{Name:data.name,Phone:data.phone,Email:email,Order:lines,Subtotal:menuCash(summary.total),Notes:data.notes || 'None'},receipt);
  });renderCart();
}

if($('#booking-form')) {
  const form=$('#booking-form');
  function input(){const data=Object.fromEntries(new FormData(form));return {...data,lunch:!!data.lunch,dinner:!!data.dinner};}
  function quote(){return stayQuote(input(),content);}
  function renderQuote(){
    form.elements.departure.setCustomValidity('');
    const q=quote();
    if(q.error){$('#stay-summary').innerHTML=`<p class="eyebrow">YOUR STAY AT A GLANCE</p><p>${escape(q.error)}</p>`;return;}
    $('#stay-summary').innerHTML=`<p class="eyebrow">YOUR STAY AT A GLANCE</p><h3>${escape(q.room)}</h3><p>${q.guests} ${q.guests===1?'guest':'guests'} · ${q.nights} ${q.nights===1?'night':'nights'}</p><div class="summary-line"><span>Room with breakfast · ${cash(q.rate)} × ${q.nights} nights</span><strong>${cash(q.roomTotal)}</strong></div>${[['Lunch',q.lunch],['Dinner',q.dinner]].filter(([,n])=>n>0).map(([label,n])=>`<div class="summary-line"><span>${label} · ${q.guests} × ${q.nights}</span><strong>${cash(n)}</strong></div>`).join('')}<div class="total-row"><span>Estimated total</span><strong>${cash(q.total)}</strong></div><p class="small">Breakfast is included. Availability and final charges require confirmation.</p>`;
  }
  form.addEventListener('input',renderQuote);form.addEventListener('change',()=>{hideDraft();renderQuote();});
  $$('.choose-room').forEach(button=>button.addEventListener('click',()=>{form.elements.room.value=button.dataset.room;hideDraft();renderQuote();$('#plan-stay').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});form.elements.arrival.focus({preventScroll:true});}));
  form.addEventListener('submit',async event=>{
    event.preventDefault();const q=quote();
    if(q.error){form.elements.departure.setCustomValidity(q.error);form.reportValidity();return;}
    const data=input();
    const email=data.email || 'Not provided';
    const receipt=`BOOKING INVOICE\n\nName: ${data.name}\nPhone: ${data.phone}\nEmail: ${email}\nRoom: ${q.room}\nArrival: ${data.arrival}\nDeparture: ${data.departure}\n${q.guests} guest(s) · ${q.nights} night(s)\nRoom with breakfast: ${cash(q.roomTotal)}\nBreakfast: Included\nEstimated total: ${cash(q.total)}\n\nThe venue will confirm availability and final charges.`;
    await submitRequest(event.currentTarget,'Accommodation booking',{Name:data.name,Phone:data.phone,Email:email,Room:q.room,Arrival:data.arrival,Departure:data.departure,Guests:q.guests,Nights:q.nights,Breakfast:'Included','Estimated total':cash(q.total)},receipt);
  });renderQuote();
}
if($('.page-gallery')) {
  const gallery=$('.gallery-grid'), lightbox=$('#lightbox');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let hovered=false, pausedIndex=null, pendingTouchIndex=null, pauseTimer, pointerType='mouse';
  const syncMotion=()=>gallery.classList.toggle('is-paused',hovered || pausedIndex!==null || lightbox.open);
  const clearTouchPause=()=>{clearTimeout(pauseTimer);pausedIndex=null;pendingTouchIndex=null;syncMotion();};

  $$('.gallery-item').forEach(item=>{
    // Each photograph gets a different, gentle path without changing its place in the grid.
    item.style.setProperty('--drift-x',`${12+Math.round(Math.random()*22)}px`);
    item.style.setProperty('--drift-y',`${10+Math.round(Math.random()*22)}px`);
    item.style.setProperty('--drift-rotation',`${(Math.random()*3+1).toFixed(1)}deg`);
    item.style.setProperty('--drift-time',`${(8+Math.random()*6).toFixed(1)}s`);
    item.style.setProperty('--drift-delay',`${(-Math.random()*12).toFixed(1)}s`);
    item.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;syncMotion();}});
    item.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'){hovered=false;syncMotion();}});
  });

  $$('[data-gallery-filter]').forEach(button=>button.addEventListener('click',()=>{
    clearTouchPause();
    $$('[data-gallery-filter]').forEach(other=>{other.classList.toggle('active',other===button);other.setAttribute('aria-pressed',String(other===button));});
    $$('[data-gallery-category]').forEach(item=>{item.hidden=button.dataset.galleryFilter!=='All'&&item.dataset.galleryCategory!==button.dataset.galleryFilter;});
  }));
  $$('.gallery-open').forEach(button=>{
    button.addEventListener('pointerdown',event=>{
      pointerType=event.pointerType;
      if(reducedMotion.matches || (pointerType!=='touch' && pointerType!=='pen')) return;
      const index=Number(button.dataset.index);
      pendingTouchIndex=pausedIndex===index ? null : index;
      if(pendingTouchIndex!==null) {
        clearTimeout(pauseTimer);pausedIndex=index;syncMotion();
        pauseTimer=setTimeout(clearTouchPause,4500);
      }
    });
    button.addEventListener('click',event=>{
      const index=Number(button.dataset.index);
      if(event.detail && (pointerType==='touch' || pointerType==='pen') && pendingTouchIndex===index) {
        pendingTouchIndex=null;
        return;
      }
      clearTouchPause();
      const item=content.gallery[index], photo=button.querySelector('img');
      $('#lightbox-image').src=photo.currentSrc || photo.src;
      $('#lightbox-image').alt=photo.alt;
      $('#lightbox-caption').textContent=item.title;
      lightbox.showModal();syncMotion();
    });
  });
  const closeLightbox=()=>lightbox.close();
  $('.close-lightbox').addEventListener('click',closeLightbox);
  lightbox.addEventListener('click',event=>{if(event.target===lightbox)closeLightbox();});
  lightbox.addEventListener('close',()=>{hovered=false;clearTouchPause();});
}
