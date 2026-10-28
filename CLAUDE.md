# Web Kapitán Abstinencia

Verejný web: https://kapitanabstinencia.github.io/vizitka/ (GitHub Pages z vetvy `main`, repozitár `kapitanabstinencia/vizitka`).

## Pravidlá

- Po každej dokončenej zmene ju ulož na GitHub (commit + push na `main`) s krátkym popisom po slovensky.
- Nikdy nenahrávaj heslá, kľúče ani osobné údaje. Pred každým nahratím skontroluj zmenené súbory.
- Po každej zmene mi jednou vetou napíš, čo si zmenil a či je to už na internete (stránka sa aktualizuje 1 – 2 minúty po nahratí).

## Technické

Pri každej zmene `assets/kapitan.css` alebo `assets/kapitan.js` zvýš číslo verzie v odkazoch (`kapitan.css?v=2` → `?v=3`) vo všetkých stránkach, inak prehliadače ukazujú starý vzhľad.

Pred každou zmenou na webe pošli Kamilovi fotku, ako to bude vyzerať, a zverejni až po jeho súhlase. Fotka časti stránky: spusti náhľad `vizitka` (.claude/launch.json), potom Chrome headless `--window-size=1280,1000 --virtual-time-budget=8000 --screenshot=<súbor> "http://localhost:<port>/.claude/nahlad.html?ciel=<CSS selektor>"` a súbor pošli cez SendUserFile.

## Čo nesmie ísť na verejný web

`admin.html`, `clenska-navrh.html` a `povodna.html` sú len ukážky v počítači a sú v `.gitignore`. Nepridávaj ich do Gitu, kým web nemá skutočné prihlásenie a databázu.
