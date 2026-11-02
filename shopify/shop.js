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

/* Product page */
const form = document.getElementById('pdp-form');
if (form) {
  const idInput = form.querySelector('[data-variant-input]');
  const priceEl = document.querySelector('[data-price]');
  const mainImg = document.getElementById('pdp-image');
  const addBtn = form.querySelector('[data-add-button]');
  const msg = form.querySelector('.form-msg');
  const swapImage = (src) => {
    if (!src || !mainImg) return;
    mainImg.removeAttribute('srcset');
    mainImg.src = src;
  };

  form.querySelectorAll('.pdp-value').forEach((btn) => btn.addEventListener('click', () => {
    const group = btn.closest('.pdp-option');
    group.querySelectorAll('.pdp-value').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    group.querySelector('[data-option-label]').textContent = btn.dataset.value;
    if (btn.dataset.variant) idInput.value = btn.dataset.variant;
    if (priceEl && btn.dataset.price) priceEl.textContent = btn.dataset.price;
    swapImage(btn.dataset.image);
    const available = btn.dataset.available === 'true';
    addBtn.disabled = !available;
    addBtn.textContent = available ? 'Add to bag' : 'Sold out';
    const url = new URL(window.location.href);
    url.searchParams.set('variant', btn.dataset.variant);
    window.history.replaceState({}, '', url);
  }));

  document.querySelectorAll('.pdp-thumb').forEach((t) => t.addEventListener('click', () => swapImage(t.dataset.src)));

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
