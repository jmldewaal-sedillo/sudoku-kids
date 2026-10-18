# Sudoku Kids & Crazy Grids — afspraken voor deze app

De basis voor alle apps staat in `Apps/CLAUDE.md` en geldt hier ook. De vaste opzet van elke
app (merk, één codebase met drie bouwdoelen, hoofdsite, testen, advertenties, privacy en de
blocklist) staat daar in **sectie 11, "App-structuur Studio Sedillo"**; die regels worden hier
niet herhaald. Dit bestand bevat alleen wat specifiek is voor deze app. Hoe sectie 11 hier is
uitgewerkt staat in `docs/lanceren.md`.

## Wat voor app

Een **kinder-app** (doelgroep onder de 13): dus geen advertenties, geen aankopen, geen
inloggen, en het Families-beleid geldt (sectie 11, punt 5). Slug `sudokukids`, package
`com.studiosedillo.sudokukids`.

## Roadmap
- Lees aan het begin van elke sessie ROADMAP.md.
- Werk aan het einde van elke taak ROADMAP.md bij: een logboekregel met datum
  erbij, afgeronde taken op [x] zetten, nieuwe problemen als taak toevoegen en
  "Status in één oogopslag" bijwerken.
- Zegt de gebruiker "zet op de roadmap: …", voeg het dan als taak toe in de
  juiste groep (of onder Ideeën als het niet duidelijk is) en verander verder niets.
- De Vaste regels uit ROADMAP.md gelden altijd.

## App-specifieke regels

- Deze app is ouder dan de template en heeft eigen namen voor dezelfde opzet: de laag per
  bouwdoel staat in `platform.js` en `platforms/`, het bouwen doet `tools/build.mjs`, en de
  Capacitor-app (Android én iOS, dezelfde bestanden) staat in `app/` (bouwdoel `app`, zoals
  bij The Flush Factor).
- **Kinder-app in beide stores:** elke link die de app verlaat en (later) elke aankoop zit
  achter het ouderslot (`askParent`). Dat eisen het Families-beleid van Google en de
  Kids-categorie van Apple (guideline 1.3); `tests/e2e.py` bewaakt het. Plannen voor later geld
  verdienen: eerst `docs/later-verdienen.md`.
- De opslag gebruikt de sleutels `sudokuKids_…` (niet de prefix `sudokukids.` uit
  `Apps/CLAUDE.md`, sectie 2). Dat is bewust: de sleutels bestonden al en veranderen nooit
  (ROADMAP.md, Vaste regels).
