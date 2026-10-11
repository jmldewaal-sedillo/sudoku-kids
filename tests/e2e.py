#!/usr/bin/env python3
"""End-to-end test van de belangrijkste flows (Playwright, headless Chromium).

    python3 tests/e2e.py

Start zelf een lokale server, speelt het spel via echte tikken en controleert
spelregels, opslaan, terug-knop, talen, offline en snelheid.
Exitcode 1 als een controle faalt.
"""
import json
import re
import sys

from playwright.sync_api import sync_playwright

from screenshots import ROOT, serve

CACHE_VERSION = re.search(r"CACHE_VERSION = '(.+?)'", (ROOT / 'sw.js').read_text()).group(1)
TEST_CACHE = CACHE_VERSION.replace('sudoku-kids-', 'sudoku-kids-test-')

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

    def parent_hold(self, ms=3300):
        """Ouderslot: de knop ingedrukt houden."""
        self.page.wait_for_selector('#modal-parent:not(.hidden)')
        self.page.click('#btn-parent-hold', delay=ms)

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
        idx, val, peer = g.js('''() => { for (let i = 0; i < gameState.grid.length; i++) {
            if (gameState.grid[i] === gameState.solution[i]) continue;
            const p = gameState.allPeers[i].find(q => gameState.grid[q] === 0);
            if (p !== undefined) return [i, gameState.solution[i], p]; } }''')
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
        g.page.click('#btn-parent-hold', delay=800)
        check('ouderslot: kort indrukken doet niets', g.modal() == 'modal-parent')
        g.parent_hold()
        g.page.click('#btn-confirm-no')
        check('annuleren wist niets', len(g.stored()) == 17)
        g.page.click('#btn-reset-progress')
        g.parent_hold()
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
        bank = g.js('''() => { let worst = 0, n = 0; const t00 = performance.now();
          for (const kind of Object.keys(SudokuEngine.BANDS)) for (const band of SudokuEngine.BANDS[kind])
            for (const p of SudokuEngine.bankOf(SudokuEngine.bandId(kind, band))) {
              const t0 = performance.now(); SudokuEngine.getVariant(p.id); worst = Math.max(worst, performance.now() - t0); n++; }
          return [worst, (performance.now() - t00) / n, n]; }''')
        print(f'     puzzel uit de voorraad klaarzetten: traagste {bank[0]:.1f} ms, gemiddeld {bank[1]:.2f} ms over {bank[2]} puzzels')
        check('puzzel uit de voorraad klaarzetten < 100 ms', bank[0] < 100 and bank[2] == 3700, bank)
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
        check(f'één cache met de huidige versie ({sw_version})', cached[0] == [sw_version] and cached[1] >= 13, cached)
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
              g.js('Object.keys(localStorage).sort().join()') == 'sudokuKids_current,sudokuKids_played,sudokuKids_progress,sudokuKids_settings')
        check(f'live: cache heet {CACHE_VERSION}', g.js('caches.keys()') == [CACHE_VERSION], g.js('caches.keys()'))

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
        g.parent_hold()
        g.page.click('#btn-confirm-yes')
        check('test: voortgang wissen wist alleen de test', g.js('localStorage.getItem("test_sudokuKids_progress")') == '{}')
        check('live-opslag is byte voor byte ongewijzigd na spelen, instellen en wissen in de test',
              g.js('JSON.stringify(Object.keys(localStorage).filter(k => !k.startsWith("test_")).sort().map(k => [k, localStorage.getItem(k)]))') == live_before)
        check('twee caches naast elkaar: live en test', g.js('caches.keys().then(k => k.sort())') == [TEST_CACHE, CACHE_VERSION], g.js('caches.keys()'))
        g.page.goto(live_url)
        check('terug op live: sterren, taal en onafgemaakt spel staan er nog',
              g.js('getTotalStars()') == 3 and g.js('settings.language') == 'nl' and g.js('settings.displayMode') == 'animals'
              and g.js('JSON.parse(localStorage.getItem("sudokuKids_current")).i') == 1)
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('12. Meer puzzels per level (stap 3)')
        g = Game(browser, url)
        g.start()
        g.js('startLevel(0)')
        first = g.js('gameState.pid')
        check('eerste keer: de eigen puzzel van het level (variant 1)', first == 'L0' and
              g.js('gameState.given.join("") === SudokuEngine.getPuzzle(0).given.join("")'))
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        g.page.click('#btn-win-replay')
        second = g.js('gameState.pid')
        band = g.js('SudokuEngine.levelBand(0)')
        check('opnieuw spelen geeft een andere puzzel uit dezelfde band',
              second != first and second in g.js('b => SudokuEngine.bankOf(b).map(p => p.id)', band), second)
        check('die puzzel heeft evenveel gegeven vakjes', g.js('gameState.given.filter(v => v).length') == 11)
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        check('sterren blijven per level (één regel voor level 1)', list(g.stored().keys()) == ['w0_l0'])
        g.page.click('#btn-win-home')
        seen = g.js('''() => { const ids = [];
            for (let k = 0; k < 99; k++) { startLevel(0, true); ids.push(gameState.pid); }
            return ids; }''')
        check('nog 99 keer opnieuw: samen 100 verschillende puzzels uit de voorraad, geen herhaling', len(set(seen + [second])) == 100 and first not in seen)
        check('gespeelde puzzels worden per profiel bijgehouden', len(g.stored('sudokuKids_played')[band]) == 101)
        again = g.js('(() => { startLevel(0, true); return gameState.pid; })()')
        check('band op: pas dan komt er een herhaling (niet dezelfde als net)', again in seen + [second] and again != seen[-1], again)
        # onafgemaakt spel houdt zijn eigen puzzel
        idx, val = g.open_cells()[0]
        g.tap_cell(idx)
        g.tap_num(val)
        pid, grid = g.js('gameState.pid'), g.js('gameState.grid.join("")')
        g.page.reload()
        g.start()
        g.js('startLevel(0)')
        check('verder spelen na herladen: dezelfde puzzel en zetten', g.js('gameState.pid') == pid and g.js('gameState.grid.join("")') == grid)
        # level 2 deelt de band met level 1: krijgt eerst zijn eigen puzzel
        g.js('startLevel(1, true)')
        check('ander level in dezelfde band begint met zijn eigen puzzel', g.js('gameState.pid') == 'L1')
        ok = g.js('''() => { const bad = [];
            for (const kind of Object.keys(SudokuEngine.BANDS)) for (const band of SudokuEngine.BANDS[kind])
              for (const p of SudokuEngine.bankOf(SudokuEngine.bandId(kind, band)).slice(0, 5)) {
                const lv = SudokuEngine.LEVEL_PLAN.find(l => SudokuEngine.kindOf(l) === kind);
                const v = SudokuEngine.getVariant(p.id);
                if (!v || !SudokuEngine.isValidSolution(v.solution, lv.size, lv.type === 'xsudoku')) bad.push(p.id);
              }
            return bad; }''')
        check('voorraad is in de browser te laden (5 per band gecontroleerd)', ok == [], ok)
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('13. Profielen (stap 4)')
        # Migratie: opslag precies zoals versie 3 hem achterliet
        v3 = {
            'sudokuKids_progress': {'w0_l0': {'stars': 3, 'time': 12}, 'w0_l1': {'stars': 2, 'time': 40}},
            'sudokuKids_settings': {'sound': False, 'language': 'de', 'highlightErrors': True, 'displayMode': 'animals'},
        }
        g = Game(browser, url)
        cur = g.js('''() => { const E = SudokuEngine, p = E.getPuzzle(2), grid = p.given.slice(), i = grid.indexOf(0);
            grid[i] = p.solution[i];
            return { i: 2, grid, notes: grid.map(() => []), tried: grid.map(() => []), mistakes: 1, hintsUsed: 1, secs: 77 }; }''')
        v3['sudokuKids_current'] = cur
        g.js('data => { localStorage.clear(); for (const k in data) localStorage.setItem(k, JSON.stringify(data[k])); }', v3)
        before = g.js('JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))')
        g.page.reload()
        check('migratie: v3-voortgang is het eerste profiel (5 sterren, Duits, dieren, geluid uit)',
              g.js('getTotalStars()') == 5 and g.js('settings.language + settings.displayMode + settings.sound') == 'deanimalsfalse'
              and g.js('SudokuStorage.profiles().length') == 1)
        check('migratie: opslag is niet aangeraakt door alleen te starten',
              g.js('JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))') == before)
        g.start()
        g.js('startLevel(2)')
        check('migratie: onafgemaakt v3-spel gaat verder (1 fout, 1 hint, 77 s)',
              g.js('[gameState.pid, gameState.mistakes, gameState.hintsUsed, gameState.timerSecs].join()') == 'L2,1,1,77'
              and g.js('gameState.grid.join("")') == ''.join(map(str, cur['grid'])))
        g.js('leaveGame(); goToWorlds()')

        g.page.click('#btn-profile')
        check('tik op de kat opent het profielscherm in de app', g.screen() == 'profiles' and len(g.ctx.pages) == 1)
        g.page.click('#btn-profile-add')
        g.page.click('.avatar-btn >> nth=4')
        g.page.fill('#profile-name', '<img src=x onerror=alert(1)>')
        g.page.click('#btn-profile-save')
        check('nieuw profiel is actief en begint leeg', g.js('profileId') == 'p2' and g.js('getTotalStars()') == 0 and g.screen() == 'worlds')
        check('nieuw profiel neemt taal en geluid over', g.js('settings.language + settings.sound') == 'defalse')
        g.page.click('#btn-profile')
        check('naam wordt als tekst getoond, nooit als HTML',
              g.js('document.querySelectorAll("#profiles-list img").length') == 0 and
              g.js('document.querySelector(".profile-card.active .profile-name").textContent') == '<img src=x o')
        g.page.click('.profile-card.active .profile-edit')
        g.page.fill('#profile-name', 'Sam')
        g.page.click('#btn-profile-save')
        check('hernoemen', g.js('SudokuStorage.profile("p2").name') == 'Sam' and g.js('SudokuStorage.profile("p2").avatar') == '🦊')
        g.js('goToWorlds(); startLevel(0)')
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        g.page.click('#btn-win-home')
        check('eigen voortgang onder eigen sleutels; profiel 1 houdt de oude sleutels',
              g.stored('sudokuKids_p2_progress') == {'w0_l0': {'stars': 3, 'time': 0}} and len(g.stored('sudokuKids_progress')) == 2)
        g.js('settings.size = "large"; settings.displayMode = "numbers"; saveSettings()')
        g.js('goToWorlds()')
        g.page.click('#btn-profile')
        g.page.click('.profile-card[data-id="p1"] .profile-pick')
        check('wisselen: profiel 1 heeft zijn eigen sterren en instellingen terug',
              g.js('getTotalStars()') == 5 and g.js('settings.displayMode + settings.size') == 'animalsnormal')
        g.page.reload()
        check('gekozen profiel blijft na herladen', g.js('profileId') == 'p1')
        g.start()
        # maximaal 6
        g.js('for (let i = 0; i < 4; i++) SudokuStorage.createProfile("K" + i, SudokuStorage.AVATARS[i])')
        g.page.click('#btn-profile')
        check('maximaal 6 profielen: knop "nieuw" verdwijnt',
              g.js('document.querySelectorAll(".profile-card").length') == 6 and
              g.js('document.getElementById("btn-profile-add").classList.contains("hidden")') and
              g.js('SudokuStorage.createProfile("x", "🐱")') is None)
        # verwijderen achter het ouderslot
        g.page.click('.profile-card[data-id="p2"] .profile-edit')
        g.page.click('#btn-profile-delete')
        check('verwijderen vraagt eerst het ouderslot', g.modal() == 'modal-parent')
        g.page.click('#btn-parent-hold', delay=1000)
        check('1 seconde indrukken is niet genoeg', g.modal() == 'modal-parent' and g.js('SudokuStorage.profiles().length') == 6)
        g.parent_hold()
        check('daarna nog een bevestiging met naam en plaatje', g.modal() == 'modal-delete' and 'Sam' in g.js('document.getElementById("delete-text").textContent'))
        g.page.click('#btn-delete-yes')
        check('profiel en al zijn gegevens zijn weg; de rest staat er nog',
              g.js('SudokuStorage.profiles().length') == 5 and
              g.js('Object.keys(localStorage).filter(k => k.includes("_p2_")).length') == 0 and
              len(g.stored('sudokuKids_progress')) == 2)
        g.js('["p3","p4","p5","p6"].forEach(id => SudokuStorage.deleteProfile(id)); buildProfiles()')
        g.page.click('.profile-card .profile-edit')
        check('het laatste profiel kan niet verwijderd worden', g.js('document.getElementById("btn-profile-delete").classList.contains("hidden")'))
        g.page.click('#btn-profile-cancel')
        g.page.click('#btn-link-account')
        check('"Account koppelen" zit achter het ouderslot', g.modal() == 'modal-parent')
        g.parent_hold()
        check('en toont "Binnenkort beschikbaar" (Duits: Bald verfügbar)',
              g.modal() == 'modal-info' and 'Bald verfügbar' in g.js('document.getElementById("info-text").textContent'))
        g.page.click('#btn-info-ok')
        check('opslag is een uitwisselbare laag (lokale provider)', g.js('SudokuStorage.providerName') == 'local' and g.js('SudokuStorage.canLinkAccount()') is False)
        swapped = g.js('''() => { const mem = {};
            SudokuStorage.setProvider({ name: 'mem', readIndex: () => mem.index || null, writeIndex: v => { mem.index = v; },
              read: (id, part) => mem[id + part] || null, write: (id, part, v) => { mem[id + part] = v; }, remove: (id, part) => { delete mem[id + part]; },
              linkAccount: () => {} });
            loadProfile(SudokuStorage.activeId()); progress.w0_l5 = { stars: 1, time: 1 }; saveProgress();
            return [SudokuStorage.providerName, SudokuStorage.canLinkAccount(), JSON.stringify(mem.p1progress), localStorage.getItem('sudokuKids_progress').includes('w0_l5')]; }''')
        check('andere provider inpluggen werkt zonder de rest aan te passen', swapped == ['mem', True, '{"w0_l5":{"stars":1,"time":1}}', False], swapped)
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('14. Zoomen, meeschalen en grootte (stap 2)')
        g = Game(browser, url, w=1920, h=1080, progress=progress_for(0, 35))
        viewport = g.js('document.querySelector("meta[name=viewport]").content')
        check('zoomen is niet geblokkeerd (geen user-scalable=no / maximum-scale)', 'user-scalable' not in viewport and 'maximum-scale' not in viewport, viewport)
        g.start()
        nine = g.js('SudokuEngine.LEVEL_PLAN.findIndex(l => l.size === 9)')
        g.js('i => startLevel(i, true)', nine)
        check('knijpen mag, dubbeltik-zoom niet (touch-action: manipulation op vakjes en knoppen)',
              g.js('getComputedStyle(document.querySelector(".sudoku-cell")).touchAction') == 'manipulation' and
              g.js('getComputedStyle(document.querySelector(".num-btn")).touchAction') == 'manipulation')
        box = lambda sel: g.js('s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }', sel)
        grid = box('#sudoku-grid')
        buttons = g.js('(() => { const r = [...document.querySelectorAll(".num-btn")].map(b => b.getBoundingClientRect()); return [Math.min(...r.map(x => x.left)), Math.max(...r.map(x => x.right))]; })()')
        check('groot scherm: raster en knoppen staan bij elkaar', buttons[0] - grid[2] < 120, buttons[0] - grid[2])
        check('groot scherm: het geheel staat in het midden', abs(grid[0] - (1920 - buttons[1])) < 60, [grid[0], 1920 - buttons[1]])
        check('kop loopt over de hele breedte', g.js('document.querySelector(".game-header").getBoundingClientRect().width') == 1920)
        w_normal = grid[2] - grid[0]
        g.page.set_viewport_size({'width': 1000, 'height': 700})
        g.page.wait_for_timeout(120)
        grid2 = box('#sudoku-grid')
        check('venster kleiner maken: raster schaalt direct mee en blijft in beeld',
              grid2[2] - grid2[0] < w_normal and grid2[3] <= 700 and box('#numpad')[2] <= 1000, grid2)
        g.page.set_viewport_size({'width': 500, 'height': 900})
        g.page.wait_for_timeout(120)
        grid3, pad3 = box('#sudoku-grid'), box('#numpad')
        check('smal venster: knoppen springen onder het raster', pad3[1] >= grid3[3] and grid3[2] <= 500)
        g.page.set_viewport_size({'width': 960, 'height': 540})      # = 1920×1080 op 200% zoom
        g.page.wait_for_timeout(120)
        z = g.js('''() => [...document.querySelectorAll('#screen-game button, .sudoku-cell')].filter(el => { const r = el.getBoundingClientRect();
            return r.width && (r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight); }).length''')
        check('Ctrl + tot 200% (960×540 css-pixels): alles blijft in beeld', z == 0, z)
        g.page.set_viewport_size({'width': 1920, 'height': 1080})
        g.js('leaveGame(); goToSettings()')
        widths = {}
        for size in ('small', 'normal', 'large'):
            g.page.click(f'.size-btn[data-size="{size}"]')
            g.js('i => startLevel(i, true)', nine)
            b = box('#sudoku-grid')
            widths[size] = round(b[2] - b[0])
            g.js('leaveGame(); goToSettings()')
        check('Grootte klein < normaal < groot', widths['small'] < widths['normal'] < widths['large'], widths)
        check('de drie knoppen hebben een plaatje en de gekozen is gemarkeerd',
              g.js('document.querySelectorAll(".size-btn .size-pic").length') == 3 and
              g.js('document.querySelector(".size-btn.active").dataset.size') == 'large')
        g.js('SudokuStorage.createProfile("B", "🐶"); switchProfile("p2")')
        check('grootte is per profiel: nieuw profiel staat op normaal', g.js('settings.size') == 'normal')
        g.js('switchProfile("p1")')
        g.page.reload()
        check('en profiel 1 houdt "groot" na herladen', g.js('settings.size') == 'large' and g.js('document.body.classList.contains("ui-large")'))
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('15. Formaat-balk: alleen in de testversie (stap 1)')
        g = Game(browser, test_url + '?preview=on', w=1500, h=900)
        g.page.wait_for_selector('#pv-toolbar')
        labels = g.js('[...document.querySelectorAll("#pv-toolbar .pv-btn")].map(b => b.textContent.trim())')
        check('balk met 6 knoppen', labels == ['Klein 360×640', 'Standaard 390×844', 'Liggend 844×390', 'Staand 800×1280', 'Liggend 1280×800', 'Volledig scherm'], labels)
        frame = g.page.frame_locator('#pv-iframe')
        frame.locator('#btn-start').wait_for()
        check('app draait in een iframe met ?frame=1', g.js('document.getElementById("pv-iframe").getAttribute("src")') == './?frame=1')
        check('standaard: telefoon 390×844', g.js('[document.getElementById("pv-iframe").clientWidth, document.getElementById("pv-iframe").clientHeight]') == [390, 844])
        check('in het frame: geen balk, wel het TEST-label',
              frame.locator('#pv-toolbar').count() == 0 and frame.locator('.test-badge').count() == 1)
        check('buitenste pagina start het spel niet zelf', g.js('document.querySelector(".test-badge")') is None and g.js('getComputedStyle(document.getElementById("screen-splash")).display') == 'none')
        sizes = {}
        for key in ('phone-s', 'phone-l', 'tablet', 'tablet-l', 'full'):
            g.page.click(f'.pv-btn[data-size="{key}"]')
            sizes[key] = g.js('[document.getElementById("pv-iframe").clientWidth, document.getElementById("pv-iframe").clientHeight]')
        stage = g.js('[document.getElementById("pv-stage").clientWidth, document.getElementById("pv-stage").clientHeight]')
        check('elke knop zet het juiste formaat',
              [sizes[k] for k in ('phone-s', 'phone-l', 'tablet', 'tablet-l')] == [[360, 640], [844, 390], [800, 1280], [1280, 800]] and sizes['full'] == stage, sizes)
        g.page.click('.pv-btn[data-size="tablet-l"]')
        frame.locator('#btn-start').click()
        frame.locator('#world-card-0').click()
        frame.locator('.level-btn.current').click()
        frame.locator('.sudoku-cell').first.wait_for()
        check('in het frame is het spel te spelen (tablet liggend)', frame.locator('.sudoku-cell').count() == 16)
        g.page.reload()
        g.page.wait_for_selector('#pv-toolbar')
        check('laatste keuze wordt onthouden', g.js('document.querySelector(".pv-btn.active").dataset.size') == 'tablet-l' and
              g.js('localStorage.getItem("test_sudokuKids_preview")') == 'tablet-l')
        check('geen console-errors', not g.errors, g.errors)
        g.close()
        g = Game(browser, test_url)
        check('testversie onder een automatische test of op een telefoon: geen balk, gewoon de app',
              g.js('document.getElementById("pv-root")') is None and g.js('document.querySelector(".test-badge") !== null'))
        g.close()
        g = Game(browser, live_url + '?preview=on', w=1500, h=900)
        g.page.wait_for_timeout(800)
        check('LIVE-pad, zelfs met ?preview=on: geen balk, geen iframe, geen TEST-label',
              g.js('document.getElementById("pv-root")') is None and g.js('document.querySelectorAll("iframe").length') == 0
              and g.js('document.querySelector(".test-badge")') is None and g.js('wantsTestPreview()') is False)
        check('LIVE-pad: test-preview.js wordt nooit opgevraagd', not [r for r in g.requests if 'test-preview' in r], g.requests)
        g.start()
        check('LIVE-pad: de app start gewoon', g.screen() == 'worlds')
        check('geen console-errors', not g.errors, g.errors)
        g.close()
        browser.close()

    failed = results.count(False)
    print(f'\n{"❌" if failed else "✅"} {len(results) - failed}/{len(results)} controles geslaagd.')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(run())
