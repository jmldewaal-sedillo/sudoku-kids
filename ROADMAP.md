# Roadmap – Sudoku Kids & Crazy Grids

## Status in één oogopslag

| | |
|---|---|
| **Huidige fase** | Volledige review afgerond en getest – klaar om in te pakken voor de Play Store |
| **Laatste update** | 2026-10-09 |
| **Volgende stap** | Zelf nalopen op een echte telefoon (zie Testen), daarna `assetlinks.json` regelen en inpakken met PWABuilder |

---

## Vaste regels (nooit breken)

1. **Seeds en volgorde van `LEVEL_PLAN` in `puzzles.js` nooit wijzigen.** De seed per level is `20261004 + i * 7919`. Als die verandert, horen opgeslagen sterren bij de verkeerde puzzel.
2. **Na elke wijziging aan levels altijd draaien:** `node tests/validate-levels.js`. Verwacht eindresultaat: `✅ Alle levels geldig, uniek oplosbaar en stabiel.`
3. **Bij elke release `CACHE_VERSION` in `sw.js` verhogen** (nu: `sudoku-kids-v3`), anders krijgen spelers de oude versie.
4. **Niets "klaar" noemen zonder bewijs.** Elke controle moet een commando met echte uitvoer hebben.
5. **localStorage-sleutels nooit hernoemen:** `sudokuKids_progress`, `sudokuKids_settings`, `sudokuKids_current`.
6. **Geen frameworks, build-stappen, externe CDN's, tracking, advertenties of accounts.** `tests/e2e.py` controleert dat er geen verzoek naar een ander domein gaat.
7. **Voor elke release alles groen:** `node tests/validate-levels.js`, `python3 tests/e2e.py` en `python3 tests/screenshots.py` (zie README).

---

## Logboek (nieuwste bovenaan)

### 2026-10-09 · Volledige review en verbeterronde (Claude Code, branch `review-2026-10-09`)
**Opgelost (hoog):**
- Landscape op telefoon was onbruikbaar (rooster onder de knoppen, startknop buiten beeld) → eigen landscape-layout.
- Android-terugknop sloot de app midden in een puzzel → gaat nu één scherm terug.
- Geen enkele knop op het spelscherm haalde 48×48 px → alles ≥ 48 px, op tablets 64 px.
- Game over na 3 fouten op 4×4 → 4×4 heeft geen game over meer, fouten kosten alleen sterren.
- Service worker kon bij een update oude bestanden uit de HTTP-cache in de nieuwe cache zetten.

**Opgelost (middel):**
- 9 levels (Snoepjesfabriek 26; Ruimte-raket 12, 22, 23, 24, 26, 28, 30, 35) vroegen gokken of gevorderde technieken → 1–3 extra gegeven vakjes, zelfde seed en zelfde oplossing.
- Pagina schoof 20 px omhoog na het levelscherm (kop deels buiten beeld op elk formaat).
- Onafgemaakt spel ging verloren bij verlaten/afsluiten → wordt bewaard en hervat.
- Sterren werden pas 450 ms na winnen opgeslagen; snel doorklikken kon ze aan een ander level geven.
- Dezelfde fout in hetzelfde vakje telde elke keer opnieuw.
- Notitie op een vakje met een fout cijfer was onzichtbaar.
- Spel was niet te begrijpen zonder lezen ("0/3", tekstknoppen) → hartjes/sterren, plaatjesknoppen, wijsvinger voor nieuwe spelers, schuddend slot.
- Contrast: 10 tekst/achtergrond-combinaties onder 4,5:1 (laagste 1,87) → nu 4,4–10.
- Toegankelijkheid: aria-labels vertaald, wereldkaarten als knop, verborgen schermen niet meer met Tab bereikbaar, zichtbare focus, dialoog-rollen, `prefers-reduced-motion`.
- 9×9 op 320 px breed: vakjes 25 → 33 px. Tablet-landscape: 40 → 77 px.
- Eerste start volgt de taal van het toestel (onbekende taal → Engels).
- Hint kiest een vakje dat met eenvoudige logica te vinden is.
- Privacyverklaring toegevoegd (`privacy.html`, NL + EN, link in Instellingen).
- Manifest-screenshots opnieuw gemaakt.

**Opgelost (laag):** dode CSS weg, dubbeltik-zoom uit, bestand tegen kapotte opgeslagen gegevens, nieuwe versie laadt vanzelf op start-/wereldscherm.

**Bewijs:**
- `node tests/validate-levels.js` → `✅ Alle levels geldig, uniek oplosbaar en stabiel.` + `✅ Zonder gokken op te lossen en gelijk aan de snapshot.`
- `node tests/difficulty.js` → `✅ Alle levels zijn met eenvoudige logica op te lossen (geen gokken nodig).` (was: 10 levels niet)
- `node --check` op alle .js → OK.
- `python3 tests/e2e.py` → `✅ 84/84 controles geslaagd.` (o.a. alle 105 levels uitgespeeld, offline, 0 externe verzoeken)
- `python3 tests/screenshots.py` → 7 formaten × 14 schermen, `✅ Niets buiten beeld, alle knoppen minstens 48x48 px, 0 console-errors.` (basismeting: 2 formaten vastgelopen, 5 knoppen buiten beeld, tientallen knoppen < 48 px)
- Snelheid met CPU ×4 vertraagd: 9×9 genereren max. ±9 ms, level openen ±23 ms, tik op vakje ±4 ms.

**Bestanden geraakt:** script.js, style.css, index.html, i18n.js, puzzles.js, sw.js, privacy.html (nieuw), screenshots/, README.md, ROADMAP.md, .gitignore (nieuw), tests/e2e.py (nieuw), tests/screenshots.py (nieuw), tests/manifest-screenshots.py (nieuw), tests/difficulty.js (nieuw), tests/levels.snapshot.json (nieuw), tests/validate-levels.js.

**Niet getest (kan alleen op een echt toestel):** zie de taken onder Testen.

### 2026-10-05 · GitHub + GitHub Pages live gezet (Claude Code)
- Git-repo aangemaakt (`git init`, branch `main`), alle 25 bestanden gecommit.
- GitHub-repo aangemaakt: https://github.com/jmldewaal-sedillo/sudoku-kids
- GitHub Pages ingeschakeld op `main /` → https://jmldewaal-sedillo.github.io/sudoku-kids/
- ROADMAP.md bijgewerkt (status en dit logboekitem).

**Bestanden geraakt:** ROADMAP.md.

### 2026-10-04 · Roadmap en CLAUDE.md aangemaakt (Claude Code)
- `ROADMAP.md` aangemaakt: logboek (fase 1–3), vaste regels, takenlijst en bekende beperkingen.
- `CLAUDE.md` aangemaakt: instrueert Claude Code om ROADMAP.md bij elke sessie te lezen en bij te werken.

**Bestanden geraakt:** ROADMAP.md (nieuw), CLAUDE.md (nieuw).

### 2026-10-04 · Fase 3 – Volledige audit (Claude Code)
**Getest:**
- Syntax-check (`node --check`) op puzzles.js, i18n.js, script.js, sw.js → alle OK.
- `JSON.parse` op manifest.json → OK.
- `node tests/validate-levels.js` → `✅ Alle levels geldig, uniek oplosbaar en stabiel.`
- Bestandsverwijzingen: alle 7 bronbestanden uit index.html aanwezig, alle 9 ASSETS uit sw.js aanwezig, alle 10 icoon-PNG's aanwezig, beide screenshots aanwezig.
- Alle 26 IDs uit script.js gevonden in index.html.
- Vertalingen: 48 sleutels in nl/en/de/fr, alle vier talen hebben identieke sleutelsets.
- Playwright-test telefoon (360×640): splash → wereldkaart → level 1 openen → oplossen met 1 fout → win-scherm toont 2 sterren → localStorage bevat `w0_l0: {stars:2}` na herlaad → level 2 ontgrendeld.
- Playwright-test tablet (800×1280): 3 fouten → game-over-scherm, hint/notitie/wissen/cijfers-dieren-toggle, taal naar Engels zetten persistent na herlaad, service worker geregistreerd en actief.
- **0 console-errors, 0 pageerrors.**

**Bestanden geraakt:** geen (alleen gelezen).

**Niet getest:**
- Offline-modus (vereist HTTPS; via http://ip werkt de service worker niet).
- Landscape-oriëntatie op telefoon.
- Maskable icoon op echt Android-toestel (ronde/vierkante uitsnede).
- Vergrendelde levels (6×6, 9×9, fruit) live uitspelen zonder gesimuleerde voortgang.

### 2026-10-04 · Fase 2 – Herbouw en reparatie (Claude in de chat)
**Gedaan:**
- `puzzles.js` nieuw: seeded generator (mulberry32), bitmask-oplosser, `LEVEL_PLAN` met 105 vaste levels. Elke puzzel heeft één oplossing, ook met diagonaalregels, en is op elk toestel identiek.
- `tests/validate-levels.js` nieuw: controleert geldigheid, unieke oplossing, stabiliteit, duplikaten en 35 levels per wereld.
- `i18n.js` nieuw: vertalingen in NL, EN, DE, FR. Knoppen voor muziek en auto-notities verwijderd.
- `script.js` herschreven: mascotte op spelscherm, vierkant raster dat meebeweegt met vrije ruimte, fruit in notities, hint/notitie/wissen correct, beschermde vakjes, timer pauzeert op achtergrond, veilige localStorage-fallback.
- `style.css` opgefrist: wereldkaarten, highlight-kleuren, numpad als grid, tablet-layout, safe-area.
- Nieuwe iconen: 2×2-tegel met 1–4, varianten `any` en `maskable`. Twee screenshots van 1080×1920.
- `manifest.json` en `sw.js`: relatieve paden, `id`/`scope`, `CACHE_VERSION`.
- `README.md` toegevoegd.

**Bestanden geraakt:** puzzles.js (nieuw), i18n.js (nieuw), tests/validate-levels.js (nieuw), script.js, style.css, manifest.json, sw.js, README.md (nieuw), icons/, screenshots/.

### 2026-10-04 · Fase 1 – Eerste bouw (Claude Code)
**Gebouwd:**
- `index.html`: alle schermen (splash, wereldkaart, levels, spel, instellingen) en modals.
- `style.css`: pastel-kleurenpalet, puffy knoppen, bounce-animaties, responsive layout.
- `script.js`: spellogica, 105 levels willekeurig gegenereerd bij elke start, Web Audio-geluidjes, voortgang in localStorage.
- `manifest.json`: PWA-manifest met absolute paden.
- `sw.js`: service worker met cache-first strategie en absolute paden.
- `icons/`: SVG-bronbestand + PNG-iconen gegenereerd in 8 formaten (72–512 px).

**Bestanden geraakt:** index.html, style.css, script.js, manifest.json, sw.js, icons/.

**Problemen ontdekt (opgelost in fase 2):**
- 42/105 levels hadden een ongeldige oplossing.
- 47/105 levels hadden meer dan één oplossing (waardoor een goed antwoord als fout telde).
- 29/105 levels waren onoplosbaar.
- Levels werden bij elke herstart opnieuw willekeurig gegenereerd → opgeslagen sterren klopten niet meer na een herlaad.
- 9×9 X-Sudoku hield geen rekening met de diagonaalregels bij het genereren en valideren.
- Taalinstelling, "Muziek" en "Auto-notities" deden niets.
- Mascotte was onzichtbaar tijdens het spelen.
- PNG-iconen waren leeg (emoji renderde niet bij ImageMagick-conversie).
- `sw.js` en manifest gebruikten absolute paden; screenshots ontbraken.

---

## Takenlijst

### Testen (op een echte telefoon/tablet)
- [ ] Zelf spelen op de telefoon (splash → wereld 1 → een paar levels uitspelen); let op of een kind de wijsvinger en de plaatjesknoppen snapt
- [ ] Een paar levels uit elke wereld voltooien (inclusief 6×6 en 9×9) – automatisch zijn alle 105 uitgespeeld, maar niet door een mens
- [ ] Update-gedrag: de geïnstalleerde app (v2) openen na deze release en controleren dat v3 verschijnt en de sterren er nog zijn
- [ ] Offline-modus op het toestel: app installeren, vliegtuigmodus, app openen (automatisch getest in Chromium op localhost, niet op Android)
- [ ] Android-terugknop/veeggebaar in de geïnstalleerde app: spel → levels → werelden → app sluit
- [ ] Landscape op de telefoon draaien tijdens een puzzel (automatisch getest op 640×360 en 844×390)
- [ ] Telefoon met notch/camera-uitsparing in landscape: staat er niets onder de uitsparing?
- [ ] Geluid: hoor je de piepjes, ook na het ontgrendelen van het scherm?
- [ ] Emoji's (dieren, fruit, hartjes) zien er goed uit op het toestel – op oudere Android-versies kunnen ze anders ogen
- [ ] Maskable icoon controleren op echt Android-toestel (ronde of vierkante uitsnede)
- [ ] TalkBack even aanzetten en een vakje invullen

### Publiceren
- [x] Hosting met HTTPS opzetten → GitHub Pages live op https://jmldewaal-sedillo.github.io/sudoku-kids/
- [x] Domeinnaam of subpad kiezen voor de hosting → subpad `/sudoku-kids/` op GitHub Pages
- [x] Relatieve paden in manifest.json controleren na keuze van subpad → `tests/e2e.py` controleert manifest, iconen en `sw.js`-bestanden
- [x] Privacyverklaring schrijven → `privacy.html`; **nog nalezen** en eventueel naam/e-mailadres toevoegen
- [ ] `assetlinks.json` plaatsen. **Probleem:** moet op `https://jmldewaal-sedillo.github.io/.well-known/assetlinks.json` staan (root van het domein), dat kan niet vanuit deze repo. Kies: aparte repo `jmldewaal-sedillo.github.io` met `.nojekyll`, of een eigen subdomein (bijv. `sudoku.sedillo.nl`) voor deze app. Zie README.
- [ ] Google Play-ontwikkelaarsaccount aanmaken (eenmalig $25)
- [ ] App inpakken als Android `.aab` met PWABuilder of Bubblewrap
- [ ] Signing key veilig bewaren (verlies = geen updates meer mogelijk)
- [ ] Google Play Families-vragenlijst invullen (doelgroep, advertenties, gegevens) + Data safety-formulier ("geen gegevens verzameld")
- [ ] Store-pagina aanmaken: beschrijving, categorie, contentrating, screenshots (telefoon én 7"/10" tablet), feature graphic 1024×500
- [ ] Beslissen over schermrotatie: `manifest.json` staat op `"orientation": "portrait"`. Android 16+ negeert dat op tablets; landscape werkt nu, dus `"any"` kan ook.

### Verbeteringen
- [x] Statusbalk-knoppen (hint/notitie/wissen) op tablets zijn klein → 84×64 px op tablets
- [x] Op smalle telefoons (≤360 px) zijn 9×9-cellen ≈33 px → 35 px op 360, 33 px op 320 (was 25)
- [ ] 9×9 op een telefoon blijft klein (33–40 px per vakje, onder de 48 px-richtlijn). Past niet groter op het scherm; overweeg inzoomen op een blok of 9×9 alleen aanraden op tablets.
- [ ] Notities met dieren/fruit in 9×9 zijn op een telefoon nauwelijks leesbaar (±9 px)
- [ ] Levelscherm: laat zien welk level een onafgemaakt spel heeft (bijv. ▶-markering)
- [ ] Vergrendeld level geeft geen reactie bij tikken (knop is uitgeschakeld) → kort schudden zoals bij een vergrendelde wereld
- [ ] Reset-knop is voor een kind bereikbaar (tandwiel → reset → ja). Overweeg "ingedrukt houden" of een rekensommetje als ouderslot.
- [ ] Mascotte en tekstballon liggen op het levelscherm over de onderste levelknoppen
- [ ] De sprong van 6×6 naar het eerste 9×9-level (35 open vakjes) is groot; overweeg een paar extra makkelijke 9×9's. Let op: mag de volgorde van `LEVEL_PLAN` niet veranderen.
- [ ] Monochroom icoon (`purpose: "monochrome"`) voor Android-themapictogrammen
- [ ] Voorgelezen aanwijzingen voor kinderen die niet kunnen lezen (de mascotte-teksten zijn nu alleen tekst)
- [ ] `script.js` (±720 regels) opsplitsen in losse bestanden als het verder groeit

### Ideeën
- **Muziek / achtergrondgeluid** – rustig deuntje met aan/uit-knop. Niet gebouwd: vraagt audiobestanden (groter, licenties) en een knop die kinderen terugvinden.
- **Gesproken mascotte** – korte opgenomen zinnetjes per taal ("Tik op een vakje!"). Lost het lees-probleem beter op dan plaatjes alleen.
- **Dagelijkse puzzel** – elke dag één extra level op basis van de datum als seed (geen server nodig).
- **Extra werelden** – bijv. kleuren-sudoku of 4×4 met vormen voor de allerjongsten; nieuwe werelden áchteraan toevoegen zodat bestaande levels en sterren kloppen.
- **Stickerboek / beloningen** – per 10 sterren een sticker; geeft een doel naast de sterren.
- **Meerdere spelers** – profielen per kind op één toestel (broertjes/zusjes), alleen lokaal opgeslagen.
- **Oefenmodus zonder timer en hartjes** – voor kinderen die van de teller zenuwachtig worden.
- **Ongedaan maken** – één stap terug-knop.

---

## Bekende beperkingen

- **Geen installatie of offline spelen via http://.** De service worker wordt alleen geactiveerd via `https://` of `http://localhost`. Via een lokaal IP-adres (bijv. `http://192.168.x.x:8000`) kun je de app wel testen, maar niet installeren en niet offline spelen. Dat werkt pas na HTTPS-hosting.
