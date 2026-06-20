/* ============================================
   HYPER COFFEE — shared site behavior
   ============================================ */

// ---------- Mobile nav ----------
(function(){
  const btn = document.getElementById('menu-btn');
  const panel = document.getElementById('mobile-panel');
  if(!btn || !panel) return;
  btn.addEventListener('click', () => {
    panel.classList.toggle('open');
    btn.classList.toggle('active');
  });
  panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => panel.classList.remove('open')));
})();

// ---------- Scroll reveal ----------
(function(){
  const els = document.querySelectorAll('[data-reveal]');
  if(!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:0.15, rootMargin:'0px 0px -40px 0px'});
  els.forEach(el => io.observe(el));
})();

// ---------- Header shrink/tint on scroll ----------
(function(){
  const header = document.querySelector('.site-header');
  if(!header) return;
  let last = -1;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if(y > 40 && last <= 40){ header.style.boxShadow = '0 8px 24px -12px rgba(43,24,16,0.18)'; }
    else if(y <= 40 && last > 40){ header.style.boxShadow = 'none'; }
    last = y;
  }, {passive:true});
})();

// ---------- Toast ----------
function showToast(msg, ms){
  let t = document.querySelector('.toast');
  if(!t){
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), ms || 2200);
}

/* ============================================
   CART — persisted via localStorage
   ============================================ */
const Cart = (function(){
  const KEY = 'hyper-coffee-cart';
  let state = { items: [] };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = JSON.parse(raw);
    } catch (e) { /* use default */ }
    return state;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { console.warn('Cart save failed', e); }
  }

  async function add(item) {
    load();
    const existing = state.items.find(i => i.id === item.id);
    if (existing) existing.qty += 1;
    else state.items.push({ ...item, qty: 1 });
    persist();
    renderBadge();
    return state;
  }

  async function setQty(id, qty) {
    load();
    const existing = state.items.find(i => i.id === id);
    if (!existing) return state;
    if (qty <= 0) state.items = state.items.filter(i => i.id !== id);
    else existing.qty = qty;
    persist();
    renderBadge();
    return state;
  }

  async function clear() {
    state = { items: [] };
    persist();
    renderBadge();
  }

  function total() {
    return state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }
  function count() {
    return state.items.reduce((sum, i) => sum + i.qty, 0);
  }

  async function renderBadge() {
    load();
    document.querySelectorAll('.cart-badge').forEach(b => {
      const c = count();
      b.textContent = c;
      b.style.display = c > 0 ? 'inline-flex' : 'none';
    });
  }

  return { load, add, setQty, clear, total, count, renderBadge, getState: () => state };
})();

document.addEventListener('DOMContentLoaded', () => Cart.renderBadge());

// ---------- Cart drawer (present on every page) ----------
function initCartDrawer(){
  const overlay = document.getElementById('cart-overlay');
  const drawer = document.getElementById('cart-drawer');
  const body = document.getElementById('cart-drawer-body');
  const footer = document.getElementById('cart-drawer-footer');
  const openBtns = document.querySelectorAll('[data-open-cart]');
  const closeBtns = document.querySelectorAll('[data-close-cart]');
  if(!overlay || !drawer) return;

  async function render(){
    await Cart.load();
    const items = Cart.getState().items;
    if(!items.length){
      body.innerHTML = '<div class="empty-state"><p class="h-display" style="font-size:1.3rem;">Your cup is empty</p><p style="font-size:0.9rem; margin-top:0.4rem;">Add something from the menu to get started.</p></div>';
      footer.innerHTML = '';
      return;
    }
    body.innerHTML = items.map(i => `
      <div class="cart-line" data-id="${i.id}">
        <div style="flex:1;">
          <p style="font-weight:600; margin:0 0 0.2rem;">${i.name}</p>
          <p class="price-tag" style="font-size:0.85rem;">${i.price} ETB</p>
        </div>
        <div class="qty-stepper">
          <button data-step="-1" aria-label="Decrease quantity">−</button>
          <span style="min-width:1.2rem; text-align:center;">${i.qty}</span>
          <button data-step="1" aria-label="Increase quantity">+</button>
        </div>
      </div>
    `).join('');
    footer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:1rem;">
        <span style="font-family:var(--mono); font-size:0.85rem; color:var(--roast-soft);">Total</span>
        <span class="price-tag" style="font-size:1.4rem;">${Cart.total()} ETB</span>
      </div>
      <a href="/order#checkout" class="btn btn-primary" style="width:100%;">Go to checkout</a>
    `;
    body.querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const line = e.target.closest('.cart-line');
        const id = line.dataset.id;
        const item = Cart.getState().items.find(i => i.id === id);
        const delta = parseInt(e.target.dataset.step, 10);
        await Cart.setQty(id, item.qty + delta);
        render();
      });
    });
  }

  function open(){ overlay.classList.add('open'); drawer.classList.add('open'); render(); document.body.style.overflow='hidden'; }
  function close(){ overlay.classList.remove('open'); drawer.classList.remove('open'); document.body.style.overflow=''; }

  openBtns.forEach(b => b.addEventListener('click', open));
  closeBtns.forEach(b => b.addEventListener('click', close));
  overlay.addEventListener('click', close);

  window._cartDrawerRender = render;
}
document.addEventListener('DOMContentLoaded', initCartDrawer);
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}
