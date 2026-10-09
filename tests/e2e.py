#!/usr/bin/env python3
"""End-to-end test van de belangrijkste flows (Playwright, headless Chromium).

    python3 tests/e2e.py

Start zelf een lokale server, speelt het spel via echte tikken en controleert
spelregels, opslaan, terug-knop, talen, offline en snelheid.
Exitcode 1 als een controle faalt.
"""
import json
import sys

from playwright.sync_api import sync_playwright

from screenshots import serve

results = []


def check(name, ok, detail=''):
    results.append(bool(ok))
    print(('  ✅ ' if ok else '  ❌ ') + name + (f'  [{detail}]' if detail and not ok else ''))


def section(title):
    print('\n' + title)


class Game:
    """Kleine hulpjes rond één pagina."""

    def __init__(self, browser, url, w=360, h=640, locale='nl-NL', progress=None, **ctx_args):
        self.url = url
        self.ctx = browser.new_context(viewport={'width': w, 'height': h}, has_touch=True, locale=locale, **ctx_args)
        self.page = self.ctx.new_page()
        self.errors, self.requests = [], []
        self.page.on('console', lambda m: self.errors.append(m.text) if m.type == 'error' else None)
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))
        self.page.on('request', lambda r: self.requests.append(r.url))
        if progress is not None:
            self.page.add_init_script(
                'try { if (!localStorage.getItem("sudokuKids_progress")) '
                'localStorage.setItem("sudokuKids_progress", %s); } catch (e) {}' % json.dumps(json.dumps(progress)))
        self.page.goto(url)

    def js(self, code, arg=None):
        return self.page.evaluate(code, arg)

    def screen(self):
        return self.js('currentScreen')

    def tap_cell(self, idx):
        self.page.click(f'#sudoku-grid > :nth-child({idx + 1})')

    def tap_num(self, n):
        self.page.click(f'.num-btn[data-num="{n}"]')

    def open_cells(self):
        """[(index, juiste waarde)] van alle vakjes die nog ingevuld moeten worden."""
        return self.js('gameState.grid.map((v, i) => v === gameState.solution[i] ? null : [i, gameState.solution[i]]).filter(Boolean)')

    def wrong_values(self, idx):
        return self.js('i => { const out = []; for (let v = 1; v <= gameState.size; v++) if (v !== gameState.solution[i]) out.push(v); return out; }', idx)

    def solve(self, skip=0):
        cells = self.open_cells()
        for idx, val in cells[:len(cells) - skip]:
            self.tap_cell(idx)
            self.tap_num(val)

    def modal(self):
        return self.js('(document.querySelector(".modal:not(.hidden)") || {}).id || null')

    def stored(self, key='sudokuKids_progress'):
        return self.js('k => JSON.parse(localStorage.getItem(k))', key)

    def start(self):
        self.page.click('#btn-start')
        self.page.wait_for_timeout(450)

    def close(self):
        self.ctx.close()


def progress_for(world, count, stars=3):
    return {f'w{world}_l{i}': {'stars': stars, 'time': 30} for i in range(count)}


def run():
    with serve() as url, sync_playwright() as pw:
        browser = pw.chromium.launch()

        # ------------------------------------------------------------
        section('1. Nieuwe speler: start → wereld → level 1 uitspelen')
        g = Game(browser, url)
        check('startscherm zichtbaar', g.screen() == 'splash')
        g.start()
        check('wereldkaart na tik op Spelen', g.screen() == 'worlds')
        g.page.click('#world-card-1', force=True)  # aria-disabled: Playwright tikt anders niet
        check('vergrendelde wereld opent niet', g.screen() == 'worlds')
        check('vergrendelde wereld schudt (feedback zonder tekst)', g.js('document.getElementById("world-card-1").classList.contains("shake")'))
        g.page.click('#world-card-0')
        check('levelscherm van wereld 1', g.screen() == 'levels')
        check('alleen level 1 is open', g.js('document.querySelectorAll(".level-btn:not(.locked)").length') == 1)
        g.page.click('.level-btn.current')
        g.page.wait_for_timeout(450)
        check('spelscherm geopend', g.screen() == 'game')
        check('wijsvinger wijst een leeg vakje aan', g.js('document.querySelectorAll(".sudoku-cell.nudge").length') == 1)
        g.tap_num(1)
        check('cijfer zonder gekozen vakje telt niet als fout', g.js('gameState.mistakes') == 0)
        idx, val = g.open_cells()[0]
        g.tap_cell(idx)
        check('na tik op vakje: cijferknoppen lichten op', g.js('document.getElementById("numpad").classList.contains("nudge-pad")'))
        wrong = g.wrong_values(idx)
        g.tap_num(wrong[0])
        check('fout antwoord telt als 1 fout', g.js('gameState.mistakes') == 1)
        check('fout vakje wordt rood gemarkeerd', g.js('document.querySelectorAll(".sudoku-cell.error").length') == 1)
        g.tap_num(wrong[0])
        check('dezelfde fout nog een keer telt niet dubbel', g.js('gameState.mistakes') == 1)
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        check('win-venster met 2 sterren (1 fout)', g.js('document.getElementById("win-stars").textContent') == '⭐⭐☆')
        check('sterren opgeslagen', g.stored().get('w0_l0', {}).get('stars') == 2, g.stored())
        check('focus staat op knop in het venster', g.js('document.activeElement.id') == 'btn-win-next')
        g.page.click('#btn-win-next')
        g.page.wait_for_timeout(450)
        check('"Volgende" opent level 2', g.js('gameState.lv.indexInWorld') == 1)
        g.page.reload()
        g.start()
        g.page.click('#world-card-0')
        check('na herladen: level 1 gehaald, level 2 open, level 3 dicht',
              g.js('[...document.querySelectorAll(".level-btn")].slice(0, 3).map(b => b.className.match(/completed|current|locked/)[0]).join()')
              == 'completed,current,locked')
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('2. Fouten, game over en sterren')
        g = Game(browser, url, progress=progress_for(0, 35))
        g.start()
        g.js('startLevel(0, true)')
        cells = g.open_cells()
        for idx, _ in cells[:2]:
            g.tap_cell(idx)
            for v in g.wrong_values(idx):
                g.tap_num(v)
        g.page.wait_for_timeout(900)
        check('4×4: 6 fouten en nog steeds geen game over', g.js('gameState.mistakes') == 6 and g.modal() is None)
        check('4×4: sterren-teller toont 1 ster', g.js('document.getElementById("lives-display").textContent') == '⭐☆☆')
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        check('4×4: toch uitgespeeld met 1 ster', g.js('document.getElementById("win-stars").textContent') == '⭐☆☆')
        check('betere score blijft staan (3 sterren van eerder)', g.stored()['w0_l0']['stars'] == 3)
        g.page.click('#btn-win-home')

        six = g.js('SudokuEngine.LEVEL_PLAN.find(l => l.size === 6).globalIndex')
        g.js('i => startLevel(i, true)', six)
        check('6×6: drie hartjes', g.js('document.getElementById("lives-display").textContent') == '❤️❤️❤️')
        idx, _ = g.open_cells()[0]
        g.tap_cell(idx)
        for v in g.wrong_values(idx)[:3]:
            g.tap_num(v)
        g.page.wait_for_selector('#modal-gameover:not(.hidden)')
        check('6×6: game over na 3 fouten', True)
        check('onafgemaakt spel is gewist na game over', g.stored('sudokuKids_current') is None)
        g.page.click('#btn-go-replay')
        check('opnieuw: fouten terug op 0', g.js('gameState.mistakes') == 0 and g.modal() is None)

        # ------------------------------------------------------------
        section('3. Hints, notities, wissen')
        cells = g.open_cells()
        g.page.click('#btn-hint')
        check('hint vult een juist vakje', len(g.open_cells()) == len(cells) - 1 and g.js('gameState.hintsUsed') == 1)
        g.page.click('#btn-hint')
        g.page.click('#btn-hint')
        check('na 3 hints is de knop uit', g.js('document.getElementById("btn-hint").disabled'))
        idx, val = g.open_cells()[0]
        g.tap_cell(idx)
        g.page.click('#btn-notes')
        check('notitieknop is zichtbaar actief', g.js('document.getElementById("btn-notes").getAttribute("aria-pressed")') == 'true')
        g.tap_num(1)
        g.tap_num(2)
        check('notities staan in het vakje', g.js('i => [...gameState.notes[i]].join()', idx) == '1,2' and g.js('gameState.mistakes') == 0)
        g.tap_num(1)
        check('nog een tik haalt de notitie weg', g.js('i => [...gameState.notes[i]].join()', idx) == '2')
        g.page.click('#btn-notes')
        g.tap_num(g.wrong_values(idx)[0])
        g.page.click('.erase-btn')
        check('wissen maakt het vakje leeg', g.js('i => gameState.grid[i]', idx) == 0)
        given = g.js('gameState.given.findIndex(v => v !== 0)')
        g.tap_cell(given)
        g.page.click('.erase-btn')
        check('gegeven vakje kan niet gewist worden', g.js('i => gameState.grid[i] === gameState.given[i]', given))
        # notitie in buurvakje verdwijnt als het cijfer geplaatst wordt
        peer = g.js('([i, v]) => gameState.allPeers[i].find(p => gameState.grid[p] === 0 && gameState.solution[p] !== v)', [idx, val])
        g.js('([p, v]) => { gameState.notes[p].add(v); }', [peer, val])
        g.tap_cell(idx)
        g.tap_num(val)
        check('juist cijfer ruimt notities in rij/kolom/blok op', g.js('([p, v]) => !gameState.notes[p].has(v)', [peer, val]))

        # ------------------------------------------------------------
        section('4. Onafgemaakt spel bewaren en terug-knop')
        before = g.js('JSON.stringify([gameState.grid, gameState.mistakes, gameState.hintsUsed])')
        g.page.go_back()
        g.page.wait_for_timeout(300)
        check('terug-knop (Android) in spel → levelscherm, app blijft open', g.screen() == 'levels')
        g.js('i => startLevel(i)', six)
        check('level opnieuw openen gaat verder waar je was',
              g.js('JSON.stringify([gameState.grid, gameState.mistakes, gameState.hintsUsed])') == before)
        g.page.reload()
        g.start()
        g.js('i => startLevel(i)', six)
        check('ook na herladen van de app', g.js('JSON.stringify([gameState.grid, gameState.mistakes, gameState.hintsUsed])') == before)
        g.page.keyboard.press('Escape')
        check('Escape → levelscherm', g.screen() == 'levels')
        g.page.go_back()
        g.page.wait_for_timeout(300)
        check('terug op levelscherm → wereldkaart', g.screen() == 'worlds')
        g.js('i => startLevel(i, true)', 0)
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        g.page.go_back()
        g.page.wait_for_timeout(300)
        check('terug-knop sluit het win-venster', g.modal() is None and g.screen() == 'levels')

        # winnen en meteen weglopen mag geen sterren aan een ander level geven
        g.js('localStorage.setItem("sudokuKids_progress", "{}"); progress = {};')
        g.js('startLevel(0, true)')
        g.solve(skip=1)
        idx, val = g.open_cells()[0]
        g.js('([i, v]) => { onCellClick(i); onNumPress(v); startLevel(1, true); }', [idx, val])
        g.page.wait_for_timeout(800)
        check('snel doorklikken na winnen: alleen het gewonnen level krijgt sterren',
              list(g.stored().keys()) == ['w0_l0'] and g.modal() is None, g.stored())
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('5. Werelden ontgrendelen en voortgang wissen')
        g = Game(browser, url, progress=progress_for(0, 16))
        g.start()
        check('16 van 35 levels: wereld 2 nog dicht', g.js('isWorldUnlocked(1)') is False)
        g.close()
        g = Game(browser, url, progress=progress_for(0, 17))
        g.start()
        check('17 van 35 levels: wereld 2 open', g.js('isWorldUnlocked(1)') is True)
        g.page.click('#world-card-1')
        check('wereld 2 opent', g.screen() == 'levels' and g.js('currentWorld') == 1)
        g.page.click('#btn-levels-back')
        g.page.click('#btn-worlds-settings')
        g.page.click('#btn-reset-progress')
        g.page.click('#btn-confirm-no')
        check('annuleren wist niets', len(g.stored()) == 17)
        g.page.click('#btn-reset-progress')
        g.page.click('#btn-confirm-yes')
        check('reset wist alle sterren', g.stored() == {} and g.screen() == 'worlds')
        g.close()

        # ------------------------------------------------------------
        section('6. Taal, weergave en instellingen')
        g = Game(browser, url, locale='en-US')
        check('Engels toestel start in het Engels', g.js('document.getElementById("btn-start").textContent') == '▶ Play!')
        g.close()
        g = Game(browser, url, locale='ja-JP')
        check('onbekende taal valt terug op Engels', g.js('settings.language') == 'en')
        g.close()
        g = Game(browser, url, progress=progress_for(0, 35))
        check('Nederlands toestel start in het Nederlands', g.js('settings.language') == 'nl')
        g.start()
        g.page.click('#btn-worlds-settings')
        g.page.select_option('#setting-language', 'de')
        check('taal wisselt direct', g.js('document.querySelector("#screen-settings .screen-title").textContent') == 'Einstellungen')
        g.page.click('#btn-settings-back')
        g.js('startLevel(0, true)')
        check('weergaveknop toont waar je naartoe wisselt', g.js('document.getElementById("btn-display").textContent') == '🐶')
        g.page.click('#btn-display')
        check('dieren in rooster en knoppen', g.js('document.querySelector(".num-btn").textContent') == '🐶')
        g.page.reload()
        check('taal en weergave blijven na herladen', g.js('settings.language + settings.displayMode') == 'deanimals')
        g.js('startLevel(SudokuEngine.LEVEL_PLAN.find(l => l.type === "shapes").globalIndex, true)')
        check('fruit-level: fruit, geen weergaveknop',
              g.js('document.querySelector(".num-btn").textContent') == '🍎' and
              g.js('document.getElementById("btn-display").classList.contains("hidden")'))
        missing = g.js('''() => { const keys = Object.keys(STRINGS.nl), out = [];
            for (const lang of Object.keys(STRINGS)) for (const k of keys) if (!(k in STRINGS[lang])) out.push(lang + ':' + k);
            for (const el of document.querySelectorAll('[data-i18n],[data-i18n-aria]'))
              for (const k of [el.dataset.i18n, el.dataset.i18nAria]) if (k && !(k in STRINGS.nl)) out.push('html:' + k);
            return out; }''')
        check('alle teksten bestaan in nl/en/de/fr', not missing, missing)
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('7. Toetsenbord en toegankelijkheid')
        g = Game(browser, url, progress=progress_for(0, 35), reduced_motion='reduce')
        g.page.keyboard.press('Tab')
        g.page.keyboard.press('Enter')
        g.page.wait_for_timeout(450)
        check('Tab + Enter start het spel', g.screen() == 'worlds')
        focusable = g.js('''() => [...document.querySelectorAll('button, select, input, a')].filter(el => {
            const r = el.getBoundingClientRect();
            return r.width && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.screen:not(.active)'); }).length''')
        hidden_reachable = g.js('''() => [...document.querySelectorAll('.screen:not(.active) button')]
            .filter(el => getComputedStyle(el).visibility !== 'hidden').length''')
        check('verborgen schermen zijn niet met Tab te bereiken', hidden_reachable == 0 and focusable > 0, hidden_reachable)
        g.page.focus('#world-card-0')
        g.page.keyboard.press('Enter')
        check('wereldkaart is een echte knop (Enter werkt)', g.screen() == 'levels')
        g.js('startLevel(0, true)')
        g.page.keyboard.press('ArrowRight')
        check('pijltjestoets kiest een vakje', g.js('gameState.selected') == 0)
        idx, val = g.open_cells()[0]
        g.js('i => { gameState.selected = i; renderGrid(); }', idx)
        g.page.keyboard.press(str(val))
        check('cijfertoets vult in', g.js('i => gameState.grid[i] === gameState.solution[i]', idx))
        check('vakjes hebben een aria-label', g.js('document.querySelector(".sudoku-cell").getAttribute("aria-label")').startswith('rij 1, kolom 1'))
        unlabeled = g.js('''() => [...document.querySelectorAll('button')].filter(b =>
            !b.getAttribute('aria-label') && !/[\\p{L}\\p{N}]/u.test(b.textContent)).map(b => b.id || b.className)''')
        check('elke knop zonder tekst heeft een aria-label', not unlabeled, unlabeled)
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        check('prefers-reduced-motion: geen confetti', g.js('document.querySelectorAll(".confetti-piece").length') == 0)
        check('achtergrond is niet bedienbaar als een venster open is', g.js('document.getElementById("screen-game").inert'))
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('8. Alle 105 levels zijn uit te spelen')
        g = Game(browser, url)
        bad = g.js('''() => { const bad = [];
          for (const lv of SudokuEngine.LEVEL_PLAN) {
            startLevel(lv.globalIndex, true);
            gameState.given.forEach((v, i) => { if (!v) { onCellClick(i); onNumPress(gameState.solution[i]); } });
            const p = JSON.parse(localStorage.getItem('sudokuKids_progress'));
            if (!gameState.isComplete || gameState.mistakes || (p['w' + lv.world + '_l' + lv.indexInWorld] || {}).stars !== 3) bad.push(lv.globalIndex);
          }
          return bad; }''')
        check('105 levels opgelost met 3 sterren, 0 afgekeurde goede antwoorden', bad == [], bad)
        check('totaal 315 sterren opgeslagen', g.js('getTotalStars()') == 315)
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('9. Snelheid op een trage telefoon (CPU ×4 vertraagd)')
        g = Game(browser, url, progress=progress_for(0, 35))
        cdp = g.ctx.new_cdp_session(g.page)
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        gen = g.js('''() => { let worst = 0, total = 0, n = 0;
          for (const lv of SudokuEngine.LEVEL_PLAN) { if (lv.size !== 9) continue;
            const t0 = performance.now();
            SudokuEngine.generatePuzzle(lv.size, lv.type === 'xsudoku', lv.target, lv.seed);
            const ms = performance.now() - t0; worst = Math.max(worst, ms); total += ms; n++; }
          return [worst, total / n, n]; }''')
        print(f'     genereren 9×9: traagste {gen[0]:.1f} ms, gemiddeld {gen[1]:.1f} ms over {gen[2]} levels')
        check('9×9 genereren < 150 ms', gen[0] < 150, gen)
        nine = g.js('SudokuEngine.LEVEL_PLAN.findIndex(l => l.size === 9)')
        g.start()
        timing = g.js('''i => { let t0 = performance.now(); startLevel(i, true); void document.body.offsetHeight;
          const open = performance.now() - t0; let worst = 0;
          for (let c = 0; c < 81; c++) { t0 = performance.now(); onCellClick(c); void document.body.offsetHeight; worst = Math.max(worst, performance.now() - t0); }
          return [open, worst]; }''', nine)
        print(f'     9×9 openen: {timing[0]:.1f} ms, traagste tik op een vakje: {timing[1]:.1f} ms')
        check('9×9 level openen < 300 ms', timing[0] < 300, timing)
        check('tik op vakje < 50 ms', timing[1] < 50, timing)
        g.close()

        # ------------------------------------------------------------
        section('10. PWA: service worker, offline, geen externe verzoeken')
        g = Game(browser, url)
        g.page.wait_for_function('navigator.serviceWorker.controller !== null', timeout=15000)
        check('service worker actief', True)
        cached = g.js('caches.keys().then(async ks => [ks, (await (await caches.open(ks[0])).keys()).length])')
        sw_version = g.js('fetch("sw.js").then(r => r.text()).then(t => t.match(/CACHE_VERSION = \'(.+?)\'/)[1])')
        check(f'één cache met de huidige versie ({sw_version})', cached[0] == [sw_version] and cached[1] >= 11, cached)
        g.ctx.set_offline(True)
        g.page.reload()
        g.start()
        g.page.click('#world-card-0')
        g.page.click('.level-btn.current')
        g.page.wait_for_timeout(450)
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        check('offline: app laadt en een level is uit te spelen', True)
        g.page.goto(url + 'privacy.html')
        check('offline: privacypagina beschikbaar', 'Privacyverklaring' in g.page.content())
        g.ctx.set_offline(False)
        external = sorted({r for r in g.requests if not r.startswith(url)})
        check('geen enkel verzoek naar een ander domein', not external, external)
        manifest = json.loads((__import__('pathlib').Path(__file__).resolve().parent.parent / 'manifest.json').read_text())
        root = __import__('pathlib').Path(__file__).resolve().parent.parent
        files = [i['src'] for i in manifest['icons']] + [s['src'] for s in manifest['screenshots']]
        check('manifest: alle iconen en screenshots bestaan', all((root / f).exists() for f in files))
        purposes = {i['purpose'] for i in manifest['icons'] if i['sizes'] == '512x512'}
        check('manifest: 512px-icoon als any én maskable', purposes == {'any', 'maskable'}, purposes)
        check('manifest: naam, start_url, scope, display, kleuren',
              all(manifest.get(k) for k in ('name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color', 'id')))
        sw_assets = g.js('fetch("sw.js").then(r => r.text()).then(t => [...t.matchAll(/\'\\.\\/([^\']*)\'/g)].map(m => m[1]))')
        check('sw.js: alle bestanden in ASSETS bestaan', all((root / (a or 'index.html')).exists() for a in sw_assets), sw_assets)
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('11. Testversie en live versie zitten elkaar niet in de weg')
        live_url, test_url = url + 'sudoku-kids/', url + 'sudoku-kids-test/'
        g = Game(browser, live_url)
        g.page.wait_for_function('navigator.serviceWorker.controller !== null', timeout=15000)
        check('live: geen TEST-label, titel ongewijzigd',
              g.js('document.querySelector(".test-badge")') is None and g.page.title() == 'Sudoku Kids & Crazy Grids')
        g.start()
        g.js('startLevel(0, true)')
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        g.page.click('#btn-win-next')
        idx, val = g.open_cells()[0]
        g.tap_cell(idx)
        g.tap_num(val)
        g.js('setDisplayMode("animals")')
        live_before = g.js('JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))')
        check('live: gebruikt de bestaande sleutels zonder prefix',
              g.js('Object.keys(localStorage).sort().join()') == 'sudokuKids_current,sudokuKids_progress,sudokuKids_settings')
        check('live: cache heet sudoku-kids-v3', g.js('caches.keys()') == ['sudoku-kids-v3'], g.js('caches.keys()'))

        g.page.goto(test_url)
        g.page.wait_for_function('navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL.includes("-test/")', timeout=15000)
        check('test: label TEST zichtbaar op elk scherm',
              g.js('(() => { const b = document.querySelector(".test-badge"); const r = b.getBoundingClientRect(); return b.textContent.startsWith("TEST") && r.width > 0 && r.top >= 0; })()'))
        check('test: titel begint met TEST', g.page.title().startswith('TEST'))
        check('test: eigen service-worker-scope',
              g.js('navigator.serviceWorker.getRegistrations().then(rs => rs.map(r => new URL(r.scope).pathname).sort().join())')
              == '/sudoku-kids-test/,/sudoku-kids/')
        check('test: begint zonder de sterren van live', g.js('getTotalStars()') == 0 and g.js('settings.displayMode') == 'numbers')
        g.start()
        g.js('startLevel(0, true)')
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        check('test: slaat op onder test_-sleutels',
              g.js('JSON.parse(localStorage.getItem("test_sudokuKids_progress")).w0_l0.stars') == 3)
        g.page.click('#btn-win-home')
        g.page.click('#btn-levels-back')
        g.page.click('#btn-worlds-settings')
        g.page.select_option('#setting-language', 'fr')
        g.page.click('#btn-reset-progress')
        g.page.click('#btn-confirm-yes')
        check('test: voortgang wissen wist alleen de test', g.js('localStorage.getItem("test_sudokuKids_progress")') == '{}')
        check('live-opslag is byte voor byte ongewijzigd na spelen, instellen en wissen in de test',
              g.js('JSON.stringify(Object.keys(localStorage).filter(k => !k.startsWith("test_")).sort().map(k => [k, localStorage.getItem(k)]))') == live_before)
        check('twee caches naast elkaar: live en test', g.js('caches.keys().then(k => k.sort())') == ['sudoku-kids-test-v3', 'sudoku-kids-v3'], g.js('caches.keys()'))
        g.page.goto(live_url)
        check('terug op live: sterren, taal en onafgemaakt spel staan er nog',
              g.js('getTotalStars()') == 3 and g.js('settings.language') == 'nl' and g.js('settings.displayMode') == 'animals'
              and g.js('JSON.parse(localStorage.getItem("sudokuKids_current")).i') == 1)
        check('geen console-errors', not g.errors, g.errors)
        g.close()
        browser.close()

    failed = results.count(False)
    print(f'\n{"❌" if failed else "✅"} {len(results) - failed}/{len(results)} controles geslaagd.')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(run())
