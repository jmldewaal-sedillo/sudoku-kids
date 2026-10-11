#!/usr/bin/env python3
"""Test van de bouwdoelen: android, crazygames en poki (tools/build.mjs).

  python3 tests/builds.py

Bouwt alle drie opnieuw en speelt elke versie in een echte browser (Playwright). De SDK van
de portals en de Capacitor-brug van Android worden nagebootst, zodat te zien is welke
aanroepen het spel doet. Controleert onder meer: geen service worker, geen links naar buiten
op de portals, de goede SDK-aanroepen in de goede volgorde, GEEN enkele advertentie-aanroep,
de terugknop van Android, de tweede kopie van de opslag, en dat opslag, geluid, ouderslot en
"voortgang overzetten" werken in de Android-versie.
"""
import functools
import http.server
import json
import pathlib
import re
import subprocess
import sys
import threading
import zipfile

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
SITE = 'https://studiosedillo.com/sudoku-kids/'
SDK = {'crazygames': 'https://sdk.crazygames.com/crazygames-sdk-v3.js', 'poki': 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js'}
results = []

# Nagebootste SDK's: elke aanroep komt in window.__calls. Ook de advertentiefuncties bestaan,
# zodat een aanroep ervan gezien wordt.
FAKE_CRAZY = '''window.__calls = [];
const log = n => (...a) => { window.__calls.push(n); return Promise.resolve(); };
window.CrazyGames = { SDK: { environment: 'crazygames', init: log('init'),
  game: { loadingStart: log('loadingStart'), loadingStop: log('loadingStop'), gameplayStart: log('gameplayStart'), gameplayStop: log('gameplayStop'), happytime: log('happytime') },
  ad: { requestAd: log('AD requestAd'), hasAdblock: log('AD hasAdblock') }, banner: { requestBanner: log('AD requestBanner'), requestResponsiveBanner: log('AD requestResponsiveBanner') } } };'''
FAKE_POKI = '''window.__calls = [];
const log = n => (...a) => { window.__calls.push(n); return Promise.resolve(); };
window.PokiSDK = { init: log('init'), gameLoadingFinished: log('gameLoadingFinished'), gameplayStart: log('gameplayStart'), gameplayStop: log('gameplayStop'),
  commercialBreak: log('AD commercialBreak'), rewardedBreak: log('AD rewardedBreak'), openExternalLink: log('openExternalLink') };'''
# Nagebootste Capacitor-brug: App (terugknop) en Preferences (native opslag, hier een object dat
# een herlaadbeurt overleeft via window.name).
FAKE_CAPACITOR = '''(() => {
  const store = JSON.parse(window.name || '{}');
  const save = () => { window.name = JSON.stringify(store); };
  window.__cap = { listeners: {}, minimized: 0, store };
  window.Capacitor = { Plugins: {
    App: { addListener: (name, fn) => { window.__cap.listeners[name] = fn; return Promise.resolve({ remove() {} }); },
           minimizeApp: () => { window.__cap.minimized++; return Promise.resolve(); } },
    Preferences: { set: ({ key, value }) => { store[key] = value; save(); return Promise.resolve(); },
                   get: ({ key }) => Promise.resolve({ value: key in store ? store[key] : null }),
                   remove: ({ key }) => { delete store[key]; save(); return Promise.resolve(); },
                   keys: () => Promise.resolve({ keys: Object.keys(store) }) } } };
})();'''


def section(name):
    print(f'\n{name}')


def check(name, ok, detail=''):
    results.append(bool(ok))
    print(f'  {"✅" if ok else "❌"} {name}' + ('' if ok else f'  [{detail}]'))


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(folder):
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(folder)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f'http://127.0.0.1:{server.server_address[1]}/'


class Game:
    def __init__(self, browser, url, fake_sdk=None, init=None):
        self.ctx = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True)
        self.page = self.ctx.new_page()
        self.errors, self.outside = [], []
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))
        self.page.on('console', lambda m: self.errors.append(m.text) if m.type == 'error' else None)
        self.page.on('request', lambda r: self.outside.append(r.url) if not r.url.startswith(url) else None)
        if fake_sdk:     # het echte SDK-adres levert onze nagebootste SDK
            self.page.route(re.compile(r'^https://(sdk\.crazygames\.com|game-cdn\.poki\.com)/'), lambda route: route.fulfill(content_type='application/javascript', body=fake_sdk))
        if init:
            self.page.add_init_script(init)
        self.url = url
        self.page.goto(url)
        self.page.wait_for_selector('#btn-start')

    def js(self, code):
        return self.page.evaluate(code)

    def play_one(self):
        """Start, wereld 0, level 0, oplossen tot het winscherm."""
        self.page.click('#btn-start')
        self.page.click('#world-card-0')
        self.page.click('.level-btn[data-level="0"]')
        if self.js('!document.getElementById("modal-rules").classList.contains("hidden")'):
            self.page.click('#btn-rules-ok')
        self.page.wait_for_timeout(450)
        for idx, value in self.js('gameState.grid.map((v, i) => v === gameState.solution[i] ? null : [i, gameState.solution[i]]).filter(Boolean)'):
            self.page.click(f'#sudoku-grid > :nth-child({idx + 1})')
            self.page.click(f'.num-btn[data-num="{value}"]')
        self.page.wait_for_selector('#modal-win:not(.hidden)')

    def close(self):
        self.ctx.close()


def run():
    section('Bouwen')
    built = subprocess.run(['node', str(ROOT / 'tools' / 'build.mjs'), 'all'], capture_output=True, text=True)
    print('  ' + built.stdout.strip().replace('\n', '\n  '))
    check('node tools/build.mjs all slaagt', built.returncode == 0, built.stderr[-300:])
    if built.returncode:
        return 1
    assets = sorted({a[2:] for a in re.findall(r"'(\./[^']+)'", (ROOT / 'sw.js').read_text()) if a != './' and a != './manifest.json'})
    for target in ('android', 'crazygames', 'poki'):
        files = sorted(str(f.relative_to(DIST / target)) for f in (DIST / target).rglob('*') if f.is_file())
        html = (DIST / target / 'index.html').read_text()
        platform = (DIST / target / 'platform.js').read_text()
        check(f'{target}: dezelfde spelbestanden als de cache-lijst van sw.js, zonder sw.js, manifest en testbalk',
              files == assets and 'rel="manifest"' not in html, sorted(set(files) ^ set(assets)))
        check(f'{target}: platform.js is die van dit bouwdoel en zet de service worker uit',
              f"target: '{target}'" in platform and 'serviceWorker: false' in platform)
        outside = sorted(set(re.findall(r'(?:src|href)="(https?://[^"]+)"', html)))
        expected = [SDK[target]] if target in SDK else []
        check(f'{target}: index.html laadt van buiten alleen ' + ('de SDK van de portal' if expected else 'niets (de links naar de hoofdsite zijn gewone links)'),
              [u for u in outside if not u.startswith(SITE)] == expected, outside)
    for target in SDK:
        with zipfile.ZipFile(DIST / f'sudoku-kids-{target}.zip') as z:
            names = z.namelist()
            size = sum(i.file_size for i in z.infolist())
        check(f'{target}: zip met index.html in de root, {len([n for n in names if not n.endswith("/")])} bestanden, {size // 1024} kB uitgepakt (CrazyGames: eerste download hoogstens 50 MB, 20 MB voor mobiel; hoogstens 1500 bestanden)',
              'index.html' in names and 'sw.js' not in names and size < 20 * 1024 * 1024 and len(names) < 1500, names[:5])

    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])

        for target, fake, start_events in (('crazygames', FAKE_CRAZY, ['init', 'loadingStart', 'loadingStop']), ('poki', FAKE_POKI, ['init', 'gameLoadingFinished'])):
            section(f'Portal: {target}')
            server, url = serve(DIST / target)
            g = Game(browser, url, fake_sdk=fake)
            g.page.wait_for_function('window.__calls && window.__calls.length >= %d' % len(start_events))
            check(f'bij het laden: {", ".join(start_events)}; nog geen gameplayStart', g.js('window.__calls') == start_events, g.js('window.__calls'))
            check('geen service worker geregistreerd', g.js('navigator.serviceWorker.getRegistrations().then(r => r.length)') == 0)
            g.play_one()
            calls = g.js('window.__calls')[len(start_events):]
            check('een level spelen: gameplayStart bij de start, gameplayStop bij het winscherm', calls == ['gameplayStart', 'gameplayStop'], calls)
            g.page.click('#btn-win-next')
            g.page.wait_for_timeout(300)
            g.js('leaveGame()')
            g.js('leaveGame()')
            calls = g.js('window.__calls')[len(start_events):]
            check('volgend level en het level verlaten: start en stop wisselen elkaar af, nooit twee keer hetzelfde achter elkaar',
                  calls == ['gameplayStart', 'gameplayStop', 'gameplayStart', 'gameplayStop'], calls)
            check('GEEN enkele advertentie-aanroep (requestAd, banners, commercialBreak, rewardedBreak)', not [c for c in g.js('window.__calls') if c.startswith('AD')], g.js('window.__calls'))
            g.js('goToSettings()')
            check('geen links naar buiten: privacy- en verwijderlink zijn verborgen',
                  g.js('[...document.querySelectorAll(".settings-link")].every(a => a.hidden && a.offsetParent === null)') and g.js('document.querySelectorAll(".settings-link").length') == 2)
            check('voortgang blijft bewaard in localStorage (zelfde sleutels)', g.js('JSON.parse(localStorage.getItem("sudokuKids_progress")).w0_l0.stars') >= 1)
            check('alle verzoeken blijven op het eigen adres, behalve de SDK', sorted(set(g.outside)) == [SDK[target]], sorted(set(g.outside)))
            check('geen console-errors', not g.errors, g.errors)
            g.close()
            # Zonder SDK (geblokkeerd of offline) moet het spel gewoon werken.
            ctx = browser.new_context(viewport={'width': 390, 'height': 844})
            page = ctx.new_page()
            broken = []
            page.on('pageerror', lambda e: broken.append(str(e)))
            page.route(re.compile(r'^https://(sdk\.crazygames\.com|game-cdn\.poki\.com)/'), lambda route: route.abort())
            page.goto(url)
            page.click('#btn-start')
            page.click('#world-card-0')
            check('de SDK is niet te laden: het spel start toch, zonder fouten', page.evaluate('currentScreen') == 'levels' and not broken, broken)
            ctx.close()
            server.shutdown()

        section('Android (Capacitor), met een nagebootste brug')
        server, url = serve(DIST / 'android')
        g = Game(browser, url, init=FAKE_CAPACITOR)
        check('platform android; geen service worker; links naar de hoofdsite in de taal van de app',
              g.js('SudokuPlatform.target') == 'android' and g.js('navigator.serviceWorker.getRegistrations().then(r => r.length)') == 0 and
              g.js('document.getElementById("link-privacy").href').startswith(SITE + 'privacy?lang=') and g.js('document.getElementById("link-privacy").target') == '_blank')
        check('de terugknop van Android is aangemeld bij Capacitor', g.js('typeof window.__cap.listeners.backButton') == 'function')
        g.js('window.__cap.listeners.backButton({ canGoBack: false })')
        check('terugknop op het startscherm: de app gaat naar de achtergrond', g.js('window.__cap.minimized') == 1)
        g.play_one()
        g.js('window.__cap.listeners.backButton({ canGoBack: true })')
        g.page.wait_for_function('document.getElementById("modal-win").classList.contains("hidden")')
        check('terugknop op het winscherm: het venster sluit, terug naar de levels', g.js('currentScreen') == 'levels')
        g.page.click('.level-btn[data-level="1"]')
        g.page.wait_for_timeout(300)
        g.js('window.__cap.listeners.backButton({ canGoBack: true })')
        g.page.wait_for_function('currentScreen === "levels"')
        g.js('window.__cap.listeners.backButton({ canGoBack: true })')
        g.page.wait_for_function('currentScreen === "worlds"')
        check('terugknop in een puzzel: naar de levels; daarna naar de werelden; de app sluit niet', g.js('window.__cap.minimized') == 1)
        g.js('window.__cap.listeners.backButton({ canGoBack: false })')
        check('terugknop op de wereldkaart: de app gaat naar de achtergrond', g.js('window.__cap.minimized') == 2)

        mirror = g.js('window.__cap.store')
        local = g.js('Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith("sudokuKids_")).map(k => [k, localStorage.getItem(k)]))')
        check('opslag: zelfde sleutels als overal (sudokuKids_…), en de tweede kopie in Preferences is gelijk', len(local) >= 4 and mirror == local, sorted(set(mirror) ^ set(local)))
        stars = g.js('getTotalStars()')
        g.js('localStorage.clear()')            # het systeem heeft de opslag van de WebView gewist
        g.page.reload()
        g.page.wait_for_function('localStorage.getItem("sudokuKids_progress") !== null')
        g.page.wait_for_selector('#btn-start')
        g.page.wait_for_function('typeof getTotalStars === "function"')
        check('opslag van de WebView gewist: de app zet de tweede kopie terug, de sterren zijn er nog', stars >= 1 and g.js('getTotalStars()') == stars, g.js('getTotalStars()'))

        g.page.click('#btn-start')
        g.js('goToSettings()')
        g.js('settings.sound = true; settings.music = true; saveSettings(); syncMusic(); playPlace()')
        g.page.wait_for_timeout(400)
        check('geluid: de audio-context draait en de muziek speelt', g.js('audioCtx && audioCtx.state') == 'running' and g.js('music.on') is True, g.js('[audioCtx && audioCtx.state, music.on]'))
        g.js('settings.music = false; saveSettings(); syncMusic()')
        g.page.click('#btn-wipe-all')
        check('ouderslot: "Alle gegevens verwijderen" vraagt eerst het ouderslot', g.js('!document.getElementById("modal-parent").classList.contains("hidden")'))
        g.js('hideModals()')
        g.js('goToProfiles()')
        g.js('openTransfer()')
        g.page.click('#btn-export')
        code = g.js('document.getElementById("transfer-code").value')
        check('voortgang overzetten: code maken werkt; "Bewaar als bestand" is verborgen (een WebView downloadt niet); kopiëren en importeren zijn er',
              code.startswith('SK1.') and g.js('document.getElementById("btn-file").hidden') and g.js('document.getElementById("btn-copy").offsetParent !== null') and
              g.js('document.getElementById("transfer-input") !== null'))
        check('de code bevat de voortgang en is weer te lezen', g.js(f"SudokuStorage.readCode({json.dumps(code)}).profiles.length") >= 1)
        g.js('hideModals(); window.__noReload = true')
        g.js('wipeAllData()')
        g.page.wait_for_function('Object.keys(window.__cap.store).length === 0')
        check('"Alle gegevens verwijderen" wist ook de tweede kopie', g.js('Object.keys(localStorage).filter(k => k.startsWith("sudokuKids_")).length') == 0)
        check('geen enkel verzoek naar een ander adres', not g.outside, g.outside)
        check('geen console-errors', not g.errors, g.errors)
        g.close()
        server.shutdown()

        section('Android-project (Capacitor)')
        app = ROOT / 'android-app'
        config = json.loads((app / 'capacitor.config.json').read_text())
        gradle = (app / 'android' / 'app' / 'build.gradle').read_text()
        manifest = (app / 'android' / 'app' / 'src' / 'main' / 'AndroidManifest.xml').read_text()
        variables = (app / 'android' / 'variables.gradle').read_text()
        check('package com.studiosedillo.sudokukids; de webbestanden komen uit dist/android (ze zitten ín de app)',
              config['appId'] == 'com.studiosedillo.sudokukids' and config['webDir'] == '../dist/android' and 'server' not in config and
              'applicationId "com.studiosedillo.sudokukids"' in gradle)
        check('target-API 36 of hoger (eis van Google Play)', int(re.search(r'targetSdkVersion = (\d+)', variables).group(1)) >= 36)
        permissions = re.findall(r'<uses-permission android:name="([^"]+)"(?! tools:node="remove")', manifest)
        check('permissies: alleen INTERNET; reclame-id uitdrukkelijk verwijderd; geen back-up naar Google',
              permissions == ['android.permission.INTERNET'] and 'com.google.android.gms.permission.AD_ID" tools:node="remove"' in manifest and 'android:allowBackup="false"' in manifest, permissions)
        check('ondertekenen leest keystore.properties (niet in Git); er staat geen wachtwoord of sleutel in de repo',
              "rootProject.file('keystore.properties')" in gradle and not list(app.rglob('*.keystore')) and not list(app.rglob('*.jks')) and not (app / 'android' / 'keystore.properties').exists())
        ignored = subprocess.run(['git', 'check-ignore', 'android-app/android/keystore.properties', 'android-app/x.keystore', 'android-app/android/app/release.aab', 'dist/android/index.html'],
                                 cwd=ROOT, capture_output=True, text=True).stdout.split()
        check('.gitignore houdt keystore.properties, keystores, .aab en dist/ buiten Git', len(ignored) == 4, ignored)
        browser.close()

    failed = results.count(False)
    print(f'\n{"❌" if failed else "✅"} {len(results) - failed}/{len(results)} controles geslaagd.')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(run())
