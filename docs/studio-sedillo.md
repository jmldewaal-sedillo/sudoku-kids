# Studio Sedillo: de hoofdsite en het domein

*Bijgewerkt op 11 oktober 2026. Het eerdere plan (elke app op een eigen subdomein) is
vervangen; zie `docs/lanceren.md`.*

| Wat | Waar |
|---|---|
| Hoofdsite | repo `jmldewaal-sedillo/studio-sedillo` (lokaal `Apps/studio-sedillo`), GitHub Pages vanaf `main` |
| Adres | **https://studiosedillo.com** (na DNS); tot dan https://jmldewaal-sedillo.github.io/studio-sedillo/ |
| Pagina's per app | `studiosedillo.com/<app>/privacy` en `/<app>/delete`; voor Sudoku Kids: `sudoku-kids/` |
| Apps op de startpagina | als "Binnenkort", zonder links |
| Subdomeinen voor apps | **geen** (besluit van 11 oktober 2026) |

## DNS bij Namecheap (Advanced DNS)

Alleen de hoofdsite heeft records nodig. Haal eerst de twee parkeer-records weg (CNAME `www`
→ `parkingpage.namecheap.com` en de URL Redirect op `@`).

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
| TXT | `_github-pages-challenge-jmldewaal-sedillo` | de code die GitHub je geeft |

**Verwijderen** (records naar GitHub zonder site erachter kunnen door iemand anders
geclaimd worden): `proefapp` en `test-proefapp`. Maak geen records voor `sudokukids` of
`test-sudokukids`, en geen wildcard (`*`).

**Domein verifiëren:** GitHub → Settings van je account → Pages → Add a domain →
`studiosedillo.com`. GitHub toont een TXT-record; zet het bij Namecheap en laat het daarna
staan. Het beschermt het domein en alle subdomeinen tegen kaping.

**E-mail:** het contactadres is `studio.sedillo@gmail.com`; bij Namecheap hoeft daarvoor
niets ingesteld te worden.

## Het domein aanzetten

```bash
tools/eigen-domein.sh check    # staat alles goed? verandert niets
tools/eigen-domein.sh site     # zet studiosedillo.com op de repo studio-sedillo (weigert zonder goede DNS)
tools/eigen-domein.sh https    # HTTPS afdwingen, zodra GitHub het certificaat heeft
```

`check` meldt ook als er nog een record voor een app-subdomein bestaat dat weg moet.
Daarna controleren: `https://studiosedillo.com/sudoku-kids/privacy` en `/delete` openen in
vijf talen, en `python3 tests/no-private-data.py --online` in de repo `studio-sedillo`.

## Een app toevoegen aan de hoofdsite

1. Map `<app>/` in de repo `studio-sedillo` met `privacy.html` en `delete.html` (neem
   `sudoku-kids/` als voorbeeld; talen van de app).
2. Een kaart op de startpagina, als "Binnenkort" zolang er niets te spelen of te
   downloaden is. Later: een link naar Google Play, niet naar een github.io-adres.
3. Een regel in de privacyverklaring van de site ("Elk spel heeft een eigen verklaring").
4. `python3 tests/pages.py` uitbreiden met de nieuwe pagina's.

## Later, misschien: een webversie op een eigen adres

Niet gepland. Als het er ooit van komt: opslag in de browser hoort bij het adres, dus kies
het adres één keer goed, en gebruik "Voortgang overzetten" voor wie al op een ander adres
speelde. Zet nooit een eigen domein op een repo voordat de DNS klopt.
