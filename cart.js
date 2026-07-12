(function () {
  'use strict';

  const STORAGE_KEY = 'capo_cart';
  const SHIRT_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
  const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  let cart = [];
  let toastTimer = null;
  let currentModalProductKey = '';
  let modalSizeWasChosen = false;

  const PRODUCT_LINKS = {
    alien: {
      id: 'fly-legendary-alien-black-tee',
      name: 'Fly And Legendary Black Tee',
      price: 30,
      image: './fly-legendary-alien-black-tee.png?v=final1',
      variant: 'Black Tee',
      stripe_url: 'https://buy.stripe.com/14A9ATfRefVAcGM2CM4ZG07',
      cashapp_url: 'https://cash.app/$3dcashin/30',
      requires_size: true
    },
    fly: {
      id: 'fly-legendary-white-tee',
      name: 'Fly And Legendary White Tee',
      price: 30,
      image: './fly-legendary-white-tee.png?v=final1',
      variant: 'White Tee',
      stripe_url: 'https://buy.stripe.com/14A9ATfRefVAcGM2CM4ZG07',
      cashapp_url: 'https://cash.app/$3dcashin/30',
      requires_size: true
    },
    smokin: {
      id: 'smokin-budz-tee',
      name: 'Smokin Budz Tee',
      price: 30,
      image: './smokin-budz-blue-white-tee.png?v=final1',
      variant: 'Selected Color',
      stripe_url: 'https://buy.stripe.com/fZuaEX6gEbFk9uAelu4ZG08',
      cashapp_url: 'https://cash.app/$3dcashin/30',
      requires_size: true
    },
    coming1: {
      id: 'royals-etiquette-tee',
      name: 'Royals Etiquette Tee',
      price: 30,
      image: './royals-etiquette-white.png?v=final1',
      variant: 'Selected Color',
      stripe_url: 'https://buy.stripe.com/5kQ4gzdJ6bFk9uA1yI4ZG09',
      cashapp_url: 'https://cash.app/$3dcashin/30',
      requires_size: true
    },
    coming2: {
      id: 'stay-in-my-bag-tee',
      name: 'Stay In My Bag Tee',
      price: 30,
      image: './stay-in-my-bag-white.png?v=final1',
      variant: 'Selected Color',
      stripe_url: 'https://buy.stripe.com/4gM8wP6gE10G6iogtC4ZG0b',
      cashapp_url: 'https://cash.app/$3dcashin/30',
      requires_size: true
    },
    mini_cd: {
      id: 'collector-mini-cd',
      name: "Collector's Edition Mini CD",
      price: 5,
      image: './my-resume-cover.png?v=mini2',
      variant: 'Mini CD',
      stripe_url: 'https://buy.stripe.com/fZuaEX6gEbFk9uAelu4ZG08',
      cashapp_url: 'https://cash.app/$3dcashin/5',
      requires_size: false
    },
    mini_vinyl: {
      id: 'collector-mini-vinyl',
      name: "Collector's Edition Mini Vinyl",
      price: 5,
      image: './my-resume-cover.png?v=mini2',
      variant: 'Mini Vinyl',
      stripe_url: 'https://buy.stripe.com/5kQ4gzdJ6bFk9uA1yI4ZG09',
      cashapp_url: 'https://cash.app/$3dcashin/5',
      requires_size: false
    },
    entry_access: {
      id: 'entry-access',
      name: 'Entry Access',
      price: 10,
      image: './entryaccess.png',
      variant: '30 Days',
      stripe_url: 'https://buy.stripe.com/9B6fZh34s4cScGM4KU4ZG06',
      cashapp_url: 'https://cash.app/$3dcashin/10',
      requires_size: false
    },
    gold_access: {
      id: 'gold-access',
      name: 'Gold Access',
      price: 20,
      image: './goldaccess.png',
      variant: '30 Days',
      stripe_url: 'https://buy.stripe.com/dRm28r8oMaBgbCI4KU4ZG05',
      cashapp_url: 'https://cash.app/$3dcashin/20',
      requires_size: false
    },
    elite_access: {
      id: 'elite-access',
      name: 'Elite Access',
      price: 30,
      image: './eliteaccess.png',
      variant: '30 Days',
      stripe_url: 'https://buy.stripe.com/fZu4gz34s24K6ioa5e4ZG04',
      cashapp_url: 'https://cash.app/$3dcashin/30',
      requires_size: false
    },
    entry_rewards: {
      id: 'entry-rewards-pack',
      name: 'Entry Rewards Pack',
      price: 10,
      image: './entryrewards.png',
      variant: '2,500 Credits',
      stripe_url: 'https://buy.stripe.com/eVqcN55cAeRw2283GQ4ZG03',
      cashapp_url: 'https://cash.app/$3dcashin/10',
      requires_size: false
    },
    gold_rewards: {
      id: 'gold-rewards-pack',
      name: 'Gold Rewards Pack',
      price: 20,
      image: './goldrewards.png',
      variant: '5,000 Credits',
      stripe_url: 'https://buy.stripe.com/5kQ00j48weRw36c0uE4ZG02',
      cashapp_url: 'https://cash.app/$3dcashin/20',
      requires_size: false
    },
    elite_rewards: {
      id: 'elite-rewards-pack',
      name: 'Elite Rewards Pack',
      price: 30,
      image: './eliterewards.png',
      variant: '10,000 Credits',
      stripe_url: 'https://buy.stripe.com/dRmbJ1gVieRwcGM1yI4ZG01',
      cashapp_url: 'https://cash.app/$3dcashin/30',
      requires_size: false
    }
  };

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function money(value) {
    return MONEY.format(Number(value) || 0);
  }

  function parsePrice(value) {
    const match = String(value || '').replace(/,/g, '').match(/[\d.]+/);
    return match ? Number(match[0]) : 0;
  }

  function itemKey(item) {
    return [item.id, item.variant || '', item.color || '', item.size || ''].join('|').toLowerCase();
  }

  function normalizeItem(input) {
    const item = Object.assign({
      id: '',
      name: '',
      price: 0,
      image: '',
      size: '',
      variant: '',
      color: '',
      stripe_url: '',
      cashapp_url: '',
      quantity: 1
    }, input || {});

    item.id = cleanText(item.id || item.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    item.name = cleanText(item.name);
    item.price = Number(item.price) || 0;
    item.quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    item.size = cleanText(item.size);
    item.variant = cleanText(item.variant);
    item.color = cleanText(item.color);
    item.stripe_url = cleanText(item.stripe_url);
    item.cashapp_url = cleanText(item.cashapp_url);
    return item;
  }

  function showToast(message) {
    let toast = $('.capo-cart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'capo-cart-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('capo-cart-show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('capo-cart-show');
    }, 2400);
  }

  function ensureCartShell() {
    if (!$('#cartOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'cartOverlay';
      overlay.className = 'capo-cart-overlay';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', closeCart);
    }

    if (!$('#cartDrawer')) {
      const drawer = document.createElement('aside');
      drawer.id = 'cartDrawer';
      drawer.className = 'capo-cart-drawer';
      drawer.setAttribute('aria-hidden', 'true');
      drawer.innerHTML = [
        '<div class="capo-cart-head">',
        '<button class="capo-cart-close" id="closeCart" type="button" aria-label="Close cart">X</button>',
        '<h2 class="capo-cart-title">Shopping Cart</h2>',
        '<p class="capo-cart-notice">Checkout uses the existing secure payment link for each product. Your cart stays saved while you complete payment.</p>',
        '</div>',
        '<div class="capo-cart-items" id="cartItems"></div>',
        '<div class="capo-cart-footer">',
        '<div class="capo-cart-total-row"><span>Total</span><strong id="cartTotal">$0.00</strong></div>',
        '<button id="clearCart" type="button">Empty Cart</button>',
        '</div>'
      ].join('');
      document.body.appendChild(drawer);
    }

    const close = $('#closeCart');
    const clear = $('#clearCart');
    if (close && !close.dataset.capoCartBound) {
      close.dataset.capoCartBound = '1';
      close.addEventListener('click', closeCart);
    }
    if (clear && !clear.dataset.capoCartBound) {
      clear.dataset.capoCartBound = '1';
      clear.addEventListener('click', clearCart);
    }
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      cart = Array.isArray(parsed) ? parsed.map(normalizeItem).filter(function (item) {
        return item.id && item.name && item.price > 0;
      }) : [];
    } catch (error) {
      cart = [];
    }
    renderCart();
    return cart;
  }

  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function addToCart(input) {
    const item = normalizeItem(input);
    if (!item.name || item.price <= 0) {
      showToast('This item is not available for cart checkout.');
      return false;
    }
    if (input && input.requires_size && !item.size) {
      showToast('Choose a size before adding this shirt.');
      return false;
    }
    const key = itemKey(item);
    const existing = cart.find(function (entry) {
      return itemKey(entry) === key;
    });
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      cart.push(item);
    }
    saveCart();
    renderCart();
    showToast(item.name + ' added to cart.');
    return true;
  }

  function removeFromCart(key) {
    cart = cart.filter(function (entry) {
      return itemKey(entry) !== key;
    });
    saveCart();
    renderCart();
  }

  function updateQty(key, qty) {
    const nextQty = parseInt(qty, 10) || 0;
    if (nextQty <= 0) {
      removeFromCart(key);
      return;
    }
    const item = cart.find(function (entry) {
      return itemKey(entry) === key;
    });
    if (!item) return;
    item.quantity = nextQty;
    saveCart();
    renderCart();
  }

  function clearCart() {
    cart = [];
    saveCart();
    renderCart();
  }

  function cartTotal() {
    return cart.reduce(function (sum, item) {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
    }, 0);
  }

  function updateCartCount() {
    $all('#cartCount').forEach(function (count) {
      count.textContent = cart.reduce(function (sum, item) {
        return sum + (Number(item.quantity) || 0);
      }, 0);
    });
  }

  function renderCart() {
    ensureCartShell();
    const items = $('#cartItems');
    const total = $('#cartTotal');
    if (!items || !total) return;

    if (!cart.length) {
      items.innerHTML = '<div class="capo-cart-empty">Your cart is empty.</div>';
    } else {
      items.innerHTML = cart.map(function (item) {
        const key = itemKey(item);
        const meta = [item.variant || item.color, item.size ? 'Size ' + item.size : ''].filter(Boolean).join(' / ');
        const stripe = item.stripe_url
          ? '<a class="capo-cart-pay-link capo-cart-stripe" href="' + item.stripe_url + '" target="_blank" rel="noopener">Pay With Stripe</a>'
          : '<span class="capo-cart-unavailable">Payment Link Unavailable</span>';
        const cash = item.cashapp_url
          ? '<a class="capo-cart-pay-link capo-cart-cash" href="' + item.cashapp_url + '" target="_blank" rel="noopener">Pay With Cash App</a>'
          : '<span class="capo-cart-unavailable">Payment Link Unavailable</span>';
        return [
          '<article class="capo-cart-item" data-key="' + encodeURIComponent(key) + '">',
          '<img src="' + item.image + '" alt="">',
          '<div>',
          '<p class="capo-cart-item-title">' + item.name + '</p>',
          meta ? '<div class="capo-cart-meta">' + meta + '</div>' : '',
          '<div class="capo-cart-line">' + money(item.price) + ' each / Subtotal ' + money(item.price * item.quantity) + '</div>',
          '<div class="capo-cart-qty-row">',
          '<span class="capo-cart-qty-controls">',
          '<button type="button" data-cart-action="dec">-</button>',
          '<strong>' + item.quantity + '</strong>',
          '<button type="button" data-cart-action="inc">+</button>',
          '</span>',
          '<button class="capo-cart-remove" type="button" data-cart-action="remove">Remove</button>',
          '</div>',
          '<div class="capo-cart-pay-row">' + stripe + cash + '</div>',
          '</div>',
          '</article>'
        ].join('');
      }).join('');
    }
    total.textContent = money(cartTotal());
    updateCartCount();
  }

  function openCart() {
    ensureCartShell();
    renderCart();
    const overlay = $('#cartOverlay');
    const drawer = $('#cartDrawer');
    if (overlay) overlay.classList.add('capo-cart-open');
    if (drawer) {
      drawer.classList.add('capo-cart-open');
      drawer.setAttribute('aria-hidden', 'false');
    }
  }

  function closeCart() {
    const overlay = $('#cartOverlay');
    const drawer = $('#cartDrawer');
    if (overlay) overlay.classList.remove('capo-cart-open');
    if (drawer) {
      drawer.classList.remove('capo-cart-open');
      drawer.setAttribute('aria-hidden', 'true');
    }
  }

  function bindCartEvents() {
    document.addEventListener('click', function (event) {
      const cartButton = event.target.closest('#cartButton');
      if (cartButton) {
        event.preventDefault();
        openCart();
        return;
      }

      const cartItem = event.target.closest('.capo-cart-item');
      const action = event.target.getAttribute('data-cart-action');
      if (cartItem && action) {
        const key = decodeURIComponent(cartItem.getAttribute('data-key') || '');
        const item = cart.find(function (entry) {
          return itemKey(entry) === key;
        });
        if (!item) return;
        if (action === 'inc') updateQty(key, item.quantity + 1);
        if (action === 'dec') updateQty(key, item.quantity - 1);
        if (action === 'remove') removeFromCart(key);
      }
    });
  }

  function getSelectedModalSize() {
    const sizes = $('#modalSizes');
    if (!sizes) return '';
    const chosen = sizes.querySelector('button.gold');
    return chosen ? cleanText(chosen.textContent) : '';
  }

  function getSelectedModalVariant() {
    const variants = $('#modalVariants');
    if (!variants) return '';
    const chosen = variants.querySelector('button.gold') || variants.querySelector('button');
    return chosen ? cleanText(chosen.textContent) : '';
  }

  function modalProductFromCurrentState() {
    const mapped = PRODUCT_LINKS[currentModalProductKey] || {};
    const name = cleanText($('#modalName') && $('#modalName').textContent) || mapped.name;
    const price = parsePrice($('#modalPrice') && $('#modalPrice').textContent) || mapped.price;
    const image = ($('#modalImage') && $('#modalImage').getAttribute('src')) || mapped.image;
    const variant = getSelectedModalVariant() || mapped.variant;
    const isShirt = /tee|shirt/i.test(name);
    return Object.assign({}, mapped, {
      id: mapped.id || name,
      name: mapped.name || name,
      price: price,
      image: image,
      variant: variant,
      size: isShirt ? getSelectedModalSize() : '',
      requires_size: isShirt,
      stripe_url: mapped.stripe_url || '',
      cashapp_url: mapped.cashapp_url || ''
    });
  }

  function addModalCartButton() {
    const buyButton = $('#modalBuyButton');
    if (!buyButton || $('#modalAddToCartButton')) return;
    const button = document.createElement('button');
    button.className = 'capo-cart-add-button';
    button.id = 'modalAddToCartButton';
    button.type = 'button';
    button.textContent = 'Add To Cart';
    buyButton.insertAdjacentElement('afterend', button);
    button.addEventListener('click', function () {
      const product = modalProductFromCurrentState();
      if (product.requires_size && !modalSizeWasChosen) {
        showToast('Choose a size before adding this shirt.');
        return;
      }
      if (addToCart(product)) openCart();
    });
  }

  function setupIndexCart() {
    addModalCartButton();

    document.addEventListener('click', function (event) {
      const opener = event.target.closest('.merch-options-btn');
      if (opener) {
        currentModalProductKey = opener.getAttribute('data-product') || '';
        modalSizeWasChosen = false;
        window.setTimeout(addModalCartButton, 80);
      }

      const sizeButton = event.target.closest('#modalSizes button');
      if (sizeButton) {
        modalSizeWasChosen = true;
      }

      const indexAdd = event.target.closest('[data-capo-index-add]');
      if (indexAdd) {
        event.preventDefault();
        const key = indexAdd.getAttribute('data-capo-index-add');
        const linkedOpener = indexAdd.closest('.product') && indexAdd.closest('.product').querySelector('.merch-options-btn');
        if (linkedOpener) {
          currentModalProductKey = linkedOpener.getAttribute('data-product') || key;
          modalSizeWasChosen = false;
          linkedOpener.click();
          window.setTimeout(function () {
            showToast('Choose a size, then tap Add To Cart.');
          }, 120);
          return;
        }
        if (PRODUCT_LINKS[key] && addToCart(PRODUCT_LINKS[key])) openCart();
      }
    }, true);

    $all('#merch .product').forEach(function (card) {
      if (card.querySelector('.capo-cart-add-button')) return;
      const price = cleanText($('.price', card) && $('.price', card).textContent);
      if (/coming soon/i.test(price + ' ' + cleanText(card.textContent))) return;
      let key = '';
      const opener = $('.merch-options-btn', card);
      const name = cleanText($('.name', card) && $('.name', card).textContent);
      if (opener) key = opener.getAttribute('data-product') || '';
      if (/mini cd/i.test(name)) key = 'mini_cd';
      if (/mini vinyl/i.test(name)) key = 'mini_vinyl';
      if (!key) return;
      const actions = $('.actions', card) || card;
      const button = document.createElement('button');
      button.className = 'capo-cart-add-button';
      button.type = 'button';
      button.textContent = 'Add To Cart';
      button.setAttribute('data-capo-index-add', key);
      actions.appendChild(button);
    });
  }

  function buyPageKeyFromTitle(title) {
    const text = title.toLowerCase();
    if (text.includes('fly and legendary black')) return 'alien';
    if (text.includes('fly and legendary white')) return 'fly';
    if (text.includes('smokin')) return 'smokin';
    if (text.includes('royals')) return 'coming1';
    if (text.includes('stay in my bag')) return 'coming2';
    if (text.includes('mini cd')) return 'mini_cd';
    if (text.includes('mini vinyl')) return 'mini_vinyl';
    if (text.includes('entry access')) return 'entry_access';
    if (text.includes('gold access')) return 'gold_access';
    if (text.includes('elite access')) return 'elite_access';
    if (text.includes('entry rewards')) return 'entry_rewards';
    if (text.includes('gold rewards')) return 'gold_rewards';
    if (text.includes('elite rewards')) return 'elite_rewards';
    return '';
  }

  function itemFromBuyCard(card) {
    const title = cleanText($('h2', card) && $('h2', card).textContent);
    const key = buyPageKeyFromTitle(title);
    const mapped = PRODUCT_LINKS[key] || {};
    const image = $('img', card);
    const price = parsePrice($('.price', card) && $('.price', card).textContent) || mapped.price;
    const cash = $('.cash-btn', card);
    const stripe = $('.stripe-btn', card);
    const sizeSelect = $('.capo-cart-size-select', card);
    const isShirt = Boolean(mapped.requires_size);
    return Object.assign({}, mapped, {
      id: mapped.id || title,
      name: mapped.name || title,
      price: price,
      image: image ? image.getAttribute('src') : mapped.image,
      size: isShirt && sizeSelect ? sizeSelect.value : '',
      stripe_url: stripe ? stripe.href : mapped.stripe_url,
      cashapp_url: cash ? cash.href : mapped.cashapp_url,
      requires_size: isShirt
    });
  }

  function setupBuyPageCart() {
    const cards = $all('article.card');
    cards.forEach(function (card) {
      if (card.querySelector('.capo-cart-add-button')) return;
      if (/coming soon/i.test(cleanText(card.textContent)) && !$('.stripe-btn', card) && !$('.cash-btn', card)) return;
      const title = cleanText($('h2', card) && $('h2', card).textContent);
      const key = buyPageKeyFromTitle(title);
      if (!key || !PRODUCT_LINKS[key]) return;
      const payRow = $('.pay-row', card);
      if (!payRow) return;
      if (PRODUCT_LINKS[key].requires_size && !$('.capo-cart-size-select', card)) {
        const select = document.createElement('select');
        select.className = 'capo-cart-size-select';
        select.setAttribute('aria-label', 'Choose size for ' + title);
        select.innerHTML = '<option value="">Choose Size</option>' + SHIRT_SIZES.map(function (size) {
          return '<option value="' + size + '">' + size + '</option>';
        }).join('');
        payRow.insertAdjacentElement('beforebegin', select);
      }
      const button = document.createElement('button');
      button.className = 'capo-cart-add-button';
      button.type = 'button';
      button.textContent = 'Add To Cart';
      button.addEventListener('click', function () {
        const item = itemFromBuyCard(card);
        if (addToCart(item)) openCart();
      });
      payRow.appendChild(button);
    });
  }

  function init() {
    ensureCartShell();
    bindCartEvents();
    loadCart();
    setupIndexCart();
    setupBuyPageCart();
  }

  window.loadCart = loadCart;
  window.saveCart = saveCart;
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateQty = updateQty;
  window.renderCart = renderCart;
  window.openCart = openCart;
  window.closeCart = closeCart;
  window.clearCart = clearCart;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
