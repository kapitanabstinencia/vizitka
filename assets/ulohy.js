// Týždenné úlohy podľa materiálov k lekciám: k = krátka odpoveď, d = dlhšia odpoveď
var ULOHY = [
  { t: "Zodpovedz si otázky", p: "Odpovedaj úprimne, nikto ťa nehodnotí.", f: [
    ["d", "Rozmýšľal si niekedy počas práce, ako už konečne pôjdeš na pivo?"],
    ["d", "Tešíš sa na piatok, aby si sa mohol ísť „rozbiť“?"],
    ["d", "Zanechal si niekedy svoje záujmy, len aby si si mohol dať?"],
    ["d", "Povedal si, že ideš len na jedno, a prišiel si domov o štvrtej ráno po preflámovanej noci?"],
    ["d", "Dal si si pauzu, ale už na druhý alebo tretí deň si si zasa dal?"],
    ["d", "Vieš si predstaviť, že si najbližší mesiac alebo dva nič nedáš? Si s tým v pohode? Alebo ťa to hneď rozladí?"],
    ["d", "Máš zdravotné problémy a aj tak si dáš?"],
    ["d", "Kedysi ti stačilo málo a teraz potrebuješ viac, aby si cítil účinok? Alebo ti paradoxne už stačí menej a o to rýchlejšie „odídeš“?"],
    ["d", "Mávaš abstinenčné príznaky? Trasú sa ti ruky, potíš sa, budíš sa nervózny s chuťou na dávku?"] ] },
  { t: "Moja vízia triezveho života", p: "Ako vidím svoj triezvy život a kde sa vidím o 5 rokov. Cieľom je čo najživší obraz, neboj sa snívať.", f: [
    ["d", "Ako tráviš dni?"], ["d", "Kto sú ľudia okolo teba?"], ["d", "Ako sa cítiš?"], ["d", "Aké máš záujmy a koníčky?"],
    ["d", "Aké situácie riešiš a ako ich riešiš?"], ["d", "Aký je tvoj vzťah k rodine, partnerovi alebo partnerke a priateľom?"], ["d", "Čo ťa teší a napĺňa?"] ] },
  { t: "Moje bezpečné a rizikové vzťahy", p: "Stačí krstné meno alebo iniciály, celé mená sem nepíš.", f: [
    ["k", "Bezpečný človek č. 1, ktorý ťa podporuje"], ["k", "Bezpečný človek č. 2"], ["k", "Bezpečný človek č. 3"],
    ["k", "Rizikový človek č. 1, ktorý ťa ťahá späť"], ["k", "Rizikový človek č. 2 (ak je)"],
    ["d", "S kým z bezpečných ľudí strávim tento týždeň viac času? Stačí malý krok: zavolať, napísať, krátke stretnutie."],
    ["d", "Ako minimalizujem kontakt s jedným rizikovým človekom? Stačí malý krok, napríklad neodpovedať na každú správu."] ] },
  { t: "Jeden nový zvyk", p: "Počas dňa si všímaj svoje návyky. Už jedna malá zmena môže položiť základ pre obrovský posun.", f: [
    ["d", "Ktoré činnosti ti dávajú energiu a ktoré ti ju berú?"],
    ["k", "Jeden „zlozvyk“, ktorý ti neslúži"],
    ["k", "Jeden nový malý „dobrý zvyk“ namiesto neho"] ] },
  { t: "Reštart tela", p: "Skús si upraviť režim podľa 8/8/8: 8 hodín spánok, 8 hodín práca, 8 hodín pre seba. Aj keď je to len 5 minút.", f: [
    ["d", "Čo budem každý deň robiť pre svoje telo?"] ] },
  { t: "Zrkadlo pravdy", p: "Každý deň si na pár minút sadni a doplň odpovede. Bez filtra a bez autocenzúry, nepíš, čo by si „mal“, ale čo naozaj je.", f: [
    ["d", "Čo som dnes naozaj cítil?"], ["d", "Bol som dnes s niekým neúprimný? Prečo?"], ["d", "Kedy som sa dnes prispôsobil alebo pretvaroval? Kvôli komu?"],
    ["d", "Kde som dnes povedal pravdu a ako som sa pri tom cítil?"], ["d", "Ak by ma dnes niekto videl úplne zvnútra, čo by uvidel?"] ] },
  { t: "Moja osobná „kontrolka“ a krízový plán", p: "Priprav sa na rizikové situácie dopredu. Aj toto prejde.", f: [
    ["k", "Červená vlajka č. 1"], ["k", "Červená vlajka č. 2"], ["k", "Červená vlajka č. 3"], ["k", "Červená vlajka č. 4 (ak je)"], ["k", "Červená vlajka č. 5 (ak je)"],
    ["k", "Krízový plán: komu zavolám"], ["k", "Krízový plán: kam pôjdem"], ["d", "Krízový plán: čo mi pomáha"],
    ["d", "Moja hranica: čo už nikdy nechcem prekročiť?"] ] },
  { t: "Znič svoj mýtus", p: "Počas celého týždňa si v praxi dokazuj, že mýtus neplatí. Na konci týždňa odpovedz na zvyšné otázky.", f: [
    ["k", "Mýtus, ktorý ťa najviac ovplyvňoval"], ["d", "Podarilo sa ti dokázať si, že mýtus neplatí?"], ["d", "Aký bol tvoj pocit, keď si sa na to vedome sústredil?"] ] },
  { t: "Jeden konkrétny skutok", p: "Urob jeden konkrétny, malý, ale úprimný čin, ktorým človeku ukážeš, že sa meníš. Stačí krstné meno alebo iniciály.", f: [
    ["k", "Komu si svojou závislosťou najviac ublížil?"], ["d", "Aký skutok urobím?"], ["d", "Podarilo sa ti urobiť ten skutok?"],
    ["d", "Zmenilo sa niečo, alebo nie?"], ["d", "Aký bol tvoj pocit, keď si ten skutok robil?"], ["d", "Všimol si si, či to tá osoba prijala?"] ] },
  { t: "Kde nájsť radosť?", p: "Nájdi jednu vec a venuj jej tento týždeň aspoň 10 minút denne.", f: [
    ["d", "Čo by si robil, keby to bolo zadarmo?"], ["d", "Čo ťa naozaj baví, napĺňa a prináša ti radosť, aj keby za to neboli žiadne peniaze alebo pochvala?"], ["k", "Jedna vec, ktorej sa budem venovať 10 minút denne"] ] },
  { t: "Vytvor si svoj štít", p: "Tvoja sebadôvera bude rásť s každým prehraným scenárom. Odpoveď si povedz nahlas do zrkadla.", f: [
    ["d", "Kde by mohlo prísť pokušenie alebo nepríjemná otázka? Napríklad „Daj si aspoň jeden pohár.“"], ["d", "Moja jedna silná prerámcovaná odpoveď"] ] },
  { t: "Ukotvenie jednej veci", p: "Spomedzi hodnôt a bodov, ktoré si si napísal, vyber len jednu vec. Pripomínaj si ju ráno, večer a vždy, keď ju budeš potrebovať.", f: [
    ["k", "Moja jedna vec na tento týždeň"], ["d", "Ako ju budem každý deň žiť?"] ] },
  { t: "Rituál triezveho znovuzrodenia", p: "List svojmu starému JA napíš rukou na papier, sem nie. Potom ho spáľ, roztrhaj alebo zakop. Tu si napíš manifest nového JA a prečítaj ho nahlas.", f: [
    ["k", "Som ten, kto…"], ["k", "Každý deň žijem…"], ["k", "Moje telo je…"], ["k", "Môj život má zmysel, keď…"], ["k", "Vybral som si…"] ] }
];
