/* ============================================================
   SUDOKU KIDS & CRAZY GRIDS – platform.js
   Where this copy of the game runs. One codebase, several build targets:

     web          this file as it stands (the test copy on github.io)
     app          platforms/app.js         – the app for Google Play and the App Store (Capacitor)
     crazygames   platforms/crazygames.js  – upload for the CrazyGames portal
     poki         platforms/poki.js        – upload for the Poki portal

   tools/build.mjs copies one of those over this file. The game only talks to
   window.SudokuPlatform, so script.js is the same everywhere.
   ============================================================ */
window.SudokuPlatform = {
  target: 'web',
  serviceWorker: true,      // offline through sw.js (only the web version needs that)
  links: true,              // links to the privacy and delete pages on studiosedillo.com
  fileExport: true,         // "save as file" in Move progress (needs a browser that downloads)
  site: 'https://studiosedillo.com/sudoku-kids/',
  loaded() {},              // the game is ready to play
  gameplayStart() {},       // a puzzle starts
  gameplayStop() {},        // the puzzle is left, won or lost
};
