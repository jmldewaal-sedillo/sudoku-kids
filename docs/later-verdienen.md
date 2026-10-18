# Later misschien geld verdienen: wat mag in een kinder-app?

*Opgesteld op 18 oktober 2026. Niets hiervan is gebouwd en niets wordt gebouwd zonder een
uitdrukkelijk besluit van Jenn. Bronnen onderaan, op die datum geraadpleegd; vlak voor het
bouwen opnieuw lezen. Geen juridisch advies.*

Ideeën van Jenn (18 oktober 2026): **goedkope skins** voor de echte fans, en later misschien
**reclame voor eigen spellen** (ook andere kinderspellen). **Geen AdMob** in deze app.

## Wat al vastligt (blijft gelden)

- Geen advertenties van derden, geen tracking, geen analytics, geen inloggen (`Apps/CLAUDE.md`,
  sectie 5 en 11).
- Alles wat de app verlaat of geld kost, staat **achter het ouderslot** (`askParent`).
  Zo zitten de privacy- en verwijderlink er nu al (venster "Voor ouders").

## 1. Skins kopen (in-app-aankopen)

| | Google Play (Families-beleid) | Apple (Kids-categorie) |
|---|---|---|
| Mag het? | Ja, maar niet als "een duidelijk onderscheid tussen spelmunten en echt geld" ontbreekt, en niet met "shocking or emotionally manipulative tactics" | Ja, mits "reserved for a designated area behind a parental gate" (guideline 1.3) |
| Betalen | Verplicht via Google Play Billing (een Capacitor-plug-in) | Verplicht via Apple In-App Purchase (dezelfde plug-in kan beide) |
| Gevolg voor het account | Google toont bij betaalde apps of aankopen het volledige adres; bij het organisatieaccount staat dat er al | Paid Apps-overeenkomst en bankgegevens in App Store Connect; DSA-trader: adres publiek in de EU |

**Hoe het eruit zou zien in Sudoku Kids:**
- Een winkel met skins (thema's voor de vakjes, mascotte-pakjes) **alleen achter het ouderslot**,
  met de prijs in euro's, zonder munten of edelstenen ertussen.
- Geen aftellende timers, geen "nog maar 2 over", geen mascotte die zegt dat ze verdrietig is
  zonder skin, geen pop-ups tijdens het spelen.
- Alles wat er nu is, blijft gratis. Een skin verandert alleen het uiterlijk, nooit de puzzels
  of de moeilijkheid.
- Aankopen worden lokaal bewaard (geen account); "Voortgang overzetten" en "Aankopen
  herstellen" (verplicht bij Apple) moeten dan meegroeien.

**Eerst bijwerken vóór het bouwen:** privacyverklaring (aankopen lopen via Google/Apple), Data
safety (Google: "Purchase history" als die wordt bewaard), App Privacy (Apple),
`docs/privacy-audit.md`, de store-teksten ("Bevat in-app-aankopen") en het antwoord bij
Teacher Approved.

## 2. Reclame voor eigen spellen ("meer spellen")

Google rekent dit tot advertenties: het Families-beleid gaat ook over "cross-promotions (for
your apps and third party apps)", en "Buttons, ads, or other monetization that promote your
other Google Play store listings" mogen niet lijken op de inhoud van het spel.

**Zo zou het kunnen:**
- Een vaste knop "Meer spellen van Studio Sedillo" in het venster **Voor ouders** (dus achter het
  ouderslot), met een gewone lijst en de link naar de store-pagina. Geen pop-ups, geen
  beloningen voor klikken, niets midden in het spel.
- Geen SDK, geen verzoek naar buiten om te zien welke spellen er zijn: de lijst zit in de app
  en wordt bij een update bijgewerkt.
- In Play Console bij "Advertenties" eerlijk antwoorden. Of een eigen lijst achter het ouderslot
  telt als "bevat advertenties", **vóór het bouwen nakijken** in de Help van Play Console.

Advertenties van derden (ook andere kinderspellen die niet van Studio Sedillo zijn) zouden een
Families-gecertificeerde advertentie-SDK vragen ("Only use Google Play Families Self-Certified
Ads SDKs"), en bij Apple menselijke controle van elke advertentie. Dat past niet bij deze app;
advies: niet doen.

## Bronnen

- [Google Play Families-beleid](https://support.google.com/googleplay/android-developer/answer/9893335) – Play Console Help
- [App Review Guidelines, 1.3 Kids Category en 5.1.4 Kids](https://developer.apple.com/app-store/review/guidelines/) – Apple
