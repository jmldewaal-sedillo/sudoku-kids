/* ============================================================
   SUDOKU KIDS & CRAZY GRIDS – platform.js for the Android app (Capacitor)
   Copied over platform.js by `node tools/build.mjs android`.

   - All files are inside the app: no service worker.
   - The back button of Android goes one step back in the game; on the start
     screens it puts the app in the background.
   - Saved data lives in localStorage of the app's WebView, under the same
     sudokuKids_ keys as everywhere else. Capacitor advises not to rely on
     that alone, so every write is also copied to the native Preferences
     store. If the WebView storage is ever empty while that copy exists, the
     copy is put back before the game starts.
   ============================================================ */
window.SudokuPlatform = (function () {
  'use strict';
  const KEY = 'sudokuKids_';
  const plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
  const App = plugins.App, Prefs = plugins.Preferences;
  const quiet = promise => { if (promise && promise.catch) promise.catch(() => {}); };

  // ---------- Android back button ----------
  if (App && App.addListener) {
    App.addListener('backButton', () => {
      const deeper = !!document.querySelector('.modal:not(.hidden)') || !document.querySelector('#screen-splash.active, #screen-worlds.active');
      if (deeper) history.back();           // script.js listens to popstate: one step back
      else quiet(App.minimizeApp());
    });
  }

  // ---------- second copy of the saved data ----------
  const rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;
  const ownKeys = () => Object.keys(localStorage).filter(k => k.startsWith(KEY));
  let mirroring = false;
  function copyAll() { ownKeys().forEach(k => quiet(Prefs.set({ key: k, value: localStorage.getItem(k) }))); }
  if (Prefs) {
    Storage.prototype.setItem = function (k, v) {
      rawSet.call(this, k, v);
      if (mirroring && this === localStorage && String(k).startsWith(KEY)) quiet(Prefs.set({ key: k, value: String(v) }));
    };
    Storage.prototype.removeItem = function (k) {
      rawRemove.call(this, k);
      if (mirroring && this === localStorage && String(k).startsWith(KEY)) quiet(Prefs.remove({ key: k }));
    };
    if (ownKeys().length) {
      mirroring = true;                     // the normal case
    } else {
      // Empty WebView storage: a first start, or the storage was cleared by the system.
      // Nothing is copied until we know which of the two it is, so a fresh start can
      // never overwrite the second copy.
      Prefs.keys().then(async ({ keys }) => {
        const saved = (keys || []).filter(k => k.startsWith(KEY));
        if (!saved.length) { mirroring = true; copyAll(); return; }
        ownKeys().forEach(k => rawRemove.call(localStorage, k));    // defaults written while we were looking
        for (const k of saved) {
          const { value } = await Prefs.get({ key: k });
          if (value != null) rawSet.call(localStorage, k, value);
        }
        location.reload();                  // start again, now with the saved data
      }).catch(() => { mirroring = true; });
    }
  }

  return {
    target: 'android',
    serviceWorker: false,
    links: true,
    fileExport: false,        // a WebView does not download; copying the code works
    site: 'https://studiosedillo.com/sudoku-kids/',
    loaded() {},
    gameplayStart() {},
    gameplayStop() {},
  };
})();
