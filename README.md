# Sudoku Kids & Crazy Grids

Een sudoku-spel voor kinderen als PWA: 3 werelden, 105 levels, 3 soorten sudoku
(standaard, X-Sudoku, fruit), 3.700 extra puzzels, tot 6 profielen per toestel,
in het Nederlands, Engels, Duits en Frans.

## Testen en live zetten

**testen = push naar branch `test`, live = merge naar `main`.**

| | Testversie | Live versie |
|---|---|---|
| Link | https://jmldewaal-sedillo.github.io/sudoku-kids-test/ | https://jmldewaal-sedillo.github.io/sudoku-kids/ |
| Bijwerken | `git push origin <jouw-branch>:test` | branch mergen naar `main` en pushen |
| Hoe | workflow `.github/workflows/test-deploy.yml` kopieert de branch naar de repository `sudoku-kids-test`; GitHub Pages zet die online | GitHub Pages bouwt rechtstreeks vanaf `main` |
| Herkennen | rood label **TEST + commit-id** bovenin, titel "TEST · …" | geen label |
| Opslag | sleutels met `test_` ervoor (`test_sudokuKids_progress`, …) | `sudokuKids_progress`, `sudokuKids_settings`, `sudokuKids_current` |
| Service worker | scope `/sudoku-kids-test/`, cache `sudoku-kids-test-v4-<commit>` | scope `/sudoku-kids/`, cache `sudoku-kids-v4` |
| Formaat-balk | op een pc: balk bovenin met telefoon- en tabletformaten | bestaat niet |

Een testpush is na ongeveer een minuut online. Het commit-id in het label vertelt welke
versie je ziet; staat er nog het oude, sluit de app dan en open hem opnieuw.

De app ziet zelf dat hij een testkopie is: hij draait dan vanuit een map die `test` heet of
op `-test` eindigt. In de code is er verder geen verschil, dus wat je test is wat live gaat.
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
| `puzzle-bank.js` | Voorraad van 3.700 puzzels (100 per band), gemaakt door `tools/build-bank.js` |
| `storage.js` | Profielen en opslag; de enige plek die weet waar gegevens staan |
| `test-preview.js` | Formaat-balk van de testversie |
| `docs/account-koppelen.md` | Onderzoek en advies over inloggen/koppelen in een kinderapp |
| `tools/build-bank.js` | Breidt de puzzelvoorraad uit (geen build-stap; resultaat staat in de repo) |
| `i18n.js` | Alle teksten in NL / EN / DE / FR |
| `script.js` | Spellogica en schermen |
| `manifest.json`, `sw.js` | PWA: installeren en offline spelen |
| `icons/` | App-iconen (`any` en `maskable`) |
| `screenshots/` | Twee screenshots van 1080×1920 voor het installatievenster |
| `privacy.html` | Privacyverklaring (NL + EN), ook offline beschikbaar |
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

## Meer puzzels per level

Er blijven 35 levels per wereld, maar elk level heeft veel meer dan één puzzel:

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

De voorraad uitbreiden: `node tools/build-bank.js 150` (aantal per band) en daarna
`node tests/validate-levels.js --update-snapshot`. Bestaande puzzels blijven staan; de
snapshot bewaakt dat.

4×4: er bestaan per aantal gegeven vakjes 376 tot 1.040 écht verschillende puzzels (niet in
elkaar om te zetten door draaien, spiegelen of omnummeren), zie `node tests/count-4x4.js`.
De 1.000 4×4-puzzels in de voorraad zijn onderling allemaal echt verschillend.

## Profielen en opslag

Tik op de kat rechtsonder (wereldkaart of levelscherm) voor "Wie speelt er?". Maximaal 6
profielen, elk met een dierenplaatje, een optionele naam, eigen sterren, eigen gespeelde
puzzels, eigen instellingen en een eigen onafgemaakt spel. Verwijderen en voortgang wissen
zitten achter het ouderslot (knop 3 seconden ingedrukt houden).

| Sleutel in localStorage | Inhoud |
|---|---|
| `sudokuKids_progress`, `_settings`, `_current`, `_played` | profiel 1 – dezelfde sleutels als vóór de profielen, dus bestaande voortgang is vanzelf profiel 1 |
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
python3 tests/e2e.py && python3 tests/screenshots.py
```

| Commando | Wat het bewijst |
|---|---|
| `node tests/validate-levels.js` | 105 levels én 3.700 voorraadpuzzels: geldig, één oplossing, zonder gokken, geen dubbele, juiste band, gelijk aan de snapshots |
| `node tests/difficulty.js` (`--all` voor elk level) | moeilijkheidscurve per blok levels |
| `python3 tests/e2e.py` | spelregels, opslaan, terug-knop, talen, toetsenbord, snelheid (CPU ×4), offline, geen externe verzoeken, test en live naast elkaar, puzzelvarianten, profielen en migratie, zoomen/grootte, formaat-balk |
| `python3 tests/screenshots.py [map]` | niets buiten beeld, alle knoppen ≥ 48×48 px, 0 console-errors; PNG's in `tests/out/` |

De scripts starten zelf een lokale server; er hoeft niets te draaien.

## Lokaal testen

Een service worker werkt alleen via `http://localhost` of `https://`, niet door
`index.html` dubbel te klikken.

```bash
python3 -m http.server 8000
# open http://localhost:8000 (op je telefoon: http://<ip-van-je-pc>:8000)
```

## Naar de Google Play Store

1. **Online zetten via HTTPS**, bijvoorbeeld GitHub Pages, Netlify of Cloudflare Pages.
   De paden zijn relatief, dus een submap werkt ook.
2. **Inpakken als Android-app (TWA)** met [PWABuilder](https://www.pwabuilder.com)
   of Bubblewrap (`npx @bubblewrap/cli init --manifest https://jouw-domein/manifest.json`).
   Dat levert een `.aab`-bestand en een signing key op. Bewaar die key goed.
3. **`assetlinks.json` plaatsen** op `https://jouw-domein/.well-known/assetlinks.json`.
   PWABuilder/Bubblewrap maakt dit bestand voor je. Zonder dit bestand toont de app een adresbalk.
   **Let op bij GitHub Pages:** het bestand moet in de *root van het domein* staan, dus op
   `https://jmldewaal-sedillo.github.io/.well-known/assetlinks.json` en niet onder
   `/sudoku-kids/`. Dat kan alleen via een aparte repository `jmldewaal-sedillo.github.io`
   (met een leeg bestand `.nojekyll` erin, anders slaat GitHub mappen met een punt over)
   of met een eigen (sub)domein voor deze app.
4. **Play Console**: je hebt een ontwikkelaarsaccount nodig. Omdat de app op kinderen
   gericht is, gelden het *Families*-beleid en de vragenlijst over de doelgroep. De app
   verzamelt geen gegevens en heeft geen advertenties, maar een privacyverklaring
   is wel verplicht. Die staat in `privacy.html`; de link voor de Play Console is
   `https://jouw-domein/privacy.html`. Lees hem na en vul eventueel je contactgegevens aan.
5. **Bij elke update** verhoog je `CACHE_VERSION` in `sw.js`, zodat spelers de nieuwe versie krijgen.
   Staat de app open op het start- of wereldscherm, dan laadt hij de nieuwe versie vanzelf;
   midden in een puzzel gebeurt dat pas bij de volgende start.

De screenshots voor de Play Store-pagina upload je apart in de Play Console;
die in `screenshots/` zijn voor het installatievenster in de browser.
