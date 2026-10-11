/* ============================================================
   SUDOKU KIDS & CRAZY GRIDS – storage.js
   Where profiles and their data are kept.

   The game only talks to SudokuStorage. Behind it sits a "provider":
     - LocalProvider (now): everything stays on this device, in localStorage.
     - a cloud provider (later, see docs/account-koppelen.md): the same
       methods, so linking an account can be added without touching the game.

   A provider has these methods (all synchronous; a cloud provider keeps a
   local copy and syncs in the background):
       readIndex()                    -> { active, next, list } or null
       writeIndex(index)
       read(profileId, part)          -> value or null
       write(profileId, part, value)
       remove(profileId, part)
   Parts of a profile: 'progress', 'settings', 'current', 'played',
   'stats' (counters for badges), 'history' (last 500 puzzles), 'inbox' (notifications).
   ============================================================ */
(function (root) {
  'use strict';

  // Test copy: the app runs on a host that starts with "test-" or "test."
  // (test-sudokukids.studiosedillo.com) or from a folder called "test" or
  // ending in "-test" (…/sudoku-kids-test/). It then uses its own storage, so
  // testing can never touch the stars of the live version.
  const loc = root.location || { pathname: '', hostname: '' };
  const IS_TEST = /^test[-.]/.test(loc.hostname || '') || /(^|\/)(test|[^/]+-test)(\/|$)/.test(loc.pathname || '');
  const PREFIX = (IS_TEST ? 'test_' : '') + 'sudokuKids_';

  const PARTS = ['progress', 'settings', 'current', 'played', 'stats', 'history', 'inbox'];
  const FIRST_ID = 'p1';
  const MAX_PROFILES = 6;
  // Avatars are icon names (icons.js). Profiles made when avatars were still
  // emoji are translated on load.
  const AVATARS = ['cat', 'dog', 'frog', 'bear', 'fox', 'koala', 'tiger', 'penguin', 'lion', 'rabbit', 'panda', 'monkey'];
  const OLD_AVATARS = {     // written as code points, so no emoji is left in the source
    '\u{1F431}': 'cat', '\u{1F436}': 'dog', '\u{1F438}': 'frog', '\u{1F43B}': 'bear', '\u{1F98A}': 'fox', '\u{1F428}': 'koala',
    '\u{1F42F}': 'tiger', '\u{1F427}': 'penguin', '\u{1F981}': 'lion', '\u{1F430}': 'rabbit', '\u{1F43C}': 'panda', '\u{1F435}': 'monkey',
  };

  function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  // ---------- Local provider ----------
  // localStorage keys – never rename these, players would lose their stars.
  //   profile p1 (the first one, and everybody from before profiles existed):
  //       sudokuKids_progress, sudokuKids_settings, sudokuKids_current, sudokuKids_played,
  //       sudokuKids_stats, sudokuKids_history, sudokuKids_inbox
  //   every other profile:
  //       sudokuKids_<id>_progress, …
  //   list of profiles: sudokuKids_profiles
  const LocalProvider = {
    name: 'local',
    key(profileId, part) { return PREFIX + (profileId === FIRST_ID ? '' : profileId + '_') + part; },
    get(key) {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
      catch (e) { return null; }           // private mode / blocked storage / broken data
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ } },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } },
    readIndex() { return this.get(PREFIX + 'profiles'); },
    writeIndex(index) { this.set(PREFIX + 'profiles', index); },
    read(profileId, part) { return this.get(this.key(profileId, part)); },
    write(profileId, part, value) { this.set(this.key(profileId, part), value); },
    remove(profileId, part) { this.del(this.key(profileId, part)); },
  };

  let provider = LocalProvider;
  let index = null;

  // The list of profiles. Without a list there is exactly one profile: p1,
  // which owns the progress that was saved before profiles existed.
  function loadIndex() {
    const saved = provider.readIndex();
    const list = isPlainObject(saved) && Array.isArray(saved.list)
      ? saved.list.filter(p => isPlainObject(p) && typeof p.id === 'string' && /^p\d+$/.test(p.id)).slice(0, MAX_PROFILES)
      : [];
    list.forEach(p => {
      p.name = typeof p.name === 'string' ? p.name.slice(0, 12) : '';
      if (OLD_AVATARS[p.avatar]) p.avatar = OLD_AVATARS[p.avatar];
      if (!AVATARS.includes(p.avatar)) p.avatar = AVATARS[0];
      if (!isPlainObject(p.account)) p.account = null;      // filled in when a parent links an account
    });
    if (!list.length) list.push({ id: FIRST_ID, name: '', avatar: AVATARS[0], account: null });
    const highest = Math.max(...list.map(p => +p.id.slice(1)));
    index = {
      v: 1,
      active: list.some(p => p.id === saved?.active) ? saved.active : list[0].id,
      next: Math.max(Number.isInteger(saved?.next) ? saved.next : 2, highest + 1),
      list,
    };
    return index;
  }
  function saveIndex() { provider.writeIndex(index); }

  const api = {
    IS_TEST, PREFIX, MAX_PROFILES, AVATARS,
    get providerName() { return provider.name; },
    // Swap the place where data lives (used later for a cloud provider).
    setProvider(p) { provider = p; index = null; },

    profiles() { return (index || loadIndex()).list; },
    activeId() { return (index || loadIndex()).active; },
    profile(id) { return this.profiles().find(p => p.id === id) || null; },
    setActive(id) { if (this.profile(id)) { index.active = id; saveIndex(); } },

    createProfile(name, avatar) {
      if (this.profiles().length >= MAX_PROFILES) return null;
      const p = { id: 'p' + index.next++, name: String(name || '').slice(0, 12), avatar: AVATARS.includes(avatar) ? avatar : AVATARS[0], account: null };
      index.list.push(p);
      saveIndex();
      return p;
    },
    updateProfile(id, changes) {
      const p = this.profile(id);
      if (!p) return;
      if (typeof changes.name === 'string') p.name = changes.name.slice(0, 12);
      if (AVATARS.includes(changes.avatar)) p.avatar = changes.avatar;
      saveIndex();
    },
    // Removes a profile and everything it saved. The last profile cannot be removed.
    deleteProfile(id) {
      if (this.profiles().length <= 1 || !this.profile(id)) return false;
      PARTS.forEach(part => provider.remove(id, part));
      index.list = index.list.filter(p => p.id !== id);
      if (index.active === id) index.active = index.list[0].id;
      saveIndex();
      return true;
    },

    read(id, part) { return provider.read(id, part); },
    write(id, part, value) { provider.write(id, part, value); },
    remove(id, part) { provider.remove(id, part); },

    // Linking an account (for parents): not available until a cloud provider exists.
    canLinkAccount() { return typeof provider.linkAccount === 'function'; },

    // ---------- moving progress to another device or address ----------
    // Everything of every profile as one text ("code"). Nothing is sent
    // anywhere: the parent copies the code or saves it as a file.
    exportCode() {
      const data = {
        app: 'sudoku-kids', v: 1, when: Date.now(),
        profiles: this.profiles().map(p => {
          const parts = {};
          TRANSFER_PARTS.forEach(part => { const v = provider.read(p.id, part); if (v !== null) parts[part] = v; });
          return { name: p.name, avatar: p.avatar, parts };
        }),
      };
      return CODE_PREFIX + toBase64(JSON.stringify(data));
    },
    // Reads a code. Returns the checked data, or null if it is not a valid code.
    readCode(code) {
      try {
        const text = String(code || '').trim().replace(/\s+/g, '');
        if (!text.startsWith(CODE_PREFIX) || text.length > 2000000) return null;
        const data = JSON.parse(fromBase64(text.slice(CODE_PREFIX.length)));
        if (!isPlainObject(data) || data.app !== 'sudoku-kids' || !Array.isArray(data.profiles) || !data.profiles.length) return null;
        const profiles = data.profiles.slice(0, MAX_PROFILES).filter(isPlainObject).map(cleanProfile);
        return profiles.length ? { profiles } : null;
      } catch (e) { return null; }
    },
    // Adds the profiles of a code. Nothing that exists is overwritten: an
    // untouched first profile is filled, every other profile is added.
    // Returns how many were added, or -1 if there is no room for all of them.
    importCode(code) {
      const data = this.readCode(code);
      if (!data) return 0;
      const list = this.profiles();
      const fillFirst = list.length === 1 && !list[0].name && PARTS.every(part => {
        const v = provider.read(list[0].id, part);
        return v === null || part === 'settings' || part === 'inbox' || part === 'stats' || (isPlainObject(v) && !Object.keys(v).length) || (Array.isArray(v) && !v.length);
      });
      if (list.length - (fillFirst ? 1 : 0) + data.profiles.length > MAX_PROFILES) return -1;
      data.profiles.forEach((p, n) => {
        let target;
        if (fillFirst && n === 0) { target = list[0]; this.updateProfile(target.id, { name: p.name, avatar: p.avatar }); PARTS.forEach(part => provider.remove(target.id, part)); }
        else target = this.createProfile(p.name, p.avatar);
        Object.keys(p.parts).forEach(part => provider.write(target.id, part, p.parts[part]));
      });
      return data.profiles.length;
    },

    // ---------- deleting everything ----------
    // Every key this app has written on this device (all profiles, the list of
    // profiles, and – on the test copy – the chosen preview size).
    keys() {
      const out = [];
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) out.push(k); } } catch (e) { /* ignore */ }
      return out.sort();
    },
    wipeAll() {
      this.keys().forEach(k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } });
      index = null;
    },
  };

  // What goes into a transfer code: everything except the unfinished game and the notifications.
  const TRANSFER_PARTS = ['progress', 'settings', 'played', 'stats', 'history'];
  const CODE_PREFIX = 'SK1.';
  function toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromBase64(text) {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  // Only keeps what the app itself could have written (a code can come from anywhere).
  function cleanProfile(p) {
    const parts = isPlainObject(p.parts) ? p.parts : {};
    const out = {};
    const whole = v => Number.isInteger(v) && v >= 0;
    if (isPlainObject(parts.progress)) {
      out.progress = {};
      Object.keys(parts.progress).slice(0, 5000).forEach(k => {
        const e = parts.progress[k];
        if (/^w\d{1,2}_l\d{1,4}$/.test(k) && isPlainObject(e) && [1, 2, 3].includes(e.stars)) out.progress[k] = { stars: e.stars, time: whole(e.time) ? e.time : 0 };
      });
    }
    if (isPlainObject(parts.settings)) {
      out.settings = {};
      ['sound', 'music', 'click', 'highlightErrors'].forEach(k => { if (typeof parts.settings[k] === 'boolean') out.settings[k] = parts.settings[k]; });
      ['language', 'displayMode', 'size'].forEach(k => { if (typeof parts.settings[k] === 'string' && /^[a-z]{2,10}$/.test(parts.settings[k])) out.settings[k] = parts.settings[k]; });
    }
    if (isPlainObject(parts.played)) {
      out.played = {};
      Object.keys(parts.played).slice(0, 200).forEach(k => {
        if (Array.isArray(parts.played[k])) out.played[k.slice(0, 40)] = parts.played[k].filter(x => typeof x === 'string' && x.length < 40).slice(0, 2000);
      });
    }
    if (isPlainObject(parts.stats) && JSON.stringify(parts.stats).length < 50000) out.stats = parts.stats;
    if (Array.isArray(parts.history)) {
      out.history = parts.history.filter(e => Array.isArray(e) && e.length === 6 && e.every(v => Number.isInteger(v))).slice(-500);
    }
    return { name: typeof p.name === 'string' ? p.name.slice(0, 12) : '', avatar: OLD_AVATARS[p.avatar] || (AVATARS.includes(p.avatar) ? p.avatar : AVATARS[0]), parts: out };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SudokuStorage = api;
})(typeof window !== 'undefined' ? window : globalThis);
