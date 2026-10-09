#!/usr/bin/env node
/* ============================================================
   Moeilijkheidsmeting – draai met:
       node tests/difficulty.js          (samenvatting per blok)
       node tests/difficulty.js --all    (elke level apart)
   Per level:
     gegeven  = aantal ingevulde vakjes bij de start
     open     = aantal vakjes dat het kind moet invullen
     makkelijk= % van de open vakjes dat op te lossen is met alleen
                "er past hier nog maar één" (naked single) en
                "dit cijfer kan in deze rij/kolom/blok nog maar op één plek"
                (hidden single)
     start    = aantal vakjes dat bij de start meteen zo te vinden is
   Een level met makkelijk < 100% vraagt gokken of gevorderde technieken.
   Exitcode 1 als een level in wereld 0 of 1 niet 100% "makkelijk" is.
   ============================================================ */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', 'puzzles.js'));

function analyse(lv) {
  const diag = lv.type === 'xsudoku';
  const { units, peers } = E.getUnits(lv.size, diag);
  const g = E.getPuzzle(lv.globalIndex).given.slice();
  const open = g.filter(v => !v).length;
  const cands = i => {
    const used = new Set(peers[i].map(p => g[p]));
    const out = [];
    for (let v = 1; v <= lv.size; v++) if (!used.has(v)) out.push(v);
    return out;
  };
  const findSingles = () => {
    const found = new Map();
    g.forEach((v, i) => { if (!v) { const c = cands(i); if (c.length === 1) found.set(i, c[0]); } });
    units.forEach(u => {
      for (let v = 1; v <= lv.size; v++) {
        if (u.some(i => g[i] === v)) continue;
        const spots = u.filter(i => !g[i] && cands(i).includes(v));
        if (spots.length === 1) found.set(spots[0], v);
      }
    });
    return found;
  };
  let solved = 0, rounds = 0, start = 0;
  for (;;) {
    const found = findSingles();
    if (!found.size) break;
    if (rounds === 0) start = found.size;
    found.forEach((v, i) => { g[i] = v; });
    solved += found.size;
    rounds++;
  }
  return { givens: lv.size * lv.size - open, open, easyPct: open ? Math.round(solved / open * 100) : 100, start, rounds };
}

const WORLD_NAMES = ['Dierenbos', 'Snoepjesfabriek', 'Ruimte-raket'];
const all = process.argv.includes('--all');
const rows = E.LEVEL_PLAN.map(lv => ({ lv, ...analyse(lv) }));

if (all) {
  rows.forEach(r => console.log(
    `${WORLD_NAMES[r.lv.world].padEnd(16)} ${String(r.lv.indexInWorld + 1).padStart(2)} ${r.lv.size}x${r.lv.size} ${r.lv.type.padEnd(8)} ` +
    `doel ${String(r.lv.target).padStart(2)} gegeven ${String(r.givens).padStart(2)} open ${String(r.open).padStart(2)} ` +
    `makkelijk ${String(r.easyPct).padStart(3)}% start ${String(r.start).padStart(2)} rondes ${r.rounds}`));
  console.log('');
}

// Samenvatting per blok (opeenvolgende levels van dezelfde soort en grootte)
const blocks = [];
rows.forEach(r => {
  const last = blocks[blocks.length - 1];
  const key = `${r.lv.world}|${r.lv.size}|${r.lv.type}`;
  if (last && last.key === key) last.rows.push(r); else blocks.push({ key, rows: [r] });
});
console.log('wereld           levels  soort          gegeven    open       100% makkelijk  laagste');
let bad = 0;
blocks.forEach(b => {
  const f = b.rows[0], l = b.rows[b.rows.length - 1];
  const easy = b.rows.filter(r => r.easyPct === 100).length;
  const min = Math.min(...b.rows.map(r => r.easyPct));
  if (f.lv.world < 2) bad += b.rows.length - easy;
  console.log(
    `${WORLD_NAMES[f.lv.world].padEnd(16)} ${(f.lv.indexInWorld + 1 + '-' + (l.lv.indexInWorld + 1)).padEnd(7)} ` +
    `${(f.lv.size + 'x' + f.lv.size + ' ' + f.lv.type).padEnd(14)} ${(f.givens + ' → ' + l.givens).padEnd(10)} ` +
    `${(f.open + ' → ' + l.open).padEnd(10)} ${(easy + '/' + b.rows.length).padEnd(15)} ${min}%`);
});

if (bad) {
  console.error(`\n❌ ${bad} level(s) in wereld 0/1 zijn niet met eenvoudige logica op te lossen.`);
  process.exit(1);
}
console.log('\n✅ Alle levels in wereld 0 en 1 zijn met eenvoudige logica op te lossen.');
