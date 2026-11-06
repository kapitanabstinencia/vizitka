// Kapitánov prehľad: údaje vydá databáza len účtu zapísanému v tabuľke admini
(function () {
  var esc = KA.esc, toast = KA.toast;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var POZOR = /nechcem žiť|nechcem zit|zabiť sa|zabit sa|samovra|ublížiť si|ublizit si|skonč(iť|ím) so životom|skoncit so zivotom|nemá zmysel žiť|nema zmysel zit|napil|recidív|recidiv|zlyhal/i;
  var STAV = { alert: ['Pozor', 'crit'], smutny: ['Klesá nálada', 'warn'], inactive: ['Nepíše 3+ dni', 'warn'], missed: ['Vynechal deň', ''], nezacal: ['Ešte nezačal', ''], ok: ['Aktívny', 'ok'] };
  var PORADIE = ['alert', 'smutny', 'inactive', 'missed', 'nezacal', 'ok'];
  var NADPIS = { prehlad: 'Kto potrebuje postrčiť', denniky: 'Čaká na tvoju odpoveď', clenovia: 'Členovia' };
  var C = [], filter = null, vybrany = null, tab = 'prehlad';

  var odtien = function (h) { return Math.round((Math.min(Math.max(h, 1), 10) - 1) * 130 / 9); };
  function meno(c) { return c.prezyvka ? esc(c.prezyvka) + ' <span class="muted" style="font-weight:400">' + esc(c.email) + '</span>' : esc(c.email); }
  function kratke(c) { return esc(c.prezyvka || c.email); }
  function dnesnyDen(zaciatok) {
    var z = zaciatok.split('-'), t = new Date();
    return Math.min(91, Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(+z[0], z[1] - 1, +z[2])) / 864e5) + 1);
  }
  function datum(c, den) {
    var z = c.zaciatok.split('-'), d = new Date(+z[0], z[1] - 1, +z[2] + den - 1);
    return d.getDate() + '. ' + (d.getMonth() + 1) + '.';
  }
  function priprav(data) {
    C = data.clenovia.map(function (c) {
      c.zapisky = data.zapisky.filter(function (z) { return z.user_id === c.id; }).sort(function (a, b) { return b.den - a.den; });
      c.ulohy = data.ulohy.filter(function (u) { return u.user_id === c.id; }).sort(function (a, b) { return b.tyzden - a.tyzden; });
      prepocitaj(c);
      return c;
    });
    C.sort(function (a, b) { return PORADIE.indexOf(a.stav) - PORADIE.indexOf(b.stav); });
    if (C.length && !vybrany) vybrany = C[0].id;
  }
  function prepocitaj(c) {
    c.hotove = c.ulohy.filter(function (u) { return u.hotove; }).length;
    c.caka = c.zapisky.filter(function (z) { return z.text && !z.odpoved; });
    c.pocet = c.zapisky.filter(function (z) { return z.text; }).length;
    var hod = c.zapisky.filter(function (z) { return z.hodnotenie != null; });
    // Klesá nálada: posledné tri hodnotenia 3 a menej
    c.smutny = hod.length >= 3 && hod.slice(0, 3).every(function (z) { return z.hodnotenie <= 3; });
    if (!c.zaciatok) { c.stav = 'nezacal'; return; }
    c.den = dnesnyDen(c.zaciatok);
    c.tyzden = Math.min(13, Math.ceil(c.den / 7));
    var odPosledneho = c.den - (c.zapisky.length ? c.zapisky[0].den : 0);
    c.stav = c.caka.some(function (z) { return POZOR.test(z.text); }) ? 'alert' : c.smutny ? 'smutny' : odPosledneho >= 3 ? 'inactive' : odPosledneho === 2 ? 'missed' : 'ok';
  }
  function chip(z) { return z.hodnotenie == null ? '' : ' · <span class="hchip" style="--h:' + odtien(z.hodnotenie) + '">' + z.hodnotenie + '/10</span>'; }
  function zapisHtml(c, z) {
    var vd = (z.vdacnosti || []).filter(Boolean);
    return '<div class="entry' + (z.text && !z.odpoved && POZOR.test(z.text) ? ' crit' : '') + '" data-clen="' + C.indexOf(c) + '" data-den="' + z.den + '">' +
      '<div class="meta">Deň ' + z.den + ' · ' + datum(c, z.den) + chip(z) + '</div>' +
      (z.text ? '<div style="white-space:pre-wrap">' + esc(z.text) + '</div>' : '<div class="muted">Len hodnotenie dňa, bez zápisu.</div>') +
      (vd.length ? '<div class="muted" style="font-size:14px">Vďačnosti: ' + vd.map(esc).join(' · ') + '</div>' : '') +
      (!z.text ? '</div>' : '<textarea aria-label="Odpoveď na deň ' + z.den + '" maxlength="5000" placeholder="Tvoja odpoveď…">' + esc(z.odpoved || '') + '</textarea>' +
      '<div style="display:flex;justify-content:flex-end"><button type="button" class="btn small" data-odpovedz>' + (z.odpoved ? 'Uložiť úpravu' : 'Odpovedať') + '</button></div></div>');
  }
  function ulohaHtml(u) {
    var zad = ULOHY[u.tyzden - 1], odp = u.odpovede || {};
    return '<div class="entry uloha-odp"><div class="meta">Týždenná úloha · ' + esc(zad.t) + ' · ' + (u.hotove ? 'hotová ✓' : 'rozpracovaná') + '</div>' +
      zad.f.map(function (p, i) { return odp[i] ? '<div><div class="muted">' + esc(p[1]) + '</div><div style="white-space:pre-wrap">' + esc(odp[i]) + '</div></div>' : ''; }).join('') + '</div>';
  }

  // Malý graf nálady: bodka a pri nej číslo
  function grafNalady(c) {
    var box = $('#clGraf');
    if (!box || !c.zapisky) return;
    var body = c.zapisky.filter(function (z) { return z.hodnotenie != null; }).slice().reverse();
    if (!body.length) { box.innerHTML = '<p class="muted" style="margin:0">Zatiaľ nehodnotil žiadny deň.</p>'; return; }
    var W = box.clientWidth || 300, H = 120, L = 14, R = 14, T = 24, B = 20, N = Math.max(c.den || 1, 7);
    var x = function (d) { return L + (d - 1) / (N - 1) * (W - L - R); }, y = function (v) { return T + (10 - Math.min(Math.max(v, 1), 10)) / 9 * (H - T - B); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Hodnotenie dní">';
    if (body.length > 1) s += '<polyline class="g-ciara" points="' + body.map(function (z) { return x(z.den) + ',' + y(z.hodnotenie); }).join(' ') + '"/>';
    body.forEach(function (z) {
      s += '<circle class="g-bod" cx="' + x(z.den) + '" cy="' + y(z.hodnotenie) + '" r="5" style="--h:' + odtien(z.hodnotenie) + '"><title>Deň ' + z.den + ': ' + z.hodnotenie + '/10</title></circle>';
      s += '<text class="g-cis" x="' + x(z.den) + '" y="' + (y(z.hodnotenie) - 10) + '" text-anchor="middle" style="--h:' + odtien(z.hodnotenie) + '">' + z.hodnotenie + '</text>';
    });
    for (var t = 1; (t - 1) * 7 + 1 <= N; t++) s += '<text class="g-den" x="' + x((t - 1) * 7 + 1) + '" y="' + (H - 4) + '" text-anchor="' + (t === 1 ? 'start' : 'middle') + '">T' + t + '</text>';
    box.innerHTML = s + '</svg>';
  }

  function renderPrehlad() {
    var pocet = function (k) { return C.filter(function (c) { return k === 'smutny' ? c.smutny : c.stav === k; }).length; };
    var cakajuce = C.reduce(function (s, c) { return s + c.caka.length; }, 0);
    var K = [['alert', 'Pozor', 'crit'], ['smutny', 'Klesá nálada', 'warn'], [null, 'Čaká na odpoveď', ''], ['ok', 'Aktívni', '']];
    $('#kpis').innerHTML = K.map(function (k) {
      return '<button type="button" class="kpi ' + k[2] + '" data-f="' + (k[0] || 'inbox') + '" aria-pressed="' + (k[0] !== null && filter === k[0]) + '"><b>' + (k[0] ? pocet(k[0]) : cakajuce) + '</b><span>' + k[1] + '</span></button>';
    }).join('');
    $$('.kpi').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.f === 'inbox') { location.hash = 'denniky'; return; }
        filter = filter === b.dataset.f ? null : b.dataset.f; renderPrehlad();
      };
    });
    $('#mrows').innerHTML = C.filter(function (c) { return !filter || c.stav === filter || (filter === 'smutny' && c.smutny); }).map(function (c) {
      var bar = '';
      for (var i = 6; i >= 0; i--) {
        var den = (c.den || 0) - i, ma = c.zapisky.some(function (z) { return z.den === den && z.text; });
        bar += '<i class="' + (ma ? 'w' : '') + '"></i>';
      }
      return '<tr data-i="' + C.indexOf(c) + '" tabindex="0" style="cursor:pointer"><td class="p-mail"><b>' + meno(c) + '</b></td>' +
        '<td class="num p-sk">' + (c.tyzden || '–') + ' / 13</td><td><div class="bar7">' + bar + '</div></td>' +
        '<td class="num p-sk">' + c.pocet + '</td><td class="num p-sk">' + c.hotove + '</td>' +
        '<td><span class="chip ' + STAV[c.stav][1] + '">' + STAV[c.stav][0] + '</span></td></tr>';
    }).join('') || '<tr><td colspan="6" class="muted">Nikto taký tu nie je.</td></tr>';
    $$('#mrows tr[data-i]').forEach(function (r) {
      r.onclick = function () { vybrany = C[+r.dataset.i].id; location.hash = 'clenovia'; };
      r.onkeydown = function (e) { if (e.key === 'Enter') r.click(); };
    });
  }

  function renderDenniky() {
    var cakajuce = [];
    C.forEach(function (c) { c.caka.forEach(function (z) { cakajuce.push({ c: c, z: z }); }); });
    cakajuce.sort(function (a, b) { return (POZOR.test(b.z.text) - POZOR.test(a.z.text)) || String(b.z.vytvorene || '').localeCompare(String(a.z.vytvorene || '')); });
    $('#inbox').innerHTML = cakajuce.map(function (x) {
      return '<div class="inbox-meno"><b>' + kratke(x.c) + '</b><button type="button" data-otvor="' + C.indexOf(x.c) + '">celý denník člena →</button></div>' + zapisHtml(x.c, x.z);
    }).join('') || '<div class="card" style="padding:24px"><p style="margin:0">Všetko zodpovedané. ✓</p></div>';
    $$('[data-otvor]').forEach(function (b) { b.onclick = function () { vybrany = C[+b.dataset.otvor].id; location.hash = 'clenovia'; }; });
  }

  function renderClenovia() {
    $('#clZoznam').innerHTML = C.map(function (c) {
      return '<button type="button" class="cl-polozka" data-i="' + C.indexOf(c) + '" aria-pressed="' + (c.id === vybrany) + '"><b>' + kratke(c) + '</b>' +
        '<small>' + (c.zaciatok ? 'deň ' + c.den + ' · týždeň ' + c.tyzden : 'ešte nezačal') + (c.caka.length ? ' · čaká ' + c.caka.length : '') + '</small>' +
        '<span><span class="chip ' + STAV[c.stav][1] + '">' + STAV[c.stav][0] + '</span></span></button>';
    }).join('') || '<p class="muted" style="margin:0">Zatiaľ tu nie je žiadny člen.</p>';
    $$('.cl-polozka').forEach(function (b) {
      b.onclick = function () { vybrany = C[+b.dataset.i].id; render(); if (window.innerWidth < 900) $('#detail').scrollIntoView({ behavior: 'smooth' }); };
    });
    var c = C.filter(function (x) { return x.id === vybrany; })[0];
    if (!c) { $('#detail').innerHTML = '<p class="muted" style="margin:0">Vyber člena zo zoznamu.</p>'; return; }
    // Po týždňoch od najnovšieho: úloha a pod ňou zápisy z toho týždňa
    var tyzdne = [];
    for (var t = c.tyzden || 0; t >= 1; t--) {
      var u = c.ulohy.filter(function (x) { return x.tyzden === t; })[0];
      var z = c.zapisky.filter(function (x) { return Math.ceil(x.den / 7) === t; });
      tyzdne.push('<div class="tyz-blok"><h3>Týždeň ' + t + '</h3>' + (u ? ulohaHtml(u) : '<p class="muted" style="margin:0">Úlohu ešte nevyplnil.</p>') +
        (z.map(function (x) { return zapisHtml(c, x); }).join('') || '<p class="muted" style="margin:0">V tomto týždni žiadny zápis.</p>') + '</div>');
    }
    $('#detail').innerHTML = '<div><p class="eyebrow" style="margin:0 0 8px">Člen</p><h2 class="p-mail" style="margin:0">' + kratke(c) + '</h2>' +
      (c.prezyvka ? '<div class="mono muted p-mail">' + esc(c.email) + '</div>' : '') + '</div>' +
      '<div class="mono muted">' + (c.zaciatok ? 'Deň ' + c.den + ' · týždeň ' + c.tyzden + ' · zápisy ' + c.pocet + ' · hotové úlohy ' + c.hotove : 'Výzvu ešte nezačal') + '</div>' +
      (c.smutny ? '<div class="smutny-box"><b>Klesá nálada.</b> Posledné tri hodnotenia sú 3 a menej. Ozvi sa mu.</div>' : '') +
      '<h3 style="margin:8px 0 0;font-size:18px">Nálada</h3><div class="graf" id="clGraf"></div>' +
      (tyzdne.join('') || '<p class="muted" style="margin:0">Zatiaľ nič.</p>');
    grafNalady(c);
  }

  function prepniTab() {
    var h = location.hash.replace('#', '');
    tab = NADPIS[h] ? h : 'prehlad';
    $$('[data-tab]').forEach(function (s) { s.hidden = s.dataset.tab !== tab; });
    $$('#nav [data-t]').forEach(function (a) { if (a.dataset.t === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('#aTitle').textContent = NADPIS[tab];
    $('#nav').classList.remove('open');
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    var cakajuce = C.reduce(function (s, c) { return s + c.caka.length; }, 0), np = $('#navPocet');
    np.hidden = !cakajuce; np.textContent = cakajuce; var mp = $('#menuPocet'); if (mp) { mp.hidden = !cakajuce; mp.textContent = cakajuce; }
    if (tab === 'prehlad') renderPrehlad();
    else if (tab === 'denniky') renderDenniky();
    else renderClenovia();
    $$('[data-odpovedz]').forEach(function (b) {
      b.onclick = function () {
        var box = b.closest('.entry'), clen = C[+box.dataset.clen], den = +box.dataset.den, text = box.querySelector('textarea').value.trim();
        if (!text) { toast('Napíš odpoveď'); return; }
        b.disabled = true;
        CLEN.db('rpc/admin_odpovedz', { method: 'POST', body: JSON.stringify({ p_clen: clen.id, p_den: den, p_odpoved: text }) }).then(function () {
          clen.zapisky.filter(function (z) { return z.den === den; })[0].odpoved = text;
          prepocitaj(clen); render(); toast('Odpoveď uložená, člen uvidí svietiaci pruh „Kapitán ti odpísal“');
        }).catch(function () { b.disabled = false; toast('Nepodarilo sa uložiť. Skús to znova.'); });
      };
    });
  }
  function hlaska(nadpis, text) {
    $('#aTitle').textContent = nadpis;
    $('#obsah').hidden = false;
    $('#obsah').innerHTML = '<div class="card" style="padding:28px;display:grid;gap:14px;justify-items:start"><p style="margin:0">' + text + '</p><button class="btn btn-primary" type="button" id="hlVon">Odhlásiť sa a prihlásiť ako Kapitán</button></div>';
    $('#hlVon').onclick = function () { CLEN.odhlas().then(function () { location.href = 'clenska.html'; }); };
  }

  $('#odhlas').onclick = function (e) { e.preventDefault(); CLEN.odhlas().then(function () { location.href = 'clenska.html'; }); };
  var cakaj;
  window.addEventListener('resize', function () { clearTimeout(cakaj); cakaj = setTimeout(function () { if (tab === 'clenovia') grafNalady(C.filter(function (x) { return x.id === vybrany; })[0] || {}); }, 200); });
  CLEN.relacia().then(function (r) {
    if (!r) { hlaska('Prihlás sa', 'Prehľad je len pre Kapitána.'); return; }
    return CLEN.db('rpc/admin_prehlad', { method: 'POST', body: '{}' }).then(function (data) {
      $('#obsah').hidden = false; priprav(data);
      window.addEventListener('hashchange', prepniTab);
      prepniTab();
    });
  }).catch(function (x) {
    if (/ 403$/.test(x.message)) hlaska('Sem nie', 'Si prihlásený ako člen. Prehľad otvorí len Kapitánov účet kapitanabstinencia@gmail.com.');
    else hlaska('Nepodarilo sa načítať', 'Obnov stránku. Ak to nepomôže, skús to o chvíľu.');
  });
})();
