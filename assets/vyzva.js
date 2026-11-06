// Členská sekcia: týždne, týždenné úlohy a denník uložené v Supabase
(function () {
  var esc = KA.esc, toast = KA.toast;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var WEEKS = [
    { t: "Prvý krok: Priznať si pravdu", task: "Ako sa cítim na začiatku tejto cesty?", daily: "Napíš si pravdu: kedy si vedel, že to nie je v poriadku?" },
    { t: "Strach zo zmeny a straty identity", task: "Koho sa bojím stratiť, ak sa zmením?", daily: "Pozoruj, kde cítiš odpor voči zmene. Čo ťa drží?" },
    { t: "Detox vzťahov a prostredia", task: "5 ľudí alebo situácií, ktoré ťa ťahajú späť", daily: "Ako reagujem, keď sa cítim sám? Kto mi chýba?" },
    { t: "Rutina a disciplína", task: "Napíš si ideálny triezvy deň, od rána do večera", daily: "Ako vyzeral môj deň? Bol plán? Bol chaos?" },
    { t: "Telo: jedlo, pohyb, spánok 8/8/8", task: "Môj plán zdravých rituálov na týždeň", daily: "Ako sa cíti moje telo? Čo by potrebovalo?" },
    { t: "Emócie a úprimnosť", task: "Veci, ktoré som si ešte nikdy nepriznal", daily: "Čo som dnes cítil a čo som potlačil?" },
    { t: "Pády a recidíva", task: "Moja hranica: čo už nikdy nechcem prekročiť?", daily: "Mal som dnes chuť? Prečo? Ako som s tým naložil?" },
    { t: "Mýty o abstinencii", task: "Ktoré lži som si rozprával ja sám?", daily: "Na aké výhovorky som dnes takmer skočil?" },
    { t: "Rodina, partneri, spoluzávislosť", task: "Komu som ublížil a ako to možno napraviť?", daily: "Aké emócie vo mne vzbudzujú ľudia okolo mňa?" },
    { t: "Duchovno, viera, zmysel", task: "Čo mi dáva zmysel ráno vstať?", daily: "Vnímal som dnes niečo väčšie? Nádej? Pokoj?" },
    { t: "Návrat do života", task: "Aký by bol môj ideálny život bez závislosti?", daily: "Čo som dnes urobil inak než predtým?" },
    { t: "Ukotvenie: Moja nová identita", task: "List svojmu budúcemu JA", daily: "Kedy som dnes cítil, že som na správnej ceste?" },
    { t: "Triezvy prechod: Iniciačný rituál", task: "Absolvuj rituál pre novú identitu (1 – 2 hodiny)", daily: "Čo si nechávam za sebou a čo si beriem so sebou?" }
  ];
  var POSLEDNY_DEN = 91, DAY = 864e5, WD = ["ne", "po", "ut", "st", "št", "pi", "so"];
  var ZACIATOK, curDay, curWeek, S = { viewWeek: 1, selDay: 1, tasks: {}, entries: {}, otvor: {} };

  var fmt = function (d) { return d.getDate() + ". " + (d.getMonth() + 1) + "."; };
  var dateOfDay = function (n) { return new Date(ZACIATOK.getFullYear(), ZACIATOK.getMonth(), ZACIATOK.getDate() + n - 1); };

  // Mobil: karta sa rozbalí tlačidlom a po uložení ostane otvorená
  function zbalovanie(karta, kluc, text) {
    var b = karta.querySelector('.m-toggle');
    karta.classList.toggle('m-collapse', !!b);
    if (!b) return;
    function nastav() {
      karta.classList.toggle('open', !!S.otvor[kluc]);
      b.textContent = S.otvor[kluc] ? 'Zbaliť' : text;
      b.setAttribute('aria-expanded', !!S.otvor[kluc]);
    }
    b.onclick = function () { S.otvor[kluc] = !S.otvor[kluc]; nastav(); };
    nastav();
  }

  var odtien = function (h) { return Math.round((Math.max(h, 1) - 1) * 130 / 9); };
  var zapisane = function (n) { return !!(S.entries[n] && S.entries[n].text); };
  var vyska = function (h) { return Math.min(Math.max(h, 1), 10); };
  var cislo = function (x) { return x.toFixed(1).replace('.', ','); };
  function hodnChip(e) {
    return e.hodnotenie == null ? '' : ' <span class="hchip" style="--h:' + odtien(e.hodnotenie) + '">' + e.hodnotenie + '/10</span>';
  }

  function chyba() { toast('Nepodarilo sa to uložiť. Skontroluj pripojenie a skús to znova.'); }

  function renderWeeks() {
    $('#weeks').innerHTML = WEEKS.map(function (w, i) {
      var n = i + 1, hot = S.tasks[n] && S.tasks[n].hotove, cls = hot ? 'done' : n === curWeek ? 'now' : n < curWeek ? 'caka' : 'locked';
      return '<button type="button" class="wkb ' + cls + '" data-wk="' + n + '" aria-pressed="' + (n === S.viewWeek) + '"' + (n > curWeek ? ' aria-disabled="true"' : '') + ' title="' + esc(w.t) + '">' +
        '<b>' + (n < 13 ? n : '★') + '</b><small>' + (hot ? 'hotovo' : n === curWeek ? 'teraz' : n < curWeek ? 'nedokončené' : '🔒 ' + fmt(dateOfDay((n - 1) * 7 + 1))) + '</small></button>';
    }).join('');
    $$('.wkb').forEach(function (b) {
      b.onclick = function () {
        var n = +b.dataset.wk;
        if (n > curWeek) { toast('Týždeň ' + n + ' sa ti otvorí ' + fmt(dateOfDay((n - 1) * 7 + 1))); return; }
        S.viewWeek = n; render();
      };
    });
    var now = $('.wkb.now'); if (now && $('#weeks').scrollWidth > $('#weeks').clientWidth) $('#weeks').scrollLeft = now.offsetLeft - 16;
  }

  function render() {
    var w = WEEKS[S.viewWeek - 1];
    renderWeeks();
    // Video sa načíta znova len pri zmene týždňa, po uložení úlohy beží ďalej
    if (S.videoTyzden !== S.viewWeek) {
      S.videoTyzden = S.viewWeek;
      $('#weekCard').innerHTML = '<p class="eyebrow">Týždeň ' + S.viewWeek + (S.viewWeek === curWeek ? ' · aktuálny' : '') + '</p>' +
        '<h2>' + esc(w.t) + '</h2>' +
        '<div class="video" id="videoBox"><span class="cap">VIDEO · TÝŽDEŇ ' + S.viewWeek + '</span></div>' +
        '<div class="materialy" id="matBox"></div>';
      if (CLEN.video) CLEN.video(S.viewWeek, $('#videoBox'));
      if (CLEN.materialy) CLEN.materialy(S.viewWeek, $('#matBox'));
    }
    var uloha = S.tasks[S.viewWeek], done = !!(uloha && uloha.hotove), zad = ULOHY[S.viewWeek - 1], odp = uloha && uloha.odpovede || {};
    $('#taskCard').innerHTML = '<p class="eyebrow">Týždenná úloha</p>' +
      '<h3 style="margin:0">' + esc(zad.t) + '</h3><p class="muted" style="margin:0">' + esc(zad.p) + '</p><div class="m-more">' +
      zad.f.map(function (p, i) {
        var hod = esc(odp[i] || ''), id = 'u' + i;
        return '<label class="field" for="' + id + '">' + esc(p[1]) + (p[0] === 'k'
          ? '<input type="text" id="' + id + '" maxlength="500" value="' + hod + '">'
          : '<textarea id="' + id + '" maxlength="5000" rows="3">' + hod + '</textarea>') + '</label>';
      }).join('') +
      '<p class="mono muted" style="margin:0">Počas testovania to vidíš ty a Kapitán.' + (done ? ' ✓ Hotové' : '') + '</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn" id="uUloz">Uložiť rozpracované</button><button type="button" class="btn btn-primary" id="uHotovo">' + (done ? 'Uložiť zmeny' : 'Hotové') + '</button></div></div>' +
      '<button type="button" class="btn small m-toggle' + (done ? '' : ' btn-primary') + '"></button>';
    $('#taskCard').classList.toggle('z-hotove', done);
    $('#taskCard').classList.toggle('z-caka', !done);
    $('#uUloz').onclick = function () { ulozUlohu(done); };
    $('#uHotovo').onclick = function () { ulozUlohu(true); };
    zbalovanie($('#taskCard'), 'uloha', done ? 'Pozrieť úlohu' : 'Klikni na úlohu');
    // Denník nezávisí od zobrazeného týždňa, prekreslením by sa stratil rozpísaný text
    if (!$('#journalCard').hasChildNodes()) renderJournal();
  }

  function ulozUlohu(hotove) {
    var n = S.viewWeek, odp = {}, plne = 0;
    ULOHY[n - 1].f.forEach(function (p, i) { var v = $('#u' + i).value.trim(); if (v) { odp[i] = v; plne++; } });
    if (!plne) { toast('Napíš aspoň pár slov'); return; }
    $('#uUloz').disabled = $('#uHotovo').disabled = true;
    var volanie = S.tasks[n]
      ? CLEN.db('ulohy?tyzden=eq.' + n, { method: 'PATCH', body: JSON.stringify({ odpovede: odp, hotove: hotove }) })
      : CLEN.db('ulohy', { method: 'POST', body: JSON.stringify({ user_id: S.id, tyzden: n, odpovede: odp, hotove: hotove }) });
    volanie.then(function () {
      S.tasks[n] = { odpovede: odp, hotove: hotove }; render();
      toast(hotove ? 'Týždenná úloha hotová ✓' : 'Rozpracované uložené');
    }).catch(function () { $('#uUloz').disabled = $('#uHotovo').disabled = false; chyba(); });
  }

  function replyHtml(e) {
    if (!e.odpoved) return '';
    return '<div class="reply"><div class="who">Odpovedal Kapitán</div>' + esc(e.odpoved) + '</div>';
  }

  function renderJournal() {
    var wkStart = (curWeek - 1) * 7 + 1, w = WEEKS[curWeek - 1];
    var sel = S.selDay, editable = sel === curDay || sel === curDay - 1, e = S.entries[sel];
    var daysHtml = '';
    for (var i = 0; i < 7; i++) {
      var n = wkStart + i, d = dateOfDay(n), has = zapisane(n);
      var cls = n > curDay ? 'future' : has ? 'written' : (n < curDay - 1 ? 'missed' : '');
      var can = n <= curDay && (has || n >= curDay - 1);
      daysHtml += '<button type="button" class="day ' + cls + (n === sel ? ' sel' : '') + '" data-day="' + n + '"' + (can ? '' : ' disabled') + ' aria-label="Deň ' + n + '"><small>' + WD[d.getDay()] + '</small><b>' + (has ? '✓' : d.getDate()) + '</b></button>';
    }
    var body;
    if (zapisane(sel) && !editable) {
      body = '<div class="entry"><div class="meta">Deň ' + sel + ' · ' + fmt(dateOfDay(sel)) + hodnChip(e) + '</div><div>' + esc(e.text) + '</div>' + replyHtml(e) + '</div>';
    } else if (!editable) {
      body = '<div class="locknote">Tento deň už nejde dopísať. Zápis sa dá doplniť najviac 1 deň dozadu.</div>';
    } else {
      var locked = e && e.odpoved, g = e && e.vdacnosti || [];
      body = '<div class="prompt">' + esc(w.daily) + '</div>' +
        '<label class="field" for="jText">' + (sel === curDay ? 'Dnešný zápis' : 'Včerajší zápis (dá sa ešte doplniť)') +
        '<textarea id="jText" maxlength="10000"' + (locked ? ' readonly' : '') + ' placeholder="Píš úprimne. Počas testovania to vidíš ty a Kapitán.">' + (e && e.text ? esc(e.text) : '') + '</textarea></label>' +
        (locked ? replyHtml(e) : '') +
        '<div class="grat"><span class="eyebrow">3 vďačnosti na večer</span>' +
        [0, 1, 2].map(function (i) { return '<input type="text" id="g' + i + '" maxlength="300" aria-label="Vďačnosť ' + (i + 1) + '" placeholder="' + (i + 1) + '. za čo som dnes vďačný" value="' + esc(g[i] || '') + '"' + (locked ? ' readonly' : '') + '>'; }).join('') + '</div>' +
        '<div id="crisisBox"></div>' +
        (locked ? '' : '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span class="mono muted">' + (e && e.text ? 'Uložené · upraviť sa dá, kým nepríde odpoveď' : 'Uložením sa deň odškrtne') + '</span><button type="button" class="btn btn-primary" id="jSave">' + (e && e.text ? 'Uložiť zmeny' : 'Uložiť zápis') + '</button></div>');
    }
    $('#journalCard').innerHTML = '<p class="eyebrow">Môj denník · týždeň ' + curWeek + '</p>' +
      '<div class="hodn-w" id="hWidget"></div>' +
      '<div class="m-uvod"><h3 style="margin:0">' + esc(w.daily) + '</h3><p class="muted" style="margin:0">Pár viet a 3 vďačnosti na večer.</p></div>' +
      '<div class="m-more"><div class="days">' + daysHtml + '</div>' + body + '</div>' +
      '<button type="button" class="btn small m-toggle' + (zapisane(curDay) ? '' : ' btn-primary') + '"></button>';
    zbalovanie($('#journalCard'), 'dennik', zapisane(curDay) ? 'Pozrieť zápis' : 'Napísať zápis');
    $('#journalCard').classList.toggle('z-hotove', zapisane(curDay));
    $('#journalCard').classList.toggle('z-caka', !zapisane(curDay));
    $$('.day').forEach(function (b) { b.onclick = function () { S.selDay = +b.dataset.day; S.grafZmena = false; renderJournal(); }; });
    renderHodn();
    var sv = $('#jSave');
    if (sv) sv.onclick = function () { ulozZapis(sel, e); };
    renderHistory();
  }

  function ulozZapis(sel, e) {
    var t = $('#jText').value.trim(), v = [0, 1, 2].map(function (i) { return $('#g' + i).value.trim(); });
    if (!t) { toast('Napíš aspoň pár slov'); return; }
    $('#jSave').disabled = true;
    var volanie = vFronte(function () {
      return S.vDb[sel]
        ? CLEN.db('zapisky?den=eq.' + sel, { method: 'PATCH', body: JSON.stringify({ text: t, vdacnosti: v }) })
        : CLEN.db('zapisky', { method: 'POST', body: JSON.stringify({ user_id: S.id, den: sel, text: t, vdacnosti: v }) }).then(function () { S.vDb[sel] = true; });
    });
    volanie.then(function () {
      var hod = S.entries[sel] ? S.entries[sel].hodnotenie : null;
      S.entries[sel] = { den: sel, text: t, vdacnosti: v, hodnotenie: hod, odpoved: e ? e.odpoved : null };
      var krizovy = /nechcem žiť|nechcem zit|zabiť sa|zabit sa|samovra|ublížiť si|ublizit si|skonč(iť|ím) so životom|skoncit so zivotom|nemá zmysel žiť|nema zmysel zit/i.test(t);
      renderJournal();
      if (krizovy) {
        $('#crisisBox').innerHTML = '<div class="crisis"><b>Ďakujem, že si to napísal. Nemusíš v tom byť sám.</b><span>Linka dôvery Nezábudka <b class="mono">0800 800 566</b> (nonstop, zadarmo). Ak si v ohrození, volaj <b>112</b>.</span></div>';
      } else toast('Zápis uložený, deň odškrtnutý ✓');
    }).catch(function () { if ($('#jSave')) $('#jSave').disabled = false; chyba(); });
  }

  function renderHistory() {
    var ks = Object.keys(S.entries).map(Number).filter(zapisane).sort(function (a, b) { return b - a; }).slice(0, 4);
    var zapis = function (n, trieda) {
      var e = S.entries[n];
      return '<div class="entry' + trieda + '"><div class="meta">Deň ' + n + ' · ' + fmt(dateOfDay(n)) + hodnChip(e) + '</div><div>' + esc(e.text) + '</div>' + replyHtml(e) + '</div>';
    };
    var dalsie = ks.slice(1);
    $('#historyCard').innerHTML = '<p class="eyebrow">Posledné zápisy</p>' + (ks.length
      ? zapis(ks[0], ' m-klip') + '<div class="m-more">' + dalsie.map(function (n) { return zapis(n, ''); }).join('') + '</div><button type="button" class="btn small m-toggle"></button>'
      : '<p class="muted" style="margin:0">Zatiaľ tu nič nie je. Prvý zápis je najťažší.</p>');
    // Odpoveď Kapitána v staršom zápise nesmie ostať skrytá bez povšimnutia
    zbalovanie($('#historyCard'), 'historia', dalsie.some(function (n) { return S.entries[n].odpoved; }) ? 'Pozri odpoveď Kapitána' : 'Čítaj ďalej');
  }

  function priemer(tyzden) {
    var v = [];
    for (var d = (tyzden - 1) * 7 + 1; d <= tyzden * 7; d++) if (S.entries[d] && S.entries[d].hodnotenie != null) v.push(S.entries[d].hodnotenie);
    return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
  }

  // Ukladanie po jednom, aby sa dve rýchle ťuknutia nepobili
  function vFronte(f) {
    S.fronta = (S.fronta || Promise.resolve()).catch(function () {}).then(f);
    return S.fronta;
  }

  function nastavHodnotenie(den, h) {
    var e = S.entries[den], stare = e ? e.hodnotenie : null;
    if (e) e.hodnotenie = h; else S.entries[den] = { den: den, text: null, vdacnosti: [], hodnotenie: h, odpoved: null };
    S.grafZmena = false;
    renderHodn(true);
    vFronte(function () {
      return S.vDb[den]
        ? CLEN.db('zapisky?den=eq.' + den, { method: 'PATCH', body: JSON.stringify({ hodnotenie: h }) })
        : CLEN.db('zapisky', { method: 'POST', body: JSON.stringify({ user_id: S.id, den: den, hodnotenie: h }) }).then(function () { S.vDb[den] = true; });
    }).catch(function () {
      if (e) e.hodnotenie = stare; else delete S.entries[den];
      renderHodn();
      chyba();
    });
  }

  function renderHodn(animuj) {
    var box = $('#hWidget');
    if (!box) return;
    // Hodnotiť sa dá dnešok a včerajšok, podľa dňa zvoleného v denníku
    var den = S.selDay === curDay || S.selDay === curDay - 1 ? S.selDay : null, dnes = den === curDay;
    var d = den && S.entries[den], h = d && d.hodnotenie != null ? d.hodnotenie : null;
    var nieco = Object.keys(S.entries).some(function (k) { return S.entries[k].hodnotenie != null; });
    if (!den && !nieco) { box.innerHTML = ''; return; }
    var otvor = !den || (h != null && !S.grafZmena), pred = animuj ? false : otvor, tlac = '';
    for (var i = 1; i <= 10; i++) tlac += '<button type="button" class="hb" data-h="' + i + '" style="--h:' + odtien(i) + '" aria-pressed="' + (h === i) + '">' + i + '</button>';
    box.innerHTML = '<div class="zbal' + (pred ? ' zavrete' : '') + '" id="gStup"><div><span class="g-otazka">' + (dnes ? 'Ako sa dnes máš?' : 'Ako si sa mal včera?') + '</span>' +
      '<div class="s10" role="group" aria-label="Hodnotenie dňa od 1 do 10">' + tlac + '</div><span class="mono muted hodn-p"><span>1 najhorší</span><span>10 najlepší</span></span></div></div>' +
      '<div class="zbal' + (pred ? '' : ' zavrete') + '" id="gObal"><div><div class="g-hlava"><span class="g-otazka">Môj vývoj</span>' +
      (den && h != null ? '<button type="button" class="g-zmen" id="gZmen">zmeniť ' + (dnes ? 'dnešné' : 'včerajšie') + ' číslo</button>' : '') + '</div><div class="graf" id="graf"></div></div></div>';
    $$('#hWidget .hb').forEach(function (b) { b.onclick = function () { nastavHodnotenie(den, +b.dataset.h); }; });
    if ($('#gZmen')) $('#gZmen').onclick = function () { S.grafZmena = true; renderHodn(); };
    if (!otvor) return;
    kresliGraf(animuj, den);
    if (animuj) setTimeout(function () {
      $('#gStup').classList.add('zavrete');
      $('#gObal').classList.remove('zavrete');
      var c = $('#graf .g-ciara');
      if (c) { c.getBoundingClientRect(); c.style.strokeDashoffset = 0; }
      $('#graf').classList.add('anim');
    }, 250);
  }

  function kresliGraf(animuj, vybrany) {
    var W = $('#graf').clientWidth || 300, H = 116, L = 14, R = 14, T = 26, B = 20;
    var od = Math.max(1, curDay - 13), rozsah = Math.max(curDay - od, 6);
    var x = function (d) { return L + (d - od) / rozsah * (W - L - R); }, y = function (v) { return T + (10 - vyska(v)) / 9 * (H - T - B); };
    var body = [];
    for (var d = od; d <= curDay; d++) if (S.entries[d] && S.entries[d].hodnotenie != null) body.push(d);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Hodnotenie posledných dní">';
    if (body.length > 1) s += '<polyline class="g-ciara" points="' + body.map(function (d) { return x(d) + ',' + y(S.entries[d].hodnotenie); }).join(' ') + '"/>';
    body.forEach(function (d, i) {
      var h = S.entries[d].hodnotenie, je = d === vybrany, st = '--h:' + odtien(h) + ';animation-delay:' + (i * 50) + 'ms';
      if (je) s += '<circle class="g-halo" cx="' + x(d) + '" cy="' + y(h) + '" r="8" style="--h:' + odtien(h) + '"/>';
      s += '<circle class="g-bod' + (je ? ' g-dnes' : '') + '" cx="' + x(d) + '" cy="' + y(h) + '" r="' + (je ? 7 : 5) + '" style="' + st + '"><title>Deň ' + d + ': ' + h + '/10</title></circle>';
      s += '<text class="g-cis' + (je ? ' g-cis-dnes' : '') + '" x="' + x(d) + '" y="' + (y(h) - (je ? 13 : 10)) + '" text-anchor="middle" style="' + st + '">' + h + '</text>';
      if (je) s += '<text class="g-den" x="' + x(d) + '" y="' + (H - 4) + '" text-anchor="middle">' + (d === curDay ? 'dnes' : 'včera') + '</text>';
    });
    $('#graf').innerHTML = s + '</svg>';
    var c = $('#graf .g-ciara');
    if (c && animuj) { var dl = c.getTotalLength(); c.style.strokeDasharray = dl; c.style.strokeDashoffset = dl; c.style.transition = 'stroke-dashoffset ' + (body.length * 50 + 400) + 'ms ease-out'; }
  }
  var cakaj;
  window.addEventListener('resize', function () { clearTimeout(cakaj); cakaj = setTimeout(function () { if ($('#graf') && !$('#gObal').classList.contains('zavrete')) kresliGraf(false, S.selDay); }, 200); });

  function nadpis() {
    $('#mTitle').innerHTML = 'Ahoj, <span style="white-space:nowrap"><button type="button" class="prez" id="prezBtn" title="Zmeniť prezývku">' + esc(S.prez || 'kapitán') + '</button>.</span> Dnes je tvoj ' + curDay + '. deň.';
    $('#prezBtn').onclick = prezyvkaForm;
  }

  // Prezývku vidí len člen a Kapitán, skutočné meno netreba
  function prezyvkaForm() {
    var box = $('#prezBox');
    box.innerHTML = '<form class="card prez-karta" id="prezForm"><div><p class="eyebrow">' + (S.prez ? 'Zmeniť prezývku' : 'Vitaj na palube') + '</p>' +
      '<label for="prezIn" class="prez-otazka">Ako ťa máme volať?</label>' +
      '<p class="muted" style="margin:0">Stačí prezývka, skutočné meno písať nemusíš. Vidíš ju ty a Kapitán.</p></div>' +
      '<div class="prez-riadok"><input type="text" id="prezIn" maxlength="30" required placeholder="napr. Jano, Kapitán Mišo, Tichý" value="' + esc(S.prez || '') + '">' +
      '<button class="btn btn-primary" type="submit">Uložiť</button>' + (S.prez ? '<button class="btn" type="button" id="prezZrus">Zrušiť</button>' : '') + '</div></form>';
    if (S.prez) { $('#prezIn').focus(); $('#prezZrus').onclick = function () { box.innerHTML = ''; }; }
    $('#prezForm').onsubmit = function (ev) {
      ev.preventDefault();
      var p = $('#prezIn').value.trim().replace(/\s+/g, ' ');
      if (!p) return;
      var b = $('#prezForm button[type=submit]'); b.disabled = true;
      CLEN.db('clenovia?id=eq.' + S.id, { method: 'PATCH', body: JSON.stringify({ prezyvka: p }) }).then(function () {
        S.prez = p; nadpis(); box.innerHTML = ''; toast('Vitaj, ' + p + ' ✓');
      }).catch(function () { b.disabled = false; chyba(); });
    };
  }

  // Nová odpoveď Kapitána: svietiaci pruh hore, klik presunie priamo na odpoveď
  function videne() { try { return JSON.parse(localStorage.getItem('ka_videne_' + S.id)) || []; } catch (e) { return []; } }
  function oznacVidene(den) {
    var v = videne();
    if (v.indexOf(den) < 0) v.push(den);
    try { localStorage.setItem('ka_videne_' + S.id, JSON.stringify(v)); } catch (e) {}
  }
  function renderOdpovede() {
    var box = $('#odpBox');
    if (!box) return;
    var v = videne(), nove = Object.keys(S.entries).map(Number).filter(function (d) { return S.entries[d].odpoved && v.indexOf(d) < 0; }).sort(function (a, b) { return b - a; });
    if (!nove.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<button type="button" class="odp-pruh" id="odpBtn"><span class="odp-ikona" aria-hidden="true">✉</span>' +
      '<span><b>Kapitán ti odpísal' + (nove.length > 1 ? ' (' + nove.length + ')' : '') + '</b><small>Klikni a prečítaj si odpoveď na tvoj zápis z ' + nove[0] + '. dňa</small></span>' +
      '<span class="odp-sipka" aria-hidden="true">→</span></button>';
    $('#odpBtn').onclick = function () { ukazOdpoved(nove[0]); };
  }
  function ukazOdpoved(den) {
    oznacVidene(den);
    var ciel = null;
    if (Math.ceil(den / 7) === curWeek) {
      S.selDay = den; S.otvor.dennik = true; S.grafZmena = false;
      renderJournal();
      ciel = $('#journalCard .reply');
    }
    if (ciel) renderOdpovede();
    else {
      var e = S.entries[den];
      $('#odpBox').innerHTML = '<div class="card odp-karta"><p class="eyebrow">Tvoj zápis · deň ' + den + ' · ' + fmt(dateOfDay(den)) + '</p>' +
        '<div style="white-space:pre-wrap">' + esc(e.text || '') + '</div>' + replyHtml(e) + '</div>';
      ciel = $('#odpBox .reply');
    }
    ciel.classList.add('odp-svieti');
    // Posun až po prekreslení, aby sa odpoveď ocitla v hornej tretine obrazovky
    setTimeout(function () { window.scrollTo({ top: Math.max(0, ciel.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3), behavior: 'smooth' }); }, 60);
  }

  function renderVeta() {
    var v = window.VETY && VETY[curDay - 1], box = $('#vetaBox');
    if (!box || !v) return;
    box.innerHTML = '<div class="card veta"><p class="eyebrow">Veta na dnes · deň ' + curDay + '</p><q>' + esc(v) + '</q></div>';
  }

  $('#odhlas').onclick = function (e) {
    e.preventDefault();
    CLEN.odhlas().then(function () { location.href = 'clenska.html'; });
  };

  CLEN.relacia().then(function (r) {
    if (!r) { location.replace('clenska.html'); return; }
    return CLEN.jeAdmin().then(function (admin) {
      if (admin) { location.replace('prehlad.html'); return; }
      return nacitaj(r);
    });
  }).catch(function () {
    $('#mTitle').textContent = 'Výzvu sa nepodarilo načítať';
    $('#mEyebrow').textContent = 'Skontroluj pripojenie a obnov stránku.';
  });

  function nacitaj(r) {
    return Promise.all([CLEN.pouzivatel(r), CLEN.db('rpc/zacni_vyzvu', { method: 'POST', body: '{}' }), CLEN.db('zapisky?select=den,text,vdacnosti,hodnotenie,odpoved'), CLEN.db('ulohy?select=tyzden,odpovede,hotove'), CLEN.db('clenovia?select=prezyvka')]).then(function (x) {
      S.id = x[0].id;
      var z = x[1].split('-');
      ZACIATOK = new Date(+z[0], +z[1] - 1, +z[2]);
      var dnes = new Date();
      curDay = Math.round((new Date(dnes.getFullYear(), dnes.getMonth(), dnes.getDate()) - ZACIATOK) / DAY) + 1;
      curDay = Math.min(Math.max(curDay, 1), POSLEDNY_DEN);
      curWeek = Math.ceil(curDay / 7);
      S.viewWeek = curWeek; S.selDay = curDay;
      S.vDb = {};
      x[2].forEach(function (e) { S.entries[e.den] = e; S.vDb[e.den] = true; });
      x[3].forEach(function (u) { S.tasks[u.tyzden] = u; });
      $('#mEyebrow').textContent = 'Deň ' + curDay + ' z ' + POSLEDNY_DEN + ' · týždeň ' + curWeek + ' · začal si ' + fmt(ZACIATOK);
      S.prez = x[4][0] && x[4][0].prezyvka;
      nadpis();
      if (!S.prez) prezyvkaForm();
      $('#soberN').textContent = curDay;
      renderVeta();
      render();
      renderOdpovede();
    });
  }
})();
