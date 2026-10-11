# Roadmap – Sudoku Kids & Crazy Grids

## Status in één oogopslag

| | |
|---|---|
| **Huidige fase** | v6 staat live; **v8 (voorbereiding publiceren) staat op de testlink** en wacht op akkoord: gegevens verwijderen, voortgang overzetten, spelregels, credits, nieuwe privacyverklaring, eigen domein voorbereid, store-materiaal |
| **Laatste update** | 2026-10-11 |
| **Volgende stap** | Jenn: testlink nalopen, daarna DNS bij Namecheap en de rest van "Wat Jenn zelf moet doen" in `docs/publiceren.md` |
| **Uitgever** | Studio Sedillo (heeft een KvK-inschrijving) · studio.sedillo@gmail.com · `com.studiosedillo.sudokukids` · geen advertenties · persoonlijk Play Console-account |
| **Testversie** | https://jmldewaal-sedillo.github.io/sudoku-kids-test/ – branch `test`, v8 (`publish-prep`). Na DNS: https://test-sudokukids.studiosedillo.com/ |
| **Live versie** | https://jmldewaal-sedillo.github.io/sudoku-kids/ – branch `main`, cache `sudoku-kids-v6` (live sinds 2026-10-11; v3 stond live van 's ochtends tot 's middags) |

---

## Vaste regels (nooit breken)

1. **Bestaande puzzels veranderen nooit.**
   - *De eerste 105 levels:* houden hun seed `20261004 + i * 7919` en hun plek in `LEVEL_PLAN`. Die volgorde en seeds nooit wijzigen.
   - *Alle levels daarna* staan in `level-plan.js` als (wereld, soort, band, puzzelnummer). Alleen ACHTERAAN aanvullen via `tools/generate-puzzles.js`, nooit regels verplaatsen of weghalen: `w<wereld>_l<index>` in de voortgang van spelers mag nooit verschuiven. Wereld-id's (0 bos, 1 snoep, 2 raket, 3 boerderij, 4 jungle) veranderen nooit; de volgorde op het scherm staat los daarvan in `WORLDS`.
   - *Volgorde op het scherm:* levels worden per wereld gesorteerd op moeilijkheid getoond (`orderedLevels`). Dat is alleen weergave; opslaan gebeurt altijd onder de vaste index. Badge-id's in `badges.js` ook nooit hernoemen (behaalde badges staan op id opgeslagen).
   - *Ontgrendelen:* een wereld gaat open na 17 gehaalde levels in de wereld ervoor (was "de helft van 35"). Dat getal niet verhogen, anders gaat een wereld bij bestaande spelers weer op slot.
   - *Voorraad:* puzzel *n* van een soort komt uit `bankSeed(soort, n)` – per (soort, nummer), niet per totale volgorde. Er mogen puzzels, banden, levels en werelden bij; een bestaand nummer mag nooit een andere puzzel worden. `puzzle-bank.js` alleen uitbreiden via `tools/generate-puzzles.js`.
   - De banden in `BANDS` (`puzzles.js`) niet verschuiven: opgeslagen "al gespeeld"-lijsten staan per band.
2. **Na elke wijziging aan levels of de voorraad altijd draaien:** `node tests/validate-levels.js`. Verwacht: drie regels met ✅ (levels geldig; zonder gokken en gelijk aan de snapshot; voorraad geldig en gelijk aan de snapshot).
3. **Bij elke release `CACHE_VERSION` in `sw.js` verhogen** (live nu: `sudoku-kids-v6`, test: `sudoku-kids-v8`), anders krijgen spelers de oude versie.
4. **Niets "klaar" noemen zonder bewijs.** Elke controle moet een commando met echte uitvoer hebben.
5. **localStorage-sleutels nooit hernoemen:** `sudokuKids_progress`, `sudokuKids_settings`, `sudokuKids_current`, `sudokuKids_played`, `sudokuKids_stats`, `sudokuKids_history`, `sudokuKids_inbox` (profiel 1), `sudokuKids_p<n>_…` (overige profielen) en `sudokuKids_profiles`. Alle opslag loopt via `storage.js`.
6. **Geen frameworks, build-stappen, externe CDN's, tracking, advertenties of accounts.** `tests/e2e.py` (onderdeel 31) controleert dat er geen verzoek naar een ander domein gaat. Komt er ooit iets bij dat het toestel verlaat, dan eerst `docs/privacy-audit.md`, de privacyverklaring en het Data safety-formulier bijwerken.
7. **testen = push naar branch `test`, live = merge naar `main`.** Niets gaat naar `main` voordat het op de testlink is nagelopen. De testversie gebruikt `test_`-sleutels en een eigen cache; dat onderscheid (`IS_TEST` in `storage.js` en `sw.js`: hostnaam `test-…` of een map die op `-test` eindigt) nooit weghalen.
8. **Voor elke release alles groen:** `node tests/validate-levels.js`, `python3 tests/e2e.py` en `python3 tests/screenshots.py` (zie README).
9. **Elke app op een eigen subdomein** (`sudokukids.studiosedillo.com`); de voortgang hangt aan dat adres. Nooit een `CNAME`-bestand in de root van deze repo zetten (dan stuurt GitHub het oude github.io-adres door en is de voortgang van bestaande spelers onbereikbaar); het eigen domein hoort bij `sudoku-kids-live` en `sudoku-kids-test`. Package name `com.studiosedillo.sudokukids` en de code-opmaak `SK1.` van "Voortgang overzetten" nooit veranderen.
10. **Geen signing keys of wachtwoorden in Git** (`.gitignore` sluit `*.keystore` en `*.jks` uit). Jenn maakt en bewaart de sleutels zelf (`docs/twa.md`).

---

## Logboek (nieuwste bovenaan)

### 2026-10-11 · v8 op de testlink: nieuw contactadres, privacyverklaring aangevuld, /delete (Claude Code, branch `publish-prep`)
Vooraf gevraagd: hoe de verantwoordelijke vermeld wordt → **alleen "Studio Sedillo"**. **Studio Sedillo heeft een KvK-inschrijving** (opgegeven door Jenn), dus de handelsnaam is te herleiden.

- **Contactadres:** overal `studio.sedillo@gmail.com` (app, credits, privacyverklaringen, verwijderpagina, hoofdsite, `store/`, `docs/`, roadmap). Het oude adres komt nergens meer voor; een test bewaakt dat. E-mail doorsturen bij Namecheap is vervallen (taak weg, MX-controle uit `tools/eigen-domein.sh`).
- **Privacyverklaring Sudoku Kids (5 talen) en hoofdsite (EN/NL):** twee nieuwe onderdelen. "Als je ons mailt": e-mail loopt via Gmail (Google) met link naar de privacyverklaring van Google; grondslag gerechtvaardigd belang (art. 6 lid 1 sub f AVG). "Gegevens buiten de EU": GitHub en Google zijn Amerikaanse bedrijven en doen mee aan het EU-U.S. Data Privacy Framework, met links naar beide privacyverklaringen. Nagekeken op 11 oktober 2026: privacyverklaring GitHub (27 april 2026) en Google "Data transfer frameworks" noemen beide de deelname; het adequaatheidsbesluit geldt nog, het hoger beroep (C-703/25 P) loopt. Datum bovenaan blijft 11 oktober 2026 (vandaag).
- **/delete:** `verwijderen.html` heet nu `delete.html`; het oude adres verwijst door en houdt de taalkeuze vast. Links bijgewerkt in de app, de verklaring, de hoofdsite, `docs/publiceren.md` en `store/listing.json`. De zin "we antwoorden binnen 30 dagen" is weg, ook op de verwijderpagina.
- **Credits (10 talen):** alleen nog "Iconen, muziek en puzzels zijn eigen werk van Studio Sedillo."
- **Hoofdsite (repo `studio-sedillo`):** inleidende zin weg, nieuwe contacttekst, 404-pagina linkt nu ook op github.io naar de eigen startpagina.
- `CACHE_VERSION` → `sudoku-kids-v8`.

**Bewijs:** `python3 tests/e2e.py` twee keer achter elkaar → `✅ 361/361 controles geslaagd.` (5 nieuw: credits in 10 talen, privacyverklaring in 5 talen met Gmail/grondslag/DPF/links, doorverwijzing van `verwijderen.html`, `/delete` zonder `.html`, het oude adres komt nergens meer voor). `python3 tests/screenshots.py` → 7 formaten × 34 schermen, `✅ Niets buiten beeld, alle knoppen minstens 48x48 px, 0 console-errors.`; credits en de nieuwe onderdelen van de privacyverklaring zelf bekeken. `node tests/validate-levels.js` ✅. `python3 tests/store.py --check` ✅. Netwerktest opnieuw: 30 verzoeken, alleen GET, alleen het eigen adres (de links naar GitHub en Google laden niets). Zoekactie naar het oude adres in beide repo's: geen treffers.

**Bestanden geraakt:** privacy.html, delete.html (was verwijderen.html), verwijderen.html (doorverwijzing), index.html, i18n.js, sw.js, beide workflows, tools/eigen-domein.sh, store/listing.json, store/teksten.md, tests/e2e.py, tests/screenshots.py, tests/store.py, docs/publiceren.md, docs/studio-sedillo.md, docs/privacy-audit.md, README.md, ROADMAP.md. Repo `studio-sedillo`: index.html, privacy.html, 404.html.

### 2026-10-11 · v7 op de testlink: voorbereiding publiceren (Claude Code, branch `publish-prep`)
Vooraf gevraagd: advertenties → **geen** (later eventueel verwijzingen naar eigen spellen); Play Console-account → **persoonlijk** (gesloten test geldt, tenzij het account van vóór 13 november 2023 is).

**1 – Onderzoek.** `docs/publiceren.md`: alle eisen van Google Play met bron en datum (Families-beleid, Data safety met ingevulde antwoorden, privacyverklaring, verwijderen, IARC-concept, doelgroep, store-pagina, target-API 36, gesloten test met 12 testers / 14 dagen, Teacher Approved, AVG), per eis wie het doet en de status, en bovenaan de lijst voor Jenn in volgorde.

**2 – Privacy.** Netwerktest: 0 verzoeken naar een ander domein, alleen GET van eigen bestanden, geen cookies/sessionStorage/IndexedDB, geen toestemmingen; alle localStorage-sleutels beschreven in `docs/privacy-audit.md`. Privacyverklaring herschreven (10 onderdelen, 5 talen): verantwoordelijke Studio Sedillo, wat er lokaal staat, geen delen of tracking, HTTPS, bewaartermijn, verwijderen, AVG-rechten, kinderen en ouders, datum.

**3 – Verwijderen en overzetten.** "Profiel verwijderen" en "Alle gegevens van deze app verwijderen" (alle sleutels, cache en service worker) achter het dubbele ouderslot met bevestiging; `verwijderen.html` in 5 talen; "Voortgang overzetten" (vervangt "Account koppelen"): code `SK1.…` kopiëren of als bestand, importeren overschrijft niets, een code van buiten wordt opgeschoond.

**4 – Eigen domein.** Alles voorbereid, **nog niets omgezet**: de DNS van `studiosedillo.com` staat nog op de parkeerpagina van Namecheap, en een eigen domein instellen vóór de DNS klopt maakt de github.io-links onbereikbaar. Gebouwd: testversie herkent `test-…` als hostnaam; `test-deploy.yml` en nieuw `live-deploy.yml` schrijven het CNAME-bestand zodra de variabele `TEST_DOMAIN`/`LIVE_DOMAIN` bestaat; `tools/eigen-domein.sh` controleert de DNS en zet de domeinen aan; `.well-known/assetlinks.json` + `.nojekyll`; hoofdsite in de nieuwe repo `studio-sedillo` (https://jmldewaal-sedillo.github.io/studio-sedillo/, EN/NL, met algemene privacypagina en links naar de Sudoku-privacy); `docs/studio-sedillo.md` met de DNS-records, domeinverificatie, verhuizen naar een submap en "een nieuwe app toevoegen".
**Afwijking van de opdracht (bewust):** de live versie op het subdomein komt uit een aparte repo `sudoku-kids-live` in plaats van uit deze repo. Met een eigen domein op deze repo stuurt GitHub het oude adres meteen door en kan niemand zijn voortgang nog meenemen. Nu blijft het oude adres de app tonen met "We zijn verhuisd!" en de knop "Verhuis met mijn voortgang" (pas actief als `NEW_HOME` in `script.js` is ingevuld).
**Niet gedaan (geweigerd door de beveiliging van Claude Code, en terecht aan Jenn):** de deploy key en secret voor `sudoku-kids-live` aanmaken. De vijf commando's staan in `docs/studio-sedillo.md`.

**5 – Overig.** Spelregels in zes plaatjes (?-knop, Instellingen, vanzelf bij het allereerste level); creditspagina "Gemaakt door Studio Sedillo"; `store/`: teksten in 10 talen, icoon 512 (vol vierkant), feature graphic 1024×500, per taal (EN, NL) 6 telefoon- en 4 tablet-screenshots, gemaakt en gecontroleerd door `tests/store.py`; TWA voorbereid (`twa/twa-manifest.json`, `docs/twa.md` met uitleg over upload key en Play App Signing). De TWA zelf is niet gebouwd: dat kan pas als het subdomein live is, en de sleutel maakt Jenn zelf.

**Ook gevonden:** het bestaande icoon heeft afgeronde, doorzichtige hoeken; Google wil een vol vierkant → eigen variant voor de store. `verwijderen.html` ontbrak in de bestandenlijst van de testdeploy → toegevoegd, en onderdeel 32 controleert nu dat beide workflows alles uit de cache-lijst kopiëren.

**Bewijs (alles twee keer achter elkaar gedraaid op de definitieve stand):**
- `node tests/validate-levels.js` → drie keer ✅; `node tests/difficulty.js` → beide ✅; `node --check` op alle .js → OK.
- `python3 tests/e2e.py` → `✅ 356/356 controles geslaagd.` (62 nieuw in onderdeel 28–32: verwijderen, exporteren/importeren, verhuizen via de link, spelregels/credits/pagina's, netwerktest, domein/deploy/store-teksten).
- `python3 tests/screenshots.py` → 7 formaten × 34 schermen = 238 screenshots, `✅ Niets buiten beeld, alle knoppen minstens 48x48 px, 0 console-errors.` De acht nieuwe schermen zelf bekeken.
- `python3 tests/store.py` → `✅ Store-materiaal voldoet aan de eisen.`
- `tools/eigen-domein.sh check` → alle records "ONTBREEKT" behalve MX (zoals verwacht: DNS is nog niet ingesteld).
- Hoofdsite: https://jmldewaal-sedillo.github.io/studio-sedillo/ en `/privacy` geven 200.

**Niet te testen zonder mens/toestel/DNS:** de eigen domeinen en HTTPS, `assetlinks.json` op het echte adres, de TWA op een telefoon, de verhuizing op het echte github.io-adres, of Google de TWA onder het Families-beleid accepteert, de vertalingen van de verklaring, de verwijderpagina en de store-teksten.

**Bestanden geraakt:** script.js, storage.js, index.html, style.css, i18n.js, icons.js, sw.js, privacy.html, verwijderen.html (nieuw), .nojekyll, .well-known/assetlinks.json (nieuw), .gitignore, .github/workflows/test-deploy.yml, .github/workflows/live-deploy.yml (nieuw), tools/eigen-domein.sh (nieuw), twa/twa-manifest.json (nieuw), store/ (nieuw), docs/publiceren.md, docs/privacy-audit.md, docs/studio-sedillo.md, docs/twa.md (alle nieuw), tests/e2e.py, tests/screenshots.py, tests/store.py (nieuw), README.md, ROADMAP.md. Nieuwe repo: `studio-sedillo`.

### 2026-10-11 · v6 live gezet (Claude Code)
- Gebruiker heeft v6 op de testlink nagelopen en akkoord gegeven.
- `feature-2026-10-11` gemerged naar `main` (fast-forward) en gepusht. Live gaat daarmee in één keer van v3 naar v6 (v4 en v5 hebben alleen op de testlink gestaan).
- Vooraf: `node tests/validate-levels.js` → drie keer ✅; `python3 tests/e2e.py` → 294/294 en `python3 tests/screenshots.py` → ✅ op dezelfde commit (`ed2f374`).
- Update v3 → v6 op de echte live site gecontroleerd met een blijvend browserprofiel waarin eerst v3 gespeeld is: zie het rapport van deze sessie (sterren, taal, onafgemaakt spel en de drie oude sleutels behouden).

**Bestanden geraakt:** ROADMAP.md.

### 2026-10-11 · v6 op de testlink: bovenbalk, meldingen, 100 badges, geschiedenis (Claude Code, branch `feature-2026-10-11`)
Vooraf gevraagd (H): de weergave van de levels sorteren op moeilijkheid, zonder de opslag te raken → gekozen en gebouwd.

**H – volgorde.** Per wereld eerst alle 4×4 (veel → weinig gegeven vakjes), dan 6×6, dan 9×9, met doorlopende nummers op het scherm. Opslag ongewijzigd. Levels die bij een bestaande speler open waren, blijven open.

**A – bovenbalk en speler.** Rechtsboven: belletje + één knop met avatar en sterren (opent het profiel). Rechtsonder alleen de wisselknop met mini-avatar; de kat met wolkje blijft linksonder (en is aaibaar). Meldingen per profiel: nieuwe badge, nieuwe wereld open, 10/25/50 levels, alle sterren in een wereld, en berichtjes van de kat; elk met icoon, een tik gaat naar het juiste scherm, openen markeert alles als gelezen. Alleen lokaal (maximaal 50), geen push, geen internet.

**B – grootte.** Twee keuzes: klein (68% van de ruimte, max. 420 px) en groot (alles, max. 900 px). "Normaal" en "groot" worden "groot", "klein" blijft "klein". Oorzaak van "ziet er hetzelfde uit": normaal en groot verschilden alleen in de bovengrens (720 vs 1100 px), die een telefoon nooit haalt.

**C – privacyverklaring.** Terugknop met het kawaii-icoon; verklaring in Engels, Nederlands, Spaans, Portugees en Indonesisch met taalknoppen (start in de taal van de app, anders Engels). Zoekactie door het project: geen emoji meer in index.html, privacy.html, docs/, manifest, css, js of de icoon-SVG's (de oude avatar-omzetting staat nu als codepunten in `storage.js`; de telefoon-emoji is uit de formaat-balk).

**D – profielpagina.** Drie onderdelen: Badges (100 stuks in `badges.js`, elk een eigen plaatje, naam en uitleg in 10 talen; grijs met voortgang tot ze gehaald zijn; tik voor details), Werelden (voortgang, sterren, levels per grootte, een stip per level; tik → levelkeuze) en Geschiedenis (alle gespeelde puzzels met datum, tijd, fouten, hints en sterren; uitleg van de sterren; filter per wereld; laatste 500). Bestaande voortgang staat als "Eerder gespeeld".
Badges: aantallen levels en sterren, per wereld, per type, per rastergrootte, snelheid, foutloos op rij, zonder hints, dagen op rij (hooguit 7) en dagen totaal (hooguit 20), tijdstip, grappige (gum, notities, hints, 1 ster, doorzetter, kat aaien, …) en verzamelbadges. Geen badge beloont lang achter elkaar spelen en niets heeft met geld te maken.

**Ook gevonden en opgelost:** de pagina kon onder omstandigheden nog 20 px wegscrollen (focus op een knop in een verborgen scherm) → `overflow: clip` op html/body.

**Bewijs:**
- `node tests/validate-levels.js` → drie keer ✅; `node tests/difficulty.js` → beide ✅.
- `python3 tests/e2e.py` → `✅ 294/294 controles geslaagd.` (63 nieuw; o.a. een test die alle 450 levels speelt, 20 dagen in de tijd reist en daarna alle 100 badges gehaald heeft; opslag na 500+ puzzels 44 kB).
- `python3 tests/screenshots.py` → 7 formaten × 27 schermen = 189 screenshots, `✅ Niets buiten beeld, alle knoppen minstens 48x48 px, 0 console-errors.`

**Bestanden geraakt:** script.js, style.css, index.html, i18n.js, storage.js, icons.js, sw.js, privacy.html, test-preview.js, badges.js (nieuw), tests/e2e.py, tests/screenshots.py, screenshots/, .github/workflows/test-deploy.yml, README.md, ROADMAP.md.

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
- [ ] v6, badges: zijn de namen leuk en de plaatjes duidelijk genoeg? Vind je 100 te veel of juist goed?
- [ ] v6, meldingen: belletje → lijst → tik op een badge of wereld; is het aantal meldingen na een paar levels niet te veel?
- [ ] v6, volgorde: lopen de levels in het Dierenbos nu logisch op? (Bij jouw bestaande testprofiel staan gehaalde levels verspreid; maak een nieuw profiel voor het zuivere beeld.)
- [ ] v6, grootte: klein en groot op je telefoon en op de pc
- [ ] v6, geschiedenis: klopt wat er staat met wat je net speelde?
- [ ] v6, privacyverklaring: taalknoppen en de terugknop
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
Volgorde en uitleg: `docs/publiceren.md` ("Wat Jenn zelf moet doen"). J = Jenn, C = Claude Code.

**Klaar**
- [x] Hosting met HTTPS opzetten → GitHub Pages live op https://jmldewaal-sedillo.github.io/sudoku-kids/
- [x] Relatieve paden in manifest.json controleren → `tests/e2e.py` controleert manifest, iconen en `sw.js`-bestanden
- [x] Beleid uitzoeken: Families, AVG, IARC, Data safety, privacyverklaring → `docs/publiceren.md`
- [x] Credits: creditspagina via Instellingen ("Gemaakt door Studio Sedillo") (op test)
- [x] Spelregels met plaatjes per sudoku-type: ?-knop, Instellingen, en vanzelf bij het eerste level (op test)
- [x] Nieuwe icoon- of emojiset → eigen kawaii-SVG's (`icons.js`)
- [x] Account koppelen: keuze gemaakt → geen login (doelgroep alleen kinderen); in plaats daarvan "Voortgang overzetten" met een code (op test)
- [x] Gegevens en profiel verwijderen in de app + webpagina `delete.html` (op test; `verwijderen.html` verwijst door)
- [x] Google Play-ontwikkelaarsaccount → bestaat al (persoonlijk account), AdMob-account ook (niet gebruikt)
- [x] Domeinnaam kiezen → eigen subdomein per app: `sudokukids.studiosedillo.com`
- [x] Store-materiaal: teksten in 10 talen, icoon, feature graphic, screenshots telefoon en tablet → `store/`

**Testen (J)**
- [ ] v7 op de testlink: Instellingen → Spelregels en Credits; ?-knop in het spel; een nieuw profiel maken en kijken of de spelregels vanzelf komen
- [ ] v7: Wie speelt er? → Voortgang overzetten → code maken, kopiëren, als bestand bewaren; op een ander toestel of in een privévenster importeren
- [ ] v7: een testprofiel verwijderen; daarna "Alle gegevens van deze app verwijderen" (alleen op de testlink!) en kijken of de app schoon start
- [ ] v7: privacyverklaring en "Gegevens verwijderen (uitleg)" lezen in het Nederlands en Engels
- [ ] Hoofdsite nalopen: https://jmldewaal-sedillo.github.io/studio-sedillo/ (klopt de tekst over Studio Sedillo? wat moet er bij The Flush Factor staan?)
- [ ] v8: credits (één zin over eigen werk), privacyverklaring (onderdelen "Als je ons mailt" en "Gegevens buiten de EU") en de hoofdsite opnieuw lezen
- [ ] Store-materiaal bekijken: `store/feature-graphic.png`, `store/screenshots/`, `store/teksten.md`

**Eigen domein**
- [ ] J: DNS-records aanmaken bij Namecheap (tabel in `docs/studio-sedillo.md`); parkeer-records weghalen
- [ ] J: domein verifiëren bij GitHub (TXT-record `_github-pages-challenge-jmldewaal-sedillo`)
- [ ] C: `tools/eigen-domein.sh check`, dan `site` en `test`; opnieuw naar test pushen; controleren op https://test-sudokukids.studiosedillo.com/
- [ ] J: repository `sudoku-kids-live` en de deploy key aanmaken (vijf commando's in `docs/studio-sedillo.md`)
- [ ] C: `tools/eigen-domein.sh live`, na akkoord mergen naar `main`, Pages aanzetten op `sudoku-kids-live`, `tools/eigen-domein.sh https`
- [ ] C: controleren op het echte adres: `/privacy`, `/delete` (en dat `/verwijderen` doorverwijst), `/.well-known/assetlinks.json` (rechtstreeks, als JSON), HTTPS afgedwongen
- [ ] C: daarna `NEW_HOME` in `script.js` invullen (verhuismelding op het oude adres), cache verhogen, testen, live
- [ ] J: de verhuizing op je eigen telefoon doen vanaf het oude adres en kijken of je sterren meekomen
- [ ] C: links op de hoofdsite controleren zodra het subdomein live is
- [ ] Nieuwe lay-out voor studiosedillo.com (ontwerp volgt)
- [ ] C: privacyverklaringen nalopen na de uitspraak van het Hof van Justitie over het EU-U.S. Data Privacy Framework (zaak C-703/25 P, loopt nog); vervalt het besluit, dan de alinea "Gegevens buiten de EU" aanpassen

**Android-app (TWA)**
- [ ] J: app aanmaken in Play Console; ontwikkelaarsnaam Studio Sedillo, e-mail studio.sedillo@gmail.com; accounttype en aanmaakdatum nakijken
- [ ] J: TWA bouwen met Bubblewrap en de upload key maken (`docs/twa.md`); keystore en wachtwoord op twee plekken bewaren, nooit in Git
- [ ] C/J: in de build controleren: `targetSdkVersion` 36 of hoger, geen `AD_ID`-, locatie- of meldingspermissie, start offline
- [ ] J: `.aab` uploaden naar Interne test; SHA-256 van de app signing key kopiëren
- [ ] C: vingerafdruk in `.well-known/assetlinks.json` zetten en live zetten; J: controleren dat de app geen adresbalk toont
- [ ] Beslissen over schermrotatie: `manifest.json` staat op `"orientation": "portrait"`, de TWA-instellingen op `default`. Android 16+ negeert portrait op tablets; landscape werkt.
- [ ] Risico: het Families-beleid zegt dat een app niet alleen een webview van een website mag zijn. Wordt de TWA daarop afgewezen, dan een native schil met de bestanden in de app overwegen.

**Play Console (J, antwoorden in `docs/publiceren.md`)**
- [ ] App-content: privacybeleid-URL, advertenties (nee), app-toegang (uitleg ouderslot)
- [ ] Doelgroep: 6–8 en 9–12; aanmelden voor Teacher Approved
- [ ] Data safety-formulier (geen gegevens verzameld of gedeeld; Families-badge aanvinken; verwijder-URL)
- [ ] Contentclassificatie (IARC)
- [ ] Store-pagina vullen uit `store/` (categorie Puzzel)
- [ ] Gesloten test: minstens 12 testers, 14 dagen aaneengesloten; feedback bijhouden
- [ ] Productietoegang aanvragen en de productierelease doen

**Nakijken door een mens**
- [ ] Privacyverklaring en verwijderpagina per taal (juridisch en taalkundig) laten nakijken voor publicatie:
  - [ ] Engels  - [ ] Nederlands  - [ ] Spaans  - [ ] Portugees  - [ ] Indonesisch
- [ ] Vertalingen laten nakijken door een moedertaalspreker (door de AI gemaakt; ook de 100 badges, de meldingen, sinds v7 de spelregels, credits en overzet-teksten, en de store-teksten in `store/listing.json`):
  - [ ] Engels  - [ ] Duits  - [ ] Frans
  - [ ] Spaans (es)
  - [ ] Portugees – Braziliaans (pt)
  - [ ] Italiaans (it)
  - [ ] Pools (pl)
  - [ ] Turks (tr)
  - [ ] Indonesisch (id)

### Na publiceren
- [ ] Elk jaar vóór 31 augustus: nieuwe target-API-eis van Google nakijken en zo nodig een nieuwe TWA-build uploaden
- [ ] Verwijzing naar eigen spellen van Studio Sedillo ("meer spellen"): achter het ouderslot, duidelijk te onderscheiden van het spel; eerst uitzoeken of de advertentieverklaring in Play Console dan op "ja" moet (Families-beleid rekent kruispromotie tot de advertentieregels), en `docs/privacy-audit.md` bijwerken
- [ ] The Flush Factor toevoegen volgens `docs/studio-sedillo.md` (subdomein, test-subdomein, kaart op de hoofdsite)
- [ ] Het oude github.io-adres uitzetten als niemand het meer gebruikt
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
- [x] Nieuwe levels stonden achteraan per wereld → het levelscherm is nu gesorteerd op moeilijkheid (alleen de weergave; de opslag blijft per index)
- [ ] Badge-plaatjes zijn samengesteld (medaille + icoon + getal). Voor de mooiste 10–20 badges een eigen tekening maken.
- [ ] Privacyverklaring en verwijderpagina ook in Duits, Frans, Italiaans, Pools en Turks (de app heeft die talen wel; ze vallen daar nu terug op Engels)
- [ ] Het laatste profiel kan niet los verwijderd worden (de knop is dan verborgen); dat gaat nu via "Alle gegevens verwijderen". Overweeg de knop te tonen met dezelfde uitleg.
- [ ] Voortgang overzetten: het bestandsveld toont de standaardknop van de browser ("Choose File"); een eigen knop in de stijl van de app maken
- [ ] Voortgang overzetten als QR-code (handig van telefoon naar tablet); de code is voor twee profielen nu ruim 1 kB
- [ ] Hoofdsite `studio-sedillo`: `404.html` gebruikt paden vanaf de root en klopt dus pas op het eigen domein
- [ ] Geschiedenis: alleen gewonnen puzzels worden bijgehouden; overweeg ook afgebroken pogingen te tonen
- [ ] Muziek: één deuntje voor alles. Overweeg een eigen deuntje per wereld en een volumeschuif.
- [x] Badges op de profielpagina waren vier vaste → 100 badges in `badges.js`
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

- **De eigen domeinen staan nog niet aan** (stand 2026-10-11): `studiosedillo.com` wijst nog naar de parkeerpagina van Namecheap. Tot de DNS klopt draaien test en live op github.io, en bestaan `/privacy` en `/delete` alleen daar (als `…/sudoku-kids/privacy.html`).
- **`assetlinks.json` bevat nog geen vingerafdruk.** Die bestaat pas nadat de app in Play Console is aangemaakt. Tot dan toont een TWA een adresbalk.
- **Verhuizen naar een ander adres neemt de voortgang niet vanzelf mee** (opslag hangt aan het adres). Daarvoor is de verhuisknop of de overzet-code. Een snelkoppeling op het startscherm moet opnieuw geïnstalleerd worden.
- **Test en live delen nu nog één domein** (`jmldewaal-sedillo.github.io`), net als Flush Factor. De opslag is gescheiden met de `test_`-prefix. De live versie van vóór deze review (cache v2) en Flush Factor ruimen bij een eigen update nog wel alle caches op het domein op; de testversie haalt zijn bestanden dan gewoon opnieuw op, maar is op dat moment even niet offline beschikbaar.
- **Geen installatie of offline spelen via http://.** De service worker wordt alleen geactiveerd via `https://` of `http://localhost`. Via een lokaal IP-adres (bijv. `http://192.168.x.x:8000`) kun je de app wel testen, maar niet installeren en niet offline spelen. Dat werkt pas na HTTPS-hosting.
