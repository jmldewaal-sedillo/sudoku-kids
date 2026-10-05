# Sudoku Kids & Crazy Grids

Een sudoku-spel voor kinderen als PWA: 3 werelden, 105 levels, 3 soorten sudoku
(standaard, X-Sudoku, fruit), in het Nederlands, Engels, Duits en Frans.

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
| `tests/validate-levels.js` | Controleert alle levels automatisch |

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
elke puzzel precies één oplossing heeft, of de puzzels stabiel en uniek zijn en of
er per wereld 35 levels zijn. Bij een fout stopt het script met exitcode 1, zodat
je het ook in een build-stap kunt gebruiken.

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
4. **Play Console**: je hebt een ontwikkelaarsaccount nodig. Omdat de app op kinderen
   gericht is, gelden het *Families*-beleid en de vragenlijst over de doelgroep. De app
   verzamelt geen gegevens en heeft geen advertenties, maar een privacyverklaring
   (een eenvoudige pagina op je domein) is wel verplicht.
5. **Bij elke update** verhoog je `CACHE_VERSION` in `sw.js`, zodat spelers de nieuwe versie krijgen.

De screenshots voor de Play Store-pagina upload je apart in de Play Console;
die in `screenshots/` zijn voor het installatievenster in de browser.
