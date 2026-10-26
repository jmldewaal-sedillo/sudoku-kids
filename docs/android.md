# Android-app (Capacitor) bouwen en ondertekenen

*Opgesteld op 11 oktober 2026. Bronnen (geraadpleegd op die datum) staan onderaan.*

De Android-app is een **Capacitor-app**: een Android-project (`app/android/`) met de
bestanden van het spel **ín de app**. Er is geen website nodig om te spelen en de app werkt
vanaf de eerste start zonder internet.

| | |
|---|---|
| Package name | `com.studiosedillo.sudokukids` (kan na de eerste upload nooit meer veranderen) |
| Capacitor | 8 (`app/package.json`); target-API 36, minimaal Android 7 (API 24) |
| Webbestanden | `node tools/build.mjs app` → `dist/app/` (zonder service worker) |
| Plug-ins | `@capacitor/app` (terugknop), `@capacitor/preferences` (tweede kopie van de opslag) |
| Permissies | alleen `INTERNET` (nodig voor de WebView); geen reclame-id, locatie of meldingen |
| Back-up naar Google | uit (`allowBackup="false"`): de privacyverklaring zegt dat niets het toestel verlaat |

## TWA of Capacitor: de vergelijking

| | TWA (Bubblewrap) | Capacitor |
|---|---|---|
| Waar staat het spel | Op een website; de app opent die schermvullend in Chrome | In de app zelf |
| Offline | Pas na één keer openen met internet (service worker) | Altijd, ook de eerste keer |
| Website nodig | Ja, een eigen (sub)domein met `assetlinks.json`, blijvend online | Nee |
| Beleid voor kinderapps | Risico: het Families-beleid zegt dat een app niet alleen een webview van een website mag zijn; een TWA is dat in feite wel | Geen website erachter; de app is op zichzelf compleet |
| Target-API | Via een nieuwe Bubblewrap-build | Vast per Capacitor-versie: Capacitor 8 = API 36. Elk jaar: Capacitor bijwerken (`npm install @capacitor/…@latest`, `npx cap sync`) en opnieuw uploaden |
| Updates van het spel | Via de website, zonder nieuwe release | Elke wijziging is een nieuwe upload naar Google Play (met beoordeling) |
| Grootte | Ongeveer 1 MB | Paar MB (WebView-schil + 0,6 MB spelbestanden); precies bekend na de eerste build |
| Onderhoud | Website, DNS, certificaat, `assetlinks.json` en de schil | Het Android-project en Capacitor bijwerken; Android Studio nodig |
| Opslag van voortgang | In Chrome, bij het adres van de website | In de WebView van de app; daarom een tweede kopie in de native opslag |

**Advies: Capacitor.** Het past bij het besluit om geen app-websites live te zetten, het haalt
het grootste beleidsrisico voor een kinderapp weg en de app werkt altijd offline. De prijs is
dat elke wijziging aan het spel een nieuwe release in Google Play is. De oude TWA-opzet
(`twa/`, `assetlinks.json`) is daarom uit de repo gehaald.

## Eenmalig klaarzetten (Jenn)

1. Installeer **Android Studio** (2025.2.1 of nieuwer; Capacitor 8 vraagt dat). Het levert
   de Android-SDK en de goede JDK mee. Open het één keer en laat de SDK installeren
   (SDK Platform **API 36** en de Build-Tools); daarbij ga je zelf akkoord met de licenties.
2. Controleer dat de SDK in `~/Android/Sdk` staat (de standaardplek). Staat hij ergens anders,
   zet dan `ANDROID_HOME` op die map.
3. Proefbuild: `tools/build-android.sh`. Uitkomst: een debug-APK in
   `app/android/app/build/outputs/apk/debug/`.

Het script zoekt de JDK van Android Studio zelf. De JDK van het systeem (25) is nieuwer dan
Gradle verwacht; gebruik die niet.

## Twee sleutels: wat is wat

| | Upload key | App signing key |
|---|---|---|
| Wie heeft hem | **Jij** (een keystore-bestand + wachtwoorden) | **Google** (Play App Signing) |
| Waarvoor | Bewijst aan Google dat een upload van jou komt | Ondertekent de app die spelers installeren |
| Kwijt? | Oplosbaar: in Play Console een reset aanvragen met een nieuwe sleutel | Kan niet kwijtraken; Google bewaart hem |

Nieuwe apps doen automatisch mee aan Play App Signing met een door Google gemaakte app
signing key. Laat dat zo. Een `assetlinks.json` is bij Capacitor niet nodig.

## De upload key (Jenn, één keer)

Geef de sleutel of de wachtwoorden niet aan Claude Code en zet ze nooit in Git.

**Makkelijkste weg (geen Android Studio nodig):** draai in een eigen terminal

```bash
tools/upload-key-naar-github.sh --dry-run   # eerst kijken
tools/upload-key-naar-github.sh
```

Het script vraagt één wachtwoord (minstens 12 tekens, nergens anders gebruikt), maakt
`~/.studio-sedillo/sudokukids-upload.keystore` (alias `upload`, alleen "Studio Sedillo" en
"NL" in het certificaat) en zet de key en het wachtwoord als geheim in de repo
`jmldewaal-sedillo/sudoku-kids`. De workflow **App release** (`.github/workflows/app-release.yml`)
bouwt daarmee de ondertekende `.aab`: Actions → "App release" → Run workflow, branch `main`
(of vanzelf bij een tag `v*`). De `.aab` staat onder Artifacts als `sudoku-kids-aab`.
Zonder de geheimen bouwt dezelfde workflow een niet-ondertekende `.aab`, alleen als controle.

**Zelf bouwen met Android Studio** kan ook. Maak de key dan met de hand:

```bash
mkdir -p ~/.studio-sedillo
keytool -genkeypair -v -keystore ~/.studio-sedillo/sudokukids-upload.keystore \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Kies een lang wachtwoord dat je nergens anders gebruikt. Maak daarna het bestand
`app/android/keystore.properties` (staat in `.gitignore`):

```properties
storeFile=/home/JOUW-GEBRUIKERSNAAM/.studio-sedillo/sudokukids-upload.keystore
storePassword=…
keyAlias=upload
keyPassword=…
```

**Bewaar op twee plekken**, los van deze laptop: het keystore-bestand en de wachtwoorden.
Bijvoorbeeld een wachtwoordmanager die bijlagen kan bewaren, plus een versleutelde kopie op
een usb-stick. Zet tweestapsverificatie aan op het Google-account van Play Console.

## Bouwen

```bash
tools/build-android.sh            # debug-APK, om te proberen
tools/build-android.sh release    # ondertekende .aab voor Google Play
tools/build-android.sh release-unsigned   # zelfde .aab zonder handtekening (alleen controle)
```

Wat het script doet: `node tools/build.mjs app` (spelbestanden naar `dist/app/`, met
`platforms/app.js` als `platform.js`), `npx cap sync android` (bestanden en plug-ins naar
het Android-project) en daarna Gradle. De `.aab` staat in
`app/android/app/build/outputs/bundle/release/app-release.aab`.

**Zonder Android Studio:** bij elke push naar `test` bouwt GitHub de debug-APK
(`.github/workflows/app-build.yml`). Download hem op github.com → repo `sudoku-kids` → Actions →
"App bouwen (Android en iOS)" → de laatste run → onder Artifacts `sudoku-kids-android-debug`
(een zip met `app-debug.apk`). Zet de APK op je telefoon en open hem; Android vraagt dan één
keer of je apps uit deze bron wilt toestaan. Een debug-APK is alleen om te proberen: voor
Google Play is een ondertekende `.aab` nodig (hieronder).

Op je toestel proberen: zet "USB-foutopsporing" aan, sluit het toestel aan en draai
`adb install -r app/android/app/build/outputs/apk/debug/app-debug.apk`. Of open het
project in Android Studio (`cd app && npx cap open android`) en start een emulator.

## Een update uitbrengen

1. Wijzig het spel, tests groen, akkoord op de testlink.
2. Verhoog in `app/android/app/build.gradle` de `versionCode` met 1 (en zo nodig
   `versionName`).
3. Mergen naar `main`, taggen (`vX.Y`) en pushen: de workflow **App release** bouwt de
   ondertekende `.aab` (of `tools/build-android.sh release`). Uploaden in Play Console.

Elk jaar vóór 31 augustus: nakijken welke target-API Google eist, Capacitor bijwerken naar
de versie die daarbij hoort en opnieuw uploaden.

## Wat er in de app anders is dan in de browser

| Onderdeel | Hoe het in de app werkt |
|---|---|
| Service worker | Uit. Alle bestanden zitten in de app |
| Opslag | Dezelfde `sudokuKids_`-sleutels in localStorage van de WebView. Capacitor raadt aan daar niet alleen op te vertrouwen, dus elke wijziging gaat ook naar de native opslag (Preferences). Is de WebView-opslag ooit leeg terwijl die kopie bestaat, dan zet de app hem terug |
| Terugknop van Android | Eén stap terug in het spel (venster dicht, puzzel → levels → werelden). Op het startscherm en de wereldkaart gaat de app naar de achtergrond |
| Voortgang overzetten | Code maken, kopiëren, plakken en een bestand kiezen werken. "Bewaar als bestand" is verborgen: een WebView downloadt niet |
| Privacy en gegevens verwijderen | Links in Instellingen openen `studiosedillo.com/sudoku-kids/…` in de browser van het toestel, in de taal van de app |
| Back-up | Geen back-up naar Google en geen overdracht naar een nieuw toestel; ouders gebruiken "Voortgang overzetten" |

## Getest, en wat jij op je toestel moet testen

**Automatisch getest** (`python3 tests/builds.py`, in een browser met een nagebootste
Capacitor-brug): geen service worker, links naar de hoofdsite, de terugknop op elk scherm,
de tweede kopie van de opslag en het terugzetten ervan, geluid, het ouderslot, een code maken
en lezen, alles wissen, geen verzoeken naar buiten, en de instellingen van het
Android-project (package, target-API, permissies, geen sleutels in Git).

**Niet getest: de echte app op Android.** Op deze computer staat geen Android-SDK; die
installeer je zelf (licenties). De app is dus nog niet gebouwd en niet in een emulator
gestart. Loop dit na op je eigen toestel, na `tools/build-android.sh`:

1. **Start:** roze startscherm met het icoon, daarna het spel; geen adresbalk, geen witte flits.
2. **Offline:** zet vliegtuigmodus aan vóór de allereerste start. Het spel werkt.
3. **Opslag:** speel twee levels, sluit de app helemaal af (wegvegen), open opnieuw: sterren
   staan er nog. Herstart ook het toestel een keer.
4. **Geluid:** muziek en effecten spelen; muziek stopt als de app naar de achtergrond gaat en
   gaat verder als je terugkomt. De volumeknoppen werken.
5. **Terugknop:** in een puzzel → levels → werelden; op de wereldkaart gaat de app naar de
   achtergrond (niet afsluiten met verlies van een puzzel). Met een venster open: het venster sluit.
6. **Ouderslot:** "Profiel verwijderen" en "Alle gegevens verwijderen" vragen twee keer
   ingedrukt houden; na alles wissen start de app schoon en blijft schoon na opnieuw openen.
7. **Voortgang overzetten:** code maken en kopiëren, in een ander profiel of op een ander
   toestel plakken en importeren; een bewaard bestand kiezen via "Bestand".
8. **Links:** "Privacy (voor ouders)" en "Gegevens verwijderen (uitleg)" openen de browser
   op studiosedillo.com (werkt pas als de DNS van de hoofdsite staat).
9. **Draaien en tablet:** het spel past staand en liggend; test ook een tablet of de emulator.
10. **Grootte:** noteer de grootte van de `.aab` en van de geïnstalleerde app.

Werkt de terugknop of de tweede kopie niet zoals beschreven, meld het: dat zijn de twee
plekken waar de app de Capacitor-brug gebruikt (`platforms/app.js`).

## Bronnen

- [Capacitor: environment setup][cap-env] – Node 22+, Android Studio 2025.2.1+, API 24 of hoger
- [Capacitor: setting the target SDK][cap-target] – Capacitor 8 = target-SDK 36, vast per versie
- [Capacitor: App-plug-in][cap-app] – `backButton`, `minimizeApp`
- [Capacitor: storage][cap-storage] – localStorage geldt als tijdelijk; advies: Preferences
- [Capacitor: Android configureren][cap-config] – package, naam, permissies
- [Play App Signing][signing] en [target-API-eisen][targetapi] – Play Console Help
- [Families-beleid][families] – Play Console Help

[cap-env]: https://capacitorjs.com/docs/getting-started/environment-setup
[cap-target]: https://capacitorjs.com/docs/android/setting-target-sdk
[cap-app]: https://capacitorjs.com/docs/apis/app
[cap-storage]: https://capacitorjs.com/docs/guides/storage
[cap-config]: https://capacitorjs.com/docs/android/configuration
[signing]: https://support.google.com/googleplay/android-developer/answer/9842756?hl=en
[targetapi]: https://support.google.com/googleplay/android-developer/answer/11926878?hl=en
[families]: https://support.google.com/googleplay/android-developer/answer/9893335?hl=en
