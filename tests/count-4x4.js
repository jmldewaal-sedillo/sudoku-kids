#!/usr/bin/env node
/* ============================================================
   Hoeveel écht verschillende 4×4-puzzels bestaan er?
       node tests/count-4x4.js
   Telt per aantal gegeven vakjes alle 4×4-puzzels die met eenvoudige
   logica (dus zonder gokken) op te lossen zijn:
     totaal  = alle verschillende startroosters
     echt    = startroosters die niet in elkaar over te voeren zijn door
               draaien, spiegelen, rijen/kolommen binnen een blok wisselen,
               blokken wisselen of de cijfers om te nummeren
   "Echt verschillend" is dus wat een kind ook na omnummeren als een
   andere puzzel ervaart.
   ============================================================ */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', 'puzzles.js'));

// Alle 288 oplossingen
const grids = [];
(function fill(g, i) {
  if (i === 16) { grids.push(g.slice()); return; }
  for (let v = 1; v <= 4; v++) {
    g[i] = v;
    if (E.getUnits(4, false).peers[i].every(p => p > i || g[p] !== v)) fill(g, i + 1);
  }
  g[i] = 0;
})(new Array(16).fill(0), 0);

const SYMS = E.symmetries4();           // 128 permutaties van de 16 vakjes
const canon = g => E.canonical4(g);

// Deel de 288 roosters in klassen in (er zijn er 2)
const classes = new Map();
grids.forEach(g => { const k = canon(g); if (!classes.has(k)) classes.set(k, { rep: g, size: 0 }); classes.get(k).size++; });

// Telt per aantal gegeven vakjes: { gegeven: { total, distinct } }
function count4x4(log) {
  if (log) {
    console.log(`${grids.length} oplossingen, ${classes.size} echt verschillende, ${SYMS.length} symmetrieën × 24 omnummeringen\n`);
    console.log('gegeven  open   totaal zonder gokken   echt verschillend');
  }
  const combos = (n, k, cb, start = 0, acc = []) => {
    if (acc.length === k) { cb(acc); return; }
    for (let i = start; i <= n - (k - acc.length); i++) { acc.push(i); combos(n, k, cb, i + 1, acc); acc.pop(); }
  };
  const result = {};
  for (let k = 12; k >= 4; k--) {
    let total = 0;
    const seen = new Set();
    for (const { rep, size } of classes.values()) {
      combos(16, k, cells => {
        const p = new Array(16).fill(0);
        for (const c of cells) p[c] = rep[c];
        if (!E.solvableBySingles(p, 4, false)) return;
        total += size;
        seen.add(canon(p));
      });
    }
    result[k] = { total, distinct: seen.size };
    if (log) console.log(`${String(k).padStart(5)}  ${String(16 - k).padStart(5)}   ${String(total).padStart(20)}   ${String(seen.size).padStart(17)}`);
  }
  return result;
}

if (require.main === module) count4x4(true);
module.exports = { count4x4 };
