# Sudoku Kids & Crazy Grids

Een sudoku-spel voor kinderen als PWA: 5 werelden, 450 levels, 3 soorten sudoku
(standaard, X-Sudoku, fruit), 3.700 puzzels, tot 6 profielen per toestel, eigen
kawaii-iconen, muziek, en 10 talen (NL, EN, DE, FR, ES, PT, IT, PL, TR, ID).

Gemaakt door **Studio Sedillo** (eenmanszaak, KvK 42122276, Nederland) · studio.sedillo@gmail.com · package name
`com.studiosedillo.sudokukids`.

| Onderwerp | Document |
|---|---|
| Alle eisen van Google Play, met status en to-do-lijst | `docs/publiceren.md` |
| Eén codebase, bouwdoelen (android, webportals, web), volgorde van lanceren | `docs/lanceren.md` |
| De hoofdsite, DNS-records van studiosedillo.com | `docs/studio-sedillo.md` |
| Android-app (Capacitor) bouwen, upload key, wat je op je toestel test | `docs/android.md` |
| Webportals (CrazyGames, Poki): eisen, advies, upload-zip | `docs/webportals.md` |
| Wat de app bewaart en verstuurt (netwerktest) | `docs/privacy-audit.md` |

## Testen en live zetten

**testen = push naar branch `test`, live = merge naar `main`.**

| | Testversie | Live versie |
|---|---|---|
| Link nu | https://jmldewaal-sedillo.github.io/sudoku-kids-test/ | https://jmldewaal-sedillo.github.io/sudoku-kids/ |
| Eigen domein | geen: de webversie is een testkopie (`noindex`); de app verschijnt als Android-app en op webportals (`docs/lanceren.md`) | geen |
| Bijwerken | `git push origin <jouw-branch>:test` | branch mergen naar `main` en pushen |
| Hoe | workflow `.github/workflows/test-deploy.yml` kopieert de branch naar de repository `sudoku-kids-test`; GitHub Pages zet die online | GitHub Pages bouwt rechtstreeks vanaf `main` |
| Herkennen | rood label **TEST + commit-id** bovenin, titel "TEST · …" | geen label |
| Opslag | sleutels met `test_` ervoor (`test_sudokuKids_progress`, …) | `sudokuKids_progress`, `sudokuKids_settings`, `sudokuKids_current` |
| Service worker | scope `/sudoku-kids-test/`, cache `sudoku-kids-test-v7-<commit>` | scope `/sudoku-kids/`, cache `sudoku-kids-v7` |
| TEST-strook | rode strook van 16 px bóven de app (valt nergens overheen) | bestaat niet |
| Formaat-balk | op een pc: balk bovenin met telefoon- en tabletformaten | bestaat niet |

Een testpush is na ongeveer een minuut online. Het commit-id in het label vertelt welke
versie je ziet; staat er nog het oude, sluit de app dan en open hem opnieuw.

De app ziet zelf dat hij een testkopie is: de hostnaam begint met `test-` of `test.`
(bijvoorbeeld `test-…`), of hij draait vanuit een map die `test` heet of op
`-test` eindigt. In de code is er verder geen verschil, dus wat je test is wat live gaat.
Sterren, instellingen en caches van test en live staan los van elkaar; `python3 tests/e2e.py`
(onderdeel 11) bewijst dat spelen en wissen in de test de live-opslag niet verandert.

### Formaat-balk (alleen testversie, alleen op een pc)

Open je de testlink op een pc, dan zie je bovenin een donkere balk (zelfde opzet als de
preview van The Flush Factor) met de knoppen Telefoon klein 360×640, standaard 390×844,
liggend 844×390, Tablet staand 800×1280, liggend 1280×800 en Volledig scherm. De app draait
dan in een frame van dat formaat (`?frame=1`); de laatste keuze wordt onthouden
(`test_sudokuKids_preview`). Op een echte telefoon verschijnt de balk niet.

- `…/sudoku-kids-test/?preview=off` – zonder balk, ook op een pc
- `…/sudoku-kids-test/?preview=on` – met balk, ook op een touchscreen

De code staat in `test-preview.js`. `script.js` laadt dat bestand alleen op het testpad; de
live app vraagt het nooit op (`tests/e2e.py`, onderdeel 15).

Er staat niets van de testversie in de live map en de Pages-instellingen van deze repository
zijn niet veranderd. De workflow gebruikt de secret `TEST_DEPLOY_KEY` (een deploy key die
alleen in `sudoku-kids-test` mag schrijven).

## Bestanden

| Bestand | Wat het doet |
|---|---|
| `index.html` | Alle schermen en pop-ups |
| `style.css` | Opmaak |
| `puzzles.js` | Puzzelmotor: generator, oplosser, het levelplan (105 levels) en de moeilijkheidsbanden |
| `puzzle-bank.js` | Voorraad van 3.700 puzzels (100 per band), gemaakt door `tools/generate-puzzles.js` |
| `level-plan.js` | Alle levels na de eerste 105 (wereld, soort, band, puzzelnummer); alleen achteraan aanvullen |
| `icons.js` | Eigen kawaii-iconen als SVG (dieren, fruit, knoppen, werelden) en de badge-plaatjes; geen licentie nodig |
| `badges.js` | Alle 100 badges: voorwaarde, plaatje, naam en uitleg in 10 talen |
| `storage.js` | Profielen en opslag; de enige plek die weet waar gegevens staan |
| `test-preview.js` | Formaat-balk van de testversie |
| `docs/account-koppelen.md` | Onderzoek en advies over inloggen/koppelen in een kinderapp |
| `docs/publiceren.md`, `docs/lanceren.md`, `docs/android.md`, `docs/ios.md`, `docs/webportals.md`, `docs/studio-sedillo.md`, `docs/privacy-audit.md`, `docs/later-verdienen.md` | Publiceren: beleid, bouwdoelen, Android-app, iOS-app, webportals, hoofdsite, privacy-audit, regels voor later geld verdienen |
| `platform.js`, `platforms/` | Waar deze kopie draait: web (standaard), `app.js` (Android en iOS), `crazygames.js`, `poki.js`. Het enige dat per bouwdoel verschilt |
| `tools/build.mjs` | Maakt `dist/app/` en de upload-zips voor de portals (zonder service worker) |
| `app/` | Het Capacitor-project met `android/` en `ios/`; `tools/build-android.sh` bouwt de `.apk`/`.aab`, `tools/build-ios.sh` het Xcode-project, `tools/app-icons.sh` maakt de iconen en startschermen |
| `.github/workflows/app-build.yml` | Bouwt bij elke push naar `test` de Android-app (debug-APK om te downloaden) en de iOS-app (gestart in de simulator op een Mac van GitHub) |
| `tests/builds.py` | Speelt de bouwdoelen met een nagebootste SDK en Capacitor-brug, en controleert het Android- en het iOS-project |
| `store/` | Store-materiaal: teksten in 10 talen (`listing.json`, `teksten.md`), icoon, feature graphic, screenshots |
| `tools/no-private-data.py` | Vangnet: controleert bestanden, commits, geschiedenis en online pagina's op privégegevens uit `~/.studio-sedillo/blocklist.txt` (uitleg: `docs/bedrijf.md`) |
| `tools/install-hooks.sh` | Zet dat vangnet aan als pre-commit en commit-msg hook |
| `tests/no-private-data.py` | Test: zelftest van het vangnet + alle bestanden van de repo (`--online`: ook de gepubliceerde pagina's) |
| `docs/bedrijf.md` | Bedrijfsgegevens, wat de wet over het adres zegt, Google Play-accounttypes, het adres-vangnet |
| `tests/store.py` | Maakt het store-materiaal en controleert het tegen de eisen van Google Play |
| `docs/icon-opties.html` | Vergelijking van drie icoonsets (alleen op de testlink) |
| `tools/generate-puzzles.js` | Nieuwe puzzels of levels maken met één commando (geen build-stap; resultaat staat in de repo) |
| `i18n.js` | Alle teksten in NL / EN / DE / FR |
| `script.js` | Spellogica en schermen |
| `manifest.json`, `sw.js` | PWA: installeren en offline spelen |
| `icons/` | App-iconen (`any` en `maskable`) |
| `screenshots/` | Twee screenshots van 1080×1920 voor het installatievenster |
| `.github/workflows/test-deploy.yml` | Zet branch `test` op de testlink |
| `tests/validate-levels.js` | Controleert alle levels automatisch |
| `tests/difficulty.js` | Meet de moeilijkheid per level en per band van de voorraad |
| `tests/count-4x4.js` | Telt hoeveel echt verschillende 4×4-puzzels er bestaan |
| `tests/e2e.py` | Speelt het spel automatisch en controleert de belangrijkste flows |
| `tests/screenshots.py` | Screenshots van elk scherm op 7 schermformaten + lay-outcontrole |
| `tests/manifest-screenshots.py` | Maakt de twee screenshots voor `manifest.json` opnieuw |

## Hoe de levels werken

De levels staan niet als vaste lijsten in de code. Elk level heeft in `puzzles.js`
een vast *seed*-getal. Daaruit maakt de generator steeds precies dezelfde puzzel,
en die puzzel heeft gegarandeerd **één** oplossing. Daardoor:

- keurt het spel nooit een goed antwoord af;
- is level 12 op elke telefoon en na elke herstart hetzelfde level, dus opgeslagen sterren blijven kloppen.

Verander de seeds niet meer nadat de app gepubliceerd is.

## Werelden en levels

| Volgorde | Wereld (id) | Levels | Gaat open na |
|---|---|---|---|
| 1 | Het Dierenbos (0) | 50× 4×4 · 50× 6×6 | altijd open |
| 2 | De Boerderij (3) | 50× 4×4 · 50× 6×6 | 17 levels in het Dierenbos |
| 3 | De Snoepjesfabriek (1) | 50× 6×6 · 50× 9×9 | 17 levels in het Dierenbos |
| 4 | De Jungle (4) | 50× 6×6 · 50× 9×9 | 17 levels in de Snoepjesfabriek |
| 5 | De Ruimte-raket (2) | 50× 9×9 | 17 levels in de Snoepjesfabriek |

Het id is het nummer in de opgeslagen voortgang (`w<id>_l<index>`) en verandert nooit; de
volgorde op het scherm staat in `WORLDS` in `script.js`. De eerste 35 levels van wereld 0–2
zijn precies de levels van vroeger; nieuwe levels staan in de opslag achteraan.

**Op het scherm** staan de levels van een wereld gesorteerd op moeilijkheid
(`orderedLevels` in `script.js`): eerst alle 4×4 van veel naar weinig gegeven vakjes, dan 6×6,
dan 9×9. Het nummer dat een kind ziet is de plek in die volgorde. Dat is alleen weergave: de
sterren blijven onder de vaste sleutel van het level staan. Een level is open als het vorige
op het scherm gehaald is of als het het eerste van een rastergrootte is; levels die bij
bestaande spelers al open waren, blijven open.

## Nieuwe puzzels of levels maken

```bash
node tools/generate-puzzles.js --status      # levels per wereld, voorraad per soort
node tools/generate-puzzles.js --max         # hoeveel unieke puzzels zijn er maximaal mogelijk
node tools/generate-puzzles.js --soort 4x4-standard --aantal 50                   # 50 extra puzzels per band
node tools/generate-puzzles.js --levels --wereld 0 --soort 6x6-fruit --aantal 10   # 10 levels achteraan wereld 0
```

Soorten: `4x4-standard`, `4x4-fruit`, `6x6-standard`, `6x6-x`, `6x6-fruit`, `9x9-standard`,
`9x9-x`, `9x9-fruit`. Bij `--levels` kun je met `--van 0 --tot 1` kiezen van welke band
(0 = makkelijkste, 1 = moeilijkste) de levels oplopen. Het script draait daarna zelf
`tests/validate-levels.js` en werkt de snapshots bij. Het kan alleen toevoegen: verandert er
een bestaande puzzel of level, dan weigert de validatie. Vergeet daarna niet `CACHE_VERSION`
te verhogen.

`--max` in het kort: 4×4 is precies geteld (per aantal gegeven vakjes 376 tot 1.040 echt
verschillende puzzels; de voorraad gebruikt er nu 200 per band waar standaard en fruit
overlappen). 6×6 en 9×9 zijn praktisch onbeperkt; daar is rekentijd de grens.

## Meer puzzels per level

Elk level heeft veel meer dan één puzzel:

- Een **soort** is grootte × type (`4-standard`, `4-shapes`, `6-standard`, `6-xsudoku`,
  `6-shapes`, `9-standard`, `9-xsudoku`, `9-shapes`).
- Elke soort heeft **moeilijkheidsbanden**: een aantal gegeven vakjes (4×4: precies één aantal
  per band, 6×6 en 9×9: een bereik van 2–3). Alle puzzels in een band hebben dus even veel
  gegeven vakjes en zijn zonder gokken op te lossen. Er zijn 37 banden met elk 100 puzzels.
- Elk level hoort bij de band van zijn eigen, oorspronkelijke puzzel. De eerste keer speel je
  die puzzel (variant 1, zodat bestaande sterren kloppen). Elke nieuwe start daarna geeft een
  puzzel uit de band die dit profiel nog niet gehad heeft. Pas als de band op is komen er
  herhalingen. De sterren blijven per level.
- Puzzel *n* van een soort komt altijd uit `bankSeed(soort, n)`. Niets hangt af van de
  volgorde van levels of werelden, dus er kunnen later puzzels, levels en werelden bij zonder
  dat iets verschuift.

De puzzels die het eigen, eerste puzzel van een level zijn, worden niet als herhaling
uitgedeeld; per band blijven er minimaal 50 vrij voor "opnieuw spelen".

4×4: er bestaan per aantal gegeven vakjes 376 tot 1.040 écht verschillende puzzels (niet in
elkaar om te zetten door draaien, spiegelen of omnummeren), zie `node tests/count-4x4.js`.
De 1.000 4×4-puzzels in de voorraad zijn onderling allemaal echt verschillend.

## Iconen, geluid en talen

- **Iconen**: alle plaatjes komen uit `icons.js` (eigen tekeningen, 60 stuks, ± 22 kB). In
  HTML: `<span class="ki" data-icon="naam">`; in code: `KawaiiIcons.svg('naam')`. Er staat
  nergens meer een emoji in de app; `tests/e2e.py` (onderdeel 17) controleert dat. Een nieuw
  icoon teken je als functie in `ICONS` met de gedeelde onderdelen (`face`, `circle`, …).
- **Geluid**: alles wordt gemaakt met de Web Audio API, er zijn geen geluidsbestanden.
  Muziek (een rustig deuntje van 32 tellen dat naadloos doorloopt, zacht, pauzeert op de
  achtergrond en start pas na de eerste tik), klikgeluid en geluidseffecten zijn drie losse
  schakelaars, per profiel bewaard.
- **Grootte**: twee keuzes, klein en groot. Groot vult de ruimte (tot 900 px), klein is 68%
  daarvan (tot 420 px); het voorbeeldblokje in Instellingen is exact zo groot als een vakje in
  het spel.
- **Privacyverklaring en gegevens verwijderen**: staan niet in de app maar op de hoofdsite
  (`studiosedillo.com/sudoku-kids/privacy` en `/delete`, repo `studio-sedillo`), in 5 talen.
  De links in Instellingen openen ze in de taal van de app; op een webportal zijn ze verborgen.
- **Talen**: `i18n.js` bevat `LANGUAGES` (volgorde en naam in de eigen taal) en `STRINGS`.
  Een taal toevoegen = een regel in `LANGUAGES` en een blok in `STRINGS` met álle sleutels van
  `nl`; onderdeel 19 van de e2e-test faalt als er een sleutel ontbreekt. Er staan geen emoji
  in de teksten.

## Profielen en opslag

Onderaan de wereldkaart en het levelscherm staat een balk: links de pratende kat, rechts het
plaatje van de speler met een wisselknopje. Het plaatje (en de ster met de score rechtsboven)
opent de profielpagina van de speler: grote avatar, naam, sterren, levels, gespeelde puzzels,
snelste tijd, sterren per wereld en badges. Het potlood naast de naam zet de pagina in
bewerkmodus. Het wisselknopje opent "Wie speelt er?"; tikken op een speler opent diens
pagina, met de knop "Spelen als …".

Sinds v6: rechtsboven staan het belletje (meldingen) en één knop met avatar + sterren die
het profiel opent; rechtsonder staat alleen nog de wisselknop met een mini-avatar. De
profielpagina heeft drie onderdelen:

- **Badges** – 100 badges uit `badges.js`: behaald in kleur, de rest grijs met voortgang
  ("7/10"); een tik toont naam, uitleg en datum. Een badge toevoegen is één `add(...)`-regel
  (plus een tekst per taal als het een nieuwe familie is). De e2e-test speelt net zo lang tot
  alle 100 gehaald zijn.
- **Werelden** – per wereld voortgang, sterren, levels per rastergrootte en een stip per
  level; een tik gaat naar de levelkeuze.
- **Geschiedenis** – elke gespeelde puzzel (level, wereld, grootte, type, datum, tijd, fouten,
  hints, sterren), nieuwste bovenaan, te filteren per wereld, met uitleg van de sterren. Er
  worden hooguit de laatste 500 puzzels bewaard; voortgang van vóór v6 staat er als "Eerder
  gespeeld".

**Meldingen** (belletje): nieuwe badge, nieuwe wereld open, 10/25/50 levels, alle sterren in
een wereld, en een paar berichtjes van de kat. Per profiel, hooguit 50, alleen op het toestel:
er zijn geen pushmeldingen en er gaat niets over internet. Maximaal 6 profielen, elk met eigen sterren, gespeelde
puzzels, instellingen (ook taal, grootte, muziek, klik en geluid) en onafgemaakt spel.

Ouderslot: de knop twee keer achter elkaar 1,5 seconde ingedrukt houden, de tweede keer
binnen 5 seconden; een ring laat de voortgang zien. Het zit vóór profiel verwijderen,
voortgang wissen, alle gegevens verwijderen en voortgang overzetten.

**Gegevens verwijderen** (Instellingen): "Reset alle voortgang" wist de sterren van het
huidige profiel; "Alle gegevens van deze app verwijderen" wist alle profielen, alle
`sudokuKids_`-sleutels, de cache en de service worker, waarna de app schoon start.
"Profiel verwijderen" (profielpagina → potlood) wist één profiel met alles wat erbij hoort.

**Voortgang overzetten** (Wie speelt er?): maakt van alle profielen één code (`SK1.…`) die je
kopieert of als bestand bewaart, en importeert zo'n code weer. Importeren overschrijft niets:
profielen komen erbij (een nog leeg beginprofiel wordt gevuld). Er wordt niets verstuurd.
Een code van buiten wordt eerst opgeschoond (`cleanProfile` in `storage.js`).

**Spelregels** (zes plaatjes): via de ?-knop in het spel, via Instellingen, en vanzelf bij het
allereerste level. **Credits**: via Instellingen.

| Sleutel in localStorage | Inhoud |
|---|---|
| `sudokuKids_progress`, `_settings`, `_current`, `_played` | profiel 1 – dezelfde sleutels als vóór de profielen, dus bestaande voortgang is vanzelf profiel 1 |
| `sudokuKids_stats`, `_history`, `_inbox` | profiel 1 – tellers voor badges, de laatste 500 puzzels, meldingen (samen ± 45 kB als alles vol is) |
| `sudokuKids_p2_progress`, … | profiel 2 en verder |
| `sudokuKids_profiles` | lijst van profielen en wie er actief is (ontstaat pas bij het tweede profiel) |

In de testversie staat er `test_` voor. Het spel praat alleen met `SudokuStorage`
(`storage.js`); daarachter zit nu de lokale provider. Een cloud-provider met dezelfde vijf
methoden kan later worden ingeplugd zonder het spel aan te passen. Zie
`docs/account-koppelen.md` voor wat daarbij komt kijken.

## Na elke wijziging aan de levels

```bash
node tests/validate-levels.js
```

Dit controleert of elke oplossing geldig is (ook de diagonalen bij X-Sudoku), of
elke puzzel precies één oplossing heeft, of de puzzels stabiel en uniek zijn, of
er per wereld 35 levels zijn, of elk level **zonder gokken** op te lossen is en of
elke puzzel nog gelijk is aan `tests/levels.snapshot.json`. Bij een fout stopt het
script met exitcode 1.

Verander je een puzzel met opzet, werk dan de snapshot bij met
`node tests/validate-levels.js --update-snapshot`. Bedenk dat spelers hun sterren
dan bij een iets andere puzzel hebben gehaald.

## Alles testen in één keer

Eenmalig installeren: `pip install playwright && playwright install chromium`.

```bash
node tests/validate-levels.js && node tests/difficulty.js && \
for f in *.js tests/*.js; do node --check "$f" || exit 1; done && \
python3 tests/no-private-data.py && python3 tests/e2e.py && python3 tests/builds.py && python3 tests/screenshots.py
```

| Commando | Wat het bewijst |
|---|---|
| `node tests/validate-levels.js` | 105 levels én 3.700 voorraadpuzzels: geldig, één oplossing, zonder gokken, geen dubbele, juiste band, gelijk aan de snapshots |
| `node tests/difficulty.js` (`--all` voor elk level) | moeilijkheidscurve per blok levels |
| `python3 tests/e2e.py` | spelregels, opslaan, terug-knop, talen, toetsenbord, snelheid (CPU ×4), offline, geen externe verzoeken, test en live naast elkaar, puzzelvarianten, profielen en migratie, zoomen/grootte, formaat-balk |
| `python3 tests/screenshots.py [map]` | niets buiten beeld, alle knoppen ≥ 48×48 px, 0 console-errors; PNG's in `tests/out/` |
| `python3 tests/store.py` (`--check` om alleen te controleren) | store-materiaal opnieuw maken; formaten, alfa en tekstlengtes volgens Google Play |

De scripts starten zelf een lokale server; er hoeft niets te draaien.

## Lokaal testen

Een service worker werkt alleen via `http://localhost` of `https://`, niet door
`index.html` dubbel te klikken.

```bash
python3 -m http.server 8000
# open http://localhost:8000 (op je telefoon: http://<ip-van-je-pc>:8000)
```

## Naar de Google Play Store

Alles staat in `docs/publiceren.md` (eisen, antwoorden voor Play Console en de to-do-lijst in
volgorde). In het kort:

1. **Hoofdsite**: https://studiosedillo.com staat (DNS bij Cloudflare, `Projecten/studio-sedillo-infra/`).
   Daar staan de privacy- en verwijderpagina (`docs/studio-sedillo.md`).
2. **Android-app (Capacitor)**: Android Studio installeren, de upload key maken en veilig
   bewaren, `tools/build-android.sh` (`docs/android.md`). De bestanden van het spel zitten in de app.
3. **Testen op een toestel** met de lijst in `docs/android.md`.
4. **Play Console** (zakelijk account): app-content, Data safety, IARC, doelgroep, store-pagina
   (`store/`), zo nodig de gesloten test met 12 testers gedurende 14 dagen, daarna productie.
4b. **App Store** (later): `docs/ios.md`.
5. **Bij elke update** verhoog je `CACHE_VERSION` in `sw.js` (webversie) en `versionCode` in
   `app/android/app/build.gradle` (Android) en `CURRENT_PROJECT_VERSION` in Xcode (iOS), en upload je
   een nieuwe `.aab` en een nieuwe build voor App Store Connect.
   Staat de app open op het start- of wereldscherm, dan laadt hij de nieuwe versie vanzelf;
   midden in een puzzel gebeurt dat pas bij de volgende start.

De screenshots voor de Play Store-pagina staan in `store/screenshots/` en upload je in de
Play Console; die in `screenshots/` zijn voor het installatievenster in de browser.
