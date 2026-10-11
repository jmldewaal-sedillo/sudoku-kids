#!/usr/bin/env python3
"""End-to-end test van de belangrijkste flows (Playwright, headless Chromium).

    python3 tests/e2e.py

Start zelf een lokale server, speelt het spel via echte tikken en controleert
spelregels, opslaan, terug-knop, talen, offline en snelheid.
Exitcode 1 als een controle faalt.
"""
import json
import pathlib
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

    def parent_hold(self, ms=1700):
        """Ouderslot: de knop twee keer achter elkaar ingedrukt houden."""
        self.page.wait_for_selector('#modal-parent:not(.hidden)')
        self.page.click('#btn-parent-hold', delay=ms)
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
        check('open zijn alleen het eerste level van elk blok (4×4 en 6×6)',
              g.js('[...document.querySelectorAll(".level-btn:not(.locked)")].map(b => b.querySelector(".level-number").textContent).join()') == '1,51')
        g.page.click('.level-btn[data-level="0"]')
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
        check('win-venster met 2 sterren (1 fout)', g.js('document.getElementById("win-stars").dataset.stars') == '2' and g.js('document.querySelectorAll("#win-stars svg").length') == 3)
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
        check('4×4: sterren-teller toont 1 ster', g.js('document.getElementById("lives-display").dataset.stars') == '1')
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        check('4×4: toch uitgespeeld met 1 ster', g.js('document.getElementById("win-stars").dataset.stars') == '1')
        check('betere score blijft staan (3 sterren van eerder)', g.stored()['w0_l0']['stars'] == 3)
        g.page.click('#btn-win-home')

        six = g.js('SudokuEngine.LEVEL_PLAN.find(l => l.size === 6).globalIndex')
        g.js('i => startLevel(i, true)', six)
        check('6×6: drie hartjes', g.js('document.getElementById("lives-display").dataset.lives') == '3')
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
        g.page.click('#btn-parent-hold', delay=600)
        check('ouderslot: kort indrukken doet niets', g.modal() == 'modal-parent' and g.js('document.getElementById("btn-parent-hold").dataset.holds') == '0')
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
        check('Engels toestel start in het Engels', g.js('document.getElementById("btn-start").textContent') == 'Play!')
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
        check('weergaveknop toont waar je naartoe wisselt', g.js('document.getElementById("btn-display").dataset.shows') == 'animals' and g.js('document.querySelectorAll("#btn-display svg").length') == 1)
        g.page.click('#btn-display')
        check('dieren in rooster en knoppen', g.js('document.querySelectorAll(".num-btn[data-num] svg").length') == 4 and g.js('document.querySelectorAll(".sudoku-cell.given svg").length') > 0)
        g.page.reload()
        check('taal en weergave blijven na herladen', g.js('settings.language + settings.displayMode') == 'deanimals')
        g.js('startLevel(SudokuEngine.LEVEL_PLAN.find(l => l.type === "shapes").globalIndex, true)')
        check('fruit-level: fruit, geen weergaveknop',
              g.js('document.querySelectorAll(".num-btn[data-num] svg").length') == g.js('gameState.size') and
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
        section('8. Alle 450 levels zijn uit te spelen')
        g = Game(browser, url)
        bad = g.js('''() => { const bad = [];
          for (const lv of SudokuEngine.LEVEL_PLAN) {
            startLevel(lv.globalIndex, true);
            gameState.given.forEach((v, i) => { if (!v) { onCellClick(i); onNumPress(gameState.solution[i]); } });
            const p = JSON.parse(localStorage.getItem('sudokuKids_progress'));
            if (!gameState.isComplete || gameState.mistakes || (p['w' + lv.world + '_l' + lv.indexInWorld] || {}).stars !== 3) bad.push(lv.globalIndex);
          }
          return bad; }''')
        check('alle 450 levels opgelost met 3 sterren, 0 afgekeurde goede antwoorden', bad == [] and g.js('SudokuEngine.LEVEL_PLAN.length') == 450, bad)
        check('totaal 1350 sterren opgeslagen', g.js('getTotalStars()') == 1350)
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('9. Snelheid op een trage telefoon (CPU ×4 vertraagd)')
        g = Game(browser, url, progress=progress_for(0, 35))
        cdp = g.ctx.new_cdp_session(g.page)
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        gen = g.js('''() => { let worst = 0, total = 0, n = 0;
          for (const lv of SudokuEngine.LEVEL_PLAN.slice(0, SudokuEngine.LEGACY_LEVELS)) { if (lv.size !== 9) continue;
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
        g.page.click('.level-btn[data-level="0"]')
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
              g.js('Object.keys(localStorage).sort().join()') == 'sudokuKids_current,sudokuKids_history,sudokuKids_inbox,sudokuKids_played,sudokuKids_progress,sudokuKids_settings,sudokuKids_stats')
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
        pool = g.js('b => SudokuEngine.poolOf(b).length', band)       # voorraad minus de eigen puzzels van levels
        seen = g.js('''n => { const ids = [];
            for (let k = 0; k < n; k++) { startLevel(0, true); ids.push(gameState.pid); }
            return ids; }''', pool - 1)
        check(f'nog {pool - 1} keer opnieuw: alle {pool} vrije puzzels van de band, geen enkele herhaling',
              pool >= 50 and len(set(seen + [second])) == pool and first not in seen)
        check('gespeelde puzzels worden per profiel bijgehouden', len(g.stored('sudokuKids_played')[band]) == pool + 1)
        check('de eigen puzzel van een ander level wordt nooit als herhaling uitgedeeld',
              not g.js('ids => ids.some(id => SudokuEngine.LEVEL_PLAN.some(l => l.pid === id))', seen + [second]))
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
        old_keys = '["sudokuKids_progress","sudokuKids_settings","sudokuKids_current"]'
        check('migratie: de bestaande sleutels zijn onaangeroerd; erbij komen alleen stats, history en inbox',
              g.js('JSON.stringify(%s.sort().map(k => [k, localStorage.getItem(k)]))' % old_keys) == before and
              g.js('Object.keys(localStorage).sort().join()') == 'sudokuKids_current,sudokuKids_history,sudokuKids_inbox,sudokuKids_progress,sudokuKids_settings,sudokuKids_stats')
        g.start()
        g.js('startLevel(2)')
        check('migratie: onafgemaakt v3-spel gaat verder (1 fout, 1 hint, 77 s)',
              g.js('[gameState.pid, gameState.mistakes, gameState.hintsUsed, gameState.timerSecs].join()') == 'L2,1,1,77'
              and g.js('gameState.grid.join("")') == ''.join(map(str, cur['grid'])))
        g.js('leaveGame(); goToWorlds()')

        g.page.click('#btn-score')
        check('tik op de ster met de score opent de profielpagina van de speler (in de app)',
              g.screen() == 'profile' and g.js('viewedProfile') == 'p1' and len(g.ctx.pages) == 1)
        check('profielpagina: grote avatar, naam, 4 cijfers, 5 werelden, 4 badges',
              g.js('document.querySelectorAll("#profile-avatar svg").length') == 1 and
              g.js('[...document.querySelectorAll(".stat-card b")].map(b => b.textContent).join()') == '5,2,2,–' and
              g.js('document.querySelectorAll(".profile-tab").length') == 3 and
              g.js('document.querySelectorAll(".badge-tile").length') == 100)
        g.page.click('#tab-worlds')
        check('sterren per wereld kloppen', g.js('document.querySelectorAll(".wp-card").length') == 5 and
              g.js('document.querySelector(".wp-card[data-world=\'0\'] .wp-stars b").textContent') == '5')
        g.page.click('#btn-profile-back')
        check('terug vanaf de eigen pagina → wereldkaart', g.screen() == 'worlds')
        g.page.click('#btn-switch')
        check('wisselknopje opent de spelerslijst', g.screen() == 'profiles')
        check('spelerslijst heeft geen potlood meer', g.js('document.querySelectorAll("#profiles-list .profile-edit, #profiles-list [data-icon=pencil]").length') == 0)
        g.page.click('#btn-profile-add')
        check('nieuw profiel: meteen in bewerkmodus', g.screen() == 'profile' and g.js('!document.getElementById("profile-edit").classList.contains("hidden")'))
        g.page.click('.avatar-btn[data-avatar="fox"]')
        g.page.fill('#profile-name', '<img src=x onerror=alert(1)>')
        g.page.click('#btn-profile-save')
        check('nieuw profiel is actief en begint leeg', g.js('profileId') == 'p2' and g.js('getTotalStars()') == 0 and g.screen() == 'profile')
        check('nieuw profiel neemt taal en geluid over', g.js('settings.language + settings.sound') == 'defalse')
        check('naam wordt als tekst getoond, nooit als HTML',
              g.js('document.querySelectorAll("#screen-profile img").length') == 0 and
              g.js('document.getElementById("profile-name-text").textContent') == '<img src=x o')
        g.page.click('#btn-profile-edit')
        check('potlood naast de naam zet de pagina in bewerkmodus', g.js('!document.getElementById("profile-edit").classList.contains("hidden") && document.getElementById("profile-view").classList.contains("hidden")'))
        g.page.fill('#profile-name', 'Tim')
        g.page.click('#btn-profile-cancel')
        check('annuleren bewaart niets', g.js('SudokuStorage.profile("p2").name') == '<img src=x o')
        g.page.click('#btn-profile-edit')
        g.page.fill('#profile-name', 'Sam')
        g.page.click('#btn-profile-save')
        check('hernoemen en opslaan', g.js('SudokuStorage.profile("p2").name') == 'Sam' and g.js('SudokuStorage.profile("p2").avatar') == 'fox'
              and g.js('document.getElementById("profile-name-text").textContent') == 'Sam')
        g.js('goToWorlds(); startLevel(0)')
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        g.page.click('#btn-win-home')
        check('eigen voortgang onder eigen sleutels; profiel 1 houdt de oude sleutels',
              list(g.stored('sudokuKids_p2_progress')) == ['w0_l0'] and g.stored('sudokuKids_p2_progress')['w0_l0']['stars'] == 3 and len(g.stored('sudokuKids_progress')) == 2)
        g.js('settings.size = "small"; settings.displayMode = "numbers"; saveSettings()')
        g.js('goToWorlds()')
        g.page.click('#btn-switch')
        g.page.click('.profile-card[data-id="p1"]')
        check('tik op een speler opent zijn profielpagina en gaat NIET naar het startscherm',
              g.screen() == 'profile' and g.js('viewedProfile') == 'p1' and g.js('profileId') == 'p2')
        check('knop "Spelen als <naam>"', g.js('document.getElementById("btn-play-as").textContent') == 'Als Spieler spielen')
        g.page.click('#btn-profile-back')
        check('terug vanaf een speler uit de lijst → de lijst', g.screen() == 'profiles')
        g.page.click('.profile-card[data-id="p1"]')
        g.page.click('#btn-play-as')
        check('"Spelen als" maakt het profiel actief, met eigen sterren en instellingen',
              g.js('profileId') == 'p1' and g.screen() == 'worlds' and g.js('getTotalStars()') == 5 and g.js('settings.displayMode + settings.size') == 'animalslarge')
        g.page.reload()
        check('gekozen profiel blijft na herladen', g.js('profileId') == 'p1')
        g.start()
        # maximaal 6
        g.js('for (let i = 0; i < 4; i++) SudokuStorage.createProfile("K" + i, SudokuStorage.AVATARS[i])')
        g.page.click('#btn-switch')
        check('maximaal 6 profielen: knop "nieuw" verdwijnt',
              g.js('document.querySelectorAll(".profile-card").length') == 6 and
              g.js('document.getElementById("btn-profile-add").classList.contains("hidden")') and
              g.js('SudokuStorage.createProfile("x", "cat")') is None)
        # verwijderen achter het dubbele ouderslot
        g.page.click('.profile-card[data-id="p2"]')
        g.page.click('#btn-profile-edit')
        g.page.click('#btn-profile-delete')
        check('verwijderen vraagt eerst het ouderslot', g.modal() == 'modal-parent')
        g.page.click('#btn-parent-hold', delay=1700)
        check('één keer ingedrukt houden is niet genoeg (ring half, "nog een keer")',
              g.modal() == 'modal-parent' and g.js('SudokuStorage.profiles().length') == 6 and
              g.js('document.getElementById("btn-parent-hold").dataset.holds') == '1' and
              g.js('document.getElementById("hold-label").textContent') == 'Noch einmal!')
        g.page.click('#btn-parent-hold', delay=600)
        check('tweede keer te kort telt niet', g.modal() == 'modal-parent')
        g.page.click('#btn-parent-hold', delay=1700)
        check('twee keer lang genoeg: daarna nog een bevestiging met naam en plaatje',
              g.modal() == 'modal-delete' and 'Sam' in g.js('document.getElementById("delete-text").textContent')
              and g.js('document.querySelectorAll("#delete-avatar svg").length') == 1)
        g.page.click('#btn-delete-yes')
        check('profiel en al zijn gegevens zijn weg; de rest staat er nog',
              g.js('SudokuStorage.profiles().length') == 5 and g.screen() == 'profiles' and
              g.js('Object.keys(localStorage).filter(k => k.includes("_p2_")).length') == 0 and
              len(g.stored('sudokuKids_progress')) == 2)
        g.js('["p3","p4","p5","p6"].forEach(id => SudokuStorage.deleteProfile(id)); buildProfiles()')
        g.page.click('.profile-card')
        g.page.click('#btn-profile-edit')
        check('het laatste profiel kan niet verwijderd worden', g.js('document.getElementById("btn-profile-delete").classList.contains("hidden")'))
        g.page.click('#btn-profile-cancel')
        g.page.click('#btn-profile-back')
        g.page.click('#btn-link-account')
        check('"Account koppelen" zit achter het ouderslot', g.modal() == 'modal-parent')
        g.page.click('#btn-parent-hold', delay=1700)
        g.page.wait_for_timeout(5300)
        check('ouderslot: wie na de eerste keer langer dan 5 s wacht, begint opnieuw',
              g.modal() == 'modal-parent' and g.js('document.getElementById("btn-parent-hold").dataset.holds') == '0')
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
        g.js('leaveGame()')
        g.js('SudokuStorage.write("p1", "settings", { ...settings, size: "normal" })')
        g.page.reload()
        check('profiel met de oude grootte "normaal" wordt "groot"', g.js('settings.size') == 'large' and g.js('document.body.classList.contains("ui-large")'))
        g.js('SudokuStorage.write("p1", "settings", { ...settings, size: "small" })')
        g.page.reload()
        check('profiel met "klein" blijft "klein"', g.js('settings.size') == 'small')
        g.js('SudokuStorage.createProfile("B", "dog"); switchProfile("p2")')
        check('grootte is per profiel: een nieuw profiel staat op groot', g.js('settings.size') == 'large')
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
        frame.locator('.level-btn[data-level="0"]').click()
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

        # ------------------------------------------------------------
        section('16. Vijf werelden, 50 levels per rastergrootte (A)')
        g = Game(browser, url, progress=progress_for(0, 16))
        g.start()
        check('5 wereldkaarten in volgorde van moeilijkheid: bos, boerderij, snoep, jungle, raket',
              g.js('[...document.querySelectorAll(".world-card")].map(c => c.dataset.world).join()') == '0,3,1,4,2')
        check('elke kaart toont met rastertjes hoeveel levels er per grootte zijn',
              g.js('[...document.querySelectorAll(".world-card")].map(c => [...c.querySelectorAll(".size-chip")].map(s => s.dataset.size + ":" + s.querySelector("b").textContent + (s.querySelector("svg.grid-pic") ? "" : "!")).join("+")).join(" ")')
              == '4:50+6:50 4:50+6:50 6:50+9:50 6:50+9:50 9:50')
        check('totaal en voortgang op de kaart', g.js('document.getElementById("world-0-text").textContent') == '16/100' and g.js('document.getElementById("world-2-text").textContent') == '0/50')
        check('16 levels: alleen het Dierenbos is open', g.js('[0,3,1,4,2].map(isWorldUnlocked).join()') == 'true,false,false,false,false')
        g.close()
        g = Game(browser, url, progress=progress_for(0, 17))
        g.start()
        check('17 levels in het Dierenbos (zoals vóór de uitbreiding): Boerderij en Snoepjesfabriek open',
              g.js('[0,3,1,4,2].map(isWorldUnlocked).join()') == 'true,true,true,false,false')
        g.page.click('#world-card-3')
        check('nieuwe wereld opent met 100 levels in blokken per rastergrootte',
              g.screen() == 'levels' and g.js('document.querySelectorAll(".level-btn").length') == 100 and
              g.js('[...document.querySelectorAll(".levels-section span")].map(s => s.textContent).join()') == '4×4,6×6')
        own = g.js('SudokuEngine.ownId(105)')
        g.js('startLevel(105)')
        check('nieuw level (Dierenbos 36) begint met zijn eigen vaste puzzel uit de voorraad',
              g.js('gameState.pid') == own and '#' in own and g.js('gameState.lv.indexInWorld') == 35 and g.js('gameState.lv.world') == 0)
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        check('sterren van het nieuwe level komen achteraan (w0_l35); bestaande sleutels blijven', g.stored()['w0_l35']['stars'] == 3 and g.stored()['w0_l16']['stars'] == 3)
        check('geen console-errors', not g.errors, g.errors)
        g.close()
        # het generatiescript, in een kopie van het project
        import shutil, subprocess, tempfile
        with tempfile.TemporaryDirectory() as tmp:
            work = pathlib.Path(tmp) / 'app'
            shutil.copytree(ROOT, work, ignore=shutil.ignore_patterns('.git', 'screenshots', 'icons', '__pycache__', 'out', 'docs'))
            run = lambda *a: subprocess.run(['node', 'tools/generate-puzzles.js', *a], cwd=work, capture_output=True, text=True)
            st = run('--status')
            check('generate-puzzles --status toont levels per wereld', st.returncode == 0 and 'wereld 4: 50× 6x6 · 50× 9x9' in st.stdout, st.stdout + st.stderr)
            mx = run('--max')
            check('generate-puzzles --max telt de 4×4-mogelijkheden (376 echt verschillende met 6 gegeven)', mx.returncode == 0 and ' 376 ' in mx.stdout, mx.stdout[-400:] + mx.stderr)
            before = json.loads(subprocess.run(['node', '-e', 'const E=require("./puzzles.js");console.log(JSON.stringify([E.LEVEL_PLAN.map(l=>E.getPuzzle(l.globalIndex).given.join("")), E.bankOf("4-standard/9-9").length]))'], cwd=work, capture_output=True, text=True).stdout)
            a1 = run('--soort', '4x4-standard', '--aantal', '5')
            a2 = run('--levels', '--wereld', '0', '--soort', '6x6-fruit', '--aantal', '3')
            after = json.loads(subprocess.run(['node', '-e', 'const E=require("./puzzles.js");console.log(JSON.stringify([E.LEVEL_PLAN.map(l=>E.getPuzzle(l.globalIndex).given.join("")), E.bankOf("4-standard/9-9").length]))'], cwd=work, capture_output=True, text=True).stdout)
            check('één commando voegt puzzels toe en draait zelf de validatie', a1.returncode == 0 and '✅ Voorraad' in a1.stdout and after[1] == before[1] + 5, a1.stdout + a1.stderr)
            check('één commando voegt levels achteraan toe; alle bestaande levels blijven gelijk',
                  a2.returncode == 0 and len(after[0]) == len(before[0]) + 3 and after[0][:len(before[0])] == before[0], a2.stdout + a2.stderr)
            bad = run('--soort', '5x5-raar', '--aantal', '1')
            check('onbekende soort geeft een duidelijke fout', bad.returncode == 1 and 'Onbekende soort' in bad.stderr)

        # ------------------------------------------------------------
        section('17. Kawaii-iconen in de hele app (B)')
        g = Game(browser, url, progress=progress_for(0, 35))
        emoji = r'/\p{Extended_Pictographic}/u'
        found = {}
        def scan(label):
            hit = g.js('() => { const m = document.body.innerText.match(%s); const css = [...document.querySelectorAll("*")].map(e => getComputedStyle(e, "::after").content + getComputedStyle(e, "::before").content).join("").match(%s); return (m ? m[0] : "") + (css ? css[0] : ""); }' % (emoji, emoji))
            if hit:
                found[label] = hit
        scan('start')
        g.start(); scan('werelden')
        g.page.click('#world-card-0'); scan('levels')
        g.js('startLevel(0, true)'); scan('spel')
        g.js('setDisplayMode("animals")'); scan('dieren')
        g.js('startLevel(SudokuEngine.LEVEL_PLAN.findIndex(l => l.type === "shapes"), true)'); scan('fruit')
        g.solve(); g.page.wait_for_selector('#modal-win:not(.hidden)'); scan('gewonnen')
        g.js('hideModals(); goToSettings()'); scan('instellingen')
        g.js('openProfile(profileId)'); scan('profiel')
        g.js('startProfileEdit()'); scan('profiel bewerken')
        g.js('goToProfiles()'); scan('spelers')
        g.js('askParent(() => {})'); scan('ouderslot')
        check('nergens meer een emoji: alle plaatjes komen uit icons.js', found == {}, found)
        check('alle iconen bestaan en zijn SVG (dieren, fruit, avatars, knoppen, werelden)',
              g.js('''() => [...ANIMALS, ...FRUITS, ...SudokuStorage.AVATARS, ...WORLDS.map(w => w.icon),
                  ...[...document.querySelectorAll("[data-icon]")].map(e => e.dataset.icon)].filter(n => !KawaiiIcons.svg(n).startsWith("<svg"))''') == [])
        check('elk [data-icon]-plekje is gevuld', g.js('[...document.querySelectorAll("[data-icon]")].filter(e => !e.querySelector("svg")).length') == 0)
        check('profiel met een oud emoji-plaatje wordt omgezet naar het nieuwe icoon',
              g.js('''() => { localStorage.setItem("sudokuKids_profiles", JSON.stringify({ v: 1, active: "p1", next: 3, list: [{ id: "p1", name: "", avatar: "🦊" }, { id: "p2", name: "B", avatar: "🐼" }] }));
                  return true; }''') is True)
        g.page.reload()
        check('… vos en panda', g.js('SudokuStorage.profiles().map(p => p.avatar).join()') == 'fox,panda')
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('18. Muziek, klikgeluid en geluidseffecten (C)')
        g = Game(browser, url)
        check('muziek staat standaard aan, maar speelt nog niet vóór de eerste tik', g.js('settings.music') is True and g.js('music.on') is False)
        g.js('() => { window.__tones = []; const realTone = tone; tone = (dest, ...rest) => { __tones.push(dest === audioCtx.destination ? "fx" : "music"); return realTone(dest, ...rest); }; }')
        g.start()
        g.page.wait_for_timeout(1500)
        check('na de eerste tik speelt de muziek', g.js('music.on') is True and 'music' in g.js('__tones'))
        check('muziek is zacht (volume ≤ 0,06, ver onder de effecten)', g.js('MUSIC_VOLUME') <= 0.06)
        check('deuntje loopt naadloos door: 32 tellen, daarna weer vanaf het begin', g.js('MELODY.length') == 32 and g.js('BASS.length * 4') == 32 and g.js('music.step < MELODY.length'))
        step = g.js('music.step')
        g.js('Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange"))')
        check('app op de achtergrond: muziek pauzeert', g.js('music.on') is False)
        g.js('Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange"))')
        check('terug op de voorgrond: muziek gaat verder waar hij was', g.js('music.on') is True and g.js('music.step') >= step)
        g.page.click('#btn-worlds-settings')
        check('drie schakelaars: muziek, geluidseffecten, klikgeluid',
              g.js('["setting-music", "setting-sound", "setting-click"].map(id => document.getElementById(id).checked).join()') == 'true,true,true')
        g.js('__tones.length = 0')
        g.page.click('#btn-settings-back')
        check('klikgeluid: één zacht tikje bij een knop', g.js('__tones.filter(t => t === "fx").length') == 1)
        g.page.click('#btn-worlds-settings')
        g.page.click('label:has(#setting-click)')
        g.page.click('label:has(#setting-music)')
        check('muziek uit: stopt direct', g.js('music.on') is False and g.js('settings.music') is False)
        g.js('__tones.length = 0')
        g.page.click('#btn-settings-back')
        g.page.click('#world-card-0')
        check('klikgeluid uit: knoppen zijn stil', g.js('__tones.filter(t => t === "fx").length') == 0)
        g.page.click('.level-btn[data-level="0"]')
        idx, val = g.open_cells()[0]
        g.tap_cell(idx)
        g.js('__tones.length = 0')
        g.tap_num(val)
        check('geluidseffecten blijven werken zoals altijd (goed antwoord = geluidje)', g.js('__tones.filter(t => t === "fx").length') == 1)
        g.js('leaveGame(); SudokuStorage.createProfile("B", "dog"); switchProfile("p2")')
        check('nieuw profiel heeft zijn eigen geluidsinstellingen (alles aan)', g.js('[settings.music, settings.click, settings.sound].join()') == 'true,true,true' and g.js('music.on') is True)
        g.js('switchProfile("p1")')
        g.page.reload()
        check('per profiel bewaard: profiel 1 houdt muziek en klik uit', g.js('[settings.music, settings.click, settings.sound].join()') == 'false,false,true')
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('19. Talen (D)')
        g = Game(browser, url, locale='es-MX')
        check('Spaans toestel start in het Spaans', g.js('settings.language') == 'es' and g.js('document.getElementById("btn-start").textContent') == '¡Jugar!')
        g.start()
        g.page.click('#btn-worlds-settings')
        check('10 talen, met de naam in de taal zelf',
              g.js('[...document.querySelectorAll("#setting-language option")].map(o => o.textContent).join("|")')
              == 'Nederlands|English|Deutsch|Français|Español|Português|Italiano|Polski|Türkçe|Bahasa Indonesia')
        report = g.js('''() => { const keys = Object.keys(STRINGS.nl), out = [];
            for (const [lang] of LANGUAGES) {
              if (!STRINGS[lang]) { out.push(lang + ': ontbreekt'); continue; }
              for (const k of keys) {
                const a = STRINGS.nl[k], b = STRINGS[lang][k];
                if (b === undefined || b === '') out.push(lang + ':' + k);
                else if (Array.isArray(a) !== Array.isArray(b) || (Array.isArray(a) && a.length !== b.length)) out.push(lang + ':' + k + ' (lijst)');
                else if (String(a).includes('{name}') !== String(b).includes('{name}')) out.push(lang + ':' + k + ' ({name})');
                else if ((String(a).match(/\\n/g) || []).length !== (String(b).match(/\\n/g) || []).length) out.push(lang + ':' + k + ' (regels)');
              }
              for (const k of Object.keys(STRINGS[lang])) if (!(k in STRINGS.nl)) out.push(lang + ':' + k + ' (extra)');
            }
            return out; }''')
        check(f'alle 10 talen hebben alle {g.js("Object.keys(STRINGS.nl).length")} sleutels (zelfde lijsten, {{name}} en regels)', report == [], report)
        titles = {}
        for code in ('pt', 'it', 'pl', 'tr', 'id'):
            g.page.select_option('#setting-language', code)
            titles[code] = g.js('document.querySelector("#screen-settings .screen-title").textContent + "|" + document.documentElement.lang')
        check('wisselen werkt direct voor de nieuwe talen',
              titles == {'pt': 'Configurações|pt', 'it': 'Impostazioni|it', 'pl': 'Ustawienia|pl', 'tr': 'Ayarlar|tr', 'id': 'Pengaturan|id'}, titles)
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('20. Ouderslot: twee keer ingedrukt houden (E)')
        g = Game(browser, url)
        g.start()
        g.page.click('#btn-worlds-settings')
        g.page.click('#btn-reset-progress')
        ring = lambda: g.js('parseFloat(document.getElementById("hold-progress").style.strokeDashoffset) / RING_LENGTH')
        check('ring begint leeg', abs(ring() - 1) < 0.01)
        box = g.page.locator('#btn-parent-hold').bounding_box()
        g.page.mouse.move(box['x'] + 60, box['y'] + 60)
        g.page.mouse.down()
        g.page.wait_for_timeout(800)
        half = ring()
        g.page.wait_for_timeout(900)
        check('ring vult tijdens het vasthouden en staat na de eerste keer op de helft', 0.6 < half < 0.9 and abs(ring() - 0.5) < 0.02, [half, ring()])
        g.page.mouse.up()
        check('instellingen van HOLD: 2 × 1,5 s binnen 5 s', g.js('[HOLD_MS, HOLD_WINDOW_MS].join()') == '1500,5000')
        prevented = g.js('''() => ["contextmenu", "selectstart", "dragstart"].map(type => {
            const e = new Event(type, { bubbles: true, cancelable: true }); document.getElementById("btn-parent-hold").dispatchEvent(e); return e.defaultPrevented; }).join()''')
        css = g.js('(() => { const c = getComputedStyle(document.getElementById("btn-parent-hold")); return [c.userSelect, c.touchAction, c.webkitTouchCallout || "none"].join(); })()')
        check('geen contextmenu, geen tekstselectie, geen scrollen op de knop', prevented == 'true,true,true' and css.startswith('none,none'), [prevented, css])
        g.page.mouse.down()
        g.page.wait_for_timeout(1700)
        g.page.mouse.up()
        check('na de tweede keer gaat het slot open', g.modal() == 'modal-confirm')
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('21. Onderbalk, pratende kat en TEST-strook (F)')
        for label, (w, h) in {'telefoon 360×640': (360, 640), 'liggend 844×390': (844, 390), 'tablet 800×1280': (800, 1280)}.items():
            g = Game(browser, test_url, w=w, h=h, progress=None)
            g.js('localStorage.setItem("test_sudokuKids_progress", JSON.stringify(%s))' % json.dumps(progress_for(0, 35)))
            g.page.reload()
            g.start()
            g.page.wait_for_timeout(700)
            covered = '''() => { const bar = document.getElementById("mascot").getBoundingClientRect(), strip = document.querySelector(".test-badge").getBoundingClientRect();
                const hit = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
                const out = [];
                for (const el of document.querySelectorAll(".screen.active button, .screen.active .screen-title, .screen.active .game-info, .screen.active .header-score")) {
                  const r = el.getBoundingClientRect(); if (!r.width) continue;
                  const scroller = el.closest(".screen").getBoundingClientRect();
                  const visible = { left: r.left, right: r.right, top: Math.max(r.top, scroller.top), bottom: Math.min(r.bottom, scroller.bottom) };
                  if (visible.bottom <= visible.top) continue;                 // scrolled out of the screen
                  if (!document.getElementById("mascot").classList.contains("hidden") && hit(visible, bar)) out.push("balk:" + (el.id || el.className));
                  if (hit(visible, strip)) out.push("strook:" + (el.id || el.className));
                }
                return out; }'''
            problems = {}
            def look(name):
                r = g.js(covered)
                if r:
                    problems[name] = r[:4]
            look('werelden')
            order = g.js('(() => { const x = s => document.querySelector(s).getBoundingClientRect(); return [x("#btn-cat").right <= x("#mascot .mascot-bubble").left + 1, x("#mascot .mascot-bubble").right <= x("#btn-switch").left + 1, document.querySelectorAll("#btn-switch .switch-avatar svg").length === 1 && !document.getElementById("btn-avatar"), x("#btn-cat").left < innerWidth / 4, x("#btn-switch").right > innerWidth * 3 / 4]; })()')
            g.js('document.getElementById("screen-worlds").scrollTop = 99999'); look('werelden onderaan')
            g.page.click('#world-card-0', force=True); g.page.wait_for_timeout(500); look('levels')
            g.js('document.getElementById("screen-levels").scrollTop = 99999'); look('levels onderaan')
            last = g.js('(() => { const b = [...document.querySelectorAll(".level-btn")].pop().getBoundingClientRect(); return b.bottom <= document.getElementById("mascot").getBoundingClientRect().top + 0.5; })()')
            g.js('startLevel(0, true)'); g.page.wait_for_timeout(500); look('spel')
            g.js('leaveGame(); goToSettings()'); g.page.wait_for_timeout(400); look('instellingen')
            g.js('openProfile(profileId)'); g.page.wait_for_timeout(400); look('profiel')
            check(f'{label}: kat links met wolkje; rechts alleen de wisselknop met mini-avatar', order == [True, True, True, True, True], order)
            check(f'{label}: de onderbalk bedekt nergens een knop en het laatste level is helemaal te zien', problems == {} and last, problems)
            check(f'{label}: de TEST-strook valt nergens over een titel, levelnaam of knop', not any('strook' in str(v) for v in problems.values()), problems)
            g.close()
        g = Game(browser, live_url)
        g.start()
        check('live: geen TEST-strook, de app begint bovenaan', g.js('document.querySelector(".test-badge")') is None and g.js('document.getElementById("screen-worlds").getBoundingClientRect().top') == 0)
        g.close()

        # ------------------------------------------------------------
        section('22. Levels op het scherm gesorteerd op moeilijkheid (H)')
        g = Game(browser, url)
        g.start()
        g.page.click('#world-card-0')
        order = g.js('''() => [...document.querySelectorAll(".level-btn")].map(b => { const lv = worldLevels(0)[+b.dataset.level];
            return [lv.size, SudokuEngine.getPuzzle(lv.globalIndex).givens, +b.dataset.level, b.getAttribute("aria-label")]; })''')
        check('eerst alle 4×4, dan alle 6×6; binnen een grootte van veel naar weinig gegeven vakjes',
              len(order) == 100 and all(a[0] < b[0] or (a[0] == b[0] and a[1] >= b[1]) for a, b in zip(order, order[1:])), order[:6])
        check('doorlopende nummers 1 t/m 100 op het scherm', [o[3] for o in order] == [f'Level {n}' for n in range(1, 101)])
        check('nieuwe en oude levels staan door elkaar (de opslag-index is niet de volgorde)', [o[2] for o in order] != sorted(o[2] for o in order))
        third = order[2][2]
        g.js('i => startLevel(worldLevels(0)[i].globalIndex, true)', third)
        check('het spel toont het nummer van het scherm', g.js('document.getElementById("game-level-label").textContent') == 'Level 3')
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        check('de sterren staan onder de eigen, vaste sleutel van het level', list(g.stored().keys()) == [f'w0_l{third}'])
        g.page.click('#btn-win-next')
        check('"Volgende" gaat naar het volgende level op het scherm', g.js('displayNumber(gameState.lv)') == 4 and g.js('gameState.lv.indexInWorld') == order[3][2])
        check('geen console-errors', not g.errors, g.errors)
        g.close()
        g = Game(browser, url, progress=progress_for(0, 10))
        g.start()
        g.page.click('#world-card-0')
        check('bestaande speler (levels 1–10 gehaald): het level dat open was, blijft open; niets gaat op slot',
              g.js('isLevelUnlocked(0, 10)') is True and g.js('[...Array(10).keys()].every(i => isLevelUnlocked(0, i))') and
              g.js('document.querySelector(\'.level-btn[data-level="10"]\').classList.contains("current")'))
        g.close()

        # ------------------------------------------------------------
        section('23. Bovenbalk, wisselknop en meldingen (A)')
        g = Game(browser, url)
        g.start()
        check('rechtsboven: avatar + sterren in één knop', g.js('document.querySelectorAll("#btn-score .score-avatar svg").length') == 1 and
              g.js('document.getElementById("total-stars-display").textContent') == '0' and g.js('!!document.getElementById("btn-score").closest(".screen-header")'))
        check('rechtsonder: alleen de wisselknop met mini-avatar; kat met wolkje linksonder',
              g.js('[...document.querySelectorAll("#mascot button")].map(b => b.id).join()') == 'btn-cat,btn-switch' and
              g.js('document.querySelectorAll("#btn-switch .switch-avatar svg").length') == 1)
        check('belletje met 1 ongelezen melding (welkom van de kat)', g.js('document.getElementById("bell-count").textContent') == '1' and
              g.js('!document.getElementById("bell-count").classList.contains("hidden")') and g.js('document.querySelectorAll("#btn-bell svg").length') == 1)
        g.page.click('#btn-score')
        check('de knop rechtsboven opent het profiel', g.screen() == 'profile')
        g.page.click('#btn-profile-back')
        g.page.click('#btn-bell')
        check('tik op het belletje opent de lijst', g.screen() == 'inbox' and g.js('document.querySelectorAll(".inbox-item").length') == 1 and
              g.js('document.querySelector(".inbox-text").textContent') == 'Welkom! Fijn dat je er bent.')
        check('openen markeert alles als gelezen', g.js('document.getElementById("bell-count").classList.contains("hidden")') and g.stored('sudokuKids_inbox')[0]['r'] == 1)
        g.page.click('.inbox-item')
        g.js('startLevel(0, true)')
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        g.page.click('#btn-win-home')
        g.page.click('#btn-levels-back')
        kinds = g.js('inbox.filter(n => !n.r).map(n => n.k)')
        check('na het eerste level: een bericht van de kat en nieuwe badges', 'cat' in kinds and kinds.count('badge') >= 3 and
              g.js('document.getElementById("bell-count").textContent') == str(len(kinds)), kinds)
        g.page.click('#btn-bell')
        check('elke melding heeft een icoon en een tekst',
              g.js('[...document.querySelectorAll(".inbox-item")].every(r => r.querySelector(".inbox-pic svg") && r.querySelector(".inbox-text").textContent.length > 3)'))
        badge_id = g.js('inbox.find(n => n.k === "badge").a.id')
        g.page.click('.inbox-item[data-kind="badge"] >> nth=0')
        check('tik op een badge-melding gaat naar die badge', g.screen() == 'profile' and g.modal() == 'modal-badge' and
              g.js('document.getElementById("modal-badge").dataset.badge') == badge_id)
        g.page.click('#btn-badge-ok')
        g.page.click('#btn-profile-back')
        check('terug gaat weer naar de meldingen', g.screen() == 'inbox')
        g.js('for (let i = 1; i < 17; i++) progress["w0_l" + i] = { stars: 3, time: 20 }; saveProgress(); markReached(false); checkBadges();')
        g.js('goToWorlds()')
        fresh = g.js('inbox.filter(n => !n.r).map(n => n.k + ":" + JSON.stringify(n.a))')
        check('17 levels: meldingen "nieuwe wereld open" (Boerderij en Snoepjesfabriek) en "10 levels gehaald"',
              'world:{"w":3}' in fresh and 'world:{"w":1}' in fresh and 'levels:{"n":10}' in fresh and 'levels:{"n":25}' not in fresh, fresh)
        g.page.click('#btn-bell')
        check('tekst van de meldingen', g.js('[...document.querySelectorAll(".inbox-text")].map(e => e.textContent)').count('Nieuwe wereld open: De Boerderij') == 1 and
              '10 levels gehaald!' in g.js('[...document.querySelectorAll(".inbox-text")].map(e => e.textContent)'))
        g.page.click('.inbox-item[data-kind="world"] >> nth=0')
        check('tik op "nieuwe wereld" gaat naar de levels van die wereld', g.screen() == 'levels' and g.js('currentWorld') in (1, 3))
        g.js('worldLevels(2).forEach(l => { progress["w2_l" + l.indexInWorld] = { stars: 3, time: 20 }; }); saveProgress(); markReached(false); goToWorlds()')
        g.page.click('#btn-bell')
        check('alle sterren in een wereld geeft een melding', 'Alle sterren in De Ruimte-raket!' in g.js('[...document.querySelectorAll(".inbox-text")].map(e => e.textContent)'))
        g.page.click('.inbox-item[data-kind="worldStars"]')
        check('… en die gaat naar het werelden-overzicht van het profiel', g.screen() == 'profile' and g.js('profileTab') == 'worlds')
        g.js('for (let i = 0; i < 80; i++) notify("cat", { m: 0 })')
        check('hooguit 50 meldingen bewaard', len(g.stored('sudokuKids_inbox')) == 50)
        g.js('SudokuStorage.createProfile("B", "dog"); switchProfile("p2")')
        check('meldingen zijn per profiel (nieuw profiel: alleen het welkom)', g.js('inbox.length') == 1 and g.js('document.getElementById("bell-count").textContent') == '1')
        check('alles blijft lokaal: geen pushmeldingen, geen verzoek naar een ander domein',
              not [r for r in g.requests if not r.startswith(url)] and g.js('!("Notification" in window) || Notification.permission !== "granted"'))
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('24. Honderd badges, en elke badge is te halen (D1)')
        g = Game(browser, url)
        check('100 badges in badges.js, elk met een eigen plaatje',
              g.js('SudokuBadges.all.length') == 100 and g.js('new Set(SudokuBadges.all.map(b => b.id)).size') == 100 and
              g.js('new Set(SudokuBadges.all.map(b => KawaiiIcons.badge(b.emblem, b.color, b.label))).size') == 100)
        texts = g.js('''() => { const out = [], fill = { world: w => STRINGS.nl['world' + w], type: k => k, time: s => s + 's' };
            for (const [lang] of LANGUAGES) { const names = new Set();
              if (!SudokuBadges.TEXT[lang]) { out.push(lang + ': ontbreekt'); continue; }
              for (const b of SudokuBadges.all) { const key = b.args.all ? 'worldAll' : b.family;
                if (!SudokuBadges.TEXT[lang][key]) { out.push(lang + ':' + key); continue; }
                const t = SudokuBadges.text(lang, b, fill);
                if (!t.name || !t.desc || /[{}]/.test(t.name + t.desc)) out.push(lang + ':' + b.id);
                names.add(t.name); }
              if (names.size !== 100) out.push(lang + ': ' + names.size + ' verschillende namen'); }
            return out; }''')
        check('naam en uitleg voor elke badge in alle 10 talen (100 verschillende namen per taal)', texts == [], texts[:8])
        g.start()
        g.page.click('#btn-score')
        check('nieuw profiel: 100 tegels, nog niets gehaald, grijs met voortgang',
              g.js('document.querySelectorAll(".badge-tile").length') == 100 and g.js('document.querySelectorAll(".badge-tile.earned").length') == 0 and
              g.js('document.querySelector(\'.badge-tile[data-badge="levels-10"] .badge-todo\').textContent') == '0/10' and
              g.js('document.getElementById("tab-badges-count").textContent') == '0/100')
        g.page.click('.badge-tile[data-badge="levels-10"]')
        check('tik op een badge: details met naam, uitleg, voortgang en "nog te halen"',
              g.modal() == 'modal-badge' and g.js('document.getElementById("badge-name").textContent') == 'Puzzelaar III' and
              g.js('document.getElementById("badge-desc").textContent') == 'Levels gehaald: 10' and
              g.js('document.getElementById("badge-count").textContent') == '0/10' and g.js('document.getElementById("badge-state").textContent') == 'Nog te halen')
        g.page.click('#btn-badge-ok')
        # Nu echt spelen tot alles gehaald is. De klok wordt verzet met window.__now.
        left = g.js('''() => {
          const solve = (wrong) => { for (let i = 0; i < gameState.grid.length; i++) { if (gameState.grid[i] === gameState.solution[i]) continue;
              onCellClick(i);
              for (let k = 0; k < (wrong || 0); k++) { const v = gameState.solution[i] % gameState.size + 1; gameState.tried[i].clear(); onNumPress(v); }
              wrong = 0; onNumPress(gameState.solution[i]); } };
          const at = (y, m, d, h) => { window.__now = new Date(y, m, d, h, 30).getTime(); };
          const first = n => LEVELS.findIndex(l => l.size === n && l.type !== 'shapes');
          // zaterdag 3 januari 2026, 07:30: vroege vogel + weekend
          at(2026, 0, 3, 7); startLevel(0, true); solve();
          // zeven dagen achter elkaar, ook rond de middag en 's avonds
          for (let d = 4; d <= 9; d++) { at(2026, 0, d, d === 4 ? 12 : 19); startLevel(1, true); solve(); }
          // en nog 13 losse dagen (samen 20)
          for (let d = 0; d < 13; d++) { at(2026, 1, 1 + d * 2, 15); startLevel(2, true); solve(); }
          // gum, notities, hints
          startLevel(3, true);
          const open = gameState.grid.findIndex((v, i) => v !== gameState.solution[i]);
          onCellClick(open);
          for (let k = 0; k < 50; k++) { gameState.tried[open].clear(); onNumPress(gameState.solution[open] % 4 + 1); onErase(); }
          setNotesMode(true); for (let k = 0; k < 50; k++) { onNumPress(1); onNumPress(1); } setNotesMode(false);
          solve();                                     // 50 fouten: 1 ster
          for (let k = 0; k < 9; k++) { startLevel(4 + k, true); giveHint(); giveHint(); giveHint(); solve(); }
          // doorzetter: eerst game over, dan toch halen
          const six = first(6); startLevel(six, true);
          const c = gameState.grid.findIndex((v, i) => v !== gameState.solution[i]); onCellClick(c);
          [1, 2, 3, 4, 5, 6].filter(v => v !== gameState.solution[c]).slice(0, 3).forEach(v => onNumPress(v));
          startLevel(six, true); solve();
          // dieren: een level en een hele 9×9
          setDisplayMode('animals'); startLevel(first(9), true); solve(); setDisplayMode('numbers');
          // alle levels één keer foutloos
          for (const lv of LEVELS) { startLevel(lv.globalIndex, true); solve(); }
          // de kat aaien, een tweede speler, een ander plaatje
          for (let k = 0; k < 10; k++) document.getElementById('btn-cat').click();
          SudokuStorage.createProfile('B', 'dog'); checkBadges();
          openProfile(profileId); startProfileEdit(); document.querySelector('.avatar-btn[data-avatar="lion"]').click(); saveProfileEdit();
          window.__now = undefined;
          return SudokuBadges.evaluate(badgeStats(profileId)).filter(r => !(r.badge.id in stats.earned)).map(r => r.badge.id + ' ' + r.value + '/' + r.target);
        }''')
        check('na echt spelen (alle 450 levels, 20 dagen, gum, notities, hints, dieren, …) zijn alle 100 badges gehaald', left == [], left)
        g.js('openProfile(profileId)')
        check('overzicht: 100 in kleur, teller 100/100', g.js('document.querySelectorAll(".badge-tile.earned").length') == 100 and
              g.js('document.getElementById("tab-badges-count").textContent') == '100/100')
        g.page.click('.badge-tile[data-badge="dayStreak-7"]')
        check('gehaalde badge toont de datum', g.js('document.getElementById("badge-state").textContent').startswith('Gehaald op ') and
              g.js('document.getElementById("badge-count").textContent') == '7/7')
        g.page.click('#btn-badge-ok')
        played_total = g.js('''() => { const before = playLog.length;
            for (let k = 0; k < 60; k++) { startLevel(k, true); for (let i = 0; i < gameState.grid.length; i++) if (gameState.grid[i] !== gameState.solution[i]) { onCellClick(i); onNumPress(gameState.solution[i]); } }
            return before + 60; }''')
        check(f'geschiedenis blijft klein: {played_total} puzzels gespeeld, de laatste 500 bewaard',
              played_total > 500 and g.js('playLog.length') == 500 and len(g.stored('sudokuKids_history')) == 500)
        size_kb = g.js('JSON.stringify(localStorage).length / 1024')
        print(f'     alle opslag van dit profiel na 500+ puzzels: {size_kb:.0f} kB')
        check('opslag blijft klein (< 100 kB)', size_kb < 100, size_kb)
        g.page.reload()
        check('badges blijven na herladen', g.js('Object.keys(stats.earned).length') == 100)
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('25. Profielpagina: werelden en geschiedenis (D2, D3)')
        g = Game(browser, url, progress=progress_for(0, 20))
        g.start()
        g.js('startLevel(worldLevels(3)[0].globalIndex, true)')
        idx = g.open_cells()[0][0]
        g.tap_cell(idx)
        g.tap_num(g.wrong_values(idx)[0])
        g.page.click('#btn-hint')
        g.solve()
        g.page.wait_for_selector('#modal-win:not(.hidden)')
        g.page.click('#btn-win-home')
        g.js('goToWorlds()')
        g.page.click('#btn-score')
        check('drie onderdelen: badges, werelden, geschiedenis', g.js('[...document.querySelectorAll(".profile-tab")].map(b => b.dataset.tab).join()') == 'badges,worlds,history')
        g.page.click('.stat-card[data-stat="stars"]')
        check('tik op het blok "sterren" opent de geschiedenis', g.js('profileTab') == 'history' and g.js('!document.getElementById("panel-history").classList.contains("hidden")'))
        g.page.click('#tab-badges')
        g.page.click('.stat-card[data-stat="levels"]')
        check('tik op het blok "levels gehaald" ook', g.js('profileTab') == 'history')
        rows = g.js('[...document.querySelectorAll(".history-row")].map(r => [r.dataset.old, r.querySelector(".h-title").textContent, r.querySelector(".h-sub").textContent, r.querySelector(".h-stars").dataset.stars, r.querySelector(".h-details").textContent])')
        check('nieuwste bovenaan: het zojuist gespeelde level met wereld, grootte, type, datum, tijd, fouten, hints en sterren',
              rows[0][0] == '0' and rows[0][1] == 'Level 1 · 4×4 · Standaard' and rows[0][2].startswith('De Boerderij · ') and rows[0][3] == '2' and rows[0][4].endswith('11'), rows[0])
        check('bestaande voortgang: 20 regels "Eerder gespeeld" zonder details',
              len(rows) == 21 and all(r[0] == '1' and r[2].endswith('Eerder gespeeld') and r[4] == '' for r in rows[1:]), rows[1])
        check('uitleg van de sterren (3 regels met sterretjes)', g.js('[...document.querySelectorAll(".how-row")].map(r => r.querySelectorAll("svg").length + ":" + r.textContent).join("|")')
              == '3:geen fouten en geen hints|3:samen hoogstens 2 fouten of hints|3:meer dan 2 fouten of hints')
        g.page.click('.filter-chip[data-filter="3"]')
        check('filteren per wereld', g.js('document.querySelectorAll(".history-row").length') == 1 and g.js('document.querySelector(".filter-chip.active").dataset.filter') == '3')
        g.page.click('.filter-chip[data-filter="0"]')
        check('… en een andere wereld', g.js('document.querySelectorAll(".history-row").length') == 20)
        g.page.click('.filter-chip[data-filter="all"]')
        g.page.click('#tab-worlds')
        cards = g.js('[...document.querySelectorAll(".wp-card")].map(c => [c.dataset.world, c.querySelector(".wp-total").textContent, [...c.querySelectorAll(".size-chip b")].map(b => b.textContent).join("+"), c.querySelectorAll(".wp-dots i").length, c.querySelectorAll(".wp-dots i:not(.s0)").length])')
        check('werelden: voortgang, levels per rastergrootte en een stip per level',
              cards[0] == ['0', '20/100', '20/50+0/50', 100, 20] and cards[1] == ['3', '1/100', '1/50+0/50', 100, 1] and len(cards) == 5, cards[:2])
        g.page.click('.wp-card[data-world="3"]')
        check('tik op een wereld gaat naar de levelkeuze van die wereld', g.screen() == 'levels' and g.js('currentWorld') == 3)
        g.js('SudokuStorage.createProfile("B", "dog"); goToProfiles()')
        g.page.click('.profile-card[data-id="p2"]')
        g.page.click('#tab-worlds')
        g.page.click('.wp-card[data-world="0"]')
        check('bij een andere speler dan de actieve gaat de tik nergens heen', g.screen() == 'profile')
        g.page.click('#tab-history')
        check('lege geschiedenis geeft een melding', g.js('document.querySelector("#history-list .empty-text").textContent') == 'Nog niets gespeeld.')
        check('geen console-errors', not g.errors, g.errors)
        g.close()

        # ------------------------------------------------------------
        section('26. Grootte: klein en groot verschillen echt, op elk formaat (B)')
        for label, (w, h) in {'360×640': (360, 640), '390×844': (390, 844), '844×390': (844, 390), '800×1280': (800, 1280), '1280×800': (1280, 800), '1920×1080': (1920, 1080)}.items():
            g = Game(browser, url, w=w, h=h, progress=progress_for(0, 35))
            g.start()
            g.js('goToSettings()')
            if w == 360:
                check('twee keuzes: klein en groot', g.js('[...document.querySelectorAll(".size-btn")].map(b => b.dataset.size).join()') == 'small,large')
            seen = {}
            for size in ('small', 'large'):
                g.page.click(f'.size-btn[data-size="{size}"]')
                preview = g.js('Object.fromEntries([...document.querySelectorAll(".size-sample")].map(s => [s.dataset.grid, Math.round(s.querySelector(".sample-cell").getBoundingClientRect().width)]))')
                real = {}
                for grid in (4, 6, 9):
                    g.js('n => startLevel(SudokuEngine.LEVEL_PLAN.findIndex(l => l.size === n), true)', grid)
                    real[str(grid)] = g.js('Math.round(document.querySelector(".sudoku-cell").getBoundingClientRect().width)')
                    g.js('leaveGame(); goToSettings()')
                seen[size] = (preview, real)
            same = all(pv == rl for pv, rl in seen.values())
            ratio = {k: round(seen['small'][1][k] / seen['large'][1][k], 2) for k in ('4', '6', '9')}
            check(f'{label}: voorbeeldblokje = echt vakje, en klein is duidelijk kleiner dan groot (verhouding {ratio})',
                  same and all(r <= 0.8 for r in ratio.values()), seen)
            g.close()

        # ------------------------------------------------------------
        section('27. Privacyverklaring en geen emoji meer (C)')
        g = Game(browser, url)
        g.start()
        g.page.goto(url + 'privacy.html')
        emoji_js = r'() => (document.body.innerText.match(/\p{Extended_Pictographic}/u) || [""])[0]'
        check('terugknop met het kawaii-icoon, geen emoji op de pagina', g.js('document.querySelectorAll(".back svg").length') == 2 and g.js(emoji_js) == '')
        check('taalknoppen bovenaan: Engels, Nederlands, Spaans, Portugees, Indonesisch',
              g.js('[...document.querySelectorAll("#langs button")].map(b => b.textContent).join("|")') == 'English|Nederlands|Español|Português|Bahasa Indonesia')
        check('standaard de taal van de app (Nederlands)', g.js('document.documentElement.lang') == 'nl' and g.js('document.querySelector("h1").textContent') == 'Privacyverklaring')
        shape = {}
        for code, title in (('en', 'Privacy policy'), ('es', 'Política de privacidad'), ('pt', 'Política de privacidade'), ('id', 'Kebijakan privasi'), ('nl', 'Privacyverklaring')):
            g.page.click(f'#langs button[data-lang="{code}"]')
            shape[code] = [g.js('document.querySelector("h1").textContent') == title, g.js('document.querySelectorAll("#policy li").length'),
                           g.js('document.querySelectorAll("#policy h2").length'), g.js('document.querySelector(\'#langs button[aria-pressed="true"]\').dataset.lang') == code,
                           g.js('document.querySelector(".back").textContent.length > 5'), g.js(emoji_js) == '']
        check('alle 5 talen compleet: titel, 6 punten, 4 kopjes, terugknop', all(v == [True, 6, 4, True, True, True] for v in shape.values()), shape)
        g.js('const s = JSON.parse(localStorage.getItem("sudokuKids_settings") || "{}"); s.language = "de"; localStorage.setItem("sudokuKids_settings", JSON.stringify(s))')
        g.page.reload()
        check('app in een taal zonder vertaling (Duits): de verklaring start in het Engels', g.js('document.documentElement.lang') == 'en')
        g.js('const s = JSON.parse(localStorage.getItem("sudokuKids_settings")); s.language = "pt"; localStorage.setItem("sudokuKids_settings", JSON.stringify(s))')
        g.page.reload()
        check('app in het Portugees: de verklaring start in het Portugees', g.js('document.documentElement.lang') == 'pt')
        g.page.click('.back')
        g.page.wait_for_selector('#btn-start')
        check('terugknop gaat terug naar het spel', g.js('typeof startLevel') == 'function')
        check('geen console-errors', not g.errors, g.errors)
        g.close()
        # zoekactie door het hele project: geen emoji in iets wat de speler te zien krijgt
        emoji_re = re.compile('[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍]')
        hits = {}
        for path in sorted([*ROOT.glob('*.html'), *ROOT.glob('*.js'), *ROOT.glob('*.css'), *ROOT.glob('*.json'), *ROOT.glob('docs/*.html'), *ROOT.glob('icons/*.svg')]):
            found = sorted(set(emoji_re.findall(path.read_text(encoding='utf-8'))))
            if found:
                hits[path.name] = found
        check('zoekactie: geen emoji in index.html, privacy.html, docs/, manifest, css, js en de icoon-SVG\'s', hits == {}, hits)
        browser.close()

    failed = results.count(False)
    print(f'\n{"❌" if failed else "✅"} {len(results) - failed}/{len(results)} controles geslaagd.')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(run())
