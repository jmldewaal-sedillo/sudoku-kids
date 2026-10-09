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

  const counters = [0, 0, 0];
  LEVEL_PLAN.forEach((lv, i) => {
    lv.globalIndex = i;
    lv.indexInWorld = counters[lv.world]++;
    // Fixed seed per level: never change these once the app is published,
    // or players' saved stars will point at different puzzles.
    lv.seed = 20261004 + i * 7919;
  });

  const puzzleCache = {};
  function getPuzzle(globalIndex) {
    if (puzzleCache[globalIndex]) return puzzleCache[globalIndex];
    const lv = LEVEL_PLAN[globalIndex];
    const p = generatePuzzle(lv.size, lv.type === 'xsudoku', lv.target, lv.seed);
    puzzleCache[globalIndex] = p;
    return p;
  }

  const api = {
    LEVEL_PLAN, getPuzzle, generatePuzzle, countSolutions,
    isValidSolution, getUnits, boxDims, makeRng, findSingles, solvableBySingles,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SudokuEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
