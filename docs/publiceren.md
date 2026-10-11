# Publiceren op Google Play – alle eisen voor Sudoku Kids

*Opgesteld op 11 oktober 2026 door Claude Code. Alle bronnen zijn op die datum geraadpleegd
(lijst onderaan). Dit is geen juridisch advies. Google past dit beleid regelmatig aan: lees
vlak voor het indienen de gelinkte pagina's nog een keer na.*

Uitgangspunten (besloten op 11 oktober 2026):

- **Geen advertenties.** Later eventueel een verwijzing naar eigen spellen van Studio Sedillo
  (zie eis 1d).
- **Persoonlijk Play Console-account**, dus de verplichte gesloten test geldt, tenzij het
  account van vóór 13 november 2023 is (zie eis 9).
- Uitgever: **Studio Sedillo**, contact **support@studiosedillo.com**.
- Adres van de app: **https://sudokukids.studiosedillo.com/**, package name
  **com.studiosedillo.sudokukids**.

Status-woorden in dit document: **klaar** (gebouwd en getest), **klaar op test** (gebouwd,
staat op de testlink, nog niet live), **open** (moet nog), **n.v.t.**

---

## Wat Jenn zelf moet doen (in deze volgorde)

| # | Wat | Waar | Waarom nu |
|---|---|---|---|
| 1 | De testversie nalopen (verwijderen, voortgang overzetten, spelregels, credits, privacy- en verwijderpagina) en akkoord geven | testlink | Niets gaat naar `main` zonder akkoord |
| 2 | DNS-records aanmaken (tabel in `docs/studio-sedillo.md`) | Namecheap → Advanced DNS | Zonder DNS geen subdomein, geen privacy-URL, geen TWA |
| 3 | E-mail doorsturen instellen: `support@studiosedillo.com` → je eigen adres, en testen met een mailtje | Namecheap → Email forwarding | Het adres staat in de app, de verklaring en straks de store |
| 4 | Domein verifiëren bij GitHub (TXT-record) | GitHub → Settings → Pages | Beschermt tegen domeinkaping |
| 5 | Claude Code laten draaien: `tools/eigen-domein.sh check`, daarna `site`, `test`, `live` | terminal | Zet de eigen domeinen en HTTPS aan (kan pas na stap 2) |
| 6 | In Play Console nakijken: accounttype en aanmaakdatum; ontwikkelaarsnaam op **Studio Sedillo** zetten; ontwikkelaars-e-mail op support@studiosedillo.com | Play Console → Instellingen → Ontwikkelaarsaccount | Bepaalt of de gesloten test geldt; bij een persoonlijk account toont Google ook je wettelijke naam en land |
| 7 | App aanmaken in Play Console: naam "Sudoku Kids & Crazy Grids", type Game, gratis | Play Console → App maken | Nodig voor de signing key |
| 8 | TWA bouwen met Bubblewrap en de **upload key** maken; wachtwoord en keystore veilig opbergen (zie `docs/twa.md`) | eigen pc | De key heb je bij elke update nodig |
| 9 | De `.aab` uploaden naar **Interne test**; daarna de SHA-256 van de **app signing key** kopiëren | Play Console → Testen en releasen → App-integriteit | Die vingerafdruk moet in `assetlinks.json` |
| 10 | De vingerafdruk aan Claude Code geven (of zelf in `.well-known/assetlinks.json` zetten) en live zetten | repo | Zonder dit toont de app een adresbalk |
| 11 | App-content invullen met de antwoorden uit dit document: privacybeleid-URL, advertenties (nee), app-toegang, doelgroep, Data safety, contentclassificatie (IARC) | Play Console → Beleid → App-content | Verplicht voor elke track behalve interne test |
| 12 | Store-pagina vullen met het materiaal uit `store/` | Play Console → Groei → Store-vermelding | |
| 13 | Gesloten test starten met **minstens 12 testers die 14 dagen aaneengesloten** aangemeld blijven | Play Console → Testen → Gesloten test | Verplicht voor productietoegang |
| 14 | Productietoegang aanvragen (vragenlijst over de test), daarna de productierelease | Play Console → Dashboard | Beoordeling duurt meestal tot 7 dagen |
| 15 | Privacyverklaring en vertalingen laten nakijken (staat al op de roadmap) | | Vóór productie |

---

## Checklist per eis

### 1. Families-beleid

Geldt zodra een kindergroep in de doelgroep zit. Bron: [Families-beleid][families].

| | Eis | Geldt voor ons? | Wat moet er gebeuren | Wie | Status |
|---|---|---|---|---|---|
| 1a | Inhoud geschikt voor kinderen | Ja | Niets: sudoku, geen geweld, geen chat, geen links naar buiten | – | klaar |
| 1b | **De app mag niet alleen een webview van een website zijn** | Ja, aandachtspunt | Sudoku Kids wordt een TWA (Trusted Web Activity): technisch geen WebView, de inhoud is ons eigen spel en werkt volledig offline. Het beleid noemt TWA's niet apart; een afwijzing op dit punt is niet uit te sluiten. Beperk het risico: `assetlinks.json` moet kloppen (geen adresbalk), de app moet offline starten, en geen link naar een website in het spel. Wordt het toch afgewezen, dan is het alternatief een native schil met de bestanden in de app zelf | Claude Code bouwt, Jenn dient in | open (risico) |
| 1c | Antwoorden in Play Console (doelgroep, Data safety, IARC) kloppen en blijven actueel | Ja | Invullen volgens dit document; bij elke wijziging aan de app opnieuw nalopen | Jenn | open |
| 1d | **Advertenties**: alleen Families Self-Certified Ads SDK's, geen gepersonaliseerde advertenties, strenge formaatregels | Nu niet | Geen advertenties, dus "Bevat advertenties: nee". **Let op voor later:** Google rekent ook kruispromotie van je eigen apps tot de advertentieregels ("cross-promotions (for your apps and third party apps)"). Een knop naar een ander spel van Studio Sedillo moet duidelijk te onderscheiden zijn van het spel zelf en hoort achter het ouderslot. Zoek bij invoering uit of de advertentieverklaring dan op "ja" moet | Claude Code, later | n.v.t. (taak op de roadmap) |
| 1e | Gegevens: geen advertentie-ID, IMEI, MAC, SSID e.d. versturen; geen locatie | Ja | Niets: de app verstuurt niets. De TWA mag de permissie `AD_ID` niet aanvragen (controleren in het gegenereerde `AndroidManifest.xml`) | Claude Code | open (bij de TWA-build) |
| 1f | API's en SDK's: alleen goedgekeurd voor kinderdiensten; geen Google-login in een app alleen voor kinderen | Ja | Niets: geen SDK's, geen login. "Account koppelen" is vervangen door "Voortgang overzetten" met een code | – | klaar op test |
| 1g | Sociale functies, AR | Nee | – | – | n.v.t. |
| 1h | Voldoen aan COPPA, AVG en andere wetten | Ja | Zie eis 11 | – | zie 11 |

### 2. Data safety-formulier

Verplicht voor elke app op een gesloten, open of productietrack, ook als er niets verzameld
wordt; alleen een interne test is vrijgesteld. "Verzamelen" betekent bij Google: gegevens
van het toestel af sturen. Wat alleen op het toestel wordt verwerkt hoeft niet opgegeven te
worden. Bron: [Data safety][datasafety]. Onderbouwing: `docs/privacy-audit.md`.

**In te vullen antwoorden:**

| Vraag | Antwoord | Toelichting |
|---|---|---|
| Verzamelt of deelt je app een van de vereiste soorten gebruikersgegevens? | **Nee** | Alles staat in localStorage op het toestel; de netwerktest ziet geen enkel verzoek naar een ander domein |
| Worden alle verzamelde gegevens versleuteld tijdens overdracht? | (vraag vervalt bij "nee") | De site gaat hoe dan ook alleen via HTTPS |
| Kunnen gebruikers vragen hun gegevens te laten verwijderen? | (vraag vervalt bij "nee") | Verwijderen kan in de app en staat uitgelegd op de webpagina |
| Kunnen gebruikers in je app een account aanmaken? | **Nee** | Een profiel met een dierenplaatje op het toestel is geen account: geen gebruikersnaam, e-mail of wachtwoord, en niets op een server |
| URL voor het verwijderen van gegevens | `https://sudokukids.studiosedillo.com/verwijderen` | Niet verplicht zonder accounts, wel invullen als het veld er is |
| Beveiligingspraktijken: "Committed to follow the Play Families Policy" | **Aanvinken** | Kan zodra de doelgroep kinderen bevat en de app aan het beleid voldoet |
| Onafhankelijke beveiligingscontrole (MASA) | Nee | Optioneel en betaald |
| Privacybeleid-URL | `https://sudokukids.studiosedillo.com/privacy` | Verplicht om het formulier te kunnen afronden |

Op de store-pagina komt dan te staan dat de app geen gegevens verzamelt en geen gegevens
deelt met derden.

Wie: Jenn vult in, Claude Code levert de antwoorden. Status: **open** (antwoorden klaar).
**Opnieuw invullen** zodra er ooit iets het toestel verlaat (cloud-opslag, statistieken,
advertenties).

### 3. Privacyverklaring

Bron: [User Data-beleid][userdata]. Ook apps die geen gegevens verzamelen moeten er een
hebben.

| Verplicht onderdeel | In `privacy.html` | Status |
|---|---|---|
| Duidelijk "privacyverklaring" in de titel | Titel "Privacyverklaring" / "Privacy policy" | klaar op test |
| De naam uit de store-vermelding (ontwikkelaar of app) | Studio Sedillo en "Sudoku Kids & Crazy Grids" | klaar op test |
| Gegevens van de ontwikkelaar en een contactpunt voor privacy | Onderdeel "Wie is verantwoordelijk", support@studiosedillo.com | klaar op test |
| Welke gegevens de app benadert, verzamelt, gebruikt en deelt | "Wat er wordt bewaard, en waar", "Wat de app niet doet", "Delen met anderen" | klaar op test |
| Hoe gegevens veilig worden verwerkt | "Delen met anderen": alleen HTTPS, niets verlaat het toestel | klaar op test |
| Bewaar- en verwijderbeleid | "Hoe lang gegevens bewaard blijven", "Hoe je gegevens verwijdert" | klaar op test |
| Op een actieve, openbare URL, niet per land afgeschermd, geen pdf, niet door bezoekers te bewerken | `https://sudokukids.studiosedillo.com/privacy` | open (wacht op DNS) |
| Link in Play Console én in de app zelf | Instellingen → "Privacy (voor ouders)"; Play Console doet Jenn | klaar op test / open |
| Rechten onder de AVG, kinderen en ouders, datum van wijziging | Eigen onderdelen | klaar op test |

In 5 talen (EN, NL, ES, PT, ID). Wie: Claude Code schrijft, **Jenn laat hem nakijken** (taak
op de roadmap). De link vanaf de hoofdsite staat op `studiosedillo.com/privacy`.

### 4. Gegevens en accounts kunnen verwijderen

Bron: [eisen voor accountverwijdering][deletion]. De harde eis (in de app én via een
weblink) geldt voor apps waarin gebruikers een account kunnen aanmaken. Sudoku Kids heeft
geen accounts, dus formeel **geldt de eis niet**. We voldoen er toch aan, zodat er bij de
beoordeling geen discussie kan ontstaan en zodat ouders het recht op verwijdering zelf
kunnen uitoefenen.

| Wat | Hoe | Wie | Status |
|---|---|---|---|
| In de app: één profiel verwijderen | Profiel → potlood → "Profiel verwijderen", dubbel ouderslot, bevestiging | Claude Code | klaar op test |
| In de app: alles verwijderen | Instellingen → "Alle gegevens van deze app verwijderen", dubbel ouderslot, bevestiging; wist alle sleutels, de cache en de service worker | Claude Code | klaar op test |
| Webpagina met uitleg, zonder dat je de app hoeft te openen, met de naam van de app en ontwikkelaar | `https://sudokukids.studiosedillo.com/verwijderen` (5 talen) | Claude Code | klaar op test, URL wacht op DNS |
| De link in Play Console invullen | Data safety → gegevens verwijderen | Jenn | open |

### 5. Leeftijdsclassificatie (IARC)

Bron: [contentclassificaties][iarc]. Verplicht; verkeerd invullen kan tot verwijdering
leiden. De vragenlijst staat onder Beleid → App-content.

**Conceptantwoorden:**

| Vraag | Antwoord |
|---|---|
| E-mailadres voor IARC | support@studiosedillo.com |
| Categorie | Game (spel) |
| Geweld, bloed, enge beelden | Nee |
| Seksualiteit of naaktheid | Nee |
| Grof taalgebruik, grove humor | Nee |
| Drugs, alcohol, tabak | Nee |
| Gokken of gesimuleerd gokken | Nee |
| Kunnen gebruikers met elkaar communiceren of inhoud uitwisselen? | Nee |
| Deelt de app de locatie van gebruikers met anderen? | Nee |
| Kunnen gebruikers digitale aankopen doen? | Nee |
| Deelt de app persoonlijke gegevens met derden? | Nee |
| Onbeperkte toegang tot internet (browser)? | Nee |

Verwachte uitkomst: PEGI 3, ESRB Everyone, USK 0, IARC 3+. De echte uitkomst zie je op de
samenvattingspagina vóór het indienen. Wie: Jenn. Status: **open**. Opnieuw doen als de
inhoud verandert (bijvoorbeeld bij advertenties of aankopen).

### 6. Verklaring over de doelgroep

Bron: [doelgroep en content][target]. Vooraf nodig: de advertentieverklaring, app-toegang
en de privacybeleid-URL.

| Onderdeel | Advies | Toelichting |
|---|---|---|
| Doelleeftijd | **6–8 en 9–12** | Alleen kinderen. "5 en jonger" niet aanvinken: Google verwacht dan dat de hele app voor kleuters geschikt is, en de 9×9-werelden zijn dat niet. 13+ niet aanvinken: dan wordt het een gemengde doelgroep met een neutrale leeftijdsvraag |
| Gevolg | Families-beleid geldt volledig | Geen Google-login, geen Play Games (zie `docs/account-koppelen.md`) |
| Advertenties | Nee | |
| Spreekt de store-vermelding kinderen aan? | Ja | Kawaii-dieren; dat past bij de gekozen doelgroep |
| App-toegang | "Alle functies zijn zonder speciale toegang beschikbaar" | Geen login. Zet er in de notities bij hoe het ouderslot werkt: knop twee keer 1,5 seconde ingedrukt houden |
| Store-aanwezigheid | Aanmelden voor Teacher Approved | Zie eis 10 |

Wie: Jenn kiest en vult in. Status: **open**. De beoordeling van de doelgroep kan tot 7
dagen duren.

### 7. Store-pagina

Bronnen: [previewmateriaal][assets], [metadatabeleid][metadata].

| Eis | Ons materiaal (`store/`) | Status |
|---|---|---|
| Titel hoogstens 30 tekens, geen emoji, geen hoofdletterwoorden, geen "gratis", "beste", "#1" | "Sudoku Kids & Crazy Grids" (25 tekens) | klaar |
| Korte beschrijving hoogstens 80 tekens | 10 talen, lengte gecontroleerd door `tests/store.py` | klaar |
| Volledige beschrijving hoogstens 4000 tekens, geen trefwoordlijsten, geen anonieme recensies | 10 talen | klaar (vertalingen laten nakijken) |
| Icoon 512×512, 32-bits PNG met alfa, hoogstens 1024 kB | `store/icon-512.png` | klaar |
| Feature graphic 1024×500, JPEG of 24-bits PNG zonder alfa, belangrijke dingen in het midden, geen prijs- of ranglijstclaims | `store/feature-graphic.png` | klaar |
| Telefoon: 2 tot 8 screenshots, JPEG of 24-bits PNG zonder alfa, 320–3840 px, lange zijde hoogstens 2× de korte; minstens 4 van 1080×1920 voor promotie (games: 3) | 6 stuks van 1080×1920 | klaar |
| Tablet (7 en 10 inch): 1080–7680 px, 16:9 of 9:16; Google raadt minstens 4 aan | 4 stuks (2 staand 1440×2560, 2 liggend 2560×1440) | klaar |
| Screenshots tonen de echte app, geen vingers of toestellen | Rechtstreeks uit de app gemaakt door `tests/store.py` | klaar |
| Ontwikkelaarsnaam | Studio Sedillo | open (Jenn, Play Console) |
| Contact: e-mail verplicht, website aanbevolen | support@studiosedillo.com, https://studiosedillo.com | open (Jenn) |
| Categorie en tags | Game → Puzzel; tag "Sudoku" | open (Jenn) |

**Let op bij een persoonlijk account:** Google toont op de store-pagina naast de
ontwikkelaarsnaam ook je **wettelijke naam, je land en het ontwikkelaars-e-mailadres**; je
volledige adres alleen als je geld gaat verdienen (betaalde apps of aankopen). Bron:
[accounttype kiezen][accounttype].

### 8. Target-API voor de TWA

Bron: [target-API-eisen][targetapi]. Sinds 31 augustus 2026 moeten nieuwe apps en updates
**Android 16 (API-niveau 36)** als target hebben.

| Wat | Wie | Status |
|---|---|---|
| Na `bubblewrap init` in `app/build.gradle` controleren dat `targetSdkVersion` 36 of hoger is (zo niet: Bubblewrap bijwerken of het getal aanpassen) | Claude Code / Jenn bij de build | open |
| Elk jaar opnieuw: Google verhoogt de eis elke augustus; dan een nieuwe build uploaden | Jenn | terugkerend (roadmap) |

De TWA bevat geen eigen native code, dus eisen aan native bibliotheken spelen niet.

### 9. Gesloten test voor nieuwe persoonlijke accounts

Bron: [testeisen voor nieuwe persoonlijke accounts][testing]. Geldt voor persoonlijke
accounts die **na 13 november 2023** zijn aangemaakt.

- Een gesloten test met **minstens 12 testers** die **14 dagen aaneengesloten** aangemeld
  zijn. Wie zich afmeldt en later weer aanmeldt, begint opnieuw te tellen.
- Daarna op het Dashboard "Productie aanvragen". Vragen: hoe je testers hebt gevonden, of
  ze alle functies gebruikt hebben, welke feedback je kreeg en wat je ermee gedaan hebt, de
  doelgroep, wat de app bijzonder maakt, en waarom hij klaar is voor productie.
- Beoordeling: meestal binnen 7 dagen.

| Wat | Wie | Status |
|---|---|---|
| Aanmaakdatum en type van het account nakijken (Instellingen → Ontwikkelaarsaccount; het type is alleen-lezen). Is het account van vóór 13 november 2023, dan vervalt deze eis | Jenn | open |
| 12 testers verzamelen met een Google-account (familie, vrienden, ouders van school) en hun e-mailadressen in een testerslijst zetten | Jenn | open |
| Feedback bijhouden in een lijstje (wie, wat, wat aangepast): dat vraagt Google daarna | Jenn, Claude Code verwerkt | open |

### 10. Teacher Approved

Bronnen: [programmapagina][teacher], [doelgroep en content][target].

Haalbaar: **ja, de app is een goede kandidaat, maar er is geen garantie en geen termijn.**
Apps die aan het Families-beleid voldoen komen in aanmerking; leraren en specialisten
beoordelen ontwerp, aantrekkelijkheid, leerwaarde, geschiktheid voor de leeftijd, en
advertenties, aankopen en kruispromotie als die er zijn. Je meldt je aan in het onderdeel
"Store-aanwezigheid" van Doelgroep en content.

Wat voor ons spreekt: geen advertenties, geen aankopen, geen gegevens, werkt offline,
oplopende moeilijkheid zonder gokken, geen straf bij fouten op 4×4, spelregels in plaatjes.
Wat tegen kan werken: vertalingen die nog niet door moedertaalsprekers zijn nagekeken, en
9×9 op een kleine telefoon.

Wie: Jenn meldt aan (eis 6). Status: **open**. Latere eigen kruispromotie weegt mee in deze
beoordeling.

### 11. AVG voor kinderen in de EU

Bronnen: [AVG][gdpr] (artikel 4, 8, 12 en 13), [Families-beleid][families] (eist dat je aan
de AVG voldoet). De Nederlandse leeftijdsgrens voor toestemming is 16 jaar (Uitvoeringswet
AVG, artikel 5).

| Punt | Geldt voor ons? | Toelichting | Status |
|---|---|---|---|
| Verwerkt Studio Sedillo persoonsgegevens van spelers? | Nee | Alles blijft op het toestel; Studio Sedillo kan er niet bij. Onderbouwd met de netwerktest | klaar |
| Toestemming van ouders (art. 8) | Nee | Artikel 8 gaat over verwerking op basis van toestemming. Er is geen verwerking door ons en geen toestemming nodig. Dat verandert bij cloud-opslag, statistieken of advertenties | n.v.t. |
| Begrijpelijke informatie, ook voor kinderen (art. 12) | Ja | Privacyverklaring in eenvoudige taal met een onderdeel "In het kort" | klaar op test |
| Hosting | Ja, beperkt | GitHub Pages levert de bestanden en kan daarbij als elke webserver het IP-adres vastleggen. Staat in de verklaring. Er zijn geen cookies en geen scripts van derden | klaar op test |
| E-mail aan support@ | Ja | Wie mailt, geeft zelf een e-mailadres. Alleen gebruiken om te antwoorden; niet langer bewaren dan nodig (advies: na afhandeling binnen een jaar weggooien). Staat in de verklaring | klaar op test; Jenn houdt zich eraan |
| Rechten van betrokkenen | Ja | Inzage, correctie, verwijdering en overdraagbaarheid kan de ouder zelf uitoefenen in de app (profiel bewerken, verwijderen, "Voortgang overzetten") | klaar op test |
| Register van verwerkingen, functionaris, DPIA | Nee | Niet verplicht bij deze omvang en zonder verwerking van gegevens van spelers. Bewaar dit document en `docs/privacy-audit.md` als onderbouwing | klaar |
| COPPA (VS) | Ja, zelfde uitkomst | Geen verzameling van persoonlijke informatie van kinderen, dus geen ouderlijke toestemming nodig | klaar |

---

## Bronnen (geraadpleegd op 11 oktober 2026)

- [Families-beleid][families] – Play Console Help
- [Data safety-formulier][datasafety] – Play Console Help
- [User Data-beleid, privacyverklaring][userdata] – Play Console Help
- [Eisen voor accountverwijdering][deletion] – Play Console Help
- [Contentclassificaties (IARC)][iarc] – Play Console Help
- [Doelgroep en content][target] – Play Console Help
- [Previewmateriaal voor de store-vermelding][assets] – Play Console Help
- [Metadatabeleid][metadata] – Play Console Help
- [Target-API-eisen][targetapi] – Play Console Help
- [Testeisen voor nieuwe persoonlijke accounts][testing] – Play Console Help
- [Accounttype kiezen][accounttype] – Play Console Help
- [Play App Signing][signing] – Play Console Help
- [Teacher Approved][teacher] – Google Play
- [Trusted Web Activity, snelstart][twa] – Chrome for Developers (Google)
- [Android App Links verifiëren][applinks] – Android Developers
- [AVG, Verordening (EU) 2016/679][gdpr] – EUR-Lex (geen Google-bron; uit eigen kennis van de
  wettekst, de pagina zelf is in deze sessie niet opgehaald)

[families]: https://support.google.com/googleplay/android-developer/answer/9893335?hl=en
[datasafety]: https://support.google.com/googleplay/android-developer/answer/10787469?hl=en
[userdata]: https://support.google.com/googleplay/android-developer/answer/10144311?hl=en
[deletion]: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
[iarc]: https://support.google.com/googleplay/android-developer/answer/9859655?hl=en
[target]: https://support.google.com/googleplay/android-developer/answer/9867159?hl=en
[assets]: https://support.google.com/googleplay/android-developer/answer/9866151?hl=en
[metadata]: https://support.google.com/googleplay/android-developer/answer/9898842?hl=en
[targetapi]: https://support.google.com/googleplay/android-developer/answer/11926878?hl=en
[testing]: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
[accounttype]: https://support.google.com/googleplay/android-developer/answer/13634885?hl=en
[signing]: https://support.google.com/googleplay/android-developer/answer/9842756?hl=en
[teacher]: https://google.play/business/programs/teacherapproved/
[twa]: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
[applinks]: https://developer.android.com/training/app-links/verify-android-applinks
[gdpr]: https://eur-lex.europa.eu/eli/reg/2016/679/oj

**Wat ik niet uit de bronnen kon halen:** de precieze vragen van de IARC-vragenlijst (de
Help-pagina noemt ze niet; de conceptantwoorden volgen de gebruikelijke onderwerpen), de
limieten van 30 en 4000 tekens voor titel en volledige beschrijving staan niet op de pagina
over previewmateriaal (30 staat in het metadatabeleid; 4000 is de limiet die Play Console
zelf in het invoerveld toont), en of een verwijzing naar eigen apps de advertentieverklaring
op "ja" zet.
