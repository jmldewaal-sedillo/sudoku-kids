/* ============================================================
   SUDOKU KIDS & CRAZY GRIDS – badges.js
   All 100 badges in one place: what you have to do, what the picture
   looks like, and the name + explanation in every language.

   A badge is { id, family, tier, emblem, color, label, target, value(stats), args }.
     value(stats)  how far the player is (a number); earned when value >= target
     emblem/color/label  the picture: KawaiiIcons.badge(emblem, color, label)
     args          what is filled into the texts: {n} {world} {type} {size} {time}
   `stats` is made by script.js (badgeStats): counts from the saved progress
   plus a few counters that are kept while playing.

   Adding a badge = one add(...) line below (+ a text per language if it is a
   new family). tests/e2e.py plays until every badge is earned.

   Rules for a children's app: nothing that rewards playing for a long time
   in one go, nothing about money.
   ============================================================ */
(function (root) {
  'use strict';

  const C = { mint: '#6BCFB5', yellow: '#FFD43B', pink: '#FF8FB1', sky: '#7CC4FF', purple: '#B79CF2', orange: '#FFB347', green: '#7FD47A', red: '#FF7A7A' };
  const WORLD = {      // id -> picture and colour (same as the world cards)
    0: ['tree', '#A8E6CF'], 3: ['barn', '#FFD98A'], 1: ['lollipop', '#FFC3E3'], 4: ['palm', '#7ED6C9'], 2: ['rocket', '#A8B4F5'],
  };
  const WORLD_ORDER = [0, 3, 1, 4, 2];

  const all = [];
  function add(id, family, tier, emblem, color, label, target, value, args) {
    all.push({ id, family, tier, emblem, color, label: String(label), target, value, args: args || {} });
  }
  // A row of badges of one family with rising targets.
  function tiers(family, emblem, color, targets, value, args) {
    targets.forEach((n, i) => add(`${family}-${n}`, family, targets.length > 1 ? i + 1 : 0, emblem, color, n, n, value, { n, ...(args || {}) }));
  }

  // ---------- how many levels and stars ----------
  tiers('levels', 'check', C.mint, [1, 5, 10, 25, 50, 100, 200, 300, 450], s => s.levels);
  tiers('stars', 'star', C.yellow, [10, 50, 100, 250, 500, 1000], s => s.stars);
  tiers('perfect', 'heart', C.pink, [1, 10, 25, 50, 100], s => s.perfect);

  // ---------- per world ----------
  WORLD_ORDER.forEach(w => {
    const [pic, color] = WORLD[w];
    [10, 25, 0].forEach((n, i) => add(`world${w}-${n || 'all'}`, 'world', i + 1, pic, color, n || 'MAX',
      n || 1, n ? s => s.world[w].done : s => (s.world[w].done >= s.world[w].total ? 1 : 0), { n: n || 'MAX', world: w, all: !n }));
    add(`world${w}-stars`, 'worldStars', 0, pic, C.yellow, '3x', 1, s => (s.world[w].stars >= s.world[w].max ? 1 : 0), { world: w });
  });

  // ---------- per kind of sudoku and per grid size ----------
  [['standard', 'puzzle', C.sky], ['xsudoku', 'cross', C.purple], ['shapes', 'strawberry', C.pink]].forEach(([type, pic, color]) =>
    [5, 25, 50].forEach((n, i) => add(`type-${type}-${n}`, 'type', i + 1, pic, color, n, n, s => s.type[type], { n, type })));
  [[4, 'frog', C.green], [6, 'fox', C.orange], [9, 'lion', C.yellow]].forEach(([size, pic, color]) =>
    [5, 25, 50].forEach((n, i) => add(`size-${size}-${n}`, 'size', i + 1, pic, color, n, n, s => s.size[size], { n, size })));

  // ---------- fast, without mistakes, without hints ----------
  [[4, 30], [4, 15], [6, 120], [6, 60], [9, 600], [9, 300]].forEach(([size, secs], i) =>
    add(`speed-${size}-${secs}`, 'speed', i % 2 + 1, 'clock', size === 4 ? C.green : size === 6 ? C.orange : C.yellow, secs < 60 ? secs + 's' : secs / 60 + 'm',
      1, s => (s.fast[size] !== null && s.fast[size] <= secs ? 1 : 0), { size, time: secs }));
  tiers('flawless', 'crown', C.purple, [3, 5, 10], s => s.flawlessBest);
  tiers('nohint', 'bulb', C.sky, [10, 50, 100], s => s.noHintWins);

  // ---------- coming back (short streaks only) and time of day ----------
  tiers('dayStreak', 'calendar', C.pink, [2, 3, 5, 7], s => s.bestStreak);
  tiers('days', 'home', C.mint, [5, 10, 20], s => s.dayCount);
  add('early', 'early', 0, 'lemon', C.yellow, '8', 1, s => s.early);
  add('night', 'night', 0, 'panda', C.purple, '19', 1, s => s.night);
  add('lunch', 'lunch', 0, 'watermelon', C.green, '12', 1, s => s.lunch);
  add('weekend', 'weekend', 0, 'lollipop', C.orange, '7', 1, s => s.weekend);

  // ---------- funny ----------
  tiers('eraser', 'eraser', C.pink, [10, 50], s => s.erase);
  add('hintFirst', 'hintFirst', 0, 'bulb', C.yellow, '1', 1, s => s.hints);
  add('hints-25', 'hints', 0, 'bulb', C.orange, '25', 25, s => s.hints, { n: 25 });
  tiers('notes', 'pencil', C.yellow, [10, 50], s => s.notes);
  add('oneStar', 'oneStar', 0, 'peach', C.orange, '1', 1, s => s.oneStar);
  add('comeback', 'comeback', 0, 'replay', C.mint, 'OK', 1, s => s.comeback);
  add('animalsWin', 'animalsWin', 0, 'dog', C.orange, 'A', 1, s => s.animalsWin);
  add('avatar', 'avatar', 0, 'rabbit', C.sky, 'NEW', 1, s => s.avatarChanged);
  add('friends', 'friends', 0, 'monkey', C.green, '2', 2, s => s.profiles);
  add('catTap-10', 'catTap', 0, 'cat-love', C.pink, '10', 10, s => s.cat, { n: 10 });

  // ---------- collecting ----------
  add('allTypes', 'allTypes', 0, 'grapes', C.purple, '3', 3, s => ['standard', 'xsudoku', 'shapes'].filter(k => s.type[k] > 0).length);
  add('allSizes', 'allSizes', 0, 'ruler', C.sky, '3', 3, s => [4, 6, 9].filter(k => s.size[k] > 0).length);
  add('allWorlds', 'allWorlds', 0, 'globe', C.sky, '5', 5, s => WORLD_ORDER.filter(w => s.world[w].done > 0).length);
  add('starEachWorld', 'starEachWorld', 0, 'trophy', C.yellow, '5', 5, s => WORLD_ORDER.filter(w => s.world[w].perfect > 0).length);
  add('zoo', 'zoo', 0, 'tiger', C.orange, '9', 1, s => s.zoo);
  add('fruitBasket', 'fruitBasket', 0, 'cherry', C.red, '9', 1, s => s.fruitBasket);
  add('collector-50', 'collector', 0, 'medal', C.mint, '50', 50, s => s.puzzles, { n: 50 });

  // ============================================================
  // TEXTS: family -> [name, explanation]
  // {n} number, {world} world name, {type} kind of sudoku, {size} 4×4, {time} 0:30
  // ============================================================
  const TEXT = {
    nl: {
      levels: ['Puzzelaar', 'Levels gehaald: {n}'], stars: ['Sterrenvanger', 'Sterren verzameld: {n}'], perfect: ['Foutloos', 'Levels met 3 sterren: {n}'],
      world: ['Ontdekker: {world}', 'Levels gehaald in {world}: {n}'], worldAll: ['Ontdekker: {world}', 'Alle levels gehaald in {world}'],
      worldStars: ['Kampioen: {world}', 'Alle sterren gehaald in {world}'],
      type: ['{type}-fan', 'Levels {type} gehaald: {n}'], size: ['{size}-kenner', 'Levels {size} gehaald: {n}'],
      speed: ['Bliksemsnel {size}', 'Een {size} opgelost binnen {time}'],
      flawless: ['Op dreef', 'Levels achter elkaar zonder fout: {n}'], nohint: ['Zelf bedacht', 'Levels gehaald zonder hint: {n}'],
      dayStreak: ['Trouwe speler', 'Dagen achter elkaar gespeeld: {n}'], days: ['Vaste gast', 'Dagen gespeeld: {n}'],
      early: ['Vroege vogel', 'Een level gehaald vóór 8 uur'], night: ['Avonduil', 'Een level gehaald na 19 uur'],
      lunch: ['Lunchpuzzel', 'Een level gehaald tussen 12 en 13 uur'], weekend: ['Weekendspeler', 'Een level gehaald in het weekend'],
      eraser: ['Gummetje', 'De gum gebruikt: {n} keer'], hintFirst: ['Slimme vraag', 'Je eerste hint gebruikt'], hints: ['Hulplijn', 'Hints gebruikt: {n}'],
      notes: ['Notitieblok', 'Notities gemaakt: {n}'], oneStar: ['Toch gehaald!', 'Een level uitgespeeld met 1 ster'],
      comeback: ['Doorzetter', 'Een level gehaald nadat het eerst misging'], animalsWin: ['Dierenvriend', 'Een level gehaald met dieren in plaats van cijfers'],
      avatar: ['Nieuwe look', 'Een ander plaatje gekozen'], friends: ['Samen spelen', 'Een tweede speler gemaakt'], catTap: ['Kattenvriend', 'De kat geaaid: {n} keer'],
      allTypes: ['Alleskunner', 'Standaard, X-Sudoku en fruit gehaald'], allSizes: ['Klein en groot', 'Een 4×4, een 6×6 en een 9×9 gehaald'],
      allWorlds: ['Wereldreiziger', 'Een level gehaald in elke wereld'], starEachWorld: ['Overal een ster', 'Een level met 3 sterren in elke wereld'],
      zoo: ['Dierentuin', 'Een 9×9 gehaald met alle negen dieren'], fruitBasket: ['Fruitmand', 'Een 9×9 met fruit gehaald'], collector: ['Verzamelaar', 'Verschillende puzzels gespeeld: {n}'],
    },
    en: {
      levels: ['Puzzler', 'Levels completed: {n}'], stars: ['Star catcher', 'Stars collected: {n}'], perfect: ['Flawless', 'Levels with 3 stars: {n}'],
      world: ['Explorer: {world}', 'Levels completed in {world}: {n}'], worldAll: ['Explorer: {world}', 'All levels completed in {world}'],
      worldStars: ['Champion: {world}', 'All stars earned in {world}'],
      type: ['{type} fan', '{type} levels completed: {n}'], size: ['{size} expert', '{size} levels completed: {n}'],
      speed: ['Lightning {size}', 'A {size} solved within {time}'],
      flawless: ['On a roll', 'Levels in a row without a mistake: {n}'], nohint: ['All by myself', 'Levels completed without a hint: {n}'],
      dayStreak: ['Loyal player', 'Days played in a row: {n}'], days: ['Regular', 'Days played: {n}'],
      early: ['Early bird', 'A level completed before 8 am'], night: ['Evening owl', 'A level completed after 7 pm'],
      lunch: ['Lunch puzzle', 'A level completed between 12 and 1'], weekend: ['Weekend player', 'A level completed at the weekend'],
      eraser: ['Little eraser', 'Eraser used: {n} times'], hintFirst: ['Good question', 'Used your first hint'], hints: ['Helpline', 'Hints used: {n}'],
      notes: ['Notebook', 'Notes made: {n}'], oneStar: ['Made it anyway!', 'A level finished with 1 star'],
      comeback: ['Never give up', 'A level completed after it went wrong first'], animalsWin: ['Animal friend', 'A level completed with animals instead of numbers'],
      avatar: ['New look', 'Chose a different picture'], friends: ['Playing together', 'Made a second player'], catTap: ['Cat friend', 'Petted the cat: {n} times'],
      allTypes: ['All-rounder', 'Completed Classic, X-Sudoku and fruit'], allSizes: ['Small and large', 'Completed a 4×4, a 6×6 and a 9×9'],
      allWorlds: ['World traveller', 'A level completed in every world'], starEachWorld: ['A star everywhere', 'A level with 3 stars in every world'],
      zoo: ['Zoo', 'A 9×9 completed with all nine animals'], fruitBasket: ['Fruit basket', 'A 9×9 with fruit completed'], collector: ['Collector', 'Different puzzles played: {n}'],
    },
    de: {
      levels: ['Rätselfreund', 'Geschaffte Level: {n}'], stars: ['Sternenfänger', 'Gesammelte Sterne: {n}'], perfect: ['Fehlerfrei', 'Level mit 3 Sternen: {n}'],
      world: ['Entdecker: {world}', 'Geschaffte Level in {world}: {n}'], worldAll: ['Entdecker: {world}', 'Alle Level in {world} geschafft'],
      worldStars: ['Champion: {world}', 'Alle Sterne in {world} geholt'],
      type: ['{type}-Fan', 'Geschaffte Level {type}: {n}'], size: ['{size}-Kenner', 'Geschaffte Level {size}: {n}'],
      speed: ['Blitzschnell {size}', 'Ein {size} in {time} gelöst'],
      flawless: ['Im Flow', 'Level hintereinander ohne Fehler: {n}'], nohint: ['Selbst geschafft', 'Level ohne Tipp geschafft: {n}'],
      dayStreak: ['Treuer Spieler', 'Tage hintereinander gespielt: {n}'], days: ['Stammgast', 'Gespielte Tage: {n}'],
      early: ['Früher Vogel', 'Ein Level vor 8 Uhr geschafft'], night: ['Abendeule', 'Ein Level nach 19 Uhr geschafft'],
      lunch: ['Mittagsrätsel', 'Ein Level zwischen 12 und 13 Uhr geschafft'], weekend: ['Wochenendspieler', 'Ein Level am Wochenende geschafft'],
      eraser: ['Radiergummi', 'Radierer benutzt: {n} Mal'], hintFirst: ['Kluge Frage', 'Deinen ersten Tipp benutzt'], hints: ['Hilfe-Leitung', 'Benutzte Tipps: {n}'],
      notes: ['Notizblock', 'Gemachte Notizen: {n}'], oneStar: ['Trotzdem geschafft!', 'Ein Level mit 1 Stern beendet'],
      comeback: ['Durchhalter', 'Ein Level geschafft, nachdem es erst schiefging'], animalsWin: ['Tierfreund', 'Ein Level mit Tieren statt Zahlen geschafft'],
      avatar: ['Neuer Look', 'Ein anderes Bild gewählt'], friends: ['Zusammen spielen', 'Einen zweiten Spieler angelegt'], catTap: ['Katzenfreund', 'Die Katze gestreichelt: {n} Mal'],
      allTypes: ['Alleskönner', 'Klassisch, X-Sudoku und Obst geschafft'], allSizes: ['Klein und groß', 'Ein 4×4, ein 6×6 und ein 9×9 geschafft'],
      allWorlds: ['Weltreisender', 'In jeder Welt ein Level geschafft'], starEachWorld: ['Überall ein Stern', 'In jeder Welt ein Level mit 3 Sternen'],
      zoo: ['Zoo', 'Ein 9×9 mit allen neun Tieren geschafft'], fruitBasket: ['Obstkorb', 'Ein 9×9 mit Obst geschafft'], collector: ['Sammler', 'Verschiedene Rätsel gespielt: {n}'],
    },
    fr: {
      levels: ['As du puzzle', 'Niveaux réussis : {n}'], stars: ['Chasseur d\'étoiles', 'Étoiles gagnées : {n}'], perfect: ['Sans faute', 'Niveaux avec 3 étoiles : {n}'],
      world: ['Explorateur : {world}', 'Niveaux réussis dans {world} : {n}'], worldAll: ['Explorateur : {world}', 'Tous les niveaux réussis dans {world}'],
      worldStars: ['Champion : {world}', 'Toutes les étoiles gagnées dans {world}'],
      type: ['Fan de {type}', 'Niveaux {type} réussis : {n}'], size: ['Expert {size}', 'Niveaux {size} réussis : {n}'],
      speed: ['Éclair {size}', 'Un {size} résolu en moins de {time}'],
      flawless: ['Sur ma lancée', 'Niveaux d\'affilée sans erreur : {n}'], nohint: ['Tout seul', 'Niveaux réussis sans indice : {n}'],
      dayStreak: ['Joueur fidèle', 'Jours de suite : {n}'], days: ['Habitué', 'Jours joués : {n}'],
      early: ['Lève-tôt', 'Un niveau réussi avant 8 h'], night: ['Chouette du soir', 'Un niveau réussi après 19 h'],
      lunch: ['Puzzle de midi', 'Un niveau réussi entre 12 h et 13 h'], weekend: ['Joueur du week-end', 'Un niveau réussi le week-end'],
      eraser: ['Petite gomme', 'Gomme utilisée : {n} fois'], hintFirst: ['Bonne question', 'Ton premier indice utilisé'], hints: ['Coup de pouce', 'Indices utilisés : {n}'],
      notes: ['Carnet de notes', 'Notes écrites : {n}'], oneStar: ['Réussi quand même !', 'Un niveau terminé avec 1 étoile'],
      comeback: ['Persévérant', 'Un niveau réussi après un premier échec'], animalsWin: ['Ami des animaux', 'Un niveau réussi avec des animaux à la place des chiffres'],
      avatar: ['Nouveau look', 'Une autre image choisie'], friends: ['Jouer ensemble', 'Un deuxième joueur créé'], catTap: ['Ami du chat', 'Chat caressé : {n} fois'],
      allTypes: ['Touche-à-tout', 'Classique, X-Sudoku et fruits réussis'], allSizes: ['Petit et grand', 'Un 4×4, un 6×6 et un 9×9 réussis'],
      allWorlds: ['Grand voyageur', 'Un niveau réussi dans chaque monde'], starEachWorld: ['Une étoile partout', 'Un niveau à 3 étoiles dans chaque monde'],
      zoo: ['Zoo', 'Un 9×9 réussi avec les neuf animaux'], fruitBasket: ['Panier de fruits', 'Un 9×9 de fruits réussi'], collector: ['Collectionneur', 'Puzzles différents joués : {n}'],
    },
    es: {
      levels: ['Resuelvepuzles', 'Niveles superados: {n}'], stars: ['Cazaestrellas', 'Estrellas conseguidas: {n}'], perfect: ['Sin fallos', 'Niveles con 3 estrellas: {n}'],
      world: ['Explorador: {world}', 'Niveles superados en {world}: {n}'], worldAll: ['Explorador: {world}', 'Todos los niveles superados en {world}'],
      worldStars: ['Campeón: {world}', 'Todas las estrellas conseguidas en {world}'],
      type: ['Fan de {type}', 'Niveles {type} superados: {n}'], size: ['Experto en {size}', 'Niveles {size} superados: {n}'],
      speed: ['Relámpago {size}', 'Un {size} resuelto en menos de {time}'],
      flawless: ['En racha', 'Niveles seguidos sin fallos: {n}'], nohint: ['Yo solito', 'Niveles superados sin pista: {n}'],
      dayStreak: ['Jugador fiel', 'Días seguidos jugando: {n}'], days: ['Habitual', 'Días jugados: {n}'],
      early: ['Madrugador', 'Un nivel superado antes de las 8'], night: ['Búho de la tarde', 'Un nivel superado después de las 19'],
      lunch: ['Puzle del mediodía', 'Un nivel superado entre las 12 y las 13'], weekend: ['Jugador de fin de semana', 'Un nivel superado en fin de semana'],
      eraser: ['Gomita', 'Goma usada: {n} veces'], hintFirst: ['Buena pregunta', 'Tu primera pista usada'], hints: ['Línea de ayuda', 'Pistas usadas: {n}'],
      notes: ['Libreta', 'Notas hechas: {n}'], oneStar: ['¡Conseguido igual!', 'Un nivel terminado con 1 estrella'],
      comeback: ['No me rindo', 'Un nivel superado después de fallar primero'], animalsWin: ['Amigo de los animales', 'Un nivel superado con animales en vez de números'],
      avatar: ['Nuevo look', 'Elegiste otra imagen'], friends: ['Jugar juntos', 'Creaste un segundo jugador'], catTap: ['Amigo del gato', 'Gato acariciado: {n} veces'],
      allTypes: ['Todoterreno', 'Clásico, X-Sudoku y fruta superados'], allSizes: ['Pequeño y grande', 'Un 4×4, un 6×6 y un 9×9 superados'],
      allWorlds: ['Trotamundos', 'Un nivel superado en cada mundo'], starEachWorld: ['Una estrella en cada sitio', 'Un nivel con 3 estrellas en cada mundo'],
      zoo: ['Zoológico', 'Un 9×9 superado con los nueve animales'], fruitBasket: ['Cesta de fruta', 'Un 9×9 de fruta superado'], collector: ['Coleccionista', 'Puzles distintos jugados: {n}'],
    },
    pt: {
      levels: ['Craque dos quebra-cabeças', 'Níveis concluídos: {n}'], stars: ['Caçador de estrelas', 'Estrelas conquistadas: {n}'], perfect: ['Sem erros', 'Níveis com 3 estrelas: {n}'],
      world: ['Explorador: {world}', 'Níveis concluídos em {world}: {n}'], worldAll: ['Explorador: {world}', 'Todos os níveis concluídos em {world}'],
      worldStars: ['Campeão: {world}', 'Todas as estrelas conquistadas em {world}'],
      type: ['Fã de {type}', 'Níveis {type} concluídos: {n}'], size: ['Especialista em {size}', 'Níveis {size} concluídos: {n}'],
      speed: ['Relâmpago {size}', 'Um {size} resolvido em menos de {time}'],
      flawless: ['Embalado', 'Níveis seguidos sem erro: {n}'], nohint: ['Sozinho', 'Níveis concluídos sem dica: {n}'],
      dayStreak: ['Jogador fiel', 'Dias seguidos jogando: {n}'], days: ['Frequentador', 'Dias jogados: {n}'],
      early: ['Madrugador', 'Um nível concluído antes das 8h'], night: ['Coruja da noite', 'Um nível concluído depois das 19h'],
      lunch: ['Quebra-cabeça do almoço', 'Um nível concluído entre 12h e 13h'], weekend: ['Jogador de fim de semana', 'Um nível concluído no fim de semana'],
      eraser: ['Borrachinha', 'Borracha usada: {n} vezes'], hintFirst: ['Boa pergunta', 'Sua primeira dica usada'], hints: ['Linha de ajuda', 'Dicas usadas: {n}'],
      notes: ['Caderninho', 'Notas feitas: {n}'], oneStar: ['Consegui mesmo assim!', 'Um nível terminado com 1 estrela'],
      comeback: ['Não desisto', 'Um nível concluído depois de dar errado'], animalsWin: ['Amigo dos animais', 'Um nível concluído com animais no lugar dos números'],
      avatar: ['Visual novo', 'Escolheu outra imagem'], friends: ['Jogando juntos', 'Criou um segundo jogador'], catTap: ['Amigo do gato', 'Fez carinho no gato: {n} vezes'],
      allTypes: ['Faz de tudo', 'Clássico, X-Sudoku e frutas concluídos'], allSizes: ['Pequeno e grande', 'Um 4×4, um 6×6 e um 9×9 concluídos'],
      allWorlds: ['Viajante', 'Um nível concluído em cada mundo'], starEachWorld: ['Estrela em todo lugar', 'Um nível com 3 estrelas em cada mundo'],
      zoo: ['Zoológico', 'Um 9×9 concluído com os nove animais'], fruitBasket: ['Cesta de frutas', 'Um 9×9 de frutas concluído'], collector: ['Colecionador', 'Quebra-cabeças diferentes jogados: {n}'],
    },
    it: {
      levels: ['Risolvitore', 'Livelli completati: {n}'], stars: ['Acchiappastelle', 'Stelle raccolte: {n}'], perfect: ['Senza errori', 'Livelli con 3 stelle: {n}'],
      world: ['Esploratore: {world}', 'Livelli completati in {world}: {n}'], worldAll: ['Esploratore: {world}', 'Tutti i livelli completati in {world}'],
      worldStars: ['Campione: {world}', 'Tutte le stelle raccolte in {world}'],
      type: ['Fan di {type}', 'Livelli {type} completati: {n}'], size: ['Esperto di {size}', 'Livelli {size} completati: {n}'],
      speed: ['Fulmine {size}', 'Un {size} risolto in meno di {time}'],
      flawless: ['In forma', 'Livelli di fila senza errori: {n}'], nohint: ['Da solo', 'Livelli completati senza aiuto: {n}'],
      dayStreak: ['Giocatore fedele', 'Giorni di fila: {n}'], days: ['Di casa', 'Giorni giocati: {n}'],
      early: ['Mattiniero', 'Un livello completato prima delle 8'], night: ['Gufo della sera', 'Un livello completato dopo le 19'],
      lunch: ['Puzzle di pranzo', 'Un livello completato tra le 12 e le 13'], weekend: ['Giocatore del weekend', 'Un livello completato nel weekend'],
      eraser: ['Gommina', 'Gomma usata: {n} volte'], hintFirst: ['Bella domanda', 'Il tuo primo aiuto usato'], hints: ['Linea d\'aiuto', 'Aiuti usati: {n}'],
      notes: ['Taccuino', 'Note scritte: {n}'], oneStar: ['Fatto lo stesso!', 'Un livello finito con 1 stella'],
      comeback: ['Non mollo', 'Un livello completato dopo un primo errore'], animalsWin: ['Amico degli animali', 'Un livello completato con gli animali al posto dei numeri'],
      avatar: ['Nuovo look', 'Hai scelto un\'altra immagine'], friends: ['Giocare insieme', 'Hai creato un secondo giocatore'], catTap: ['Amico del gatto', 'Gatto accarezzato: {n} volte'],
      allTypes: ['Tuttofare', 'Classico, X-Sudoku e frutta completati'], allSizes: ['Piccolo e grande', 'Un 4×4, un 6×6 e un 9×9 completati'],
      allWorlds: ['Giramondo', 'Un livello completato in ogni mondo'], starEachWorld: ['Una stella ovunque', 'Un livello con 3 stelle in ogni mondo'],
      zoo: ['Zoo', 'Un 9×9 completato con tutti e nove gli animali'], fruitBasket: ['Cesto di frutta', 'Un 9×9 di frutta completato'], collector: ['Collezionista', 'Puzzle diversi giocati: {n}'],
    },
    pl: {
      levels: ['Łamigłówkowicz', 'Ukończone poziomy: {n}'], stars: ['Łowca gwiazdek', 'Zebrane gwiazdki: {n}'], perfect: ['Bez błędu', 'Poziomy z 3 gwiazdkami: {n}'],
      world: ['Odkrywca: {world}', 'Ukończone poziomy w świecie {world}: {n}'], worldAll: ['Odkrywca: {world}', 'Wszystkie poziomy ukończone w świecie {world}'],
      worldStars: ['Mistrz: {world}', 'Wszystkie gwiazdki zdobyte w świecie {world}'],
      type: ['Fan: {type}', 'Ukończone poziomy {type}: {n}'], size: ['Znawca {size}', 'Ukończone poziomy {size}: {n}'],
      speed: ['Błyskawica {size}', '{size} rozwiązane w czasie {time}'],
      flawless: ['Dobra passa', 'Poziomy z rzędu bez błędu: {n}'], nohint: ['Samodzielnie', 'Poziomy ukończone bez podpowiedzi: {n}'],
      dayStreak: ['Wierny gracz', 'Dni z rzędu: {n}'], days: ['Stały bywalec', 'Dni z grą: {n}'],
      early: ['Ranny ptaszek', 'Poziom ukończony przed 8:00'], night: ['Wieczorna sowa', 'Poziom ukończony po 19:00'],
      lunch: ['Łamigłówka w południe', 'Poziom ukończony między 12:00 a 13:00'], weekend: ['Weekendowy gracz', 'Poziom ukończony w weekend'],
      eraser: ['Gumeczka', 'Użycia gumki: {n}'], hintFirst: ['Dobre pytanie', 'Pierwsza użyta podpowiedź'], hints: ['Linia pomocy', 'Użyte podpowiedzi: {n}'],
      notes: ['Notesik', 'Zrobione notatki: {n}'], oneStar: ['A jednak się udało!', 'Poziom ukończony z 1 gwiazdką'],
      comeback: ['Nie poddaję się', 'Poziom ukończony po wcześniejszej porażce'], animalsWin: ['Przyjaciel zwierząt', 'Poziom ukończony ze zwierzętami zamiast cyfr'],
      avatar: ['Nowy wygląd', 'Wybrano inny obrazek'], friends: ['Gramy razem', 'Utworzono drugiego gracza'], catTap: ['Przyjaciel kota', 'Pogłaskania kota: {n}'],
      allTypes: ['Wszechstronny', 'Ukończone: klasyczne, X-Sudoku i owoce'], allSizes: ['Mały i duży', 'Ukończone 4×4, 6×6 i 9×9'],
      allWorlds: ['Podróżnik', 'Poziom ukończony w każdym świecie'], starEachWorld: ['Gwiazdka wszędzie', 'Poziom z 3 gwiazdkami w każdym świecie'],
      zoo: ['Zoo', '9×9 ukończone z dziewięcioma zwierzętami'], fruitBasket: ['Kosz owoców', 'Ukończone owocowe 9×9'], collector: ['Kolekcjoner', 'Zagrane różne łamigłówki: {n}'],
    },
    tr: {
      levels: ['Bulmacacı', 'Tamamlanan seviye: {n}'], stars: ['Yıldız avcısı', 'Toplanan yıldız: {n}'], perfect: ['Hatasız', '3 yıldızlı seviye: {n}'],
      world: ['Kâşif: {world}', '{world} içinde tamamlanan seviye: {n}'], worldAll: ['Kâşif: {world}', '{world} içindeki tüm seviyeler tamamlandı'],
      worldStars: ['Şampiyon: {world}', '{world} içindeki tüm yıldızlar toplandı'],
      type: ['{type} hayranı', 'Tamamlanan {type} seviyesi: {n}'], size: ['{size} ustası', 'Tamamlanan {size} seviyesi: {n}'],
      speed: ['Şimşek {size}', 'Bir {size}, {time} içinde çözüldü'],
      flawless: ['Formunda', 'Art arda hatasız seviye: {n}'], nohint: ['Kendi başıma', 'İpucu olmadan tamamlanan seviye: {n}'],
      dayStreak: ['Sadık oyuncu', 'Art arda oynanan gün: {n}'], days: ['Müdavim', 'Oynanan gün: {n}'],
      early: ['Erkenci kuş', 'Saat 8\'den önce bir seviye tamamlandı'], night: ['Akşam baykuşu', 'Saat 19\'dan sonra bir seviye tamamlandı'],
      lunch: ['Öğle bulmacası', 'Saat 12 ile 13 arasında bir seviye tamamlandı'], weekend: ['Hafta sonu oyuncusu', 'Hafta sonu bir seviye tamamlandı'],
      eraser: ['Minik silgi', 'Silgi kullanımı: {n}'], hintFirst: ['Güzel soru', 'İlk ipucun kullanıldı'], hints: ['Yardım hattı', 'Kullanılan ipucu: {n}'],
      notes: ['Not defteri', 'Alınan not: {n}'], oneStar: ['Yine de başardım!', '1 yıldızla bitirilen bir seviye'],
      comeback: ['Pes etmem', 'Önce olmayan bir seviye sonra tamamlandı'], animalsWin: ['Hayvan dostu', 'Sayılar yerine hayvanlarla bir seviye tamamlandı'],
      avatar: ['Yeni görünüm', 'Başka bir resim seçildi'], friends: ['Birlikte oynamak', 'İkinci bir oyuncu oluşturuldu'], catTap: ['Kedi dostu', 'Kedi sevildi: {n} kez'],
      allTypes: ['Her işin ustası', 'Klasik, X-Sudoku ve meyve tamamlandı'], allSizes: ['Küçük ve büyük', 'Bir 4×4, bir 6×6 ve bir 9×9 tamamlandı'],
      allWorlds: ['Dünya gezgini', 'Her dünyada bir seviye tamamlandı'], starEachWorld: ['Her yerde yıldız', 'Her dünyada 3 yıldızlı bir seviye'],
      zoo: ['Hayvanat bahçesi', 'Dokuz hayvanın hepsiyle bir 9×9 tamamlandı'], fruitBasket: ['Meyve sepeti', 'Meyveli bir 9×9 tamamlandı'], collector: ['Koleksiyoncu', 'Oynanan farklı bulmaca: {n}'],
    },
    id: {
      levels: ['Jago teka-teki', 'Level selesai: {n}'], stars: ['Penangkap bintang', 'Bintang terkumpul: {n}'], perfect: ['Tanpa salah', 'Level dengan 3 bintang: {n}'],
      world: ['Penjelajah: {world}', 'Level selesai di {world}: {n}'], worldAll: ['Penjelajah: {world}', 'Semua level selesai di {world}'],
      worldStars: ['Juara: {world}', 'Semua bintang didapat di {world}'],
      type: ['Penggemar {type}', 'Level {type} selesai: {n}'], size: ['Ahli {size}', 'Level {size} selesai: {n}'],
      speed: ['Kilat {size}', 'Sebuah {size} selesai dalam {time}'],
      flawless: ['Lagi lancar', 'Level berturut-turut tanpa salah: {n}'], nohint: ['Sendiri saja', 'Level selesai tanpa petunjuk: {n}'],
      dayStreak: ['Pemain setia', 'Hari berturut-turut bermain: {n}'], days: ['Langganan', 'Hari bermain: {n}'],
      early: ['Si rajin pagi', 'Satu level selesai sebelum jam 8 pagi'], night: ['Burung hantu sore', 'Satu level selesai setelah jam 7 malam'],
      lunch: ['Teka-teki siang', 'Satu level selesai antara jam 12 dan jam 1'], weekend: ['Pemain akhir pekan', 'Satu level selesai di akhir pekan'],
      eraser: ['Si penghapus', 'Penghapus dipakai: {n} kali'], hintFirst: ['Pertanyaan bagus', 'Petunjuk pertamamu dipakai'], hints: ['Saluran bantuan', 'Petunjuk dipakai: {n}'],
      notes: ['Buku catatan', 'Catatan dibuat: {n}'], oneStar: ['Tetap berhasil!', 'Satu level selesai dengan 1 bintang'],
      comeback: ['Pantang menyerah', 'Satu level selesai setelah sempat gagal'], animalsWin: ['Sahabat hewan', 'Satu level selesai dengan hewan, bukan angka'],
      avatar: ['Tampilan baru', 'Memilih gambar lain'], friends: ['Main bersama', 'Membuat pemain kedua'], catTap: ['Sahabat kucing', 'Kucing dielus: {n} kali'],
      allTypes: ['Serba bisa', 'Klasik, X-Sudoku, dan buah selesai'], allSizes: ['Kecil dan besar', 'Sebuah 4×4, 6×6, dan 9×9 selesai'],
      allWorlds: ['Penjelajah dunia', 'Satu level selesai di setiap dunia'], starEachWorld: ['Bintang di mana-mana', 'Satu level 3 bintang di setiap dunia'],
      zoo: ['Kebun binatang', 'Sebuah 9×9 selesai dengan sembilan hewan'], fruitBasket: ['Keranjang buah', 'Sebuah 9×9 buah selesai'], collector: ['Kolektor', 'Teka-teki berbeda dimainkan: {n}'],
    },
  };

  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

  const api = {
    all,
    TEXT,
    byId(id) { return all.find(b => b.id === id) || null; },
    // Name and explanation of a badge. `fill` turns args into words:
    //   fill.world(id) -> world name, fill.type(key) -> kind of sudoku, fill.time(secs) -> '0:30'
    text(lang, badge, fill) {
      const table = TEXT[lang] || TEXT.nl;
      const key = badge.args.all ? 'worldAll' : badge.family;
      const [name, desc] = table[key] || TEXT.nl[key];
      const a = badge.args;
      const put = str => str
        .replace('{n}', a.n !== undefined ? a.n : '')
        .replace('{world}', a.world !== undefined ? fill.world(a.world) : '')
        .replace('{type}', a.type ? fill.type(a.type) : '')
        .replace('{size}', a.size ? `${a.size}×${a.size}` : '')
        .replace('{time}', a.time ? fill.time(a.time) : '');
      return { name: put(name) + (badge.tier ? ' ' + ROMAN[badge.tier] : ''), desc: put(desc) };
    },
    // How far is the player with every badge?  -> [{ badge, value, target, earned }]
    evaluate(stats) {
      return all.map(badge => {
        const value = Math.max(0, Math.min(badge.target, Number(badge.value(stats)) || 0));
        return { badge, value, target: badge.target, earned: value >= badge.target };
      });
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SudokuBadges = api;
})(typeof window !== 'undefined' ? window : globalThis);
