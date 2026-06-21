/* ============================================
   HYPER COFFEE — Site Behavior v2.0
   ============================================ */

// ---------- 1. Mobile navigation toggle ----------
(function() {
  const btn = document.getElementById('menu-btn');
  const panel = document.getElementById('mobile-panel');
  if (!btn || !panel) return;

  btn.addEventListener('click', () => {
    panel.classList.toggle('open');
    btn.classList.toggle('active');
  });

  // Close mobile menu on link click
  panel.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      panel.classList.remove('open');
      btn.classList.remove('active');
    });
  });
})();

// ---------- 2. Scroll reveal (Intersection Observer) ----------
(function() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  els.forEach(el => io.observe(el));
})();

// ---------- 3. Header shrink on scroll (using CSS class) ----------
(function() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const SHRINK_THRESHOLD = 60; // pixels

  function handleScroll() {
    const y = window.scrollY;
    if (y > SHRINK_THRESHOLD) {
      header.classList.add('shrink');
    } else {
      header.classList.remove('shrink');
    }
  }

  // Throttled scroll listener for performance
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  });

  // Initial check on load
  handleScroll();
})();

// ---------- 4. Toast notifications ----------
function showToast(message, duration = 2200) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// ---------- 5. Newsletter form handler (optional) ----------
(function() {
  const forms = document.querySelectorAll('#newsletter-form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const input = this.querySelector('input[type="email"]');
      const email = input?.value?.trim();
      if (email) {
        showToast('🎉 Thanks for subscribing! Check your email for updates.', 3000);
        this.reset();
        // Optionally, you can also submit the form to Formspree in the background
        // using fetch(this.action, { method: 'POST', body: new FormData(this), headers: { 'Accept': 'application/json' } })
        // but it's already sent via the form action; we just prevent default to show toast.
        // If you want both, you can uncomment the fetch below:
        /*
        fetch(this.action, {
          method: 'POST',
          body: new FormData(this),
          headers: { 'Accept': 'application/json' }
        }).catch(() => {});
        */
      }
    });
  });
})();

// ---------- 6. Cart system (localStorage) ----------
const Cart = (function() {
  const KEY = 'hyper-coffee-cart';
  let state = { items: [] };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return state;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) {
      console.warn('Cart save failed');
    }
  }

  function getState() { return state; }

  function total() {
    return state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function count() {
    return state.items.reduce((sum, i) => sum + i.qty, 0);
  }

  async function add(item) {
    load();
    const existing = state.items.find(i => i.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      state.items.push({ ...item, qty: 1 });
    }
    persist();
    renderBadge();
    return state;
  }

  async function setQty(id, qty) {
    load();
    const existing = state.items.find(i => i.id === id);
    if (!existing) return state;
    if (qty <= 0) {
      state.items = state.items.filter(i => i.id !== id);
    } else {
      existing.qty = qty;
    }
    persist();
    renderBadge();
    return state;
  }

  async function clear() {
    state = { items: [] };
    persist();
    renderBadge();
  }

  async function renderBadge() {
    load();
    document.querySelectorAll('.cart-badge').forEach(badge => {
      const c = count();
      badge.textContent = c;
      badge.style.display = c > 0 ? 'inline-flex' : 'none';
    });
  }

  // Initial badge render on DOM ready
  document.addEventListener('DOMContentLoaded', () => renderBadge());

  return {
    load,
    add,
    setQty,
    clear,
    total,
    count,
    renderBadge,
    getState,
  };
})();

// ---------- 7. Cart drawer ----------
function initCartDrawer() {
  const overlay = document.getElementById('cart-overlay');
  const drawer = document.getElementById('cart-drawer');
  const body = document.getElementById('cart-drawer-body');
  const footer = document.getElementById('cart-drawer-footer');
  const openBtns = document.querySelectorAll('[data-open-cart]');
  const closeBtns = document.querySelectorAll('[data-close-cart]');

  if (!overlay || !drawer) return;

  // Render drawer contents
  async function render() {
    await Cart.load();
    const items = Cart.getState().items;

    if (!items.length) {
      body.innerHTML = `
        <div class="empty-state">
          <p class="h-display" style="font-size:1.3rem;">Your cup is empty</p>
          <p style="font-size:0.9rem; margin-top:0.4rem;">Add something from the menu to get started.</p>
        </div>
      `;
      footer.innerHTML = '';
      return;
    }

    // List items
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

    // Footer with total and checkout button
    footer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:1rem;">
        <span style="font-family:var(--mono); font-size:0.85rem; color:var(--roast-soft);">Total</span>
        <span class="price-tag" style="font-size:1.4rem;">${Cart.total()} ETB</span>
      </div>
      <a href="/order#checkout" class="btn btn-accent" style="width:100%; text-align:center;">
        Proceed to checkout
      </a>
    `;

    // Stepper event listeners
    body.querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const line = e.target.closest('.cart-line');
        const id = line.dataset.id;
        const item = Cart.getState().items.find(i => i.id === id);
        const delta = parseInt(e.target.dataset.step, 10);
        await Cart.setQty(id, item.qty + delta);
        render();
        // Also update badge and any other UI
        Cart.renderBadge();
        if (window._cartDrawerRender) window._cartDrawerRender();
      });
    });
  }

  // Open / close functions
  function open() {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    render();
  }

  function close() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Event bindings
  openBtns.forEach(btn => btn.addEventListener('click', open));
  closeBtns.forEach(btn => btn.addEventListener('click', close));
  overlay.addEventListener('click', close);

  // Expose render for external updates (e.g., after add/remove)
  window._cartDrawerRender = render;
}

// Initialize cart drawer on DOM ready
document.addEventListener('DOMContentLoaded', initCartDrawer);

// ---------- 8. Service worker registration ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registered:', reg))
      .catch(err => console.warn('SW registration failed:', err));
  });
              }
