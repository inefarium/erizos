/* =====================================================================
   FLORCITA_AMARILLA.JS  (tema-plugin)
   -----------------------------------------------------------------
   Se registra solo en el menú de opciones-temas.js mediante
   window.OpcionesTemas.registrarTema(...). No toca opciones-temas.js
   ni regalo-cosmico.js: es un archivo independiente.

   Requiere que opciones-temas.js esté cargado ANTES que este archivo:
     <script src="opciones-temas.js"></script>
     <script src="regalo-cosmico.js"></script>     (opcional)
     <script src="florcita_amarilla.js"></script>

   Comportamiento:
   - Una florcita amarilla, dibujada como un modelo 3D real (wireframe
     holografico neon, mismo motor de proyeccion que el regalo cosmico
     pero con geometria de petalos) gira sobre si misma y flota detras
     del texto principal.
   - Mientras esta activa se apaga el corazon 3D (igual que "Mi Prenovia"
     y "Regalo Cosmico").
   - Casi siempre que se toca la flor (o cerca de ella), la florcita
     "esquiva": suelta un mensajito gracioso y reaparece en otro lugar
     de la pantalla.
   - De vez en cuando (al azar) SI se deja tocar: suelta un mensaje
     final, y como sorpresa aparecen muchas florcitas pequeñas por toda
     la pantalla... que luego desaparecen todas de golpe, de sorpresa.
   ===================================================================== */

(function () {
  "use strict";

  if (!window.OpcionesTemas) {
    console.error('[florcita_amarilla] opciones-temas.js debe cargarse ANTES que este archivo.');
    return;
  }

  /* ---------- 1. ESTILOS ------------------------------------------------ */
  const estilos = document.createElement('style');
  estilos.textContent = `
    .overlay-florcita { display: none; }   /* cada hijo fixed usa su propio z-index */

    /* ----- La florcita (boton invisible + canvas 3D) ----- */
    .florcita-amarilla-tema {
      position: fixed;
      left: 0; top: 0;
      width: clamp(200px, 40vmin, 320px);
      margin: 0; padding: 0;
      border: none;
      background: transparent;
      z-index: 4;                      /* detras del texto (5), como el regalo */
      opacity: 0;
      transform: scale(0.3);
      filter: blur(6px);
      transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.2, 1.3, 0.4, 1), filter 0.5s ease;
    }
    .florcita-amarilla-tema.visible {
      opacity: 1;
      transform: scale(1);
      filter: blur(0);
    }
    /* "Atrapada": se deja apretar de verdad -> efecto de compresion/pop.
       Este efecto SOLO se usa cuando realmente se deja atrapar. */
    .florcita-amarilla-tema.pop .flotar-florcita-tema {
      animation: popFlorcita 0.35s ease-out;
    }
    @keyframes popFlorcita {
      0%   { transform: scale(1) rotate(0deg); }
      45%  { transform: scale(1.14) rotate(6deg); }
      100% { transform: scale(1) rotate(0deg); }
    }

    /* "Esquive": UN solo gesto continuo (no dos etapas): se desliza
       hacia un lado y se desvanece a la vez, sin compresion (no debe
       verse como si la estuvieran presionando). Va en el elemento
       completo (no solo el interior) para que el deslizamiento y el
       desvanecido queden pegados en la misma animacion.
       OJO: esta duracion (0.46s) debe coincidir con la constante JS
       DURACION_ANIM_ESQUIVE mas abajo. */
    .florcita-amarilla-tema.esquivo {
      animation: esquivarYDesvanecerFlorcita 0.46s cubic-bezier(0.3, 0, 0.35, 1) forwards;
    }
    .florcita-amarilla-tema.esquivo .flotar-florcita-tema {
      animation-play-state: paused;   /* que no compita con el flotecito de fondo */
    }
    @keyframes esquivarYDesvanecerFlorcita {
      0%   { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; filter: blur(0); }
      45%  { transform: translate(calc(var(--esq-x, 90px) * 0.55), calc(var(--esq-y, -20px) * 0.55)) scale(0.85, 1.06) rotate(var(--esq-r, 16deg)); opacity: 0.85; }
      100% { transform: translate(var(--esq-x, 90px), var(--esq-y, -20px)) scale(0.3) rotate(var(--esq-r, 16deg)); opacity: 0; filter: blur(5px); }
    }

    .flotar-florcita-tema {
      display: block;
      animation: flotarFlorcitaTema 3.8s ease-in-out infinite;
    }
    @keyframes flotarFlorcitaTema {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50%      { transform: translateY(-9px) rotate(2deg); }
    }

    .florcita-lienzo3d {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 1 / 1;
      filter: drop-shadow(0 0 10px rgba(255, 214, 10, 0.5)) drop-shadow(0 0 24px rgba(255, 170, 0, 0.35));
      animation: parpadeoHologramaFlor 4s infinite;
    }
    @keyframes parpadeoHologramaFlor {
      0%, 100% { opacity: 1; }
      92%      { opacity: 1; }
      93%      { opacity: 0.55; }
      94%      { opacity: 1; }
      96%      { opacity: 0.72; }
      97%      { opacity: 1; }
    }

    /* ----- Mensaje / burbuja de la florcita ----- */
    .mensaje-florcita {
      position: fixed;
      z-index: 8;
      max-width: min(78vw, 320px);
      transform: translate(-50%, -100%) scale(0.4);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.2, 1.3, 0.4, 1);
    }
    .mensaje-florcita.activa {
      opacity: 1;
      transform: translate(-50%, -100%) scale(1);
    }
    .globo-mensaje-florcita {
      position: relative;
      padding: 0.7em 1em;
      border: 1px solid #ffe135;
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(255, 225, 53, 0.12), rgba(255, 154, 0, 0.08)), #05050d;
      box-shadow: 0 0 10px rgba(255, 214, 10, 0.55), 0 0 24px rgba(255, 154, 0, 0.22), inset 0 0 14px rgba(255, 214, 10, 0.12);
      font-family: 'Courier New', monospace;
      font-size: 0.86rem;
      line-height: 1.4em;
      letter-spacing: 0.3px;
      color: #ffe135;
      text-shadow: 0 0 6px rgba(255, 214, 10, 0.8);
      text-align: center;
    }
    .globo-mensaje-florcita::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: -8px;
      width: 14px; height: 14px;
      margin-left: -7px;
      background: inherit;
      border-right: 1px solid #ffe135;
      border-bottom: 1px solid #ffe135;
      transform: rotate(45deg);
      border-radius: 0 0 3px 0;
    }
    .mensaje-florcita.final .globo-mensaje-florcita {
      border-color: #ff00c8;
      color: #ffe9a8;
      font-size: 0.95rem;
      box-shadow: 0 0 12px rgba(255, 0, 200, 0.5), 0 0 28px rgba(255, 214, 10, 0.35);
    }
    .mensaje-florcita.final .globo-mensaje-florcita::after {
      border-color: #ff00c8;
    }

    /* ----- Sorpresa: muchas florcitas pequeñas ----- */
    .capa-sorpresa-florcita {
      position: fixed;
      inset: 0;
      z-index: 9;
      pointer-events: none;
    }
    .mini-flor-sorpresa {
      position: absolute;
      width: 34px; height: 34px;
      opacity: 0;
      transform: scale(0) rotate(0deg);
      filter: drop-shadow(0 0 6px rgba(255, 214, 10, 0.8));
    }
    .mini-flor-sorpresa.aparecer {
      animation: aparecerMiniFlor 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) forwards;
    }
    .mini-flor-sorpresa.desaparecer {
      animation: desaparecerMiniFlor 0.5s ease-in forwards;
    }
    @keyframes aparecerMiniFlor {
      0%   { opacity: 0; transform: scale(0) rotate(-30deg); }
      60%  { opacity: 1; transform: scale(1.25) rotate(10deg); }
      100% { opacity: 1; transform: scale(1) rotate(0deg); }
    }
    @keyframes desaparecerMiniFlor {
      0%   { opacity: 1; transform: scale(1) rotate(0deg); }
      100% { opacity: 0; transform: scale(0) rotate(40deg); }
    }

    #canvasFlorcitaParticulas {
      position: fixed;
      left: 0; top: 0;
      z-index: 7;
      pointer-events: none;
    }
  `;
  document.head.appendChild(estilos);

  /* ---------- 2. HTML: canvas de particulas + flor + mensaje + sorpresa - */
  const overlayFlorcita = document.createElement('div');
  overlayFlorcita.className = 'overlay-florcita';
  overlayFlorcita.id = 'overlayFlorcita';
  overlayFlorcita.innerHTML = `
    <canvas id="canvasFlorcitaParticulas" aria-hidden="true"></canvas>

    <div class="florcita-amarilla-tema" id="florcitaAmarillaTema" aria-hidden="true">
      <span class="flotar-florcita-tema">
        <canvas class="florcita-lienzo3d" id="florcitaLienzo3D" width="300" height="300" aria-hidden="true"></canvas>
      </span>
    </div>

    <div class="mensaje-florcita" id="mensajeFlorcita">
      <div class="globo-mensaje-florcita" id="globoMensajeFlorcita"></div>
    </div>

    <div class="capa-sorpresa-florcita" id="capaSorpresaFlorcita"></div>
  `;
  document.body.appendChild(overlayFlorcita);

  const florcitaEl   = overlayFlorcita.querySelector('#florcitaAmarillaTema');
  const lienzoFlor    = overlayFlorcita.querySelector('#florcitaLienzo3D');
  const ctxFlorLienzo = lienzoFlor.getContext('2d');
  const mensajeFlor   = overlayFlorcita.querySelector('#mensajeFlorcita');
  const globoFlor     = overlayFlorcita.querySelector('#globoMensajeFlorcita');
  const capaSorpresa  = overlayFlorcita.querySelector('#capaSorpresaFlorcita');
  const canvasFlorFx  = overlayFlorcita.querySelector('#canvasFlorcitaParticulas');
  const ctxFlorFx     = canvasFlorFx.getContext('2d');
  const contenedorMenu = window.OpcionesTemas.contenedorMenu;

  /* ---------- Frases (edita estas listas a gusto) ------------------------ */
  const FRASES_ESQUIVAS = [
    '¡Nop! Muy lenta :3',
    '¡Casi! pero no jeje',
    'Esta florcita es escurridiza eh',
    '¡Ups, se me escapo! ME ESCAPO',
    'Intenta de nuevooOOO',
    'Tocame.... Tocame....',
    'Florcita nivel ninja activado',
    'Ni cerca... vuelve a intentar chamoy',
    'Esa mano no llega tan lejos, ajuaaa'
  ];

  const FRASES_FINALES = [
    'Ok ok, me dejo atrapar... ¡ERES UNA CHAMOY! 💕',
    'Ganaste esta vez, muacksito:3',
    'Uy que veloz!! me tienes:3',
    '¡Me atrapaste! LLUEVEN FLORCITAS'
  ];

  const PROB_DEJARSE_FLOR = 0.25;   // ~25% de las veces se deja tocar

  /* ---------- Utilidades de temporizadores -------------------------------- */
  let estadoFlor = 'apagado';       // apagado | ocupado | quieta
  let posXFlor = 0, posYFlor = 0;
  let temporizadoresFlor = [];

  function programarFlor(fn, ms) {
    const id = setTimeout(fn, ms);
    temporizadoresFlor.push(id);
    return id;
  }
  function cancelarTemporizadoresFlor() {
    temporizadoresFlor.forEach(clearTimeout);
    temporizadoresFlor = [];
  }

  let mazoEsquivas = [];
  function siguienteFraseEsquiva() {
    if (!mazoEsquivas.length) mazoEsquivas = FRASES_ESQUIVAS.slice().sort(() => Math.random() - 0.5);
    return mazoEsquivas.pop();
  }
  function fraseFinalAlAzar() {
    return FRASES_FINALES[(Math.random() * FRASES_FINALES.length) | 0];
  }

  /* =====================================================================
     MOTOR 3D DE LA FLOR  (canvas 2D + proyeccion propia, sin librerias)
     -----------------------------------------------------------------
     Igual filosofia que el motor del regalo cosmico: puntos (x,y,z)
     reales que se rotan sobre el eje Y y se proyectan con perspectiva,
     dibujados como wireframe/relleno holografico neon. Aqui la
     geometria es una flor: un anillo de petalos internos (mas
     verticales) y uno externo (mas abiertos), un centro tipo esfera de
     alambre, y un tallo corto.
     ===================================================================== */
  const VEL_GIRO_FLOR = 0.55;
  const INCLINACION_FLOR = 0.5;
  const DIST_CAMARA_FLOR = 6.5;
  const COL_FLOR = {
    y: [255, 225, 60],     // amarillo brillante (petalos internos)
    g: [255, 170, 20],     // dorado/naranja (petalos externos)
    w: [255, 250, 210]     // casi blanco calido (centro / brillos)
  };

  function girarZ(p, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
  }
  function girarY(p, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  }

  const MODELO_FLOR = (function () {
    const grupo = { caras: [], lineas: [] };
    const cara  = (pts, col, a) => grupo.caras.push({ p: pts, col, a });
    const linea = (pts, col, fino, cerrado) => grupo.lineas.push({ p: pts, col, fino: !!fino, cerrado: !!cerrado });

    /* Un petalo: silueta local a lo largo de +X, luego se inclina
       (rotZ) y se reparte alrededor (rotY). */
    function agregarPetalo(largo, ancho, elevacion, azimut, col, alfaCara) {
      const forma = [
        [0, 0], [0.16 * largo, 0.42 * ancho], [0.55 * largo, 0.55 * ancho],
        [1.0 * largo, 0], [0.55 * largo, -0.55 * ancho], [0.16 * largo, -0.42 * ancho]
      ];
      const pts = forma.map(([x, z]) => girarY(girarZ([x, 0, z], elevacion), azimut));
      cara(pts, col, alfaCara);
      linea(pts, col, false, true);
    }

    /* Centro tipo "esfera de alambre": un ecuador + dos meridianos,
       igual espiritu que el icono geodesico del boton de opciones. */
    function agregarCentro(radio) {
      const N = 14;
      const anillo = (fn) => {
        const pts = [];
        for (let i = 0; i <= N; i++) pts.push(fn((i / N) * Math.PI * 2));
        return pts;
      };
      linea(anillo((t) => [radio * Math.cos(t), 0.02, radio * Math.sin(t)]), 'w', true, true);
      linea(anillo((t) => [radio * Math.cos(t), radio * Math.sin(t), 0]), 'w', true, true);
      linea(anillo((t) => [0, radio * Math.sin(t), radio * Math.cos(t)]), 'y', true, true);
      const disco = [];
      for (let i = 0; i < N; i++) disco.push([radio * 0.7 * Math.cos((i / N) * Math.PI * 2), 0.02, radio * 0.7 * Math.sin((i / N) * Math.PI * 2)]);
      cara(disco, 'w', 0.5);
    }

    /* Tallo corto: un par de segmentos con leve curva. */
    function agregarTallo() {
      const pts = [[0, -0.05, 0], [0.05, -0.55, 0.02], [-0.02, -1.05, -0.02]];
      linea(pts, 'g', true, false);
      linea(pts.map((p) => [p[0] + 0.03, p[1], p[2] - 0.03]), 'g', true, false);
    }

    /* Anillo externo: petalos mas largos y abiertos (dorado) */
    const nExt = 10;
    for (let i = 0; i < nExt; i++) {
      agregarPetalo(1.0, 0.34, 0.42, (i / nExt) * Math.PI * 2, 'g', 0.5);
    }
    /* Anillo interno: petalos mas cortos y erguidos (amarillo vivo) */
    const nInt = 8;
    for (let i = 0; i < nInt; i++) {
      agregarPetalo(0.62, 0.26, 0.98, (i / nInt) * Math.PI * 2 + 0.35, 'y', 0.6);
    }

    agregarTallo();
    agregarCentro(0.22);

    return grupo;
  })();

  /* ---- Estado y matematicas del render ---- */
  let anguloFlor = 0.6;
  let rafFlor = null;
  let tFlorAnt = 0;
  let _Tf = null, _uf = 1, _cxf = 0, _cyf = 0;

  const rgbaFlor = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
  const aclararFlor = (c) => [c[0] + (255 - c[0]) * 0.4, c[1] + (255 - c[1]) * 0.4, c[2] + (255 - c[2]) * 0.4].map(Math.round);
  const profundidadFlor = (z) => 0.35 + 0.65 * Math.min(Math.max(0.5 + 0.5 * z / 1.4, 0), 1);

  function aVistaFlor(p) {
    const X = p[0] * _Tf.ca + p[2] * _Tf.sa;
    const Z = -p[0] * _Tf.sa + p[2] * _Tf.ca;
    return [X, p[1] * _Tf.cp - Z * _Tf.sp, p[1] * _Tf.sp + Z * _Tf.cp];
  }
  function aPantallaFlor(v) {
    const k = DIST_CAMARA_FLOR / (DIST_CAMARA_FLOR - v[2]);
    return [_cxf + v[0] * _uf * k, _cyf - v[1] * _uf * k];
  }

  function trazoNeonFlor(c, ps, col, w, alfa, cerrado) {
    c.beginPath();
    c.moveTo(ps[0][0], ps[0][1]);
    for (let i = 1; i < ps.length; i++) c.lineTo(ps[i][0], ps[i][1]);
    if (cerrado) c.closePath();
    c.strokeStyle = rgbaFlor(col, alfa * 0.22);
    c.lineWidth = w * 3.6;
    c.stroke();
    c.strokeStyle = rgbaFlor(aclararFlor(col), alfa);
    c.lineWidth = w;
    c.stroke();
  }

  function dibujarGrupoFlor(c, g, W) {
    const wBase = Math.max(1.2, W * 0.0072);
    for (let i = 0; i < g.caras.length; i++) {
      const f = g.caras[i];
      let zs = 0;
      const ps = [];
      for (let j = 0; j < f.p.length; j++) {
        const v = aVistaFlor(f.p[j]);
        zs += v[2];
        ps.push(aPantallaFlor(v));
      }
      const a = f.a * profundidadFlor(zs / f.p.length);
      c.beginPath();
      c.moveTo(ps[0][0], ps[0][1]);
      for (let j = 1; j < ps.length; j++) c.lineTo(ps[j][0], ps[j][1]);
      c.closePath();
      c.fillStyle = rgbaFlor(COL_FLOR[f.col], a);
      c.fill();
    }
    for (let i = 0; i < g.lineas.length; i++) {
      const l = g.lineas[i];
      let zs = 0;
      const ps = [];
      for (let j = 0; j < l.p.length; j++) {
        const v = aVistaFlor(l.p[j]);
        zs += v[2];
        ps.push(aPantallaFlor(v));
      }
      const a = 0.95 * profundidadFlor(zs / l.p.length);
      trazoNeonFlor(c, ps, COL_FLOR[l.col], l.fino ? wBase * 0.6 : wBase, a, l.cerrado);
    }
  }

  function cuadroFlor(ahora) {
    rafFlor = requestAnimationFrame(cuadroFlor);
    const dt = Math.min(Math.max((ahora - tFlorAnt) / 1000, 0), 0.05);
    tFlorAnt = ahora;

    const W = lienzoFlor.clientWidth;
    if (!W) return;
    const c = ctxFlorLienzo;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(W * dpr);
    if (lienzoFlor.width !== px) { lienzoFlor.width = px; lienzoFlor.height = px; }
    c.setTransform(px / W, 0, 0, px / W, 0, 0);
    c.clearRect(0, 0, W, W);

    anguloFlor += dt * VEL_GIRO_FLOR;
    _Tf = {
      ca: Math.cos(anguloFlor), sa: Math.sin(anguloFlor),
      cp: Math.cos(INCLINACION_FLOR), sp: Math.sin(INCLINACION_FLOR)
    };
    _uf = W * 0.34;
    _cxf = W / 2;
    _cyf = W * 0.58;

    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    dibujarGrupoFlor(c, MODELO_FLOR, W);

    // Lineas de escaneo holograficas solo sobre el dibujo
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(0,0,0,0.28)';
    const paso = Math.max(3, W * 0.014);
    const desp = (ahora / 45) % paso;
    for (let y = -paso + desp; y < W; y += paso) c.fillRect(0, y, W, paso * 0.4);
    c.globalCompositeOperation = 'source-over';
  }

  function arrancarFlor3D() {
    if (rafFlor) return;
    tFlorAnt = performance.now();
    rafFlor = requestAnimationFrame(cuadroFlor);
  }
  function detenerFlor3D() {
    if (rafFlor) cancelAnimationFrame(rafFlor);
    rafFlor = null;
  }

  /* =====================================================================
     PARTICULAS DORADAS (canvas) - mismo lenguaje visual que la pagina,
     pero en tonos amarillo/dorado en vez de cian/magenta.
     ===================================================================== */
  const TAU = Math.PI * 2;
  const HUES_FLOR = [48, 40];                          // amarillo y dorado
  const GLIFOS_FLOR = '✿❀✧*.01'.split('');
  const particulasFlor = [];
  const anillosFlor = [];
  let anchoFlorFx = 0, altoFlorFx = 0, corriendoFlorFx = false;

  const nFlor = (h, l, a) => 'hsla(' + h + ',100%,' + l + '%,' + a + ')';
  const opuestoFlor = (h) => (h === 48 ? 40 : 48);

  function ajustarCanvasFlorFx() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    anchoFlorFx = window.innerWidth;
    altoFlorFx = window.innerHeight;
    canvasFlorFx.width = anchoFlorFx * dpr;
    canvasFlorFx.height = altoFlorFx * dpr;
    canvasFlorFx.style.width = anchoFlorFx + 'px';
    canvasFlorFx.style.height = altoFlorFx + 'px';
    ctxFlorFx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function elegirTipoParticulaFlor() {
    const r = Math.random();
    if (r < 0.34) return 'raya';
    if (r < 0.56) return 'punto';
    if (r < 0.78) return 'estrella';
    return 'glifo';
  }

  function particulaFlor(x, y, vx, vy, o) {
    o = o || {};
    const tipo = o.tipo || elegirTipoParticulaFlor();
    particulasFlor.push({
      x, y, vx, vy, t: 0,
      dur: o.dur || 55,
      grav: o.grav !== undefined ? o.grav : 0.04,
      roz: o.roz || 0.985,
      hue: o.hue !== undefined ? o.hue : HUES_FLOR[(Math.random() * HUES_FLOR.length) | 0],
      tam: o.tam || 1.3,
      tipo,
      glifo: tipo === 'glifo' ? GLIFOS_FLOR[(Math.random() * GLIFOS_FLOR.length) | 0] : null,
      rot: Math.random() * TAU,
      vrot: (Math.random() - 0.5) * 0.3
    });
    arrancarFlorFx();
  }

  function chispasFlor(x, y, opc) {
    const cantidad = (opc && opc.cantidad) || 26;
    const fuerza = (opc && opc.fuerza) || 1;
    const base = HUES_FLOR[(Math.random() * HUES_FLOR.length) | 0];
    for (let i = 0; i < cantidad; i++) {
      const ang = Math.random() * TAU;
      const vel = (0.6 + Math.random() * 2.2) * fuerza;
      const hue = (Math.random() < 0.7 ? base : opuestoFlor(base)) + (Math.random() * 6 - 3);
      particulaFlor(x, y, Math.cos(ang) * vel, Math.sin(ang) * vel, {
        hue, dur: 45 + Math.random() * 35, tam: 0.8 + Math.random() * 1.1
      });
    }
    anillosFlor.push({ x, y, r: 3, vr: 2 * fuerza, t: 0, dur: 24, hue: base });
    arrancarFlorFx();
  }

  function dibujarPuntoFlor(x, y, s, h, a) {
    const c = ctxFlorFx;
    c.beginPath(); c.arc(x, y, s * 3, 0, TAU); c.fillStyle = nFlor(h, 55, a * 0.16); c.fill();
    c.beginPath(); c.arc(x, y, s, 0, TAU); c.fillStyle = nFlor(h, 65, a); c.fill();
  }
  function dibujarEstrellaFlor(x, y, s, rot, h, a) {
    const c = ctxFlorFx;
    const k = s * 0.2;
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); c.arc(0, 0, s * 0.95, 0, TAU); c.fillStyle = nFlor(h, 58, a * 0.14); c.fill();
    c.beginPath();
    c.moveTo(0, -s); c.lineTo(k, -k); c.lineTo(s, 0); c.lineTo(k, k);
    c.lineTo(0, s);  c.lineTo(-k, k); c.lineTo(-s, 0); c.lineTo(-k, -k);
    c.closePath(); c.fillStyle = nFlor(h, 70, a); c.fill();
    c.restore();
  }
  function dibujarGlifoFlor(x, y, tam, h, a, caracter) {
    const c = ctxFlorFx;
    c.save();
    c.font = Math.round(9 + tam * 5) + 'px "Courier New", monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = nFlor(opuestoFlor(h), 60, a * 0.5);
    c.fillText(caracter, x + 1.4, y);
    c.fillStyle = nFlor(h, 65, a);
    c.fillText(caracter, x - 0.7, y);
    c.restore();
  }

  function arrancarFlorFx() {
    if (!corriendoFlorFx) { corriendoFlorFx = true; requestAnimationFrame(cuadroFlorFx); }
  }

  function cuadroFlorFx() {
    const c = ctxFlorFx;
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(0, 0, anchoFlorFx, altoFlorFx);
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';

    for (let i = particulasFlor.length - 1; i >= 0; i--) {
      const p = particulasFlor[i];
      p.t++;
      if (p.t >= p.dur) { particulasFlor.splice(i, 1); continue; }
      p.vx *= p.roz;
      p.vy = p.vy * p.roz + p.grav;
      p.x += p.vx; p.y += p.vy;
      p.rot += p.vrot;

      const f = p.t / p.dur;
      const a = Math.pow(1 - f, 1.3);
      const h = p.hue;

      if (p.tipo === 'punto') {
        dibujarPuntoFlor(p.x, p.y, p.tam * 1.4, h, a);
      } else if (p.tipo === 'estrella') {
        const brillo = 0.65 + 0.35 * Math.sin(p.t * 0.7 + p.rot);
        dibujarEstrellaFlor(p.x, p.y, p.tam * 3.4, p.rot * 0.2, h, a * brillo);
      } else if (p.tipo === 'glifo') {
        if (Math.random() > 0.1) dibujarGlifoFlor(p.x, p.y, p.tam, h, a, p.glifo);
      } else {
        c.beginPath();
        c.moveTo(p.x - p.vx * 1.7, p.y - p.vy * 1.7);
        c.lineTo(p.x, p.y);
        c.strokeStyle = nFlor(h, 52, a * 0.30);
        c.lineWidth = p.tam * 3.2;
        c.stroke();
        c.strokeStyle = nFlor(h, 70, a);
        c.lineWidth = p.tam;
        c.stroke();
      }
    }

    for (let i = anillosFlor.length - 1; i >= 0; i--) {
      const r = anillosFlor[i];
      r.t++;
      if (r.t >= r.dur) { anillosFlor.splice(i, 1); continue; }
      r.vr *= 0.94;
      r.r += r.vr;
      const a = 1 - r.t / r.dur;
      ctxFlorFx.beginPath();
      ctxFlorFx.ellipse(r.x, r.y, r.r, r.r * 0.38, 0, 0, TAU);
      ctxFlorFx.strokeStyle = nFlor(r.hue, 62, a * 0.85);
      ctxFlorFx.lineWidth = 1.3;
      ctxFlorFx.stroke();
    }

    if (particulasFlor.length || anillosFlor.length) {
      requestAnimationFrame(cuadroFlorFx);
    } else {
      corriendoFlorFx = false;
      ctxFlorFx.globalCompositeOperation = 'source-over';
      ctxFlorFx.clearRect(0, 0, anchoFlorFx, altoFlorFx);
    }
  }

  /* =====================================================================
     POSICION Y CICLO DE VIDA DE LA FLOR EN PANTALLA
     ===================================================================== */
  const MARGEN_FLOR = 14;
  const TOPE_FLOR = 64;
  const MARGEN_BAJO_FLOR = 24;
  const HALO_TOQUE_FLOR = 54;      // "cerca de la flor" = su area + este margen

  /* El texto principal de la pagina vive en ".contenedor" (asi lo deja
     dicho opciones-temas.js: ".contenedor { z-index: 5 }"). Si por
     algun motivo no existe ese selector, simplemente no se evita nada
     (la flor vuelve al comportamiento anterior). */
  const SELECTOR_TEXTO_PRINCIPAL = '.contenedor';
  const MARGEN_TEXTO_PRINCIPAL = 26;

  function rectTextoPrincipal() {
    const el = document.querySelector(SELECTOR_TEXTO_PRINCIPAL);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const m = MARGEN_TEXTO_PRINCIPAL;
    return { left: r.left - m, right: r.right + m, top: r.top - m, bottom: r.bottom + m };
  }
  function seSuperponeConTexto(x, y, w, h, rt) {
    if (!rt) return false;
    return !(x + w < rt.left || x > rt.right || y + h < rt.top || y > rt.bottom);
  }

  function limitesFlor() {
    const w = florcitaEl.offsetWidth, h = florcitaEl.offsetHeight;
    return {
      minX: MARGEN_FLOR,
      maxX: Math.max(window.innerWidth - w - MARGEN_FLOR, MARGEN_FLOR),
      minY: TOPE_FLOR,
      maxY: Math.max(window.innerHeight - h - MARGEN_BAJO_FLOR, TOPE_FLOR)
    };
  }
  function posicionAleatoriaFlor() {
    const L = limitesFlor();
    const w = florcitaEl.offsetWidth, h = florcitaEl.offsetHeight;
    const rt = rectTextoPrincipal();
    const candidatos = [];
    for (let i = 0; i < 26; i++) {
      const x = L.minX + Math.random() * (L.maxX - L.minX);
      const y = L.minY + Math.random() * (L.maxY - L.minY);
      if (!seSuperponeConTexto(x, y, w, h, rt)) candidatos.push({ x, y });
    }
    // Si la pantalla es tan chica que no hay hueco libre, se usa
    // cualquier posicion valida (mejor eso que no aparecer nunca).
    if (!candidatos.length) {
      return { x: L.minX + Math.random() * (L.maxX - L.minX), y: L.minY + Math.random() * (L.maxY - L.minY) };
    }
    // Entre los huecos libres, preferir los mas lejanos a donde estaba
    // (para que se note el "salto"), sin ser siempre el mismo.
    candidatos.sort((a, b) =>
      Math.hypot(b.x - posXFlor, b.y - posYFlor) - Math.hypot(a.x - posXFlor, a.y - posYFlor)
    );
    const mejores = candidatos.slice(0, Math.max(1, Math.ceil(candidatos.length / 2)));
    return mejores[(Math.random() * mejores.length) | 0];
  }
  function colocarFlor(x, y) {
    posXFlor = x; posYFlor = y;
    florcitaEl.style.left = x + 'px';
    florcitaEl.style.top = y + 'px';
  }
  function centroFlor() {
    const r = florcitaEl.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function cercaDeLaFlor(e) {
    const r = florcitaEl.getBoundingClientRect();
    const m = HALO_TOQUE_FLOR;
    return e.clientX >= r.left - m && e.clientX <= r.right + m &&
           e.clientY >= r.top - m && e.clientY <= r.bottom + m;
  }

  function aparecerFlor() {
    const p = posicionAleatoriaFlor();
    colocarFlor(p.x, p.y);
    void florcitaEl.offsetWidth;
    florcitaEl.classList.add('visible');
    estadoFlor = 'quieta';
    const c = centroFlor();
    chispasFlor(c.x, c.y, { cantidad: 14, fuerza: 0.45 });
  }

  /* ---------- Mensajito (burbuja) ---------- */
  function mostrarMensajeFlor(texto, x, y, esFinal) {
    globoFlor.textContent = texto;
    mensajeFlor.classList.toggle('final', !!esFinal);
    const w = mensajeFlor.offsetWidth || 220;
    const clampX = Math.min(Math.max(x, w / 2 + 8), window.innerWidth - w / 2 - 8);
    const clampY = Math.min(Math.max(y, 70), window.innerHeight - 12);
    mensajeFlor.style.left = clampX + 'px';
    mensajeFlor.style.top = clampY + 'px';
    void mensajeFlor.offsetWidth;
    mensajeFlor.classList.add('activa');
  }
  function ocultarMensajeFlor() {
    mensajeFlor.classList.remove('activa', 'final');
  }

  /* ---------- La flor esquiva el toque -----------------------------
     UN solo gesto: se desliza hacia un lado (izquierda o derecha, al
     azar) y se desvanece en el mismo movimiento. No debe parecer que
     la estan presionando (eso es exclusivo de "dejarse atrapar").

     Tiempos separados a proposito, para que sean faciles de ajustar:
       DURACION_ANIM_ESQUIVE      -> debe ser IGUAL al "0.46s" del CSS
                                      de arriba (.florcita-amarilla-tema.esquivo).
                                      No la toques para "alargar el mensaje":
                                      es solo la duracion del gesto de escape.
       DURACION_MENSAJE_ESQUIVE   -> CUANTO TIEMPO SE VE EL MENSAJITO.
                                      Este es el que subes si quieres que
                                      los mensajes duren mas.
       PAUSA_ANTES_REAPARECER_ESQ -> pausa extra (con la flor ya oculta y
                                      sin mensaje) antes de reaparecer en
                                      otro lugar. */
  const DURACION_ANIM_ESQUIVE = 460;         // = 0.46s del keyframe CSS
  const DURACION_MENSAJE_ESQUIVE = 1800;     // cuanto dura visible el mensaje de esquive
  const PAUSA_ANTES_REAPARECER_ESQ = 300;    // pausa extra antes de reaparecer

  function esquivarFlor() {
    estadoFlor = 'ocupado';
    const c = centroFlor();

    const lado = Math.random() < 0.5 ? -1 : 1;
    const dx = lado * (85 + Math.random() * 55);
    const dy = -(14 + Math.random() * 34);
    const rot = lado * (14 + Math.random() * 12);
    florcitaEl.style.setProperty('--esq-x', dx.toFixed(1) + 'px');
    florcitaEl.style.setProperty('--esq-y', dy.toFixed(1) + 'px');
    florcitaEl.style.setProperty('--esq-r', rot.toFixed(1) + 'deg');
    florcitaEl.classList.add('esquivo');

    chispasFlor(c.x, c.y, { cantidad: 20, fuerza: 0.6 });
    mostrarMensajeFlor(siguienteFraseEsquiva(), c.x, c.y - 46, false);

    // Al terminar el deslizamiento+desvanecido ya esta invisible: recien
    // ahi se limpia (sin que se note ningun "reset" visual, porque ya
    // estaba en opacidad 0).
    programarFlor(() => {
      florcitaEl.classList.remove('esquivo', 'visible');
    }, DURACION_ANIM_ESQUIVE);

    programarFlor(() => {
      ocultarMensajeFlor();
    }, DURACION_MENSAJE_ESQUIVE);

    programarFlor(() => {
      aparecerFlor();
    }, DURACION_MENSAJE_ESQUIVE + PAUSA_ANTES_REAPARECER_ESQ);
  }

  /* ---------- La flor se deja atrapar: mensaje final + sorpresa -----
     Mismo criterio: tiempos con nombre para ajustar facil.
       RETRASO_SORPRESA_FINAL     -> cuando arrancan las mini florcitas
                                      (mientras el mensaje sigue visible).
       DURACION_MENSAJE_FINAL     -> CUANTO TIEMPO SE VE EL MENSAJE FINAL.
                                      Sube este si quieres que dure mas.
       PAUSA_ANTES_REAPARECER_FIN -> pausa extra antes de reaparecer. */
  const RETRASO_SORPRESA_FINAL = 1800;
  const DURACION_MENSAJE_FINAL = 3200;
  const PAUSA_ANTES_REAPARECER_FIN = 450;

  function dejarseAtraparFlor() {
    estadoFlor = 'ocupado';
    florcitaEl.classList.add('pop');
    const c = centroFlor();
    chispasFlor(c.x, c.y, { cantidad: 50, fuerza: 1.1 });
    mostrarMensajeFlor(fraseFinalAlAzar(), c.x, c.y - 46, true);

    programarFlor(() => {
      lanzarSorpresaFlor();
    }, RETRASO_SORPRESA_FINAL);

    programarFlor(() => {
      ocultarMensajeFlor();
      florcitaEl.classList.remove('visible');
    }, DURACION_MENSAJE_FINAL);

    programarFlor(() => {
      aparecerFlor();
    }, DURACION_MENSAJE_FINAL + PAUSA_ANTES_REAPARECER_FIN);
  }

  /* SVG de una mini florcita (mismo espiritu que el modelo 3D, pero planito) */
  const SVG_MINI_FLOR =
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
    '<g fill="rgba(255,214,10,0.85)" stroke="#ffe135" stroke-width="2">' +
    '<ellipse cx="50" cy="26" rx="12" ry="20"/>' +
    '<ellipse cx="50" cy="26" rx="12" ry="20" transform="rotate(60 50 50)"/>' +
    '<ellipse cx="50" cy="26" rx="12" ry="20" transform="rotate(120 50 50)"/>' +
    '<ellipse cx="50" cy="26" rx="12" ry="20" transform="rotate(180 50 50)"/>' +
    '<ellipse cx="50" cy="26" rx="12" ry="20" transform="rotate(240 50 50)"/>' +
    '<ellipse cx="50" cy="26" rx="12" ry="20" transform="rotate(300 50 50)"/>' +
    '<circle cx="50" cy="50" r="10" fill="rgba(255,250,210,0.9)" stroke="#ffb100"/>' +
    '</g></svg>';

  function lanzarSorpresaFlor() {
    const cantidad = 26 + ((Math.random() * 14) | 0);
    const elementos = [];
    for (let i = 0; i < cantidad; i++) {
      const el = document.createElement('div');
      el.className = 'mini-flor-sorpresa';
      el.innerHTML = SVG_MINI_FLOR;
      const tam = 22 + Math.random() * 30;
      el.style.width = tam + 'px';
      el.style.height = tam + 'px';
      el.style.left = (Math.random() * (window.innerWidth - tam)) + 'px';
      el.style.top = (Math.random() * (window.innerHeight - tam)) + 'px';
      capaSorpresa.appendChild(el);
      elementos.push(el);
      programarFlor(() => el.classList.add('aparecer'), i * 22);
    }

    // Sostienen un momento a la vista y luego... ¡sorpresa! desaparecen todas
    programarFlor(() => {
      elementos.forEach((el, i) => {
        programarFlor(() => {
          const r = el.getBoundingClientRect();
          chispasFlor(r.left + r.width / 2, r.top + r.height / 2, { cantidad: 8, fuerza: 0.5 });
          el.classList.remove('aparecer');
          el.classList.add('desaparecer');
        }, i * 10);
      });
      programarFlor(() => {
        elementos.forEach((el) => el.remove());
      }, 650);
    }, 1500 + cantidad * 22);
  }

  /* ---------- Escucha de clicks/toques en toda la pagina ---------- */
  document.addEventListener('click', (e) => {
    if (estadoFlor !== 'quieta') return;
    if (contenedorMenu && contenedorMenu.contains(e.target)) return;
    if (!cercaDeLaFlor(e)) return;

    if (Math.random() < PROB_DEJARSE_FLOR) {
      dejarseAtraparFlor();
    } else {
      esquivarFlor();
    }
  }, true);

  /* ---------- Encender / apagar el tema (API del núcleo) --------------- */
  function iniciarFlorcita() {
    overlayFlorcita.style.display = 'block';
    window.OpcionesTemas.ocultarCorazon();
    ajustarCanvasFlorFx();
    florcitaEl.classList.remove('visible', 'pop', 'esquivo');
    ocultarMensajeFlor();
    estadoFlor = 'ocupado';
    anguloFlor = 0.6;
    arrancarFlor3D();
    programarFlor(aparecerFlor, 250);
  }

  function detenerFlorcita() {
    cancelarTemporizadoresFlor();
    detenerFlor3D();
    estadoFlor = 'apagado';
    particulasFlor.length = 0;
    anillosFlor.length = 0;
    overlayFlorcita.style.display = 'none';
    florcitaEl.classList.remove('visible', 'pop', 'esquivo');
    ocultarMensajeFlor();
    capaSorpresa.querySelectorAll('.mini-flor-sorpresa').forEach((el) => el.remove());
    ctxFlorFx.clearRect(0, 0, anchoFlorFx, altoFlorFx);
    window.OpcionesTemas.mostrarCorazon();
  }

  window.addEventListener('resize', () => {
    ajustarCanvasFlorFx();
    if (estadoFlor === 'apagado') return;
    const L = limitesFlor();
    colocarFlor(Math.min(Math.max(posXFlor, L.minX), L.maxX), Math.min(Math.max(posYFlor, L.minY), L.maxY));
  });
  ajustarCanvasFlorFx();

  /* ---------- Registro en el menú (a través del núcleo) ------------------ */
  window.OpcionesTemas.registrarTema({
    id: 'florcita',
    etiqueta: 'Florcita Amarilla',
    activar: iniciarFlorcita,
    desactivar: detenerFlorcita
  });
})();