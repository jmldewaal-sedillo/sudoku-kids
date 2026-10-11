/* ============================================================
   SUDOKU KIDS & CRAZY GRIDS – puzzles.js
   Puzzle engine: seeded generator, solver and level plan.
   Shared by the game (browser) and tests/validate-levels.js (Node).
   ============================================================ */
(function (root) {
  'use strict';

  // ---------- Seeded random (mulberry32) ----------
  // Same seed => same puzzle on every device and every reload,
  // so saved stars always belong to the same level.
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffleWith(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- Geometry ----------
  function boxDims(size) {
    if (size === 9) return [3, 3];
    if (size === 6) return [2, 3]; // 2 rows x 3 columns
    return [2, 2];
  }

  // Units = every group that must contain each value exactly once.
  const unitCache = {};
  function getUnits(size, diagonal) {
    const key = size + (diagonal ? 'x' : '');
    if (unitCache[key]) return unitCache[key];
    const [br, bc] = boxDims(size);
    const units = [];
    for (let i = 0; i < size; i++) {
      const row = [], col = [];
      for (let j = 0; j < size; j++) { row.push(i * size + j); col.push(j * size + i); }
      units.push(row, col);
    }
    for (let r = 0; r < size; r += br) {
      for (let c = 0; c < size; c += bc) {
        const b = [];
        for (let i = 0; i < br; i++) for (let j = 0; j < bc; j++) b.push((r + i) * size + c + j);
        units.push(b);
      }
    }
    if (diagonal) {
      const d1 = [], d2 = [];
      for (let i = 0; i < size; i++) { d1.push(i * size + i); d2.push(i * size + (size - 1 - i)); }
      units.push(d1, d2);
    }
    const peers = [];
    for (let i = 0; i < size * size; i++) {
      const s = new Set();
      units.forEach(u => { if (u.includes(i)) u.forEach(p => { if (p !== i) s.add(p); }); });
      peers.push([...s]);
    }
    unitCache[key] = { units, peers };
    return unitCache[key];
  }

  // ---------- Solver (bitmask + fewest-candidates-first) ----------
  // Returns number of solutions found (stops at `limit`).
  // If `out` is given, the first solution is copied into it.
  function solve(grid, size, diagonal, limit, rng, out) {
    const { peers } = getUnits(size, diagonal);
    const full = (1 << (size + 1)) - 2; // bits 1..size
    const a = grid.slice();
    let found = 0;

    function candidates(i) {
      let used = 0;
      const p = peers[i];
      for (let k = 0; k < p.length; k++) used |= 1 << a[p[k]];
      return full & ~used;
    }
    function bitCount(m) { let n = 0; while (m) { m &= m - 1; n++; } return n; }

    function rec() {
      if (found >= limit) return;
      let best = -1, bestMask = 0, bestCount = 99;
      for (let i = 0; i < a.length; i++) {
        if (a[i]) continue;
        const m = candidates(i);
        const n = bitCount(m);
        if (n === 0) return;           // dead end
        if (n < bestCount) { best = i; bestMask = m; bestCount = n; if (n === 1) break; }
      }
      if (best === -1) {               // grid full = solution
        found++;
        if (out && found === 1) for (let i = 0; i < a.length; i++) out[i] = a[i];
        return;
      }
      const vals = [];
      for (let v = 1; v <= size; v++) if (bestMask & (1 << v)) vals.push(v);
      if (rng) shuffleWith(vals, rng);
      for (const v of vals) {
        a[best] = v;
        rec();
        if (found >= limit) { a[best] = 0; return; }
      }
      a[best] = 0;
    }
    rec();
    return found;
  }

  function countSolutions(grid, size, diagonal, limit) {
    return solve(grid, size, diagonal, limit || 2, null, null);
  }

  function isValidSolution(sol, size, diagonal) {
    if (!sol || sol.length !== size * size) return false;
    return getUnits(size, diagonal).units.every(u => {
      const seen = new Set();
      return u.every(i => sol[i] >= 1 && sol[i] <= size && !seen.has(sol[i]) && seen.add(sol[i]));
    });
  }

  // ---------- Logic solver (the two steps a child can do) ----------
  // Returns Map(cell index -> value) of every empty cell that can be filled
  // right now with simple logic:
  //   - only one value still fits in the cell, or
  //   - a value has only one possible place left in a row/column/box/diagonal.
  function findSingles(grid, size, diagonal) {
    const { units, peers } = getUnits(size, diagonal);
    const full = (1 << (size + 1)) - 2;
    const cand = grid.map((v, i) => {
      if (v) return 0;
      let used = 0;
      const p = peers[i];
      for (let k = 0; k < p.length; k++) used |= 1 << grid[p[k]];
      return full & ~used;
    });
    const found = new Map();
    cand.forEach((m, i) => { if (m && (m & (m - 1)) === 0) found.set(i, 31 - Math.clz32(m)); });
    for (const u of units) {
      for (let v = 1; v <= size; v++) {
        let spot = -1, count = 0;
        for (const i of u) {
          if (grid[i] === v) { count = 99; break; }
          if (cand[i] & (1 << v)) { spot = i; count++; }
        }
        if (count === 1) found.set(spot, v);
      }
    }
    return found;
  }

  function solvableBySingles(given, size, diagonal) {
    const g = given.slice();
    let open = g.filter(v => !v).length;
    while (open) {
      const found = findSingles(g, size, diagonal);
      if (!found.size) return false;
      found.forEach((v, i) => { g[i] = v; });
      open -= found.size;
    }
    return true;
  }

  // ---------- Generator ----------
  // Builds a random full solution, then removes cells one by one,
  // only keeping a removal if the puzzle still has exactly ONE solution.
  // If the result needs guessing or advanced techniques, removed cells are
  // put back (last removed first) until simple logic is enough again.
  function generatePuzzle(size, diagonal, targetGivens, seed) {
    const rng = makeRng(seed);
    const solution = new Array(size * size).fill(0);
    if (solve(solution, size, diagonal, 1, rng, solution) !== 1) {
      throw new Error('Geen oplossing mogelijk voor ' + size + 'x' + size + (diagonal ? ' X' : ''));
    }
    const given = solution.slice();
    let givens = given.length;
    const order = shuffleWith([...Array(given.length).keys()], rng);
    const removed = [];
    for (const idx of order) {
      if (givens <= targetGivens) break;
      const keep = given[idx];
      given[idx] = 0;
      if (countSolutions(given, size, diagonal, 2) !== 1) given[idx] = keep;
      else { givens--; removed.push(idx); }
    }
    if (!solvableBySingles(given, size, diagonal)) {
      const back = [];
      while (removed.length && !solvableBySingles(given, size, diagonal)) {
        const idx = removed.pop();
        given[idx] = solution[idx];
        back.push(idx);
      }
      // Not every cell that was put back is needed: take out the ones that are not.
      for (const idx of back) {
        given[idx] = 0;
        if (!solvableBySingles(given, size, diagonal)) given[idx] = solution[idx];
      }
      givens = given.filter(v => v !== 0).length;
    }
    return { given, solution, givens };
  }

  // ---------- Level plan (105 levels, progressively harder) ----------
  function ramp(n, from, to) {
    return Array.from({ length: n }, (_, i) => Math.round(from + (to - from) * (n === 1 ? 0 : i / (n - 1))));
  }
  function block(world, size, type, targets) {
    return targets.map(t => ({ world, size, type, target: t }));
  }

  const W2_TYPES = [
    'standard','standard','standard','standard','standard',
    'xsudoku','xsudoku','xsudoku','xsudoku','xsudoku',
    'standard','standard','standard','standard','standard',
    'xsudoku','xsudoku','xsudoku','xsudoku','xsudoku',
    'shapes','shapes','shapes','shapes','shapes',
    'standard','xsudoku','shapes','standard','xsudoku',
    'standard','xsudoku','shapes','standard','xsudoku',
  ];
  const w2Targets = ramp(35, 36, 24);

  const LEVEL_PLAN = [
    // World 0 – Het Dierenbos: 4x4 → 6x6
    ...block(0, 4, 'standard', ramp(15, 11, 6)),
    ...block(0, 4, 'shapes',   ramp(5, 9, 6)),
    ...block(0, 6, 'standard', ramp(10, 24, 15)),
    ...block(0, 6, 'xsudoku',  ramp(5, 20, 14)),
    // World 1 – De Snoepjesfabriek: 6x6 → 9x9
    ...block(1, 6, 'standard', ramp(10, 20, 12)),
    ...block(1, 6, 'shapes',   ramp(5, 18, 13)),
    ...block(1, 9, 'standard', ramp(15, 46, 32)),
    ...block(1, 9, 'xsudoku',  ramp(5, 38, 30)),
    // World 2 – De Ruimte-raket: 9x9 only
    ...W2_TYPES.map((type, i) => ({ world: 2, size: 9, type, target: w2Targets[i] })),
  ];

  // The first 105 levels ("legacy"): their puzzle comes from a fixed seed per
  // level. Never change these seeds or their order, or players' saved stars
  // will point at different puzzles.
  const LEGACY_LEVELS = LEVEL_PLAN.length;
  LEVEL_PLAN.forEach((lv, i) => { lv.seed = 20261004 + i * 7919; });

  // Every level after that comes from level-plan.js (made by
  // tools/generate-puzzles.js): [world, kind, band, n]. Its puzzle is bank
  // puzzle (kind, n). New levels are only ever ADDED at the end, so
  // 'w<world>_l<index>' in a player's progress never shifts.
  let extraLevels = [];
  if (typeof module !== 'undefined' && module.exports) {
    try { extraLevels = require('./level-plan.js'); } catch (e) { /* no extra levels yet */ }
  } else if (root.SUDOKU_LEVELS) extraLevels = root.SUDOKU_LEVELS;
  const reserved = new Set();            // bank puzzles that are a level's own puzzle
  extraLevels.forEach(([world, kind, range, n]) => {
    const [size, type] = kind.split('-');
    const pid = kind + '#' + n;
    reserved.add(pid);
    LEVEL_PLAN.push({ world, size: +size, type, band: kind + '/' + range, pid });
  });

  const WORLD_COUNT = LEVEL_PLAN.reduce((m, lv) => Math.max(m, lv.world + 1), 0);
  const counters = new Array(WORLD_COUNT).fill(0);
  LEVEL_PLAN.forEach((lv, i) => {
    lv.globalIndex = i;
    lv.indexInWorld = counters[lv.world]++;
  });

  const puzzleCache = {};
  function getPuzzle(globalIndex) {
    if (puzzleCache[globalIndex]) return puzzleCache[globalIndex];
    const lv = LEVEL_PLAN[globalIndex];
    const p = lv.pid ? getVariant(lv.pid) : generatePuzzle(lv.size, lv.type === 'xsudoku', lv.target, lv.seed);
    puzzleCache[globalIndex] = p;
    return p;
  }
  // The id of a level's own (first) puzzle: 'L<index>' for the first 105, a bank id after that.
  function ownId(globalIndex) { return LEVEL_PLAN[globalIndex].pid || 'L' + globalIndex; }

  // ---------- 4×4 symmetry (to tell really different puzzles apart) ----------
  // Two 4×4 puzzles are "the same" for a child if one becomes the other by
  // swapping rows/columns inside a block, swapping the blocks, mirroring over
  // the diagonal, or renaming the numbers. canonical4() gives every such
  // family one fixed name.
  let syms4 = null;
  function symmetries4() {
    if (syms4) return syms4;
    const orders = [];
    for (const bandSwap of [0, 1]) for (const a of [0, 1]) for (const b of [0, 1]) {
      const bands = [[a ? 1 : 0, a ? 0 : 1], [b ? 3 : 2, b ? 2 : 3]];
      orders.push(bandSwap ? [...bands[1], ...bands[0]] : [...bands[0], ...bands[1]]);
    }
    syms4 = [];
    for (const rows of orders) for (const cols of orders) for (const flip of [0, 1]) {
      const perm = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const rr = rows[r], cc = cols[c];
        perm.push(flip ? cc * 4 + rr : rr * 4 + cc);
      }
      syms4.push(perm);
    }
    return syms4;
  }
  function canonical4(grid) {
    let best = null;
    for (const perm of symmetries4()) {
      const map = [0, 0, 0, 0, 0];
      let next = 1, key = '';
      for (let i = 0; i < 16; i++) {
        const v = grid[perm[i]];
        if (v && !map[v]) map[v] = next++;
        key += map[v];
      }
      if (best === null || key < best) best = key;
    }
    return best;
  }

  // ---------- Puzzle bank: many puzzles per kind, grouped by difficulty ----------
  // A "kind" is size + type (e.g. '4-standard', '6-xsudoku'). Every kind has
  // difficulty bands: ranges of given cells, easiest first. All puzzles of a
  // band are equally hard: the same number of givens and solvable without
  // guessing. Each level belongs to the band that holds its original puzzle.
  //
  // Bank puzzles are numbered per kind: puzzle (kind, n) always comes from
  // bankSeed(kind, n). Nothing depends on the order of levels or worlds, so
  // puzzles, levels and worlds can be added later without anything shifting.
  // The puzzles themselves are stored in puzzle-bank.js (made by
  // tools/build-bank.js), so a later change to the generator can never
  // change a puzzle a player has already seen.
  const BANDS = {
    '4-standard': [[11, 11], [10, 10], [9, 9], [8, 8], [7, 7], [6, 6]],
    '4-shapes':   [[9, 9], [8, 8], [7, 7], [6, 6]],
    '6-standard': [[23, 24], [21, 22], [19, 20], [17, 18], [15, 16], [12, 14]],
    '6-xsudoku':  [[19, 20], [16, 18], [14, 15]],
    '6-shapes':   [[17, 18], [15, 16], [13, 14]],
    '9-standard': [[44, 46], [41, 43], [38, 40], [35, 37], [32, 34], [29, 31], [26, 28], [24, 25]],
    '9-xsudoku':  [[36, 38], [33, 35], [30, 32], [27, 29], [25, 26]],
    '9-shapes':   [[28, 30], [25, 27]],
  };
  function kindOf(lv) { return lv.size + '-' + lv.type; }
  function bandId(kind, band) { return kind + '/' + band[0] + '-' + band[1]; }
  function bandFor(kind, givens) {
    const band = (BANDS[kind] || []).find(b => givens >= b[0] && givens <= b[1]);
    return band ? bandId(kind, band) : null;
  }
  function hashString(str) {             // FNV-1a, 32 bit
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function bankSeed(kind, n) { return hashString('sudoku-kids|' + kind + '|' + n); }
  // Candidate n of a kind: the seed fixes the solution and the removal order,
  // a second hash picks how many givens to aim for (anywhere in the kind's range).
  function bankCandidate(kind, n) {
    const [size, type] = kind.split('-');
    const bands = BANDS[kind];
    const hi = bands[0][1], lo = bands[bands.length - 1][0];
    const target = lo + hashString('target|' + kind + '|' + n) % (hi - lo + 1);
    return generatePuzzle(+size, type === 'xsudoku', target, bankSeed(kind, n));
  }
  // Givens as text: digits, and a..z for a run of 1..26 empty cells.
  function encodeGiven(given) {
    let out = '', run = 0;
    const flush = () => { while (run > 0) { const k = Math.min(run, 26); out += String.fromCharCode(96 + k); run -= k; } };
    for (const v of given) { if (v) { flush(); out += v; } else run++; }
    flush();
    return out;
  }
  function decodeGiven(text) {
    const out = [];
    for (const ch of text) {
      if (ch >= '1' && ch <= '9') out.push(+ch);
      else for (let k = ch.charCodeAt(0) - 96; k > 0; k--) out.push(0);
    }
    return out;
  }

  let bankData = null;                   // { kind: { 'lo-hi': [[n, 'encoded'], ...] } }
  function setBank(data) { bankData = data; }
  function bankOf(id) {                  // id = 'kind/lo-hi'  ->  [{ id: 'kind#n', n, text }]
    const [kind, range] = id.split('/');
    const list = (bankData && bankData[kind] && bankData[kind][range]) || [];
    return list.map(([n, text]) => ({ id: kind + '#' + n, n, text }));
  }
  const variantCache = {};
  // A bank puzzle by id ('kind#n'); null if it does not exist (any more).
  function getVariant(id) {
    if (variantCache[id]) return variantCache[id];
    const [kind, num] = id.split('#');
    const [size, type] = kind.split('-');
    let text = null;
    Object.values((bankData && bankData[kind]) || {}).some(list => list.some(([n, t]) => (n === +num ? (text = t, true) : false)));
    if (text === null) return null;
    const given = decodeGiven(text);
    const solution = new Array(given.length).fill(0);
    if (solve(given, +size, type === 'xsudoku', 1, null, solution) !== 1) return null;
    variantCache[id] = { given, solution, givens: given.filter(v => v).length };
    return variantCache[id];
  }
  // The band a level belongs to: the one that holds its original puzzle.
  function levelBand(globalIndex) {
    const lv = LEVEL_PLAN[globalIndex];
    return lv.band || bandFor(kindOf(lv), getPuzzle(globalIndex).givens);
  }
  // Puzzles of a band that may be handed out on a replay: everything except
  // the puzzles that are some level's own first puzzle.
  function poolOf(id) { return bankOf(id).filter(p => !reserved.has(p.id)); }
  if (typeof module !== 'undefined' && module.exports) {
    try { setBank(require('./puzzle-bank.js')); } catch (e) { /* bank not built yet */ }
  } else if (root.SUDOKU_BANK) setBank(root.SUDOKU_BANK);

  const api = {
    BANDS, kindOf, bandId, bandFor, bankSeed, bankCandidate, encodeGiven, decodeGiven,
    setBank, bankOf, poolOf, getVariant, levelBand, ownId, LEGACY_LEVELS, WORLD_COUNT, symmetries4, canonical4,
    LEVEL_PLAN, getPuzzle, generatePuzzle, countSolutions,
    isValidSolution, getUnits, boxDims, makeRng, findSingles, solvableBySingles,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SudokuEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
