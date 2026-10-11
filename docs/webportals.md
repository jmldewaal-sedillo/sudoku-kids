# Webportals: CrazyGames en Poki

*Opgesteld op 11 oktober 2026. Alleen de eigen documentatie van de portals is gebruikt
(links onderaan, geraadpleegd op die datum). Waar die iets niet zegt, staat dat erbij.*

## Advies in het kort

**Geen van de twee is gemaakt voor een kinderspel zonder advertenties.** Beide verdienen aan
advertenties en delen die opbrengst met de maker.

- **CrazyGames past slecht.** Hun FAQ noemt als reden voor afwijzing letterlijk "Content is
  targeted for kids". Een spel dat "Kids" heet en zich op kinderen richt, loopt daar een
  reëel risico op afwijzing. Wel kan een spel er in de eerste fase (Basic Launch) zonder SDK
  en zonder advertenties staan.
- **Poki past inhoudelijk beter** (puzzels, jong publiek), maar Poki kiest zelf welke spellen
  erop komen, wil bij voorkeur vijf jaar web-exclusiviteit en verdient via advertenties in
  het spel. Of Poki een spel zonder advertenties toelaat en hoe Poki met advertenties voor
  kinderen omgaat, staat niet in hun documentatie.

**Mijn advies:** begin met de Android-app. Stuur Poki daarna het spel via hun formulier en
stel vooraf twee vragen: mag het zonder advertenties (of alleen met een vaste vergoeding), en
hoe gaan jullie om met advertenties bij een spel voor kinderen? Probeer CrazyGames alleen als
experiment, in Basic Launch zonder advertenties, en reken op een mogelijke afwijzing.
Advertenties toevoegen is een apart besluit van jou: dan veranderen de privacyverklaring, de
Data safety-antwoorden en de regel "geen advertenties" in de roadmap.

## De eisen naast elkaar

| | CrazyGames | Poki |
|---|---|---|
| Toelating | Zelf uploaden; eerst **Basic Launch**, daarna kiest CrazyGames welke spellen naar Full Launch gaan | Alleen op uitnodiging na aanmelding; vijf stappen (toevoegen, feedback van spelers, twee "fit tests", eindbeoordeling) |
| SDK | Basic Launch: optioneel. Full Launch: verplicht, met `gameplayStart`/`gameplayStop` | Verplicht: `init`, `gameLoadingFinished`, `gameplayStart`, `gameplayStop`; nooit twee keer dezelfde achter elkaar; `gameplayStart` pas na de eerste invoer van de speler |
| Advertenties | Niet verplicht. Basic Launch: uit ("monetization is disabled"). Full Launch: alleen advertenties via hun SDK | `commercialBreak()` en `rewardedBreak()` "as appropriate for your game"; geen andere advertentiesystemen. Hun verdienmodel is wel advertenties |
| Kinderspel | "Content is targeted for kids" staat bij de redenen voor afwijzing; inhoud moet binnen PEGI 12 blijven | Niet beschreven in de ontwikkelaarsdocumentatie |
| Bestandsgrootte | Eerste download ≤ 50 MB (≤ 20 MB voor de mobiele startpagina), totaal ≤ 250 MB, ≤ 1500 bestanden; alleen relatieve paden | Geen vast getal; spelers haken af na 10 seconden laden. Wij: 0,25 MB als zip |
| Externe links | Geen logo's van andere portals, geen externe advertenties, geen externe login | Geen uitgaande links en geen splash-schermen; een link moet via `PokiSDK.openExternalLink()` |
| Externe verzoeken | Niet beschreven | Poki blokkeert alle externe verzoeken; alles moet in het zip-bestand zitten |
| Opslag | Eigen opslag mag; de Data-module van de SDK is voor voortgang over toestellen heen (Full Launch) | localStorage mag; in een try/catch, het spel moet ook zonder werken (incognito) |
| Beeld | Liggend speelbaar op desktop; staand/liggend kies je bij het indienen | Desktop, mobiel en tablet; vult een 16:9-vlak |
| Exclusiviteit | Geen. "A complementary channel, not a conflicting one"; Google Play mag ernaast | Voorkeur: **web-exclusief, standaard 5 jaar** (alleen op Poki op het open web; Google Play en andere winkels blijven vrij). Anders: niet-exclusief |
| Omzetdeling | Deel van de advertentie-inkomsten; percentage staat in hun voorwaarden, niet in de documentatie. Uitbetaling per maand vanaf € 100 | Exclusief: deel van de inkomsten op spelers die Poki aanbrengt; percentages "indicatief", per contract. Niet-exclusief: eenmalige vaste licentievergoeding, geen omzetdeling |
| Privacy | Verzamelt het spel zelf persoonsgegevens, dan een melding met de privacyverklaring | Volgen, chat en eigen analytics alleen na goedkeuring |

**Wat web-exclusief bij Poki betekent voor ons:** geen CrazyGames ernaast en geen eigen
webversie op een subdomein, vijf jaar lang. De Android-app mag wel.

**Wat een portal betekent voor de privacy:** het spel draait dan op de website van de portal,
met hun SDK. Wat die website en SDK verzamelen, valt onder hun privacyverklaring. In onze
verklaring staat daarom al: "Speel je het spel op een spellenwebsite, dan geldt ook de
privacyverklaring van die website." Vóór publicatie op een portal: `docs/privacy-audit.md`
aanvullen met wat de SDK verstuurt.

## Het upload-bestand maken

```bash
node tools/build.mjs crazygames    # dist/sudoku-kids-crazygames.zip
node tools/build.mjs poki          # dist/sudoku-kids-poki.zip
node tools/build.mjs all           # ook de bestanden voor de Android-app
```

Elk zip-bestand bevat `index.html` in de root en 14 bestanden (ongeveer 0,25 MB). Verschil
met de webversie:

| | In de portal-versie |
|---|---|
| Service worker, manifest, testbalk | weggelaten |
| Links naar privacy en "gegevens verwijderen" | verborgen (geen links naar buiten) |
| SDK | de officiële SDK van de portal, geladen vanaf hun adres, vóór het spel |
| Aanroepen | CrazyGames: `init`, `loadingStart`, `loadingStop`, `gameplayStart`, `gameplayStop`. Poki: `init`, `gameLoadingFinished`, `gameplayStart`, `gameplayStop` |
| Advertenties | **geen enkele aanroep**: geen `requestAd`, banners, `commercialBreak` of `rewardedBreak` |
| Zonder SDK (geblokkeerd, lokaal) | het spel werkt gewoon |

De code per portal staat in `platforms/crazygames.js` en `platforms/poki.js`. `tools/build.mjs`
weigert te bouwen als daar een advertentie-aanroep in staat, en `python3 tests/builds.py`
speelt beide versies met een nagebootste SDK en controleert de volgorde van de aanroepen en
dat er geen advertentie wordt gevraagd.

## Testen bij de portal zelf (Jenn)

- **CrazyGames:** maak een ontwikkelaarsaccount, upload het zip-bestand als concept en bekijk
  de preview. Lokaal testen kan met `?useLocalSdk=true` achter het adres.
- **Poki:** upload het zip-bestand in de Poki Inspector (inspector.poki.dev); die laat de
  SDK-aanroepen zien.

Niet getest: de echte SDK's op de echte portals. De test hier gebruikt nagebootste SDK's.

## Bronnen

- CrazyGames: [eisen, overzicht][cg-req], [technische eisen][cg-tech], [advertenties][cg-ads], [FAQ][cg-faq], [SDK][cg-sdk]
- Poki: [eisen][poki-req], [soorten deals][poki-deals], [HTML5-SDK][poki-sdk]

**Wat ik niet uit de bronnen kon halen:** de percentages van de omzetdeling (bij beide per
contract), of Poki een spel zonder advertenties toelaat, hoe beide omgaan met advertenties
voor kinderen (COPPA, AVG), en of CrazyGames een kinderspel in de praktijk altijd afwijst.

[cg-req]: https://docs.crazygames.com/requirements/intro/
[cg-tech]: https://docs.crazygames.com/requirements/technical/
[cg-ads]: https://docs.crazygames.com/requirements/ads/
[cg-faq]: https://docs.crazygames.com/faq/
[cg-sdk]: https://docs.crazygames.com/sdk/intro/
[poki-req]: https://developers.poki.com/guide/requirements-quality
[poki-deals]: https://developers.poki.com/guide/revenue-deal-types
[poki-sdk]: https://developers.poki.com/guide/sdk-html5
