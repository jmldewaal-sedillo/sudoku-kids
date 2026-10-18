# Studio Sedillo: de hoofdsite en het domein

*Bijgewerkt op 18 oktober 2026. Domein, DNS en het register van alle subdomeinen staan sinds
die dag in `Projecten/studio-sedillo-infra/`; deze pagina zegt alleen wat er voor Sudoku Kids
bij hoort.*

| Wat | Waar |
|---|---|
| Hoofdsite | **https://studiosedillo.com**, repo `jmldewaal-sedillo/studio-sedillo` (lokaal `Apps/studio-sedillo`), GitHub Pages vanaf `main`, HTTPS afgedwongen |
| Pagina's van deze app (voor Google Play en de App Store) | https://studiosedillo.com/sudoku-kids/privacy en https://studiosedillo.com/sudoku-kids/delete (5 talen, `?lang=` kiest de taal) |
| Bron van die pagina's | `sudoku-kids/privacy.html` en `sudoku-kids/delete.html` in de repo `studio-sedillo` |
| DNS | Cloudflare (registratie bij Namecheap). Stappen en uitleg: `studio-sedillo-infra/README.md` en `docs/` daar |
| Subdomein van deze app | `sudokukids.studiosedillo.com`, **gereserveerd** in `studio-sedillo-infra/domeinen.json`: er hoort geen DNS-record te bestaan tot "lanceren web" |
| Op de startpagina van de hoofdsite | als "Binnenkort", zonder link; na de lancering met de link naar Google Play (en later de App Store) |

## Controleren

```bash
cd /home/maggiesedd/Documents/Projecten/studio-sedillo-infra
python3 tools/controleer-dns.py          # register, nameservers, verificatie, alle hostnamen
```

`sudokukids` moet daar "gereserveerd, geen record" tonen. In deze repo:
`python3 tests/no-private-data.py --online` controleert ook de twee pagina's op de hoofdsite.

## Iets veranderen aan de pagina's van deze app

De hoofdsite staat live vanaf `main`, dus alleen na akkoord van Jenn. De pagina's worden met
de hand bijgehouden in de repo `studio-sedillo` (deze app is ouder dan
`Apps/tools/hoofdsite-toevoegen.sh`); test daar met `python3 tests/pages.py`.

Nog open (`ROADMAP.md`): de doorverwijzing `/sudoku-kids/verwijderen` → `/delete`
(`Apps/CLAUDE.md`, sectie 5) bestaat nog niet.

## Later, misschien: een webversie op het eigen subdomein

Pas na "lanceren web" (`Apps/CLAUDE.md`, sectie 4). Opslag in de browser hoort bij het adres:
wie al op github.io speelde, neemt de voortgang mee met "Voortgang overzetten".
