/* ============================================================
   SUDOKU KIDS & CRAZY GRIDS – platform.js for CrazyGames
   Copied over platform.js by `node tools/build.mjs crazygames`, which also
   adds their SDK (v3) to index.html.

   Only the events CrazyGames asks for: loading and gameplay start/stop.
   NO advertising calls: nothing here requests an ad. Adding ads is a decision
   for Jenn (see docs/webportals.md).
   ============================================================ */
window.SudokuPlatform = (function () {
  'use strict';
  const sdk = () => window.CrazyGames && window.CrazyGames.SDK;
  let ready = false, playing = false, wanted = false, loaded = false;
  const call = fn => { try { fn(sdk().game); } catch (e) { /* SDK missing or disabled: the game keeps working */ } };
  function sync() {
    if (!ready) return;
    if (loaded) { loaded = false; call(game => game.loadingStop()); }
    if (wanted !== playing) { playing = wanted; call(game => (playing ? game.gameplayStart() : game.gameplayStop())); }
  }
  (async function () {
    try {
      await sdk().init();
      ready = sdk().environment !== 'disabled';     // on any other address every SDK call throws
      call(game => game.loadingStart());
      sync();
    } catch (e) { /* no SDK: play without it */ }
  })();
  return {
    target: 'crazygames',
    serviceWorker: false,
    links: false,             // no links that leave the portal
    fileExport: true,
    site: '',
    loaded() { loaded = true; sync(); },
    gameplayStart() { wanted = true; sync(); },
    gameplayStop() { wanted = false; sync(); },
  };
})();
