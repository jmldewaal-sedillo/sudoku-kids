#!/usr/bin/env python3
"""Maakt het store-materiaal in store/ en controleert het tegen de eisen van Google Play.

    python3 tests/store.py            # opnieuw maken en controleren
    python3 tests/store.py --check    # alleen controleren

- store/icon-512.png             512x512, 32-bits PNG met alfa, hoogstens 1024 kB
- store/feature-graphic.png      1024x500, 24-bits PNG zonder alfa
- store/screenshots/<taal>/      6 telefoon (1080x1920), 4 tablet (1440x2560 en 2560x1440), zonder alfa
- store/teksten.md               de teksten uit store/listing.json, klaar om te plakken

Eisen: docs/publiceren.md, onderdeel 7. Exitcode 1 als iets niet voldoet.
"""
import json
import shutil
import subprocess
import sys

from playwright.sync_api import sync_playwright

from screenshots import ROOT, serve

STORE = ROOT / 'store'
LANGS = {'en': 'en-US', 'nl': 'nl-NL'}
PROGRESS = {f'w0_l{i}': {'stars': 3 - (i % 2), 'time': 40} for i in range(34)}
PROGRESS.update({f'w3_l{i}': {'stars': 3, 'time': 60} for i in range(12)})
PROGRESS.update({f'w1_l{i}': {'stars': 3, 'time': 90} for i in range(20)})


def flatten(path):
    """Store-afbeeldingen mogen geen alfakanaal hebben."""
    subprocess.run(['magick', str(path), '-background', 'white', '-alpha', 'remove', '-alpha', 'off', f'PNG24:{path}'], check=True)


def play(page, moves):
    for idx, val in page.evaluate(
            'gameState.given.map((g, i) => g ? null : [i, gameState.solution[i]]).filter(Boolean)')[:moves]:
        page.click(f'#sudoku-grid > :nth-child({idx + 1})')
        page.click(f'.num-btn[data-num="{val}"]')


def first(page, world, size, kind):
    return page.evaluate('([w, s, k]) => SudokuEngine.LEVEL_PLAN.find(l => l.world === w && l.size === s && l.type === k).globalIndex',
                         [world, size, kind])


def scenes(page):
    """De schermen in de volgorde van de store-pagina: (naam, functie die het scherm klaarzet)."""
    def worlds():
        page.evaluate('hideModals(); goToWorlds()')

    def animals():
        page.evaluate('i => startLevel(i, true)', first(page, 0, 4, 'standard'))
        page.click('#btn-display')
        play(page, 3)
        page.evaluate('showMascotMessage(pick("mGood"))')

    def fruit():
        page.click('#btn-display')
        page.evaluate('i => startLevel(i, true)', first(page, 0, 6, 'shapes'))
        play(page, 6)

    def nine():
        page.evaluate('i => startLevel(i, true)', first(page, 1, 9, 'standard'))
        play(page, 12)

    def win():
        page.evaluate('startLevel(0, true)')
        play(page, 99)
        page.wait_for_selector('#modal-win:not(.hidden)')

    def badges():
        page.evaluate('hideModals(); leaveGame(); openProfile(SudokuStorage.activeId())')

    return [('1-werelden', worlds), ('2-dieren', animals), ('3-fruit', fruit), ('4-sudoku-9x9', nine), ('5-gewonnen', win), ('6-badges', badges)]


def make():
    with serve() as url, sync_playwright() as pw:
        browser = pw.chromium.launch()
        # Store icon: the app icon as a full square. Google Play rounds the corners
        # itself, so the rounded corners of icons/icon.svg are left out here.
        svg = (ROOT / 'icons' / 'icon.svg').read_text()
        assert 'rx="112" fill="url(#bg)"' in svg
        page = browser.new_page(viewport={'width': 512, 'height': 512})
        page.set_content('<style>html,body{margin:0}svg{display:block;width:512px;height:512px}</style>' + svg.replace('rx="112" fill="url(#bg)"', 'fill="url(#bg)"'))
        page.screenshot(path=str(STORE / 'icon-512.png'))
        page.close()
        subprocess.run(['magick', str(STORE / 'icon-512.png'), '-alpha', 'on', f'PNG32:{STORE / "icon-512.png"}'], check=True)
        page = browser.new_page(viewport={'width': 1024, 'height': 500})
        page.goto(url + 'store/feature-graphic.html')
        page.wait_for_timeout(300)
        page.screenshot(path=str(STORE / 'feature-graphic.png'))
        page.close()
        flatten(STORE / 'feature-graphic.png')
        for lang, locale in LANGS.items():
            out = STORE / 'screenshots' / lang
            shutil.rmtree(out, ignore_errors=True)
            out.mkdir(parents=True)
            # telefoon 1080x1920; tablet staand 1440x2560 en liggend 2560x1440 (9:16 en 16:9)
            for device, w, h, scale, pick in (('telefoon', 360, 640, 3, None), ('tablet-staand', 720, 1280, 2, (0, 1)),
                                              ('tablet-liggend', 1280, 720, 2, (3, 5))):
                ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=scale, has_touch=True,
                                          locale=locale, service_workers='block')
                page = ctx.new_page()
                page.add_init_script('window.__noAutoRules = true; localStorage.setItem("sudokuKids_progress", %s)' % json.dumps(json.dumps(PROGRESS)))
                page.goto(url)
                page.click('#btn-start')
                page.wait_for_function("currentScreen === 'worlds'")
                for n, (name, prepare) in enumerate(scenes(page)):
                    prepare()
                    if pick is None or n in pick:
                        page.wait_for_timeout(900)
                        path = out / f'{device}-{name}.png'
                        page.screenshot(path=str(path))
                        flatten(path)
                ctx.close()
        browser.close()
    listing = json.loads((STORE / 'listing.json').read_text())
    lines = ['# Store-teksten', '', 'Gemaakt door `tests/store.py` uit `store/listing.json`. Pas de teksten daar aan, niet hier.', '',
             f'- Titel: **{listing["title"]}** ({len(listing["title"])} tekens)', f'- Ontwikkelaar: {listing["developer"]}', f'- Bedrijf: {listing["company"]} (geen adres vermelden)',
             f'- E-mail: {listing["email"]}', f'- Website: {listing["website"]}', f'- Privacybeleid: {listing["privacy"]}', f'- Gegevens verwijderen: {listing["delete"]}',
             f'- Categorie: {listing["category"]}', '']
    for code, text in listing['listings'].items():
        lines += [f'## {code}', '', f'**Korte beschrijving** ({len(text["short"])} tekens)', '', text['short'], '',
                  f'**Volledige beschrijving** ({len(text["full"])} tekens)', '', '```', text['full'], '```', '']
    (STORE / 'teksten.md').write_text('\n'.join(lines))


def info(path):
    out = subprocess.run(['magick', 'identify', '-format', '%w %h %[bit-depth] %[channels]', str(path)], capture_output=True, text=True, check=True).stdout.split()
    return int(out[0]), int(out[1]), out[3], int(out[2])


def verify():
    bad = []

    def need(ok, text):
        print(('  ✅ ' if ok else '  ❌ ') + text)
        if not ok:
            bad.append(text)

    w, h, channels, depth = info(STORE / 'icon-512.png')
    size = (STORE / 'icon-512.png').stat().st_size
    need((w, h) == (512, 512) and 'a' in channels and depth == 8 and size <= 1024 * 1024,
         f'icoon: 512x512, 32-bits PNG met alfa, hoogstens 1024 kB (is {w}x{h}, {channels}, {size // 1024} kB)')
    corner = subprocess.run(['magick', str(STORE / 'icon-512.png'), '-format', '%[fx:p{1,1}.a] %[fx:p{510,1}.a] %[fx:p{1,510}.a] %[fx:p{510,510}.a]', 'info:'],
                            capture_output=True, text=True, check=True).stdout.split()
    need(all(float(v) == 1 for v in corner), 'icoon: vol vierkant, ook in de vier hoeken (Google rondt de hoeken zelf af)')
    w, h, channels, depth = info(STORE / 'feature-graphic.png')
    need((w, h) == (1024, 500) and 'a' not in channels, f'feature graphic: 1024x500, 24-bits PNG zonder alfa (is {w}x{h}, {channels})')
    for lang in LANGS:
        shots = sorted((STORE / 'screenshots' / lang).glob('*.png'))
        phone = [p for p in shots if p.name.startswith('telefoon')]
        tablet = [p for p in shots if p.name.startswith('tablet')]
        meta = {p.name: info(p) for p in shots}
        need(4 <= len(phone) <= 8 and all(meta[p.name][:2] == (1080, 1920) for p in phone),
             f'{lang}: {len(phone)} telefoon-screenshots (4 tot 8) van 1080x1920')
        need(len(tablet) >= 2 and all(meta[p.name][:2] in ((1440, 2560), (2560, 1440)) for p in tablet),
             f'{lang}: {len(tablet)} tablet-screenshots, 9:16 of 16:9, lange zijde 2560 (tussen 1080 en 7680)')
        need(all('a' not in m[2] and max(m[:2]) <= 2 * min(m[:2]) for m in meta.values()),
             f'{lang}: alle screenshots zonder alfa en de lange zijde hoogstens 2x de korte')
    listing = json.loads((STORE / 'listing.json').read_text())
    need(len(listing['title']) <= 30 and all(len(t['short']) <= 80 and len(t['full']) <= 4000 for t in listing['listings'].values()),
         f'teksten: titel {len(listing["title"])}/30, {len(listing["listings"])} talen, kort hoogstens 80 en lang hoogstens 4000 tekens')
    need(all(len(v) <= 140 for v in listing['featureGraphicAlt'].values()), 'alt-tekst van de feature graphic: hoogstens 140 tekens')
    print('\n' + ('❌ Store-materiaal voldoet niet.' if bad else '✅ Store-materiaal voldoet aan de eisen.'))
    return 1 if bad else 0


if __name__ == '__main__':
    if '--check' not in sys.argv:
        make()
    sys.exit(verify())
