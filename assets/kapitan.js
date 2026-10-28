/* Kapitán Abstinencia – spoločný skript: menu, jemný pohyb, svetlo za kurzorom */
(function () {
  var KA = window.KA = {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  KA.esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  };

  // Krátka hláška dole na stránke
  KA.toast = function (text) {
    var el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = text; el.hidden = false;
    clearTimeout(KA.toast.t);
    KA.toast.t = setTimeout(function () { el.hidden = true; }, 2800);
  };

  // Menu: pozadie po odscrollovaní, mobilné rozbalenie
  var bar = document.querySelector('.topbar');
  if (bar) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { bar.classList.toggle('scrolled', window.scrollY > 24); ticking = false; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    var tog = bar.querySelector('.menu-toggle');
    if (tog) {
      tog.addEventListener('click', function () {
        var open = bar.classList.toggle('open');
        tog.setAttribute('aria-expanded', open);
      });
      bar.querySelectorAll('.nav a').forEach(function (a) {
        a.addEventListener('click', function () { bar.classList.remove('open'); tog.setAttribute('aria-expanded', 'false'); });
      });
    }
  }

  // Svetlo za kurzorom (úvod) a svetlo na kartách – len myš, nie pri obmedzení pohybu
  if (finePointer && !reduce) {
    document.querySelectorAll('.cursor-glow').forEach(function (glow) {
      var host = glow.parentElement;
      var tx = 0, ty = 0, gx = 0, gy = 0, running = false;
      function follow() {
        gx += (tx - gx) * 0.08;
        gy += (ty - gy) * 0.08;
        glow.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px,0)';
        if (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) requestAnimationFrame(follow);
        else running = false;
      }
      host.addEventListener('pointermove', function (e) {
        var r = host.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (!host.classList.contains('lit')) { gx = tx; gy = ty; host.classList.add('lit'); }
        if (!running) { running = true; requestAnimationFrame(follow); }
      });
      host.addEventListener('pointerleave', function () { host.classList.remove('lit'); });
    });

    // Delegované, aby fungovalo aj na kartách vykreslených skriptom
    var last = null, queued = false;
    document.addEventListener('pointermove', function (e) {
      last = e;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        var card = last.target.closest && last.target.closest('.card');
        if (!card) return;
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (last.clientX - r.left) + 'px');
        card.style.setProperty('--my', (last.clientY - r.top) + 'px');
      });
    }, { passive: true });
  }

  // Objavenie pri scrollovaní a odpočítanie čísel
  KA.observe = function (root) {
    var items = (root || document).querySelectorAll('.reveal:not(.in), .zoom:not(.in)');
    var counters = (root || document).querySelectorAll('[data-count]');
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    // Čo je pri načítaní na obrazovke, ukáž hneď (bez čakania na observer)
    var vh = window.innerHeight || 800;
    items.forEach(function (el) { if (el.getBoundingClientRect().top < vh) el.classList.add('in'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });

    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, end = +el.dataset.count, suffix = el.dataset.suffix || '', start = null;
        var suffixHtml = suffix ? '<small>' + suffix + '</small>' : '';
        (function step(t) {
          if (t === undefined) return requestAnimationFrame(step);
          if (start === null) start = t;
          var p = Math.min((t - start) / 1200, 1);
          el.innerHTML = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffixHtml;
          if (p < 1) requestAnimationFrame(step);
        })();
        co.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  };
  KA.observe();
})();

// Mobil: tlačidlá „Čítaj ďalej“ pri zbalených textoch a nápoveda pri posúvacích kartách
(function () {
  document.querySelectorAll('.m-collapse').forEach(function (box) {
    var b = box.querySelector('.m-toggle'); if (!b) return;
    var zbalene = b.textContent;
    b.addEventListener('click', function () {
      var on = box.classList.toggle('open');
      b.textContent = on ? 'Zbaliť' : zbalene;
      b.setAttribute('aria-expanded', on);
    });
  });
  document.querySelectorAll('.voyage, .bento-features, .who-grid, .prices, .flip-grid, .life-grid, .bento, .club-grid').forEach(function (el) {
    var sec = el.closest('section') || el.parentNode;
    if (sec.querySelector('.m-swipe')) return;
    var p = document.createElement('p'); p.className = 'm-swipe'; p.setAttribute('aria-hidden', 'true');
    p.textContent = 'Potiahni prstom do strany →';
    el.parentNode.insertBefore(p, el);
  });
})();

// Mobil: balíky sa otvoria na PRO v strede
(function () {
  if (!window.matchMedia('(max-width: 700px)').matches) return;
  var go = function () {
    var box = document.querySelector('.prices'), pro = box && box.querySelector('.price.pro');
    if (!pro) return false;
    box.scrollLeft = pro.offsetLeft - (box.clientWidth - pro.offsetWidth) / 2;
    return true;
  };
  if (!go()) window.addEventListener('load', go);
})();

// Mobil: balík, ktorý je práve v strede obrazovky, sa jemne zväčší
(function () {
  if (!('IntersectionObserver' in window) || !window.matchMedia('(max-width: 700px)').matches) return;
  var start = function () {
    var box = document.querySelector('.prices'); if (!box || !box.querySelector('.price')) return false;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('active', e.intersectionRatio > .6); });
    }, { root: box, threshold: [0, .6, 1] });
    box.querySelectorAll('.price').forEach(function (c) { io.observe(c); });
    return true;
  };
  if (!start()) window.addEventListener('load', start);
})();

// Predávajúci a prevádzkovateľ – JEDINÉ miesto, kde sa tieto údaje menia (päta, obchodné podmienky, ochrana údajov)
(function () {
  var P = {
    meno: '[Meno a priezvisko]',
    adresa: '[Ulica a číslo, PSČ Obec]',
    ico: '[IČO]',
    register: '[Okresný úrad …, číslo živnostenského registra …]',
    dph: 'Predávajúci nie je platiteľom DPH.',
    soi: '[Inšpektorát SOI pre … kraj]',
    email: 'kapitanabstinencia@gmail.com',
    ucinnost: '[dátum]'
  };
  document.querySelectorAll('[data-p]').forEach(function (el) {
    var v = P[el.getAttribute('data-p')]; if (v == null) return;
    el.textContent = v;
    if (v.charAt(0) === '[') el.classList.add('ph');
  });
  document.querySelectorAll('a[data-p-mail]').forEach(function (a) { a.href = 'mailto:' + P.email; a.textContent = P.email; });
})();
