#!/usr/bin/env node
/* ============================================================
   Bouwt puzzle-bank.js: de voorraad puzzels per soort en moeilijkheidsband.
       node tools/build-bank.js            (PER_BAND = 100)
       node tools/build-bank.js 150        (meer puzzels per band)
   Dit is geen build-stap van de app: het resultaat (puzzle-bank.js) staat
   gewoon in de repository. Draai dit alleen om de voorraad UIT TE BREIDEN.
   Bestaande puzzels houden hun nummer (soort, n) en veranderen niet;
   tests/validate-levels.js bewaakt dat met de snapshot.

   Werkwijze per soort: kandidaat n = 1, 2, 3, … komt uit bankSeed(soort, n).
   Een kandidaat telt mee als hij
     - zonder gokken op te lossen is (dat garandeert de generator),
     - in een band valt die nog niet vol is,
     - nog niet voorkomt (ook niet als level-puzzel),
     - bij 4×4: ook na draaien/spiegelen/omnummeren niet al voorkomt.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const E = require(path.join(__dirname, '..', 'puzzles.js'));

const PER_BAND = Number(process.argv[2]) || 100;
const MAX_N = 2000000;
const OUT = path.join(__dirname, '..', 'puzzle-bank.js');

// Wat al bestaat mag niet nog eens: de level-puzzels en de huidige bank.
const seenExact = new Set();
const seenCanon4 = new Set();
E.LEVEL_PLAN.forEach(lv => {
  const p = E.getPuzzle(lv.globalIndex);
  seenExact.add(lv.size + ':' + p.given.join(''));
  if (lv.size === 4) seenCanon4.add(E.canonical4(p.given));
});
let existing = {};
try { existing = require(OUT); } catch (e) { /* eerste keer */ }

const bank = {};
const t0 = Date.now();
for (const kind of Object.keys(E.BANDS)) {
  const size = +kind.split('-')[0];
  const diag = kind.endsWith('xsudoku');
  bank[kind] = {};
  let lastN = 0;
  // Bestaande puzzels blijven precies zoals ze zijn.
  for (const band of E.BANDS[kind]) {
    const key = band[0] + '-' + band[1];
    bank[kind][key] = ((existing[kind] || {})[key] || []).slice();
    bank[kind][key].forEach(([n, text]) => {
      const given = E.decodeGiven(text);
      seenExact.add(size + ':' + given.join(''));
      if (size === 4) seenCanon4.add(E.canonical4(given));
      lastN = Math.max(lastN, n);
    });
  }
  const open = () => E.BANDS[kind].filter(b => bank[kind][b[0] + '-' + b[1]].length < PER_BAND);
  let n = lastN;
  while (open().length && n < MAX_N) {
    n++;
    const p = E.bankCandidate(kind, n);
    const id = E.bandFor(kind, p.givens);
    if (!id) continue;
    const key = id.split('/')[1];
    if (bank[kind][key].length >= PER_BAND) continue;
    if (!E.solvableBySingles(p.given, size, diag)) continue;
    const exact = size + ':' + p.given.join('');
    if (seenExact.has(exact)) continue;
    if (size === 4) {
      const c = E.canonical4(p.given);
      if (seenCanon4.has(c)) continue;
      seenCanon4.add(c);
    }
    seenExact.add(exact);
    bank[kind][key].push([n, E.encodeGiven(p.given)]);
  }
  const counts = E.BANDS[kind].map(b => b[0] + '-' + b[1] + ': ' + bank[kind][b[0] + '-' + b[1]].length).join(', ');
  console.log(`${kind.padEnd(11)} kandidaten t/m n=${String(n).padStart(7)}  →  ${counts}`);
  if (open().length) { console.error(`❌ ${kind}: niet genoeg puzzels gevonden`); process.exitCode = 1; }
}

const lines = Object.keys(bank).map(kind =>
  `  ${JSON.stringify(kind)}: {\n` + Object.keys(bank[kind]).map(key =>
    `    ${JSON.stringify(key)}: ${JSON.stringify(bank[kind][key])}`).join(',\n') + '\n  }').join(',\n');
fs.writeFileSync(OUT,
`/* SUDOKU KIDS – puzzle-bank.js
   Voorraad puzzels per soort en moeilijkheidsband: [nummer, gegeven vakjes].
   Gemaakt door tools/build-bank.js – niet met de hand aanpassen.
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
const total = Object.values(bank).reduce((s, k) => s + Object.values(k).reduce((a, l) => a + l.length, 0), 0);
console.log(`\n${total} puzzels in puzzle-bank.js (${Math.round(fs.statSync(OUT).size / 1024)} kB), ${((Date.now() - t0) / 1000).toFixed(1)} s`);
