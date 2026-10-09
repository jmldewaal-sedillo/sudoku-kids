/* ============================================================
   SUDOKU KIDS & CRAZY GRIDS – script.js
   Game UI. Puzzles come from puzzles.js, texts from i18n.js.
   ============================================================ */
'use strict';

const E = window.SudokuEngine;

const ANIMAL_SYMBOLS = ['🐶','🐱','🐸','🐻','🦊','🐨','🐯','🐧','🦁'];
const FRUIT_SYMBOLS  = ['🍎','🍌','🍇','🍓','🍊','🍋','🍉','🍑','🍒'];
const MAX_MISTAKES = 3;       // 6×6 and 9×9: three hearts. 4×4 has no game over.
const MAX_HINTS = 3;
const WORLD_COUNT = 3;
const ROOT_SCREENS = ['splash', 'worlds'];   // "back" leaves the app from here

// localStorage keys – never rename these, players would lose their stars.
const KEY_PROGRESS = 'sudokuKids_progress';
const KEY_SETTINGS = 'sudokuKids_settings';
const KEY_CURRENT  = 'sudokuKids_current';    // the game that is being played right now

// ============================================================
// STATE
// ============================================================
let settings = { sound: true, language: 'nl', highlightErrors: true, displayMode: 'numbers' };
let progress = {};            // { 'w0_l0': { stars:3, time:45 }, ... }
let currentScreen = 'splash';
let currentWorld = 0;
let gameState = null;

const LEVELS = E.LEVEL_PLAN;  // 105 level definitions (world, size, type, seed)
const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

// ============================================================
// I18N
// ============================================================
function t(key) {
  const lang = STRINGS[settings.language] || STRINGS.nl;
  return key in lang ? lang[key] : STRINGS.nl[key];
}
function pick(key) {
  const v = t(key);
  return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v;
}
function applyTranslations() {
  document.documentElement.lang = settings.language;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

// ============================================================
// STORAGE (safe: private mode / blocked storage must not crash the game)
// ============================================================
function storeGet(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function storeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
}
function storeRemove(key) {
  try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
}
function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function saveProgress() { storeSet(KEY_PROGRESS, progress); }
function saveSettings() { storeSet(KEY_SETTINGS, settings); }
function loadAll() {
  const savedProgress = storeGet(KEY_PROGRESS, {});
  progress = isPlainObject(savedProgress) ? savedProgress : {};
  const savedSettings = storeGet(KEY_SETTINGS, {});
  if (isPlainObject(savedSettings)) settings = { ...settings, ...savedSettings };
  // First start: follow the language of the device.
  if (!isPlainObject(savedSettings) || !savedSettings.language) {
    const device = String(navigator.language || 'nl').slice(0, 2).toLowerCase();
    settings.language = STRINGS[device] ? device : 'en';
  }
  if (!STRINGS[settings.language]) settings.language = 'nl';
  if (settings.displayMode !== 'animals') settings.displayMode = 'numbers';
}

function levelKey(w, i)     { return `w${w}_l${i}`; }
function getLevelStars(w, i) { return (progress[levelKey(w, i)] || {}).stars || 0; }
function worldLevels(w)     { return LEVELS.filter(l => l.world === w); }
function getTotalStars()    { return LEVELS.reduce((s, l) => s + getLevelStars(l.world, l.indexInWorld), 0); }
function getWorldStars(w)   { return worldLevels(w).reduce((s, l) => s + getLevelStars(w, l.indexInWorld), 0); }
function getWorldCompleted(w) { return worldLevels(w).filter(l => getLevelStars(w, l.indexInWorld) > 0).length; }
function isWorldUnlocked(w) {
  if (w === 0) return true;
  return getWorldCompleted(w - 1) >= Math.floor(worldLevels(w - 1).length * 0.5);
}
function isLevelUnlocked(w, i) { return i === 0 || getLevelStars(w, i - 1) > 0; }

// ============================================================
// AUDIO (Web Audio API – generated bloops, no files)
// ============================================================
let audioCtx = null;
function playTone(freq, type = 'sine', duration = 0.12, gain = 0.25) {
  if (!settings.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.connect(g); g.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + duration * 0.6);
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
  } catch (e) { /* audio not available */ }
}
const playBloop   = () => playTone(440, 'sine', 0.1, 0.18);
const playPlace   = () => playTone(620, 'sine', 0.12, 0.2);
const playError   = () => playTone(200, 'triangle', 0.25, 0.2);
const playHint    = () => playTone(660, 'sine', 0.18, 0.22);
const playWin     = () => [523, 587, 659, 784, 880, 1047].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.16, 0.25), i * 70));

// ============================================================
// MASCOT
// ============================================================
let mascotTimeout = null;
function showMascotMessage(text) {
  const where = currentScreen === 'game' ? '#game-mascot' : '#mascot';
  const bubble = document.querySelector(where + ' .mascot-bubble');
  const cat = document.querySelector(where + ' .mascot-emoji');
  if (!bubble) return;
  bubble.textContent = text;
  bubble.classList.remove('show');
  void bubble.offsetWidth;            // restart pop animation
  bubble.classList.add('show');
  if (cat) { cat.classList.remove('wiggle'); void cat.offsetWidth; cat.classList.add('wiggle'); }
  clearTimeout(mascotTimeout);
  mascotTimeout = setTimeout(() => bubble.classList.remove('show'), 3500);
}
function updateMascotVisibility() {
  document.getElementById('mascot').classList.toggle('hidden', !['worlds', 'levels'].includes(currentScreen));
}

// Restart a short CSS animation on an element.
function flash(el, cls, ms = 500) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

// ============================================================
// NAVIGATION
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  currentScreen = id;
  updateMascotVisibility();
  armBackButton();
}
function goToWorlds() {
  stopTimer();
  showScreen('worlds');
  updateWorldsUI();
  setTimeout(() => { if (currentScreen === 'worlds') showMascotMessage(pick('mIdle')); }, 500);
}
function goToLevels(w) {
  stopTimer();
  currentWorld = w;
  showScreen('levels');
  document.getElementById('levels-world-title').textContent = t('world' + w);
  document.getElementById('world-total-stars').textContent = getWorldStars(w);
  buildLevelsGrid(w);
}
function goToSettings() {
  showScreen('settings');
  syncSettingsUI();
}
function leaveGame() {
  saveCurrent();
  goToLevels(gameState.lv.world);
}

// Android back button / browser back / Escape: one step back inside the app.
// A history entry is added as soon as the player leaves the start screens,
// so "back" does not close the app in the middle of a puzzle.
let backArmed = false;
function armBackButton() {
  const needed = !ROOT_SCREENS.includes(currentScreen) || !!document.querySelector('.modal:not(.hidden)');
  if (!needed || backArmed) return;
  try { history.pushState({ sudokuKids: true }, ''); backArmed = true; } catch (e) { /* ignore */ }
}
function goBack() {
  const modal = document.querySelector('.modal:not(.hidden)');
  if (modal) {
    hideModals();
    if (modal.id !== 'modal-confirm') goToLevels(gameState.lv.world);
    return true;
  }
  if (currentScreen === 'game') { leaveGame(); return true; }
  if (currentScreen === 'levels' || currentScreen === 'settings') { goToWorlds(); return true; }
  return false;
}

// ============================================================
// WORLDS
// ============================================================
function updateWorldsUI() {
  document.getElementById('total-stars-display').textContent = getTotalStars();
  for (let w = 0; w < WORLD_COUNT; w++) {
    const total = worldLevels(w).length;
    const done = getWorldCompleted(w);
    const locked = !isWorldUnlocked(w);
    const card = document.getElementById(`world-card-${w}`);
    document.getElementById(`world-${w}-progress`).style.width = Math.round(done / total * 100) + '%';
    document.getElementById(`world-${w}-text`).textContent = `${done}/${total}`;
    document.getElementById(`world-${w}-lock`).style.display = locked ? 'flex' : 'none';
    card.classList.toggle('locked', locked);
    card.setAttribute('aria-disabled', String(locked));
    const filled = Math.round(getWorldStars(w) / (total * 3) * 3);
    document.getElementById(`world-${w}-stars`).textContent = '⭐'.repeat(filled) + '☆'.repeat(3 - filled);
  }
}

// ============================================================
// LEVEL SELECT
// ============================================================
function buildLevelsGrid(w) {
  const grid = document.getElementById('levels-grid');
  grid.innerHTML = '';
  worldLevels(w).forEach(lv => {
    const i = lv.indexInWorld;
    const stars = getLevelStars(w, i);
    const unlocked = isLevelUnlocked(w, i);
    const btn = document.createElement('button');
    btn.className = 'level-btn type-' + lv.type;
    btn.innerHTML = '<span class="level-type-dot"></span>';
    btn.setAttribute('aria-label', `${t('level')} ${i + 1}` + (stars ? `, ${stars}/3 ⭐` : ''));

    if (!unlocked) {
      btn.classList.add('locked');
      btn.disabled = true;
      btn.innerHTML += '<span class="level-lock-icon">🔒</span>';
    } else {
      btn.classList.add(stars > 0 ? 'completed' : 'current');
      btn.innerHTML += `<span class="level-number">${i + 1}</span>`;
      if (stars > 0) btn.innerHTML += `<span class="level-stars-small">${'⭐'.repeat(stars)}</span>`;
      else {
        const icon = lv.type === 'shapes' ? '🍓' : lv.type === 'xsudoku' ? '✖️' : `${lv.size}×${lv.size}`;
        btn.innerHTML += `<span class="level-sub">${icon}</span>`;
      }
      btn.addEventListener('click', () => { playBloop(); startLevel(lv.globalIndex); });
    }
    grid.appendChild(btn);
  });
  // Scroll the next level to play into view (scroll the screen itself, never the page).
  const screen = document.getElementById('screen-levels');
  const current = grid.querySelector('.level-btn.current');
  screen.scrollTop = current ? Math.max(0, current.offsetTop - screen.clientHeight / 2) : 0;
}

// ============================================================
// GAME – START
// ============================================================
function mistakeLimit(lv) { return lv.size === 4 ? Infinity : MAX_MISTAKES; }

// `fresh` = start from scratch (replay button); otherwise an unfinished game
// of this level is continued where the player left it.
function startLevel(globalIndex, fresh) {
  const lv = LEVELS[globalIndex];
  const puzzle = E.getPuzzle(globalIndex);
  const n = lv.size * lv.size;
  stopTimer();
  gameState = {
    lv, size: lv.size, type: lv.type,
    given: puzzle.given, solution: puzzle.solution,
    grid: puzzle.given.slice(),
    notes: Array.from({ length: n }, () => new Set()),
    tried: Array.from({ length: n }, () => new Set()),   // wrong values already tried per cell
    selected: -1, mistakes: 0, hintsUsed: 0, maxMistakes: mistakeLimit(lv),
    timerSecs: 0, timerInterval: null,
    isNotesMode: false, isComplete: false, dirty: false,
    guide: getTotalStars() === 0,                         // brand-new player: show where to tap
    rcbPeers: E.getUnits(lv.size, false).peers,           // row/col/box (for highlighting)
    allPeers: E.getUnits(lv.size, lv.type === 'xsudoku').peers, // incl. diagonals (for notes)
  };
  if (fresh) clearCurrent(); else restoreCurrent();

  showScreen('game');
  document.getElementById('screen-game').className = `screen active size-${lv.size}`;
  document.getElementById('game-level-label').textContent = `${t('level')} ${lv.indexInWorld + 1}`;
  document.getElementById('game-type-badge').textContent =
    lv.type === 'xsudoku' ? t('typeX') : lv.type === 'shapes' ? t('typeShapes') : t('typeStandard');
  setNotesMode(false);
  updateStats();
  updateDisplayToggle();
  buildNumPad();   // numpad first, so buildGrid measures the real free space
  buildGrid();
  renderGrid();
  startTimer();
  const gs = gameState;
  setTimeout(() => {
    if (gameState === gs && currentScreen === 'game') showMascotMessage(lv.type === 'xsudoku' ? t('xHelp') : pick('mStart'));
  }, 300);
}

function updateStats() {
  const gs = gameState;
  const lives = document.getElementById('lives-display');
  if (gs.maxMistakes === Infinity) {
    // 4×4: no game over, the stars you will get are shown instead.
    const stars = calcStars(gs.mistakes, gs.hintsUsed);
    lives.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    lives.setAttribute('aria-label', `${stars}/3 ⭐`);
  } else {
    const left = Math.max(0, gs.maxMistakes - gs.mistakes);
    lives.textContent = '❤️'.repeat(left) + '🤍'.repeat(gs.maxMistakes - left);
    lives.setAttribute('aria-label', `${t('mistakes')}: ${gs.mistakes}/${gs.maxMistakes}`);
  }
  document.getElementById('hint-count').textContent = MAX_HINTS - gs.hintsUsed;
  document.getElementById('btn-hint').disabled = gs.hintsUsed >= MAX_HINTS;
}

// ---------- Unfinished game: saved after every move ----------
function saveCurrent() {
  const gs = gameState;
  if (!gs || gs.isComplete || !gs.dirty) return;
  storeSet(KEY_CURRENT, {
    i: gs.lv.globalIndex, grid: gs.grid,
    notes: gs.notes.map(s => [...s]), tried: gs.tried.map(s => [...s]),
    mistakes: gs.mistakes, hintsUsed: gs.hintsUsed, secs: gs.timerSecs,
  });
}
function clearCurrent() { storeRemove(KEY_CURRENT); }
function restoreCurrent() {
  const gs = gameState, s = storeGet(KEY_CURRENT, null);
  const n = gs.grid.length;
  const isList = a => Array.isArray(a) && a.length === n;
  const inRange = v => Number.isInteger(v) && v >= 0 && v <= gs.size;
  if (!isPlainObject(s) || s.i !== gs.lv.globalIndex) return;
  if (!isList(s.grid) || !isList(s.notes) || !isList(s.tried)) return;
  if (!s.grid.every((v, i) => inRange(v) && (gs.given[i] === 0 || v === gs.given[i]))) return;
  if (![...s.notes, ...s.tried].every(a => Array.isArray(a) && a.every(inRange))) return;
  const mistakes = Number.isInteger(s.mistakes) && s.mistakes >= 0 ? s.mistakes : 0;
  if (mistakes >= gs.maxMistakes) return;
  gs.grid = s.grid.slice();
  gs.notes = s.notes.map(a => new Set(a));
  gs.tried = s.tried.map(a => new Set(a));
  gs.mistakes = mistakes;
  gs.hintsUsed = Math.min(MAX_HINTS, Math.max(0, s.hintsUsed | 0));
  gs.timerSecs = Math.max(0, s.secs | 0);
  gs.dirty = true;
}

// ============================================================
// GRID
// ============================================================
function buildGrid() {
  const { size, type } = gameState;
  const gridEl = document.getElementById('sudoku-grid');
  const container = document.querySelector('.grid-container');
  gridEl.innerHTML = '';

  // Measure the free space the layout leaves for the grid.
  gridEl.style.width = gridEl.style.height = '0px';
  const box = container.getBoundingClientRect();
  const avail = Math.max(160, Math.min(box.width - 16, box.height - 16, 720));
  const cellSize = Math.floor(avail / size);

  gridEl.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
  gridEl.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
  gridEl.style.width = gridEl.style.height = (cellSize * size) + 'px';
  gridEl.style.setProperty('--cell-font', Math.max(14, Math.floor(cellSize * (size === 9 ? 0.6 : 0.5))) + 'px');
  gridEl.style.setProperty('--note-font', Math.max(7, Math.floor(cellSize / (size === 4 ? 4 : 3.6))) + 'px');
  gridEl.style.setProperty('--note-cols', size === 4 ? 2 : 3);

  for (let idx = 0; idx < size * size; idx++) {
    const cell = document.createElement('div');
    cell.dataset.idx = idx;
    cell.setAttribute('role', 'button');
    cell.addEventListener('click', () => onCellClick(idx));
    gridEl.appendChild(cell);
  }
  gameState.cellBase = baseClasses(size, type);
}

function baseClasses(size, type) {
  const [br, bc] = E.boxDims(size);
  return Array.from({ length: size * size }, (_, idx) => {
    const r = Math.floor(idx / size), c = idx % size;
    const cls = ['sudoku-cell'];
    if ((c + 1) % bc === 0 && c < size - 1) cls.push('box-right');
    if ((r + 1) % br === 0 && r < size - 1) cls.push('box-bottom');
    if (type === 'xsudoku' && (r === c || r + c === size - 1)) cls.push('diagonal-cell');
    return cls.join(' ');
  });
}

function getDisplayValue(num) {
  if (!num) return '';
  if (gameState.type === 'shapes') return FRUIT_SYMBOLS[num - 1];
  if (settings.displayMode === 'animals') return ANIMAL_SYMBOLS[num - 1];
  return String(num);
}

// The grid with only the correct values (wrong tries left out).
function correctGrid() {
  const gs = gameState;
  return gs.grid.map((v, i) => (v === gs.solution[i] ? v : 0));
}
// A cell that can be found with simple logic right now (or any open cell).
function easiestOpenCell() {
  const gs = gameState;
  const singles = [...E.findSingles(correctGrid(), gs.size, gs.type === 'xsudoku').keys()];
  if (singles.length) return singles[Math.floor(Math.random() * singles.length)];
  const open = [];
  gs.grid.forEach((v, i) => { if (v !== gs.solution[i]) open.push(i); });
  return open.length ? open[Math.floor(Math.random() * open.length)] : -1;
}

function renderGrid() {
  const gs = gameState;
  const sel = gs.selected;
  const selVal = sel >= 0 ? gs.grid[sel] : 0;
  const related = sel >= 0 ? new Set(gs.rcbPeers[sel]) : null;
  const cells = document.getElementById('sudoku-grid').children;

  // New player: point at a cell to tap, then at the number buttons.
  const guiding = gs.guide && !gs.isComplete;
  if (guiding && sel < 0 && (gs.guideCell === undefined || gs.grid[gs.guideCell] === gs.solution[gs.guideCell])) {
    gs.guideCell = Math.min(...E.findSingles(correctGrid(), gs.size, gs.type === 'xsudoku').keys());
  }
  const selOpen = sel >= 0 && gs.grid[sel] !== gs.solution[sel];
  document.getElementById('numpad').classList.toggle('nudge-pad', guiding && selOpen);

  for (let idx = 0; idx < cells.length; idx++) {
    const cell = cells[idx];
    const val = gs.grid[idx];
    const isGiven = gs.given[idx] !== 0;
    const isWrong = !isGiven && val !== 0 && val !== gs.solution[idx];
    let cls = gs.cellBase[idx];
    if (isGiven) cls += ' given';
    if (val !== gs.solution[idx]) cls += ' open';
    if (idx === sel) cls += ' selected';
    else if (selVal && val === selVal) cls += ' same-num';
    else if (related && related.has(idx)) cls += ' highlighted';
    if (isWrong && settings.highlightErrors) cls += ' error';
    if (guiding && sel < 0 && idx === gs.guideCell) cls += ' nudge';
    if (cell.className.replace(/ (shake|correct-flash)/g, '') !== cls) cell.className = cls;

    let html = '';
    if (val) {
      html = `<span class="cell-content">${getDisplayValue(val)}</span>`;
    } else if (gs.notes[idx].size) {
      html = '<div class="cell-notes">';
      for (let n = 1; n <= gs.size; n++) html += `<span class="note-num">${gs.notes[idx].has(n) ? getDisplayValue(n) : ''}</span>`;
      html += '</div>';
    }
    if (cell._html !== html) { cell.innerHTML = html; cell._html = html; }

    const r = Math.floor(idx / gs.size) + 1, c = idx % gs.size + 1;
    const label = `${t('row')} ${r}, ${t('col')} ${c}: ${val ? getDisplayValue(val) : t('empty')}`;
    if (cell._label !== label) { cell.setAttribute('aria-label', label); cell._label = label; }
  }
}

function flashCell(idx, cls) { flash(document.getElementById('sudoku-grid').children[idx], cls); }

// ============================================================
// NUMPAD
// ============================================================
function buildNumPad() {
  const pad = document.getElementById('numpad');
  pad.innerHTML = '';
  pad.style.setProperty('--pad-cols', gameState.size === 6 ? 4 : 5);
  for (let n = 1; n <= gameState.size; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.dataset.num = n;
    btn.textContent = getDisplayValue(n);
    btn.addEventListener('click', () => onNumPress(n));
    pad.appendChild(btn);
  }
  const eraseBtn = document.createElement('button');
  eraseBtn.className = 'num-btn erase-btn';
  eraseBtn.textContent = '🧹';
  eraseBtn.setAttribute('aria-label', t('erase'));
  eraseBtn.addEventListener('click', onErase);
  pad.appendChild(eraseBtn);
  updateNumPadCompletion();
}

function updateNumPadCompletion() {
  const gs = gameState;
  const counts = {};
  gs.grid.forEach((v, i) => { if (v && v === gs.solution[i]) counts[v] = (counts[v] || 0) + 1; });
  document.querySelectorAll('.num-btn[data-num]').forEach(btn => {
    btn.classList.toggle('completed-num', (counts[btn.dataset.num] || 0) >= gs.size);
  });
}

// ============================================================
// INPUT
// ============================================================
function onCellClick(idx) {
  if (!gameState || gameState.isComplete) return;
  playBloop();
  gameState.selected = idx;
  renderGrid();
}

// Nothing useful is selected: show (without words) which cells can be tapped.
function pointAtOpenCells() {
  flash(document.getElementById('sudoku-grid'), 'wake', 900);
  showMascotMessage(t('mTap'));
}

function onNumPress(num) {
  const gs = gameState;
  if (!gs || gs.isComplete) return;
  const idx = gs.selected;
  if (idx < 0 || gs.grid[idx] === gs.solution[idx]) { pointAtOpenCells(); return; }  // given or already correct

  if (gs.isNotesMode) {
    gs.grid[idx] = 0;                 // a wrong try would hide the notes
    const notes = gs.notes[idx];
    notes.has(num) ? notes.delete(num) : notes.add(num);
    gs.dirty = true;
    playBloop();
    renderGrid();
    saveCurrent();
    return;
  }

  gs.grid[idx] = num;
  gs.dirty = true;
  if (num !== gs.solution[idx]) {
    // The same wrong answer in the same cell only counts once.
    if (!gs.tried[idx].has(num)) { gs.tried[idx].add(num); gs.mistakes++; }
    updateStats();
    playError();
    renderGrid();
    flashCell(idx, 'shake');
    if (gs.mistakes >= gs.maxMistakes) {
      gs.isComplete = true;
      stopTimer();
      clearCurrent();
      setTimeout(() => { if (gameState === gs && currentScreen === 'game') showGameOver(); }, 600);
    } else {
      saveCurrent();
      showMascotMessage(pick('mErr'));
    }
    return;
  }

  playPlace();
  gs.notes[idx].clear();
  gs.allPeers[idx].forEach(p => gs.notes[p].delete(num));
  gs.guide = false;
  renderGrid();
  flashCell(idx, 'correct-flash');
  updateNumPadCompletion();
  if (Math.random() < 0.25) showMascotMessage(pick('mGood'));
  if (!checkWin()) saveCurrent();
}

function onErase() {
  const gs = gameState;
  if (!gs || gs.isComplete) return;
  const idx = gs.selected;
  if (idx < 0 || gs.grid[idx] === gs.solution[idx]) { pointAtOpenCells(); return; }
  gs.grid[idx] = 0;
  gs.notes[idx].clear();
  gs.dirty = true;
  playBloop();
  renderGrid();
  saveCurrent();
}

function setNotesMode(on) {
  gameState.isNotesMode = on;
  const btn = document.getElementById('btn-notes');
  btn.classList.toggle('active-mode', on);
  btn.setAttribute('aria-pressed', String(on));
  document.getElementById('numpad').classList.toggle('notes-mode', on);
}

function giveHint() {
  const gs = gameState;
  if (!gs || gs.isComplete) return;
  if (gs.hintsUsed >= MAX_HINTS) { showMascotMessage(t('mNoHints')); return; }
  // Prefer the selected cell if it still needs filling, else a cell that can be
  // found with simple logic (so the hint is one the child can follow).
  let idx = gs.selected;
  if (idx < 0 || gs.grid[idx] === gs.solution[idx]) idx = easiestOpenCell();
  if (idx < 0) return;
  gs.grid[idx] = gs.solution[idx];
  gs.notes[idx].clear();
  gs.allPeers[idx].forEach(p => gs.notes[p].delete(gs.solution[idx]));
  gs.selected = idx;
  gs.hintsUsed++;
  gs.dirty = true;
  updateStats();
  playHint();
  showMascotMessage(pick('mHint'));
  renderGrid();
  flashCell(idx, 'correct-flash');
  updateNumPadCompletion();
  if (!checkWin()) saveCurrent();
}

// ============================================================
// VALIDATION – the board is solved when every cell matches the
// (guaranteed unique) solution.
// ============================================================
function checkWin() {
  const gs = gameState;
  if (!gs.grid.every((v, i) => v === gs.solution[i])) return false;
  gs.isComplete = true;
  stopTimer();
  // Save right away: the stars are safe even if the app is closed now.
  const lv = gs.lv;
  const stars = calcStars(gs.mistakes, gs.hintsUsed);
  const key = levelKey(lv.world, lv.indexInWorld);
  const prev = isPlainObject(progress[key]) ? progress[key] : {};
  progress[key] = {
    stars: Math.max(stars, prev.stars || 0),
    time: prev.time ? Math.min(prev.time, gs.timerSecs) : gs.timerSecs,
  };
  saveProgress();
  clearCurrent();
  renderGrid();
  setTimeout(() => { if (gameState === gs && currentScreen === 'game') showWin(stars); }, 450);
  return true;
}

// ============================================================
// TIMER (pauses when the app is in the background)
// ============================================================
function startTimer() {
  stopTimer();
  updateTimerDisplay();
  gameState.timerInterval = setInterval(() => {
    if (document.hidden || currentScreen !== 'game') return;
    gameState.timerSecs++;
    updateTimerDisplay();
  }, 1000);
}
function stopTimer() { if (gameState) clearInterval(gameState.timerInterval); }
function formatTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function updateTimerDisplay() { document.getElementById('game-timer').textContent = formatTime(gameState.timerSecs); }

// ============================================================
// WIN / GAME OVER
// ============================================================
function calcStars(mistakes, hints) {
  if (mistakes === 0 && hints === 0) return 3;
  if (mistakes + hints <= 2) return 2;
  return 1;
}

function showWin(stars) {
  const gs = gameState, lv = gs.lv;
  document.getElementById('win-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  document.getElementById('win-stars').setAttribute('aria-label', `${stars}/3 ⭐`);
  document.getElementById('win-time').textContent = formatTime(gs.timerSecs);
  document.getElementById('win-mistakes').textContent = gs.mistakes;
  document.getElementById('win-hints').textContent = gs.hintsUsed;
  document.getElementById('win-title').textContent = pick('mWin');
  const isLast = lv.indexInWorld >= worldLevels(lv.world).length - 1;
  document.getElementById('btn-win-next').style.display = isLast ? 'none' : 'block';

  showModal('win');
  playWin();
  launchConfetti();
}

function showGameOver() {
  showModal('gameover');
  playError();
}

function showModal(name) {
  hideModals();
  const modal = document.getElementById('modal-' + name);
  modal.classList.remove('hidden');
  document.querySelectorAll('.screen').forEach(s => { s.inert = true; });
  const first = [...modal.querySelectorAll('button')].find(b => b.style.display !== 'none');
  if (first) first.focus({ preventScroll: true });
  armBackButton();
}
function hideModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.querySelectorAll('.screen').forEach(s => { s.inert = false; });
}

function launchConfetti() {
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';
  if (reducedMotion.matches) return;
  const colors = ['#FF6B9D', '#FFD93D', '#6BCFB5', '#6BB8FF', '#C77DFF', '#FF9F43'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 20 + '%';
    p.style.background = colors[i % colors.length];
    p.style.width = (6 + Math.random() * 8) + 'px';
    p.style.height = (6 + Math.random() * 8) + 'px';
    p.style.animationDelay = Math.random() + 's';
    p.style.animationDuration = (1.5 + Math.random()) + 's';
    container.appendChild(p);
  }
}

// ============================================================
// DISPLAY MODE (numbers <-> animals)
// ============================================================
function updateDisplayToggle() {
  // The button shows what you get when you tap it.
  const btn = document.getElementById('btn-display');
  const other = settings.displayMode === 'numbers' ? 'animals' : 'numbers';
  btn.classList.toggle('hidden', gameState.type === 'shapes');
  btn.textContent = other === 'animals' ? '🐶' : '123';
  btn.classList.toggle('as-text', other === 'numbers');
  btn.setAttribute('aria-label', t(other));
}
function setDisplayMode(mode) {
  settings.displayMode = mode;
  saveSettings();
  playBloop();
  if (!gameState) return;
  updateDisplayToggle();
  buildNumPad();
  renderGrid();
}

// ============================================================
// SETTINGS
// ============================================================
function syncSettingsUI() {
  document.getElementById('setting-sound').checked = settings.sound;
  document.getElementById('setting-language').value = settings.language;
  document.getElementById('setting-highlight-errors').checked = settings.highlightErrors;
}

// ============================================================
// EVENTS
// ============================================================
function on(id, ev, fn) { document.getElementById(id).addEventListener(ev, fn); }

function initEventListeners() {
  on('btn-start', 'click', () => { playBloop(); goToWorlds(); });

  document.querySelectorAll('.world-card').forEach(card => {
    card.addEventListener('click', () => {
      const w = parseInt(card.dataset.world, 10);
      if (!isWorldUnlocked(w)) {
        playError();
        flash(card, 'shake');
        showMascotMessage(t('mLocked'));
        return;
      }
      playBloop();
      goToLevels(w);
    });
  });

  on('btn-worlds-settings', 'click', () => { playBloop(); goToSettings(); });
  on('btn-levels-back', 'click', () => { playBloop(); goToWorlds(); });
  on('btn-game-back', 'click', () => { playBloop(); leaveGame(); });
  on('btn-settings-back', 'click', () => { playBloop(); goToWorlds(); });

  on('btn-hint', 'click', giveHint);
  on('btn-notes', 'click', () => { setNotesMode(!gameState.isNotesMode); playBloop(); });
  on('btn-display', 'click', () => setDisplayMode(settings.displayMode === 'numbers' ? 'animals' : 'numbers'));

  on('btn-win-next', 'click', () => { hideModals(); playBloop(); startLevel(gameState.lv.globalIndex + 1); });
  on('btn-win-replay', 'click', () => { hideModals(); playBloop(); startLevel(gameState.lv.globalIndex, true); });
  on('btn-win-home', 'click', () => { hideModals(); playBloop(); goToLevels(gameState.lv.world); });
  on('btn-go-replay', 'click', () => { hideModals(); playBloop(); startLevel(gameState.lv.globalIndex, true); });
  on('btn-go-home', 'click', () => { hideModals(); playBloop(); goToLevels(gameState.lv.world); });

  on('setting-sound', 'change', e => { settings.sound = e.target.checked; saveSettings(); playBloop(); });
  on('setting-language', 'change', e => { settings.language = e.target.value; saveSettings(); applyTranslations(); });
  on('setting-highlight-errors', 'change', e => { settings.highlightErrors = e.target.checked; saveSettings(); });

  on('btn-reset-progress', 'click', () => { playBloop(); showModal('confirm'); });
  on('btn-confirm-yes', 'click', () => {
    progress = {}; saveProgress(); clearCurrent(); hideModals(); playBloop();
    goToWorlds();
    setTimeout(() => showMascotMessage(t('mReset')), 600);
  });
  on('btn-confirm-no', 'click', () => { hideModals(); playBloop(); });

  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('popstate', () => {
    backArmed = false;
    goBack();
    armBackButton();
  });

  // Keep the unfinished game (and its timer) when the app goes to the background.
  document.addEventListener('visibilitychange', () => { if (document.hidden && currentScreen === 'game') saveCurrent(); });
  window.addEventListener('pagehide', () => { if (currentScreen === 'game') saveCurrent(); });

  window.addEventListener('resize', debounce(() => {
    if (currentScreen === 'game' && gameState) {
      buildGrid();
      document.querySelectorAll('#sudoku-grid > *').forEach(c => { c._html = c._label = undefined; });
      renderGrid();
    }
  }, 150));
}

function onKeyDown(e) {
  if (e.key === 'Escape') { if (goBack()) e.preventDefault(); return; }
  if (currentScreen !== 'game' || !gameState || document.querySelector('.modal:not(.hidden)')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const size = gameState.size;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= size) { onNumPress(n); return; }
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { onErase(); return; }
  if (e.key === 'n' || e.key === 'N') { document.getElementById('btn-notes').click(); return; }
  if (e.key === 'h' || e.key === 'H') { giveHint(); return; }

  const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  if (!moves[e.key] || gameState.isComplete) return;
  e.preventDefault();
  if (gameState.selected < 0) { gameState.selected = 0; renderGrid(); return; }
  const r = Math.floor(gameState.selected / size), c = gameState.selected % size;
  const nr = Math.min(size - 1, Math.max(0, r + moves[e.key][0]));
  const nc = Math.min(size - 1, Math.max(0, c + moves[e.key][1]));
  gameState.selected = nr * size + nc;
  renderGrid();
}

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ============================================================
// SERVICE WORKER
// ============================================================
function registerSW() {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  // A new version took over: load it right away, but never in the middle of a puzzle.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded || !ROOT_SCREENS.includes(currentScreen)) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ============================================================
// INIT
// ============================================================
function init() {
  loadAll();
  applyTranslations();
  initEventListeners();
  registerSW();
  showScreen('splash');
  setInterval(() => {
    if (currentScreen === 'worlds' && !document.hidden) showMascotMessage(pick('mIdle'));
  }, 9000);
}

document.addEventListener('DOMContentLoaded', init);
