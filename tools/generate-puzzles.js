#!/usr/bin/env node
/* ============================================================
   Nieuwe puzzels of levels maken – één commando.

   Overzicht van wat er is:
       node tools/generate-puzzles.js --status
   Hoeveel unieke puzzels zijn er maximaal mogelijk per soort:
       node tools/generate-puzzles.js --max
   Extra puzzels in de voorraad (per moeilijkheidsband van die soort):
       node tools/generate-puzzles.js --soort 4x4-standard --aantal 50
   Extra levels achteraan een wereld:
       node tools/generate-puzzles.js --levels --wereld 0 --soort 6x6-fruit --aantal 10
       (optioneel --van 0 --tot 1: van de makkelijkste band (0) naar de moeilijkste (1))

   Soorten: 4x4-standard, 4x4-fruit, 6x6-standard, 6x6-x, 6x6-fruit,
            9x9-standard, 9x9-x, 9x9-fruit

   Na elke wijziging draait het script zelf de validatie en werkt het de
   snapshots bij. Het voegt alleen TOE: bestaande puzzels en levels houden
   hun nummer en veranderen niet (de validatie weigert anders).
   Dit is geen build-stap van de app: puzzle-bank.js en level-plan.js staan
   gewoon in de repository.

   Puzzel n van een soort komt altijd uit bankSeed(soort, n). Een kandidaat
   telt mee als hij zonder gokken op te lossen is, in een band valt, nog
   niet voorkomt (ook niet als level-puzzel) en – bij 4×4 – ook na draaien,
   spiegelen of omnummeren niet al voorkomt.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BANK_FILE = path.join(ROOT, 'puzzle-bank.js');
const PLAN_FILE = path.join(ROOT, 'level-plan.js');
const MAX_N = 3000000;
const KEEP_FOR_REPLAY = 50;     // puzzles per band that must stay free for "play again"

const args = process.argv.slice(2);
const flag = name => args.includes('--' + name);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };

// '4x4-standard' / '6x6-x' / '9x9-fruit'  ->  '4-standard' / '6-xsudoku' / '9-shapes'
const TYPE_IN = { standard: 'standard', standaard: 'standard', fruit: 'shapes', shapes: 'shapes', x: 'xsudoku', xsudoku: 'xsudoku' };
const TYPE_OUT = { standard: 'standard', shapes: 'fruit', xsudoku: 'x' };
function parseKind(text) {
  const m = /^(\d)(?:x\d)?-(\w+)$/.exec(String(text || '').toLowerCase());
  const kind = m && TYPE_IN[m[2]] ? m[1] + '-' + TYPE_IN[m[2]] : null;
  if (!kind || !E().BANDS[kind]) fail(`Onbekende soort "${text}". Kies uit: ${Object.keys(E().BANDS).map(showKind).join(', ')}`);
  return kind;
}
function showKind(kind) { const [s, t] = kind.split('-'); return `${s}x${s}-${TYPE_OUT[t]}`; }
function fail(msg) { console.error('❌ ' + msg); process.exit(1); }

// The engine is loaded fresh after every write, so it always sees the new files.
function E() {
  ['puzzles.js', 'puzzle-bank.js', 'level-plan.js'].forEach(f => { delete require.cache[path.join(ROOT, f)]; });
  return require(path.join(ROOT, 'puzzles.js'));
}
function readBank() { try { delete require.cache[BANK_FILE]; return JSON.parse(JSON.stringify(require(BANK_FILE))); } catch (e) { return {}; } }
function readPlan() { try { delete require.cache[PLAN_FILE]; return require(PLAN_FILE).slice(); } catch (e) { return []; } }

function writeBank(bank) {
  const lines = Object.keys(bank).map(kind =>
    `  ${JSON.stringify(kind)}: {\n` + Object.keys(bank[kind]).map(key =>
      `    ${JSON.stringify(key)}: ${JSON.stringify(bank[kind][key])}`).join(',\n') + '\n  }').join(',\n');
  fs.writeFileSync(BANK_FILE,
`/* SUDOKU KIDS – puzzle-bank.js
   Voorraad puzzels per soort en moeilijkheidsband: [nummer, gegeven vakjes].
   Gemaakt door tools/generate-puzzles.js – niet met de hand aanpassen.
   Cijfers = gegeven vakjes, a..z = 1..26 lege vakjes achter elkaar. */
(function (root) {
  'use strict';
  const bank = {
${lines}
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = bank;
  else root.SUDOKU_BANK = bank;
})(typeof window !== 'undefined' ? window : globalThis);
`);
}
function writePlan(plan) {
  fs.writeFileSync(PLAN_FILE,
`/* SUDOKU KIDS – level-plan.js
   Alle levels ná de eerste 105: [wereld, soort, band, puzzelnummer].
   Gemaakt door tools/generate-puzzles.js – niet met de hand aanpassen en
   nooit regels verwijderen of verplaatsen: nieuwe levels komen achteraan,
   zodat 'w<wereld>_l<index>' in de voortgang van spelers nooit verschuift. */
(function (root) {
  'use strict';
  const levels = [
${plan.map(l => '    ' + JSON.stringify(l)).join(',\n')}
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = levels;
  else root.SUDOKU_LEVELS = levels;
})(typeof window !== 'undefined' ? window : globalThis);
`);
}

// Fills the bands of one kind up to `want(key)` puzzles. Existing puzzles stay exactly as they are.
function growBank(kind, want) {
  const e = E();
  const bank = readBank();
  const size = +kind.split('-')[0], diag = kind.endsWith('xsudoku');
  const seenExact = new Set(), seenCanon4 = new Set();
  e.LEVEL_PLAN.forEach(lv => {
    const p = e.getPuzzle(lv.globalIndex);
    seenExact.add(lv.size + ':' + p.given.join(''));
    if (lv.size === 4) seenCanon4.add(e.canonical4(p.given));
  });
  let lastN = 0;
  for (const k of Object.keys(e.BANDS)) {
    bank[k] = bank[k] || {};
    for (const band of e.BANDS[k]) {
      const key = band[0] + '-' + band[1];
      bank[k][key] = bank[k][key] || [];
      bank[k][key].forEach(([n, text]) => {
        const given = e.decodeGiven(text);
        seenExact.add(k[0] + ':' + given.join(''));
        if (k[0] === '4') seenCanon4.add(e.canonical4(given));
        if (k === kind) lastN = Math.max(lastN, n);
      });
    }
  }
  const keys = e.BANDS[kind].map(b => b[0] + '-' + b[1]);
  const targets = {};
  keys.forEach(key => { targets[key] = want(key); });
  const open = () => keys.filter(key => bank[kind][key].length < targets[key]);
  let n = lastN, added = 0;
  while (open().length && n < MAX_N) {
    n++;
    const p = e.bankCandidate(kind, n);
    const id = e.bandFor(kind, p.givens);
    if (!id) continue;
    const key = id.split('/')[1];
    if (bank[kind][key].length >= targets[key]) continue;
    if (!e.solvableBySingles(p.given, size, diag)) continue;
    const exact = size + ':' + p.given.join('');
    if (seenExact.has(exact)) continue;
    if (size === 4) {
      const c = e.canonical4(p.given);
      if (seenCanon4.has(c)) continue;
      seenCanon4.add(c);
    }
    seenExact.add(exact);
    bank[kind][key].push([n, e.encodeGiven(p.given)]);
    added++;
  }
  if (open().length) fail(`${showKind(kind)}: niet genoeg nieuwe puzzels gevonden voor band ${open().join(', ')} (gezocht t/m n=${n}). Zie --max.`);
  writeBank(bank);
  return added;
}

function status() {
  const e = E();
  console.log('Levels per wereld en rastergrootte:');
  for (let w = 0; w < e.WORLD_COUNT; w++) {
    const per = {};
    e.LEVEL_PLAN.filter(l => l.world === w).forEach(l => { per[l.size] = (per[l.size] || 0) + 1; });
    console.log(`  wereld ${w}: ` + Object.keys(per).map(s => `${per[s]}× ${s}x${s}`).join(' · ') + `  (totaal ${Object.values(per).reduce((a, b) => a + b, 0)})`);
  }
  console.log('\nVoorraad per soort (puzzels per band, makkelijk → moeilijk; tussen haakjes: in gebruik als eigen puzzel van een level):');
  for (const kind of Object.keys(e.BANDS)) {
    const parts = e.BANDS[kind].map(b => {
      const id = e.bandId(kind, b);
      return `${e.bankOf(id).length} (${e.bankOf(id).length - e.poolOf(id).length})`;
    });
    console.log(`  ${showKind(kind).padEnd(13)} ${parts.join(', ')}`);
  }
}

function showMax() {
  const e = E();
  console.log('Hoeveel unieke puzzels zijn er maximaal mogelijk?\n');
  console.log('4×4 – precies geteld (zonder gokken op te lossen; "echt" = niet in elkaar om te zetten');
  console.log('door draaien, spiegelen, rijen/kolommen/blokken wisselen of omnummeren):');
  const { count4x4 } = require(path.join(ROOT, 'tests', 'count-4x4.js'));
  const counts = count4x4(false);
  console.log('  gegeven   totaal      echt verschillend   in voorraad (standaard + fruit)');
  for (let k = 12; k >= 4; k--) {
    const have = ['4-standard', '4-shapes'].reduce((s, kind) => s + e.bankOf(kind + '/' + k + '-' + k).length, 0);
    console.log(`  ${String(k).padStart(5)}   ${String(counts[k].total).padStart(9)}   ${String(counts[k].distinct).padStart(17)}   ${have || '-'}`);
  }
  console.log('  → de voorraad gebruikt alleen echt verschillende 4×4-puzzels; per band is "echt verschillend" dus de bovengrens.');
  console.log('\n6×6 en 9×9 – niet uit te tellen, praktisch onbeperkt:');
  console.log('  6×6 heeft 28.200.960 verschillende oplossingen, 9×9 heeft er 6.670.903.752.021.072.936.960;');
  console.log('  elke oplossing levert veel verschillende startroosters op. De grens is hier rekentijd, niet het aantal.');
  console.log('  Hoe moeilijker de band, hoe meer kandidaten er nodig zijn per bruikbare puzzel:');
  for (const kind of Object.keys(e.BANDS).filter(k => k[0] !== '4')) {
    const hits = {}; const tries = 300;
    for (let n = 1; n <= tries; n++) { const id = e.bandFor(kind, e.bankCandidate(kind, n).givens); if (id) hits[id] = (hits[id] || 0) + 1; }
    console.log(`  ${showKind(kind).padEnd(13)} ` + e.BANDS[kind].map(b => `${b[0]}-${b[1]}: ${Math.round((hits[e.bandId(kind, b)] || 0) / tries * 100)}%`).join('  '));
  }
  console.log('  (percentage van 300 kandidaten dat in die band terechtkomt)');
}

function addLevels(world, kind, count, from, to) {
  const e = E();
  if (!(world >= 0 && world <= 9)) fail('Geef --wereld 0..9');
  const bands = e.BANDS[kind];
  const plan = readPlan();
  const wanted = [];
  for (let i = 0; i < count; i++) {
    const f = count === 1 ? from : from + (to - from) * i / (count - 1);
    wanted.push(bands[Math.min(bands.length - 1, Math.max(0, Math.round(f * (bands.length - 1))))]);
  }
  // Every band must have enough puzzles that are not yet a level's own puzzle,
  // and keep at least KEEP_FOR_REPLAY free for "play again".
  const need = {};
  wanted.forEach(b => { const key = b[0] + '-' + b[1]; need[key] = (need[key] || 0) + 1; });
  const usedIn = key => plan.filter(l => l[1] === kind && l[2] === key).length;
  const size = key => e.bankOf(kind + '/' + key).length;
  if (Object.keys(need).some(key => size(key) - usedIn(key) - need[key] < KEEP_FOR_REPLAY)) {
    growBank(kind, key => Math.max(size(key), usedIn(key) + (need[key] || 0) + KEEP_FOR_REPLAY));
  }
  const e2 = E();
  const taken = new Set(plan.map(l => l[1] + '#' + l[3]));
  for (const band of wanted) {
    const key = band[0] + '-' + band[1];
    const free = e2.bankOf(kind + '/' + key).find(p => !taken.has(p.id));
    taken.add(free.id);
    plan.push([world, kind, key, free.n]);
  }
  writePlan(plan);
}

function validate() {
  const run = extra => execFileSync('node', [path.join(ROOT, 'tests', 'validate-levels.js'), ...extra], { stdio: ['ignore', 'pipe', 'inherit'] }).toString();
  try {
    run(['--update-snapshot']);
    const out = run([]);
    console.log(out.split('\n').filter(l => l.startsWith('✅')).join('\n'));
  } catch (err) {
    fail('De validatie is mislukt (zie hierboven). Herstel met `git checkout puzzle-bank.js level-plan.js tests/`.');
  }
}

// ---------- main ----------
if (flag('status') || !args.length) { status(); if (!args.length) console.log('\nZie de kop van dit bestand voor de commando\'s.'); process.exit(0); }
if (flag('max')) { showMax(); process.exit(0); }

const kind = parseKind(opt('soort'));
const count = parseInt(opt('aantal', '0'), 10);
if (!(count > 0)) fail('Geef --aantal <getal>');
const t0 = Date.now();
if (flag('levels')) {
  const world = parseInt(opt('wereld', '-1'), 10);
  addLevels(world, kind, count, parseFloat(opt('van', '0')), parseFloat(opt('tot', '1')));
  console.log(`${count} levels (${showKind(kind)}) toegevoegd achteraan wereld ${world}.`);
} else {
  const e = E();
  const added = growBank(kind, key => e.bankOf(kind + '/' + key).length + count);
  console.log(`${added} puzzels toegevoegd aan de voorraad van ${showKind(kind)} (${count} per band).`);
}
if (!flag('geen-validatie')) validate();
console.log(`Klaar in ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
