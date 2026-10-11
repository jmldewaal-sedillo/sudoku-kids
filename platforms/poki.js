/* ============================================================
   SUDOKU KIDS & CRAZY GRIDS – platform.js for Poki
   Copied over platform.js by `node tools/build.mjs poki`, which also adds
   the Poki SDK to index.html.

   Only the events Poki requires: loading finished and gameplay start/stop,
   never twice in a row. NO advertising calls: commercialBreak() and
   rewardedBreak() are not used anywhere. Adding them is a decision for Jenn
   (see docs/webportals.md).
   ============================================================ */
window.SudokuPlatform = (function () {
  'use strict';
  const sdk = () => window.PokiSDK;
  let ready = false, playing = false, wanted = false, loaded = false;
  const call = fn => { try { fn(sdk()); } catch (e) { /* SDK missing: the game keeps working */ } };
  function sync() {
    if (!ready) return;
    if (loaded) { loaded = false; call(poki => poki.gameLoadingFinished()); }
    if (wanted !== playing) { playing = wanted; call(poki => (playing ? poki.gameplayStart() : poki.gameplayStop())); }
  }
  const go = () => { ready = !!sdk(); sync(); };
  try { sdk().init().then(go, go); } catch (e) { /* no SDK: play without it */ }
  return {
    target: 'poki',
    serviceWorker: false,
    links: false,             // Poki wants no outgoing links
    fileExport: true,
    site: '',
    loaded() { loaded = true; sync(); },
    gameplayStart() { wanted = true; sync(); },
    gameplayStop() { wanted = false; sync(); },
  };
})();
