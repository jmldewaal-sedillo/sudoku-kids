# Android-app (TWA) bouwen en ondertekenen

*Opgesteld op 11 oktober 2026. Bronnen (geraadpleegd op die datum):
[Trusted Web Activity, snelstart][twa], [Play App Signing][signing],
[Android App Links verifiëren][applinks], [target-API-eisen][targetapi].*

De Android-app is een **Trusted Web Activity**: een dun Android-jasje dat
`https://sudokukids.studiosedillo.com/` schermvullend opent in de browser van de telefoon,
zonder adresbalk. De app bevat het spel dus niet zelf; een update van het spel gaat via de
website en heeft geen nieuwe Play-release nodig.

| | |
|---|---|
| Package name | `com.studiosedillo.sudokukids` (kan na de eerste upload nooit meer veranderen) |
| Startadres | `https://sudokukids.studiosedillo.com/` |
| Gereedschap | Bubblewrap (Google); PWABuilder gebruikt hetzelfde onder de motorkap |
| Instellingen | `twa/twa-manifest.json` in deze repo |

**Kan pas als** het subdomein live is: Bubblewrap leest het manifest van het echte adres.

## Twee sleutels: wat is wat

| | Upload key | App signing key |
|---|---|---|
| Wie heeft hem | **Jij** (bestand `android.keystore` + wachtwoord) | **Google** (Play App Signing) |
| Waarvoor | Bewijst aan Google dat een upload van jou komt | Ondertekent de app die spelers installeren |
| Kwijt? | Vervelend maar oplosbaar: in Play Console een reset aanvragen met een nieuwe sleutel | Kan niet kwijtraken; Google bewaart hem |
| Vingerafdruk nodig in `assetlinks.json` | Nee (alleen om een lokale build te testen) | **Ja** |

Nieuwe apps doen automatisch mee aan Play App Signing met een door Google gemaakte app
signing key. Laat dat zo.

## Wat jij zelf doet

1. **Maak de upload key** (stap 2 hieronder vraagt erom). Kies een lang wachtwoord dat je
   nergens anders gebruikt.
2. **Bewaar op twee plekken**, los van deze repo:
   - het bestand `android.keystore`;
   - het wachtwoord van de keystore, de alias (`upload`) en het wachtwoord van de sleutel.

   Goede plekken: een wachtwoordmanager die bijlagen kan bewaren (Bitwarden, 1Password,
   KeePassXC) én een versleutelde kopie buiten je laptop (usb-stick in huis of een
   versleutelde map in je cloud-opslag). **Nooit** in Git, e-mail of een chat. `.gitignore`
   in deze repo sluit `*.keystore`, `*.jks` en `twa/build/` al uit.
3. **Zet tweestapsverificatie aan** op het Google-account van Play Console.
4. Geef de sleutel of het wachtwoord niet aan Claude Code. De build-commando's draai je zelf;
   ze vragen het wachtwoord in de terminal.

## Bouwen

Eenmalig: Node 18 of nieuwer. Bubblewrap biedt bij de eerste keer aan om de JDK en de
Android-SDK zelf te downloaden; zeg ja.

```bash
mkdir -p twa/build && cd twa/build
cp ../twa-manifest.json .
npx @bubblewrap/cli update      # maakt het Android-project uit twa-manifest.json
npx @bubblewrap/cli build       # vraagt de wachtwoorden; maakt de sleutel als hij nog niet bestaat
```

Bestaat `android.keystore` nog niet, maak hem dan eerst aan:

```bash
keytool -genkeypair -v -keystore android.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Uitkomst: `app-release-bundle.aab` (voor Play Console) en `app-release-signed.apk` (om op je
eigen telefoon te proberen met `adb install`).

**Controleer vóór het uploaden:**

- `app/build.gradle`: `targetSdkVersion` is **36 of hoger** (eis sinds 31 augustus 2026). Is
  het lager, werk Bubblewrap bij (`npx @bubblewrap/cli@latest`) of pas het getal aan en bouw
  opnieuw.
- `app/src/main/AndroidManifest.xml`: geen permissie `com.google.android.gms.permission.AD_ID`
  en geen locatie- of meldingspermissie (Families-beleid). In `twa-manifest.json` staan
  meldingen en locatie daarom uit.
- De app start in vliegtuigmodus (nadat hij één keer met internet geopend is).

## De koppeling met de website (`assetlinks.json`)

Zonder geldige koppeling toont de app een adresbalk bovenin.

1. Upload de `.aab` naar **Interne test** in Play Console.
2. Ga naar **Testen en releasen → Instellen → App-integriteit → App-ondertekening** en
   kopieer de **SHA-256-vingerafdruk van het certificaat van de app-ondertekeningssleutel**.
3. Zet hem in `.well-known/assetlinks.json` in deze repo, in de lijst
   `sha256_cert_fingerprints` (hoofdletters, met dubbele punten). Wil je ook lokale builds
   zonder adresbalk testen, zet de vingerafdruk van je upload key er dan bij:
   `keytool -list -v -keystore android.keystore -alias upload`.
4. Verhoog `CACHE_VERSION` niet hiervoor (het bestand zit niet in de cache), push naar test
   en daarna live.
5. Controleer: `https://sudokukids.studiosedillo.com/.well-known/assetlinks.json` toont het
   bestand, rechtstreeks (zonder doorverwijzing) en als JSON. Installeer de app daarna
   opnieuw vanuit de interne test: geen adresbalk meer. Op Android 15 en nieuwer kan het tot
   een week duren voordat een wijziging in dit bestand op een bestaand toestel doorkomt.

Het bestand hoort bij het subdomein: `sudokukids.studiosedillo.com` heeft zijn eigen
`assetlinks.json`, de testversie ook, en de hoofdsite heeft er geen nodig.

## Een update uitbrengen

- **Alleen het spel verandert:** niets doen in Play Console. Spelers krijgen de nieuwe
  versie via de website (`CACHE_VERSION`).
- **De Android-schil verandert** (naam, icoon, startadres, nieuwe target-API-eis elk jaar in
  augustus): verhoog `appVersionCode` en `appVersionName` in `twa/twa-manifest.json`, bouw
  opnieuw met dezelfde upload key en upload de nieuwe `.aab`.

[twa]: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
[signing]: https://support.google.com/googleplay/android-developer/answer/9842756?hl=en
[applinks]: https://developer.android.com/training/app-links/verify-android-applinks
[targetapi]: https://support.google.com/googleplay/android-developer/answer/11926878?hl=en
