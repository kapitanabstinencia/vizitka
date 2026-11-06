// Prihlásenie do členskej sekcie cez Supabase (odkaz na e-mail, bez hesla)
var CLEN = (function () {
  var API = 'https://asguqfkmidmebwnitkdl.supabase.co', KEY = 'sb_publishable_63OW-uNoThhcVRXfaFuG2g_Wz9RAQsI', ULOZENE = 'ka_relacia';

  function nacitaj() { try { return JSON.parse(localStorage.getItem(ULOZENE)); } catch (e) { return null; } }
  function uloz(r) { try { if (r) localStorage.setItem(ULOZENE, JSON.stringify(r)); else localStorage.removeItem(ULOZENE); } catch (e) {} }
  function volaj(cesta, nastavenia, token) {
    var h = { apikey: KEY, 'Content-Type': 'application/json' };
    if (token) h.Authorization = 'Bearer ' + token;
    return fetch(API + cesta, Object.assign({ headers: h }, nastavenia));
  }
  function relaciaZo(d) { return { token: d.access_token, obnova: d.refresh_token, do: Date.now() + (+d.expires_in || 3600) * 1000 }; }

  return {
    // Vracia chybu z odkazu v e-maile (napr. vypršal) alebo prázdny text
    zOdkazu: function () {
      if (location.hash.length < 2) return '';
      var p = new URLSearchParams(location.hash.slice(1));
      if (!p.get('access_token') && !p.get('error')) return '';
      history.replaceState(null, '', location.pathname + location.search);
      if (p.get('access_token')) { uloz(relaciaZo({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in') })); return ''; }
      return p.get('error_code') || p.get('error');
    },
    // Rovnaká odpoveď pre pozvaných aj nepozvaných, web neprezradí, kto je člen
    posliOdkaz: function (email) {
      return volaj('/auth/v1/otp?redirect_to=' + encodeURIComponent(location.origin + location.pathname), { method: 'POST', body: JSON.stringify({ email: email, create_user: false }) })
        .then(function (r) { if (r.status === 429) throw new Error('vela'); if (r.status >= 500) throw new Error('server'); });
    },
    relacia: function () {
      var r = nacitaj();
      if (!r) return Promise.resolve(null);
      if (Date.now() < r.do - 60000) return Promise.resolve(r);
      return volaj('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: r.obnova }) })
        .then(function (o) {
          if (o.status >= 400 && o.status < 500) { uloz(null); return null; }
          if (!o.ok) throw new Error('server');
          return o.json().then(function (d) { var n = relaciaZo(d); uloz(n); return n; });
        });
    },
    // Čítanie a zápis v databáze za prihláseného člena, pravidlá stráži Supabase
    db: function (cesta, nastavenia) {
      return this.relacia().then(function (r) {
        if (!r) throw new Error('odhlaseny');
        return volaj('/rest/v1/' + cesta, nastavenia || {}, r.token);
      }).then(function (o) {
        if (!o.ok) throw new Error('db ' + o.status);
        return o.status === 200 ? o.json() : null;
      });
    },
    // Dočasný odkaz na video vydá server len pre prihláseného člena a otvorený týždeň
    video: function (tyzden, box) {
      box.innerHTML = '<span class="cap">Načítavam video…</span>';
      this.relacia().then(function (r) {
        if (!r) throw new Error('odhlaseny');
        return fetch(API + '/functions/v1/video', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + r.token }, body: JSON.stringify({ tyzden: tyzden }) });
      }).then(function (o) { if (!o.ok) throw new Error('video'); return o.json(); }).then(function (d) {
        var f = document.createElement('iframe');
        f.src = d.url + '&autoplay=false'; f.title = 'Video lekcie ' + tyzden; f.loading = 'lazy';
        f.allow = 'fullscreen; picture-in-picture'; f.allowFullscreen = true;
        f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
        box.innerHTML = ''; box.appendChild(f);
      }).catch(function () { box.innerHTML = '<span class="cap">Video sa nepodarilo načítať. Obnov stránku.</span>'; });
    },
    // PDF k lekcii: Supabase pustí len otvorené týždne, odkaz na stiahnutie platí 10 minút
    materialy: function (tyzden, box) {
      var NAZVY = { Pribeh: 'Príbeh týždňa', Ulohy: 'Úlohy na týždeň' };
      this.relacia().then(function (r) {
        if (!r) return;
        var h = { apikey: KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + r.token };
        return fetch(API + '/storage/v1/object/list/materialy', { method: 'POST', headers: h, body: JSON.stringify({ prefix: tyzden + '/', limit: 20, sortBy: { column: 'name', order: 'desc' } }) })
          .then(function (o) { return o.ok ? o.json() : []; })
          .then(function (zoz) {
            zoz = zoz.filter(function (f) { return /\.pdf$/i.test(f.name); });
            if (!zoz.length) { box.innerHTML = ''; return; }
            box.innerHTML = '<p class="eyebrow" style="margin:0">Na stiahnutie</p><div class="stiahni"></div>';
            zoz.forEach(function (f) {
              var meno = f.name.replace(/\.pdf$/i, ''), b = document.createElement('button');
              b.type = 'button'; b.className = 'btn small';
              b.textContent = '↓ ' + (NAZVY[meno] || meno.replace(/[_-]+/g, ' ')) + ' (PDF)';
              b.onclick = function () {
                b.disabled = true;
                fetch(API + '/storage/v1/object/sign/materialy/' + tyzden + '/' + encodeURIComponent(f.name), { method: 'POST', headers: h, body: JSON.stringify({ expiresIn: 600 }) })
                  .then(function (o) { if (!o.ok) throw new Error('pdf'); return o.json(); })
                  .then(function (d) { location.href = API + '/storage/v1' + d.signedURL + '&download=' + encodeURIComponent('Kapitan-Abstinencia-tyzden-' + tyzden + '-' + f.name); })
                  .catch(function () { if (window.KA) KA.toast('Súbor sa nepodarilo stiahnuť. Skús to znova.'); })
                  .then(function () { b.disabled = false; });
              };
              box.querySelector('.stiahni').appendChild(b);
            });
          });
      }).catch(function () {});
    },
    pouzivatel: function (r) { return volaj('/auth/v1/user', {}, r.token).then(function (o) { if (!o.ok) throw new Error('user'); return o.json(); }); },
    odhlas: function () {
      var r = nacitaj(); uloz(null);
      return r ? volaj('/auth/v1/logout', { method: 'POST' }, r.token).catch(function () {}) : Promise.resolve();
    }
  };
})();

// Karta prihlásenia na stránke Členská sekcia
(function () {
  var karta = document.getElementById('lgKarta');
  if (!karta) return;
  var ZAMOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  var OBALKA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
  var CLOVEK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  function formular(chyba, email) {
    karta.innerHTML = '<div class="lc-top"><h2>' + ZAMOK + 'Prihlásenie</h2><span class="chip warn">Testovanie</span></div>' +
      (chyba ? '<p class="lg-chyba" role="alert">' + chyba + '</p>' : '') +
      '<label for="lgMail">E-mail</label><input type="email" id="lgMail" placeholder="tvoj@email.sk" autocomplete="email" required>' +
      '<label class="check" style="font-size:14px;font-weight:400;margin:0"><input type="checkbox" required><span>Súhlasím so spracovaním osobných údajov podľa <a href="ochrana-udajov.html">zásad ochrany osobných údajov</a>.</span></label>' +
      '<button class="btn btn-primary" type="submit">Pošli mi prihlasovací odkaz</button>' +
      '<p class="nt">Heslo netreba, na e-mail ti príde odkaz. Pokojne použi e-mail, ktorý nikto nepozná. Zatiaľ len pre pozvaných testerov.</p>';
    if (email) karta.querySelector('#lgMail').value = email;
    karta.onsubmit = function (e) {
      e.preventDefault();
      var adresa = karta.querySelector('#lgMail').value.trim(), btn = karta.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Odosielam…';
      CLEN.posliOdkaz(adresa).then(function () { odoslane(adresa); }).catch(function (x) {
        formular(x.message === 'vela' ? 'Veľa pokusov naraz. Skús to znova o niekoľko minút.' : 'Nepodarilo sa to odoslať. Skontroluj pripojenie a skús to znova.', adresa);
      });
    };
  }
  function odoslane(adresa) {
    karta.onsubmit = function (e) { e.preventDefault(); };
    karta.innerHTML = '<div class="lc-top"><h2>' + OBALKA + 'Pozri si e-mail</h2><span class="chip ok">Odoslané</span></div>' +
      '<p style="margin:0">Ak je <b id="lgAdresa"></b> medzi pozvanými, do pár minút ti príde e-mail s odkazom na prihlásenie. Klikni naň v tomto prehliadači.</p>' +
      '<p class="nt">Nič neprišlo? Pozri aj do Spamu, Promo akcií a Všetkých správ. Odkaz platí hodinu.</p>' +
      '<button class="btn" type="button" id="lgIny">Zadať iný e-mail</button>';
    karta.querySelector('#lgAdresa').textContent = adresa;
    karta.querySelector('#lgIny').onclick = function () { formular(); };
  }
  function prihlaseny(email) {
    karta.onsubmit = function (e) { e.preventDefault(); };
    karta.innerHTML = '<div class="lc-top"><h2>' + CLOVEK + 'Si dnu</h2><span class="chip ok">Prihlásený</span></div>' +
      '<p style="margin:0">Prihlásený e-mail: <b id="lgAdresa"></b></p>' +
      '<a class="btn btn-primary" href="moja-vyzva.html">Vstúpiť do výzvy</a>' +
      '<button class="btn" type="button" id="lgVon">Odhlásiť sa</button>';
    karta.querySelector('#lgAdresa').textContent = email;
    karta.querySelector('#lgVon').onclick = function () { CLEN.odhlas().then(function () { formular(); }); };
  }

  var chyba = CLEN.zOdkazu();
  if (chyba) { formular(chyba === 'otp_expired' ? 'Tento odkaz už neplatí. Zadaj e-mail a príde ti nový.' : 'Prihlásenie sa nepodarilo. Zadaj e-mail a skús to znova.'); return; }
  CLEN.relacia().then(function (r) {
    if (!r) { formular(); return; }
    return CLEN.pouzivatel(r).then(function (u) { prihlaseny(u.email); });
  }).catch(function () { formular('Prihlásenie sa teraz nepodarilo overiť. Skús to znova.'); });
})();
