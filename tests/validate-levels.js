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
   Exits with code 1 if anything is wrong.
   ============================================================ */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', 'puzzles.js'));

const WORLD_NAMES = ['Dierenbos', 'Snoepjesfabriek', 'Ruimte-raket'];
const errors = [];
let slowest = 0;
const perWorld = [[], [], []];

for (const lv of E.LEVEL_PLAN) {
  const label = `${WORLD_NAMES[lv.world]} level ${lv.indexInWorld + 1} (${lv.size}x${lv.size} ${lv.type})`;
  const diag = lv.type === 'xsudoku';

  const t0 = Date.now();
  const p = E.generatePuzzle(lv.size, diag, lv.target, lv.seed);
  const ms = Date.now() - t0;
  slowest = Math.max(slowest, ms);

  if (!E.isValidSolution(p.solution, lv.size, diag)) errors.push(`${label}: ongeldige oplossing`);
  if (p.given.some((v, i) => v !== 0 && v !== p.solution[i])) errors.push(`${label}: gegeven cijfers kloppen niet met de oplossing`);
  const n = E.countSolutions(p.given, lv.size, diag, 2);
  if (n !== 1) errors.push(`${label}: ${n === 0 ? 'onoplosbaar' : 'meer dan één oplossing'}`);

  const again = E.generatePuzzle(lv.size, diag, lv.target, lv.seed);
  if (again.given.join() !== p.given.join()) errors.push(`${label}: puzzel is niet stabiel tussen runs`);

  perWorld[lv.world].push({ lv, givens: p.givens, ms });
}

// Unique puzzles: no two levels may share the same starting grid.
const seen = new Map();
E.LEVEL_PLAN.forEach(lv => {
  const key = E.generatePuzzle(lv.size, lv.type === 'xsudoku', lv.target, lv.seed).given.join('');
  if (seen.has(key)) errors.push(`Level ${lv.globalIndex} is gelijk aan level ${seen.get(key)}`);
  seen.set(key, lv.globalIndex);
});

perWorld.forEach((rows, w) => {
  const sizes = [...new Set(rows.map(r => r.lv.size))].map(s => `${s}x${s}`).join(', ');
  const g = rows.map(r => r.givens);
  console.log(`${WORLD_NAMES[w].padEnd(16)} ${rows.length} levels | ${sizes} | gegeven cellen: ${g[0]} → ${g[g.length - 1]}`);
});
console.log(`Totaal: ${E.LEVEL_PLAN.length} levels, traagste generatie ${slowest} ms`);

if (E.LEVEL_PLAN.length < 105) errors.push('Minder dan 105 levels');
[0, 1, 2].forEach(w => { if (perWorld[w].length < 35) errors.push(`${WORLD_NAMES[w]} heeft minder dan 35 levels`); });

if (errors.length) {
  console.error(`\n❌ ${errors.length} probleem/problemen:\n - ` + errors.join('\n - '));
  process.exit(1);
}
console.log('\n✅ Alle levels geldig, uniek oplosbaar en stabiel.');
