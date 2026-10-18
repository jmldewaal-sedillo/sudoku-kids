# iOS-app (Capacitor) bouwen en in de App Store zetten

*Opgesteld op 18 oktober 2026. Het account zelf (individu, kosten, DSA) staat in
`Apps/docs/apple-developer.md`; dit document gaat over deze app.*

De iOS-app is **dezelfde Capacitor-app** als de Android-app: `app/` heeft een map `android/`
en een map `ios/`, en beide krijgen dezelfde spelbestanden uit `dist/app/`
(`node tools/build.mjs app`, met `platforms/app.js`). Er is geen aparte iOS-code.

| | |
|---|---|
| Bundle-ID | `com.studiosedillo.sudokukids` (zelfde als Android; kan na de eerste upload niet meer veranderen) |
| Naam op het beginscherm | Sudoku Kids |
| Capacitor | 8 (`app/package.json`), Swift Package Manager (geen CocoaPods); minimaal iOS 15; iPhone en iPad |
| Plug-ins | `@capacitor/app`, `@capacitor/preferences` (tweede kopie van de opslag, ook op iOS nuttig: iOS kan de opslag van een WebView opruimen) |
| Toestemmingen | geen (geen camera, microfoon, locatie, foto's of tracking); `tests/builds.py` bewaakt dat |
| Versleuteling | `ITSAppUsesNonExemptEncryption = false` in `Info.plist`: App Store Connect stelt de exportvraag dan niet bij elke build |
| Icoon en startscherm | `tools/app-icons.sh` (1024×1024 zonder doorzichtigheid; roze startscherm met het icoon) |
| Terugknop | iOS heeft er geen; terug gaat met de knoppen in het spel |

## Bouwen zonder Mac

Xcode draait alleen op macOS. Daarom bouwt de workflow `.github/workflows/app-build.yml` bij
elke push naar `test` de app op een Mac van GitHub, start hem in de iOS-simulator en bewaart
een schermafbeelding (Actions → "App bouwen (Android en iOS)" → artifact
`sudoku-kids-ios-simulator`). Dat bewijst dat het project bouwt en de app start. Gratis, omdat
de repo openbaar is.

Op deze computer kan alleen het Xcode-project worden bijgewerkt:

```bash
tools/build-ios.sh              # webbestanden + npx cap sync ios
tools/build-ios.sh simulator    # alleen op een Mac: bouwen voor de simulator
```

## Naar TestFlight en de App Store (nog te doen)

Ondertekenen kan pas met het Apple Developer-account (`Apps/docs/apple-developer.md`, stap 3–4).
Daarna, in deze volgorde:

| # | Wat | Wie |
|---|---|---|
| 1 | In App Store Connect een app aanmaken: bundle-ID `com.studiosedillo.sudokukids`, naam "Sudoku Kids & Crazy Grids", taal Engels | Jenn |
| 2 | Een **App Store Connect API-sleutel** maken (Users and Access → Integrations, rol App Manager) en de drie gegevens (Issuer ID, Key ID, het `.p8`-bestand) als geheimen in GitHub zetten. Nooit in de repo | Jenn |
| 3 | De workflow uitbreiden met een stap die ondertekent (automatisch, met die sleutel) en de build naar **TestFlight** uploadt | Claude Code |
| 4 | De app via TestFlight op een iPhone of iPad testen: dezelfde lijst als `docs/android.md`, zonder de terugknop | Jenn |
| 5 | App Store-pagina: teksten uit `store/listing.json`, screenshots 6,9" iPhone en 13" iPad (formaten maken we dan), privacy-URL `https://studiosedillo.com/sudoku-kids/privacy` | samen |
| 6 | **App Privacy**: "Data Not Collected" (er gaat niets van het toestel af) | Jenn, antwoorden hieronder |
| 7 | **Leeftijd**: Kids-categorie, leeftijdsband 6–8 (of 9–11); leeftijdsvragenlijst: alles "nee" | Jenn |
| 8 | DSA-traderstatus kiezen (`Apps/docs/apple-developer.md`) | Jenn |
| 9 | Indienen ter beoordeling | Jenn |

## Kids-categorie: wat Apple eist en hoe het hier zit

Bron: [App Review Guidelines, 1.3 en 5.1.4][guidelines] (geraadpleegd op 18 oktober 2026).

| Eis | Hier |
|---|---|
| "must not include links out of the app, purchasing opportunities, or other distractions to kids unless reserved for a designated area behind a parental gate" | Privacy- en verwijderlink staan in het venster **Voor ouders** achter het ouderslot (twee keer 1,5 s ingedrukt houden). `tests/e2e.py` controleert dat er geen enkele link naar buiten buiten dat venster staat. Aankopen: geen |
| Geen gegevens of toestelinformatie naar derden; geen analytics of advertenties van derden | Geen enkel verzoek naar buiten (`tests/e2e.py`, netwerktest) |
| Privacyverklaring verplicht | `https://studiosedillo.com/sudoku-kids/privacy` |
| Blijft gelden bij latere updates, ook als je de categorie later uitzet | Regel in `CLAUDE.md` van deze app |

**Antwoorden App Privacy:** Data Not Collected. Tracking: nee. Profielnamen, sterren en
instellingen blijven op het toestel (`docs/privacy-audit.md`); Apple telt alleen gegevens die
het toestel verlaten.

**Nog na te kijken bij de eerste echte build:** of App Store Connect een melding geeft over
een *privacy manifest*. Capacitor en de twee plug-ins hebben er zelf een; de app gebruikt
verder geen iOS-functies die een eigen manifest vragen.

## Een update uitbrengen

1. Wijzig het spel, tests groen, akkoord op de testlink.
2. In Xcode (of `project.pbxproj`): `CURRENT_PROJECT_VERSION` met 1 omhoog, en
   `MARKETING_VERSION` gelijk aan de `versionName` van Android.
3. Build naar TestFlight, testen, indienen.

[guidelines]: https://developer.apple.com/app-store/review/guidelines/
