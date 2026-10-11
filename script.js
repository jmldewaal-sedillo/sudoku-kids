/* ============================================================
   SUDOKU KIDS & CRAZY GRIDS – script.js
   Game UI. Puzzles come from puzzles.js, texts from i18n.js,
   pictures from icons.js, saved data from storage.js.
   ============================================================ */
'use strict';

const E = window.SudokuEngine;
const K = window.KawaiiIcons;
const Store = window.SudokuStorage;       // profiles + their data (see storage.js)
const IS_TEST = Store.IS_TEST;            // true on the test copy (…-test folder)
const TEST_BUILD = '';   // filled in by the test deploy (commit id), shown in the TEST label

const ANIMALS = ['dog', 'cat', 'frog', 'bear', 'fox', 'koala', 'tiger', 'penguin', 'lion'];
const FRUITS  = ['apple', 'banana', 'grapes', 'strawberry', 'orange', 'lemon', 'watermelon', 'peach', 'cherry'];
const MAX_MISTAKES = 3;       // 6×6 and 9×9: three hearts. 4×4 has no game over.
const MAX_HINTS = 3;
const ROOT_SCREENS = ['splash', 'worlds'];   // "back" leaves the app from here

// Worlds in the order they are shown (easy → hard). `id` is the number used in
// saved progress ('w<id>_l<index>') and never changes; `after` is the world
// that has to be played first.
const WORLDS = [
  { id: 0, icon: 'tree',     cls: 'world-forest', after: null },
  { id: 3, icon: 'barn',     cls: 'world-farm',   after: 0 },
  { id: 1, icon: 'lollipop', cls: 'world-candy',  after: 0 },
  { id: 4, icon: 'palm',     cls: 'world-jungle', after: 1 },
  { id: 2, icon: 'rocket',   cls: 'world-space',  after: 1 },
];
const UNLOCK_LEVELS = 17;     // levels to finish in the world before (was "half of 35")

// Parent lock: press and hold twice, each HOLD_MS, the second within HOLD_WINDOW_MS.
const HOLD_MS = 1500;
const HOLD_WINDOW_MS = 5000;

// ============================================================
// STATE
// ============================================================
const DEFAULT_SETTINGS = { sound: true, music: true, click: true, language: 'nl', highlightErrors: true, displayMode: 'numbers', size: 'normal' };
const SIZES = {               // "Grootte" in the settings: how much of the screen the grid may use
  small:  { factor: 0.78, cap: 440 },
  normal: { factor: 1,    cap: 720 },
  large:  { factor: 1,    cap: 1100 },
};
let profileId = 'p1';         // the profile that is playing
let settings = { ...DEFAULT_SETTINGS };
let progress = {};            // { 'w0_l0': { stars:3, time:45 }, ... }
let played = {};              // { '<band id>': ['L0', '4-standard#12', ...] }  puzzles this profile has had
let currentScreen = 'splash';
let currentWorld = 0;
let gameState = null;

const LEVELS = E.LEVEL_PLAN;  // all level definitions (world, size, type, …)
const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const $ = id => document.getElementById(id);

// ============================================================
// PICTURES
// ============================================================
function icon(name, cls = '') { return `<span class="ki ${cls}" aria-hidden="true">${K.svg(name)}</span>`; }
function applyIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = K.svg(el.dataset.icon); });
}
function starsHtml(n, max = 3) { return icon('star').repeat(n) + icon('star-empty').repeat(max - n); }
// A tiny drawing of a 4×4, 6×6 or 9×9 grid: tells the grid size without reading.
function gridPic(size) {
  const [br, bc] = E.boxDims(size);
  let thin = '', thick = '';
  for (let i = 1; i < size; i++) {
    if (i % bc === 0) thick += `M${i} 0V${size}`; else thin += `M${i} 0V${size}`;
    if (i % br === 0) thick += `M0 ${i}H${size}`; else thin += `M0 ${i}H${size}`;
  }
  return `<svg class="grid-pic" viewBox="-0.5 -0.5 ${size + 1} ${size + 1}" aria-hidden="true">` +
    `<rect x="0" y="0" width="${size}" height="${size}" rx="${size * 0.08}" fill="#fff" stroke="#3D2C6B" stroke-width="${size * 0.07}"/>` +
    `<path d="${thin}" stroke="#B9AED1" stroke-width="${size * 0.03}"/><path d="${thick}" stroke="#3D2C6B" stroke-width="${size * 0.06}"/></svg>`;
}

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
// PROFILE DATA (every profile has its own progress, settings, played
// puzzles and unfinished game – storage.js decides where they are kept)
// ============================================================
function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function saveProgress() { Store.write(profileId, 'progress', progress); }
function saveSettings() { Store.write(profileId, 'settings', settings); }
function savePlayed()   { Store.write(profileId, 'played', played); }

// Loads a profile. `inherit` = settings a brand-new profile starts with.
function loadProfile(id, inherit) {
  profileId = id;
  const savedProgress = Store.read(id, 'progress');
  progress = isPlainObject(savedProgress) ? savedProgress : {};
  const savedPlayed = Store.read(id, 'played');
  played = isPlainObject(savedPlayed) ? savedPlayed : {};
  const savedSettings = Store.read(id, 'settings');
  settings = { ...DEFAULT_SETTINGS, ...(inherit || {}), ...(isPlainObject(savedSettings) ? savedSettings : {}) };
  // First start: follow the language of the device.
  if (!inherit && (!isPlainObject(savedSettings) || !savedSettings.language)) {
    const device = String(navigator.language || 'nl').slice(0, 2).toLowerCase();
    settings.language = STRINGS[device] ? device : 'en';
  }
  if (!STRINGS[settings.language]) settings.language = 'nl';
  if (settings.displayMode !== 'animals') settings.displayMode = 'numbers';
  if (!SIZES[settings.size]) settings.size = 'normal';
  ['sound', 'music', 'click', 'highlightErrors'].forEach(k => { settings[k] = settings[k] !== false; });
  applySize();
  syncMusic();
}
function applySize() {
  document.body.classList.remove('ui-small', 'ui-normal', 'ui-large');
  document.body.classList.add('ui-' + settings.size);
}

function levelKey(w, i)     { return `w${w}_l${i}`; }
function getLevelStars(w, i) { return (progress[levelKey(w, i)] || {}).stars || 0; }
function worldLevels(w)     { return LEVELS.filter(l => l.world === w); }
function getTotalStars()    { return LEVELS.reduce((s, l) => s + getLevelStars(l.world, l.indexInWorld), 0); }
function getWorldStars(w)   { return worldLevels(w).reduce((s, l) => s + getLevelStars(w, l.indexInWorld), 0); }
function getWorldCompleted(w) { return worldLevels(w).filter(l => getLevelStars(w, l.indexInWorld) > 0).length; }
function isWorldUnlocked(w) {
  const world = WORLDS.find(x => x.id === w);
  return !world || world.after === null || getWorldCompleted(world.after) >= UNLOCK_LEVELS;
}
// A level is open if the one before it is finished, or if it is the first
// level of a new grid size (so a child that is stuck can always try the
// other size).
function isLevelUnlocked(w, i) {
  if (i === 0 || getLevelStars(w, i - 1) > 0) return true;
  const levels = worldLevels(w);
  return levels[i].size !== levels[i - 1].size;
}

// ============================================================
// AUDIO (Web Audio API – everything is generated, no files)
//   sound effects  settings.sound   right / wrong / hint / win
//   click          settings.click   a soft tick on every button
//   music          settings.music   a calm tune that loops
// ============================================================
let audioCtx = null;
function audio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch (e) { return null; }           // audio not available
}
function tone(dest, freq, type, start, duration, gain, glide = 1) {
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g); g.connect(dest);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glide !== 1) osc.frequency.exponentialRampToValueAtTime(freq * glide, start + duration * 0.6);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.start(start); osc.stop(start + duration + 0.02);
}
function playTone(freq, type = 'sine', duration = 0.12, gain = 0.25) {
  if (!settings.sound) return;
  const ctx = audio();
  if (ctx) tone(ctx.destination, freq, type, ctx.currentTime, duration, gain, 1.5);
}
const playPlace = () => playTone(620, 'sine', 0.12, 0.2);
const playError = () => playTone(200, 'triangle', 0.25, 0.2);
const playHint  = () => playTone(660, 'sine', 0.18, 0.22);
const playWin   = () => [523, 587, 659, 784, 880, 1047].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.16, 0.25), i * 70));
function playClick() {
  if (!settings.click) return;
  const ctx = audio();
  if (ctx) tone(ctx.destination, 880, 'triangle', ctx.currentTime, 0.045, 0.07);
}

// ---------- Music: a calm, happy 8-bar tune in C, made of soft sine notes ----------
const NOTE = { C3: 130.81, F3: 174.61, G3: 196, A3: 220, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25 };
const MUSIC_BEAT = 0.6;                  // seconds per beat (100 bpm)
const MUSIC_VOLUME = 0.05;               // soft: far below the sound effects
// One entry per beat: melody note (or null = rest) – 32 beats, then it starts again.
const MELODY = [
  'E4', 'G4', 'C5', 'G4',   'A4', 'G4', 'E4', null,   'D4', 'E4', 'G4', 'E4',   'D4', 'C4', null, null,
  'E4', 'G4', 'C5', 'D5',   'E5', 'D5', 'C5', null,   'A4', 'C5', 'G4', 'E4',   'D4', 'C4', null, null,
];
const BASS = ['C3', 'A3', 'G3', 'C3', 'C3', 'A3', 'F3', 'G3'];   // one per bar (4 beats)
const music = { on: false, started: false, step: 0, next: 0, timer: null, gain: null };
let userHasTapped = false;               // browsers only allow sound after the first tap

function scheduleMusic() {
  const ctx = audioCtx;
  while (music.next < ctx.currentTime + 0.5) {
    const note = MELODY[music.step];
    if (note) tone(music.gain, NOTE[note], 'sine', music.next, MUSIC_BEAT * 1.6, 0.9);
    if (music.step % 4 === 0) tone(music.gain, NOTE[BASS[music.step / 4]], 'triangle', music.next, MUSIC_BEAT * 3.8, 0.5);
    music.step = (music.step + 1) % MELODY.length;
    music.next += MUSIC_BEAT;
  }
}
// Starts or stops the music so that it matches the setting and the situation.
function syncMusic() {
  const want = settings.music && userHasTapped && !document.hidden;
  if (want === music.on) return;
  if (!want) {
    music.on = false;
    clearInterval(music.timer);
    if (music.gain) music.gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.08);   // fade out what is still sounding
    return;
  }
  const ctx = audio();
  if (!ctx) return;
  if (!music.gain) { music.gain = ctx.createGain(); music.gain.connect(ctx.destination); }
  music.gain.gain.cancelScheduledValues(ctx.currentTime);
  music.gain.gain.setTargetAtTime(MUSIC_VOLUME, ctx.currentTime, 0.2);
  music.next = ctx.currentTime + 0.1;    // continues at the note where it stopped
  music.on = true;
  music.started = true;
  scheduleMusic();
  music.timer = setInterval(scheduleMusic, 150);
}

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
// The bottom bar: talking cat on the left, the player's avatar on the right.
function updateBottomBar() {
  $('mascot').classList.toggle('hidden', !['worlds', 'levels'].includes(currentScreen));
  const me = Store.profile(profileId);
  $('btn-avatar').innerHTML = K.svg(me ? me.avatar : 'cat');
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
  $('screen-' + id).classList.add('active');
  currentScreen = id;
  document.querySelectorAll('.mascot-bubble').forEach(bubble => bubble.classList.remove('show'));   // no stale message on the next screen
  updateBottomBar();
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
  $('levels-world-title').textContent = t('world' + w);
  $('world-total-stars').textContent = getWorldStars(w);
  buildLevelsGrid(w);
}
function goToSettings() {
  showScreen('settings');
  syncSettingsUI();
}
function goToProfiles() {
  showScreen('profiles');
  buildProfiles();
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
    resetHold();
    hideModals();
    if (modal.id === 'modal-win' || modal.id === 'modal-gameover') goToLevels(gameState.lv.world);
    return true;
  }
  if (currentScreen === 'game') { leaveGame(); return true; }
  if (currentScreen === 'profile') { leaveProfilePage(); return true; }
  if (['levels', 'settings', 'profiles'].includes(currentScreen)) { goToWorlds(); return true; }
  return false;
}

// ============================================================
// WORLDS
// ============================================================
function sizesOf(w) {        // { 4: 50, 6: 50 } – how many levels per grid size
  const out = {};
  worldLevels(w).forEach(l => { out[l.size] = (out[l.size] || 0) + 1; });
  return out;
}
function buildWorlds() {
  const box = $('worlds-container');
  box.innerHTML = '';
  WORLDS.forEach(({ id, icon: pic, cls }) => {
    const sizes = sizesOf(id);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'world-card ' + cls;
    card.id = 'world-card-' + id;
    card.dataset.world = id;
    card.innerHTML =
      `<span class="world-emoji" aria-hidden="true">${K.svg(pic)}</span>` +
      '<span class="world-info">' +
        `<span class="world-name" data-i18n="world${id}"></span>` +
        '<span class="world-sizes">' + Object.keys(sizes).map(s =>
          `<span class="size-chip" data-size="${s}">${gridPic(+s)}<b>${sizes[s]}</b><span class="size-x">${s}×${s}</span></span>`).join('') + '</span>' +
        `<span class="progress-bar"><span class="progress-fill" id="world-${id}-progress"></span></span>` +
        `<span class="progress-text" id="world-${id}-text"></span>` +
      '</span>' +
      `<span class="world-stars" id="world-${id}-stars"></span>` +
      `<span class="world-lock" aria-hidden="true" id="world-${id}-lock">${K.svg('lock')}</span>`;
    card.addEventListener('click', () => {
      if (!isWorldUnlocked(id)) {
        playError();
        flash(card, 'shake');
        showMascotMessage(t('mLocked'));
        return;
      }
      goToLevels(id);
    });
    box.appendChild(card);
  });
}
function updateWorldsUI() {
  $('total-stars-display').textContent = getTotalStars();
  WORLDS.forEach(({ id }) => {
    const total = worldLevels(id).length;
    const done = getWorldCompleted(id);
    const locked = !isWorldUnlocked(id);
    const card = $(`world-card-${id}`);
    $(`world-${id}-progress`).style.width = Math.round(done / total * 100) + '%';
    $(`world-${id}-text`).textContent = `${done}/${total}`;
    $(`world-${id}-lock`).style.display = locked ? 'flex' : 'none';
    card.classList.toggle('locked', locked);
    card.setAttribute('aria-disabled', String(locked));
    const filled = Math.round(getWorldStars(id) / (total * 3) * 3);
    $(`world-${id}-stars`).innerHTML = starsHtml(filled);
    $(`world-${id}-stars`).dataset.stars = filled;
  });
}

// ============================================================
// LEVEL SELECT
// ============================================================
function buildLevelsGrid(w) {
  const grid = $('levels-grid');
  grid.innerHTML = '';
  let lastSize = 0;
  worldLevels(w).forEach(lv => {
    const i = lv.indexInWorld;
    if (lv.size !== lastSize) {                 // a new run of one grid size: show which
      lastSize = lv.size;
      const head = document.createElement('div');
      head.className = 'levels-section';
      head.innerHTML = `${gridPic(lv.size)}<span>${lv.size}×${lv.size}</span>`;
      grid.appendChild(head);
    }
    const stars = getLevelStars(w, i);
    const unlocked = isLevelUnlocked(w, i);
    const btn = document.createElement('button');
    btn.className = 'level-btn type-' + lv.type;
    btn.dataset.level = i;
    btn.setAttribute('aria-label', `${t('level')} ${i + 1}` + (stars ? `, ${stars}/3` : ''));

    if (!unlocked) {
      btn.classList.add('locked');
      btn.disabled = true;
      btn.innerHTML = `<span class="level-lock-icon">${K.svg('lock')}</span>`;
    } else {
      btn.classList.add(stars > 0 ? 'completed' : 'current');
      const mark = lv.type === 'shapes' ? K.svg('strawberry') : lv.type === 'xsudoku' ? '<b>X</b>' : '';
      btn.innerHTML = `<span class="level-type-mark">${mark}</span><span class="level-number">${i + 1}</span>` +
        `<span class="level-stars-small" data-stars="${stars}">${stars > 0 ? icon('star').repeat(stars) : ''}</span>`;
      btn.addEventListener('click', () => startLevel(lv.globalIndex));
    }
    grid.appendChild(btn);
  });
  // Scroll the next level to play into view (scroll the screen itself, never the page).
  const screen = $('screen-levels');
  const current = grid.querySelector('.level-btn.current');
  screen.scrollTop = current ? Math.max(0, current.offsetTop - screen.clientHeight / 2) : 0;
}

// ============================================================
// GAME – START
// ============================================================
function mistakeLimit(lv) { return lv.size === 4 ? Infinity : MAX_MISTAKES; }

// ---------- Which puzzle? ----------
// Every level has its own first puzzle (E.ownId). After that, each new start
// gives another puzzle from the level's difficulty band, one this profile has
// not had yet. Only when the band is used up do puzzles come back.
function puzzleById(pid, globalIndex) {
  return (pid && pid !== E.ownId(globalIndex) && E.getVariant(pid)) || E.getPuzzle(globalIndex);
}
function nextPuzzleId(globalIndex) {
  const lv = LEVELS[globalIndex];
  const band = E.levelBand(globalIndex);
  const own = E.ownId(globalIndex);
  if (!Array.isArray(played[band])) played[band] = [];
  const had = played[band];
  // Finished before profiles kept track of puzzles: the level's own puzzle has been played.
  if (getLevelStars(lv.world, lv.indexInWorld) > 0 && !had.includes(own)) had.push(own);
  let pid = own;
  if (had.includes(own)) {
    const pool = E.poolOf(band).map(p => p.id);
    let fresh = pool.filter(id => !had.includes(id));
    if (!fresh.length && pool.length) {            // band used up: start again, but not with the last one
      const last = had[had.length - 1];
      played[band] = had.filter(id => !pool.includes(id));
      fresh = pool.length > 1 ? pool.filter(id => id !== last) : pool;
    }
    if (fresh.length) pid = fresh[Math.floor(Math.random() * fresh.length)];
  }
  if (!played[band].includes(pid)) played[band].push(pid);
  savePlayed();
  return pid;
}

// `fresh` = start a new puzzle (replay button); otherwise an unfinished game
// of this level is continued where the player left it.
function startLevel(globalIndex, fresh) {
  const lv = LEVELS[globalIndex];
  const saved = fresh ? null : savedGameFor(globalIndex);
  const pid = saved ? saved.pid : nextPuzzleId(globalIndex);
  const puzzle = puzzleById(pid, globalIndex);
  const n = lv.size * lv.size;
  stopTimer();
  gameState = {
    lv, size: lv.size, type: lv.type, pid,
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
  if (saved) restoreCurrent(saved); else clearCurrent();

  showScreen('game');
  $('screen-game').className = `screen active size-${lv.size}`;
  $('game-level-label').textContent = `${t('level')} ${lv.indexInWorld + 1}`;
  $('game-type-badge').textContent =
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
  const lives = $('lives-display');
  delete lives.dataset.stars; delete lives.dataset.lives;
  if (gs.maxMistakes === Infinity) {
    // 4×4: no game over, the stars you will get are shown instead.
    const stars = calcStars(gs.mistakes, gs.hintsUsed);
    lives.innerHTML = starsHtml(stars);
    lives.dataset.stars = stars;
    lives.setAttribute('aria-label', `${stars}/3`);
  } else {
    const left = Math.max(0, gs.maxMistakes - gs.mistakes);
    lives.innerHTML = icon('heart').repeat(left) + icon('heart-empty').repeat(gs.maxMistakes - left);
    lives.dataset.lives = left;
    lives.setAttribute('aria-label', `${t('mistakes')}: ${gs.mistakes}/${gs.maxMistakes}`);
  }
  $('hint-count').textContent = MAX_HINTS - gs.hintsUsed;
  $('btn-hint').disabled = gs.hintsUsed >= MAX_HINTS;
}

// ---------- Unfinished game: saved after every move ----------
function saveCurrent() {
  const gs = gameState;
  if (!gs || gs.isComplete || !gs.dirty) return;
  Store.write(profileId, 'current', {
    i: gs.lv.globalIndex, pid: gs.pid, grid: gs.grid,
    notes: gs.notes.map(s => [...s]), tried: gs.tried.map(s => [...s]),
    mistakes: gs.mistakes, hintsUsed: gs.hintsUsed, secs: gs.timerSecs,
  });
}
function clearCurrent() { Store.remove(profileId, 'current'); }
// The saved unfinished game of this level, or null if there is none (or it is damaged).
function savedGameFor(globalIndex) {
  const lv = LEVELS[globalIndex], s = Store.read(profileId, 'current');
  if (!isPlainObject(s) || s.i !== globalIndex) return null;
  const pid = typeof s.pid === 'string' ? s.pid : E.ownId(globalIndex);   // saved before puzzle variants existed
  if (pid !== E.ownId(globalIndex) && !E.getVariant(pid)) return null;
  const given = puzzleById(pid, globalIndex).given;
  const n = given.length;
  const isList = a => Array.isArray(a) && a.length === n;
  const inRange = v => Number.isInteger(v) && v >= 0 && v <= lv.size;
  if (!isList(s.grid) || !isList(s.notes) || !isList(s.tried)) return null;
  if (!s.grid.every((v, i) => inRange(v) && (given[i] === 0 || v === given[i]))) return null;
  if (![...s.notes, ...s.tried].every(a => Array.isArray(a) && a.every(inRange))) return null;
  const mistakes = Number.isInteger(s.mistakes) && s.mistakes >= 0 ? s.mistakes : 0;
  if (mistakes >= mistakeLimit(lv)) return null;
  return { ...s, pid, mistakes };
}
function restoreCurrent(s) {
  const gs = gameState;
  gs.grid = s.grid.slice();
  gs.notes = s.notes.map(a => new Set(a));
  gs.tried = s.tried.map(a => new Set(a));
  gs.mistakes = s.mistakes;
  gs.hintsUsed = Math.min(MAX_HINTS, Math.max(0, s.hintsUsed | 0));
  gs.timerSecs = Math.max(0, s.secs | 0);
  gs.dirty = true;
}

// ============================================================
// GRID
// ============================================================
// How large one cell of a size×size grid is with the current layout and the
// "Grootte" setting. Also resets the grid box so the free space can be measured.
function measureCell(size) {
  const gridEl = $('sudoku-grid');
  const container = document.querySelector('.grid-container');
  gridEl.style.width = gridEl.style.height = '0px';
  container.style.width = '';
  const box = container.getBoundingClientRect();
  const pad = 2 * parseFloat(getComputedStyle(container).paddingLeft);
  let freeWidth = box.width;
  const sideBySide = window.matchMedia('(orientation: landscape)').matches;
  if (sideBySide) {
    // Side by side: the grid may use what the button column (min. 300 px) leaves over.
    const screen = $('screen-game');
    const cs = getComputedStyle(screen);
    freeWidth = screen.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 300 - 3 * (parseFloat(cs.columnGap) || 0);
  }
  const { factor, cap } = SIZES[settings.size] || SIZES.normal;
  const avail = Math.max(160, Math.min((freeWidth - pad) * factor, (box.height - pad) * factor, cap));
  return { cellSize: Math.floor(avail / size), pad, sideBySide, container, gridEl };
}
function cellFont(cellSize, size) { return Math.max(14, Math.floor(cellSize * (size === 9 ? 0.6 : 0.5))); }

function buildGrid() {
  const { size, type } = gameState;
  const { cellSize, pad, sideBySide, container, gridEl } = measureCell(size);
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
  gridEl.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
  gridEl.style.width = gridEl.style.height = (cellSize * size) + 'px';
  container.style.width = sideBySide ? (cellSize * size + pad) + 'px' : '';   // its column is exactly this wide
  gridEl.style.setProperty('--cell-font', cellFont(cellSize, size) + 'px');
  gridEl.style.setProperty('--cell-pic', Math.floor(cellSize * 0.74) + 'px');
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

// What a value looks like: a number, or a picture (fruit levels / animal mode). Returns HTML.
function symbolsInUse() {
  if (gameState.type === 'shapes') return FRUITS;
  return settings.displayMode === 'animals' ? ANIMALS : null;
}
function getDisplayValue(num) {
  if (!num) return '';
  const symbols = symbolsInUse();
  return symbols ? K.svg(symbols[num - 1]) : String(num);
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
  const cells = $('sudoku-grid').children;
  const pictures = !!symbolsInUse();

  // New player: point at a cell to tap, then at the number buttons.
  const guiding = gs.guide && !gs.isComplete;
  if (guiding && sel < 0 && (gs.guideCell === undefined || gs.grid[gs.guideCell] === gs.solution[gs.guideCell])) {
    gs.guideCell = Math.min(...E.findSingles(correctGrid(), gs.size, gs.type === 'xsudoku').keys());
  }
  const selOpen = sel >= 0 && gs.grid[sel] !== gs.solution[sel];
  $('numpad').classList.toggle('nudge-pad', guiding && selOpen);

  for (let idx = 0; idx < cells.length; idx++) {
    const cell = cells[idx];
    const val = gs.grid[idx];
    const isGiven = gs.given[idx] !== 0;
    const isWrong = !isGiven && val !== 0 && val !== gs.solution[idx];
    const nudge = guiding && sel < 0 && idx === gs.guideCell;
    let cls = gs.cellBase[idx];
    if (isGiven) cls += ' given';
    if (val !== gs.solution[idx]) cls += ' open';
    if (idx === sel) cls += ' selected';
    else if (selVal && val === selVal) cls += ' same-num';
    else if (related && related.has(idx)) cls += ' highlighted';
    if (isWrong && settings.highlightErrors) cls += ' error';
    if (nudge) cls += ' nudge';
    if (cell.className.replace(/ (shake|correct-flash)/g, '') !== cls) cell.className = cls;

    let html = '';
    if (val) {
      html = `<span class="cell-content${pictures ? ' pic' : ''}">${getDisplayValue(val)}</span>`;
    } else if (gs.notes[idx].size) {
      html = '<div class="cell-notes">';
      for (let n = 1; n <= gs.size; n++) html += `<span class="note-num">${gs.notes[idx].has(n) ? getDisplayValue(n) : ''}</span>`;
      html += '</div>';
    } else if (nudge) {
      html = `<span class="nudge-hand">${K.svg('hand')}</span>`;
    }
    if (cell._html !== html) { cell.innerHTML = html; cell._html = html; }

    const r = Math.floor(idx / gs.size) + 1, c = idx % gs.size + 1;
    const label = `${t('row')} ${r}, ${t('col')} ${c}: ${val || t('empty')}`;
    if (cell._label !== label) { cell.setAttribute('aria-label', label); cell._label = label; }
  }
}

function flashCell(idx, cls) { flash($('sudoku-grid').children[idx], cls); }

// ============================================================
// NUMPAD
// ============================================================
function buildNumPad() {
  const pad = $('numpad');
  pad.innerHTML = '';
  pad.style.setProperty('--pad-cols', gameState.size === 6 ? 4 : 5);
  for (let n = 1; n <= gameState.size; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.dataset.num = n;
    btn.innerHTML = getDisplayValue(n);
    btn.setAttribute('aria-label', String(n));
    btn.addEventListener('click', () => onNumPress(n));
    pad.appendChild(btn);
  }
  const eraseBtn = document.createElement('button');
  eraseBtn.className = 'num-btn erase-btn';
  eraseBtn.innerHTML = K.svg('eraser');
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
  gameState.selected = idx;
  renderGrid();
}

// Nothing useful is selected: show (without words) which cells can be tapped.
function pointAtOpenCells() {
  flash($('sudoku-grid'), 'wake', 900);
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
  renderGrid();
  saveCurrent();
}

function setNotesMode(on) {
  gameState.isNotesMode = on;
  const btn = $('btn-notes');
  btn.classList.toggle('active-mode', on);
  btn.setAttribute('aria-pressed', String(on));
  $('numpad').classList.toggle('notes-mode', on);
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
function updateTimerDisplay() { $('game-timer').textContent = formatTime(gameState.timerSecs); }

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
  $('win-stars').innerHTML = starsHtml(stars);
  $('win-stars').dataset.stars = stars;
  $('win-stars').setAttribute('aria-label', `${stars}/3`);
  $('win-time').textContent = formatTime(gs.timerSecs);
  $('win-mistakes').textContent = gs.mistakes;
  $('win-hints').textContent = gs.hintsUsed;
  $('win-title').textContent = pick('mWin');
  const isLast = lv.indexInWorld >= worldLevels(lv.world).length - 1;
  $('btn-win-next').style.display = isLast ? 'none' : '';

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
  const modal = $('modal-' + name);
  modal.classList.remove('hidden');
  document.querySelectorAll('.screen').forEach(s => { s.inert = true; });
  $('mascot').inert = true;
  const first = [...modal.querySelectorAll('button')].find(b => b.style.display !== 'none');
  if (first) first.focus({ preventScroll: true });
  armBackButton();
}
function hideModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.querySelectorAll('.screen').forEach(s => { s.inert = false; });
  $('mascot').inert = false;
}

function launchConfetti() {
  const container = $('confetti-container');
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
  const btn = $('btn-display');
  const other = settings.displayMode === 'numbers' ? 'animals' : 'numbers';
  btn.classList.toggle('hidden', gameState.type === 'shapes');
  btn.innerHTML = other === 'animals' ? K.svg('dog') : '123';
  btn.dataset.shows = other;
  btn.classList.toggle('as-text', other === 'numbers');
  btn.setAttribute('aria-label', t(other));
}
function setDisplayMode(mode) {
  settings.displayMode = mode;
  saveSettings();
  if (!gameState) return;
  updateDisplayToggle();
  buildNumPad();
  document.querySelectorAll('#sudoku-grid > *').forEach(c => { c._html = undefined; });
  renderGrid();
}

// ============================================================
// SETTINGS
// ============================================================
function syncSettingsUI() {
  $('setting-sound').checked = settings.sound;
  $('setting-music').checked = settings.music;
  $('setting-click').checked = settings.click;
  $('setting-language').value = settings.language;
  $('setting-highlight-errors').checked = settings.highlightErrors;
  document.querySelectorAll('.size-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.size === settings.size);
    b.setAttribute('aria-pressed', String(b.dataset.size === settings.size));
  });
  renderSizePreview();
}

// Real number tiles, exactly as large as a cell of a 4×4, 6×6 and 9×9 is in
// the game with the chosen size. The (hidden) game screen is laid out for
// each grid size to measure it.
function renderSizePreview() {
  const screen = $('screen-game');
  const pad = $('numpad');
  const keepClass = screen.className, keepPad = pad.innerHTML;
  const box = $('size-preview');
  box.innerHTML = '';
  [4, 6, 9].forEach(size => {
    screen.className = `screen size-${size}`;
    pad.style.setProperty('--pad-cols', size === 6 ? 4 : 5);
    pad.innerHTML = '<button class="num-btn">1</button>'.repeat(size + 1);
    const px = measureCell(size).cellSize;
    const item = document.createElement('div');
    item.className = 'size-sample';
    item.dataset.grid = size;
    item.dataset.px = px;
    item.innerHTML = `<div class="sample-cell" style="width:${px}px;height:${px}px;font-size:${cellFont(px, size)}px">${Math.min(size, 5)}</div>` +
                     `<div class="sample-label">${gridPic(size)}<span>${size}×${size}</span></div>`;
    box.appendChild(item);
  });
  screen.className = keepClass;
  pad.innerHTML = keepPad;
}

// ============================================================
// PARENT LOCK – press and hold the button twice in a row (2 × 1.5 s within
// 5 s). A ring shows the progress. Too fiddly for a young child, no reading
// or sums needed for the parent.
// ============================================================
const RING_LENGTH = 2 * Math.PI * 52;
let parentAction = null;
let holdTimer = null;       // runs while the button is held
let holdsDone = 0;          // 0, 1 (or 2 = open)
let holdWindow = null;      // time limit for the second hold

function setRing(part) {
  $('hold-progress').style.strokeDasharray = RING_LENGTH;
  $('hold-progress').style.strokeDashoffset = RING_LENGTH * (1 - part);
  $('hold-label').textContent = t(holdsDone === 1 ? 'parentAgain' : 'parentHold');
  $('btn-parent-hold').dataset.holds = holdsDone;
}
function resetHold() {
  clearInterval(holdTimer); holdTimer = null;
  clearTimeout(holdWindow); holdWindow = null;
  holdsDone = 0;
  setRing(0);
}
function askParent(action) {
  parentAction = action;
  resetHold();
  showModal('parent');
}
function startHold() {
  if (holdTimer) return;
  const t0 = performance.now();
  holdTimer = setInterval(() => {
    const part = Math.min(1, (performance.now() - t0) / HOLD_MS);
    setRing((holdsDone + part) / 2);
    if (part < 1) return;
    clearInterval(holdTimer); holdTimer = null;
    holdsDone++;
    if (holdsDone < 2) {                       // first hold done: now once more, in time
      setRing(0.5);
      playPlace();
      holdWindow = setTimeout(resetHold, HOLD_WINDOW_MS);
      return;
    }
    const action = parentAction;
    parentAction = null;
    resetHold();
    hideModals();
    playWin();
    if (action) action();
  }, 40);
}
function releaseHold() {
  if (!holdTimer) return;
  clearInterval(holdTimer); holdTimer = null;
  setRing(holdsDone / 2);                      // an unfinished hold does not count
}

// ============================================================
// PLAYERS (list) AND PROFILE PAGE
// ============================================================
let viewedProfile = null;      // id of the profile on the profile page, or 'new'
let profileFrom = 'worlds';    // where "back" on the profile page goes
let pickedAvatar = null;

function profileLabel(p) { return p.name || t('player'); }
function starsIn(prog) {
  return isPlainObject(prog) ? Object.values(prog).reduce((s, v) => s + ((v && v.stars) || 0), 0) : 0;
}

function buildProfiles() {
  const list = $('profiles-list');
  list.innerHTML = '';
  Store.profiles().forEach(p => {
    const stars = starsIn(Store.read(p.id, 'progress'));
    const row = document.createElement('button');
    row.className = 'profile-card' + (p.id === profileId ? ' active' : '');
    row.dataset.id = p.id;
    row.setAttribute('aria-label', `${profileLabel(p)}, ${stars}` + (p.id === profileId ? `, ${t('playingNow')}` : ''));
    row.innerHTML = `<span class="profile-avatar">${K.svg(p.avatar)}</span><span class="profile-name"></span>` +
      `<span class="profile-stars">${icon('star')}<b>${stars}</b></span>` + (p.id === profileId ? `<span class="profile-check">${K.svg('check')}</span>` : '');
    row.querySelector('.profile-name').textContent = profileLabel(p);      // textContent: a name can never become HTML
    row.addEventListener('click', () => openProfile(p.id, 'profiles'));
    list.appendChild(row);
  });
  $('btn-profile-add').classList.toggle('hidden', Store.profiles().length >= Store.MAX_PROFILES);
}

// Everything the profile page shows about one profile.
function profileStats(id) {
  const prog = Store.read(id, 'progress');
  const plays = Store.read(id, 'played');
  const entries = isPlainObject(prog) ? prog : {};
  const done = Object.values(entries).filter(v => v && v.stars > 0);
  const times = done.map(v => v.time).filter(v => Number.isFinite(v) && v > 0);
  const playedCount = isPlainObject(plays) ? Object.values(plays).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0) : 0;
  return {
    stars: starsIn(entries),
    levels: done.length,
    puzzles: Math.max(playedCount, done.length),      // finished before puzzles were counted: at least one each
    bestTime: times.length ? Math.min(...times) : null,
    worlds: WORLDS.map(({ id: w, icon: pic }) => {
      const levels = worldLevels(w);
      return { w, pic, max: levels.length * 3, stars: levels.reduce((s, l) => s + ((entries[levelKey(w, l.indexInWorld)] || {}).stars || 0), 0) };
    }),
  };
}

function openProfile(id, from) {
  viewedProfile = id;
  profileFrom = from || 'worlds';
  showScreen('profile');
  if (id === 'new') startProfileEdit(); else renderProfile();
}
function leaveProfilePage() {
  if (!$('profile-edit').classList.contains('hidden') && viewedProfile !== 'new') { renderProfile(); return; }   // leave edit mode first
  if (profileFrom === 'profiles') goToProfiles(); else goToWorlds();
}

function renderProfile() {
  const p = Store.profile(viewedProfile);
  if (!p) { goToProfiles(); return; }
  const s = profileStats(p.id);
  const active = p.id === profileId;
  $('profile-view').classList.remove('hidden');
  $('profile-edit').classList.add('hidden');
  $('profile-avatar').innerHTML = K.svg(p.avatar);
  $('profile-name-text').textContent = profileLabel(p);
  const playAs = $('btn-play-as');
  playAs.innerHTML = active ? `${icon('check')}<span></span>` : `${icon('play')}<span></span>`;
  playAs.lastChild.textContent = active ? t('playingNow') : t('playAs').replace('{name}', profileLabel(p));
  playAs.classList.toggle('is-active', active);

  const stat = (pic, label, value, key) =>
    `<div class="stat-card" data-stat="${key}">${icon(pic)}<b>${value}</b><span>${label}</span></div>`;
  $('profile-stats').innerHTML =
    stat('star', t('statStars'), s.stars, 'stars') + stat('check', t('statLevels'), s.levels, 'levels') +
    stat('puzzle', t('statPuzzles'), s.puzzles, 'puzzles') + stat('clock', t('statBestTime'), s.bestTime === null ? '–' : formatTime(s.bestTime), 'time');

  $('profile-worlds').innerHTML = s.worlds.map(x =>
    `<div class="pw-row" data-world="${x.w}"><span class="pw-icon">${K.svg(x.pic)}</span>` +
    `<span class="pw-main"><span class="pw-name"></span><span class="progress-bar"><span class="progress-fill" style="width:${Math.round(x.stars / x.max * 100)}%"></span></span></span>` +
    `<span class="pw-stars">${icon('star')}<b>${x.stars}</b></span></div>`).join('');
  $('profile-worlds').querySelectorAll('.pw-row').forEach(row => { row.querySelector('.pw-name').textContent = t('world' + row.dataset.world); });

  const badges = [['medal', 'badgeFirst', s.levels >= 1], ['trophy', 'badge10', s.levels >= 10], ['crown', 'badge50', s.levels >= 50], ['star', 'badge100', s.stars >= 100]];
  $('profile-badges').innerHTML = badges.map(([pic, key, got]) =>
    `<div class="badge${got ? ' earned' : ''}" data-badge="${key}">${icon(pic)}<span>${t(key)}</span></div>`).join('');
}

function startProfileEdit() {
  const isNew = viewedProfile === 'new';
  const p = isNew ? null : Store.profile(viewedProfile);
  const used = Store.profiles().map(q => q.avatar);
  pickedAvatar = p ? p.avatar : (Store.AVATARS.find(a => !used.includes(a)) || Store.AVATARS[0]);
  $('profile-view').classList.add('hidden');
  $('profile-edit').classList.remove('hidden');
  $('profile-edit-title').textContent = t(isNew ? 'newProfile' : 'editProfile');
  $('profile-name').value = p ? p.name : '';
  $('profile-name').placeholder = t('namePlaceholder');
  $('btn-profile-delete').classList.toggle('hidden', isNew || Store.profiles().length <= 1);
  const grid = $('avatar-grid');
  grid.innerHTML = '';
  Store.AVATARS.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'avatar-btn' + (a === pickedAvatar ? ' active' : '');
    b.dataset.avatar = a;
    b.innerHTML = K.svg(a);
    b.setAttribute('aria-label', a);
    b.setAttribute('aria-pressed', String(a === pickedAvatar));
    b.addEventListener('click', () => {
      pickedAvatar = a;
      grid.querySelectorAll('.avatar-btn').forEach(x => {
        x.classList.toggle('active', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
    });
    grid.appendChild(b);
  });
}

function saveProfileEdit() {
  const name = $('profile-name').value.trim().slice(0, 12);
  if (viewedProfile === 'new') {
    // A new profile starts with the language, sounds and size of whoever made it.
    const p = Store.createProfile(name, pickedAvatar);
    if (!p) { goToProfiles(); return; }
    const inherit = { language: settings.language, sound: settings.sound, music: settings.music, click: settings.click, size: settings.size };
    gameState = null;
    loadProfile(p.id, inherit);
    saveSettings();
    Store.setActive(p.id);
    applyTranslations();
    viewedProfile = p.id;
  } else {
    Store.updateProfile(viewedProfile, { name, avatar: pickedAvatar });
  }
  updateBottomBar();
  renderProfile();
}
function cancelProfileEdit() {
  if (viewedProfile === 'new') goToProfiles(); else renderProfile();
}

function switchProfile(id) {
  if (id !== profileId) {
    gameState = null;
    loadProfile(id);
    applyTranslations();
    buildWorlds();
    applyTranslations();
    Store.setActive(id);
  }
  goToWorlds();
}

function deleteViewedProfile() {
  const id = viewedProfile;
  if (!Store.deleteProfile(id)) return;
  if (id === profileId) {
    gameState = null;
    loadProfile(Store.activeId());
    applyTranslations();
  }
  goToProfiles();
}

function linkAccount() {
  // No cloud provider yet (see docs/account-koppelen.md): only tell it is coming.
  $('info-title').textContent = t('linkAccount');
  $('info-text').textContent = t('linkSoon');
  showModal('info');
}

// ============================================================
// EVENTS
// ============================================================
function on(id, ev, fn) { $(id).addEventListener(ev, fn); }

function initEventListeners() {
  // The soft click on every button (the "Klikgeluid" setting).
  document.addEventListener('click', e => {
    if (e.target.closest('button, select, a, label.settings-row, .sudoku-cell')) playClick();
  }, true);
  // Music may only start after the first tap or key (browser rule).
  const firstTap = () => { userHasTapped = true; syncMusic(); };
  document.addEventListener('pointerdown', firstTap, { once: true, capture: true });
  document.addEventListener('keydown', firstTap, { once: true, capture: true });

  on('btn-start', 'click', goToWorlds);
  on('btn-worlds-settings', 'click', goToSettings);
  on('btn-score', 'click', () => openProfile(profileId, 'worlds'));
  on('btn-levels-back', 'click', goToWorlds);
  on('btn-game-back', 'click', leaveGame);
  on('btn-settings-back', 'click', goToWorlds);

  on('btn-hint', 'click', giveHint);
  on('btn-notes', 'click', () => setNotesMode(!gameState.isNotesMode));
  on('btn-display', 'click', () => setDisplayMode(settings.displayMode === 'numbers' ? 'animals' : 'numbers'));

  on('btn-win-next', 'click', () => { hideModals(); startLevel(gameState.lv.globalIndex + 1); });
  on('btn-win-replay', 'click', () => { hideModals(); startLevel(gameState.lv.globalIndex, true); });
  on('btn-win-home', 'click', () => { hideModals(); goToLevels(gameState.lv.world); });
  on('btn-go-replay', 'click', () => { hideModals(); startLevel(gameState.lv.globalIndex, true); });
  on('btn-go-home', 'click', () => { hideModals(); goToLevels(gameState.lv.world); });

  on('setting-sound', 'change', e => { settings.sound = e.target.checked; saveSettings(); playPlace(); });
  on('setting-music', 'change', e => { settings.music = e.target.checked; saveSettings(); syncMusic(); });
  on('setting-click', 'change', e => { settings.click = e.target.checked; saveSettings(); playClick(); });
  on('setting-language', 'change', e => { settings.language = e.target.value; saveSettings(); applyTranslations(); });
  on('setting-highlight-errors', 'change', e => { settings.highlightErrors = e.target.checked; saveSettings(); });
  document.querySelectorAll('.size-btn').forEach(b => b.addEventListener('click', () => {
    settings.size = b.dataset.size;
    saveSettings(); applySize(); syncSettingsUI();
  }));

  // Bottom bar: the avatar opens the player's own page, the small button the list of players.
  on('btn-avatar', 'click', () => openProfile(profileId, 'worlds'));
  on('btn-switch', 'click', goToProfiles);

  // Players and profile page
  on('btn-profiles-back', 'click', goToWorlds);
  on('btn-profile-add', 'click', () => openProfile('new', 'profiles'));
  on('btn-profile-back', 'click', leaveProfilePage);
  on('btn-profile-edit', 'click', startProfileEdit);
  on('btn-profile-save', 'click', saveProfileEdit);
  on('btn-profile-cancel', 'click', cancelProfileEdit);
  on('btn-play-as', 'click', () => switchProfile(viewedProfile));
  on('btn-profile-delete', 'click', () => {
    askParent(() => {
      const p = Store.profile(viewedProfile);
      $('delete-avatar').innerHTML = K.svg(p.avatar);
      $('delete-text').textContent = `${profileLabel(p)}\n${t('deleteText')}`;
      showModal('delete');
    });
  });
  on('btn-delete-yes', 'click', () => { hideModals(); deleteViewedProfile(); });
  on('btn-delete-no', 'click', hideModals);
  on('btn-link-account', 'click', () => askParent(linkAccount));
  on('btn-info-ok', 'click', hideModals);

  // Parent lock: no context menu, no text selection, no scrolling while holding.
  const hold = $('btn-parent-hold');
  hold.addEventListener('pointerdown', e => { e.preventDefault(); startHold(); });
  hold.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHold(); } });
  ['pointerup', 'pointerleave', 'pointercancel', 'keyup', 'blur'].forEach(ev => hold.addEventListener(ev, releaseHold));
  ['contextmenu', 'selectstart', 'dragstart'].forEach(ev => hold.addEventListener(ev, e => e.preventDefault()));
  on('btn-parent-cancel', 'click', () => { parentAction = null; resetHold(); hideModals(); });

  on('btn-reset-progress', 'click', () => askParent(() => showModal('confirm')));
  on('btn-confirm-yes', 'click', () => {
    progress = {}; saveProgress(); played = {}; savePlayed(); clearCurrent(); hideModals();
    goToWorlds();
    setTimeout(() => showMascotMessage(t('mReset')), 600);
  });
  on('btn-confirm-no', 'click', hideModals);

  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('popstate', () => {
    backArmed = false;
    goBack();
    armBackButton();
  });

  // Keep the unfinished game (and its timer) when the app goes to the background,
  // and pause the music there.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentScreen === 'game') saveCurrent();
    syncMusic();
  });
  window.addEventListener('pagehide', () => { if (currentScreen === 'game') saveCurrent(); });

  // The grid follows the window right away (once per frame, no waiting).
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      relayoutGame();
      if (currentScreen === 'settings') renderSizePreview();
    });
  });
}

function relayoutGame() {
  if (currentScreen !== 'game' || !gameState) return;
  buildGrid();
  renderGrid();
}

function onKeyDown(e) {
  if (e.key === 'Escape') { if (goBack()) e.preventDefault(); return; }
  if (currentScreen !== 'game' || !gameState || document.querySelector('.modal:not(.hidden)')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const size = gameState.size;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= size) { onNumPress(n); return; }
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { onErase(); return; }
  if (e.key === 'n' || e.key === 'N') { $('btn-notes').click(); return; }
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
// TEST COPY ONLY (see storage.js: IS_TEST) – a visible TEST strip, and on a
// pc a bar with phone/tablet sizes (test-preview.js). Never on the live app.
// ============================================================
function showTestLabel() {
  // Its own strip above the app, so it never lies over a title or level name.
  const badge = document.createElement('div');
  badge.className = 'test-badge';
  badge.textContent = TEST_BUILD ? 'TEST ' + TEST_BUILD : 'TEST';
  document.body.appendChild(badge);
  document.body.classList.add('is-test');
  document.title = 'TEST · ' + document.title;
}
// Should this page be the outer page that shows the app in a frame of a chosen size?
function wantsTestPreview() {
  if (!IS_TEST) return false;
  let framed = true;
  try { framed = window.self !== window.top; } catch (e) { /* cross-origin parent: framed */ }
  const params = new URLSearchParams(location.search);
  if (framed || params.has('frame')) return false;            // we are the app inside the frame
  if (params.get('preview') === 'off') return false;
  if (params.get('preview') === 'on') return true;
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  return !isTouch && !navigator.webdriver;                      // real phones and automated tests: no bar
}

// ============================================================
// INIT
// ============================================================
function init() {
  if (wantsTestPreview()) {
    // Outer page: only the size bar. The game itself runs inside the frame.
    registerSW();
    const s = document.createElement('script');
    s.src = 'test-preview.js';
    document.head.appendChild(s);
    return;
  }
  if (IS_TEST) showTestLabel();
  applyIcons();
  $('setting-language').innerHTML = LANGUAGES.map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
  buildWorlds();
  loadProfile(Store.activeId());
  applyTranslations();
  initEventListeners();
  registerSW();
  showScreen('splash');
  setInterval(() => {
    if (currentScreen === 'worlds' && !document.hidden) showMascotMessage(pick('mIdle'));
  }, 9000);
}

document.addEventListener('DOMContentLoaded', init);
