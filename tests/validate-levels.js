#!/usr/bin/env node
/* ============================================================
   Level validator – run after every change to puzzles.js:
       node tests/validate-levels.js
   Checks every level for:
     1. a valid solution (rows, columns, boxes, and diagonals for X-Sudoku)
     2. givens that match the solution
     3. exactly ONE solution (so the game never rejects a correct move)
     4. the same puzzle on every run (seeded, so saved stars stay valid)
     5. generation time (the game generates a level when it is opened)
     6. solvable with simple logic only (no guessing needed)
     7. identical to tests/levels.snapshot.json, so a change to puzzles.js
        can never silently give players a different puzzle for a level.
        After a DELIBERATE change: node tests/validate-levels.js --update-snapshot
   And every puzzle of the bank (puzzle-bank.js, 100 per difficulty band) for:
     8. valid, exactly one solution, solvable without guessing
     9. the number of givens that belongs to its band (equally hard)
    10. no duplicates – also not with a level puzzle, and for 4×4 not even
        after mirroring, swapping or renaming the numbers
    11. puzzle (kind, n) is exactly what bankSeed(kind, n) produces
    12. unchanged since tests/bank.snapshot.json (puzzles may be ADDED, never changed)
   Exits with code 1 if anything is wrong.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const E = require(path.join(__dirname, '..', 'puzzles.js'));

const WORLD_NAMES = ['Dierenbos', 'Snoepjesfabriek', 'Ruimte-raket', 'Boerderij', 'Jungle'];
const LEVELS_PER_SIZE = 50;        // every world: 50 levels per grid size it contains
const errors = [];
let slowest = 0;
const perWorld = Array.from({ length: E.WORLD_COUNT }, () => []);

for (const lv of E.LEVEL_PLAN) {
  const label = `${WORLD_NAMES[lv.world]} level ${lv.indexInWorld + 1} (${lv.size}x${lv.size} ${lv.type})`;
  const diag = lv.type === 'xsudoku';

  const legacy = lv.globalIndex < E.LEGACY_LEVELS;
  const t0 = Date.now();
  const p = legacy ? E.generatePuzzle(lv.size, diag, lv.target, lv.seed) : E.getPuzzle(lv.globalIndex);
  const ms = Date.now() - t0;
  slowest = Math.max(slowest, ms);
  if (!p) { errors.push(`${label}: puzzel ${lv.pid} bestaat niet in de voorraad`); continue; }
  if (legacy && lv.seed !== 20261004 + lv.globalIndex * 7919) errors.push(`${label}: seed is veranderd`);
  if (!legacy && E.bandFor(E.kindOf(lv), p.givens) !== lv.band) errors.push(`${label}: puzzel hoort niet in band ${lv.band}`);

  if (!E.isValidSolution(p.solution, lv.size, diag)) errors.push(`${label}: ongeldige oplossing`);
  if (p.given.some((v, i) => v !== 0 && v !== p.solution[i])) errors.push(`${label}: gegeven cijfers kloppen niet met de oplossing`);
  const n = E.countSolutions(p.given, lv.size, diag, 2);
  if (n !== 1) errors.push(`${label}: ${n === 0 ? 'onoplosbaar' : 'meer dan één oplossing'}`);

  if (!E.solvableBySingles(p.given, lv.size, diag)) errors.push(`${label}: niet op te lossen zonder gokken`);

  if (legacy) {
    const again = E.generatePuzzle(lv.size, diag, lv.target, lv.seed);
    if (again.given.join() !== p.given.join()) errors.push(`${label}: puzzel is niet stabiel tussen runs`);
  }

  perWorld[lv.world].push({ lv, givens: p.givens, ms });
}

// Unique puzzles: no two levels may share the same starting grid.
const seen = new Map();
E.LEVEL_PLAN.forEach(lv => {
  const key = lv.size + ':' + E.getPuzzle(lv.globalIndex).given.join('');
  if (seen.has(key)) errors.push(`Level ${lv.globalIndex} is gelijk aan level ${seen.get(key)}`);
  seen.set(key, lv.globalIndex);
});

// Snapshot: every level must still be exactly the puzzle that was published.
const SNAPSHOT = path.join(__dirname, 'levels.snapshot.json');
const current = E.LEVEL_PLAN.map(lv => E.getPuzzle(lv.globalIndex).given.join(''));
const savedLevels = fs.existsSync(SNAPSHOT) ? JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')) : [];
const levelsChanged = savedLevels.some((g, i) => current[i] !== g);
if (process.argv.includes('--update-snapshot')) {
  // Updating may only ADD levels. Changing an existing one needs --force (and a very good reason).
  if (levelsChanged && !process.argv.includes('--force')) {
    errors.push('Bestaande level-puzzels zijn veranderd: snapshot NIET bijgewerkt (alleen toevoegen is toegestaan)');
  } else {
    fs.writeFileSync(SNAPSHOT, JSON.stringify(current, null, 0).replace(/,/g, ',\n') + '\n');
    console.log('Snapshot bijgewerkt: tests/levels.snapshot.json');
  }
} else if (!fs.existsSync(SNAPSHOT)) {
  errors.push('tests/levels.snapshot.json ontbreekt (maak hem met --update-snapshot)');
} else {
  const saved = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  if (saved.length !== current.length) errors.push(`Snapshot heeft ${saved.length} levels, het spel ${current.length}`);
  current.forEach((g, i) => {
    if (saved[i] !== undefined && saved[i] !== g) errors.push(`Level ${i} (globalIndex) wijkt af van de snapshot: de puzzel is veranderd`);
  });
}

// ---------- Puzzle bank ----------
const crypto = require('crypto');
const BANK_SNAPSHOT = path.join(__dirname, 'bank.snapshot.json');
const MIN_PER_BAND = 100;
const exact = new Map();           // size:givens -> where
const canon4 = new Map();
const ownCount = {};
E.LEVEL_PLAN.forEach(lv => {
  if (!E.levelBand(lv.globalIndex)) errors.push(`Level ${lv.globalIndex} valt in geen enkele moeilijkheidsband`);
  if (lv.globalIndex >= E.LEGACY_LEVELS) {       // its puzzle IS a bank puzzle: may be used by one level only
    ownCount[lv.pid] = (ownCount[lv.pid] || 0) + 1;
    if (ownCount[lv.pid] > 1) errors.push(`Puzzel ${lv.pid} is de eigen puzzel van meer dan één level`);
    return;
  }
  const g = E.getPuzzle(lv.globalIndex).given;
  exact.set(lv.size + ':' + g.join(''), 'level ' + lv.globalIndex);
  if (lv.size === 4) canon4.set(E.canonical4(g), 'level ' + lv.globalIndex);
});
let bankTotal = 0;
const bankHashes = {};
const bankLines = [];
for (const kind of Object.keys(E.BANDS)) {
  const size = +kind.split('-')[0], diag = kind.endsWith('xsudoku');
  const counts = [];
  E.BANDS[kind].forEach((band, bi) => {
    const id = E.bandId(kind, band);
    const list = E.bankOf(id);
    counts.push(list.length);
    bankTotal += list.length;
    if (list.length < MIN_PER_BAND) errors.push(`${id}: ${list.length} puzzels, minder dan ${MIN_PER_BAND}`);
    if (E.poolOf(id).length < 50) errors.push(`${id}: maar ${E.poolOf(id).length} puzzels vrij voor "opnieuw spelen" (minimaal 50)`);
    if (bi > 0 && band[1] >= E.BANDS[kind][bi - 1][0]) errors.push(`${id}: band overlapt met de vorige of is niet moeilijker`);
    list.forEach(({ id: pid, n, text }) => {
      const given = E.decodeGiven(text);
      const givens = given.filter(v => v).length;
      const v = E.getVariant(pid);
      if (given.length !== size * size) { errors.push(`${pid}: verkeerde lengte`); return; }
      if (E.countSolutions(given, size, diag, 2) !== 1) errors.push(`${pid}: niet precies één oplossing`);
      if (!v || !E.isValidSolution(v.solution, size, diag)) errors.push(`${pid}: ongeldige oplossing`);
      if (!E.solvableBySingles(given, size, diag)) errors.push(`${pid}: niet op te lossen zonder gokken`);
      if (givens < band[0] || givens > band[1]) errors.push(`${pid}: ${givens} gegeven vakjes, hoort niet in band ${id}`);
      if (E.bankCandidate(kind, n).given.join('') !== given.join('')) errors.push(`${pid}: komt niet overeen met bankSeed(${kind}, ${n})`);
      const key = size + ':' + given.join('');
      if (exact.has(key)) errors.push(`${pid}: zelfde puzzel als ${exact.get(key)}`);
      exact.set(key, pid);
      if (size === 4) {
        const c = E.canonical4(given);
        if (canon4.has(c)) errors.push(`${pid}: na draaien/omnummeren gelijk aan ${canon4.get(c)}`);
        canon4.set(c, pid);
      }
    });
    bankHashes[id] = list.map(p => p.n + ':' + p.text);
  });
  bankLines.push(`${kind.padEnd(11)} ${E.BANDS[kind].length} banden | puzzels per band: ${counts.join(', ')}`);
}
const hashOf = arr => crypto.createHash('sha256').update(arr.join('|')).digest('hex').slice(0, 16);
if (process.argv.includes('--update-snapshot')) {
  const snap = {};
  Object.keys(bankHashes).forEach(id => { snap[id] = { count: bankHashes[id].length, hash: hashOf(bankHashes[id]) }; });
  fs.writeFileSync(BANK_SNAPSHOT, JSON.stringify(snap, null, 1) + '\n');
  console.log('Snapshot bijgewerkt: tests/bank.snapshot.json');
} else if (!fs.existsSync(BANK_SNAPSHOT)) {
  errors.push('tests/bank.snapshot.json ontbreekt (maak hem met --update-snapshot)');
} else {
  const snap = JSON.parse(fs.readFileSync(BANK_SNAPSHOT, 'utf8'));
  Object.keys(snap).forEach(id => {
    const now = bankHashes[id] || [];
    if (now.length < snap[id].count || hashOf(now.slice(0, snap[id].count)) !== snap[id].hash) {
      errors.push(`${id}: bestaande puzzels in de voorraad zijn veranderd of verdwenen`);
    }
  });
}

perWorld.forEach((rows, w) => {
  const sizes = [...new Set(rows.map(r => r.lv.size))];
  const parts = sizes.map(sz => {
    const n = rows.filter(r => r.lv.size === sz).length;
    if (n !== LEVELS_PER_SIZE) errors.push(`${WORLD_NAMES[w]}: ${n} levels van ${sz}x${sz}, verwacht ${LEVELS_PER_SIZE}`);
    return `${n}× ${sz}x${sz}`;
  });
  console.log(`${WORLD_NAMES[w].padEnd(16)} ${String(rows.length).padStart(3)} levels | ${parts.join(' · ')}`);
});
console.log(`Totaal: ${E.LEVEL_PLAN.length} levels, traagste generatie ${slowest} ms`);
console.log('\nVoorraad (puzzle-bank.js):');
bankLines.forEach(l => console.log('  ' + l));
console.log(`  Totaal: ${bankTotal} puzzels in ${Object.keys(bankHashes).length} banden`);

if (E.LEGACY_LEVELS !== 105) errors.push('De eerste 105 levels zijn niet meer compleet');
E.LEVEL_PLAN.slice(0, 105).forEach((lv, i) => {
  const expectWorld = i < 35 ? 0 : i < 70 ? 1 : 2;
  if (lv.world !== expectWorld || lv.indexInWorld !== i - expectWorld * 35) errors.push(`Level ${i}: plek in de wereld is verschoven`);
});

if (errors.length) {
  console.error(`\n❌ ${errors.length} probleem/problemen:\n - ` + errors.join('\n - '));
  process.exit(1);
}
console.log('\n✅ Alle levels geldig, uniek oplosbaar en stabiel.');
console.log('✅ Zonder gokken op te lossen en gelijk aan de snapshot.');
console.log(`✅ Voorraad: ${bankTotal} puzzels geldig, uniek oplosbaar, zonder gokken, geen dubbele, per band even veel gegeven vakjes, gelijk aan de snapshot.`);
