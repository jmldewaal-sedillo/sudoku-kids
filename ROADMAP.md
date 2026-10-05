# Roadmap – Sudoku Kids & Crazy Grids

## Status in één oogopslag

| | |
|---|---|
| **Huidige fase** | Fase 3 afgerond – volledig geaudit, geen fouten |
| **Laatste update** | 2026-10-04 |
| **Volgende stap** | Zelf spelen op telefoon testen, dan publiceren via HTTPS |

---

## Vaste regels (nooit breken)

1. **Seeds en volgorde van `LEVEL_PLAN` in `puzzles.js` nooit wijzigen.** De seed per level is `20261004 + i * 7919`. Als die verandert, horen opgeslagen sterren bij de verkeerde puzzel.
2. **Na elke wijziging aan levels altijd draaien:** `node tests/validate-levels.js`. Verwacht eindresultaat: `✅ Alle levels geldig, uniek oplosbaar en stabiel.`
3. **Bij elke release `CACHE_VERSION` in `sw.js` verhogen** (nu: `sudoku-kids-v2`), anders krijgen spelers de oude versie.
4. **Niets "klaar" noemen zonder bewijs.** Elke controle moet een commando met echte uitvoer hebben.

---

## Logboek (nieuwste bovenaan)

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

### Testen
- [ ] Zelf spelen op de telefoon (splash → wereld 1 → een paar levels uitspelen)
- [ ] Een paar levels uit elke wereld voltooien (inclusief 6×6 en 9×9)
- [ ] Offline-modus: app installeren via HTTPS, wifi uitzetten, herladen
- [ ] Landscape-oriëntatie controleren op telefoon
- [ ] Maskable icoon controleren op echt Android-toestel (ronde of vierkante uitsnede)

### Publiceren
- [ ] Hosting met HTTPS opzetten (GitHub Pages, Netlify of Cloudflare Pages)
- [ ] Domeinnaam of subpad kiezen voor de hosting
- [ ] Relatieve paden in manifest.json controleren na keuze van subpad
- [ ] `assetlinks.json` plaatsen op `/.well-known/assetlinks.json`
- [ ] Privacyverklaring schrijven en online zetten (verplicht voor Families-beleid)
- [ ] Google Play-ontwikkelaarsaccount aanmaken (eenmalig €25)
- [ ] App inpakken als Android `.aab` met PWABuilder of Bubblewrap
- [ ] Signing key veilig bewaren (verlies = geen updates meer mogelijk)
- [ ] Google Play Families-vragenlijst invullen (doelgroep, advertenties, gegevens)
- [ ] Store-pagina aanmaken: beschrijving, categorie, contentrating, screenshots

### Verbeteringen
- [ ] Statusbalk-knoppen (hint/notitie/wissen) op tablets zijn klein; grotere klikzone of afstandhouder toevoegen
- [ ] Op smalle telefoons (≤360 px) zijn 9×9-cellen ≈33 px; lettertypegrootte en padding optimaliseren

### Ideeën
*(leeg – voeg hier nieuwe wensen toe)*

---

## Bekende beperkingen

- **Geen installatie of offline spelen via http://.** De service worker wordt alleen geactiveerd via `https://` of `http://localhost`. Via een lokaal IP-adres (bijv. `http://192.168.x.x:8000`) kun je de app wel testen, maar niet installeren en niet offline spelen. Dat werkt pas na HTTPS-hosting.
