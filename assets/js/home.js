/* Home page: product gallery, option pickers, add to cart, accordions, scroll reveal, mobile buy bar. */
(function () {
  'use strict';

  var Perch = window.Perch;
  var product = Perch.product;
  var money = Perch.money;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  var state = { color: 'gray', size: 'm', qty: 1, thumb: 0 };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var mainImg = $('[data-gallery-main]');
  var thumbsEl = $('[data-gallery-thumbs]');
  var priceEl = $('[data-price]');
  var colorName = $('[data-color-name]');
  var sizeName = $('[data-size-name]');
  var qtyEl = $('[data-qty]');
  var addBtn = $('[data-add]');
  var addLabel = $('[data-add-label]');

  var colorById = {}; product.colors.forEach(function (c) { colorById[c.id] = c; });
  var sizeById = {}; product.sizes.forEach(function (s) { sizeById[s.id] = s; });
  var current = function () { return product.variants.find(function (v) { return v.color === state.color && v.size === state.size; }); };

  /* ---------- option pickers ---------- */
  var colorWrap = $('[data-color-options]');
  colorWrap.innerHTML = product.colors.map(function (c) {
    return '<label class="chip"><input type="radio" name="color" value="' + c.id + '"' + (c.id === state.color ? ' checked' : '') + '>' +
      '<span class="chip__face"><span class="chip__swatch" style="background:' + c.hex + '"></span>' + c.name + '</span></label>';
  }).join('');

  var sizeWrap = $('[data-size-options]');
  sizeWrap.innerHTML = product.sizes.map(function (s) {
    return '<label class="chip chip--size"><input type="radio" name="size" value="' + s.id + '"' + (s.id === state.size ? ' checked' : '') + '>' +
      '<span class="chip__face"><strong>' + s.name + '</strong><small>' + s.shelves + ' shelves</small><small>' + s.height + ' cm tall</small>' +
      '<span class="chip__price">' + money(Math.round(s.price * 100)) + '</span></span></label>';
  }).join('');

  colorWrap.addEventListener('change', function (e) { state.color = e.target.value; state.thumb = 0; update(true); });
  sizeWrap.addEventListener('change', function (e) { state.size = e.target.value; state.thumb = 0; update(true); });

  /* ---------- gallery ---------- */
  function gallerySources() {
    var v = current();
    var vLabel = colorById[state.color].name.toLowerCase() + ' hanging organizer, ' + sizeById[state.size].name.toLowerCase() + ', ' + sizeById[state.size].shelves + ' shelves';
    return [{ src: v.image, alt: vLabel.charAt(0).toUpperCase() + vLabel.slice(1), pos: '50% 50%' }]
      .concat(product.gallery.map(function (g) { return { src: g.src, alt: g.alt, pos: g.pos || '50% 50%' }; }));
  }

  function renderThumbs() {
    var items = gallerySources();
    thumbsEl.innerHTML = items.map(function (g, i) {
      return '<li><button class="thumb" type="button" data-thumb="' + i + '" aria-label="Show photo ' + (i + 1) + ' of ' + items.length + '"' +
        (i === state.thumb ? ' aria-current="true"' : '') + '><img src="' + g.src + '" alt="" width="76" height="76" loading="lazy" decoding="async" style="object-position:' + g.pos + '"></button></li>';
    }).join('');
  }

  function showMain(animate) {
    var g = gallerySources()[state.thumb];
    var apply = function () { mainImg.src = g.src; mainImg.alt = g.alt; mainImg.style.objectPosition = g.pos; };
    if (!animate || reduceMotion || mainImg.getAttribute('src') === g.src) { apply(); return; }
    var pre = new Image();
    pre.onload = pre.onerror = function () {
      mainImg.classList.add('is-swapping');
      setTimeout(function () { apply(); requestAnimationFrame(function () { mainImg.classList.remove('is-swapping'); }); }, 120);
    };
    pre.src = g.src;
  }

  thumbsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-thumb]');
    if (!b) return;
    state.thumb = +b.getAttribute('data-thumb');
    renderThumbs(); showMain(true);
  });

  /* ---------- state -> UI ---------- */
  var buybarPrice = $('[data-buybar-price]');
  var buybarLabel = $('[data-buybar-label]');

  function update(animateMain) {
    var v = current();
    var c = colorById[state.color], s = sizeById[state.size];
    priceEl.textContent = money(Math.round(v.price * 100));
    colorName.textContent = c.name;
    sizeName.textContent = s.name + ', ' + s.shelves + ' shelves';
    qtyEl.textContent = state.qty;
    $('[data-qty-minus]').disabled = state.qty <= 1;
    $('[data-qty-plus]').disabled = state.qty >= Perch.cart.MAX_QTY;
    if (buybarPrice) { buybarPrice.textContent = money(Math.round(v.price * 100)); buybarLabel.textContent = c.name + ', ' + s.name; }
    renderThumbs(); showMain(animateMain);
  }

  $('[data-qty-minus]').addEventListener('click', function () { state.qty = Math.max(1, state.qty - 1); update(false); });
  $('[data-qty-plus]').addEventListener('click', function () { state.qty = Math.min(Perch.cart.MAX_QTY, state.qty + 1); update(false); });

  /* ---------- add to cart ---------- */
  var resetTimer = 0;
  function addToCart() {
    var v = current();
    Perch.cart.add(v.id, state.qty);
    Perch.cart.announce(state.qty + ' added to cart');
    addBtn.classList.add('is-done');
    addLabel.textContent = 'Added';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(function () { addBtn.classList.remove('is-done'); addLabel.textContent = 'Add to cart'; }, 1400);
    Perch.cart.openDrawer();
  }
  addBtn.addEventListener('click', addToCart);
  var barAdd = $('[data-buybar-add]');
  if (barAdd) barAdd.addEventListener('click', addToCart);

  /* ---------- accordions ---------- */
  document.querySelectorAll('[data-acc]').forEach(function (acc) {
    acc.addEventListener('click', function (e) {
      var btn = e.target.closest('.acc__btn');
      if (!btn) return;
      var item = btn.closest('.acc__item');
      var open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- scroll reveal (once) ---------- */
  var revealEls = document.querySelectorAll('[data-reveal], [data-reveal-clip]');
  if ('IntersectionObserver' in window) {
    var idx = new Map();
    revealEls.forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.hasAttribute('data-reveal'); });
      el.style.setProperty('--d', Math.max(0, sibs.indexOf(el)) * 60 + 'ms');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- sticky mobile buy bar ---------- */
  var bar = $('[data-buybar]');
  var box = $('#buybox');
  if (bar && box && 'IntersectionObserver' in window) {
    bar.hidden = false;
    new IntersectionObserver(function (entries) {
      var en = entries[0];
      bar.classList.toggle('is-in', !en.isIntersecting && en.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(box);
  }

  update(false);
})();
