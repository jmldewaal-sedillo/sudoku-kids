# Lanceren: één codebase, meerdere bouwdoelen

*Besluit van Jenn, 11 oktober 2026. Vervangt het plan "elke app op een eigen subdomein".*

**Er gaan nog geen app-websites live.** De volgorde is:

1. de **Android-app** in Google Play (en daarna dezelfde app voor iOS in de App Store);
2. **webportals** zoals Poki en CrazyGames;
3. *misschien veel later:* een webversie op een eigen (sub)domein.

Alleen de hoofdsite krijgt een eigen domein: **studiosedillo.com**. Daar staan per app de
privacyverklaring en de pagina over gegevens verwijderen.

## Eén codebase

Het spel is één set bestanden in de root van deze repo. Er is geen aparte Android- of
portal-versie van de code. Het enige dat per bouwdoel verschilt is `platform.js`:

| Bouwdoel | `platform.js` komt uit | Maken | Uitkomst | Uitleg |
|---|---|---|---|---|
| **app**: Android | `platforms/app.js` | `tools/build-android.sh [release]` | `.apk` of `.aab` | `docs/android.md` |
| **app**: iOS | `platforms/app.js` (dezelfde bestanden) | `tools/build-ios.sh`, daarna Xcode op een Mac of de workflow `app-build.yml` | build voor App Store Connect | `docs/ios.md` |
| **webportals**: crazygames | `platforms/crazygames.js` | `node tools/build.mjs crazygames` | `dist/sudoku-kids-crazygames.zip` | `docs/webportals.md` |
| **webportals**: poki | `platforms/poki.js` | `node tools/build.mjs poki` | `dist/sudoku-kids-poki.zip` | `docs/webportals.md` |
| **web** (optioneel, later) | `platform.js` in de root | geen build: de repo zelf | testkopie op github.io | README |

Wat `platform.js` regelt:

| | web | app (Android en iOS) | portals |
|---|---|---|---|
| Service worker (`sw.js`) | aan | uit | uit |
| Links naar privacy en verwijderen (hoofdsite) | achter het ouderslot | achter het ouderslot | verborgen |
| "Bewaar als bestand" | aan | verborgen | aan |
| SDK van de portal | – | – | geladen, alleen de verplichte aanroepen |
| Terugknop (alleen Android) en tweede kopie van de opslag | – | via Capacitor | – |
| Advertenties | nee | nee | nee (niets vraagt een advertentie) |

Regels:

- **Nieuwe functie? In de gewone code**, niet in één bouwdoel. Alleen wat echt van de
  omgeving afhangt gaat via `window.SudokuPlatform`.
- **Nieuw bestand voor het spel?** In `ASSETS` (`sw.js`) én in `FILES` (`tools/build.mjs`);
  `tests/builds.py` controleert dat de lijsten gelijk lopen.
- **De opslagsleutels zijn overal dezelfde** (`sudokuKids_…`). Voortgang gaat van het ene
  naar het andere bouwdoel met "Voortgang overzetten".
- **Advertenties** komen er alleen na een uitdrukkelijk besluit van Jenn, en dan eerst de
  privacyverklaring, `docs/privacy-audit.md` en de Data safety-antwoorden.

## De webversie nu

De webversie bestaat alleen als **testkopie**: de testlink (`sudoku-kids-test`) en het oude
github.io-adres van `main`. Beide staan op `noindex`, hebben geen eigen domein en worden
nergens gelinkt, ook niet vanaf de hoofdsite. Jenn gebruikt de testlink om een nieuwe versie
op haar telefoon na te lopen voordat er een Android-build of een portal-upload van komt.

De ingebouwde verhuismelding (`NEW_HOME` in `script.js`) blijft uit.

## Privacy en gegevens verwijderen

| Pagina | Adres | Bron |
|---|---|---|
| Privacyverklaring (5 talen) | `https://studiosedillo.com/sudoku-kids/privacy` | repo `studio-sedillo`, `sudoku-kids/privacy.html` |
| Gegevens verwijderen (5 talen) | `https://studiosedillo.com/sudoku-kids/delete` | repo `studio-sedillo`, `sudoku-kids/delete.html` |

De app linkt erheen met `?lang=<taal van de app>`, in het venster "Voor ouders" achter het
ouderslot (Instellingen). Dit zijn ook de adressen voor Play Console en App Store Connect.
Ze werken sinds 18 oktober 2026 (`docs/studio-sedillo.md`).

## Volgorde voor Sudoku Kids

1. ~~DNS van de hoofdsite instellen en het domein aanzetten~~ (klaar, 18 oktober 2026).
2. De app op een toestel testen: de debug-APK uit de workflow `app-build.yml`, of zelf bouwen
   met Android Studio; de upload key maken (`docs/android.md`).
3. Play Console: app aanmaken, interne test, app-content invullen, gesloten test, productie
   (`docs/publiceren.md`).
4. iOS: Apple Developer-account (individu), TestFlight, App Store in de Kids-categorie (`docs/ios.md`).
5. Daarna de portals: eerst Poki aanschrijven met de twee vragen uit `docs/webportals.md`.

## Een andere app van Studio Sedillo

De vaste opzet voor alle apps staat in `Apps/CLAUDE.md`, sectie 11 ("App-structuur Studio
Sedillo"), en de template `studio-sedillo-app-template` is daarop ingericht. Sudoku Kids
bestond al en volgt dezelfde opzet met eigen namen:

| In de template | In Sudoku Kids |
|---|---|
| `tools/bouw.mjs` | `tools/build.mjs` (app, portals), `tools/build-android.sh` en `tools/build-ios.sh` |
| `platform/` | `platform.js` (web) en `platforms/` (app, crazygames, poki) |
| `docs/portals.md` | `docs/webportals.md` |
| `studiosedillo.com/<slug>/…` | `studiosedillo.com/sudoku-kids/…` (door Jenn zo vastgelegd) |
| opslagprefix `<slug>.` | `sudokuKids_` (bestaande sleutels veranderen nooit) |
