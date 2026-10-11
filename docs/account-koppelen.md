# Account koppelen – onderzoek en advies

*Opgesteld op 11 oktober 2026. Bronnen: alleen Google, Meta en de overheid (links onderaan en
in de tekst). Dit is geen juridisch advies; lees de gelinkte pagina's zelf na voordat je iets
aansluit, want Google past dit beleid regelmatig aan.*

## Waar het om gaat

De app werkt nu volledig zonder account: profielen en sterren staan alleen op het toestel
(`storage.js`, "lokale provider"). "Account koppelen" zou betekenen dat een **ouder** inlogt,
zodat de voortgang van een profiel ook op een ander toestel beschikbaar is en niet verloren
gaat bij een nieuwe telefoon. Zodra dat gebeurt verwerkt de app voor het eerst
persoonsgegevens buiten het toestel. Daar gaan de regels hieronder over.

## 1. Wat staat Google Play toe?

### Het hangt af van de doelgroep die je in de Play Console kiest

Bij *Doelgroep en content* kies je leeftijdsgroepen. Zit daar een kindergroep bij, dan geldt het
Families-beleid ([Manage target audience and app content settings][target]). Het beleid maakt
één groot onderscheid ([Google Play Families Policies][families]):

| | **Alleen kinderen** | **Kinderen én oudere gebruikers** ("mixed audience") |
|---|---|---|
| API's/SDK's die niet zijn goedgekeurd voor kinderdiensten | Verboden: *"Apps that solely target children must not contain any APIs or SDKs that are not approved"*; als voorbeeld noemt Google *"an API Service using OAuth technology for authentication and authorization"* | Mag, maar de app *"must not require users to access app content through an API or SDK that is not approved for use in child-directed services"* |
| Inloggen met Google | **Niet toegestaan** (zie hieronder) | Toegestaan als **optionele** functie |
| Neutrale leeftijdsvraag | Niet van toepassing (iedereen wordt als kind behandeld) | Nodig als je onderdelen hebt die niet voor kinderen bedoeld zijn |

### Inloggen met Google en Play Games Services

De regel staat in de [Google API Services User Data Policy][apipolicy], onder "Child-directed
apps":

- Voor een app die op kinderen gericht is: *"it should not use Google Sign-In or any other
  Google API Service that accesses data associated with a Google Account."*
- Voor een app met een gemengde doelgroep: *"users must be able to access the application in
  its entirety without signing into a Google Account."* Google Sign-In en Google Play Games
  Services mogen daar als optionele functie.

Dus: **kies je "alleen kinderen", dan mag je geen Google-login en geen Play Games Services
inbouwen.** Kies je "kinderen en oudere gebruikers", dan mag het, mits de hele app ook zonder
inloggen werkt. Dat is bij Sudoku Kids al zo.

### Neutrale leeftijdsvraag

Google omschrijft die als een manier om de leeftijd te vragen zonder het antwoord te sturen,
bijvoorbeeld door de geboortedatum vrij te laten invullen; een vooraf ingevulde leeftijd of de
mededeling "je moet 13 zijn" is fout ([Manage target audience][target],
[Families Policies][families]). Voor een gemengde doelgroep geldt
([Data practices in Families apps][datapractices]): API's of SDK's die niet voor kinderdiensten
zijn goedgekeurd mogen alleen als ze *"behind a neutral age screen"* zitten of zo zijn gebouwd
dat ze geen gegevens van kinderen verzamelen.

Het ouderslot dat nu in de app zit (knop 3 seconden ingedrukt houden) is **geen** neutrale
leeftijdsvraag. Het houdt kleine kinderen tegen, maar vraagt geen leeftijd. Voor een
Google-login zou er dus een echte leeftijdsvraag (vrij in te vullen geboortejaar) vóór moeten.

### Gegevens van kinderen

Het Families-beleid eist dat je het verzamelen van persoonlijke en gevoelige gegevens van
kinderen meldt; *"authentication information"* telt daarbij als gevoelig. Apparaat-ID's zoals
de advertentie-ID mogen niet worden verstuurd ([Families Policies][families]). Alles wat je
verzamelt moet ook kloppen met het Data safety-formulier en de privacyverklaring.

### Inloggen met Facebook

- Meta's [Platform Terms][metaterms] noemen kinderen niet apart, maar verplichten je
  (artikel 11.b) om te voldoen aan alle wetgeving, waarbij COPPA met naam wordt genoemd.
- Een Facebook-account mag je pas vanaf 13 jaar hebben
  ([Meta-helpcentrum: minimumleeftijd][metaage]).
- Facebook Login is een OAuth-dienst van een derde partij. In een app die **alleen op
  kinderen** gericht is valt het onder het verbod op niet-goedgekeurde API's/SDK's uit het
  Families-beleid. In een gemengde app mag het alleen optioneel en achter een neutrale
  leeftijdsvraag.

Mijn conclusie: Facebook-login voegt voor deze app niets toe dat Google-login niet ook biedt,
en brengt een tweede partij met eigen dataverzameling in een kinderapp. **Niet doen.**

## 2. Wat vraagt de AVG bij kinderen?

- **Toestemming van een ouder onder de 16.** De Autoriteit Persoonsgegevens: verwerk je online
  gegevens van kinderen, bijvoorbeeld via een app of online game, dan mag dat bij kinderen onder
  de 16 alleen met toestemming van de ouders of verzorgers; toestemming van het kind zelf is
  niet geldig ([AP: gegevens van kinderen][ap-kinderen]). Dit volgt uit artikel 8 AVG; Nederland
  heeft de grens niet verlaagd ([Uitvoeringswet AVG, artikel 5][uavg]).
- **Je moet controleren dat het echt de ouder is.** Je bent verplicht een redelijke inspanning
  te leveren om te controleren dat de toestemming van een ouder komt; wat redelijk is hangt af
  van het risico en de beschikbare techniek ([AP][ap-kinderen]).
- **Toestemming moet uitdrukkelijk, aantoonbaar en even makkelijk in te trekken zijn** (geen
  vooraf aangevinkte vakjes; intrekken mag niet moeilijker zijn dan geven) ([AP: grondslag
  toestemming][ap-toestemming]).
- **Zo weinig mogelijk gegevens.** Praktisch: als de **ouder** het account heeft en het kind
  alleen een bijnaam en sterren, dan verwerk je vooral gegevens van de ouder (e-mailadres) en
  nauwelijks van het kind. Dat is de eenvoudigste route.
- **Zolang alles op het toestel blijft** (de situatie nu) ontvang jij als maker geen
  persoonsgegevens. Dat is de reden dat de privacyverklaring nu zo kort kan zijn.

## 3. De opties

| | A. Niets koppelen (nu) | B. Export/import-code | C. Firebase Auth + Firestore | D. Google Play Games Services |
|---|---|---|---|---|
| Wat het is | Alles lokaal | Ouder zet voortgang over met een code of bestand, zonder server | Ouder logt in; voortgang in de cloud | Spelersaccount van Google met "saved games" |
| Mag bij "alleen kinderen"? | Ja | Ja | Alleen met e-mail/wachtwoord of anoniem; **geen Google-login** | **Nee** |
| Mag bij gemengde doelgroep? | Ja | Ja | Ja, optioneel en achter leeftijdsvraag | Ja, optioneel |
| Werkt in PWA/TWA? | Ja | Ja | Ja (web-SDK) | Geen web-API gevonden in de officiële documentatie; de v2-SDK is voor Android-apps. De v1-API's verdwijnen: verwijdering vanaf juni 2026, stop in mei 2027 ([deprecation][pgs-dep]). Een TWA kan niet bij de inhoud van de web-app ([TWA-overzicht][twa]). |
| Kosten | € 0 | € 0 | Gratis tot 50.000 actieve gebruikers per maand; Firestore gratis tot 1 GiB, 50.000 leesacties en 20.000 schrijfacties per dag ([Firebase-prijzen][fb-pricing]) | € 0 |
| Privacy-impact | Geen | Geen (geen server) | E-mailadres, wachtwoord, IP-adres; *"The Firebase Authentication service is run only from US data centers"*; jij bent verwerkingsverantwoordelijke, Google verwerker ([Privacy and Security in Firebase][fb-privacy]) | Google-account van het kind of de ouder |
| Extra verplichtingen | Geen | Geen | Ouderlijke toestemming, privacyverklaring uitbreiden, Data safety aanpassen, verwerkersovereenkomst accepteren, verwijderverzoeken afhandelen, externe bibliotheek in de app | Zoals C, plus doelgroep moet gemengd zijn |
| Werk | – | ± 1 dag | ± 1–2 weken, plus beleid | Niet haalbaar voor een PWA |

Let op bij C: de Firebase-bibliotheek is nu een "externe CDN/framework" volgens de vaste regels
in ROADMAP.md. Je zou hem als los bestand in de app moeten zetten (geen CDN), en de regel
"geen externe verzoeken" moet dan een uitzondering krijgen voor het inlogdeel.

## 4. Wat je zelf zou moeten aanmaken (alleen bij optie C)

1. Een Firebase-project (console.firebase.google.com), met een web-app-registratie.
2. Authentication aanzetten met alleen "E-mail/wachtwoord" (of e-mail-link).
3. Firestore aanmaken in een **EU-regio**, met beveiligingsregels zodat een ouder alleen bij
   de eigen gegevens kan.
4. In de Google Cloud-console: de API-sleutel beperken tot jouw domein.
5. De gegevensverwerkingsvoorwaarden van Firebase accepteren.
6. In de Play Console: Data safety bijwerken (e-mailadres, doel "accountbeheer"),
   privacyverklaring uitbreiden, en een manier bieden om het account te laten verwijderen.
7. Voor Google- of Facebook-login zou je daarnaast een OAuth-client (Google Cloud) en een
   Meta-app (developers.facebook.com) moeten registreren. Dat raad ik af.

## 5. Advies

1. **Kies in de Play Console de doelgroep "alleen kinderen" en bouw geen login.** Dat is de
   eenvoudigste en veiligste route door het Families-beleid, en de app heeft het niet nodig.
2. **Geen Google-login, geen Facebook-login, geen Play Games Services.** Bij "alleen kinderen"
   mag het niet; bij een gemengde doelgroep haal je een leeftijdsvraag, ouderlijke toestemming
   en een flink stuk beleid in huis voor weinig winst.
3. **Wil je toch voortgang overzetten: begin met optie B (export/import-code achter het
   ouderslot).** Geen server, geen persoonsgegevens, geen beleidswijziging. Dit past direct op
   de opslaglaag in `storage.js`.
4. **Pas als ouders er echt om vragen: optie C met alleen e-mail/wachtwoord voor de ouder**,
   Firestore in de EU, en alleen bijnaam + sterren van het kind in de cloud.
5. De knop "Account koppelen (voor ouders)" blijft tot die tijd "Binnenkort beschikbaar"
   tonen. Kies je voor B, dan kan de knop "Voortgang overzetten" gaan heten.

### Stappenplan

- [ ] Beslissen: A (niets), B (overzet-code) of C (ouder-account).
- [ ] Bij B: export/import bouwen als extra functie op `SudokuStorage`; testen dat een
      geïmporteerd profiel niets overschrijft.
- [ ] Bij C: eerst privacyverklaring, toestemmingstekst en Data safety uitschrijven; dan het
      Firebase-project aanmaken (punt 4); dan een cloud-provider schrijven met dezelfde
      methoden als de lokale provider (`readIndex`, `writeIndex`, `read`, `write`, `remove`,
      plus `linkAccount`); lokale gegevens blijven de bron en worden op de achtergrond
      gesynchroniseerd, zodat de app offline blijft werken en een gastprofiel bij koppelen
      niets verliest.
- [ ] In alle gevallen: de keuze vastleggen in ROADMAP.md en de privacyverklaring bijwerken
      vóór de functie live gaat.

## Hoe de app erop voorbereid is

- `storage.js` is de enige plek die weet waar gegevens staan. Het spel roept alleen
  `SudokuStorage.read/write/remove` en de profielfuncties aan.
- Een provider is een object met vijf methoden. `SudokuStorage.setProvider(...)` wisselt hem;
  `tests/e2e.py` (onderdeel 13) plugt een andere provider in en controleert dat het spel
  daarmee gewoon doorwerkt.
- Elk profiel heeft een veld `account` (nu altijd leeg). Koppelen vult dat veld; de
  voortgang van het gastprofiel blijft staan onder dezelfde sleutels.
- `SudokuStorage.canLinkAccount()` is pas waar als een provider `linkAccount` heeft. Tot dan
  toont de knop "Binnenkort beschikbaar".

## Bronnen

- [Google Play Families Policies][families] – Play Console Help
- [Manage target audience and app content settings][target] – Play Console Help
- [Data practices in Families apps][datapractices] – Play Console Help
- [Google API Services User Data Policy][apipolicy] – onderdeel "Child-directed apps"
- [Firebase pricing][fb-pricing] en [Privacy and Security in Firebase][fb-privacy]
- [Play Games Services – deprecation schedule][pgs-dep] en [Overview of Trusted Web Activities][twa] – Android Developers
- [Meta Platform Terms][metaterms] en [Meta-helpcentrum over de minimumleeftijd][metaage]
- [Autoriteit Persoonsgegevens – Mag ik onder de AVG gegevens van kinderen verwerken?][ap-kinderen]
- [Autoriteit Persoonsgegevens – grondslag toestemming][ap-toestemming]
- [Uitvoeringswet AVG, artikel 5][uavg] – wetten.overheid.nl (controleer de actuele versie)

[families]: https://support.google.com/googleplay/android-developer/answer/9893335?hl=en
[target]: https://support.google.com/googleplay/android-developer/answer/9867159?hl=en
[datapractices]: https://support.google.com/googleplay/android-developer/answer/11043825
[apipolicy]: https://developers.google.com/terms/api-services-user-data-policy
[fb-pricing]: https://firebase.google.com/pricing
[fb-privacy]: https://firebase.google.com/support/privacy
[pgs-dep]: https://developer.android.com/games/pgs/deprecation
[twa]: https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities
[metaterms]: https://developers.facebook.com/terms/
[metaage]: https://www.facebook.com/help/157793540954833
[ap-kinderen]: https://autoriteitpersoonsgegevens.nl/nl/nieuws/mag-ik-onder-de-avg-gegevens-van-kinderen-verwerken
[ap-toestemming]: https://www.autoriteitpersoonsgegevens.nl/en/themes/basic-gdpr/gdpr-basics/legal-basis-of-consent
[uavg]: https://wetten.overheid.nl/BWBR0040940/2021-07-01#Hoofdstuk1_Paragraaf1.2_Artikel5
