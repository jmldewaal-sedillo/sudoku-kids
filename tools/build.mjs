#!/usr/bin/env node
// Bouwt uit dezelfde code de versie voor één bouwdoel (zie platform.js en docs/lanceren.md).
//
//   node tools/build.mjs android       -> dist/android/            (webbestanden voor de Capacitor-app)
//   node tools/build.mjs crazygames    -> dist/crazygames/ + dist/sudoku-kids-crazygames.zip
//   node tools/build.mjs poki          -> dist/poki/       + dist/sudoku-kids-poki.zip
//   node tools/build.mjs all           -> alle drie
//
// Elk bouwdoel krijgt: de spelbestanden, de eigen platform.js uit platforms/, GEEN service
// worker, geen manifest en geen testbalk. De portals krijgen hun SDK in index.html en geen
// links naar buiten. Er zit nergens een aanroep in die een advertentie toont.
// Geen npm-pakketten nodig; het zip-bestand maakt het commando `zip`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

// De bestanden van het spel. Nieuw bestand voor het spel? Zet het hier en in ASSETS in sw.js
// (tests/builds.py controleert dat de twee lijsten gelijk lopen).
const FILES = ['index.html', 'style.css', 'storage.js', 'icons.js', 'puzzle-bank.js', 'level-plan.js', 'puzzles.js', 'i18n.js', 'badges.js', 'script.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

const TARGETS = {
  android: { zip: false },
  crazygames: { zip: true, sdk: 'https://sdk.crazygames.com/crazygames-sdk-v3.js' },
  poki: { zip: true, sdk: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js' },
};

function replaceOnce(text, from, to, what) {
  if (text.split(from).length !== 2) throw new Error(`index.html: verwacht precies één keer ${what}`);
  return text.replace(from, to);
}

function build(target) {
  const spec = TARGETS[target];
  const out = path.join(DIST, target);
  fs.rmSync(out, { recursive: true, force: true });
  for (const file of FILES) {
    fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), path.join(out, file));
  }
  fs.copyFileSync(path.join(ROOT, 'platforms', `${target}.js`), path.join(out, 'platform.js'));

  let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  html = replaceOnce(html, '  <link rel="manifest" href="manifest.json" />\n', '', 'de manifest-link');   // geen PWA in de app of op een portal
  if (spec.sdk) {
    // De SDK van de portal moet vóór het spel geladen zijn.
    html = replaceOnce(html, '  <script src="platform.js"></script>\n', `  <script src="${spec.sdk}"></script>\n  <script src="platform.js"></script>\n`, 'platform.js');
  }
  fs.writeFileSync(path.join(out, 'index.html'), html);

  // Controles: wat er niet in mag zitten.
  const all = fs.readdirSync(out, { recursive: true }).map(String).filter(f => fs.statSync(path.join(out, f)).isFile());
  for (const banned of ['sw.js', 'manifest.json', 'test-preview.js']) {
    if (all.includes(banned)) throw new Error(`${target}: ${banned} hoort niet in dit bouwdoel`);
  }
  const platform = fs.readFileSync(path.join(out, 'platform.js'), 'utf8');
  if (!platform.includes(`target: '${target}'`)) throw new Error(`${target}: platform.js is niet die van dit bouwdoel`);
  // Een echte aanroep van een advertentiefunctie (naam + haakje + iets anders dan ")"); uitleg in commentaar mag.
  if (/(commercialBreak|rewardedBreak|requestAd|requestBanner|requestResponsiveBanner)\(\s*[^)\s]/.test(platform)) throw new Error(`${target}: er zit een advertentie-aanroep in platform.js`);
  const bytes = all.reduce((sum, f) => sum + fs.statSync(path.join(out, f)).size, 0);

  let zipInfo = '';
  if (spec.zip) {
    const zip = path.join(DIST, `sudoku-kids-${target}.zip`);
    fs.rmSync(zip, { force: true });
    execFileSync('zip', ['-q', '-r', '-X', zip, '.'], { cwd: out });     // index.html staat in de root van het zip-bestand
    zipInfo = `, zip ${(fs.statSync(zip).size / 1024).toFixed(0)} kB -> dist/${path.basename(zip)}`;
  }
  console.log(`✅ ${target}: ${all.length} bestanden, ${(bytes / 1024).toFixed(0)} kB in dist/${target}/${zipInfo}`);
}

const asked = process.argv[2];
const list = asked === 'all' ? Object.keys(TARGETS) : [asked];
if (!asked || list.some(t => !TARGETS[t])) {
  console.error('Gebruik: node tools/build.mjs android | crazygames | poki | all');
  process.exit(2);
}
list.forEach(build);
