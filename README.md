# Sudoku Kids & Crazy Grids

Een sudoku-spel voor kinderen als PWA: 3 werelden, 105 levels, 3 soorten sudoku
(standaard, X-Sudoku, fruit), in het Nederlands, Engels, Duits en Frans.

## Testen en live zetten

**testen = push naar branch `test`, live = merge naar `main`.**

| | Testversie | Live versie |
|---|---|---|
| Link | https://jmldewaal-sedillo.github.io/sudoku-kids-test/ | https://jmldewaal-sedillo.github.io/sudoku-kids/ |
| Bijwerken | `git push origin <jouw-branch>:test` | branch mergen naar `main` en pushen |
| Hoe | workflow `.github/workflows/test-deploy.yml` kopieert de branch naar de repository `sudoku-kids-test`; GitHub Pages zet die online | GitHub Pages bouwt rechtstreeks vanaf `main` |
| Herkennen | rood label **TEST + commit-id** bovenin, titel "TEST · …" | geen label |
| Opslag | sleutels met `test_` ervoor (`test_sudokuKids_progress`, …) | `sudokuKids_progress`, `sudokuKids_settings`, `sudokuKids_current` |
| Service worker | scope `/sudoku-kids-test/`, cache `sudoku-kids-test-v3-<commit>` | scope `/sudoku-kids/`, cache `sudoku-kids-v3` |

Een testpush is na ongeveer een minuut online. Het commit-id in het label vertelt welke
versie je ziet; staat er nog het oude, sluit de app dan en open hem opnieuw.

De app ziet zelf dat hij een testkopie is: hij draait dan vanuit een map die `test` heet of
op `-test` eindigt. In de code is er verder geen verschil, dus wat je test is wat live gaat.
Sterren, instellingen en caches van test en live staan los van elkaar; `python3 tests/e2e.py`
(onderdeel 11) bewijst dat spelen en wissen in de test de live-opslag niet verandert.

Er staat niets van de testversie in de live map en de Pages-instellingen van deze repository
zijn niet veranderd. De workflow gebruikt de secret `TEST_DEPLOY_KEY` (een deploy key die
alleen in `sudoku-kids-test` mag schrijven).

## Bestanden

| Bestand | Wat het doet |
|---|---|
| `index.html` | Alle schermen en pop-ups |
| `style.css` | Opmaak |
| `puzzles.js` | Puzzelmotor: generator, oplosser en het levelplan (105 levels) |
| `i18n.js` | Alle teksten in NL / EN / DE / FR |
| `script.js` | Spellogica en schermen |
| `manifest.json`, `sw.js` | PWA: installeren en offline spelen |
| `icons/` | App-iconen (`any` en `maskable`) |
| `screenshots/` | Twee screenshots van 1080×1920 voor het installatievenster |
| `privacy.html` | Privacyverklaring (NL + EN), ook offline beschikbaar |
| `.github/workflows/test-deploy.yml` | Zet branch `test` op de testlink |
| `tests/validate-levels.js` | Controleert alle levels automatisch |
| `tests/difficulty.js` | Meet de moeilijkheid per level |
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
| `node tests/validate-levels.js` | 105 levels geldig, één oplossing, zonder gokken, gelijk aan de snapshot |
| `node tests/difficulty.js` (`--all` voor elk level) | moeilijkheidscurve per blok levels |
| `python3 tests/e2e.py` | spelregels, opslaan, terug-knop, talen, toetsenbord, snelheid (CPU ×4), offline, geen externe verzoeken, test en live naast elkaar |
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
