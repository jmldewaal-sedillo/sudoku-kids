# Privacy-audit – wat de app verstuurt en bewaart

*Uitgevoerd op 11 oktober 2026 op branch `publish-prep` (cache `sudoku-kids-v8`, opnieuw gemeten na de wijzigingen van v8). Opnieuw
uit te voeren met `python3 tests/e2e.py`; onderdeel 31 doet de meting en schrijft de ruwe
uitkomst naar `tests/out/privacy-audit.json`.*

Dit document onderbouwt de antwoorden in het Data safety-formulier en de privacyverklaring
(`docs/publiceren.md`, eis 2, 3 en 11).

## Conclusie

- De app doet **geen enkel verzoek naar een ander domein** dan het adres waar hij zelf staat.
- Alle verzoeken zijn het ophalen (GET) van de eigen bestanden. Er wordt niets verzonden.
- Alles wat de app onthoudt staat in **localStorage** op het toestel, onder sleutels die met
  `sudokuKids_` beginnen. Geen cookies, geen sessionStorage, geen IndexedDB.
- De app vraagt geen toestemmingen (camera, microfoon, locatie, meldingen).

## Netwerktest

**Hoe gemeten:** een echte browser (headless Chromium via Playwright) speelt een hele ronde
en elk verzoek van de pagina wordt vastgelegd: start, wereld, de spelregels bij het eerste
level, een hint, een level uitspelen, meldingen, de profielpagina met badges, werelden en
geschiedenis, voortgang exporteren, credits, en daarna de privacypagina, de verwijderpagina
en opnieuw de startpagina.

**Uitkomst (run van 11 oktober 2026):**

| | |
|---|---|
| Aantal verzoeken | 30 |
| Verschillende domeinen | 1: het eigen adres (in de test `127.0.0.1`) |
| Verzoeken naar een ander domein | **0** |
| Andere methoden dan GET (POST, PUT, …) | 0 |
| Opgevraagde bestanden | `/`, `badges.js`, `i18n.js`, `icons.js`, `level-plan.js`, `delete.html`, `privacy.html`, `puzzle-bank.js`, `puzzles.js`, `script.js`, `storage.js`, `style.css`, `verwijderen.html` (verwijst door naar `delete.html`) |
| Cookies / sessionStorage / IndexedDB | geen / leeg / geen |
| Toestemmingen verleend | geen |
| Cache van de service worker | 1 cache (`sudoku-kids-v8`) met 18 eigen bestanden, voor offline spelen |

De iconen, het manifest en de service worker zelf haalt de browser buiten de pagina om op;
ook die komen van het eigen adres (de lijst staat in `sw.js`, `ASSETS`).

**Andere controles in dezelfde test:**

- De code voor "Voortgang overzetten" staat bij de verhuizing alleen achter het `#` in de
  link en komt in geen enkel verzoek naar de server voor (onderdeel 29).
- In de broncode staan geen adressen van andere domeinen die geladen worden: geen CDN,
  lettertypen, statistieken of advertenties. De enige externe adressen in de app zijn tekst
  (het mailadres), twee links in de privacyverklaring (naar de privacyverklaringen van GitHub
  en Google; die worden pas geopend als iemand erop tikt) en, zodra ingesteld, het nieuwe eigen
  adres in de verhuismelding.
- Offline: na één keer laden werkt de app zonder netwerk (onderdeel 10).

**Wat buiten de app valt:** de webserver. GitHub Pages levert de bestanden en kan daarbij,
zoals elke webserver, het IP-adres van de bezoeker vastleggen. Studio Sedillo heeft daar
geen toegang toe. Dit staat in de privacyverklaring.

## Wat er lokaal staat

Alle opslag loopt via `storage.js`. Profiel 1 gebruikt de sleutels hieronder; profiel 2 tot
en met 6 dezelfde met `p<n>_` ertussen (`sudokuKids_p2_progress`, …). In de testversie
staat er `test_` voor.

| Sleutel | Inhoud | Persoonsgegeven? | In de overzet-code? |
|---|---|---|---|
| `sudokuKids_progress` | per level: aantal sterren en de tijd | nee | ja |
| `sudokuKids_settings` | geluid, muziek, klikgeluid, taal, cijfers of dieren, grootte, fouten markeren | nee | ja |
| `sudokuKids_current` | het onafgemaakte spel (rooster, notities, tijd, fouten) | nee | nee |
| `sudokuKids_played` | per moeilijkheidsband: welke puzzelnummers al gespeeld zijn | nee | ja |
| `sudokuKids_stats` | tellers voor badges (aantallen, dagen waarop gespeeld is, behaalde badges met datum) en welke meldingen al gegeven zijn | nee | ja |
| `sudokuKids_history` | hoogstens de laatste 500 puzzels: level, datum, tijd, fouten, hints, sterren | nee | ja |
| `sudokuKids_inbox` | hoogstens 50 meldingen in de app | nee | nee |
| `sudokuKids_profiles` | lijst van profielen (dierenplaatje en een **optionele naam** van hoogstens 12 tekens) en welk profiel actief is; ontstaat zodra er een profiel bij komt, gewisseld wordt of een naam of plaatje wordt gekozen | alleen als een ouder of kind een echte naam intypt | ja (naam en plaatje) |
| `test_sudokuKids_preview` | alleen testversie: het gekozen formaat van de formaat-balk | nee | nee |

Grootte in de meting na één gespeeld level: ongeveer 1 kB in totaal. Als alles vol is
(500 puzzels geschiedenis, alle badges) ongeveer 45 kB per profiel.

Niets hiervan verlaat het toestel. De enige manier waarop het ergens anders komt, is als
een ouder achter het ouderslot zelf een overzet-code maakt en die meeneemt.

## Verwijderen, gecontroleerd

`tests/e2e.py`, onderdeel 28:

- **Alle gegevens van deze app verwijderen:** daarna staat er geen enkele sleutel meer waar
  `sudokuKids` in voorkomt, er is geen cache meer en de service worker is uitgeschreven. Na
  herladen start de app met één leeg profiel, 0 sterren en de taal van het toestel.
- **Profiel verwijderen:** alle zeven soorten gegevens van dat profiel zijn weg; de andere
  profielen zijn onveranderd.
- Beide zitten achter het dubbele ouderslot en vragen een bevestiging; annuleren wist niets.

## Wanneer deze audit opnieuw moet

Bij elke wijziging die een verzoek naar buiten kan toevoegen of nieuwe gegevens bewaart:
cloud-opslag of accounts, statistieken, advertenties of verwijzingen naar andere apps,
externe lettertypen of geluiden, pushmeldingen. Dan ook het Data safety-formulier en de
privacyverklaring opnieuw nalopen.
