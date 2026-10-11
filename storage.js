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
   Parts of a profile: 'progress', 'settings', 'current', 'played'.
   ============================================================ */
(function (root) {
  'use strict';

  // Test copy: the app runs from a folder called "test" or ending in "-test"
  // (e.g. …/sudoku-kids-test/). It then uses its own storage, so testing can
  // never touch the stars of the live version.
  const IS_TEST = /(^|\/)(test|[^/]+-test)(\/|$)/.test(root.location ? root.location.pathname : '');
  const PREFIX = (IS_TEST ? 'test_' : '') + 'sudokuKids_';

  const PARTS = ['progress', 'settings', 'current', 'played'];
  const FIRST_ID = 'p1';
  const MAX_PROFILES = 6;
  // Avatars are icon names (icons.js). Profiles made when avatars were still
  // emoji are translated on load.
  const AVATARS = ['cat', 'dog', 'frog', 'bear', 'fox', 'koala', 'tiger', 'penguin', 'lion', 'rabbit', 'panda', 'monkey'];
  const OLD_AVATARS = { '🐱': 'cat', '🐶': 'dog', '🐸': 'frog', '🐻': 'bear', '🦊': 'fox', '🐨': 'koala', '🐯': 'tiger', '🐧': 'penguin', '🦁': 'lion', '🐰': 'rabbit', '🐼': 'panda', '🐵': 'monkey' };

  function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  // ---------- Local provider ----------
  // localStorage keys – never rename these, players would lose their stars.
  //   profile p1 (the first one, and everybody from before profiles existed):
  //       sudokuKids_progress, sudokuKids_settings, sudokuKids_current, sudokuKids_played
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
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SudokuStorage = api;
})(typeof window !== 'undefined' ? window : globalThis);
