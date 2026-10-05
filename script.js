/* ============================================================
   SUDOKU KIDS & CRAZY GRIDS – script.js
   Game UI. Puzzles come from puzzles.js, texts from i18n.js.
   ============================================================ */
'use strict';

const E = window.SudokuEngine;

const ANIMAL_SYMBOLS = ['🐶','🐱','🐸','🐻','🦊','🐨','🐯','🐧','🦁'];
const FRUIT_SYMBOLS  = ['🍎','🍌','🍇','🍓','🍊','🍋','🍉','🍑','🍒'];
const MAX_MISTAKES = 3;
const MAX_HINTS = 3;
const WORLD_COUNT = 3;

// ============================================================
// STATE
// ============================================================
let settings = { sound: true, language: 'nl', highlightErrors: true, displayMode: 'numbers' };
let progress = {};            // { 'w0_l0': { stars:3, time:45 }, ... }
let currentScreen = 'splash';
let currentWorld = 0;
let gameState = null;

const LEVELS = E.LEVEL_PLAN;  // 105 level definitions (world, size, type, seed)

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
function saveProgress() { storeSet('sudokuKids_progress', progress); }
function saveSettings() { storeSet('sudokuKids_settings', settings); }
function loadAll() {
  progress = storeGet('sudokuKids_progress', {}) || {};
  settings = { ...settings, ...(storeGet('sudokuKids_settings', {}) || {}) };
  if (!STRINGS[settings.language]) settings.language = 'nl';
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

// ============================================================
// NAVIGATION
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  currentScreen = id;
  updateMascotVisibility();
}
function goToWorlds() {
  stopTimer();
  showScreen('worlds');
  updateWorldsUI();
  setTimeout(() => showMascotMessage(pick('mIdle')), 500);
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

// ============================================================
// WORLDS
// ============================================================
function updateWorldsUI() {
  document.getElementById('total-stars-display').textContent = getTotalStars();
  for (let w = 0; w < WORLD_COUNT; w++) {
    const total = worldLevels(w).length;
    const done = getWorldCompleted(w);
    const locked = !isWorldUnlocked(w);
    document.getElementById(`world-${w}-progress`).style.width = Math.round(done / total * 100) + '%';
    document.getElementById(`world-${w}-text`).textContent = `${done}/${total}`;
    document.getElementById(`world-${w}-lock`).style.display = locked ? 'flex' : 'none';
    document.getElementById(`world-card-${w}`).classList.toggle('locked', locked);
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
  const current = grid.querySelector('.level-btn.current');
  if (current) current.scrollIntoView({ block: 'center' });
}

// ============================================================
// GAME – START
// ============================================================
function startLevel(globalIndex) {
  const lv = LEVELS[globalIndex];
  const puzzle = E.getPuzzle(globalIndex);
  const n = lv.size * lv.size;
  stopTimer();
  gameState = {
    lv, size: lv.size, type: lv.type,
    given: puzzle.given, solution: puzzle.solution,
    grid: puzzle.given.slice(),
    notes: Array.from({ length: n }, () => new Set()),
    selected: -1, mistakes: 0, hintsUsed: 0,
    timerSecs: 0, timerInterval: null,
    isNotesMode: false, isComplete: false,
    rcbPeers: E.getUnits(lv.size, false).peers,           // row/col/box (for highlighting)
    allPeers: E.getUnits(lv.size, lv.type === 'xsudoku').peers, // incl. diagonals (for notes)
  };

  showScreen('game');
  document.getElementById('game-level-label').textContent = `${t('level')} ${lv.indexInWorld + 1}`;
  document.getElementById('game-type-badge').textContent =
    lv.type === 'xsudoku' ? t('typeX') : lv.type === 'shapes' ? t('typeShapes') : t('typeStandard');
  document.getElementById('btn-notes').classList.remove('active-mode');
  updateStats();
  updateDisplayToggle();
  buildNumPad();   // numpad first, so buildGrid measures the real free space
  buildGrid();
  renderGrid();
  startTimer();
  setTimeout(() => showMascotMessage(lv.type === 'xsudoku' ? t('xHelp') : pick('mStart')), 300);
}

function updateStats() {
  document.getElementById('mistake-count').textContent = `${gameState.mistakes}/${MAX_MISTAKES}`;
  document.getElementById('hint-count').textContent = MAX_HINTS - gameState.hintsUsed;
  document.getElementById('btn-hint').disabled = gameState.hintsUsed >= MAX_HINTS;
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
  const avail = Math.max(180, Math.min(box.width - 24, box.height - 24, 720));
  const cellSize = Math.floor(avail / size);

  gridEl.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
  gridEl.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
  gridEl.style.width = gridEl.style.height = (cellSize * size) + 'px';
  gridEl.style.setProperty('--cell-font', Math.max(14, Math.floor(cellSize * (size === 9 ? 0.55 : 0.5))) + 'px');
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

function renderGrid() {
  const gs = gameState;
  const sel = gs.selected;
  const selVal = sel >= 0 ? gs.grid[sel] : 0;
  const related = sel >= 0 ? new Set(gs.rcbPeers[sel]) : null;
  const cells = document.getElementById('sudoku-grid').children;

  for (let idx = 0; idx < cells.length; idx++) {
    const cell = cells[idx];
    const val = gs.grid[idx];
    const isGiven = gs.given[idx] !== 0;
    let cls = gs.cellBase[idx];
    if (isGiven) cls += ' given';
    if (idx === sel) cls += ' selected';
    else if (selVal && val === selVal) cls += ' same-num';
    else if (related && related.has(idx)) cls += ' highlighted';
    if (!isGiven && val && val !== gs.solution[idx] && settings.highlightErrors) cls += ' error';
    cell.className = cls;

    if (val) {
      cell.innerHTML = `<span class="cell-content">${getDisplayValue(val)}</span>`;
    } else if (gs.notes[idx].size) {
      let html = '<div class="cell-notes">';
      for (let n = 1; n <= gs.size; n++) html += `<span class="note-num">${gs.notes[idx].has(n) ? getDisplayValue(n) : ''}</span>`;
      cell.innerHTML = html + '</div>';
    } else {
      cell.innerHTML = '';
    }
  }
}

function flashCell(idx, cls) {
  const cell = document.getElementById('sudoku-grid').children[idx];
  if (!cell) return;
  cell.classList.remove(cls); void cell.offsetWidth; cell.classList.add(cls);
  setTimeout(() => cell.classList.remove(cls), 500);
}

// ============================================================
// NUMPAD
// ============================================================
function buildNumPad() {
  const pad = document.getElementById('numpad');
  pad.innerHTML = '';
  pad.style.setProperty('--pad-cols', gameState.size === 9 ? 5 : gameState.size === 6 ? 4 : 5);
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

function onNumPress(num) {
  const gs = gameState;
  if (!gs || gs.isComplete || gs.selected < 0) {
    if (gs && gs.selected < 0) showMascotMessage(pick('mStart'));
    return;
  }
  const idx = gs.selected;
  if (gs.given[idx] !== 0) return;
  if (gs.grid[idx] === gs.solution[idx]) return; // already correct – nothing to change

  if (gs.isNotesMode) {
    const notes = gs.notes[idx];
    notes.has(num) ? notes.delete(num) : notes.add(num);
    playBloop();
    renderGrid();
    return;
  }

  gs.grid[idx] = num;
  if (num !== gs.solution[idx]) {
    gs.mistakes++;
    updateStats();
    playError();
    renderGrid();
    flashCell(idx, 'shake');
    if (gs.mistakes >= MAX_MISTAKES) {
      gs.isComplete = true;
      stopTimer();
      setTimeout(showGameOver, 600);
    } else {
      showMascotMessage(pick('mErr'));
    }
    return;
  }

  playPlace();
  gs.notes[idx].clear();
  gs.allPeers[idx].forEach(p => gs.notes[p].delete(num));
  renderGrid();
  flashCell(idx, 'correct-flash');
  updateNumPadCompletion();
  if (Math.random() < 0.25) showMascotMessage(pick('mGood'));
  checkWin();
}

function onErase() {
  const gs = gameState;
  if (!gs || gs.isComplete || gs.selected < 0) return;
  const idx = gs.selected;
  if (gs.given[idx] !== 0 || gs.grid[idx] === gs.solution[idx]) return;
  gs.grid[idx] = 0;
  gs.notes[idx].clear();
  playBloop();
  renderGrid();
}

function giveHint() {
  const gs = gameState;
  if (!gs || gs.isComplete) return;
  if (gs.hintsUsed >= MAX_HINTS) { showMascotMessage(t('mNoHints')); return; }
  // Prefer the selected cell if it still needs filling, else a random open cell.
  let idx = gs.selected;
  if (idx < 0 || gs.grid[idx] === gs.solution[idx]) {
    const open = [];
    gs.grid.forEach((v, i) => { if (v !== gs.solution[i]) open.push(i); });
    if (!open.length) return;
    idx = open[Math.floor(Math.random() * open.length)];
  }
  gs.grid[idx] = gs.solution[idx];
  gs.notes[idx].clear();
  gs.allPeers[idx].forEach(p => gs.notes[p].delete(gs.solution[idx]));
  gs.selected = idx;
  gs.hintsUsed++;
  updateStats();
  playHint();
  showMascotMessage(pick('mHint'));
  renderGrid();
  flashCell(idx, 'correct-flash');
  updateNumPadCompletion();
  checkWin();
}

// ============================================================
// VALIDATION – the board is solved when every cell matches the
// (guaranteed unique) solution.
// ============================================================
function checkWin() {
  const gs = gameState;
  if (gs.grid.every((v, i) => v === gs.solution[i])) {
    gs.isComplete = true;
    stopTimer();
    setTimeout(showWin, 450);
  }
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

function showWin() {
  const gs = gameState, lv = gs.lv;
  const stars = calcStars(gs.mistakes, gs.hintsUsed);
  const key = levelKey(lv.world, lv.indexInWorld);
  const prev = progress[key] || {};
  progress[key] = {
    stars: Math.max(stars, prev.stars || 0),
    time: prev.time ? Math.min(prev.time, gs.timerSecs) : gs.timerSecs,
  };
  saveProgress();

  document.getElementById('win-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
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
  document.getElementById('modal-' + name).classList.remove('hidden');
}
function hideModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }

function launchConfetti() {
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';
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
  document.querySelector('.display-toggle').style.display = gameState.type === 'shapes' ? 'none' : 'flex';
  document.getElementById('toggle-numbers').classList.toggle('active', settings.displayMode === 'numbers');
  document.getElementById('toggle-animals').classList.toggle('active', settings.displayMode === 'animals');
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
      if (!isWorldUnlocked(w)) { playError(); showMascotMessage(t('mLocked')); return; }
      playBloop();
      goToLevels(w);
    });
  });

  on('btn-worlds-settings', 'click', () => { playBloop(); goToSettings(); });
  on('btn-levels-back', 'click', () => { playBloop(); goToWorlds(); });
  on('btn-game-back', 'click', () => { playBloop(); goToLevels(gameState.lv.world); });
  on('btn-settings-back', 'click', () => { playBloop(); goToWorlds(); });

  on('btn-hint', 'click', giveHint);
  on('btn-notes', 'click', () => {
    gameState.isNotesMode = !gameState.isNotesMode;
    document.getElementById('btn-notes').classList.toggle('active-mode', gameState.isNotesMode);
    playBloop();
  });
  on('toggle-numbers', 'click', () => setDisplayMode('numbers'));
  on('toggle-animals', 'click', () => setDisplayMode('animals'));

  on('btn-win-next', 'click', () => { hideModals(); playBloop(); startLevel(gameState.lv.globalIndex + 1); });
  on('btn-win-replay', 'click', () => { hideModals(); playBloop(); startLevel(gameState.lv.globalIndex); });
  on('btn-win-home', 'click', () => { hideModals(); playBloop(); goToLevels(gameState.lv.world); });
  on('btn-go-replay', 'click', () => { hideModals(); playBloop(); startLevel(gameState.lv.globalIndex); });
  on('btn-go-home', 'click', () => { hideModals(); playBloop(); goToLevels(gameState.lv.world); });

  on('setting-sound', 'change', e => { settings.sound = e.target.checked; saveSettings(); playBloop(); });
  on('setting-language', 'change', e => { settings.language = e.target.value; saveSettings(); applyTranslations(); });
  on('setting-highlight-errors', 'change', e => { settings.highlightErrors = e.target.checked; saveSettings(); });

  on('btn-reset-progress', 'click', () => { playBloop(); showModal('confirm'); });
  on('btn-confirm-yes', 'click', () => {
    progress = {}; saveProgress(); hideModals(); playBloop();
    goToWorlds();
    setTimeout(() => showMascotMessage(t('mReset')), 600);
  });
  on('btn-confirm-no', 'click', () => { hideModals(); playBloop(); });

  document.addEventListener('keydown', onKeyDown);

  window.addEventListener('resize', debounce(() => {
    if (currentScreen === 'game' && gameState) { buildGrid(); renderGrid(); }
  }, 200));
}

function onKeyDown(e) {
  if (currentScreen !== 'game' || !gameState) return;
  const size = gameState.size;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= size) { onNumPress(n); return; }
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { onErase(); return; }
  if (e.key === 'n' || e.key === 'N') { document.getElementById('btn-notes').click(); return; }
  if (e.key === 'h' || e.key === 'H') { giveHint(); return; }

  const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  if (!moves[e.key]) return;
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
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
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
  setInterval(() => { if (currentScreen === 'worlds') showMascotMessage(pick('mIdle')); }, 9000);
}

document.addEventListener('DOMContentLoaded', init);
