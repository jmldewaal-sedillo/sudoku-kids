/* ============================================================
   SUDOKU KIDS & CRAZY GRIDS – icons.js
   Own kawaii icons: round shapes, dot eyes, blush, a little smile.
   Drawn by hand as SVG for this app – no licence or credits needed.
   Every icon is a 64×64 SVG, built from a few shared parts so that the
   whole set looks like one family and stays small.
       KawaiiIcons.svg('cat')        -> '<svg …>…</svg>'
       KawaiiIcons.names             -> ['cat', 'dog', …]
   ============================================================ */
(function (root) {
  'use strict';

  const INK = '#3D2C6B';                 // outline + eyes (same purple as the app's text)
  const BLUSH = '#FF8FB1';
  const O = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
  const THIN = `stroke="${INK}" stroke-width="2" stroke-linecap="round" fill="none"`;

  // ---------- shared parts ----------
  const el = (tag, attrs, extra = '') => `<${tag} ${attrs} ${extra}/>`;
  const circle = (cx, cy, r, fill, extra = O) => el('circle', `cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"`, extra);
  const ellipse = (cx, cy, rx, ry, fill, extra = O, rot = 0) =>
    el('ellipse', `cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"` + (rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''), extra);
  const path = (d, fill, extra = O) => el('path', `d="${d}" fill="${fill}"`, extra);
  const rect = (x, y, w, h, r, fill, extra = O) => el('rect', `x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"`, extra);

  // The face every icon shares. mouth: 'smile' | 'cat' | 'open' | 'sad' | 'none'; eyes: 'dot' | 'happy' | 'love' | 'cry'
  function face(x, y, s = 1, mouth = 'smile', eyes = 'dot') {
    const ex = 8 * s, r = 2.7 * s;
    let out = '';
    [-1, 1].forEach(side => {
      const cx = x + side * ex;
      if (eyes === 'happy') out += el('path', `d="M${cx - 3 * s} ${y + s} q${3 * s} ${-4 * s} ${6 * s} 0"`, THIN);
      else if (eyes === 'love') out += path(`M${cx} ${y + 3.2 * s} c${-5 * s} ${-3.4 * s} ${-3 * s} ${-7 * s} 0 ${-4.2 * s} c${3 * s} ${-2.8 * s} ${5 * s} ${0.8 * s} 0 ${4.2 * s}z`, '#FF5C8A', '');
      else {
        out += circle(cx, y, r, INK, '') + circle(cx - 0.9 * s, y - 0.9 * s, 0.95 * s, '#fff', '');
        if (eyes === 'cry') out += path(`M${cx} ${y + 3.5 * s} q${-2.6 * s} ${4 * s} 0 ${5.4 * s} q${2.6 * s} ${-1.4 * s} 0 ${-5.4 * s}z`, '#7CC4FF', '');
      }
      out += ellipse(x + side * 13 * s, y + 5 * s, 3.5 * s, 2.3 * s, BLUSH, 'opacity="0.75"');
    });
    const my = y + 4 * s;
    if (mouth === 'smile') out += el('path', `d="M${x - 3 * s} ${my} q${3 * s} ${3.6 * s} ${6 * s} 0"`, THIN);
    if (mouth === 'cat') out += el('path', `d="M${x - 4.4 * s} ${my} q${2.2 * s} ${3 * s} ${4.4 * s} 0 q${2.2 * s} ${3 * s} ${4.4 * s} 0"`, THIN);
    if (mouth === 'sad') out += el('path', `d="M${x - 3 * s} ${my + 2.6 * s} q${3 * s} ${-3.6 * s} ${6 * s} 0"`, THIN);
    if (mouth === 'open') out += ellipse(x, my + 1.2 * s, 2.6 * s, 3 * s, '#E0457B', `stroke="${INK}" stroke-width="1.6"`);
    return out;
  }
  const nose = (x, y, w = 3, fill = INK) => ellipse(x, y, w, w * 0.72, fill, '');
  const leaf = (x, y, rot = -30, fill = '#6CCB5F') => ellipse(x, y, 7, 3.6, fill, O, rot);

  // ---------- animals (heads) ----------
  const catHead = (mouth, eyes) =>
    path('M11 27 L14 7 L29 17 Z', '#FFB347') + path('M53 27 L50 7 L35 17 Z', '#FFB347') +
    path('M15.5 21 L17 12 L24 17 Z', '#FFC9D6', '') + path('M48.5 21 L47 12 L40 17 Z', '#FFC9D6', '') +
    ellipse(32, 38, 23, 19.5, '#FFB347') +
    el('path', 'd="M27 21 v5 M32 20 v6 M37 21 v5"', `stroke="#E8892B" stroke-width="2.4" stroke-linecap="round"`) +
    el('path', 'd="M5 38 h8 M6 44 l7 -2 M59 38 h-8 M58 44 l-7 -2"', `stroke="${INK}" stroke-width="1.6" stroke-linecap="round"`) +
    path('M30 39.5 h4 l-2 2.4 z', '#FF7BA5', '') + face(32, 37, 1, mouth, eyes);

  const ICONS = {
    cat: () => catHead('cat', 'dot'),
    'cat-love': () => catHead('open', 'love'),
    'cat-sad': () => catHead('sad', 'cry'),
    dog: () =>
      ellipse(11, 30, 7.5, 14, '#A9713D', O, 16) + ellipse(53, 30, 7.5, 14, '#A9713D', O, -16) +
      ellipse(32, 36, 21, 20, '#F7DDB6') + ellipse(42, 31, 7, 8, '#D9A871', '') +
      ellipse(32, 44, 10, 7.5, '#FFF6E8', '') + nose(32, 40, 3.4) + face(32, 35, 1, 'none') +
      el('path', 'd="M28 44 q4 4 8 0"', THIN) + path('M29.5 46 q2.5 5 5 0 z', '#FF7BA5', `stroke="${INK}" stroke-width="1.4"`),
    frog: () =>
      circle(19, 20, 10, '#8FD46B') + circle(45, 20, 10, '#8FD46B') + ellipse(32, 40, 25, 18, '#8FD46B') +
      circle(19, 19, 6, '#fff', '') + circle(45, 19, 6, '#fff', '') + circle(19, 20, 3, INK, '') + circle(45, 20, 3, INK, '') +
      circle(18, 19, 1, '#fff', '') + circle(44, 19, 1, '#fff', '') +
      ellipse(17, 43, 3.8, 2.5, BLUSH, 'opacity="0.75"') + ellipse(47, 43, 3.8, 2.5, BLUSH, 'opacity="0.75"') +
      el('path', 'd="M21 41 q11 9 22 0"', THIN),
    bear: () =>
      circle(13, 17, 8.5, '#C68B59') + circle(51, 17, 8.5, '#C68B59') + circle(13, 17, 4, '#F3C9A0', '') + circle(51, 17, 4, '#F3C9A0', '') +
      ellipse(32, 36, 23, 21, '#C68B59') + ellipse(32, 43, 10, 8, '#F3D9B8', '') + nose(32, 39.5, 3.4) +
      face(32, 34, 1, 'none') + el('path', 'd="M28.5 44 q3.5 3.4 7 0"', THIN),
    fox: () =>
      path('M9 30 L11 6 L28 18 Z', '#FF8A3D') + path('M55 30 L53 6 L36 18 Z', '#FF8A3D') +
      path('M13.5 22 L15 12 L22 17 Z', INK, '') + path('M50.5 22 L49 12 L42 17 Z', INK, '') +
      path('M32 58 C12 56 6 42 9 32 C14 18 50 18 55 32 C58 42 52 56 32 58 Z', '#FF8A3D') +
      path('M32 56 C20 55 12 49 10.5 40 C18 38 26 42 32 48 C38 42 46 38 53.5 40 C52 49 44 55 32 56 Z', '#FFF6E8', '') +
      nose(32, 44, 3) + face(32, 35, 1, 'none') + el('path', 'd="M29 48 q3 2.6 6 0"', THIN),
    koala: () =>
      circle(11, 24, 11, '#AEB4C4') + circle(53, 24, 11, '#AEB4C4') + circle(11, 24, 5.5, '#F3D5DF', '') + circle(53, 24, 5.5, '#F3D5DF', '') +
      ellipse(32, 37, 22, 20, '#C3C8D6') + ellipse(32, 40, 5.5, 7, INK, '') + ellipse(30.6, 37.5, 1.4, 2, '#fff', 'opacity="0.5"') +
      face(32, 34, 1.05, 'none') + el('path', 'd="M28.5 50 q3.5 2.6 7 0"', THIN),
    tiger: () =>
      circle(14, 16, 8, '#FFA63D') + circle(50, 16, 8, '#FFA63D') + circle(14, 16, 3.6, '#FFD9E2', '') + circle(50, 16, 3.6, '#FFD9E2', '') +
      ellipse(32, 36, 23, 21, '#FFA63D') + ellipse(32, 44, 11, 8, '#FFF6E8', '') +
      el('path', 'd="M32 16 v7 M25 17.5 l1.5 6 M39 17.5 l-1.5 6 M9.5 33 l6 2 M10.5 41 l5.5 -0.5 M54.5 33 l-6 2 M53.5 41 l-5.5 -0.5"', `stroke="${INK}" stroke-width="2.6" stroke-linecap="round"`) +
      path('M30 40 h4 l-2 2.4 z', '#FF7BA5', '') + face(32, 35, 1, 'none') + el('path', 'd="M27.6 44.5 q2.2 3 4.4 0 q2.2 3 4.4 0"', THIN),
    penguin: () =>
      ellipse(32, 35, 22, 24, '#3F4B7A') + circle(24, 32, 11.5, '#fff', '') + circle(40, 32, 11.5, '#fff', '') + ellipse(32, 43, 16, 13, '#fff', '') +
      path('M28 39 h8 l-4 5 z', '#FFB02E', `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"`) + face(32, 33, 1, 'none'),
    lion: () =>
      [0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(a => circle((32 + 21 * Math.cos(a * Math.PI / 180)).toFixed(1), (34 + 21 * Math.sin(a * Math.PI / 180)).toFixed(1), 9, '#D9822B')).join('') +
      circle(32, 35, 19, '#FFCB6B') + ellipse(32, 42, 8.5, 6.5, '#FFF2D6', '') + nose(32, 39, 3.2, '#A0522D') +
      face(32, 33, 0.95, 'none') + el('path', 'd="M28.5 43 q1.8 2.6 3.5 0 q1.8 2.6 3.5 0"', THIN),
    rabbit: () =>
      ellipse(22, 16, 6.5, 15, '#fff', O, -8) + ellipse(42, 16, 6.5, 15, '#fff', O, 8) +
      ellipse(22, 17, 2.8, 10, '#FFC9D6', '', -8) + ellipse(42, 17, 2.8, 10, '#FFC9D6', '', 8) +
      ellipse(32, 41, 21, 18, '#fff') + path('M30 42.5 h4 l-2 2.4 z', '#FF7BA5', '') + face(32, 40, 1, 'cat'),
    panda: () =>
      circle(13, 18, 8.5, INK, '') + circle(51, 18, 8.5, INK, '') + ellipse(32, 37, 23, 20.5, '#fff') +
      ellipse(23, 35, 6, 7.5, INK, '', 18) + ellipse(41, 35, 6, 7.5, INK, '', -18) +
      circle(24, 35, 2.4, '#fff', '') + circle(40, 35, 2.4, '#fff', '') + nose(32, 42, 2.8) +
      ellipse(17, 44, 3.5, 2.3, BLUSH, 'opacity="0.75"') + ellipse(47, 44, 3.5, 2.3, BLUSH, 'opacity="0.75"') + el('path', 'd="M28.5 46 q3.5 3 7 0"', THIN),
    monkey: () =>
      circle(9, 34, 8, '#A9713D') + circle(55, 34, 8, '#A9713D') + circle(9, 34, 4, '#F5D6B0', '') + circle(55, 34, 4, '#F5D6B0', '') +
      ellipse(32, 35, 22, 21, '#A9713D') +
      path('M32 54 C20 54 14 46 16 38 C12 30 20 24 27 28 Q32 30 37 28 C44 24 52 30 48 38 C50 46 44 54 32 54 Z', '#F5D6B0', '') +
      el('path', 'd="M30 42 v1.4 M34 42 v1.4"', `stroke="${INK}" stroke-width="1.6" stroke-linecap="round"`) + face(32, 35, 0.95, 'none') + el('path', 'd="M27 47 q5 4 10 0"', THIN),

    // ---------- fruit ----------
    apple: () =>
      el('path', 'd="M32 20 q1 -8 6 -11"', THIN) + leaf(41, 13, -28) +
      path('M32 22 C22 13 8 22 10 37 C12 51 22 58 32 55 C42 58 52 51 54 37 C56 22 42 13 32 22 Z', '#FF5C5C') +
      ellipse(20, 30, 3, 5, '#fff', 'opacity="0.45"', 25) + face(32, 39),
    banana: () =>
      path('M10 20 C10 44 30 58 54 46 C56 45 56 42 53 42 C36 44 22 34 18 17 C17 13 10 14 10 20 Z', '#FFE14D') +
      path('M10 20 C9 15 12 12 15 13 L18 17 C15 16 12 17 10 20 Z', '#8A6B3A', `stroke="${INK}" stroke-width="2" stroke-linejoin="round"`) +
      face(30, 39, 0.82),
    grapes: () =>
      el('path', 'd="M32 16 v-7"', THIN) + leaf(40, 11, -20) +
      [[20, 24], [32, 22], [44, 24], [26, 35], [38, 35], [32, 47]].map(([x, y]) => circle(x, y, 8.6, '#A56BE8')).join('') +
      [[20, 24], [44, 24], [32, 47]].map(([x, y]) => circle(x - 3, y - 3, 1.8, '#fff', 'opacity="0.5"')).join('') + face(32, 31, 0.9),
    strawberry: () =>
      path('M32 58 C14 50 7 34 11 24 C15 15 49 15 53 24 C57 34 50 50 32 58 Z', '#FF4F6D') +
      path('M32 20 L21 12 L25 21 L14 20 L24 26 L32 22 L40 26 L50 20 L39 21 L43 12 Z', '#6CCB5F') +
      [[19, 33], [45, 33], [24, 45], [40, 45], [32, 50], [32, 28]].map(([x, y]) => ellipse(x, y, 1.2, 1.8, '#FFE9A8', '')).join('') + face(32, 37, 0.9),
    orange: () =>
      circle(32, 36, 22, '#FF9F2E') + leaf(38, 12, -25) + el('path', 'd="M32 15 v-4"', THIN) +
      ellipse(20, 27, 3, 5, '#fff', 'opacity="0.4"', 30) + face(32, 38),
    lemon: () =>
      path('M8 34 C12 16 34 12 46 20 C50 16 58 20 55 26 C60 40 44 56 26 52 C22 55 14 52 16 46 C10 44 7 40 8 34 Z', '#FFE95C') + face(33, 35, 0.95),
    watermelon: () =>
      path('M6 26 A26 26 0 0 0 58 26 Z', '#5FC56B') + path('M11 26 A21 21 0 0 0 53 26 Z', '#FF6B81', '') +
      el('path', 'd="M6 26 h52"', THIN) +
      [[20, 40], [32, 44], [44, 40]].map(([x, y]) => ellipse(x, y, 1.4, 2.2, INK, '')).join('') + face(32, 33, 0.85),
    peach: () =>
      leaf(40, 13, -25) + path('M32 18 C20 10 8 22 10 36 C12 50 24 58 32 54 C40 58 52 50 54 36 C56 22 44 10 32 18 Z', '#FFB08A') +
      el('path', 'd="M32 18 q-5 12 0 24"', `stroke="#F08C6A" stroke-width="2" stroke-linecap="round" fill="none"`) + face(32, 40, 0.95),
    cherry: () =>
      el('path', 'd="M20 36 C22 22 30 14 42 10 M44 38 C44 26 43 18 42 10"', THIN) + leaf(49, 11, 15) +
      circle(20, 44, 13, '#E8344E') + circle(45, 46, 12, '#E8344E') + face(20, 44, 0.6) + face(45, 46, 0.56),

    // ---------- game + buttons ----------
    star: () =>
      path('M32 6 L39.6 22.4 L57 24.8 L44.2 37 L47.6 54.6 L32 46 L16.4 54.6 L19.8 37 L7 24.8 L24.4 22.4 Z', '#FFD43B', `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`) +
      face(32, 32, 0.78),
    'star-empty': () =>
      path('M32 6 L39.6 22.4 L57 24.8 L44.2 37 L47.6 54.6 L32 46 L16.4 54.6 L19.8 37 L7 24.8 L24.4 22.4 Z', '#EFE9F7', `stroke="#B9AED1" stroke-width="3" stroke-linejoin="round"`),
    heart: () =>
      path('M32 56 C10 42 4 28 10 18 C16 8 28 10 32 20 C36 10 48 8 54 18 C60 28 54 42 32 56 Z', '#FF5C7A') +
      ellipse(18, 22, 3, 5, '#fff', 'opacity="0.45"', 30) + face(32, 31, 0.8),
    'heart-empty': () =>
      path('M32 56 C10 42 4 28 10 18 C16 8 28 10 32 20 C36 10 48 8 54 18 C60 28 54 42 32 56 Z', '#EFE9F7', `stroke="#B9AED1" stroke-width="2.6" stroke-linejoin="round"`),
    lock: () =>
      el('path', 'd="M20 30 V20 a12 12 0 0 1 24 0 V30"', `stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"`) +
      el('path', 'd="M20 30 V20 a12 12 0 0 1 24 0 V30"', `stroke="#C9CEDB" stroke-width="4.4" fill="none" stroke-linecap="round"`) +
      rect(11, 28, 42, 30, 9, '#FFC83D') + face(32, 40, 0.85),
    bulb: () =>
      el('path', 'd="M32 3 v5 M10 12 l4 4 M54 12 l-4 4 M4 32 h5 M60 32 h-5"', `stroke="#FFB02E" stroke-width="3" stroke-linecap="round"`) +
      path('M22 44 C12 36 12 14 32 12 C52 14 52 36 42 44 Z', '#FFE14D') + rect(23, 44, 18, 12, 4, '#C9CEDB') +
      el('path', 'd="M24 50 h16"', `stroke="${INK}" stroke-width="2" stroke-linecap="round"`) + face(32, 29, 0.8),
    pencil: () =>
      path('M12 52 L15 40 L43 12 L52 21 L24 49 Z', '#FFD43B') + path('M43 12 L47 8 C50 6 57 12 55 16 L52 21 Z', '#FF8FB1') +
      path('M12 52 L15 40 L24 49 Z', '#F7DDB6') + path('M12 52 l1.6 -5.6 l4 4 z', INK, '') +
      el('path', 'd="M40 15 l9 9"', `stroke="${INK}" stroke-width="2.4" stroke-linecap="round"`) + face(32, 31, 0.5, 'smile'),
    eraser: () =>
      `<g transform="rotate(-25 32 32)">` + rect(8, 20, 48, 26, 7, '#FF9EC0') + path('M34 20 h15 a7 7 0 0 1 7 7 v12 a7 7 0 0 1 -7 7 h-15 z', '#7CC4FF') +
      el('path', 'd="M34 20 v26"', `stroke="${INK}" stroke-width="2.6"`) + face(21, 31, 0.6) + '</g>' +
      el('path', 'd="M8 56 q6 -4 12 0 q6 4 12 0"', `stroke="#B9AED1" stroke-width="2.4" stroke-linecap="round" fill="none"`),
    gear: () =>
      [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="27" y="4" width="10" height="14" rx="3.5" fill="#B79CF2" ${O} transform="rotate(${a} 32 32)"/>`).join('') +
      circle(32, 32, 19, '#B79CF2') + circle(32, 32, 12.5, '#F3ECFF', `stroke="${INK}" stroke-width="2.2"`) + face(32, 30, 0.55),
    hint: () => ICONS.bulb(),

    // ---------- worlds ----------
    tree: () =>
      rect(27, 42, 10, 17, 3, '#A9713D') + circle(20, 30, 13, '#7FD47A') + circle(44, 30, 13, '#7FD47A') + circle(32, 19, 14, '#7FD47A') +
      ellipse(32, 31, 16, 10, '#7FD47A', '') + face(32, 28, 0.85),
    lollipop: () =>
      rect(29.5, 40, 5, 22, 2.5, '#fff') + circle(32, 25, 20, '#FF8FB1') +
      el('path', 'd="M32 25 m0 -14 a14 14 0 1 1 -14 14 a9 9 0 1 1 9 9"', `stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" opacity="0.85"`) + face(32, 26, 0.8),
    rocket: () =>
      path('M25 49 q7 16 14 0 z', '#FFB02E', `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"`) +
      path('M18 38 L8 50 L21 47 Z', '#FF5C7A') + path('M46 38 L56 50 L43 47 Z', '#FF5C7A') +
      path('M32 4 C44 14 46 34 42 48 H22 C18 34 20 14 32 4 Z', '#fff') + path('M32 4 C37 8 40.4 13.4 42.4 19 H21.6 C23.6 13.4 27 8 32 4 Z', '#FF5C7A') +
      circle(32, 30, 8.5, '#BDE3FF') + face(32, 30, 0.42, 'smile'),
  };

  const cache = {};
  const api = {
    names: Object.keys(ICONS),
    has(name) { return name in ICONS; },
    svg(name) {
      if (!(name in ICONS)) return '';
      if (!cache[name]) cache[name] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${ICONS[name]()}</svg>`;
      return cache[name];
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KawaiiIcons = api;
})(typeof window !== 'undefined' ? window : globalThis);
