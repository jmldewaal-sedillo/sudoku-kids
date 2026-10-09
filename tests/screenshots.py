#!/usr/bin/env python3
"""Screenshots van elk scherm op elk schermformaat + lay-outcontrole.

    python3 tests/screenshots.py [uitvoermap]

Maakt per formaat een map met PNG's en schrijft `layout.txt` met:
  - knoppen kleiner dan 48x48 px
  - knoppen die (deels) buiten beeld vallen
  - console-errors
Exitcode 1 als een van die drie voorkomt.
"""
import contextlib
import functools
import http.server
import json
import pathlib
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'tests' / 'out')

VIEWPORTS = {
    'phone-320x568': (320, 568),
    'phone-360x640': (360, 640),
    'phone-390x844': (390, 844),
    'tablet-800x1280': (800, 1280),
    'landscape-640x360': (640, 360),
    'landscape-844x390': (844, 390),
    'tablet-landscape-1280x800': (1280, 800),
}

# Alle levels van wereld 0 en 1 gehaald, zodat elk level te openen is.
PROGRESS = {f'w{w}_l{i}': {'stars': 3 - (i % 3), 'time': 60} for w in (0, 1) for i in range(35)}

MIN_TAP = 48

MEASURE_JS = """
(minTap) => {
  const vw = innerWidth, vh = innerHeight, small = [], outside = [];
  const sel = 'button, select, a, .world-card, .sudoku-cell, label.settings-row';
  const scopes = [...document.querySelectorAll('.screen.active, .modal:not(.hidden)')];
  const modalOpen = scopes.some(s => s.classList.contains('modal'));
  for (const scope of scopes) {
    if (modalOpen && !scope.classList.contains('modal')) continue;
    for (const el of scope.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const name = (el.id ? '#' + el.id : '.' + String(el.className).split(' ')[0]) +
                   ' ' + Math.round(r.width) + 'x' + Math.round(r.height);
      const scrollable = el.closest('.levels-grid, .worlds-container, .settings-list, .modal-content');
      if (!el.classList.contains('sudoku-cell') && (r.width < minTap - 0.5 || r.height < minTap - 0.5)) small.push(name);
      if (r.left < -0.5 || r.right > vw + 0.5 || ((r.top < -0.5 || r.bottom > vh + 0.5) && !scrollable)) outside.push(name);
    }
  }
  const grid = document.querySelector('#screen-game.active #sudoku-grid');
  let cell = null;
  if (grid && grid.firstElementChild) cell = Math.round(grid.firstElementChild.getBoundingClientRect().width);
  return { small: [...new Set(small)], outside: [...new Set(outside)], cell,
           hscroll: document.documentElement.scrollWidth > vw };
}
"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@contextlib.contextmanager
def serve(root=ROOT):
    handler = functools.partial(QuietHandler, directory=str(root))
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        yield f'http://127.0.0.1:{httpd.server_address[1]}/'
    finally:
        httpd.shutdown()


def first_global_index(page, world, size, kind):
    return page.evaluate(
        '([w, s, k]) => SudokuEngine.LEVEL_PLAN.find(l => l.world === w && l.size === s && l.type === k).globalIndex',
        [world, size, kind])


def run():
    report, failed = [], False
    with serve() as url, sync_playwright() as pw:
        browser = pw.chromium.launch()
        for name, (w, h) in VIEWPORTS.items():
            out = OUT / name
            out.mkdir(parents=True, exist_ok=True)
            ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2,
                                      has_touch=True, service_workers='block', locale='nl-NL')
            page = ctx.new_page()
            errors = []
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.add_init_script(
                'try { if (!localStorage.getItem("sudokuKids_progress")) '
                'localStorage.setItem("sudokuKids_progress", %s); } catch (e) {}' % json.dumps(json.dumps(PROGRESS)))
            page.goto(url)

            def shot(label):
                nonlocal failed
                page.wait_for_timeout(700)
                page.screenshot(path=str(out / f'{label}.png'))
                m = page.evaluate(MEASURE_JS, MIN_TAP)
                line = f'{name:26} {label:16}'
                if m['cell']:
                    line += f' cel={m["cell"]}px'
                if m['small']:
                    failed = True
                    line += f'\n      KLEINER DAN {MIN_TAP}px: ' + ', '.join(m['small'])
                if m['outside'] or m['hscroll']:
                    failed = True
                    line += '\n      BUITEN BEELD: ' + ', '.join(m['outside'] or ['horizontale scroll'])
                report.append(line)

            page.set_default_timeout(5000)
            try:
                shot('01-splash')
                page.click('#btn-start')
                shot('02-werelden')
                page.click('#world-card-0')
                shot('03-levels')
                for label, world, size, kind in [
                    ('04-spel-4x4', 0, 4, 'standard'), ('05-spel-4x4-fruit', 0, 4, 'shapes'),
                    ('06-spel-6x6', 0, 6, 'standard'), ('07-spel-9x9', 1, 9, 'standard'),
                    ('08-spel-9x9-x', 1, 9, 'xsudoku'),
                ]:
                    page.evaluate('i => startLevel(i)', first_global_index(page, world, size, kind))
                    shot(label)
                # 9x9 X met dieren, een geselecteerd vakje en notities
                page.click('#btn-display')
                empty = page.evaluate('gameState.given.indexOf(0)')
                page.click(f'#sudoku-grid > :nth-child({empty + 1})')
                page.click('#btn-notes')
                for n in (1, 5, 9):
                    page.click(f'.num-btn[data-num="{n}"]')
                shot('09-spel-9x9-dieren')
                page.click('#btn-notes')
                page.click('#btn-display')
                # Winnen: level 1 oplossen via de knoppen
                page.evaluate('startLevel(0, true)')
                page.wait_for_timeout(300)
                for idx, val in page.evaluate(
                        'gameState.given.map((g, i) => g ? null : [i, gameState.solution[i]]).filter(Boolean)'):
                    page.click(f'#sudoku-grid > :nth-child({idx + 1})')
                    page.click(f'.num-btn[data-num="{val}"]')
                page.wait_for_selector('#modal-win:not(.hidden)')
                shot('10-gewonnen')
                page.click('#btn-win-home')
                # 4x4: fouten kosten sterren maar geen game over
                page.evaluate('startLevel(0, true)')
                page.wait_for_timeout(300)
                for label, level in (('11-4x4-na-3-fouten', 0), ('12-game-over', first_global_index(page, 0, 6, 'standard'))):
                    page.evaluate('i => startLevel(i, true)', level)
                    page.wait_for_timeout(300)
                    idx, sol, size = page.evaluate(
                        '(() => { const i = gameState.given.indexOf(0); return [i, gameState.solution[i], gameState.size]; })()')
                    page.click(f'#sudoku-grid > :nth-child({idx + 1})')
                    for val in [v for v in range(1, size + 1) if v != sol][:3]:
                        page.click(f'.num-btn[data-num="{val}"]')
                        page.wait_for_timeout(250)
                    page.wait_for_timeout(800)
                    shot(label)
                page.evaluate('hideModals(); goToSettings()')
                shot('13-instellingen')
                page.click('#btn-reset-progress')
                shot('14-reset-bevestigen')
            except Exception as exc:  # een knop is niet te bereiken: dat is zelf een bevinding
                failed = True
                report.append(f'{name:26} VASTGELOPEN: ' + str(exc).split('Call log')[0].strip()[:160]
                              + ' | ' + ' '.join(l.strip() for l in str(exc).splitlines() if 'intercepts' in l)[:160])
            if errors:
                failed = True
                report.append(f'{name:26} CONSOLE-ERRORS: {errors}')
            ctx.close()
        browser.close()
    text = '\n'.join(report)
    (OUT / 'layout.txt').write_text(text + '\n')
    print(text)
    print('\n' + ('❌ Lay-outproblemen of console-errors gevonden.' if failed else '✅ Niets buiten beeld, alle knoppen minstens 48x48 px, 0 console-errors.'))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(run())
