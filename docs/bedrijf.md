# Bedrijfsgegevens, adres en Google Play-account

*Opgesteld op 11 oktober 2026. Alle bronnen zijn op die datum geraadpleegd; de links staan
onderaan. Dit is geen juridisch advies: waar de bronnen iets niet zeggen, staat dat erbij.*

Studio Sedillo is een **eenmanszaak**, KvK-nummer **42122276**, Nederland. Handelsnamen:
Studio Sedillo en Clever Creatures Club. Contact: studio.sedillo@gmail.com.

**Vast besluit van Jenn:** naam en land mogen publiek zijn, ook in Google Play. Het adres
niet (het vestigingsadres is het huisadres) en het vestigingsnummer ook niet. Die staan
daarom nergens in deze repo, op de site, in de app of in `store/`.

---

## Wat Jenn zelf moet doen (in deze volgorde)

| # | Wat | Waar | Waarom |
|---|---|---|---|
| 1 | Je straatnaam en postcode in de blocklist zetten en de hooks aanzetten (zie "Adres-vangnet" hieronder) | `~/.studio-sedillo/blocklist.txt` | Dan houdt git elke commit met je adres tegen |
| 2 | Claude Code vragen de geschiedenis van alle repo's na te lopen met de ingevulde lijst | terminal | Eenmalige controle of het adres ooit ergens in is gekomen |
| 3 | Opzoeken wat er nu van jou openbaar is: zoek "Studio Sedillo" of 42122276 in het Handelsregister | kvk.nl → Zoeken | **Het bezoekadres van een eenmanszaak is openbaar zolang het niet is afgeschermd.** Wie het KvK-nummer ziet, kan het adres nu opzoeken |
| 4 | Een postadres regelen dat niet je huisadres is (postbus of zakelijk postadres) | aanbieder naar keuze | Voorwaarde voor afschermen |
| 5 | In Mijn KVK het postadres vastleggen en "bezoekadres afschermen" aanzetten | Mijn KVK | Daarna staat het huisadres niet meer in het openbare register en hoeft het ook niet op de website |
| 6 | Het geheim `PRIVATE_BLOCKLIST` aanmaken in de twee repo's | terminal, zie hieronder | Dan controleert GitHub Actions ook online |
| 7 | Je btw-id opzoeken en doorgeven (vorm `NL` + 9 cijfers + `B` + 2 cijfers) | brief van de Belastingdienst of Mijn Belastingdienst Zakelijk | Komt in de footer zodra het bekend is |
| 8 | In Play Console nakijken: accounttype **persoonlijk**, geen betaalde apps of aankopen, ontwikkelaars-e-mail studio.sedillo@gmail.com; bekijk hoe je ontwikkelaarspagina er voor anderen uitziet | Play Console → Instellingen → Ontwikkelaarsaccount | Bevestigt dat alleen naam, land en e-mail getoond worden |
| 9 | Beslissen of er een telefoonnummer bij moet | — | Ondernemersplein en ACM noemen ook een telefoonnummer; zie 1a |
| 10 | Testers verzamelen voor de gesloten test (12 personen, 14 dagen) | — | Geldt voor een persoonlijk account van na 13 november 2023 |
| 11 | Vóór een app met advertenties of aankopen (zoals The Flush Factor): eerst stap 4 en 5 klaar hebben | — | Google toont dan je volledige adres en de wet vraagt het dan zonder twijfel |

---

## 1a. Welke gegevens zijn verplicht op de website en in de app?

| Gegeven | Verplicht? | Bron | Bij ons |
|---|---|---|---|
| Naam en handelsnaam | Ja | [Ondernemersplein][corr], [ACM][acm] | Studio Sedillo (eenmanszaak) |
| KVK-nummer | Ja, op de website | [Ondernemersplein][corr]: "Als u diensten levert of verkoopt via internet, moet u ook uw KVK-nummer en btw-identificatienummer (btw-id) vermelden." | KvK 42122276 in de footer, de privacyverklaring en de credits |
| Bezoekadres | Ja, **behalve als je het in het Handelsregister laat afschermen** | [Ondernemersplein][corr]: "adresgegevens (bezoekadres), behalve als u uw bezoekadres in het Handelsregister laat afschermen" | Niet vermeld (besluit van Jenn); zie het risico hieronder |
| E-mailadres | Ja | [Ondernemersplein][corr], [ACM][acm], [art. 3:15d BW][bw] | studio.sedillo@gmail.com |
| Telefoonnummer | Genoemd door Ondernemersplein en ACM; art. 3:15d BW vraagt "gegevens die snel contact mogelijk maken, waaronder het e-mailadres" | [Ondernemersplein][corr], [ACM][acm], [art. 3:15d BW][bw] | Niet vermeld; beslissing aan Jenn (stap 9) |
| Btw-id | Ja, als je diensten levert of verkoopt via internet en btw-plichtig bent | [Ondernemersplein][corr], [art. 3:15d BW][bw] | Nog niet bekend; komt in de footer (taak op de roadmap) |

De ACM raadt aan de gegevens op elke pagina te zetten, bijvoorbeeld in de footer. Dat is
gedaan op de hoofdsite en op de privacy- en verwijderpagina van Sudoku Kids.

**Geldt dit ook voor een gratis spel zonder verkoop?** De wet (art. 3:15d BW) gaat over een
"dienst van de informatiemaatschappij": een dienst die "gewoonlijk tegen vergoeding" op
afstand wordt geleverd. De pagina van de ACM staat onder "Verkoop aan consumenten". Een
gratis spel zonder advertenties, aankopen of accounts valt daar volgens mijn lezing niet
duidelijk onder; de bronnen zeggen het niet letterlijk. Het KvK-nummer staat er hoe dan ook.

**Risico als het adres ontbreekt** (mijn inschatting, niet uit de bronnen):
- Nu, met alleen een gratis spel: klein. Er is geen koper die een adres nodig heeft om zijn
  recht te halen, en ik vond bij de geraadpleegde bronnen geen boetes voor dit geval.
- Zodra er advertenties, aankopen of betaalde apps komen: dan is het zonder twijfel een
  dienst tegen vergoeding en is het adres verplicht, tenzij het is afgeschermd.
- De nette oplossing is afschermen bij de KVK (1b). Dan is weglaten van het adres volgens
  Ondernemersplein uitdrukkelijk toegestaan.

**Belangrijker dan de website:** het KvK-nummer staat nu online. Zolang het bezoekadres niet
is afgeschermd, kan iedereen het huisadres opzoeken in het Handelsregister, met of zonder
dat nummer (zoeken op "Studio Sedillo" werkt ook). Het vangnet in de repo's verandert
daar niets aan; alleen afschermen bij de KVK doet dat.

## 1b. Het huisadres niet tonen: de opties

| Optie | Wat het doet | Voorwaarden | Kosten |
|---|---|---|---|
| **Bezoekadres afschermen bij de KVK** | Het adres staat niet meer in het openbare Handelsregister en niet meer op een uittreksel | Voor een eenmanszaak "kan dat altijd". Je moet een **postadres** vastleggen dat openbaar is en niet gelijk is aan je bezoek- of woonadres | De KVK-pagina noemt geen kosten |
| **Postbus of zakelijk postadres** | Levert het postadres dat voor afschermen nodig is | Post moet er echt aankomen (ook de pincode-brief van AdMob, zie 1c) | Niet uit officiële bronnen. Ruwe schatting, zelf na te gaan: een postbus of zakelijk postadres kost ongeveer € 10 tot € 30 per maand |
| **Vestiging verplaatsen naar een kantoor of virtueel kantoor** | Het bezoekadres zelf wordt een zakelijk adres | Of de KVK een virtueel kantoor als bezoekadres accepteert en welk bewijs daarvoor nodig is, heb ik niet in de bronnen gevonden: navragen bij de KVK | Niet uit officiële bronnen; duurder dan alleen een postadres |

Wat je bij de KVK aanpast (optie 1 met 2): in **Mijn KVK** het postadres toevoegen en
"bezoekadres afschermen" aanzetten. Bron: [KVK, afschermen van je bezoekadres][kvk-afschermen]
(bijgewerkt op 15 april 2026).

Goed om te weten, uit dezelfde bron:
- Het adres "blijft wel in de historie van je bedrijf of organisatie te zien".
- Overheidsorganisaties, advocaten, notarissen en deurwaarders kunnen het nog opvragen.
- Banken en verzekeraars kunnen om extra bewijs vragen.
- De Belastingdienst krijgt het postadres door (ook voor de btw-controle VIES).
- Het woonadres van de eigenaar zelf is al sinds 1 januari 2022 afgeschermd
  ([Rijksoverheid][rijk-woonadres]); dit gaat over het bezoekadres van de vestiging.

**Let op bij de roadmap-taak "zakelijk postadres … als vestigingsadres registreren":** uit
de bronnen volgt dat je het als *postadres* vastlegt en het bezoekadres afschermt. Of
Google het postadres accepteert als wettelijk adres van een betalingsprofiel, staat niet in
de Play Console Help; nakijken vóór de eerste app met inkomsten.

## 1c. Google Play: wat is publiek?

| Account | Publiek zichtbaar | Bron |
|---|---|---|
| Persoonlijk, zonder inkomsten | Je **wettelijke naam**, je **land** en het **ontwikkelaars-e-mailadres** (naast de ontwikkelaarsnaam "Studio Sedillo") | [Vereiste gegevens][play-required] |
| Persoonlijk, met betaalde apps of aankopen | Ook je **volledige adres**: "If you decide to monetize on Google Play then Google will display your full address." | [Vereiste gegevens][play-required], [Accountgegevens beheren][play-manage] |
| Organisatie | Wettelijke naam, **wettelijk adres**, ontwikkelaars-e-mailadres en **telefoonnummer**, altijd | [Vereiste gegevens][play-required] |

Kanttekeningen:
- De wettelijke naam bij een persoonlijk account is je eigen naam, niet "Studio Sedillo".
- De bron zegt dat in sommige regio's ook een telefoonnummer of volledig adres getoond kan
  worden; welke regio's staat er niet bij. Daarom stap 8: bekijk je eigen ontwikkelaarspagina.
- **Advertenties:** de Help noemt als "monetize" alleen betaalde apps en aankopen in de app.
  Advertenties via AdMob lopen niet via Google Play. Of advertenties alleen het adres
  zichtbaar maken, staat er niet letterlijk. Ga er voor de zekerheid van uit dat het adres
  geregeld moet zijn vóór de eerste app met advertenties (wettelijk is het dan ook nodig).

**Omzetten van persoonlijk naar organisatie:** kan binnen hetzelfde account. Je maakt een
nieuw betalingsprofiel van het type organisatie (met D-U-N-S-nummer), verifieert het en
koppelt het. Andersom (organisatie naar persoonlijk) kan niet. Een persoonlijk account dat
al geld verdient, kan niet rechtstreeks omgezet worden: dan is een nieuw account nodig en
verhuizen de apps daarheen. Bron: [Accountgegevens actueel houden][play-update].

**Organisatie-account voor een eenmanszaak:**
- Nodig: een **D-U-N-S-nummer** (gratis aan te vragen bij Dun & Bradstreet, kan tot 30 dagen
  duren), een website van de organisatie, en naam en adres die gelijk zijn aan het profiel
  bij Dun & Bradstreet. Bron: [Accounttype kiezen][play-type], [Vereiste gegevens][play-required].
- Of Dun & Bradstreet een eenmanszaak een nummer geeft en met welk adres, staat niet in de
  Play Console Help; dat is bij Dun & Bradstreet na te vragen.
- Kosten van het account zelf: niet nagekeken (je account bestaat al).
- Gevolg: het adres uit het D-U-N-S-profiel wordt **altijd** getoond. Zonder zakelijk adres
  is een organisatie-account dus slechter voor je privacy dan een persoonlijk account.

**Gesloten test met 12 testers:** de eis geldt voor "personal developer accounts created
after November 13, 2023". Organisatie-accounts worden niet genoemd en vallen er dus niet
onder. Of de eis vervalt als je een persoonlijk account omzet, staat er niet. Bron:
[Testeisen][play-testing].

**AdMob:** dat is een apart account met een eigen betalingsprofiel, los van het accounttype
in Play Console. Het type (individueel of organisatie) kies je één keer en kun je daarna
niet meer wijzigen. Zodra de inkomsten een drempel halen, stuurt Google een **pincode per
post** naar het adres van het betalingsprofiel; zonder verificatie binnen vier maanden
stoppen de advertenties. Er moet dus een adres zijn waar post aankomt. Bron: AdMob Help
(van Google, maar geen Play Console Help): [adresverificatie][admob-pin],
[betalingsgegevens][admob-pay].

## 1d. Het plan: bevestigd, met drie kanttekeningen

**Plan:** persoonlijk account houden, Sudoku Kids gratis en zonder advertenties of aankopen,
zodat alleen naam en land zichtbaar zijn.

**Klopt.** Volgens de Play Console Help toont Google bij een persoonlijk account zonder
betaalde apps of aankopen alleen de wettelijke naam, het land en het ontwikkelaars-e-mailadres.

Kanttekeningen:
1. "Naam" is je eigen wettelijke naam, naast de ontwikkelaarsnaam Studio Sedillo.
2. De gesloten test (12 testers, 14 dagen) blijft gelden als het account van na
   13 november 2023 is.
3. Het huisadres is op dit moment wel te vinden via het Handelsregister. Dat los je op bij
   de KVK (1b), niet in Google Play.

Een organisatie-account is pas zinvol als er een zakelijk adres is: het toont altijd een
adres en een telefoonnummer.

---

## Adres-vangnet

Het vangnet voorkomt dat het huisadres in een repo of online komt, zonder dat het adres
zelf in een repo staat.

**1. De lijst invullen.** Open `~/.studio-sedillo/blocklist.txt` in een teksteditor
(bijvoorbeeld `nano ~/.studio-sedillo/blocklist.txt`) en zet op aparte regels je
straatnaam (zonder huisnummer is genoeg) en je postcode. Hoofdletters en spaties maken niet
uit: `1234 AB` vindt ook `1234ab`. Haal de voorbeeldregel weg of laat hem staan; hij telt
niet mee. Het bestand staat buiten alle repo's en is alleen voor jou leesbaar.

**2. De hooks aanzetten** (één keer per kopie van een repo; hier al gedaan):

```bash
cd ~/Documents/Projecten/Apps/sudoku-kids/sudoku && tools/install-hooks.sh
cd ~/Documents/Projecten/Apps/studio-sedillo && tools/install-hooks.sh
```

Daarna weigert git elke commit waarin een patroon uit de lijst voorkomt: in de inhoud, in
een bestandsnaam of in het commitbericht. De melding noemt het bestand en de regel, nooit
het patroon zelf.

**3. Zelf controleren:**

```bash
python3 tests/no-private-data.py             # zelftest + alle bestanden van de repo
python3 tests/no-private-data.py --online    # ook de pagina's die nu online staan
python3 tools/no-private-data.py --history   # de hele git-geschiedenis, alle branches
```

**4. Het geheim voor GitHub Actions** (na stap 1; het geheim is daarna voor niemand meer
leesbaar, ook niet voor jou):

```bash
for r in sudoku-kids studio-sedillo studio-sedillo-app-template the-flush-factor; do
  gh secret set PRIVATE_BLOCKLIST -R jmldewaal-sedillo/$r < ~/.studio-sedillo/blocklist.txt
done
```

Zonder geheim slaat de controle in GitHub Actions zich over met een waarschuwing. Verander
je de lijst later, draai dit dan opnieuw. Een nieuwe app krijgt het geheim vanzelf van
`Apps/tools/nieuwe-app.sh`.

**Grenzen van het vangnet:**
- Het vindt alleen wat in de lijst staat. Een andere schrijfwijze van je straat vindt het niet.
- De hooks zitten in `.git` en gaan niet mee met een clone: op een andere computer opnieuw
  `tools/install-hooks.sh` draaien.
- De hoofdsite wordt rechtstreeks vanaf `main` gepubliceerd. De controle in GitHub Actions
  meldt een fout daar dus achteraf; de hook houdt het vooraf tegen.
- Afbeeldingen (een foto van een brief, een schermafbeelding) worden niet gelezen.

---

## Bronnen (geraadpleegd op 11 oktober 2026)

- [Regels voor bedrijfscorrespondentie][corr] – Ondernemersplein (KVK en Rijksoverheid)
- [Bedrijfsgegevens vermelden][acm] – ACM
- [Burgerlijk Wetboek Boek 3, artikel 15d][bw] – wetten.overheid.nl
- [Wanneer je het bezoekadres kan weghalen uit het Handelsregister][kvk-afschermen] – KVK
- [Woonadressen afgeschermd in Handelsregister per 1 januari 2022][rijk-woonadres] – Rijksoverheid
- [Required information to create a Play Console developer account][play-required] – Play Console Help
- [Choose a developer account type][play-type] – Play Console Help
- [View and manage your developer account information][play-manage] – Play Console Help
- [Keeping your developer account information up to date][play-update] – Play Console Help
- [App testing requirements for new personal developer accounts][play-testing] – Play Console Help
- [Address verification (PIN) overview][admob-pin] en [Enter your payment details][admob-pay] – AdMob Help

**Wat ik niet uit de bronnen kon halen:** boetes voor het weglaten van het adres bij een
gratis dienst; wat een postbus of zakelijk postadres precies kost; of een virtueel kantoor
als bezoekadres mag; of Dun & Bradstreet een eenmanszaak een D-U-N-S-nummer geeft; in welke
regio's Google bij een persoonlijk account meer toont; en of advertenties alleen al het
adres zichtbaar maken in Google Play.

[corr]: https://ondernemersplein.overheid.nl/regels-voor-bedrijfscorrespondentie/
[acm]: https://www.acm.nl/nl/verkoop-aan-consumenten/consumenten-informeren/bedrijfsgegevens-vermelden
[bw]: https://wetten.overheid.nl/jci1.3:c:BWBR0005291&boek=3&titeldeel=1&afdeling=1A&artikel=15d
[kvk-afschermen]: https://www.kvk.nl/over-het-handelsregister/afschermen-van-je-bezoekadres-wat-is-mogelijk/
[rijk-woonadres]: https://www.rijksoverheid.nl/actueel/nieuws/2021/10/01/woonadressen-afgeschermd-in-handelsregister-per-1-januari-2022
[play-required]: https://support.google.com/googleplay/android-developer/answer/13628312?hl=en
[play-type]: https://support.google.com/googleplay/android-developer/answer/13634885?hl=en
[play-manage]: https://support.google.com/googleplay/android-developer/answer/13634081?hl=en
[play-update]: https://support.google.com/googleplay/android-developer/answer/13634888?hl=en
[play-testing]: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
[admob-pin]: https://support.google.com/admob/answer/2772302?hl=en
[admob-pay]: https://support.google.com/admob/answer/12835021?hl=en
