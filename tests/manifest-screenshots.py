#!/usr/bin/env python3
"""Maakt de twee screenshots (1080x1920) uit manifest.json opnieuw:

    python3 tests/manifest-screenshots.py

Draai dit na een zichtbare wijziging aan de wereldkaart of het spelscherm.
"""
import json

from playwright.sync_api import sync_playwright

from screenshots import ROOT, serve

PROGRESS = {f'w0_l{i}': {'stars': 3 - (i % 2), 'time': 40} for i in range(22)}
PROGRESS.update({f'w1_l{i}': {'stars': 3, 'time': 90} for i in range(6)})

with serve() as url, sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={'width': 360, 'height': 640}, device_scale_factor=3,
                              locale='nl-NL', service_workers='block')
    page = ctx.new_page()
    page.add_init_script('localStorage.setItem("sudokuKids_progress", %s)' % json.dumps(json.dumps(PROGRESS)))
    page.goto(url)
    page.click('#btn-start')
    page.wait_for_timeout(1200)
    page.screenshot(path=str(ROOT / 'screenshots' / 'worlds.png'))
    page.evaluate('startLevel(SudokuEngine.LEVEL_PLAN.findIndex(l => l.size === 6), true)')
    page.wait_for_timeout(600)
    for idx, val in page.evaluate(
            'gameState.given.map((g, i) => g ? null : [i, gameState.solution[i]]).filter(Boolean).slice(0, 5)'):
        page.click(f'#sudoku-grid > :nth-child({idx + 1})')
        page.click(f'.num-btn[data-num="{val}"]')
    page.evaluate('showMascotMessage(pick("mGood"))')
    page.wait_for_timeout(700)
    page.screenshot(path=str(ROOT / 'screenshots' / 'game.png'))
    browser.close()
print('screenshots/worlds.png en screenshots/game.png vernieuwd')
