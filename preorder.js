/*
 * Pre-order switch for merch and Mini CD / Mini Vinyl.
 *
 * enabled: true  -> merch shows a "PRE-ORDER" badge and the ship note below.
 * enabled: false -> everything shows as normal (in stock). Use this at launch.
 * shipNote: change to a real date when you have one, e.g. 'Ships by Dec 15'.
 *
 * The Stripe checkout pages also say "PRE-ORDER" in the product description.
 * When pre-orders end, edit those descriptions in Stripe too.
 */
window.CAPO_PREORDER = {
  enabled: false,  // 2026-11-13: off until there is a pre-order date. Set true + a real shipNote to start pre-orders.
  shipNote: 'Pre-order. Ships when the drop releases.'
};

(function () {
  'use strict';
  var cfg = window.CAPO_PREORDER || {};
  if (!cfg.enabled) return;

  var css = document.createElement('style');
  css.textContent =
    '.capo-preorder-badge{display:inline-block;margin:6px 0 2px;padding:3px 10px;border-radius:999px;' +
    'background:linear-gradient(180deg,#f2d27b,#caa24a 58%,#8b641e);color:#17130c;font-weight:800;' +
    'font-size:12px;letter-spacing:1px;text-transform:uppercase}' +
    '.capo-preorder-note{margin:4px 0 0;font-size:13px;opacity:.85}';
  document.head.appendChild(css);

  function addNote(afterEl) {
    if (!afterEl || afterEl.parentNode.querySelector('.capo-preorder-note')) return;
    var note = document.createElement('p');
    note.className = 'capo-preorder-note';
    note.textContent = cfg.shipNote || 'Pre-order';
    afterEl.insertAdjacentElement('afterend', note);
  }

  function addBadge(beforeEl) {
    if (!beforeEl || beforeEl.parentNode.querySelector('.capo-preorder-badge')) return;
    var badge = document.createElement('span');
    badge.className = 'capo-preorder-badge';
    badge.textContent = 'Pre-order';
    beforeEl.insertAdjacentElement('beforebegin', badge);
  }

  function run() {
    // Home page: merch cards marked IN STOCK (tees, Mini CD, Mini Vinyl).
    document.querySelectorAll('.merch-grid article.product[data-tag="IN STOCK"]').forEach(function (card) {
      card.setAttribute('data-tag', 'PRE-ORDER');
      var overlay = card.querySelector('.overlay-badge');
      if (overlay && /in stock/i.test(overlay.textContent)) overlay.textContent = 'PRE-ORDER';
      addNote(card.querySelector('.price'));
    });

    // Shop page: tee cards and the Mini CD / Mini Vinyl cards.
    var shopCards = document.querySelectorAll(
      'section[aria-label="Merch products"] article.product-card, section[aria-label="Music collectibles"] article.product-card'
    );
    shopCards.forEach(function (card) {
      if (/coming soon/i.test((card.querySelector('.tag') || {}).textContent || '')) return;
      var price = card.querySelector('.price');
      addBadge(price);
      addNote(price);
    });

    // Home page product popup.
    var note = document.getElementById('modalNote');
    if (note && !/pre-order/i.test(note.textContent)) note.textContent = 'Pre-order. ' + note.textContent;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
