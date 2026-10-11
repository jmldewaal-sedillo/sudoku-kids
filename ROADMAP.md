# Roadmap – Sudoku Kids & Crazy Grids

## Status in één oogopslag

| | |
|---|---|
| **Huidige fase** | v3 staat live; v5 staat op de testlink (5 werelden / 450 levels, kawaii-iconen, muziek, 10 talen, profielpagina's, dubbel ouderslot) |
| **Laatste update** | 2026-10-11 |
| **Volgende stap** | v5 nalopen op de testlink (zie Testen), daarna mergen naar `main`; dan de groep "Voor publiceren" |
| **Testversie** | https://jmldewaal-sedillo.github.io/sudoku-kids-test/ – branch `test`, nu gelijk aan `feature-2026-10-11` (cache v5) |
| **Live versie** | https://jmldewaal-sedillo.github.io/sudoku-kids/ – branch `main`, cache `sudoku-kids-v3` (live sinds 2026-10-11) |

---

## Vaste regels (nooit breken)

1. **Bestaande puzzels veranderen nooit.**
   - *De eerste 105 levels:* houden hun seed `20261004 + i * 7919` en hun plek in `LEVEL_PLAN`. Die volgorde en seeds nooit wijzigen.
   - *Alle levels daarna* staan in `level-plan.js` als (wereld, soort, band, puzzelnummer). Alleen ACHTERAAN aanvullen via `tools/generate-puzzles.js`, nooit regels verplaatsen of weghalen: `w<wereld>_l<index>` in de voortgang van spelers mag nooit verschuiven. Wereld-id's (0 bos, 1 snoep, 2 raket, 3 boerderij, 4 jungle) veranderen nooit; de volgorde op het scherm staat los daarvan in `WORLDS`.
   - *Ontgrendelen:* een wereld gaat open na 17 gehaalde levels in de wereld ervoor (was "de helft van 35"). Dat getal niet verhogen, anders gaat een wereld bij bestaande spelers weer op slot.
   - *Voorraad:* puzzel *n* van een soort komt uit `bankSeed(soort, n)` – per (soort, nummer), niet per totale volgorde. Er mogen puzzels, banden, levels en werelden bij; een bestaand nummer mag nooit een andere puzzel worden. `puzzle-bank.js` alleen uitbreiden via `tools/generate-puzzles.js`.
   - De banden in `BANDS` (`puzzles.js`) niet verschuiven: opgeslagen "al gespeeld"-lijsten staan per band.
2. **Na elke wijziging aan levels of de voorraad altijd draaien:** `node tests/validate-levels.js`. Verwacht: drie regels met ✅ (levels geldig; zonder gokken en gelijk aan de snapshot; voorraad geldig en gelijk aan de snapshot).
3. **Bij elke release `CACHE_VERSION` in `sw.js` verhogen** (live: `sudoku-kids-v3`, test: `sudoku-kids-v5`), anders krijgen spelers de oude versie.
4. **Niets "klaar" noemen zonder bewijs.** Elke controle moet een commando met echte uitvoer hebben.
5. **localStorage-sleutels nooit hernoemen:** `sudokuKids_progress`, `sudokuKids_settings`, `sudokuKids_current`, `sudokuKids_played` (profiel 1), `sudokuKids_p<n>_…` (overige profielen) en `sudokuKids_profiles`. Alle opslag loopt via `storage.js`.
6. **Geen frameworks, build-stappen, externe CDN's, tracking, advertenties of accounts.** `tests/e2e.py` controleert dat er geen verzoek naar een ander domein gaat.
7. **testen = push naar branch `test`, live = merge naar `main`.** Niets gaat naar `main` voordat het op de testlink is nagelopen. De testversie gebruikt `test_`-sleutels en een eigen cache; dat onderscheid (`IS_TEST` in `script.js` en `sw.js`) nooit weghalen.
8. **Voor elke release alles groen:** `node tests/validate-levels.js`, `python3 tests/e2e.py` en `python3 tests/screenshots.py` (zie README).

---

## Logboek (nieuwste bovenaan)

### 2026-10-11 · v5 op de testlink: feedbackronde A t/m F (Claude Code, branch `feature-2026-10-11`)
Vooraf gevraagd en beantwoord: A1 = 50 levels per rastergrootte per wereld (later verder aanvullen), B1 = optie 1 (zelf getekende iconen), A3 = Boerderij + Jungle.

**A – werelden en puzzels.** 450 levels in 5 werelden, elke wereld 50 levels per rastergrootte. De eerste 105 levels zijn onveranderd (zelfde plek, zelfde puzzel); nieuwe staan achteraan in `level-plan.js`. Nieuwe werelden Boerderij (id 3: 4×4 + 6×6, tussen Dierenbos en Snoepjesfabriek) en Jungle (id 4: 6×6 + 9×9, tussen Snoepjesfabriek en Ruimte-raket). `tools/generate-puzzles.js` maakt met één commando puzzels of levels, valideert en werkt de snapshot bij (`--status`, `--max`). Wereldkaarten tonen met kleine rastertjes hoeveel levels er per grootte zijn. Het eerste level van elk blok is altijd open.

**B – kawaii-iconen.** `docs/icon-opties.html` met drie opties (eigen SVG, OpenMoji CC BY-SA 4.0, Fluent Emoji MIT); gekozen: eigen SVG. 60 iconen in `icons.js` (± 22 kB), doorgevoerd in de hele app; er staat nergens meer een emoji. Nieuw app-icoon met de kat (alle 10 PNG's + 2 SVG's). **Credits:** niet nodig (eigen werk). OpenMoji en Fluent staan alleen op de vergelijkingspagina, met hun licentie en bronvermelding, en zitten niet in de app.

**C – geluid.** Achtergrondmuziek met de Web Audio API (eigen deuntje, 32 tellen, naadloos, zacht, pauzeert op de achtergrond, start na de eerste tik), schakelaar "Klikgeluid" (zacht tikje bij elke knop), "Geluidseffecten" ongewijzigd. Alle drie per profiel.

**D – instellingen.** Zes talen erbij: Spaans, Portugees, Italiaans, Pools, Turks, Indonesisch (10 totaal), met de naam in de taal zelf. Onderbouwing: de grootste Google Play-markten naar downloads zijn India, Brazilië en Indonesië, daarna o.a. de VS, Rusland, Mexico en Turkije (schattingen van Sensor Tower/data.ai, geen cijfers van Google en niet specifiek voor gezinnen – die heb ik niet kunnen vinden). Hindi, Russisch en Arabisch (rechts-naar-links) staan op de roadmap. Grootte: een echt cijferblokje op ware grootte voor 4×4, 6×6 en 9×9, dat meteen verandert.

**E – ouderslot.** Twee keer 1,5 s ingedrukt houden, de tweede keer binnen 5 s, met voortgangsring. Geen contextmenu, tekstselectie of scrollen op de knop.

**F – profielen.** Ster met score rechtsboven en de avatar rechtsonder openen de profielpagina (grote avatar, naam met potlood, sterren, levels, puzzels, snelste tijd, sterren per wereld, 4 badges). Spelerslijst zonder potlood; tikken opent de pagina van die speler met "Spelen als …". Onderbalk: pratende kat links, speler + wisselknop rechts; de schermen eindigen boven de balk, dus hij bedekt nooit een knop. TEST-label is een eigen strook boven de app.

**Bewijs:**
- `node tests/validate-levels.js` → drie keer ✅ (450 levels, 3.700 puzzels).
- `node tests/difficulty.js` → beide ✅.
- `python3 tests/e2e.py` → `✅ 231/231 controles geslaagd.` (72 nieuw voor A t/m F; o.a. alle 450 levels uitgespeeld, generatiescript in een kopie gedraaid, geen emoji meer, 10 talen compleet, voorbeeldblokje = echt vakje).
- `python3 tests/screenshots.py` → 7 formaten × 22 schermen, `✅ Niets buiten beeld, alle knoppen minstens 48x48 px, 0 console-errors.`

**Niet te testen zonder mens/toestel:** hoe de muziek klinkt, of de vertalingen natuurlijk zijn, of het ouderslot op een telefoon prettig werkt.

**Bestanden geraakt:** script.js, style.css, index.html, i18n.js, puzzles.js, storage.js, sw.js, manifest.json, icons.js (nieuw), level-plan.js (nieuw), icons/ (alle iconen), screenshots/, tools/generate-puzzles.js (nieuw, vervangt build-bank.js), docs/icon-opties.html (nieuw), tests/ (e2e, screenshots, validate-levels, difficulty, count-4x4, snapshots), .github/workflows/test-deploy.yml, README.md, ROADMAP.md.

### 2026-10-11 · v4 op de testlink: formaat-balk, grootte, 3.700 puzzels, profielen (Claude Code, branch `feature-2026-10-11`)
**Stap 1 – formaat-balk (alleen testversie).** Opzet, stijl en knoppen overgenomen van `phone-preview.js` van The Flush Factor: donkere balk, app in een iframe (`?frame=1`), keuze onthouden. Formaten: 360×640, 390×844, 844×390, 800×1280, 1280×800, volledig scherm. Alleen op het testpad en alleen op een pc; live vraagt `test-preview.js` nooit op.

**Stap 2 – schermformaat en zoomen.** Oorzaak gevonden: zoomen was niet geblokkeerd, maar het raster vulde altijd de beschikbare ruimte, dus zoomen leek niets te doen; en op een breed scherm stond het raster links en de knoppen ver rechts. Opgelost: raster en knoppen staan samen in het midden, het raster volgt het venster per beeldje (was 150 ms vertraagd), nieuwe instelling Grootte klein/normaal/groot met plaatjes (per profiel). Ook gevonden: dubbeltikken op een vakje kon nog zoomen (`touch-action` stond alleen op knoppen) → nu op alle elementen.

**Stap 3 – meer puzzels per level.** 8 soorten, 37 moeilijkheidsbanden, 100 puzzels per band = 3.700 puzzels in `puzzle-bank.js` (153 kB, 75 kB gecomprimeerd). Seeds per (soort, nummer). Level-puzzel blijft variant 1. 4×4 geteld: per band bestaan 376–1.040 echt verschillende puzzels, dus 100 per band is haalbaar (ook voor standaard en fruit samen); de 1.000 4×4-puzzels in de voorraad zijn onderling echt verschillend.

**Stap 4 – profielen.** Tik op de kat → "Wie speelt er?". Maximaal 6 profielen met dierenplaatje en optionele naam; eigen sterren, gespeelde puzzels, instellingen en onafgemaakt spel. Bestaande voortgang is vanzelf profiel 1 (zelfde sleutels, geen conversie). Ouderslot (3 s ingedrukt houden) vóór verwijderen, voortgang wissen en "Account koppelen". Opslag via `storage.js` met uitwisselbare provider. Onderzoek in `docs/account-koppelen.md`.

**Ook:** `privacy.html` bijgewerkt (profielen met optionele naam, alleen op het toestel), `CACHE_VERSION` → v4.

**Bewijs:**
- `node tests/validate-levels.js` → drie keer ✅, o.a. `Voorraad: 3700 puzzels geldig, uniek oplosbaar, zonder gokken, geen dubbele, per band even veel gegeven vakjes, gelijk aan de snapshot.`
- `node tests/difficulty.js` → beide ✅ (alle banden binnen hun grenzen, elke volgende band moeilijker).
- `node tests/count-4x4.js` → tabel met aantallen per aantal gegeven vakjes.
- `python3 tests/e2e.py` → `✅ 159/159 controles geslaagd.` (61 nieuw voor stap 1–4).
- `python3 tests/screenshots.py` → 7 formaten × 19 schermen, `✅ Niets buiten beeld, alle knoppen minstens 48x48 px, 0 console-errors.`
- Snelheid (CPU ×4): voorraadpuzzel klaarzetten max. 15 ms; 9×9 openen 25–60 ms.

**Kanttekening (eerlijk):** "even moeilijk" binnen een band betekent: evenveel gegeven vakjes en zonder gokken oplosbaar. Het aantal keren dat je opnieuw moet rondkijken verschilt binnen een band nog wel (bijv. 9×9 met 32–34 gegeven: gemiddeld 6, maximaal 16 rondes).

**Bestanden geraakt:** script.js, style.css, index.html, i18n.js, puzzles.js, sw.js, privacy.html, storage.js (nieuw), puzzle-bank.js (nieuw), test-preview.js (nieuw), tools/build-bank.js (nieuw), docs/account-koppelen.md (nieuw), tests/e2e.py, tests/screenshots.py, tests/validate-levels.js, tests/difficulty.js, tests/count-4x4.js (nieuw), tests/bank.snapshot.json (nieuw), .github/workflows/test-deploy.yml, README.md, ROADMAP.md.

### 2026-10-11 · Review live gezet (Claude Code)
- Gebruiker heeft de testversie van `review-2026-10-09` nagelopen en akkoord gegeven.
- `review-2026-10-09` gemerged naar `main` (fast-forward) en gepusht; live draait nu `sudoku-kids-v3`.
- Vooraf opnieuw gedraaid: `node tests/validate-levels.js` → beide ✅, `python3 tests/e2e.py` → 97/97.

**Bestanden geraakt:** ROADMAP.md.

### 2026-10-09 · Testversie online naast de live versie (Claude Code)
- Onderzocht hoe Flush Factor test: daar bestaat geen aparte testversie (alleen `main`, Pages vanaf `main`, workflow `ci.yml` draait alleen tests). Daarom nieuw opgezet, gekozen voor een aparte test-repository.
- Repository `jmldewaal-sedillo/sudoku-kids-test` met GitHub Pages; workflow `.github/workflows/test-deploy.yml` zet elke push naar branch `test` daar neer, met het commit-id in het label en in de cache-naam.
- App herkent de testmap zelf (`IS_TEST`): `test_`-prefix op de localStorage-sleutels, eigen cache `sudoku-kids-test-…`, rood label "TEST <commit>", manifestnaam "TEST – …".
- Service worker ruimt alleen nog zijn eigen oude caches op (ruimde eerst álle caches op het domein op, dus ook die van de testversie en van Flush Factor).
- Live versie niet aangeraakt: `main` en de Pages-instellingen zijn ongewijzigd.

**Bewijs:** `python3 tests/e2e.py` → 97/97, waarvan 13 in onderdeel 11 (o.a. "live-opslag is byte voor byte ongewijzigd na spelen, instellen en wissen in de test"); `node tests/validate-levels.js` → beide ✅; `python3 tests/screenshots.py` → ✅.

**Bestanden geraakt:** script.js, sw.js, style.css, tests/e2e.py, tests/screenshots.py, .github/workflows/test-deploy.yml (nieuw), README.md, ROADMAP.md.

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
Gebruik de testlink: https://jmldewaal-sedillo.github.io/sudoku-kids-test/ (rood label TEST bovenin).
- [ ] v5, muziek: klinkt het deuntje vrolijk en rustig genoeg, en niet te hard naast de geluidseffecten? Stopt het als je de app wegzet?
- [ ] v5, klikgeluid: prettig of irritant bij elke knop?
- [ ] v5, iconen: zijn de dieren en het fruit in een 9×9 op je telefoon nog goed uit elkaar te houden?
- [ ] v5, ouderslot: twee keer ingedrukt houden op je telefoon (geen contextmenu, geen selectie)? Is 5 seconden tussentijd genoeg?
- [ ] v5, profielen: ster rechtsboven → profielpagina; wisselknopje → lijst → speler → "Spelen als"; potlood → bewerken
- [ ] v5, werelden: Boerderij en Jungle openen, rastertjes op de kaarten duidelijk? Levelscherm met blokken per grootte prettig?
- [ ] v5, onderbalk: bedekt hij echt nergens iets op jouw telefoon (ook liggend)?
- [ ] v5, grootte: klopt het voorbeeldblokje met wat je daarna in het spel ziet?
- [ ] v4, meer puzzels: speel level 1 drie keer opnieuw – krijg je steeds een andere puzzel?
- [ ] v4, zoomen: knijpen op de telefoon en Ctrl +/- op de pc; dubbeltikken op een vakje mag niet zoomen
- [ ] v4, formaat-balk: testlink op de pc, alle zes knoppen, keuze blijft na herladen
- [ ] Zelf spelen op de telefoon (splash → wereld 1 → een paar levels uitspelen); let op of een kind de wijsvinger en de plaatjesknoppen snapt
- [ ] Een paar levels uit elke wereld voltooien (inclusief 6×6 en 9×9) – automatisch zijn alle 105 uitgespeeld, maar niet door een mens
- [ ] Update-gedrag: de geïnstalleerde live app openen en controleren dat v3 verschijnt (hartjes/sterren i.p.v. "0/3") en de sterren er nog zijn
- [ ] Offline-modus op het toestel: app installeren, vliegtuigmodus, app openen (automatisch getest in Chromium op localhost, niet op Android)
- [ ] Android-terugknop/veeggebaar in de geïnstalleerde app: spel → levels → werelden → app sluit
- [ ] Landscape op de telefoon draaien tijdens een puzzel (automatisch getest op 640×360 en 844×390)
- [ ] Telefoon met notch/camera-uitsparing in landscape: staat er niets onder de uitsparing?
- [ ] Geluid: hoor je de piepjes, ook na het ontgrendelen van het scherm?
- [ ] Emoji's (dieren, fruit, hartjes) zien er goed uit op het toestel – op oudere Android-versies kunnen ze anders ogen
- [ ] Maskable icoon controleren op echt Android-toestel (ronde of vierkante uitsnede)
- [ ] TalkBack even aanzetten en een vakje invullen

### Voor publiceren
- [x] Hosting met HTTPS opzetten → GitHub Pages live op https://jmldewaal-sedillo.github.io/sudoku-kids/
- [x] Domeinnaam of subpad kiezen voor de hosting → subpad `/sudoku-kids/` op GitHub Pages
- [x] Relatieve paden in manifest.json controleren na keuze van subpad → `tests/e2e.py` controleert manifest, iconen en `sw.js`-bestanden
- [ ] Beleid: Families-beleid van Google Play, AVG voor kinderen, leeftijdsclassificatie (IARC), Data safety-formulier, privacyverklaring afmaken (contact-e-mail, NL en EN, plus de gevolgen van account koppelen), en eventueel gebruiksvoorwaarden. Basis staat in `privacy.html` en `docs/account-koppelen.md`.
- [ ] Credits: een creditspagina in de app (via Instellingen) met de makers. Voor iconen is geen vermelding nodig (eigen tekeningen in `icons.js`); er zijn geen externe lettertypen, geluiden of bibliotheken. Wel noemen: "Iconen en muziek: eigen werk".
- [ ] Vertalingen laten nakijken door een moedertaalspreker (ze zijn door de AI gemaakt):
  - [ ] Engels  - [ ] Duits  - [ ] Frans
  - [ ] Spaans (es)
  - [ ] Portugees – Braziliaans (pt)
  - [ ] Italiaans (it)
  - [ ] Pools (pl)
  - [ ] Turks (tr)
  - [ ] Indonesisch (id)
- [ ] Spelregels: een uitleg met plaatjes per sudoku-type, geschikt voor kinderen die niet lezen.
- [x] Nieuwe icoon- of emojiset: speelser, en op elk toestel hetzelfde → drie opties vergeleken in `docs/icon-opties.html`, gekozen voor eigen kawaii-SVG's (`icons.js`), doorgevoerd in de hele app en het app-icoon.
- [ ] Account koppelen: een keuze maken op basis van `docs/account-koppelen.md` (advies: doelgroep "alleen kinderen", geen login; eventueel een overzet-code) en het daarna bouwen.
- [ ] `assetlinks.json` plaatsen. **Probleem:** moet op `https://jmldewaal-sedillo.github.io/.well-known/assetlinks.json` staan (root van het domein), dat kan niet vanuit deze repo. Kies: aparte repo `jmldewaal-sedillo.github.io` met `.nojekyll`, of een eigen subdomein (bijv. `sudoku.sedillo.nl`) voor deze app. Zie README.
- [ ] Google Play-ontwikkelaarsaccount aanmaken (eenmalig $25)
- [ ] App inpakken als Android `.aab` met PWABuilder of Bubblewrap
- [ ] Signing key veilig bewaren (verlies = geen updates meer mogelijk)
- [ ] Store-pagina aanmaken: beschrijving, categorie, screenshots (telefoon én 7"/10" tablet), feature graphic 1024×500
- [ ] Beslissen over schermrotatie: `manifest.json` staat op `"orientation": "portrait"`. Android 16+ negeert dat op tablets; landscape werkt nu, dus `"any"` kan ook.

### Na publiceren
- [ ] Meer levels per wereld, richting 500 (nu 50 per rastergrootte; aanvullen met `tools/generate-puzzles.js --levels`)
- [ ] Meer werelden, richting 10 (nu 5)
- [ ] Meer symboolthema's: cijfers, dieren, planten, groente, fruit (te kiezen per profiel)
- [ ] Meer talen: Hindi en Russisch (grote Play-markten, ander schrift – eerst een moedertaalspreker), Arabisch (rechts-naar-links: de lay-out moet daarvoor gespiegeld worden en is daar nog niet op getest)

### Verbeteringen
- [x] Statusbalk-knoppen (hint/notitie/wissen) op tablets zijn klein → 84×64 px op tablets
- [x] Op smalle telefoons (≤360 px) zijn 9×9-cellen ≈33 px → 35 px op 360, 33 px op 320 (was 25)
- [ ] 9×9 op een telefoon blijft klein (33–40 px per vakje, onder de 48 px-richtlijn). Past niet groter op het scherm; overweeg inzoomen op een blok of 9×9 alleen aanraden op tablets.
- [ ] Notities met dieren/fruit in 9×9 zijn op een telefoon nauwelijks leesbaar (±9 px)
- [ ] Levelscherm: laat zien welk level een onafgemaakt spel heeft (bijv. ▶-markering)
- [ ] Vergrendeld level geeft geen reactie bij tikken (knop is uitgeschakeld) → kort schudden zoals bij een vergrendelde wereld
- [x] Reset-knop is voor een kind bereikbaar → ouderslot (3 seconden ingedrukt houden) vóór voortgang wissen en profiel verwijderen
- [ ] Binnen een band verschilt het aantal "rondes" nog (zie logboek 2026-10-11). Overweeg de banden ook op rondes in te delen als kinderen het verschil merken.
- [x] Het TEST-label ligt op een telefoon net over de levelnaam → eigen strook boven de app
- [ ] Nieuwe levels staan achteraan per wereld, waardoor na level 35 (6×6) weer makkelijke 4×4-levels komen. Overweeg het levelscherm te sorteren op rastergrootte (alleen de weergave; de opslag blijft per index).
- [ ] Muziek: één deuntje voor alles. Overweeg een eigen deuntje per wereld en een volumeschuif.
- [ ] Badges op de profielpagina zijn nu vier vaste; uitbreiden (per wereld, 3 sterren, zonder hints).
- [ ] Profielscherm: laat per profiel ook de voortgang per wereld zien
- [ ] Mascotte en tekstballon liggen op het levelscherm over de onderste levelknoppen
- [ ] De sprong van 6×6 naar het eerste 9×9-level (35 open vakjes) is groot; overweeg een paar extra makkelijke 9×9's. Let op: mag de volgorde van `LEVEL_PLAN` niet veranderen.
- [ ] Monochroom icoon (`purpose: "monochrome"`) voor Android-themapictogrammen
- [ ] Voorgelezen aanwijzingen voor kinderen die niet kunnen lezen (de mascotte-teksten zijn nu alleen tekst)
- [ ] `script.js` (±1.000 regels) opsplitsen in losse bestanden (profielen, ouderslot en puzzelkeuze zijn goede kandidaten)

### Ideeën
- **Gesproken mascotte** – korte opgenomen zinnetjes per taal ("Tik op een vakje!"). Lost het lees-probleem beter op dan plaatjes alleen.
- **Dagelijkse puzzel** – elke dag één extra level op basis van de datum als seed (geen server nodig).
- **Extra werelden** – bijv. kleuren-sudoku of 4×4 met vormen voor de allerjongsten; nieuwe werelden áchteraan toevoegen zodat bestaande levels en sterren kloppen.
- **Stickerboek / beloningen** – per 10 sterren een sticker; geeft een doel naast de sterren.
- **Oefenmodus zonder timer en hartjes** – voor kinderen die van de teller zenuwachtig worden.
- **Ongedaan maken** – één stap terug-knop.

---

## Bekende beperkingen

- **Test en live delen één domein** (`jmldewaal-sedillo.github.io`), net als Flush Factor. De opslag is gescheiden met de `test_`-prefix. De live versie van vóór deze review (cache v2) en Flush Factor ruimen bij een eigen update nog wel alle caches op het domein op; de testversie haalt zijn bestanden dan gewoon opnieuw op, maar is op dat moment even niet offline beschikbaar.
- **Geen installatie of offline spelen via http://.** De service worker wordt alleen geactiveerd via `https://` of `http://localhost`. Via een lokaal IP-adres (bijv. `http://192.168.x.x:8000`) kun je de app wel testen, maar niet installeren en niet offline spelen. Dat werkt pas na HTTPS-hosting.
