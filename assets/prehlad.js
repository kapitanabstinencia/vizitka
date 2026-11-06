// Kapitánov prehľad: údaje vydá databáza len účtu zapísanému v tabuľke admini
(function () {
  var esc = KA.esc, toast = KA.toast;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var POZOR = /nechcem žiť|nechcem zit|zabiť sa|zabit sa|samovra|ublížiť si|ublizit si|skonč(iť|ím) so životom|skoncit so zivotom|nemá zmysel žiť|nema zmysel zit|napil|recidív|recidiv|zlyhal/i;
  var STAV = { alert: ['Pozor', 'crit'], inactive: ['Nepíše 3+ dni', 'warn'], missed: ['Vynechal deň', ''], nezacal: ['Ešte nezačal', ''], ok: ['Aktívny', 'ok'] };
  var PORADIE = ['alert', 'inactive', 'missed', 'nezacal', 'ok'];
  var C = [], filter = null, vybrany = null;

  function meno(c) { return c.prezyvka ? esc(c.prezyvka) + ' <span class="muted" style="font-weight:400">' + esc(c.email) + '</span>' : esc(c.email); }
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
      c.ulohy = data.ulohy.filter(function (u) { return u.user_id === c.id; }).sort(function (a, b) { return a.tyzden - b.tyzden; });
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
    if (!c.zaciatok) { c.stav = 'nezacal'; return; }
    c.den = dnesnyDen(c.zaciatok);
    c.tyzden = Math.min(13, Math.ceil(c.den / 7));
    var odPosledneho = c.den - (c.zapisky.length ? c.zapisky[0].den : 0);
    c.stav = c.caka.some(function (z) { return POZOR.test(z.text); }) ? 'alert' : odPosledneho >= 3 ? 'inactive' : odPosledneho === 2 ? 'missed' : 'ok';
  }
  function zapisHtml(c, z) {
    var vd = (z.vdacnosti || []).filter(Boolean);
    return '<div class="entry' + (!z.odpoved && POZOR.test(z.text) ? ' crit' : '') + '" data-clen="' + C.indexOf(c) + '" data-den="' + z.den + '">' +
      '<div class="meta">' + 'Deň ' + z.den + ' · ' + datum(c, z.den) + (z.hodnotenie == null ? '' : ' · <span class="hchip" style="--h:' + Math.round((Math.max(z.hodnotenie, 1) - 1) * 130 / 9) + '">' + z.hodnotenie + '/10</span>') + '</div>' +
      (z.text ? '<div style="white-space:pre-wrap">' + esc(z.text) + '</div>' : '<div class="muted">Len hodnotenie dňa, bez zápisu.</div>') +
      (vd.length ? '<div class="muted" style="font-size:14px">Vďačnosti: ' + vd.map(esc).join(' · ') + '</div>' : '') +
      (!z.text ? '</div>' : '<textarea aria-label="Odpoveď na deň ' + z.den + '" maxlength="5000" placeholder="Tvoja odpoveď…">' + esc(z.odpoved || '') + '</textarea>' +
      '<div style="display:flex;justify-content:flex-end"><button type="button" class="btn small" data-odpovedz>' + (z.odpoved ? 'Uložiť úpravu' : 'Odpovedať') + '</button></div></div>');
  }
  function ulohyHtml(c) {
    if (!c.ulohy.length) return '<p class="muted" style="margin:0">Zatiaľ žiadna vyplnená úloha.</p>';
    return c.ulohy.map(function (u) {
      var zad = ULOHY[u.tyzden - 1], odp = u.odpovede || {};
      return '<details class="entry"><summary><b>Týždeň ' + u.tyzden + '</b> · ' + esc(zad.t) + (u.hotove ? ' ✓' : ' · rozpracované') + '</summary>' +
        zad.f.map(function (p, i) { return odp[i] ? '<div style="margin-top:10px"><div class="muted" style="font-size:13px">' + esc(p[1]) + '</div><div style="white-space:pre-wrap">' + esc(odp[i]) + '</div></div>' : ''; }).join('') + '</details>';
    }).join('');
  }
  function render() {
    var pocet = function (k) { return C.filter(function (c) { return c.stav === k; }).length; };
    var cakajuce = [];
    C.forEach(function (c) { c.caka.forEach(function (z) { cakajuce.push({ c: c, z: z }); }); });
    var K = [['alert', 'Pozor', 'crit'], ['inactive', 'Nepíšu 3+ dni', 'warn'], [null, 'Čaká na odpoveď', ''], ['ok', 'Aktívni', '']];
    $('#kpis').innerHTML = K.map(function (k) {
      return '<button type="button" class="kpi ' + k[2] + '" data-f="' + (k[0] || 'inbox') + '" aria-pressed="' + (k[0] !== null && filter === k[0]) + '"><b>' + (k[0] ? pocet(k[0]) : cakajuce.length) + '</b><span>' + k[1] + '</span></button>';
    }).join('');
    $$('.kpi').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.f === 'inbox') { $('#inbox').scrollIntoView({ behavior: 'smooth' }); return; }
        filter = filter === b.dataset.f ? null : b.dataset.f; render();
      };
    });
    $('#mrows').innerHTML = C.filter(function (c) { return !filter || c.stav === filter; }).map(function (c) {
      var bar = '';
      for (var i = 6; i >= 0; i--) {
        var den = (c.den || 0) - i, ma = c.zapisky.some(function (z) { return z.den === den; });
        bar += '<i class="' + (ma ? 'w' : '') + '"></i>';
      }
      return '<tr class="' + (c.id === vybrany ? 'selrow' : '') + '" data-i="' + C.indexOf(c) + '" tabindex="0"><td class="p-mail"><b>' + meno(c) + '</b></td>' +
        '<td class="num p-sk">' + (c.tyzden || '–') + ' / 13</td><td><div class="bar7">' + bar + '</div></td>' +
        '<td class="num p-sk">' + c.pocet + '</td><td class="num p-sk">' + c.hotove + '</td>' +
        '<td><span class="chip ' + STAV[c.stav][1] + '">' + STAV[c.stav][0] + '</span></td></tr>';
    }).join('') || '<tr><td colspan="6" class="muted">Nikto taký tu nie je.</td></tr>';
    $$('#mrows tr[data-i]').forEach(function (r) {
      r.onclick = function () { vybrany = C[+r.dataset.i].id; render(); };
      r.onkeydown = function (e) { if (e.key === 'Enter') r.click(); };
    });
    var c = C.filter(function (x) { return x.id === vybrany; })[0];
    $('#detail').innerHTML = !c ? '<p class="muted" style="margin:0">Zatiaľ tu nie je žiadny člen.</p>' :
      '<div><p class="eyebrow" style="margin:0 0 8px">Detail</p><h2 class="p-mail">' + esc(c.prezyvka || c.email) + '</h2>' + (c.prezyvka ? '<div class="mono muted p-mail">' + esc(c.email) + '</div>' : '') + '</div>' +
      '<div class="mono muted">' + (c.zaciatok ? 'Deň ' + c.den + ' · týždeň ' + c.tyzden : 'Výzvu ešte nezačal') + '</div>' +
      '<h3 style="margin:8px 0 0;font-size:18px">Týždenné úlohy</h3>' + ulohyHtml(c) +
      '<h3 style="margin:8px 0 0;font-size:18px">Denník</h3>' + (c.zapisky.map(function (z) { return zapisHtml(c, z); }).join('') || '<p class="muted" style="margin:0">Zatiaľ žiadny zápis.</p>');
    cakajuce.sort(function (a, b) { return POZOR.test(b.z.text) - POZOR.test(a.z.text); });
    $('#inbox').innerHTML = cakajuce.map(function (x) {
      return '<p class="mono muted p-mail" style="margin:4px 0 -6px">' + esc(x.c.prezyvka || x.c.email) + '</p>' + zapisHtml(x.c, x.z);
    }).join('') || '<p class="muted" style="margin:0">Všetko zodpovedané.</p>';
    $$('[data-odpovedz]').forEach(function (b) {
      b.onclick = function () {
        var box = b.closest('.entry'), clen = C[+box.dataset.clen], den = +box.dataset.den, text = box.querySelector('textarea').value.trim();
        if (!text) { toast('Napíš odpoveď'); return; }
        b.disabled = true;
        CLEN.db('rpc/admin_odpovedz', { method: 'POST', body: JSON.stringify({ p_clen: clen.id, p_den: den, p_odpoved: text }) }).then(function () {
          clen.zapisky.filter(function (z) { return z.den === den; })[0].odpoved = text;
          prepocitaj(clen); render(); toast('Odpoveď uložená, člen ju uvidí vo svojom denníku');
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
  CLEN.relacia().then(function (r) {
    if (!r) { hlaska('Prihlás sa', 'Prehľad je len pre Kapitána.'); return; }
    return CLEN.db('rpc/admin_prehlad', { method: 'POST', body: '{}' }).then(function (data) {
      $('#obsah').hidden = false; priprav(data); render();
    });
  }).catch(function (x) {
    if (/ 403$/.test(x.message)) hlaska('Sem nie', 'Si prihlásený ako člen. Prehľad otvorí len Kapitánov účet kapitanabstinencia@gmail.com.');
    else hlaska('Nepodarilo sa načítať', 'Obnov stránku. Ak to nepomôže, skús to o chvíľu.');
  });
})();
