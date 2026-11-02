// Bloomwell theme: cart + product interactions (Shopify AJAX Cart API).
const BW = window.BW || { cartUrl: '/cart', cartAddUrl: '/cart/add' };

function setCount(n) {
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = n;
    el.hidden = n === 0;
  });
  const link = document.querySelector('.cart-link');
  if (link) link.setAttribute('aria-label', `Bag, ${n} items`);
}
async function refreshCount() {
  try {
    const res = await fetch(`${BW.root || '/'}cart.js`.replace('//cart', '/cart'), { headers: { Accept: 'application/json' } });
    const cart = await res.json();
    setCount(cart.item_count);
  } catch (e) { /* keep the server-rendered count */ }
}

/* Bundles + pairs: add several products at once, then go to the bag */
document.querySelectorAll('[data-add-items]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const ids = btn.dataset.addItems.split(',').filter(Boolean);
    if (!ids.length) { btn.textContent = 'Not available yet'; return; }
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Adding…';
    try {
      const res = await fetch(`${BW.cartAddUrl}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: ids.map((id) => ({ id: Number(id), quantity: 1 })) }),
      });
      if (!res.ok) throw new Error((await res.json()).description || 'Could not add to bag');
      window.location.href = BW.cartUrl;
    } catch (err) {
      btn.disabled = false;
      btn.textContent = label;
      alert(err.message); // eslint-disable-line no-alert
    }
  });
});

/* Quantity steppers (product page + bag) */
document.querySelectorAll('.qty').forEach((q) => {
  const input = q.querySelector('input');
  q.querySelectorAll('[data-qty]').forEach((b) => b.addEventListener('click', () => {
    const min = Number(input.min || 0);
    input.value = Math.max(min, Number(input.value || 0) + Number(b.dataset.qty));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }));
});

/* Product gallery: animated 3D slides, arrows, thumbnails, swipe + keys */
const gallery = document.querySelector('[data-gallery]');
if (gallery) {
  const slides = [...gallery.querySelectorAll('.pdp-slide')];
  const thumbs = [...gallery.querySelectorAll('.pdp-thumb')];
  const indexEl = gallery.querySelector('[data-gallery-index]');
  const main = gallery.querySelector('.pdp-main');
  let idx = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));
  const go = (n, dir) => {
    const next = (n + slides.length) % slides.length;
    if (next === idx || !slides[next]) return;
    const d = dir || (next > idx ? 1 : -1);
    main.style.setProperty('--dir', d);
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === next);
      s.classList.toggle('is-leaving', i === idx);
      s.setAttribute('aria-hidden', String(i !== next));
      const img = s.querySelector('img');
      if (i === next && img) img.loading = 'eager';
    });
    thumbs.forEach((t, i) => t.setAttribute('aria-current', String(i === next)));
    if (thumbs[next]) thumbs[next].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    idx = next;
    if (indexEl) indexEl.textContent = idx + 1;
  };
  gallery.querySelectorAll('[data-gallery-step]').forEach((b) => b.addEventListener('click', () => go(idx + Number(b.dataset.galleryStep), Number(b.dataset.galleryStep))));
  thumbs.forEach((t) => t.addEventListener('click', () => go(Number(t.dataset.goto))));
  main.tabIndex = 0;
  main.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(idx + 1, 1);
    if (e.key === 'ArrowLeft') go(idx - 1, -1);
  });
  let x0 = null;
  let y0 = null;
  main.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  main.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
  main.addEventListener('pointercancel', () => { x0 = null; });
  // Gentle 3D tilt that follows the pointer on devices that hover
  if (window.matchMedia('(hover: hover)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    main.addEventListener('pointermove', (e) => {
      const r = main.getBoundingClientRect();
      main.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -6}deg`);
      main.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
    });
    main.addEventListener('pointerleave', () => { main.style.setProperty('--rx', '0deg'); main.style.setProperty('--ry', '0deg'); });
  }
  window.BWGallery = {
    showMedia(id) {
      const n = slides.findIndex((s) => s.dataset.mediaId === String(id));
      if (n >= 0) go(n);
    },
  };
}

/* Product page */
const form = document.getElementById('pdp-form');
if (form) {
  const idInput = form.querySelector('[data-variant-input]');
  const priceEl = document.querySelector('.pdp-price [data-price]');
  const addBtn = form.querySelector('[data-add-button]');
  const msg = form.querySelector('.form-msg');

  form.querySelectorAll('.pdp-value').forEach((btn) => btn.addEventListener('click', () => {
    const group = btn.closest('.pdp-option');
    group.querySelectorAll('.pdp-value').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    group.querySelector('[data-option-label]').textContent = btn.dataset.value;
    if (btn.dataset.variant) idInput.value = btn.dataset.variant;
    if (priceEl && btn.dataset.price) priceEl.textContent = btn.dataset.price;
    const saleEl = document.querySelector('.pdp-price [data-sale-price]');
    if (saleEl && btn.dataset.salePrice) saleEl.textContent = btn.dataset.salePrice;
    if (btn.dataset.media && window.BWGallery) window.BWGallery.showMedia(btn.dataset.media);
    const available = btn.dataset.available === 'true';
    addBtn.disabled = !available;
    addBtn.textContent = available ? 'Add to bag' : 'Sold out';
    const url = new URL(window.location.href);
    url.searchParams.set('variant', btn.dataset.variant);
    window.history.replaceState({}, '', url);
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    addBtn.disabled = true;
    msg.textContent = '';
    try {
      const res = await fetch(`${BW.cartAddUrl}.js`, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.description || 'Could not add to bag');
      // Straight to the bag, where shoppers can keep shopping or check out
      addBtn.textContent = 'Added!';
      window.location.href = BW.cartUrl;
      return;
    } catch (err) {
      msg.textContent = err.message;
      msg.classList.add('is-error');
      addBtn.disabled = false;
    }
  });
}

/* Bag page: quantities save themselves (no "update" button needed) */
const cartForm = document.getElementById('cart-form');
if (cartForm) {
  let timer;
  cartForm.querySelectorAll('input[name="updates[]"]').forEach((input) => {
    input.addEventListener('change', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const update = document.createElement('input');
        update.type = 'hidden';
        update.name = 'update';
        update.value = '1';
        cartForm.appendChild(update);
        cartForm.submit();
      }, 600);
    });
  });
}

/* Back button: return to the previous Bloomwell page, or home if there isn't one */
document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => {
    let sameSite = false;
    try { sameSite = document.referrer && new URL(document.referrer).origin === window.location.origin; } catch (e) { sameSite = false; }
    if (sameSite && window.history.length > 1) window.history.back();
    else window.location.href = BW.root || '/';
  });
});

/* Subscribe option (shows once a subscription app adds selling plans) */
document.querySelectorAll('input[name="bw-purchase"]').forEach((r) => {
  r.addEventListener('change', () => {
    const hidden = document.querySelector('[data-selling-plan]');
    if (!hidden) return;
    hidden.value = r.value;
    hidden.disabled = !r.value;
  });
});

/* Sticky "Add to bag" bar on phones once the main button scrolls away */
const sticky = document.querySelector('[data-sticky-bar]');
const buy = document.querySelector('.pdp-buy');
if (sticky && buy && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(([entry]) => {
    const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    sticky.classList.toggle('is-visible', show);
    sticky.setAttribute('aria-hidden', String(!show));
    sticky.querySelector('[data-sticky-add]').tabIndex = show ? 0 : -1;
  });
  io.observe(buy);
  sticky.querySelector('[data-sticky-add]').addEventListener('click', () => {
    const f = document.getElementById('pdp-form');
    if (f.requestSubmit) f.requestSubmit(); else f.querySelector('[data-add-button]').click();
  });
}

/* Build-your-own subscription box */
const box = document.querySelector('[data-box]');
if (box) {
  const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: BW.currency || 'GBP' });
  const money = (pence) => fmt.format(pence / 100);
  const salePct = Number(box.dataset.sale || 100);
  const subPct = Number(box.dataset.sub || 0);
  const items = [...box.querySelectorAll('.box-item')];
  const qty = new Map();
  const $ = (sel) => box.querySelector(sel);
  const lines = $('[data-box-lines]');
  const addBtn = $('[data-box-add]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rhythm = () => Number(box.querySelector('input[name="box-rhythm"]:checked').value);

  function render() {
    let total = 0;
    let count = 0;
    let lasts = Infinity;
    lines.innerHTML = '';
    items.forEach((it) => {
      const n = qty.get(it) || 0;
      it.querySelector('output').textContent = n;
      it.classList.toggle('is-picked', n > 0);
      if (!n) return;
      count += n;
      total += Number(it.dataset.price) * n;
      const days = Number(it.dataset.days) * n;
      lasts = Math.min(lasts, days);
      const li = document.createElement('li');
      li.innerHTML = `<span>${it.dataset.name} <b>×${n}</b></span><span>~${days} days</span>`;
      lines.appendChild(li);
    });
    const sale = Math.round(total * salePct / 100);
    $('[data-box-empty]').hidden = count > 0;
    $('[data-box-total]').textContent = money(sale);
    const was = $('[data-box-was]');
    if (was) was.textContent = count ? `−${money(total - sale)}` : '';
    const sub = $('[data-box-sub]');
    if (sub) sub.textContent = count ? money(Math.round(sale * (100 - subPct) / 100)) : '';
    const lastsEl = $('[data-box-lasts]');
    lastsEl.hidden = !count;
    const hint = $('[data-box-hint]');
    if (count) {
      $('[data-box-days]').textContent = lasts;
      const r = rhythm();
      box.style.setProperty('--fill', Math.min(100, Math.round((lasts / 90) * 100)));
      const best = [30, 60, 90].reduce((a, b) => (Math.abs(b - lasts) < Math.abs(a - lasts) ? b : a));
      if (lasts < r) hint.textContent = `Heads up: your box runs out after about ${lasts} days. Add more, or deliver every ${best} days.`;
      else if (lasts >= r + 30) hint.textContent = `You'll have extra left over. Every ${best} days would suit this box.`;
      else hint.textContent = `Every ${r} days is a good fit for this box.`;
    } else hint.textContent = '';
    addBtn.disabled = !count;
    addBtn.textContent = count ? `Add my box to bag · ${count} item${count > 1 ? 's' : ''}` : 'Add my box to bag';
  }

  box.addEventListener('click', (e) => {
    const step = e.target.closest('[data-box-step]');
    if (step) {
      const it = step.closest('.box-item');
      const n = Math.max(0, Math.min(9, (qty.get(it) || 0) + Number(step.dataset.boxStep)));
      qty.set(it, n);
      if (!reduce && it.animate) it.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
      render();
      return;
    }
    const chip = e.target.closest('[data-box-filter]');
    if (chip) {
      const f = chip.dataset.boxFilter;
      box.querySelectorAll('[data-box-filter]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      items.forEach((it) => { it.hidden = f !== 'all' && it.dataset.kind !== f; });
      if (!reduce) items.filter((it) => !it.hidden).forEach((it, i) => it.animate && it.animate(
        [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
        { duration: 350, delay: i * 25, easing: 'ease-out', fill: 'backwards' }));
    }
  });
  box.querySelectorAll('input[name="box-rhythm"]').forEach((r) => r.addEventListener('change', render));

  addBtn.addEventListener('click', async () => {
    const r = rhythm();
    const payload = items.filter((it) => qty.get(it)).map((it) => {
      const item = { id: Number(it.dataset.id), quantity: qty.get(it) };
      if (it.dataset.plan) {
        item.selling_plan = Number(it.dataset.plan);
        item.properties = { 'Box delivery': `Every ${r} days` };
      }
      return item;
    });
    addBtn.disabled = true;
    addBtn.textContent = 'Adding…';
    try {
      const res = await fetch(`${BW.cartAddUrl}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: payload }),
      });
      if (!res.ok) throw new Error((await res.json()).description || 'Could not add to bag');
      window.location.href = BW.cartUrl;
    } catch (err) {
      alert(err.message); // eslint-disable-line no-alert
      render();
    }
  });
  render();
}
