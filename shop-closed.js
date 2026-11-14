/*
 * Shop closed switch (buy.html and the home page).
 *
 * closed: true  -> buy.html is covered with caution tape and "COMING SOON".
 *                  On the home page the merch cards say COMING SOON, and View / Buy, Add To Cart, the cart's
 *                  Pay With Stripe and Buy Mini CD / Mini Vinyl are switched off.
 *                  No Stripe checkout link on these pages can be opened.
 * closed: false -> everything works as normal. Use this when you are ready to sell again.
 */
window.CAPO_SHOP = {
  closed: true,
  message: 'The shop is getting restocked. Check back soon.'
};

(function () {
  'use strict';
  var cfg = window.CAPO_SHOP || {};
  if (!cfg.closed) return;

  var onShopPage = /\/buy(\.html)?$/i.test(location.pathname);
  var STRIPE = 'a[href*="buy.stripe.com"]';
  var BLOCKED = STRIPE + ',[data-closed-href],.merch-options-btn,.capo-cart-add-button,[data-capo-index-add],.capo-cart-pay-link,#cartButton,.capo-closed-buy';

  // Switch off a checkout link: keep it on the page, but it no longer goes anywhere.
  function disarm(a) {
    if (!a.hasAttribute('href')) return;
    a.setAttribute('data-closed-href', a.getAttribute('href'));
    a.removeAttribute('href');
    a.removeAttribute('target');
    a.setAttribute('aria-disabled', 'true');
  }
  function disarmAll(root) {
    (root || document).querySelectorAll(STRIPE).forEach(disarm);
  }

  var css = document.createElement('style');
  css.textContent =
    'html.capo-shop-closed,html.capo-shop-closed body{overflow:hidden!important}' +
    '#capoShopClosed{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;' +
    'background:radial-gradient(circle at 50% 45%,rgba(20,16,8,.78),rgba(0,0,0,.94));backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}' +
    '#capoShopClosed .tape{position:absolute;left:-20%;width:140%;height:64px;display:flex;align-items:center;white-space:nowrap;overflow:hidden;' +
    'background:repeating-linear-gradient(-45deg,#f5c400 0 34px,#111 34px 68px);box-shadow:0 10px 30px rgba(0,0,0,.6);border-top:3px solid #111;border-bottom:3px solid #111}' +
    '#capoShopClosed .tape span{display:inline-block;padding:0 18px;margin-right:6px;background:#f5c400;color:#111;font:400 26px/1 "Black Ops One",Impact,sans-serif;letter-spacing:3px}' +
    '#capoShopClosed .t1{top:22%;transform:rotate(-8deg)}#capoShopClosed .t2{bottom:20%;transform:rotate(7deg)}' +
    '#capoShopClosed .capo-closed-card{position:relative;z-index:2;width:min(520px,calc(100vw - 32px));padding:28px 22px;text-align:center;border-radius:24px;' +
    'border:2px solid #f5c400;background:linear-gradient(180deg,rgba(18,14,8,.96),rgba(0,0,0,.96));box-shadow:0 30px 90px rgba(0,0,0,.8);color:#f4f1ea;font-family:Oswald,Arial,sans-serif}' +
    '#capoShopClosed .capo-closed-card h1{margin:0 0 6px;font:400 clamp(34px,8vw,56px)/1 "Black Ops One",Impact,sans-serif;color:#f5c400;letter-spacing:2px;text-transform:uppercase}' +
    '#capoShopClosed .capo-closed-card p{margin:8px 0 18px;font-size:17px;color:rgba(244,241,234,.8)}' +
    '#capoShopClosed .capo-closed-card a{display:inline-block;padding:12px 22px;border-radius:999px;background:linear-gradient(180deg,#f2d27b,#caa24a 56%,#8b641e);' +
    'color:#100c05;font-weight:800;letter-spacing:1px;text-transform:uppercase;text-decoration:none}' +
    '@media(max-width:600px){#capoShopClosed .tape{height:48px}#capoShopClosed .tape span{font-size:19px}}' +
    // Home page: closed buttons look switched off; the cart button is hidden.
    '.capo-closed-buy{opacity:.55!important;cursor:not-allowed!important;filter:grayscale(.35)}' +
    'html.capo-store-closed #cartButton{display:none!important}' +
    '#capoClosedToast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483001;padding:12px 18px;border-radius:999px;' +
    'background:#111;border:2px solid #f5c400;color:#f5c400;font:700 15px/1.2 Oswald,Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;' +
    'box-shadow:0 12px 40px rgba(0,0,0,.6);max-width:calc(100vw - 32px);text-align:center}';
  document.head.appendChild(css);

  function toast() {
    var t = document.getElementById('capoClosedToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'capoClosedToast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = 'Coming soon - ' + (cfg.message || 'the shop is closed for now.');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3200);
  }

  // Any click on a buying control is stopped before the site's own handlers (cart, product popup) see it.
  window.addEventListener('click', function (event) {
    var hit = event.target && event.target.closest && event.target.closest(BLOCKED);
    if (!hit) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!onShopPage) toast();
  }, true);

  // Links the site adds later (the product popup's Buy Now, the cart's Pay With Stripe) are switched off as they appear.
  new MutationObserver(function (records) {
    records.forEach(function (r) {
      if (r.type === 'attributes' && r.target.matches && r.target.matches(STRIPE)) disarm(r.target);
      (r.addedNodes || []).forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.matches(STRIPE)) disarm(n);
        disarmAll(n);
      });
    });
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });

  function tape(cls) {
    var band = document.createElement('div');
    band.className = 'tape ' + cls;
    band.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('span');
      s.textContent = 'COMING SOON';
      band.appendChild(s);
    }
    return band;
  }

  function closeShopPage() {
    if (document.getElementById('capoShopClosed')) return;
    document.documentElement.classList.add('capo-shop-closed');
    disarmAll();
    var box = document.createElement('div');
    box.id = 'capoShopClosed';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Shop coming soon');
    box.appendChild(tape('t1'));
    box.appendChild(tape('t2'));
    var card = document.createElement('div');
    card.className = 'capo-closed-card';
    var h = document.createElement('h1');
    h.textContent = 'Coming Soon';
    var p = document.createElement('p');
    p.textContent = cfg.message || 'The shop is closed for now.';
    var back = document.createElement('a');
    back.href = './index.html';
    back.textContent = 'Back To Main Site';
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(back);
    box.appendChild(card);
    document.body.appendChild(box);
    back.focus();
  }

  function closeStorefront() {
    document.documentElement.classList.add('capo-store-closed');
    disarmAll();
    // Merch cards: IN STOCK -> COMING SOON, and the View / Buy buttons are switched off.
    document.querySelectorAll('.merch-grid article.product').forEach(function (card) {
      var badge = card.querySelector('.overlay-badge');
      if (badge && /in stock/i.test(badge.textContent)) badge.textContent = 'COMING SOON';
      card.querySelectorAll('.merch-options-btn').forEach(function (b) {
        b.textContent = 'Coming Soon';
        b.classList.add('capo-closed-buy');
        b.setAttribute('aria-disabled', 'true');
      });
      // Buy Mini CD / Buy Mini Vinyl (they lead to the closed shop page).
      card.querySelectorAll('a[href*="buy.html"]').forEach(function (a) {
        if (!/^\s*buy\b/i.test(a.textContent)) return;
        a.textContent = 'Coming Soon';
        a.classList.add('capo-closed-buy');
        a.setAttribute('aria-disabled', 'true');
      });
    });
  }

  function run() {
    if (onShopPage) closeShopPage();
    else closeStorefront();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
