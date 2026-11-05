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

  var odtien = function (h) { return Math.round(h * 13); };
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
        '<div class="video" id="videoBox"><span class="cap">VIDEO · TÝŽDEŇ ' + S.viewWeek + '</span></div>';
      if (CLEN.video) CLEN.video(S.viewWeek, $('#videoBox'));
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
    return '<div class="reply"><div class="who">Kapitán <span class="chip">odpovedal človek</span></div>' + esc(e.odpoved) + '</div>';
  }

  function renderJournal() {
    var wkStart = (curWeek - 1) * 7 + 1, w = WEEKS[curWeek - 1];
    var sel = S.selDay, editable = sel === curDay || sel === curDay - 1, e = S.entries[sel];
    var daysHtml = '';
    for (var i = 0; i < 7; i++) {
      var n = wkStart + i, d = dateOfDay(n), has = !!S.entries[n];
      var cls = n > curDay ? 'future' : has ? 'written' : (n < curDay - 1 ? 'missed' : '');
      var can = n <= curDay && (has || n >= curDay - 1);
      daysHtml += '<button type="button" class="day ' + cls + (n === sel ? ' sel' : '') + '" data-day="' + n + '"' + (can ? '' : ' disabled') + ' aria-label="Deň ' + n + '"><small>' + WD[d.getDay()] + '</small><b>' + (has ? '✓' : d.getDate()) + '</b></button>';
    }
    var body;
    if (e && !editable) {
      body = '<div class="entry"><div class="meta">Deň ' + sel + ' · ' + fmt(dateOfDay(sel)) + hodnChip(e) + '</div><div>' + esc(e.text) + '</div>' + replyHtml(e) + '</div>';
    } else if (!editable) {
      body = '<div class="locknote">Tento deň už nejde dopísať. Zápis sa dá doplniť najviac 1 deň dozadu.</div>';
    } else {
      var locked = e && e.odpoved, g = e && e.vdacnosti || [], tlacidla = '';
      S.hodn = e && e.hodnotenie != null ? e.hodnotenie : null;
      for (var h = 0; h <= 10; h++) tlacidla += '<button type="button" class="hb" data-h="' + h + '" style="--h:' + odtien(h) + '" aria-pressed="' + (S.hodn === h) + '"' + (locked ? ' disabled' : '') + '>' + h + '</button>';
      body = '<div class="prompt">' + esc(w.daily) + '</div>' +
        '<div class="hodn"><span class="eyebrow">' + (sel === curDay ? 'Ako hodnotíš dnešný deň?' : 'Ako hodnotíš včerajší deň?') + '</span><div class="hodn-r" role="group" aria-label="Hodnotenie dňa od 0 do 10">' + tlacidla + '</div><span class="mono muted hodn-p"><span>0 najhorší</span><span>10 najlepší</span></span></div>' +
        '<label class="field" for="jText">' + (sel === curDay ? 'Dnešný zápis' : 'Včerajší zápis (dá sa ešte doplniť)') +
        '<textarea id="jText" maxlength="10000"' + (locked ? ' readonly' : '') + ' placeholder="Píš úprimne. Počas testovania to vidíš ty a Kapitán.">' + (e ? esc(e.text) : '') + '</textarea></label>' +
        '<div class="grat"><span class="eyebrow">3 vďačnosti na večer</span>' +
        [0, 1, 2].map(function (i) { return '<input type="text" id="g' + i + '" maxlength="300" aria-label="Vďačnosť ' + (i + 1) + '" placeholder="' + (i + 1) + '. za čo som dnes vďačný" value="' + esc(g[i] || '') + '"' + (locked ? ' readonly' : '') + '>'; }).join('') + '</div>' +
        '<div id="crisisBox"></div>' +
        (locked ? replyHtml(e) : '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span class="mono muted">' + (e ? 'Uložené · upraviť sa dá, kým nepríde odpoveď' : 'Uložením sa deň odškrtne') + '</span><button type="button" class="btn btn-primary" id="jSave">' + (e ? 'Uložiť zmeny' : 'Uložiť zápis') + '</button></div>');
    }
    $('#journalCard').innerHTML = '<p class="eyebrow">Môj denník · týždeň ' + curWeek + '</p>' +
      '<div class="m-uvod"><h3 style="margin:0">' + esc(w.daily) + '</h3><p class="muted" style="margin:0">Pár viet a 3 vďačnosti na večer.</p></div>' +
      '<div class="m-more"><div class="days">' + daysHtml + '</div>' + body + '</div>' +
      '<button type="button" class="btn small m-toggle' + (S.entries[curDay] ? '' : ' btn-primary') + '"></button>';
    zbalovanie($('#journalCard'), 'dennik', S.entries[curDay] ? 'Pozrieť zápis' : 'Napísať zápis');
    $('#journalCard').classList.toggle('z-hotove', !!S.entries[curDay]);
    $('#journalCard').classList.toggle('z-caka', !S.entries[curDay]);
    $$('.day').forEach(function (b) { b.onclick = function () { S.selDay = +b.dataset.day; renderJournal(); }; });
    $$('.hb').forEach(function (b) {
      b.onclick = function () {
        S.hodn = +b.dataset.h;
        $$('.hb').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        // Na mobile sa po výbere čísla denník rozbalí, aby sa dal zápis hneď uložiť
        var k = $('#journalCard');
        if (k.classList.contains('m-collapse') && !k.classList.contains('open')) k.querySelector('.m-toggle').click();
      };
    });
    var sv = $('#jSave');
    if (sv) sv.onclick = function () { ulozZapis(sel, e); };
    renderHistory();
  }

  function ulozZapis(sel, e) {
    var t = $('#jText').value.trim(), v = [0, 1, 2].map(function (i) { return $('#g' + i).value.trim(); });
    if (!t) { toast('Napíš aspoň pár slov'); return; }
    $('#jSave').disabled = true;
    var volanie = e
      ? CLEN.db('zapisky?den=eq.' + sel, { method: 'PATCH', body: JSON.stringify({ text: t, vdacnosti: v, hodnotenie: S.hodn }) })
      : CLEN.db('zapisky', { method: 'POST', body: JSON.stringify({ user_id: S.id, den: sel, text: t, vdacnosti: v, hodnotenie: S.hodn }) });
    volanie.then(function () {
      S.entries[sel] = { den: sel, text: t, vdacnosti: v, hodnotenie: S.hodn, odpoved: e ? e.odpoved : null };
      renderGraf();
      var krizovy = /nechcem žiť|nechcem zit|zabiť sa|zabit sa|samovra|ublížiť si|ublizit si|skonč(iť|ím) so životom|skoncit so zivotom|nemá zmysel žiť|nema zmysel zit/i.test(t);
      renderJournal();
      if (krizovy) {
        $('#crisisBox').innerHTML = '<div class="crisis"><b>Ďakujem, že si to napísal. Nemusíš v tom byť sám.</b><span>Linka dôvery Nezábudka <b class="mono">0800 800 566</b> (nonstop, zadarmo). Ak si v ohrození, volaj <b>112</b>.</span></div>';
      } else toast('Zápis uložený, deň odškrtnutý ✓');
    }).catch(function () { if ($('#jSave')) $('#jSave').disabled = false; chyba(); });
  }

  function renderHistory() {
    var ks = Object.keys(S.entries).map(Number).sort(function (a, b) { return b - a; }).slice(0, 4);
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

  function renderGraf() {
    var karta = $('#grafCard');
    if (!karta) return;
    var body = Object.keys(S.entries).map(Number).filter(function (d) { return S.entries[d].hodnotenie != null; }).sort(function (a, b) { return a - b; });
    var teraz = priemer(curWeek), minule = curWeek > 1 ? priemer(curWeek - 1) : null, zhrnutie;
    if (body.length < 2) zhrnutie = 'Každý večer ohodnoť deň v denníku a tu uvidíš, ako sa tvoj stav mení.';
    else if (teraz == null) zhrnutie = 'Tento týždeň ešte nemáš hodnotenie.';
    else if (minule == null) zhrnutie = 'Priemer tento týždeň: <b>' + cislo(teraz) + '</b>';
    else zhrnutie = 'Priemer tento týždeň <b>' + cislo(teraz) + '</b>, minulý ' + cislo(minule) + '. ' +
      (teraz - minule >= .5 ? '<b class="ok-t">↑ Ide to hore.</b>' : teraz - minule <= -.5 ? '<b class="zle-t">↓ Ťažší týždeň.</b> Napíš to do denníka, Kapitán to číta.' : '→ Držíš sa.');
    karta.innerHTML = '<p class="eyebrow">Môj vývoj</p><h3 style="margin:0">Ako hodnotíš svoje dni</h3><div class="graf" id="graf"></div><p class="muted" style="margin:0">' + zhrnutie + '</p>';
    var W = $('#graf').clientWidth || 300, H = 190, L = 24, R = 8, T = 10, B = 24, N = Math.max(curDay, 7);
    var x = function (d) { return L + (d - 1) / (N - 1) * (W - L - R); }, y = function (v) { return T + (10 - v) / 10 * (H - T - B); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Graf hodnotenia dní">';
    [0, 5, 10].forEach(function (v) { s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="g-os"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>'; });
    for (var t = 1; (t - 1) * 7 + 1 <= N; t++) {
      s += '<text x="' + x((t - 1) * 7 + 1) + '" y="' + (H - 6) + '" text-anchor="' + (t === 1 ? 'start' : 'middle') + '">T' + t + '</text>';
      var p = priemer(t);
      if (p != null) s += '<line x1="' + x((t - 1) * 7 + 1) + '" x2="' + x(Math.min(t * 7, N)) + '" y1="' + y(p) + '" y2="' + y(p) + '" class="g-pr"/>';
    }
    if (body.length > 1) s += '<polyline class="g-ciara" points="' + body.map(function (d) { return x(d) + ',' + y(S.entries[d].hodnotenie); }).join(' ') + '"/>';
    body.forEach(function (d) { var h = S.entries[d].hodnotenie; s += '<circle cx="' + x(d) + '" cy="' + y(h) + '" r="5" style="--h:' + odtien(h) + '"><title>Deň ' + d + ': ' + h + '/10</title></circle>'; });
    $('#graf').innerHTML = s + '</svg>';
  }
  var cakaj;
  window.addEventListener('resize', function () { clearTimeout(cakaj); cakaj = setTimeout(function () { if (curDay) renderGraf(); }, 200); });

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
    return Promise.all([CLEN.pouzivatel(r), CLEN.db('rpc/zacni_vyzvu', { method: 'POST', body: '{}' }), CLEN.db('zapisky?select=den,text,vdacnosti,hodnotenie,odpoved'), CLEN.db('ulohy?select=tyzden,odpovede,hotove'), CLEN.db('clenovia?select=prezyvka')]).then(function (x) {
      S.id = x[0].id;
      var z = x[1].split('-');
      ZACIATOK = new Date(+z[0], +z[1] - 1, +z[2]);
      var dnes = new Date();
      curDay = Math.round((new Date(dnes.getFullYear(), dnes.getMonth(), dnes.getDate()) - ZACIATOK) / DAY) + 1;
      curDay = Math.min(Math.max(curDay, 1), POSLEDNY_DEN);
      curWeek = Math.ceil(curDay / 7);
      S.viewWeek = curWeek; S.selDay = curDay;
      x[2].forEach(function (e) { S.entries[e.den] = e; });
      x[3].forEach(function (u) { S.tasks[u.tyzden] = u; });
      $('#mEyebrow').textContent = 'Deň ' + curDay + ' z ' + POSLEDNY_DEN + ' · týždeň ' + curWeek + ' · začal si ' + fmt(ZACIATOK);
      S.prez = x[4][0] && x[4][0].prezyvka;
      nadpis();
      if (!S.prez) prezyvkaForm();
      $('#soberN').textContent = curDay;
      renderVeta();
      render();
      renderGraf();
    });
  }).catch(function () {
    $('#mTitle').textContent = 'Výzvu sa nepodarilo načítať';
    $('#mEyebrow').textContent = 'Skontroluj pripojenie a obnov stránku.';
  });
})();
