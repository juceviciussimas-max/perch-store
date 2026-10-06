/* Home page: shop logic and the desktop scroll story. Touch devices use native scrolling. */
(function () {
  'use strict';

  var Perch = window.Perch;
  var product = Perch.product;
  var money = Perch.money;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var hasGsap = !!(window.gsap && window.ScrollTrigger) && !reduceMotion && !isTouch && !saveData;
  if (!hasGsap) root.classList.add('no-motion');

  var state = { color: product.colors[0].id, size: 'm', qty: 1, thumb: 0 };
  var colorById = {}; product.colors.forEach(function (c) { colorById[c.id] = c; });
  var sizeById = {}; product.sizes.forEach(function (s) { sizeById[s.id] = s; });
  var current = function () { return product.variants.find(function (v) { return v.color === state.color && v.size === state.size; }); };
  var cents = function (n) { return Math.round(n * 100); };

  /* ---------- option pickers ---------- */
  var colorWrap = $('[data-color-options]');
  var sizeWrap = $('[data-size-options]');
  function renderOptions() {
    colorWrap.innerHTML = product.colors.map(function (c) {
      return '<label class="chip"><input type="radio" name="color" value="' + c.id + '"' + (c.id === state.color ? ' checked' : '') + '>' +
        '<span class="chip__face"><span class="chip__swatch" style="background:' + c.hex + '"></span>' + c.name + '</span></label>';
    }).join('');
    sizeWrap.innerHTML = product.sizes.map(function (s) {
      return '<label class="chip chip--size"><input type="radio" name="size" value="' + s.id + '"' + (s.id === state.size ? ' checked' : '') + '>' +
        '<span class="chip__face"><strong>' + s.name + '</strong><small>' + s.shelves + ' shelves</small><small>' + s.height + ' cm tall</small>' +
        '<span class="chip__price">' + money(cents(s.price)) + '</span></span></label>';
    }).join('');
  }
  renderOptions();
  colorWrap.addEventListener('change', function (e) { state.color = e.target.value; state.thumb = 0; update(true); });
  sizeWrap.addEventListener('change', function (e) { state.size = e.target.value; state.thumb = 0; update(true); });

  /* ---------- gallery ---------- */
  var mainImg = $('[data-gallery-main]');
  var thumbsEl = $('[data-gallery-thumbs]');
  function gallerySources() {
    var v = current(), c = colorById[state.color], s = sizeById[state.size];
    return [{ src: v.image, alt: c.name + ' hanging organizer, ' + s.name.toLowerCase() + ', ' + s.shelves + ' shelves', pos: '50% 50%' }]
      .concat(product.gallery.map(function (g) { return { src: g.src, alt: g.alt, pos: g.pos || '50% 50%' }; }));
  }
  function renderThumbs() {
    var items = gallerySources();
    thumbsEl.innerHTML = items.map(function (g, i) {
      return '<li><button class="thumb" type="button" data-thumb="' + i + '" aria-label="Show photo ' + (i + 1) + ' of ' + items.length + '"' +
        (i === state.thumb ? ' aria-current="true"' : '') + '><img src="' + g.src + '" alt="" width="74" height="74" loading="lazy" decoding="async" style="object-position:' + g.pos + '"></button></li>';
    }).join('');
  }
  function showMain(animate) {
    var g = gallerySources()[state.thumb];
    var apply = function () { mainImg.src = g.src; mainImg.alt = g.alt; mainImg.style.objectPosition = g.pos; };
    if (!animate || reduceMotion || mainImg.getAttribute('src') === g.src) { apply(); return; }
    var pre = new Image();
    pre.onload = pre.onerror = function () {
      mainImg.classList.add('is-swapping');
      setTimeout(function () { apply(); requestAnimationFrame(function () { mainImg.classList.remove('is-swapping'); }); }, 130);
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
  var priceEl = $('[data-price]'), colorName = $('[data-color-name]'), sizeName = $('[data-size-name]'), qtyEl = $('[data-qty]');
  var buybarPrice = $('[data-buybar-price]'), buybarLabel = $('[data-buybar-label]');
  function update(animateMain) {
    var v = current(), c = colorById[state.color], s = sizeById[state.size];
    priceEl.textContent = money(cents(v.price));
    colorName.textContent = c.name;
    sizeName.textContent = s.name + ', ' + s.shelves + ' shelves';
    qtyEl.textContent = state.qty;
    $('[data-qty-minus]').disabled = state.qty <= 1;
    $('[data-qty-plus]').disabled = state.qty >= Perch.cart.MAX_QTY;
    if (buybarPrice) { buybarPrice.textContent = money(cents(v.price)); buybarLabel.textContent = c.name + ', ' + s.name; }
    renderThumbs(); showMain(animateMain);
    document.querySelectorAll('[data-size-card]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-size-card') === state.size ? 'true' : 'false'); });
  }
  $('[data-qty-minus]').addEventListener('click', function () { state.qty = Math.max(1, state.qty - 1); update(false); });
  $('[data-qty-plus]').addEventListener('click', function () { state.qty = Math.min(Perch.cart.MAX_QTY, state.qty + 1); update(false); });

  function pickSize(id) {
    if (!sizeById[id]) return;
    state.size = id; state.thumb = 0;
    var input = sizeWrap.querySelector('input[value="' + id + '"]');
    if (input) input.checked = true;
    update(true);
  }

  /* ---------- add to cart ---------- */
  var addBtn = $('[data-add]'), addLabel = $('[data-add-label]'), resetTimer = 0;
  function addToCart() {
    var v = current();
    Perch.cart.add(v.id, state.qty);
    Perch.cart.announce(state.qty + ' added to cart');
    addBtn.classList.add('is-done'); addLabel.textContent = 'Added';
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
      if (window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 320);
    });
  });

  /* ---------- sizes drawn to scale (geometry from the catalog: 40 cm wide, 27 cm shelves) ---------- */
  var sizesEl = $('[data-sizes]');
  var K = 2; // svg units per cm
  var maxH = Math.max.apply(null, product.sizes.map(function (s) { return s.height; }));
  sizesEl.innerHTML = product.sizes.map(function (s) {
    var w = product.width * K, flap = (s.height - s.shelves * product.shelfHeight) * K, total = s.height * K;
    var x = 10, y0 = 22, inset = 6;
    var shelves = '';
    for (var i = 0; i < s.shelves; i++) {
      var ty = y0 + flap + i * product.shelfHeight * K;
      shelves += '<rect class="o-shelf" x="' + x + '" y="' + (ty + product.shelfHeight * K - 6) + '" width="' + w + '" height="6"/>' +
        '<path class="o-line" pathLength="1" d="M' + x + ' ' + (ty + product.shelfHeight * K) + ' H' + (x + w) + '"/>';
    }
    var body = 'M' + x + ' ' + (y0 + flap) + ' V' + (y0 + total) + ' H' + (x + w) + ' V' + (y0 + flap);
    var flapPath = 'M' + (x + inset) + ' ' + y0 + ' H' + (x + w - inset) + ' L' + (x + w) + ' ' + (y0 + flap) + ' H' + x + ' Z';
    var hook = 'M' + (x + w / 2) + ' ' + y0 + ' V' + (y0 - 8) + ' a6 6 0 1 1 6 -6';
    var vbH = maxH * K + 40;
    return '<button class="size-card" type="button" data-size-card="' + s.id + '" aria-pressed="false">' +
      '<svg viewBox="0 0 ' + (w + 20) + ' ' + vbH + '" role="img" aria-label="' + s.name + ' organizer, ' + s.height + ' cm tall, drawn to scale">' +
        '<rect class="o-fill" x="' + x + '" y="' + (y0 + flap) + '" width="' + w + '" height="' + (total - flap) + '"/>' +
        shelves +
        '<path class="o-flap" d="' + flapPath + '"/>' +
        '<path class="o-line" pathLength="1" d="' + flapPath + '"/>' +
        '<path class="o-line" pathLength="1" d="' + body + '"/>' +
        '<path class="o-line" pathLength="1" d="' + hook + '"/>' +
      '</svg>' +
      '<span class="size-card__name">' + s.name + '</span>' +
      '<span class="size-card__meta">' + s.shelves + ' shelves, ' + s.height + ' cm, ' + money(cents(s.price)) + '</span>' +
      '<span class="size-card__cta">Choose ' + s.name.toLowerCase() + '</span>' +
    '</button>';
  }).join('');
  sizesEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-size-card]');
    if (!b) return;
    pickSize(b.getAttribute('data-size-card'));
    scrollToEl($('#shop'));
  });

  /* ---------- smooth scroll + anchors ---------- */
  function scrollToEl(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-scroll-to]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id.charAt(0) !== '#') return;
    e.preventDefault();
    if (a.hasAttribute('data-pick-size')) pickSize(a.getAttribute('data-pick-size'));
    scrollToEl($(id));
  });

  /* ---------- header turns solid after the hero ---------- */
  var header = $('[data-header]');
  var hero = $('[data-hero]');

  /* ---------- sticky mobile buy bar ---------- */
  var bar = $('[data-buybar]'), box = $('#buybox');
  if (bar && box && 'IntersectionObserver' in window) {
    bar.hidden = false;
    new IntersectionObserver(function (entries) {
      var en = entries[0];
      bar.classList.toggle('is-in', !en.isIntersecting && en.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(box);
  }

  update(false);

  /* ---------- scroll story ---------- */
  function ready() { requestAnimationFrame(function () { root.classList.add('is-ready'); }); }

  if (!hasGsap) {
    ready();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { header.classList.toggle('is-solid', !en[0].isIntersecting); }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
    }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: hero, start: 'bottom top+=80', end: 'max',
    onToggle: function (self) { header.classList.toggle('is-solid', self.isActive); }
  });

  // 1. Hero: pin, push the camera into the closet, swap the message.
  var heroTl = gsap.timeline({
    scrollTrigger: { trigger: hero, start: 'top top', end: '+=85%', scrub: 0.15, pin: '.hero__stage', anticipatePin: 1 }
  });
  heroTl
    .to('[data-hero-media]', { scale: 1.32, yPercent: -4, ease: 'none', duration: 1 }, 0)
    .to('.hero__veil', { opacity: 0, ease: 'none', duration: 0.5 }, 0)
    .to('[data-hero-copy]', { yPercent: -18, autoAlpha: 0, ease: 'power1.in', duration: 0.42 }, 0.05)
    .fromTo('[data-hero-after]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.35 }, 0.55);

  // 2. Before / after: pin and wipe the pile away.
  var baBefore = $('[data-ba-before]'), baAfter = $('[data-ba-after]');
  gsap.timeline({
    scrollTrigger: {
      trigger: '[data-ba]', start: 'top top', end: '+=90%', scrub: 0.15, pin: '.ba__stage', anticipatePin: 1,
      onUpdate: function (self) {
        var after = self.progress > 0.55;
        baAfter.classList.toggle('is-active', after);
        baBefore.classList.toggle('is-active', !after);
      }
    }
  })
    .set('[data-ba-handle]', { opacity: 1 }, 0)
    .fromTo('[data-ba-reveal]', { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', ease: 'none', duration: 1 }, 0.1)
    .fromTo('[data-ba-handle]', { left: '100%' }, { left: '0%', ease: 'none', duration: 1 }, 0.1)
    .to('[data-ba-handle]', { opacity: 0, duration: 0.08 }, 1.1);

  // 3. Details: vertical scroll drives a horizontal strip (desktop only; touch gets native swipe).
  var track = $('[data-details-track]');
  gsap.to(track, {
    x: function () { return -Math.max(0, track.scrollWidth - window.innerWidth); },
    ease: 'none',
    scrollTrigger: { trigger: '[data-details]', start: 'top top', end: function () { return '+=' + Math.max(1, track.scrollWidth - window.innerWidth); }, scrub: 0.15, pin: '.details__pin', invalidateOnRefresh: true, anticipatePin: 1 }
  });

  // 4. Sizes: outlines draw themselves, small to large.
  var lines = gsap.utils.toArray('.size-card .o-line');
  gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set('.size-card .o-fill, .size-card .o-flap, .size-card .o-shelf', { opacity: 0 });
  ScrollTrigger.create({
    trigger: sizesEl, start: 'top 75%', once: true,
    onEnter: function () {
      gsap.utils.toArray('.size-card').forEach(function (card, i) {
        gsap.to(card.querySelectorAll('.o-line'), { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', delay: i * 0.15, stagger: 0.05 });
        gsap.to(card.querySelectorAll('.o-fill, .o-flap, .o-shelf'), { opacity: 1, duration: 0.8, ease: 'power1.out', delay: 0.7 + i * 0.15 });
      });
    }
  });

  // 5. Editorial photo drifts slower than the page.
  gsap.fromTo('[data-parallax] img', { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '[data-parallax]', start: 'top bottom', end: 'bottom top', scrub: true } });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  ready();
})();
