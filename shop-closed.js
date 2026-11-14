/*
 * Shop closed switch (buy.html).
 *
 * closed: true  -> the shop page is covered with caution tape and "COMING SOON"; every checkout link on it is switched off.
 * closed: false -> the shop page works as normal. Use this when you are ready to sell again.
 */
window.CAPO_SHOP = {
  closed: true,
  message: 'The shop is getting restocked. Check back soon.'
};

(function () {
  'use strict';
  var cfg = window.CAPO_SHOP || {};
  if (!cfg.closed) return;

  document.documentElement.classList.add('capo-shop-closed');
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
    '@media(max-width:600px){#capoShopClosed .tape{height:48px}#capoShopClosed .tape span{font-size:19px}}';
  document.head.appendChild(css);

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

  function close() {
    if (document.getElementById('capoShopClosed')) return;
    // Switch off every checkout link so nothing can be bought from this page while it is closed.
    document.querySelectorAll('a[href*="buy.stripe.com"]').forEach(function (a) {
      a.setAttribute('data-closed-href', a.getAttribute('href'));
      a.removeAttribute('href');
      a.setAttribute('aria-disabled', 'true');
      a.style.pointerEvents = 'none';
    });
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', close);
  else close();
})();
