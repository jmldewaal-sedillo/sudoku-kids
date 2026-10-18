# Roadmap – Sudoku Kids & Crazy Grids

## Status in één oogopslag

| | |
|---|---|
| **Huidige fase** | **v11 staat op `main`** (tag `v11`, 2026-10-18) en op de testlink. studiosedillo.com werkt (DNS bij Cloudflare). Volgende fase: de Android-app bouwen en in Google Play zetten. Nieuw besluit (2026-10-11): **geen app-websites**; eerst de Android-app (Capacitor) in Google Play, daarna webportals (`docs/lanceren.md`) |
| **Laatste update** | 2026-10-18 |
| **Volgende stap** | Jenn: Android Studio installeren en `tools/build-android.sh` draaien (`docs/android.md`); kiezen tussen persoonlijk en zakelijk Play-account (`docs/bedrijf.md`, 1e) vóór de app in Play Console komt; testers zoeken |
| **Uitgever** | Studio Sedillo (eenmanszaak, KvK 42122276, Nederland; adres nergens vermelden) · studio.sedillo@gmail.com · `com.studiosedillo.sudokukids` · geen advertenties · persoonlijk Play Console-account |
| **Testversie** | https://jmldewaal-sedillo.github.io/sudoku-kids-test/ – branch `test`, v11 (`publish-prep`). Testkopie: `noindex`, geen eigen domein |
| **Live versie** | https://jmldewaal-sedillo.github.io/sudoku-kids/ – branch `main`, cache `sudoku-kids-v11`, tag `v11` (sinds 2026-10-18; `noindex`, nergens gelinkt). De Android-build komt uit `main` |
| **Bouwdoelen** | android (`tools/build-android.sh`), webportals (`node tools/build.mjs crazygames\|poki`), web (alleen testkopie) – één codebase, zie `docs/lanceren.md` |
| **Privacy / verwijderen** | https://studiosedillo.com/sudoku-kids/privacy en https://studiosedillo.com/sudoku-kids/delete (repo `studio-sedillo`), HTTPS, werken sinds 2026-10-18 |

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
3. **Bij elke release `CACHE_VERSION` in `sw.js` verhogen** (live nu: `sudoku-kids-v11`, test: `sudoku-kids-v11`). Voor Android: `versionCode` verhogen in `android-app/android/app/build.gradle`, anders krijgen spelers de oude versie.
4. **Niets "klaar" noemen zonder bewijs.** Elke controle moet een commando met echte uitvoer hebben.
5. **localStorage-sleutels nooit hernoemen:** `sudokuKids_progress`, `sudokuKids_settings`, `sudokuKids_current`, `sudokuKids_played`, `sudokuKids_stats`, `sudokuKids_history`, `sudokuKids_inbox` (profiel 1), `sudokuKids_p<n>_…` (overige profielen) en `sudokuKids_profiles`. Alle opslag loopt via `storage.js`.
6. **Geen frameworks, externe CDN's, tracking, advertenties of accounts in het spel.** De webversie heeft geen build-stap; `tools/build.mjs` kopieert alleen bestanden voor de andere bouwdoelen. `tests/e2e.py` (onderdeel 31) controleert dat er geen verzoek naar een ander domein gaat. Enige uitzondering: de portal-versies laden de SDK van de portal zelf (verplicht), zonder één advertentie-aanroep (`tests/builds.py`). Komt er ooit iets bij dat het toestel verlaat of een advertentie toont, dan eerst akkoord van Jenn, en `docs/privacy-audit.md`, de privacyverklaring en het Data safety-formulier bijwerken.
7. **testen = push naar branch `test`, live = merge naar `main`.** Niets gaat naar `main` voordat het op de testlink is nagelopen. De testversie gebruikt `test_`-sleutels en een eigen cache; dat onderscheid (`IS_TEST` in `storage.js` en `sw.js`: hostnaam `test-…` of een map die op `-test` eindigt) nooit weghalen.
8. **Voor elke release alles groen:** `node tests/validate-levels.js`, `python3 tests/e2e.py`, `python3 tests/builds.py`, `python3 tests/screenshots.py` en `python3 tests/no-private-data.py` (zie README).
9. **Eén codebase, drie bouwdoelen: android, webportals en (optioneel, later) web.** Geen app-websites en geen eigen domein op deze repo's (nooit een `CNAME`-bestand in de root). Wat per bouwdoel verschilt staat alleen in `platform.js` / `platforms/`; nieuwe functies komen in de gewone code. Zie `docs/lanceren.md`.
10. **Geen signing keys of wachtwoorden in Git** (`.gitignore` sluit `*.keystore`, `*.jks`, `keystore.properties` en `.aab` uit). Jenn maakt en bewaart de sleutels zelf (`docs/android.md`).

---

## Logboek (nieuwste bovenaan)

### 2026-10-18 · v11 live gezet (Claude Code)
- De DNS van studiosedillo.com staat (sinds vandaag bij Cloudflare, door een andere sessie; zie `studio-sedillo-infra`). Daarmee was de voorwaarde voor het akkoord van Jenn vervuld.
- Gecontroleerd vooraf: `https://studiosedillo.com/`, `/sudoku-kids/privacy`, `/sudoku-kids/privacy?lang=en` en `/sudoku-kids/delete` → 200 via HTTPS; http en www sturen door naar https://studiosedillo.com/; GitHub Pages van `studio-sedillo`: eigen domein, HTTPS afgedwongen. `studio-sedillo-infra/tools/controleer-dns.py` → "Alles in orde" (`sudokukids` gereserveerd, geen record).
- Tests op `99f9361`: `python3 tests/e2e.py` → `✅ 348/348`; `python3 tests/builds.py` → `✅ 52/52`; `node tests/validate-levels.js` → 3× ✅; `python3 tests/no-private-data.py --online` → ✅.
- `publish-prep` fast-forward naar `main` (live gaat in één keer van v6 naar v11), tag `v11`, gepusht. Nagekeken: Pages-build van `main` "built", online `CACHE_VERSION = 'sudoku-kids-v11'` en `noindex` op het oude github.io-adres.
- Android Studio staat nog niet op deze computer: de Android-build is nog niet gemaakt.

**Bestanden geraakt:** ROADMAP.md.

### 2026-10-18 · v11 goedgekeurd voor productie (Claude Code)
- Jenn heeft v11 op de testlink nagelopen: "helemaal ready om te publiceren". Nieuwe levels en eventueel skins komen later.
- **Besluit:** `publish-prep` (v11, `e874c70`) gaat pas naar `main` als https://studiosedillo.com/sudoku-kids/privacy werkt. Tot dan blijft v6 op het oude github.io-adres staan; die heeft de privacypagina nog in de app. Gemeten op 2026-10-18: geen A-record en geen verificatierecord, de privacy-URL geeft geen antwoord.
- Zodra de DNS staat: `tools/eigen-domein.sh check`, `site`, `https`; privacy- en delete-URL controleren; dan mergen naar `main`, taggen als `v11` en de Android-build uit `main` maken.

**Bestanden geraakt:** ROADMAP.md.

### 2026-10-17 · v11 op de testlink: stand na een paar dagen, kleine verbeteringen, onderzoek zakelijk account (Claude Code, branch `publish-prep`)
**Stand gemeten:** sinds 11 oktober niets veranderd in deze repo. Testlink v10, live v6 (`sw.js` online nagekeken). Alle tests groen. DNS (`dig`, bij Namecheap zelf en via 1.1.1.1/8.8.8.8): `proefapp` en `test-proefapp` zijn weg, de repo's `proef-app` en `proef-app-test` ook. De parkeerrecords van de root zijn weg, maar de records voor GitHub staan er nog niet: **studiosedillo.com geeft nu geen antwoord** (ook `/sudoku-kids/privacy` en `/delete` niet); alleen een SPF-record van het e-maildoorsturen staat er nog. Geen Android Studio of SDK op deze computer, nog geen `.apk`/`.aab`.

- **Vergrendeld level:** tikken doet nu iets: het knopje schudt, er klinkt het foutgeluidje en de kat zegt "Speel eerst het level hiervoor!" (10 talen). De knop is niet meer `disabled` maar `aria-disabled`.
- **Onafgemaakt spel:** het level met een onafgemaakt spel krijgt een ▶ linksboven, en "verder spelen" in de naam voor schermlezers.
- **Voortgang overzetten:** eigen knop "Kies een bestand" (10 talen) in de stijl van de app; het bestandsveld van de browser is verborgen.
- **Zakelijk Play-account onderzocht** → `docs/bedrijf.md`, 1e: omzetten kan (eenrichting, website moet eerst geverifieerd zijn, D-U-N-S, 72 uur wachten); een organisatie-account toont altijd adres, telefoon en een e-mailadres dat bij het domein moet passen. `docs/publiceren.md` verwijst ernaar.
- Roadmap gelijkgetrokken met de echte stand (proef-records en proefrepo's afgevinkt, verouderde testpunten over v3, emoji en de PWA vervangen, mascotte over de levelknoppen was al opgelost en wordt getest).
- `CACHE_VERSION` → `sudoku-kids-v11`.

**Bewijs:** `python3 tests/e2e.py` → `✅ 348/348 controles geslaagd.` (4 nieuw: dicht level schudt en de kat legt uit; ▶ alleen bij het onafgemaakte level; eigen bestandsknop opent de bestandskiezer en importeert). `python3 tests/builds.py` → 52/52 ✅. `node tests/validate-levels.js` → 3× ✅. `python3 tests/screenshots.py` → ✅. `python3 tests/no-private-data.py` → ✅. Levelscherm en overzet-venster op 360×640 zelf bekeken.

**Bestanden geraakt:** script.js, index.html, style.css, i18n.js, sw.js, tests/e2e.py, docs/bedrijf.md, docs/publiceren.md, ROADMAP.md.

### 2026-10-11 · v10 op de testlink: geen app-websites; Capacitor in plaats van TWA; bouwdoel voor webportals (Claude Code, branch `publish-prep`)
**Nieuw besluit van Jenn (vervangt het plan voor live subdomeinen):** er gaan nog geen app-websites live. Eerst de Android-app in Google Play, daarna webportals; een webversie misschien veel later. Vooraf gevraagd: de proefrepo's → **verwijderen**.

- **Subdomeinen teruggedraaid.** `sudoku-kids` en `sudoku-kids-test` hadden nog geen eigen domein (er was niets ingesteld of gemerged). Van `proef-app` en `proef-app-test` zijn de domeinen `proefapp` en `test-proefapp` afgehaald. De repo's verwijderen lukte niet (`gh` mist het recht `delete_repo`): commando's voor Jenn staan in de takenlijst. Uit de repo gehaald: `live-deploy.yml`, `.well-known/assetlinks.json`, `twa/`, `docs/twa.md`, de domein-stappen in `test-deploy.yml`; `tools/eigen-domein.sh` doet alleen nog de hoofdsite en meldt records die weg moeten. De verhuismelding blijft uit (`NEW_HOME` leeg). DNS, gemeten met `dig`: alleen `proefapp` en `test-proefapp` bestaan en wijzen naar GitHub → **die twee moet Jenn verwijderen**; `sudokukids` en `test-sudokukids` bestaan niet; ook de root, `www` en het verificatie-record bestaan nog niet.
- **noindex:** `<meta name="robots" content="noindex, nofollow">` in `index.html`. Staat daarmee op de testlink; op het oude github.io-adres van `main` pas na de merge. The Flush Factor niet aangeraakt (niet-gecommit werk van een andere sessie) → taak.
- **Privacy en verwijderen naar de hoofdsite:** `studiosedillo.com/sudoku-kids/privacy` en `/delete`, 5 talen, in de repo `studio-sedillo` (online; tot de DNS er is op het github.io-adres van de hoofdsite). Tekst "Delen met anderen" herschreven (bestanden zitten in de app, Google Play, spellenwebsites). De app linkt erheen in de taal van de app; `privacy.html`, `delete.html` en `verwijderen.html` zijn uit de app. URL's bijgewerkt in `store/` en `docs/publiceren.md`. De hoofdsite toont de spellen als "Binnenkort", zonder links.
- **Android via Capacitor** (advies en vergelijking met TWA in `docs/android.md`): project `android-app/` (Capacitor 8, package `com.studiosedillo.sudokukids`, target-API 36, bestanden in de app, geen service worker, alleen de permissie INTERNET, geen back-up naar Google), `tools/build-android.sh [release]`, iconen en startscherm, ondertekenen via `keystore.properties` buiten Git. Voor Android in `platforms/android.js`: terugknop, en een tweede kopie van de opslag in de native opslag omdat Capacitor localStorage als tijdelijk beschouwt.
- **Webportals** (`docs/webportals.md`): eisen van CrazyGames en Poki onderzocht. Uitkomst: geen van beide is gemaakt voor een kinderspel zonder advertenties; CrazyGames wijst "content targeted for kids" af; Poki past inhoudelijk beter maar wil bij voorkeur 5 jaar web-exclusiviteit en verdient via advertenties. `node tools/build.mjs crazygames|poki` maakt een upload-zip (0,25 MB) zonder service worker, zonder links naar buiten, met hun SDK en **zonder één advertentie-aanroep**.
- **Structuur:** één codebase, bouwdoelen android / webportals / web → `platform.js`, `platforms/`, `tools/build.mjs`, `docs/lanceren.md`; vaste regels 6, 8, 9 en 10 aangepast. De algemene opzet staat in `Apps/CLAUDE.md` sectie 11 en de template (gedaan door een andere sessie; daar niets aan veranderd).
- `CACHE_VERSION` → `sudoku-kids-v10`.

**Bewijs:**
- `python3 tests/e2e.py` twee keer achter elkaar → `✅ 344/344 controles geslaagd.` (minder dan 361: de controles van de pagina's zijn verhuisd naar de hoofdsite; nieuw: links naar de hoofdsite in de taal van de app, pagina's niet meer in de app, geen domeinbestanden, noindex, store-URL's).
- `python3 tests/builds.py` → `✅ 52/52 controles geslaagd.` (nieuw: bouwt de drie doelen; speelt de portal-versies met een nagebootste SDK: juiste aanroepen in de juiste volgorde, geen advertentie-aanroep, geen links, werkt ook zonder SDK; speelt de Android-versie met een nagebootste Capacitor-brug: terugknop op elk scherm, tweede kopie van de opslag en terugzetten na wissen, geluid, ouderslot, code maken, alles wissen; controleert het Android-project).
- Repo `studio-sedillo`: `python3 tests/pages.py` → `✅ 17/17 controles geslaagd.` (pagina's in 5 talen, zelfde opbouw, verplichte onderdelen, footer, geen links naar app-websites).
- `python3 tests/screenshots.py` → 7 formaten × 32 schermen, `✅ Niets buiten beeld, alle knoppen minstens 48x48 px, 0 console-errors.` `node tests/validate-levels.js` ✅ · `python3 tests/store.py` ✅ · `python3 tests/no-private-data.py` ✅ (ook `--online` op de hoofdsite).
- Netwerktest opnieuw: 22 verzoeken, alleen GET, alleen het eigen adres.

**Niet gedaan / niet te testen hier:** de Android-app is **niet gebouwd en niet op Android gestart** (geen Android-SDK op deze computer; de licenties accepteert Jenn zelf bij het installeren van Android Studio) → lijst van 10 punten in `docs/android.md`. De portal-versies zijn niet op CrazyGames of Poki zelf getest. De links naar studiosedillo.com werken pas na de DNS van de hoofdsite.

**Bestanden geraakt:** index.html, script.js, style.css, sw.js, platform.js (nieuw), platforms/ (nieuw), tools/build.mjs, tools/build-android.sh, tools/android-icons.sh (nieuw), tools/eigen-domein.sh, android-app/ (nieuw), tests/builds.py (nieuw), tests/e2e.py, tests/screenshots.py, store/, .github/workflows/test-deploy.yml, .gitignore, docs/android.md, docs/webportals.md, docs/lanceren.md (nieuw), docs/studio-sedillo.md, docs/publiceren.md, docs/privacy-audit.md, README.md, ROADMAP.md. Verwijderd: privacy.html, delete.html, verwijderen.html, .well-known/, twa/, docs/twa.md, live-deploy.yml. Repo `studio-sedillo`: sudoku-kids/privacy.html, sudoku-kids/delete.html, index.html, privacy.html, tests/pages.py.

### 2026-10-11 · Adrescontrole met de ingevulde lijst; vangnet in template en Flush Factor (Claude Code)
- Jenn heeft de blocklist ingevuld (2 patronen) en het geheim `PRIVATE_BLOCKLIST` gezet in `sudoku-kids` en `studio-sedillo`.
- **Eenmalige controle, uitkomst: niets gevonden.** Met `tools/no-private-data.py`: alle bestanden (ook niet-gecommit werk) en de hele geschiedenis van alle branches van de vier lokale repo's; de volledige geschiedenis op GitHub van alle 11 repo's van het account (ook `sudoku-kids-test`, `proef-app`, `proef-app-test` en de vier privé-repo's); en de gepubliceerde pagina's van de testlink, de live app, de hoofdsite en The Flush Factor. Afbeeldingen worden niet gelezen.
- Vangnet toegevoegd aan `studio-sedillo-app-template` (main) en `the-flush-factor` (branch `sprint-9`, alleen deze vier bestanden): controle, hooks, stap in de workflow; geheim in beide repo's gezet. `Apps/tools/nieuwe-app.sh` zet voor een nieuwe app de hooks aan vóór de eerste commit en zet het geheim in beide repo's. Tests van de template: 37 geslaagd; dry-run van `nieuwe-app.sh` werkt.
- Geen wijziging aan de app zelf, dus `CACHE_VERSION` blijft `sudoku-kids-v9`.

### 2026-10-11 · v9 op de testlink: bedrijfsgegevens, onderzoek adres en Play-account, adres-vangnet (Claude Code, branch `publish-prep`)
Gegevens van Jenn: Studio Sedillo is een eenmanszaak, KvK 42122276, Nederland; handelsnamen Studio Sedillo en Clever Creatures Club. **Vast besluit: naam en land mogen publiek, het adres (huisadres) en het vestigingsnummer nergens.** Btw-id nog niet bekend.

- **Onderzoek** → `docs/bedrijf.md` (bronnen KVK, Ondernemersplein, ACM, wetten.overheid.nl, Play Console Help, geraadpleegd op 11 oktober 2026). Uitkomst: persoonlijk account zonder betaalde apps of aankopen toont alleen wettelijke naam, land en e-mail → plan bevestigd. Organisatie-account toont altijd adres en telefoon. Het bezoekadres van een eenmanszaak is openbaar in het Handelsregister tot het is afgeschermd (kan altijd, vraagt een postadres). `docs/publiceren.md` daarop aangepast.
- **Aangepast:** privacyverklaring (5 talen) en hoofdsite (EN/NL): "Verantwoordelijke: Studio Sedillo (eenmanszaak), KvK 42122276, Nederland · studio.sedillo@gmail.com". Footer met KvK-nummer, land en e-mail op de privacy- en verwijderpagina en op alle pagina's van de hoofdsite. Credits in 10 talen: "… Studio Sedillo · KvK 42122276". `store/listing.json`: bedrijfsregel zonder adres. Datum bovenaan blijft 11 oktober 2026 (vandaag).
- **Adres-vangnet:** `tools/no-private-data.py` (bestanden, commit, commitbericht, geschiedenis, online, zelftest), `tools/install-hooks.sh` (pre-commit en commit-msg), `tests/no-private-data.py`, stap in beide deploy-workflows met geheim `PRIVATE_BLOCKLIST` (zonder geheim: waarschuwing). Lijst buiten de repo's: `~/.studio-sedillo/blocklist.txt`, aangemaakt met alleen een voorbeeldregel. Hooks staan aan in deze repo en in `studio-sedillo`.
- **Eenmalige controle:** de lijst is nog niet ingevuld, dus de controle op het echte adres is nog niet gedaan. Wel gezocht op alles wat op een Nederlandse postcode of straat-met-huisnummer lijkt, in alle bestanden en de hele geschiedenis van `sudoku-kids`, `studio-sedillo`, `studio-sedillo-app-template` en `the-flush-factor`: geen treffers.
- `CACHE_VERSION` → `sudoku-kids-v9`.

**Bewijs:** `python3 tests/e2e.py` twee keer achter elkaar → `✅ 361/361 controles geslaagd.` (bestaande controles uitgebreid: footer met KvK-nummer en land op beide pagina's in 5 talen, verantwoordelijke met rechtsvorm en KvK-nummer, credits met KvK-nummer; de emoji-controle telt het ©-teken niet meer als emoji). `python3 tests/screenshots.py` → `✅ Niets buiten beeld, alle knoppen minstens 48x48 px, 0 console-errors.`; credits op 320 px en de footer zelf bekeken. `python3 tests/no-private-data.py` → zelftest ✅ (een verzonnen adres wordt gevonden, schone tekst niet); controle op de echte lijst overgeslagen met waarschuwing omdat de lijst nog niet is ingevuld. Hooks bewezen in een wegwerp-repo met een verzonnen patroon: schone commit gelukt, commit met het patroon in een bestand tegengehouden, commit met het patroon in het commitbericht tegengehouden. `node tests/validate-levels.js` ✅. `python3 tests/store.py` ✅.

**Bestanden geraakt:** privacy.html, delete.html, index.html, i18n.js, sw.js, beide workflows, tools/no-private-data.py (nieuw), tools/install-hooks.sh (nieuw), tests/no-private-data.py (nieuw), tests/e2e.py, tests/screenshots.py, tests/store.py, store/listing.json, store/teksten.md, docs/bedrijf.md (nieuw), docs/publiceren.md, README.md, ROADMAP.md. Repo `studio-sedillo`: index.html, privacy.html, 404.html, tools/, tests/, .github/workflows/private-check.yml. Ook `Apps/CLAUDE.md` (vaste gegevens).

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
- [ ] v11: tik op een dicht level (schudt, de kat legt het uit); begin een level, ga terug: staat er een ▶ op? Voortgang overzetten → "Kies een bestand"
- [ ] Android-app: vliegtuigmodus aan en de app openen (werkt zonder internet: alle bestanden zitten in de app)
- [ ] Android-terugknop/veeggebaar in de geïnstalleerde app: spel → levels → werelden → app sluit
- [ ] Landscape op de telefoon draaien tijdens een puzzel (automatisch getest op 640×360 en 844×390)
- [ ] Telefoon met notch/camera-uitsparing in landscape: staat er niets onder de uitsparing?
- [ ] Geluid: hoor je de piepjes, ook na het ontgrendelen van het scherm?
- [ ] App-icoon in de Android-app op het startscherm (ronde of vierkante uitsnede)
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
- [x] Gegevens en profiel verwijderen in de app (op test) + verwijderpagina op de hoofdsite (`studiosedillo.com/sudoku-kids/delete`)
- [x] Google Play-ontwikkelaarsaccount → bestaat al (persoonlijk account), AdMob-account ook (niet gebruikt)
- [x] Domeinnaam kiezen → alleen de hoofdsite `studiosedillo.com`; het plan voor een subdomein per app is op 2026-10-11 vervangen (`docs/lanceren.md`)
- [x] KvK-inschrijving → Studio Sedillo, eenmanszaak, KvK 42122276 (staat in de footer, de privacyverklaring en de credits)
- [x] Store-materiaal: teksten in 10 talen, icoon, feature graphic, screenshots telefoon en tablet → `store/`

**Testen (J)**
- [x] v11 (en daarmee v7 t/m v10) nagelopen en goedgekeurd voor productie (2026-10-18)
- [ ] v7 op de testlink: Instellingen → Spelregels en Credits; ?-knop in het spel; een nieuw profiel maken en kijken of de spelregels vanzelf komen
- [ ] v7: Wie speelt er? → Voortgang overzetten → code maken, kopiëren, als bestand bewaren; op een ander toestel of in een privévenster importeren
- [ ] v7: een testprofiel verwijderen; daarna "Alle gegevens van deze app verwijderen" (alleen op de testlink!) en kijken of de app schoon start
- [ ] v7: privacyverklaring en "Gegevens verwijderen (uitleg)" lezen in het Nederlands en Engels
- [ ] Hoofdsite nalopen: https://jmldewaal-sedillo.github.io/studio-sedillo/ (klopt de tekst over Studio Sedillo? wat moet er bij The Flush Factor staan?)
- [ ] v8: credits (één zin over eigen werk), privacyverklaring (onderdelen "Als je ons mailt" en "Gegevens buiten de EU") en de hoofdsite opnieuw lezen
- [ ] Store-materiaal bekijken: `store/feature-graphic.png`, `store/screenshots/`, `store/teksten.md`

**Bedrijf en adres (uitleg in `docs/bedrijf.md`)**
- [x] J: straatnaam en postcode in `~/.studio-sedillo/blocklist.txt`; C: alle repo's en hun geschiedenis nagelopen → niets gevonden (2026-10-11)
- [x] Geheim `PRIVATE_BLOCKLIST` in `sudoku-kids`, `studio-sedillo`, `studio-sedillo-app-template` en `the-flush-factor`
- [ ] J: Zakelijk postadres regelen en bij KvK als vestigingsadres registreren: nodig vóór een app met advertenties of aankopen, of voor een organisatie-account. (Uit het onderzoek: bij de KVK leg je het vast als *postadres* en scherm je het bezoekadres af; tot dan is het huisadres te vinden in het Handelsregister.)
- [ ] J: Testers verzamelen voor de gesloten test (12 personen, 14 dagen)
- [ ] Btw-id toevoegen aan de footer (nog niet bekend; J geeft het door, C zet het op de hoofdsite en op de privacy- en verwijderpagina)
- [ ] J: beslissen of er een telefoonnummer bij de bedrijfsgegevens moet (Ondernemersplein en ACM noemen het)
- [ ] J: in Play Console nakijken dat het account persoonlijk is en dat er geen betaalde apps of aankopen aan staan; eigen ontwikkelaarspagina bekijken
- [x] Het vangnet (`tools/no-private-data.py`, hooks, stap in de workflow) ook in de template `studio-sedillo-app-template` en in The Flush Factor (branch `sprint-9`); `Apps/tools/nieuwe-app.sh` zet het aan voor elke nieuwe app
- [ ] Verandert de blocklist, dan het geheim `PRIVATE_BLOCKLIST` in alle vier de repo's opnieuw zetten (commando in `docs/bedrijf.md`)

**Hoofdsite en domein (alleen studiosedillo.com; apps krijgen geen subdomein)**
- [x] J: DNS van de hoofdsite: sinds 2026-10-18 bij Cloudflare, studiosedillo.com live met HTTPS (`studio-sedillo-infra`)
- [x] J: de records `proefapp` en `test-proefapp` verwijderd bij Namecheap (gecontroleerd met `dig` op 2026-10-17)
- [ ] J: het SPF-record van het e-maildoorsturen op de root (`v=spf1 include:spf.efwd.registrar-servers.com`) laten staan als je e-mail op studiosedillo.com wilt (nodig voor een organisatie-account, `docs/bedrijf.md` 1e), anders weghalen
- [x] J: domein geverifieerd bij GitHub (gecontroleerd met `controleer-dns.py`, 2026-10-18)
- [x] C: `https://studiosedillo.com/sudoku-kids/privacy` en `/delete` werken via HTTPS (2026-10-18)
- [x] C: `publish-prep` gemerged naar `main`, tag `v11` (2026-10-18)
- [ ] `studiosedillo.com/sudoku-kids/verwijderen` geeft 404; `Apps/CLAUDE.md` (sectie 5) vraagt een doorverwijzing naar `/delete`. Hoort in de repo `studio-sedillo` (live site, dus na akkoord). Niet nodig voor Google Play
- [x] J: de proefrepo's `proef-app` en `proef-app-test` en de map `Apps/proef-app` zijn weg (gecontroleerd op 2026-10-17)
- [x] Privacy- en verwijderpagina van Sudoku Kids op de hoofdsite, 5 talen; de app linkt erheen; startpagina toont de spellen als "Binnenkort" zonder links
- [x] Eigen domeinen van `proef-app` en `proef-app-test` afgehaald; `sudoku-kids` en `sudoku-kids-test` hadden er geen
- [x] Webversie (test en straks live) op `noindex`
- [ ] Opruimen: de branches `feature-2026-10-11` en `review-2026-10-09` zitten helemaal in `main` en kunnen weg (`git branch -d …` en `git push origin --delete …`; de beveiliging van Claude Code laat dat alleen met akkoord toe)
- [x] `noindex` staat ook op het oude github.io-adres van `main` (v11, 2026-10-18)
- [ ] The Flush Factor: `noindex` op de github.io-versie (het niet-gecommitte werk is er niet meer; dit hoort in de roadmap van Flush Factor)
- [ ] Nieuwe lay-out voor studiosedillo.com (ontwerp volgt)
- [ ] C: privacyverklaringen nalopen na de uitspraak van het Hof van Justitie over het EU-U.S. Data Privacy Framework (zaak C-703/25 P, loopt nog); vervalt het besluit, dan de alinea "Gegevens buiten de EU" aanpassen

**Android-app (Capacitor, uitleg in `docs/android.md`)**
- [x] Capacitor-project `android-app/` (package `com.studiosedillo.sudokukids`, target-API 36, bestanden in de app, geen service worker, alleen INTERNET-permissie, geen back-up naar Google), build-script, iconen en startscherm
- [x] Terugknop, tweede kopie van de opslag, links en "voortgang overzetten" voor Android, getest met een nagebootste Capacitor-brug (`tests/builds.py`)
- [ ] J: Android Studio installeren (levert de SDK en JDK; je gaat zelf akkoord met de licenties) en `tools/build-android.sh` draaien
- [ ] J: de app op je toestel testen met de lijst van 10 punten in `docs/android.md` (**de app is nog nooit op Android gestart**)
- [ ] J: upload key maken en op twee plekken bewaren; `keystore.properties` aanmaken (nooit in Git)
- [ ] J: app aanmaken in Play Console; ontwikkelaarsnaam Studio Sedillo, e-mail studio.sedillo@gmail.com; accounttype en aanmaakdatum nakijken
- [ ] J: `tools/build-android.sh release` en de `.aab` uploaden naar Interne test; daarna de lijst nog een keer nalopen
- [ ] Beslissen over schermrotatie: Android 16+ negeert een vaste stand op tablets; het spel werkt staand en liggend.
- [ ] Overwegen: "Bewaar als bestand" in de Android-app via de deelfunctie van Android (nu verborgen; code kopiëren werkt)

**Webportals (uitleg en advies in `docs/webportals.md`)**
- [x] Upload-zip per portal uit dezelfde code (`node tools/build.mjs crazygames|poki`): zonder service worker, zonder links naar buiten, met hun SDK, zonder advertentie-aanroepen
- [ ] J: beslissen of en waar: Poki eerst aanschrijven met de twee vragen (zonder advertenties? advertenties bij een kinderspel?); CrazyGames wijst spellen "targeted for kids" af
- [ ] J: de zip testen in de Poki Inspector en als concept bij CrazyGames (de echte SDK's zijn hier niet getest)
- [ ] Vóór publicatie op een portal: `docs/privacy-audit.md` aanvullen met wat de SDK van de portal verstuurt
- [ ] Advertenties op een portal: alleen na uitdrukkelijk besluit van Jenn

**Play Console (J, antwoorden in `docs/publiceren.md`)**
- [ ] Kiezen: persoonlijk account houden, omzetten naar organisatie, of een nieuw account (`docs/bedrijf.md`, 1e). **De app pas aanmaken als dit besloten is.**
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
- [ ] Elk jaar vóór 31 augustus: nieuwe target-API-eis van Google nakijken, Capacitor bijwerken naar de versie die daarbij hoort en een nieuwe `.aab` uploaden
- [ ] Verwijzing naar eigen spellen van Studio Sedillo ("meer spellen"): achter het ouderslot, duidelijk te onderscheiden van het spel; eerst uitzoeken of de advertentieverklaring in Play Console dan op "ja" moet (Families-beleid rekent kruispromotie tot de advertentieregels), en `docs/privacy-audit.md` bijwerken
- [ ] The Flush Factor op dezelfde manier uitbrengen (één codebase, bouwdoelen android en webportals, privacy- en verwijderpagina op de hoofdsite onder `flush-factor/`). **Let op: Flush Factor en elke andere app met advertenties of aankopen pas publiceren nadat het zakelijke postadres geregeld is** (Google toont dan het volledige adres; zie `docs/bedrijf.md`).
- [ ] Misschien veel later: een webversie op een eigen adres (`docs/lanceren.md`)
- [ ] Meer levels per wereld, richting 500 (nu 50 per rastergrootte; aanvullen met `tools/generate-puzzles.js --levels`)
- [ ] Meer werelden, richting 10 (nu 5)
- [ ] Meer symboolthema's: cijfers, dieren, planten, groente, fruit (te kiezen per profiel)
- [ ] Meer talen: Hindi en Russisch (grote Play-markten, ander schrift – eerst een moedertaalspreker), Arabisch (rechts-naar-links: de lay-out moet daarvoor gespiegeld worden en is daar nog niet op getest)

### Verbeteringen
- [x] Statusbalk-knoppen (hint/notitie/wissen) op tablets zijn klein → 84×64 px op tablets
- [x] Op smalle telefoons (≤360 px) zijn 9×9-cellen ≈33 px → 35 px op 360, 33 px op 320 (was 25)
- [ ] 9×9 op een telefoon blijft klein (33–40 px per vakje, onder de 48 px-richtlijn). Past niet groter op het scherm; overweeg inzoomen op een blok of 9×9 alleen aanraden op tablets.
- [ ] Notities met dieren/fruit in 9×9 zijn op een telefoon nauwelijks leesbaar (±9 px)
- [x] Levelscherm: laat zien welk level een onafgemaakt spel heeft → ▶ linksboven (v11)
- [x] Vergrendeld level geeft geen reactie bij tikken → schudt, foutgeluidje en uitleg van de kat (v11)
- [x] Reset-knop is voor een kind bereikbaar → ouderslot (3 seconden ingedrukt houden) vóór voortgang wissen en profiel verwijderen
- [ ] Binnen een band verschilt het aantal "rondes" nog (zie logboek 2026-10-11). Overweeg de banden ook op rondes in te delen als kinderen het verschil merken.
- [x] Het TEST-label ligt op een telefoon net over de levelnaam → eigen strook boven de app
- [x] Nieuwe levels stonden achteraan per wereld → het levelscherm is nu gesorteerd op moeilijkheid (alleen de weergave; de opslag blijft per index)
- [ ] Badge-plaatjes zijn samengesteld (medaille + icoon + getal). Voor de mooiste 10–20 badges een eigen tekening maken.
- [ ] Privacyverklaring en verwijderpagina ook in Duits, Frans, Italiaans, Pools en Turks (de app heeft die talen wel; ze vallen daar nu terug op Engels)
- [ ] Het laatste profiel kan niet los verwijderd worden (de knop is dan verborgen); dat gaat nu via "Alle gegevens verwijderen". Overweeg de knop te tonen met dezelfde uitleg.
- [x] Voortgang overzetten: eigen knop "Kies een bestand" in plaats van de standaardknop van de browser (v11)
- [ ] Voortgang overzetten als QR-code (handig van telefoon naar tablet); de code is voor twee profielen nu ruim 1 kB
- [ ] Hoofdsite `studio-sedillo`: `404.html` gebruikt paden vanaf de root en klopt dus pas op het eigen domein
- [ ] Geschiedenis: alleen gewonnen puzzels worden bijgehouden; overweeg ook afgebroken pogingen te tonen
- [ ] Muziek: één deuntje voor alles. Overweeg een eigen deuntje per wereld en een volumeschuif.
- [x] Badges op de profielpagina waren vier vaste → 100 badges in `badges.js`
- [ ] Profielscherm: laat per profiel ook de voortgang per wereld zien
- [x] Mascotte en tekstballon liggen op het levelscherm over de onderste levelknoppen → opgelost in v5 (schermen eindigen boven de balk; `tests/e2e.py` controleert het)
- [ ] De sprong van 6×6 naar het eerste 9×9-level (35 open vakjes) is groot; overweeg een paar extra makkelijke 9×9's. Let op: mag de volgorde van `LEVEL_PLAN` niet veranderen.
- [ ] Monochroom icoon (`purpose: "monochrome"`) voor Android-themapictogrammen
- [ ] Voorgelezen aanwijzingen voor kinderen die niet kunnen lezen (de mascotte-teksten zijn nu alleen tekst)
- [ ] `script.js` (±1.000 regels) opsplitsen in losse bestanden (profielen, ouderslot en puzzelkeuze zijn goede kandidaten)

### Ideeën
- **Clever Creatures Club** als label voor kinderspellen onder Studio Sedillo (domeinen clevercreatures.club en clevercreaturesclub.com zijn al in bezit).
- **Gesproken mascotte** – korte opgenomen zinnetjes per taal ("Tik op een vakje!"). Lost het lees-probleem beter op dan plaatjes alleen.
- **Dagelijkse puzzel** – elke dag één extra level op basis van de datum als seed (geen server nodig).
- **Extra werelden** – bijv. kleuren-sudoku of 4×4 met vormen voor de allerjongsten; nieuwe werelden áchteraan toevoegen zodat bestaande levels en sterren kloppen.
- **Stickerboek / beloningen** – per 10 sterren een sticker; geeft een doel naast de sterren.
- **Oefenmodus zonder timer en hartjes** – voor kinderen die van de teller zenuwachtig worden.
- **Ongedaan maken** – één stap terug-knop.

---

## Bekende beperkingen

- **De Android-app is nog niet gebouwd en niet op Android getest.** Op de ontwikkelcomputer staat geen Android-SDK. De Android-versie van de webbestanden is getest in een browser met een nagebootste Capacitor-brug; de echte terugknop, opslag en het geluid moet Jenn op een toestel nalopen (`docs/android.md`).
- **De portal-versies zijn getest met nagebootste SDK's**, niet op CrazyGames of Poki zelf.
- **Verhuizen naar een ander adres neemt de voortgang niet vanzelf mee** (opslag hangt aan het adres). Daarvoor is de verhuisknop of de overzet-code. Een snelkoppeling op het startscherm moet opnieuw geïnstalleerd worden.
- **Test en live delen nu nog één domein** (`jmldewaal-sedillo.github.io`), net als Flush Factor (die sinds 12 oktober ook een eigen testrepo `the-flush-factor-test` heeft). De opslag is gescheiden met de `test_`-prefix. De live versie van vóór deze review (cache v2) en Flush Factor ruimen bij een eigen update nog wel alle caches op het domein op; de testversie haalt zijn bestanden dan gewoon opnieuw op, maar is op dat moment even niet offline beschikbaar.
- **Geen installatie of offline spelen via http://.** De service worker wordt alleen geactiveerd via `https://` of `http://localhost`. Via een lokaal IP-adres (bijv. `http://192.168.x.x:8000`) kun je de app wel testen, maar niet installeren en niet offline spelen. Dat werkt pas na HTTPS-hosting.
