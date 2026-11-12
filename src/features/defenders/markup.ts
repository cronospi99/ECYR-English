/* Screens and dialogs of Language Defenders. Static markup: the game's UI script (legacy/main.ts)
   binds to these ids. Kept as one block so every id stays in one place. */
export const MARKUP = `<canvas id="game-canvas"></canvas>

  <!-- ===== Loading ===== -->
  <div id="screen-loading" class="screen visible">
    <div class="loading-inner">
      <div class="ld-loader"><span></span><span></span><span></span></div>
      <h2>Loading Language Defenders…</h2>
    </div>
  </div>

  <!-- ===== Main menu (el título 3D flota en la escena detrás) ===== -->
  <div id="screen-menu" class="screen menu-screen">
    <div class="ld-topbar">
      <button id="btn-exit" class="ld-pill" title="Back to the games menu"><span>◀</span> Games</button>
      <div class="ld-topbar-right">
        <button id="btn-menu-music" class="ld-pill ld-icon" title="Music">🎵</button>
        <button id="btn-menu-sound" class="ld-pill ld-icon" title="Sound">🔊</button>
        <button id="btn-full" class="ld-pill ld-icon" title="Full screen">⛶</button>
      </div>
    </div>
    <div class="menu-inner">
      <div class="menu-title-space"></div>
      <p class="menu-sub">Keep the distractions out of class by answering English questions.<br><b>Choose your level:</b></p>
      <div id="level-buttons" class="level-buttons"></div>
      <div class="ld-modes">
        <button id="btn-mix" class="ld-mode ld-mode-mix"><i>🧩</i><span><b>Mix</b>levels, units &amp; topics</span></button>
        <button id="btn-mini-vase" class="ld-mode ld-mode-blitz" title="Book Blitz"><img data-sprite="icon_book" alt=""><span><b>Book Blitz</b>quick review</span></button>
        <button id="btn-mini-bowl" class="ld-mode ld-mode-boss" title="Boss Exam"><img data-sprite="e_boss" alt=""><span><b>Boss Exam</b>beat El Duro</span></button>
        <button id="btn-class" class="ld-mode ld-mode-class" title="Class Mode (multiplayer)"><i>👥</i><span><b>Class Mode</b>play together</span></button>
      </div>
      <div class="menu-footer">
        <button id="btn-how" class="ld-chip">📖 How to play</button>
        <button id="btn-almanac" class="ld-chip">📚 Almanac</button>
        <button id="btn-stats" class="ld-chip">📊 My progress</button>
        <button id="btn-scenario" class="ld-chip">🌄 Scenario</button>
        <button id="btn-soundtrack" class="ld-chip">🎶 Soundtrack</button>
        <button id="btn-tips" class="ld-chip">🇪🇸 Spanish tips: ON</button>
      </div>
      <p class="author-credit">An educational game by <strong>Teacher Esteban Yepes</strong></p>
    </div>
  </div>

  <!-- ===== Stage select ===== -->
  <div id="screen-stages" class="screen">
    <div class="stages-inner">
      <div class="stages-top">
        <button id="btn-stages-back" class="wood-btn small back-btn">← Menu</button>
        <!-- Jugar el nivel con varias unidades a la vez, en vez de una sola etapa -->
        <button id="btn-pick-units" class="wood-btn small units-btn">🎯 Pick units</button>
      </div>
      <h2 id="stages-title">Level A1</h2>
      <p class="stages-sub">Each stage covers one unit of the program. Earn stars by answering well!</p>
      <div id="stage-grid" class="stage-grid"></div>
    </div>
  </div>

  <!-- ===== Plant loadout picker (before a classic stage) ===== -->
  <div id="screen-plants" class="screen">
    <div class="plants-inner">
      <button id="btn-plants-back" class="wood-btn small back-btn">← Stages</button>
      <h2 id="plants-title">Choose your defenders</h2>
      <p class="plants-sub">Tap defenders to build your team, then start. Tap any of them to read what they do.</p>
      <div id="plants-slots" class="plants-slots"></div>
      <div id="plant-desc" class="plant-desc">Tap a defender to see its description.</div>
      <div id="plants-grid" class="plants-grid"></div>
      <!-- Almanaque con las fichas técnicas, a mano mientras se arma la baraja -->
      <button id="btn-plants-almanac" class="wood-btn small">📚 Almanac — full stats</button>

      <!-- Qué se pregunta: gramática, vocabulario o ambas cosas -->
      <div class="diff-block">
        <span class="diff-label">❓ What do you want to practise?</span>
        <div id="qmode-row" class="diff-row"></div>
        <div id="qmode-desc" class="diff-desc"></div>
      </div>

      <!-- Qué temas de gramática de la unidad entran en la batalla (2–3 por unidad) -->
      <div class="diff-block topic-block">
        <span class="diff-label">📘 Grammar topics of this unit</span>
        <div id="topic-row" class="topic-row"></div>
        <div id="topic-desc" class="diff-desc"></div>
      </div>

      <!-- Lista de la clase: a quién se dirige cada pregunta y con qué unidad -->
      <div class="diff-block student-block">
        <span class="diff-label">👥 Students (optional)</span>
        <p class="student-help">Add names and each question will be addressed to one of them, in turn. Give a student a unit and their questions come from that unit.</p>
        <div class="student-add">
          <input id="student-name" class="class-input student-input" maxlength="18" placeholder="Student name">
          <select id="student-unit" class="student-unit"></select>
          <button id="btn-student-add" class="wood-btn small">＋ Add</button>
        </div>
        <div id="student-list" class="student-list"></div>
      </div>
      <div class="diff-block">
        <span class="diff-label">⚔️ Difficulty</span>
        <div id="diff-row" class="diff-row"></div>
        <div id="diff-desc" class="diff-desc"></div>
      </div>
      <div class="diff-block wave-block">
        <span class="diff-label">🌊 Waves: <b id="wave-count">5</b></span>
        <input id="wave-range" class="wave-range" type="range" min="1" max="10" step="1" value="5"
               aria-label="Number of waves to play">
        <div id="wave-desc" class="diff-desc"></div>
      </div>
      <button id="btn-plants-start" class="wood-btn">▶ Start battle!</button>
    </div>
  </div>

  <!-- ===== Minigame level picker ===== -->
  <div id="mini-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box">
      <h2 id="mini-title">📚 Book Blitz</h2>
      <p class="mini-desc" id="mini-desc"></p>
      <div id="mini-levels" class="level-buttons compact"></div>
      <div class="diff-block">
        <span class="diff-label">⚔️ Difficulty</span>
        <div id="mini-diff-row" class="diff-row"></div>
        <div id="mini-diff-desc" class="diff-desc"></div>
      </div>
      <button id="btn-mini-close" class="wood-btn small">Cancel</button>
    </div>
  </div>

  <!-- ===== HUD ===== -->
  <div id="hud" class="hidden">
    <div class="hud-top">
      <div id="sun-panel" class="sun-counter panel-wood"><img class="sun-icon" data-sprite="fx_idea" alt="💡"><span id="sun-amount">150</span></div>
      <!-- En teléfono sólo queda la flecha: el rótulo se oculta por CSS -->
      <button id="btn-improve" class="hud-btn improve-btn" title="Improve: level up your defenders">⬆<span class="btn-label"> Improve</span></button>
      <!-- La pala vive junto a "Improve", a la izquierda: son las dos acciones sobre
           plantas ya plantadas, y así no se pierde entre los botones de ajustes. -->
      <button id="shovel" class="hud-btn shovel-btn" title="Remove a defender">↩️</button>
      <div class="wave-panel panel-wood">
        <span id="diff-badge" class="diff-badge diff-medium">📘 Medium</span>
        <div id="topic-banner">A1 — Unit 1</div>
        <div class="wave-bar-outer"><div id="wave-bar" class="wave-bar-inner"></div></div>
        <div id="wave-label">Get ready…</div>
      </div>
      <div class="hud-buttons">
        <button id="btn-scenario-hud" class="hud-btn" title="Change scenario">🌄</button>
        <button id="btn-speed" class="hud-btn" title="Speed">▶ x1</button>
        <button id="btn-music" class="hud-btn" title="Music">🎵</button>
        <button id="btn-soundtrack-hud" class="hud-btn" title="Choose soundtrack">🎶</button>
        <button id="btn-mute" class="hud-btn" title="Sound">🔊</button>
        <button id="btn-pause" class="hud-btn" title="Pause">⏸</button>
      </div>
    </div>
    <div id="card-tray" class="card-tray"></div>
    <div id="ammo-panel" class="ammo-panel panel-wood hidden">
      <img data-sprite="icon_book" alt="📖"><span id="ammo-count">0</span>
      <button id="btn-ammo" class="wood-btn small">❓ Answer now!</button>
    </div>
    <div id="streak-pop" class="streak-pop hidden"></div>
    <div id="class-board" class="class-board panel-wood hidden"></div>
    <button id="btn-class-end" class="hud-btn class-ctrl hidden" title="End game for everyone">🏁 End</button>
    <button id="btn-class-leave" class="hud-btn class-ctrl hidden" title="Leave the game">🚪 Exit</button>
  </div>

  <!-- ===== Class Mode (multiplayer) ===== -->
  <div id="class-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box class-box">
      <h2>👥 Class Mode</h2>
      <!-- vista del docente -->
      <div id="class-host">
        <p class="mini-desc">Students scan the QR (or open the link) to join. (max 7 students)</p>
        <!-- Cómo se unen: es lo que mira la clase. En escritorio va en su columna. -->
        <div id="class-join-side">
          <div id="class-code" class="class-code">·····</div>
          <img id="class-qr" class="class-qr" alt="QR">
          <div id="class-link" class="class-link"></div>
          <div id="class-roster" class="class-roster">Waiting for students…</div>
        </div>
        <!-- Ajustes del docente: en escritorio van en la otra columna -->
        <div id="class-settings">
        <!-- Dos formas de jugar en clase -->
        <div id="class-mode-block" class="diff-block">
          <span class="diff-label">🎮 How does the class play?</span>
          <div id="class-mode-row" class="diff-row"></div>
          <div id="class-mode-desc" class="diff-desc"></div>
        </div>
        <!-- Diagnóstico y relevo: lo que hace falta para conectar entre redes -->
        <div class="diff-block net-block">
          <span class="diff-label">🔌 Connection</span>
          <div id="net-status" class="net-status">Not tested yet.</div>
          <div class="net-actions">
            <button id="btn-net-test" class="wood-btn small">🔍 Test connection</button>
            <button id="btn-net-turn" class="wood-btn small">⚙️ Relay server</button>
          </div>
          <div id="net-turn-form" class="net-turn hidden">
            <p class="student-help">To play across <b>different networks</b> (mobile data, another
              Wi‑Fi) WebRTC needs a <b>TURN relay</b>. Put yours here once — the QR will carry it to
              your students automatically.</p>
            <input id="turn-url" class="class-input student-input" placeholder="turn:my.server:3478">
            <input id="turn-user" class="class-input student-input" placeholder="username">
            <input id="turn-pass" class="class-input student-input" placeholder="password">
            <div class="net-actions">
              <button id="btn-turn-save" class="wood-btn small">💾 Save</button>
              <button id="btn-turn-clear" class="wood-btn small">🗑 Clear</button>
            </div>
          </div>
        </div>
        <!-- El nivel hace falta en los DOS modos: en el clásico define la batalla de
             cada alumno, y en el de turnos es el nivel con el que se abre el
             selector. -->
        <div id="class-levels" class="level-buttons compact"></div>
        <div id="class-classic-opts">
          <div class="time-row">
            <span class="time-label">⏱ Time limit:</span>
            <div id="class-times"></div>
          </div>
        </div>
        <!-- Modo por turnos: asignar unidad a cada alumno conectado -->
        <div id="class-turn-opts" class="hidden">
          <p class="student-help">Give a student their own unit and their questions will come from it.
            Leave it on “Match unit” to follow the battle.</p>
          <div id="class-assign" class="student-list"></div>
        </div>
        </div><!-- /class-settings -->
        <button id="btn-class-start" class="wood-btn" disabled>🚀 Start battle!</button>
      </div>
      <!-- vista del estudiante -->
      <div id="class-join" class="hidden">
        <p class="mini-desc" id="class-join-msg">Enter your name to join your teacher's game:</p>
        <input id="class-name" class="class-input" maxlength="16" placeholder="Your name">
        <button id="btn-class-join" class="wood-btn">Join!</button>
        <button id="btn-class-retry" class="wood-btn small hidden">🔄 Retry</button>
        <div id="class-join-status" class="class-roster"></div>
      </div>
      <button id="btn-class-close" class="wood-btn small">Cancel</button>
    </div>
  </div>

  <!-- ===== Scenario / background picker ===== -->
  <div id="scenario-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box scenario-box">
      <h2>🌄 Choose your scenario</h2>
      <p class="mini-desc">Pick a battlefield. It changes the sky, ground and lighting for every game.</p>
      <div id="scenario-grid" class="scenario-grid"></div>
      <div id="scenario-note" class="scenario-note">Tap a scenario to choose your battlefield.</div>
      <button id="btn-scenario-close" class="wood-btn">Done</button>
    </div>
  </div>

  <!-- ===== Soundtrack picker ===== -->
  <div id="soundtrack-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box soundtrack-box">
      <h2>🎶 Choose your soundtrack</h2>
      <p class="mini-desc">Pick a track to play on loop, or let them all rotate. Your choice is remembered.</p>
      <div id="soundtrack-list" class="soundtrack-list"></div>
      <div id="soundtrack-note" class="scenario-note">Tap a track to choose your music.</div>
      <button id="btn-soundtrack-close" class="wood-btn">Done</button>
    </div>
  </div>

  <!-- ===== Improve plants modal ===== -->
  <div id="improve-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box improve-box">
      <h2>⬆ Improve your defenders</h2>
      <p class="mini-desc">Pick a defender on the board to level it up — you'll answer a question. Ideas: <b><span id="improve-sun">0</span> 💡</b></p>
      <div id="improve-list" class="improve-list"></div>
      <div id="improve-note" class="scenario-note"></div>
      <button id="improve-accept" class="wood-btn">✔ Accept &amp; continue</button>
    </div>
  </div>

  <!-- ===== Shovel modal (pick the plant to remove on the board) ===== -->
  <div id="shovel-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box improve-box">
      <h2>↩️ Send a defender home</h2>
      <p class="mini-desc">Tap a defender on the board to remove it and free its tile.</p>
      <div id="shovel-list" class="improve-list"></div>
      <div id="shovel-note" class="scenario-note"></div>
      <button id="shovel-accept" class="wood-btn">✔ Done</button>
    </div>
  </div>

  <!-- ===== Quiz modal ===== -->
  <div id="quiz-modal" class="modal-backdrop hidden">
    <div class="quiz-box panel-wood">
      <div id="quiz-topic" class="quiz-topic">📘 Present Simple</div>
      <div id="quiz-for" class="quiz-for hidden">👤 For …</div>
      <div id="quiz-kind" class="quiz-kind hidden">✏️ Complete the sentence</div>
      <div id="quiz-question" class="quiz-question">She ____ to school every day.</div>
      <div id="quiz-options" class="quiz-options"></div>
      <div id="quiz-feedback" class="quiz-feedback hidden"></div>
      <div id="quiz-explain" class="quiz-explain hidden"></div>
      <div class="quiz-actions">
        <button id="quiz-skip" class="wood-btn small hidden" title="Draw a different question on the same topic">🔄 Change question</button>
        <button id="quiz-why" class="wood-btn small hidden">💡 Why?</button>
        <button id="quiz-continue" class="wood-btn hidden">Continue</button>
      </div>
    </div>
  </div>

  <!-- ===== Pause ===== -->
  <div id="pause-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box">
      <h2>⏸ Paused</h2>
      <button id="btn-resume" class="wood-btn">▶ Resume</button>
      <button id="btn-restart" class="wood-btn">🔄 Restart stage</button>
      <button id="btn-quit" class="wood-btn">🏠 Main menu</button>
    </div>
  </div>

  <!-- ===== End of game ===== -->
  <div id="end-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box">
      <h2 id="end-title">Victory!</h2>
      <div id="end-stars" class="end-stars"></div>
      <div id="end-stats" class="end-stats"></div>
      <button id="btn-next" class="wood-btn">➡ Next stage</button>
      <button id="btn-retry" class="wood-btn">🔄 Play again</button>
      <button id="btn-end-menu" class="wood-btn">🏠 Menu</button>
    </div>
  </div>

  <!-- ===== How to play ===== -->
  <div id="how-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box how-box">
      <h2>📖 How to play</h2>
      <ul class="how-list">
        <li>💡 <strong>Collect ideas</strong> by tapping them: they drop from above and your Lumi lamps make more.</li>
        <li>🛡️ <strong>Pick a card</strong> and tap a tile of the yard to place a defender.</li>
        <li>❓ To place one you must <strong>answer an English question</strong>. Right → your defender arrives! Wrong → you lose the ideas, see the explanation and try again. (Lumi lamps need no question.)</li>
        <li>⬆ <strong>Improve</strong> opens the board: pick a defender and answer to level it up — <b>LVL 2</b> (more shots, stronger) → <b>LVL 3 MAX</b>.</li>
        <li>🚁 <strong>Drone Riders</strong> fly over everything. Only <b>Coach Volley</b> can bring them down — they only appear if he is in your team.</li>
        <li>🔥 <strong>Streak:</strong> every 3 right answers in a row earns bonus ideas.</li>
        <li>🏫 Don't let the distractions reach the school. The <strong>flying books</strong> are your last defence (one per lane).</li>
        <li>↩️ Use <strong>Remove</strong> to send a defender home and free the tile.</li>
        <li>⭐ Earn up to 3 stars per unit based on your English accuracy.</li>
        <li>📚 <strong>Book Blitz:</strong> no defenders — each right answer launches a flying book down the most crowded lane. Three in a row sweeps all five.</li>
        <li>🔊 <strong>Boss Exam:</strong> a duel of answers against El Duro. Right answers hit him; wrong answers let him push forward.</li>
        <li>📖 <strong>Almanac:</strong> tap any card to see full stats — stamina, power, range and what each level costs and gives you.</li>
      </ul>
      <button id="btn-how-close" class="wood-btn">Got it!</button>
    </div>
  </div>

  <!-- ===== Modo pantalla central: vista del alumno en su teléfono =====
       El juego corre en el proyector; aquí sólo se espera turno y se responde. -->
  <div id="screen-student" class="screen student-screen">
    <div class="student-inner">
      <div class="student-top">
        <span id="student-who" class="student-who">👤 —</span>
        <button id="btn-student-exit" class="wood-btn small">🚪 Leave</button>
      </div>

      <div id="student-wait" class="student-wait">
        <div class="sw-icon">⏳</div>
        <h2 id="student-wait-title">Waiting for your turn…</h2>
        <p id="student-wait-sub">Watch the big screen. Your question will appear here.</p>
      </div>

      <div id="student-quiz" class="student-quiz hidden">
        <div id="student-topic" class="student-topic">📘 —</div>
        <div id="student-kind" class="student-kind">✏️ Complete the sentence</div>
        <div id="student-question" class="student-question">…</div>
        <div id="student-options" class="student-options"></div>
        <div id="student-feedback" class="student-feedback hidden"></div>
      </div>
    </div>
  </div>

  <!-- ===== Mix: varios niveles CEFR, sus unidades y sus temas ===== -->
  <div id="mix-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box mix-box">
      <h2>🧩 Build your own mix</h2>
      <p class="mini-desc">Pick the CEFR levels you want. Then open a level to choose its units,
        and a unit to choose its grammar topics. Everything you leave ticked goes into the battle.</p>
      <div id="mix-levels" class="mix-levels"></div>
      <div id="mix-body" class="mix-body"></div>
      <div id="mix-note" class="scenario-note"></div>
      <button id="btn-mix-play" class="wood-btn">▶ Continue</button>
      <button id="btn-mix-close" class="wood-btn small">Cancel</button>
    </div>
  </div>

  <!-- ===== Unit picker: play a level with several units at once ===== -->
  <div id="units-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box units-box">
      <h2>🎯 Choose units</h2>
      <p class="mini-desc">Tick the units you want in this battle. Questions come only from
        what you tick — nothing else from the level gets in.</p>
      <div id="units-grid" class="units-grid"></div>
      <div id="units-note" class="scenario-note"></div>
      <div class="units-actions">
        <button id="btn-units-all" class="wood-btn small">Select all</button>
        <button id="btn-units-none" class="wood-btn small">Clear</button>
      </div>
      <button id="btn-units-play" class="wood-btn">▶ Continue</button>
      <button id="btn-units-close" class="wood-btn small">Cancel</button>
    </div>
  </div>

  <!-- ===== Almanac (plant & zombie descriptions) ===== -->
  <div id="almanac-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box almanac-box">
      <h2>📚 Almanac</h2>
      <div class="almanac-tabs">
        <button id="alm-tab-plants" class="wood-btn small almanac-tab selected">🛡️ Defenders</button>
        <button id="alm-tab-zombies" class="wood-btn small almanac-tab">📱 Distractions</button>
      </div>
      <div id="almanac-list" class="almanac-list"></div>
      <!-- Ficha técnica de la carta seleccionada (daño, vida, alcance, mejoras) -->
      <div id="almanac-detail" class="almanac-detail hidden"></div>
      <button id="btn-almanac-close" class="wood-btn">Close</button>
    </div>
  </div>

  <!-- ===== Progress ===== -->
  <div id="stats-modal" class="modal-backdrop hidden">
    <div class="panel-wood dialog-box">
      <h2>📊 My progress</h2>
      <div id="stats-body" class="end-stats"></div>
      <button id="btn-stats-close" class="wood-btn">Close</button>
    </div>
  </div>

  `;
