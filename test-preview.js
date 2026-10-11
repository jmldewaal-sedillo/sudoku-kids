// SUDOKU KIDS – test-preview.js
// Alleen voor de TESTVERSIE (map …-test): een balk bovenin waarmee je de app op
// een pc in een telefoon- of tabletformaat bekijkt. Zelfde opzet als de
// telefoonpreview van The Flush Factor.
// script.js laadt dit bestand alleen als de app op het testpad draait, niet op
// een echte telefoon en niet in het frame zelf (?frame=1). De live app vraagt
// dit bestand nooit op.
(function () {
  'use strict';

  var Store = window.SudokuStorage;
  if (!Store || !Store.IS_TEST) return;                       // dubbele beveiliging: nooit live
  var inIframe = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  if (inIframe) return;

  var KEY = Store.PREFIX + 'preview';                          // test_sudokuKids_preview
  var store = {
    get: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  };

  var SIZES = {
    'phone-s':  { w: 360,  h: 640,  group: 'Telefoon', icon: '',   label: 'Klein' },
    'phone':    { w: 390,  h: 844,  group: 'Telefoon', icon: '',   label: 'Standaard' },
    'phone-l':  { w: 844,  h: 390,  group: 'Telefoon', icon: '',   label: 'Liggend' },
    'tablet':   { w: 800,  h: 1280, group: 'Tablet',   icon: '',   label: 'Staand' },
    'tablet-l': { w: 1280, h: 800,  group: 'Tablet',   icon: '',   label: 'Liggend' },
    'full':     { w: 0,    h: 0,    group: '',         icon: '',   label: 'Volledig scherm' }
  };
  var size = SIZES[store.get()] ? store.get() : 'phone';

  function build() {
    var style = document.createElement('style');
    style.textContent =
      'body.pv-active{overflow:hidden!important;background:#14141f!important}' +
      'body.pv-active>:not(#pv-root){display:none!important}' +
      '#pv-root{position:fixed;inset:0;display:flex;flex-direction:column;background:#14141f;font-family:system-ui,sans-serif;color:#eee;z-index:9999;user-select:none}' +
      '#pv-toolbar{display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(0,0,0,.45);flex-shrink:0;flex-wrap:wrap;border-bottom:1px solid rgba(255,255,255,.1)}' +
      '.pv-lbl{display:inline-flex;align-items:center;gap:4px;font-size:.72rem;color:#9a9ab0;white-space:nowrap}' +
      '.pv-sep{width:1px;height:20px;background:rgba(255,255,255,.2);flex-shrink:0}' +
      '.pv-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border:1px solid rgba(255,255,255,.2);border-radius:6px;background:rgba(255,255,255,.08);color:#ccc;font-size:.74rem;line-height:1.3;cursor:pointer;font-family:inherit}' +
      '.pv-btn:hover{background:rgba(255,255,255,.18)}' +
      '.pv-btn.active{background:rgba(44,125,160,.6);border-color:#4aa8d0;color:#fff}' +
      '.pv-btn small{opacity:.65}' +
      '.pv-test{margin-left:auto;background:#C62828;color:#fff;font-weight:900;font-size:.72rem;letter-spacing:1px;padding:3px 10px;border-radius:6px}' +
      '#pv-stage{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:16px;min-height:0}' +
      '#pv-stage.pv-full{padding:0}' +
      '#pv-frame{position:relative;flex-shrink:0;overflow:hidden;background:#000;box-shadow:0 0 0 10px #222,0 0 0 13px #3a3a3a,0 24px 64px rgba(0,0,0,.8)}' +
      '#pv-stage.pv-full #pv-frame{box-shadow:none;border-radius:0!important;width:100%!important;height:100%!important;transform:none!important}' +
      '#pv-iframe{display:block;border:none;width:100%;height:100%}';
    document.head.appendChild(style);

    var groups = '', lastGroup = null;
    Object.keys(SIZES).forEach(function (k) {
      var s = SIZES[k];
      if (s.group !== lastGroup) {
        if (lastGroup !== null) groups += '<div class="pv-sep"></div>';
        if (s.group) groups += '<span class="pv-lbl">' + (s.icon ? s.icon + ' ' : '') + s.group + '</span>';
        lastGroup = s.group;
      }
      groups += '<button class="pv-btn" data-size="' + k + '">' + s.label +
                (s.w ? ' <small>' + s.w + '×' + s.h + '</small>' : '') + '</button>';
    });

    var root = document.createElement('div');
    root.id = 'pv-root';
    root.innerHTML =
      '<div id="pv-toolbar">' + groups + '<span class="pv-test">TESTVERSIE</span></div>' +
      '<div id="pv-stage"><div id="pv-frame"><iframe id="pv-iframe" title="Sudoku Kids – testversie" src="./?frame=1"></iframe></div></div>';
    document.body.classList.add('pv-active');
    document.body.appendChild(root);

    var frame = document.getElementById('pv-frame');
    var stage = document.getElementById('pv-stage');

    function apply() {
      var s = SIZES[size];
      var full = !s.w;
      stage.classList.toggle('pv-full', full);
      if (!full) {
        var scale = Math.min(1, (stage.clientWidth - 58) / s.w, (stage.clientHeight - 58) / s.h);
        frame.style.width = s.w + 'px';
        frame.style.height = s.h + 'px';
        frame.style.transform = 'scale(' + Math.max(0.1, scale).toFixed(4) + ')';
        frame.style.borderRadius = s.group === 'Tablet' ? '18px' : '32px';
      }
      document.querySelectorAll('[data-size]').forEach(function (b) {
        b.classList.toggle('active', b.dataset.size === size);
        b.setAttribute('aria-pressed', String(b.dataset.size === size));
      });
    }
    apply();

    var raf;
    window.addEventListener('resize', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); });
    document.querySelectorAll('[data-size]').forEach(function (b) {
      b.addEventListener('click', function () { size = b.dataset.size; store.set(size); apply(); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
