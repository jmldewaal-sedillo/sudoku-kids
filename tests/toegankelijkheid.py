#!/usr/bin/env python3
"""Toegankelijkheid volgens WCAG 2.1 AA met axe-core: contrast, namen van knoppen, taal, ARIA.

    python3 tests/toegankelijkheid.py

Loopt elk hoofdscherm en de dialogen na, in elke taal. Exitcode 1 als er iets gevonden wordt.
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

from screenshots import serve

AXE = (pathlib.Path(__file__).parent / 'axe.min.js').read_text()
LANGUAGES = ['nl', 'en', 'de', 'fr', 'es', 'pt', 'it', 'pl', 'tr', 'id']
RUN = """async () => {
  const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] });
  return r.violations.map(v => v.id + ': ' + v.nodes.slice(0, 4).map(n => n.target.join(' ')).join(' | '));
}"""
problems = []


def scan(page, lang, what):
    page.evaluate('() => document.getAnimations().forEach(a => a.finish && a.effect.getTiming().iterations !== Infinity && a.finish())')
    found = page.evaluate(RUN)
    print(('  ✅ ' if not found else '  ❌ ') + f'{lang} {what}' + (f'  {found}' if found else ''))
    problems.extend(found)


def run():
    with serve() as url, sync_playwright() as p:
        browser = p.chromium.launch()
        for lang in LANGUAGES:
            ctx = browser.new_context(viewport={'width': 360, 'height': 640}, locale=lang, reduced_motion='reduce')
            page = ctx.new_page()
            page.add_init_script('window.__noAutoRules = true;')
            page.goto(url)
            page.evaluate('() => { settings.motion = "off"; applyMotion(); }')
            page.evaluate(AXE)
            scan(page, lang, 'startscherm')
            page.evaluate('goToWorlds()'); scan(page, lang, 'werelden')
            page.evaluate('goToLevels(0)'); scan(page, lang, 'levels')
            page.click('#levels-grid button')
            page.wait_for_selector('#sudoku-grid > :first-child')
            scan(page, lang, 'spel')
            page.evaluate('showScreen("settings")')
            scan(page, lang, 'instellingen')
            for modal in ('confirm', 'parent', 'wipe', 'rules', 'credits', 'links', 'transfer', 'import', 'delete'):
                page.evaluate('m => showModal(m)', modal)
                scan(page, lang, 'dialoog ' + modal)
            page.evaluate('hideModals()')
            ctx.close()
        browser.close()
    print(f'\n{"❌ " + str(len(problems)) + " problemen" if problems else "✅ Geen toegankelijkheidsproblemen"}')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(run())
