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
function hideDraft(){ const result=$('#draft-result'); if(result){result.hidden=true;draft='';} }
function showDraft(text) {
  draft = text + '\n\nLOCAL PROTOTYPE ONLY — not sent, reserved, ordered or charged. All facts and prices require owner approval.';
  $('#draft-text').textContent = draft;
  $('#draft-result').hidden = false;
  $('#draft-result').focus();
  announce('Your local draft is ready. Nothing has been sent.');
}
$('#download-draft')?.addEventListener('click',()=>{
  const blob = new Blob([draft],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url; link.download='rosewood-local-draft.txt'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$$('form').forEach(form=>form.addEventListener('input',hideDraft));
$('#reservation-form')?.addEventListener('submit',event=>{
  event.preventDefault();
  const data=Object.fromEntries(new FormData(event.currentTarget));
  if(data.date<localToday()) {event.currentTarget.elements.date.setCustomValidity('Choose today or a future date.');event.currentTarget.reportValidity();return;}
  showDraft(`VENUE INQUIRY DRAFT\n\nName: ${data.name}\nEmail: ${data.email}\nPreferred date: ${data.date}\nGuests: ${data.guests}\nOccasion: ${data.occasion}\nNotes: ${data.notes || 'None'}\n\nRequested date and sample capacity are subject to confirmation.`);
});
$('#reservation-form [name="date"]')?.addEventListener('input',event=>event.target.setCustomValidity(''));

if($('.page-menu')) {
  let cart={};
  try {cart=sanitizeCart(JSON.parse(localStorage.getItem('rosewood-cart-v1') || '{}'),content.menu);}catch{}
  function renderCart() {
    const summary=cartSummary(cart,content.menu);
    $$('[data-count]').forEach(output=>{output.textContent=cart[output.dataset.count] || 0;});
    $$('[data-qty]').forEach(button=>{const qty=cart[button.dataset.id]||0;button.disabled=Number(button.dataset.qty)<0?qty===0:qty>=20;});
    $('#cart-count').textContent=summary.count;
    $('#cart-total').textContent=cash(summary.total);
    $('#cart-lines').innerHTML=summary.lines.length?summary.lines.map(line=>`<div class="cart-line"><div><strong>${escape(line.name)}</strong><span>${line.quantity} × ${cash(line.price)}</span></div><strong>${cash(line.total)}</strong></div>`).join(''):'<p class="empty-basket">A little something delicious?<br>Add a dish to start your draft.</p>';
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
    $$('[data-menu-filter]').forEach(other=>{other.classList.toggle('active',other===button);other.setAttribute('aria-pressed',String(other===button));});
    $$('[data-category]').forEach(card=>{card.hidden=button.dataset.menuFilter!=='All'&&card.dataset.category!==button.dataset.menuFilter;});
  }));
  $('#order-form').addEventListener('submit',event=>{
    event.preventDefault();const summary=cartSummary(cart,content.menu);if(!summary.count)return;
    const data=Object.fromEntries(new FormData(event.currentTarget));
    showDraft(`ORDER DRAFT\n\nName: ${data.name}\n\n${summary.lines.map(line=>`${line.quantity} × ${line.name}: ${cash(line.total)}`).join('\n')}\n\nSample subtotal: ${cash(summary.total)} USD\nTaxes, service and delivery not determined.\nNotes: ${data.notes || 'None'}\n\nAllergens and dietary requests need confirmation before a real order.`);
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
    $('#stay-summary').innerHTML=`<p class="eyebrow">YOUR SAMPLE STAY</p><h3>${escape(q.room)}</h3><p>${q.guests} ${q.guests===1?'guest':'guests'} · ${q.nights} ${q.nights===1?'night':'nights'}</p><div class="summary-line"><span>Room · ${cash(q.rate)} × ${q.nights} nights</span><strong>${cash(q.roomTotal)}</strong></div>${[['Breakfast',q.breakfast],['Lunch',q.lunch],['Dinner',q.dinner]].filter(([,n])=>n>0).map(([label,n])=>`<div class="summary-line"><span>${label} · ${q.guests} × ${q.nights}</span><strong>${cash(n)}</strong></div>`).join('')}<div class="total-row"><span>Sample total</span><strong>${cash(q.total)}</strong></div><p class="small">USD · Taxes and fees not determined. Availability requires confirmation.</p>`;
  }
  form.addEventListener('input',renderQuote);form.addEventListener('change',()=>{hideDraft();renderQuote();});
  $$('.choose-room').forEach(button=>button.addEventListener('click',()=>{form.elements.room.value=button.dataset.room;hideDraft();renderQuote();$('#plan-stay').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});form.elements.arrival.focus({preventScroll:true});}));
  form.addEventListener('submit',event=>{
    event.preventDefault();const q=quote();
    if(q.error){form.elements.departure.setCustomValidity(q.error);form.reportValidity();return;}
    const data=input();
    showDraft(`BOOKING INQUIRY DRAFT\n\nName: ${data.name}\nEmail: ${data.email}\nRoom: ${q.room}\nArrival: ${data.arrival}\nDeparture: ${data.departure}\n${q.guests} guest(s) · ${q.nights} night(s)\nBoard: ${data.board==='breakfast'?'Bed & breakfast':'Bed only'}\nRoom: ${cash(q.roomTotal)}\nBreakfast: ${cash(q.breakfast)}\nLunch: ${cash(q.lunch)}\nDinner: ${cash(q.dinner)}\nSample total: ${cash(q.total)} USD\nTaxes and fees not determined.\n\nAvailability has not been checked. No room is held.`);
  });renderQuote();
}
$$('[data-gallery-filter]').forEach(button=>button.addEventListener('click',()=>{
  $$('[data-gallery-filter]').forEach(other=>{other.classList.toggle('active',other===button);other.setAttribute('aria-pressed',String(other===button));});
  $$('[data-gallery-category]').forEach(item=>{item.hidden=button.dataset.galleryFilter!=='All'&&item.dataset.galleryCategory!==button.dataset.galleryFilter;});
}));
$$('.gallery-open').forEach(button=>button.addEventListener('click',()=>{
  const item=content.gallery[Number(button.dataset.index)];
  $('#lightbox-image').src=`/assets/${item.image}.jpg`;$('#lightbox-image').alt=item.title+' — inspiration photograph';$('#lightbox-caption').textContent=item.title+' · Inspiration photograph';$('#lightbox').showModal();
}));
$('.close-lightbox')?.addEventListener('click',()=>$('#lightbox').close());
$('#lightbox')?.addEventListener('click',event=>{if(event.target===$('#lightbox'))$('#lightbox').close();});
