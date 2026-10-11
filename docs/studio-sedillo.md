# Studio Sedillo – domeinen, DNS en een nieuwe app toevoegen

*Opgesteld op 11 oktober 2026. Bronnen: de documentatie van GitHub Pages over
[eigen domeinen][gh-domain] en [domeinverificatie][gh-verify], geraadpleegd op die datum.*

## Vaste opzet

| Adres | Wat | Repository | Vult zich vanuit |
|---|---|---|---|
| `studiosedillo.com` (en `www.`) | hoofdsite: spellen, contact, algemene privacy | `studio-sedillo` | `main` van die repo |
| `sudokukids.studiosedillo.com` | Sudoku Kids, live | `sudoku-kids-live` | `main` van `sudoku-kids` (workflow `live-deploy.yml`) |
| `test-sudokukids.studiosedillo.com` | Sudoku Kids, testversie | `sudoku-kids-test` | `test` van `sudoku-kids` (workflow `test-deploy.yml`) |
| `jmldewaal-sedillo.github.io/sudoku-kids/` | het oude adres; blijft werken en biedt aan te verhuizen | `sudoku-kids` | `main`, rechtstreeks door GitHub Pages |

**Elke app krijgt vanaf het begin een eigen subdomein.** Reden: een browser bewaart de
voortgang per adres (per "origin": het stuk tot en met `.com`). Alles wat op
`sudokukids.studiosedillo.com` staat deelt dus één opslag, wat er later ook op dat subdomein
bijkomt; en niets op een ander subdomein kan erbij.

### Waarom de live versie een eigen repository krijgt

Je vroeg om de Sudoku-repo zelf op het subdomein te zetten. Dat heb ik bewust anders
gedaan, omdat het botst met je andere wens (het oude adres laten doorverwijzen mét een
melding over voortgang overzetten):

- Zet je een eigen domein op de repository `sudoku-kids`, dan stuurt GitHub
  `jmldewaal-sedillo.github.io/sudoku-kids/` meteen en onvoorwaardelijk door naar het
  nieuwe domein. De pagina op het oude adres wordt dan nooit meer geladen.
- De sterren van bestaande spelers staan in de opslag van `github.io`. Alleen een pagina die
  óp `github.io` draait kan daarbij. Na zo'n automatische doorverwijzing is die voortgang
  onbereikbaar.

Daarom: de live versie op het subdomein komt uit een aparte repository
(`sudoku-kids-live`, op dezelfde manier gevuld als de testversie), en het oude adres blijft
de app tonen met de melding "We zijn verhuisd!". Wil je dit toch anders, zeg het dan vóór
`tools/eigen-domein.sh live` wordt gedraaid; tot dan is er niets onomkeerbaars gebeurd.

---

## DNS-records bij Namecheap

Namecheap → Domain List → `studiosedillo.com` → Manage → **Advanced DNS** → Host Records.

**Eerst weghalen:** de twee records van de parkeerpagina die er nu staan (een `CNAME` voor
`www` naar `parkingpage.namecheap.com` en een `URL Redirect Record` voor `@`).

**Dan aanmaken** (TTL: Automatic):

| Type | Host | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `jmldewaal-sedillo.github.io.` |
| CNAME | `sudokukids` | `jmldewaal-sedillo.github.io.` |
| CNAME | `test-sudokukids` | `jmldewaal-sedillo.github.io.` |
| TXT | `_github-pages-challenge-jmldewaal-sedillo` | de code die GitHub je geeft (zie hieronder) |

De CNAME's wijzen naar je gebruikersnaam, zonder de naam van de repository; GitHub weet
aan de hand van het ingestelde domein welke repository erbij hoort. Maak **geen**
wildcard-record (`*`): daarmee kan iemand anders een subdomein kapen, ook na verificatie.

**E-mail:** onder *Mail Settings* op dezelfde pagina staat "Email Forwarding" al aan (de
MX-records en het SPF-record van Namecheap bestaan al). Voeg bij *Redirect Email* de alias
`support` toe met je eigen adres als bestemming, en stuur een testmail. Laat die MX- en
TXT-records staan.

**Controleren:** `tools/eigen-domein.sh check` laat per record zien of het goed staat. Een
wijziging kan tot 24 uur duren, meestal een paar minuten.

## Domeinverificatie bij GitHub (tegen domeinkaping)

Zonder verificatie kan een andere GitHub-gebruiker een site op jouw (sub)domein zetten
zodra een DNS-record ernaar blijft wijzen terwijl de repository weg is of de koppeling is
losgeraakt. Na verificatie mogen alleen jouw repositories op dit domein publiceren.

1. GitHub → je profielfoto rechtsboven → **Settings** (van je account, niet van een
   repository) → **Pages** in de linkerkolom.
2. **Add a domain** → vul `studiosedillo.com` in → **Add domain**.
3. GitHub toont een TXT-record: host `_github-pages-challenge-jmldewaal-sedillo` en een
   code. Maak dat record aan bij Namecheap (laatste rij van de tabel).
4. Wacht tot `tools/eigen-domein.sh check` het record ziet, ga terug naar die pagina en
   klik **Verify**.
5. **Laat het TXT-record staan.** Haal je het weg, dan vervalt de verificatie.

Het verifiëren van `studiosedillo.com` dekt ook de directe subdomeinen
(`sudokukids.`, `test-sudokukids.`, en die van volgende apps).

## De domeinen aanzetten (als DNS goed staat)

```bash
tools/eigen-domein.sh check   # alles "goed"?
tools/eigen-domein.sh site    # studiosedillo.com
tools/eigen-domein.sh test    # test-sudokukids.studiosedillo.com, daarna opnieuw naar test pushen
tools/eigen-domein.sh live    # sudokukids.studiosedillo.com (eerst "De live-repository klaarzetten" hieronder)
tools/eigen-domein.sh https   # HTTPS afdwingen; lukt pas als GitHub het certificaat heeft (tot 24 uur)
```

Het script weigert te werken zolang `check` niet groen is. Dat is met opzet: een eigen domein
op een repository zetten terwijl DNS nog niet klopt, maakt de bestaande github.io-link
onbereikbaar.

### De live-repository klaarzetten (eenmalig, doe je zelf)

De workflow `live-deploy.yml` kopieert `main` naar de repository `sudoku-kids-live`. Daarvoor
is een sleutel nodig die alleen in die ene repository mag schrijven. Die maak je zelf aan;
Claude Code maakt geen sleutels en zet geen secrets.

```bash
gh repo create jmldewaal-sedillo/sudoku-kids-live --public \
  --description "Live versie van Sudoku Kids (automatisch gevuld vanuit main van sudoku-kids)"
ssh-keygen -t ed25519 -N '' -C "live-deploy sudoku-kids" -f /tmp/live-deploy
gh repo deploy-key add /tmp/live-deploy.pub -R jmldewaal-sedillo/sudoku-kids-live --allow-write --title live-deploy
gh secret set LIVE_DEPLOY_KEY -R jmldewaal-sedillo/sudoku-kids < /tmp/live-deploy
rm /tmp/live-deploy /tmp/live-deploy.pub
```

Daarna `tools/eigen-domein.sh live`, mergen naar `main` (de workflow vult de repository), en
GitHub Pages aanzetten op `sudoku-kids-live`:

```bash
gh api -X POST repos/jmldewaal-sedillo/sudoku-kids-live/pages --input - <<< '{"source":{"branch":"main","path":"/"}}'
tools/eigen-domein.sh live     # zet nu ook het eigen domein
```

De testversie werkt al zo, met de secret `TEST_DEPLOY_KEY`.

Stand op 11 oktober 2026: de DNS staat nog op de parkeerpagina, dus er is nog niets
omgezet. Alles in de code is er wel op voorbereid.

## Hoe de app weet waar hij draait

- **Testversie:** de hostnaam begint met `test-` of `test.`, of de map heet `test` of eindigt
  op `-test`. Dan: eigen opslag (`test_`-sleutels), eigen cache, rode TEST-strook.
- **Oude adres:** de hostnaam eindigt op `github.io` én `NEW_HOME` in `script.js` is
  ingevuld. Dan verschijnt "We zijn verhuisd!".
- Verder zijn alle paden relatief; dezelfde bestanden werken op elk adres en in elke map.

## Verhuizen van github.io naar het subdomein

1. De live-repository klaarzetten (zie boven), mergen naar `main`, en controleren dat
   `https://sudokukids.studiosedillo.com/` werkt.
2. Zet in `script.js` de regel `const NEW_HOME = '';` op
   `const NEW_HOME = 'https://sudokukids.studiosedillo.com/';`, verhoog `CACHE_VERSION`,
   test en zet live. Dit mag pas als stap 1 klaar is: de app kan niet zelf nagaan of het
   nieuwe adres bestaat, want hij doet geen verzoeken naar andere domeinen.
3. Wie daarna het oude adres opent, ziet "We zijn verhuisd!" met de knop **Verhuis met mijn
   voortgang**. Die opent het nieuwe adres met de voortgang van alle profielen achter het
   `#` in de link. Dat deel van een link wordt nooit naar een server gestuurd; het nieuwe
   adres leest het, importeert de profielen en haalt het uit de adresbalk.
4. Wie de app als snelkoppeling op het startscherm heeft, moet hem daarna één keer opnieuw
   installeren vanaf het nieuwe adres. Handmatig kan ook: Wie speelt er? → **Voortgang
   overzetten** → code maken op het oude adres, plakken op het nieuwe.
5. Het oude adres kan blijven staan zolang je wilt.

## Later van `/` naar een submap verhuizen (bijvoorbeeld `/spelen/`)

Stel dat `sudokukids.studiosedillo.com/` een eigen website wordt en het spel naar
`/spelen/` gaat. **De voortgang blijft dan vanzelf behouden**, omdat de opslag aan het
subdomein hangt en niet aan de map (`tests/e2e.py`, onderdeel 31, bewijst dat). De app is
daarop gebouwd: relatieve paden, sleutels zonder mapnaam, cachenamen zonder mapnaam.

Wat er bij zo'n verhuizing wél moet gebeuren:

1. **Bestanden** van het spel naar `/spelen/` (in de deploy-workflow een map dieper).
2. **Service worker op het oude pad opruimen.** De oude service worker beheerst `/` en zou
   de oude spelpagina uit zijn cache blijven tonen op de plek van de nieuwe website. Laat
   daarom op `/sw.js` een klein bestand staan dat zichzelf uitschrijft en zijn caches wist:

   ```js
   self.addEventListener('install', () => self.skipWaiting());
   self.addEventListener('activate', e => e.waitUntil(
     caches.keys().then(k => Promise.all(k.map(n => caches.delete(n))))
       .then(() => self.registration.unregister())
       .then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.navigate(c.url)))));
   ```

   Het spel op `/spelen/` registreert daar zijn eigen service worker met een eigen cache.
3. **Doorverwijzen:** op `/index.html` (de nieuwe website) een duidelijke knop naar
   `/spelen/`; `/privacy` en `/verwijderen` blijven op het oude pad bestaan (de links staan
   in Play Console) of verwijzen door.
4. **Manifest:** zet `"id": "/"` vast in `manifest.json` (nu `./`, wat op de nieuwe plek
   `/spelen/` zou worden). Zo blijft een geïnstalleerde app dezelfde app.
5. **Android-app (TWA):** het startadres staat in de app. Pas `startUrl` in
   `twa/twa-manifest.json` aan naar `/spelen/` en breng een update uit.
   `assetlinks.json` blijft waar hij staat: die hoort bij het subdomein, niet bij de map.
6. `CACHE_VERSION` verhogen en op de testversie eerst dezelfde verhuizing doen.

Verhuizen naar een **ander subdomein of domein** behoudt de voortgang niet vanzelf; dan is
de overzet-code nodig, zoals bij de verhuizing vanaf github.io.

## Een nieuwe app toevoegen

Voorbeeld: The Flush Factor op `flushfactor.studiosedillo.com`.

1. **Naam kiezen:** subdomein `<app>` en `test-<app>`, package name
   `com.studiosedillo.<app>` (zonder streepjes).
2. **DNS** bij Namecheap: twee CNAME's, `<app>` en `test-<app>`, naar
   `jmldewaal-sedillo.github.io.` De verificatie van het hoofddomein dekt ze al.
3. **Repositories:** de bron (`<app>`), plus `<app>-live` en `<app>-test` als publicatieplek.
   Neem `.github/workflows/test-deploy.yml` en `live-deploy.yml` uit deze repo over en pas
   de namen en de bestandenlijst aan. Maak per publicatie-repo een deploy key
   (zie "De live-repository klaarzetten") en zet de variabelen `TEST_DOMAIN` en
   `LIVE_DOMAIN`.
4. **In de app:** relatieve paden; opslag-sleutels met een eigen voorvoegsel en `test_`
   ervoor op de testversie; testversie herkennen aan de hostnaam `test-…`; een leeg bestand
   `.nojekyll`; `.well-known/assetlinks.json`.
5. **GitHub Pages** aanzetten op beide publicatie-repo's, het eigen domein instellen en
   HTTPS afdwingen.
6. **assetlinks.json** per subdomein, in de root van die app
   (`https://<app>.studiosedillo.com/.well-known/assetlinks.json`), met de package name en
   de SHA-256 van de app signing key uit Play Console. De koppeling tussen een Android-app
   en een website geldt per hostnaam; de hoofdsite heeft er dus geen nodig. Zonder
   `.nojekyll` slaat GitHub Pages mappen die met een punt beginnen over.
7. **Privacy en verwijderen:** `privacy.html` en `verwijderen.html` in de app
   (bereikbaar als `/privacy` en `/verwijderen`), in dezelfde opzet als hier.
8. **Hoofdsite:** een kaart in `index.html` van `studio-sedillo` en een regel in de
   privacylijst daar.
9. **Play Console:** ontwikkelaarsnaam Studio Sedillo, contact support@studiosedillo.com,
   en de checklist uit `docs/publiceren.md`.

[gh-domain]: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
[gh-verify]: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
