/* =====================================================================
   REGALO-COSMICO.JS  (tema-plugin)
   -----------------------------------------------------------------
   Se registra solo en el menú de opciones-temas.js mediante
   window.OpcionesTemas.registrarTema(...). No toca opciones-temas.js.

   Requiere que opciones-temas.js esté cargado ANTES que este archivo:
     <script src="opciones-temas.js"></script>
     <script src="regalo-cosmico.js"></script>

   Comportamiento:
   - El regalo aparece en un lugar aleatorio (detrás del texto), mas
     grande que antes y girando en 3D de verdad (dos caras identicas
     pegadas espalda con espalda, cada una con backface-visibility
     oculta: mientras una mira al frente la otra queda escondida, asi
     el giro se ve solido en vez de "aplastarse" como pasa al rotar
     una imagen plana).
   - 1er toque SOBRE el regalo: se abre, salen chispas estilo cyberpunk
     (glifos tipo matrix, pixeles y rombos holograficos) y ~8
     explosiones repartidas por TODA la pantalla, y se despliega la
     hojita con la frase (las frases se editan en FRASES_REGALO).
   - Mientras está abierto: un toque EN CUALQUIER LUGAR de la pantalla
     lo pliega y lo hace reaparecer cerrado en otro lugar.
   - Ya no tiene la sombra/reflejo elíptico del piso.
   ===================================================================== */

(function () {
  "use strict";

  if (!window.OpcionesTemas) {
    console.error('[regalo-cosmico] opciones-temas.js debe cargarse ANTES que este archivo.');
    return;
  }

  /* ---------- 1. ESTILOS ------------------------------------------------ */
  const estilos = document.createElement('style');
  estilos.textContent = `
    /* .overlay-regalo es un contenedor SIN position ni z-index a proposito:
       asi cada hijo (todos fixed) usa su propio z-index contra la pagina:
         regalo = 4  -> detras del texto (que es 5)
         fuegos = 7  -> por encima del texto (pointer-events: none)
         hojita = 8  -> por encima del texto para que se lea            */
    .overlay-regalo { display: none; }

    .regalo-cosmico-tema {
      position: fixed;
      left: 0; top: 0;                       /* JS lo mueve con left/top */
      width: clamp(180px, 36vmin, 280px);     /* mas grande que antes */
      margin: 0; padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      touch-action: manipulation;
      z-index: 4;
      perspective: 900px;
      /* Estado oculto: se "materializa" al agregar .visible */
      opacity: 0;
      transform: scale(0.3);
      filter: blur(6px);
      transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.2, 1.3, 0.4, 1), filter 0.5s ease;
    }
    .regalo-cosmico-tema.visible {
      opacity: 1;
      transform: scale(1);
      filter: blur(0);
    }
    .regalo-cosmico-tema:focus-visible {
      outline: 1px dashed #0ff;
      outline-offset: 6px;
    }

    .flota-regalo-tema {
      display: block;
      transform-style: preserve-3d;   /* deja pasar la perspectiva del boton hasta .regalo-3d-giro */
      animation: flotarRegalo 3.6s ease-in-out infinite;
    }
    @keyframes flotarRegalo {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-8px); }
    }

    /* Giro 3D REAL y HOLOGRAFICO: dos caras identicas (regalo-cara-a / -b)
       pegadas espalda con espalda dentro de un contenedor preserve-3d que
       gira en rotateY. Cada cara tiene backface-visibility: hidden, asi que
       cuando una queda "de espaldas" a la camara desaparece y aparece
       la otra ya de frente: el giro se ve solido, no una imagen plana
       aplastandose. Encima se le suma un barrido de lineas de escaneo y un
       leve pulso de transparencia/color para que, ademas de girar en 3D,
       se LEA como una proyeccion holografica y no como un objeto solido. */
    .regalo-3d-giro {
      position: relative;
      display: block;
      transform-style: preserve-3d;
      animation: girarRegalo3D 9s linear infinite, pulsoHologramaRegalo 2.4s ease-in-out infinite;
    }
    @keyframes girarRegalo3D {
      from { transform: rotateY(0deg); }
      to   { transform: rotateY(360deg); }
    }
    @keyframes pulsoHologramaRegalo {
      0%, 100% { opacity: 0.92; filter: hue-rotate(0deg); }
      50%      { opacity: 1;    filter: hue-rotate(8deg); }
    }
    /* Barrido de lineas de escaneo sobre el regalo (mismo lenguaje visual
       que la hojita), pegado al giro para que viaje "con" el objeto */
    .regalo-3d-giro::before {
      content: "";
      position: absolute;
      inset: -6% -14%;
      background: repeating-linear-gradient(0deg, rgba(120,220,255,0.10) 0, rgba(120,220,255,0.10) 1px, transparent 2px, transparent 4px);
      mix-blend-mode: screen;
      animation: barridoRegalo3D 3.2s linear infinite;
      pointer-events: none;
      z-index: 3;
    }
    @keyframes barridoRegalo3D {
      0%   { transform: translateY(-8%); opacity: 0.35; }
      50%  { opacity: 0.7; }
      100% { transform: translateY(8%); opacity: 0.35; }
    }
    .regalo-cara {
      display: block;
      opacity: 0.94;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .regalo-cara-b {
      position: absolute;
      inset: 0;
      transform: rotateY(180deg);
    }

    .regalo-cosmico-tema svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
      filter: drop-shadow(0 0 10px rgba(255,140,30,0.35)) drop-shadow(0 0 26px rgba(57,168,255,0.28));
      animation: parpadeoHolograma 4.2s infinite;
    }
    .regalo-cosmico-tema:hover svg {
      filter: drop-shadow(0 0 14px rgba(255,140,30,0.6)) drop-shadow(0 0 30px rgba(57,168,255,0.45));
    }
    .regalo-cosmico-tema.pop svg {
      animation: popRegalo 0.4s ease-out, parpadeoHolograma 4.2s infinite;
    }
    @keyframes popRegalo {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.12) rotate(-2deg); }
      100% { transform: scale(1); }
    }

    /* Lineas neon del SVG del regalo */
    .rg-l  { fill: none; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .rg-lf { stroke-width: 1.2; }               /* lineas finas (cintas) */
    .rg-lo { stroke: #ff8a1f; }                 /* naranja */
    .rg-la { stroke: #ffc21a; }                 /* ambar */
    .rg-lb { stroke: #39a8ff; }                 /* azul */
    .rg-lc { stroke: #9fdcff; }                 /* celeste claro (lazo) */

    /* Tapa: se cierra rapido, se abre con rebote */
    .rg-tapa {
      transform-box: fill-box;
      transform-origin: 50% 100%;
      transition: transform 0.35s ease-in;
    }
    .regalo-cosmico-tema.abierto .rg-tapa {
      transform: translate(10px, -46px) rotate(9deg);
      transition: transform 0.8s cubic-bezier(0.3, 1.6, 0.5, 1);
    }

    /* Haz de luz que sale de la caja */
    .rg-luz { opacity: 0; transition: opacity 0.6s ease; }
    .regalo-cosmico-tema.abierto .rg-luz {
      opacity: 1;
      animation: pulsoLuzRegalo 1.6s ease-in-out infinite alternate;
    }
    @keyframes pulsoLuzRegalo {
      from { opacity: 0.72; }
      to   { opacity: 1; }
    }

    /* ----- La hojita con la frase -----
       OJO: el parpadeo (animation sobre opacity) va en .rg-hoja-cara y el
       desplegado en .rg-hoja. Si ambos estuvieran en el mismo elemento, la
       animacion del parpadeo (opacity:1) anularia el opacity:0 inicial y la
       hoja se veria siempre en pantalla. */
    .hoja-regalo-tema {
      position: fixed;
      left: 0; top: 0;
      width: clamp(210px, 72vw, 290px);
      z-index: 8;
      visibility: hidden;
      pointer-events: none;
    }
    .hoja-regalo-tema.activa {
      visibility: visible;
      pointer-events: auto;
      cursor: pointer;
    }

    .rg-hoja {
      transform-origin: var(--origen, 50% 100%);
      transform: scale(0.05);
      opacity: 0;
      filter: drop-shadow(0 0 6px rgba(0,255,255,0.7)) drop-shadow(0 0 18px rgba(255,0,200,0.3));
    }
    .hoja-regalo-tema.abierta .rg-hoja {
      animation: desplegarHojaRegalo 0.95s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .hoja-regalo-tema.cerrando .rg-hoja {
      animation: plegarHojaRegalo 0.4s ease-in forwards;
    }
    @keyframes desplegarHojaRegalo {
      0%   { transform: scale(0.05, 0.05); opacity: 0; }
      25%  { transform: scale(0.05, 0.05); opacity: 1; }
      55%  { transform: scale(1, 0.05);    opacity: 1; }
      100% { transform: scale(1, 1);       opacity: 1; }
    }
    @keyframes plegarHojaRegalo {
      0%   { transform: scale(1, 1);       opacity: 1; }
      60%  { transform: scale(1, 0.05);    opacity: 1; }
      100% { transform: scale(0.05, 0.05); opacity: 0; }
    }

    /* Papel con esquina doblada (dog-ear) recortada con clip-path */
    .rg-hoja-cara {
      position: relative;
      box-sizing: border-box;
      padding: 1.2em 1.1em 1em;
      border: 1px solid #0ff;
      border-radius: 8px 0 8px 8px;
      background: linear-gradient(180deg, rgba(0,255,255,0.08), rgba(255,0,200,0.07)), #05050d;
      clip-path: polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%);
      overflow: hidden;
      animation: parpadeoHolograma 3.6s infinite;
    }
    .rg-hoja-cara::before {                     /* lineas de escaneo */
      content: "";
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(0deg, rgba(0,255,255,0.09) 0, rgba(0,255,255,0.09) 1px, transparent 2px, transparent 4px);
      mix-blend-mode: screen;
      animation: desplazarLineas 5s linear infinite;
      pointer-events: none;
    }
    .rg-hoja-cara::after {                      /* la solapa doblada */
      content: "";
      position: absolute;
      top: 0; right: 0;
      width: 24px; height: 24px;
      background: linear-gradient(225deg, transparent 50%, rgba(0,255,255,0.45) 50%);
    }
    .rg-barrido {
      position: absolute;
      left: 0; width: 100%; height: 40%;
      background: linear-gradient(180deg, transparent 0%, rgba(0,255,255,0.2) 50%, transparent 100%);
      animation: barridoTarjeta 4s ease-in-out infinite;
      pointer-events: none;
    }
    .rg-hoja-titulo {
      position: relative;
      margin: 0 0 0.7em 0;
      font-size: 1rem;
      color: #0ff;
      text-shadow: 0 0 6px #0ff, 0 0 14px #0ff;
      letter-spacing: 2px;
      text-align: center;
    }
    .rg-hoja-frase {
      position: relative;
      margin: 0;
      font-size: 0.88rem;
      line-height: 1.55em;
      color: #ff00c8;
      text-shadow: 0 0 5px #ff00c8;
      text-align: center;
      letter-spacing: 0.4px;
    }
    .rg-hoja-frase .h { visibility: hidden; }   /* texto pendiente: reserva el espacio */
    .rg-hoja-frase .v::after {                  /* cursor parpadeante */
      content: "";
      display: inline-block;
      width: 0.55em; height: 1em;
      margin-left: 1px;
      margin-right: -0.55em;                    /* no ocupa espacio: no cambia el salto de linea */
      vertical-align: -0.15em;
      background: #ff00c8;
      box-shadow: 0 0 6px #ff00c8;
      animation: cursorRegalo 0.7s steps(1) infinite;
    }
    .rg-hoja-frase.fin .v::after { display: none; }
    @keyframes cursorRegalo { 50% { opacity: 0; } }
    .rg-hoja-firma {
      position: relative;
      margin-top: 0.9em;
      font-size: 0.72rem;
      color: #0ff;
      opacity: 0.75;
      text-align: right;
      letter-spacing: 1px;
    }

    /* Canvas de los fuegos artificiales (encima del texto, sin capturar clicks) */
    #canvasRegaloCosmico {
      position: fixed;
      left: 0; top: 0;
      z-index: 7;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .flota-regalo-tema, .regalo-3d-giro, .regalo-cosmico-tema svg, .rg-hoja-cara,
      .rg-hoja-cara::before, .rg-barrido, .regalo-3d-giro::before,
      .regalo-cosmico-tema.abierto .rg-luz { animation: none; }
      .rg-tapa, .regalo-cosmico-tema.abierto .rg-tapa { transition-duration: 0.01s; }
    }
  `;
  document.head.appendChild(estilos);

  /* ---------- 2. HTML: canvas de fuegos + regalo (2 caras SVG) + hojita -
     La caja se repite dos veces (cara A y cara B) con los MISMOS dibujos
     pero ids de <defs> distintos (sufijo "B" en la segunda) para que no
     colisionen los url(#...) dentro del mismo documento. Se le quito la
     elipse de reflejo/sombra del piso que tenia antes. */
  const cajaRegaloSVG = (sufijo) => `
    <svg viewBox="0 -10 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="rgNeon${sufijo}" filterUnits="userSpaceOnUse" x="-20" y="-40" width="240" height="280">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="b1"/>
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="b2"/>
          <feMerge>
            <feMergeNode in="b2"/>
            <feMergeNode in="b1"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="rgLuz${sufijo}" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0"    stop-color="#ffe08a" stop-opacity="0.85"/>
          <stop offset="0.45" stop-color="#39a8ff" stop-opacity="0.28"/>
          <stop offset="1"    stop-color="#ff00c8" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="rgBoca${sufijo}">
          <stop offset="0"   stop-color="#fff2b0" stop-opacity="0.95"/>
          <stop offset="0.5" stop-color="#ffa030" stop-opacity="0.45"/>
          <stop offset="1"   stop-color="#ff8a1f" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="rgIzq${sufijo}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#0d1a3d"/>
          <stop offset="1" stop-color="#070b1c"/>
        </linearGradient>
        <linearGradient id="rgDer${sufijo}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#160a05"/>
          <stop offset="1" stop-color="#2a1205"/>
        </linearGradient>
      </defs>

      <!-- Interior de la caja (paredes del fondo) -->
      <polygon points="100,66 40,96 40,150 100,120"  fill="#3a1a06"/>
      <polygon points="100,66 160,96 160,150 100,120" fill="#4a230a"/>

      <!-- Luz que sale al abrir -->
      <g class="rg-luz">
        <polygon points="48,110 152,110 128,-10 72,-10" fill="url(#rgLuz${sufijo})"/>
        <ellipse cx="100" cy="96" rx="54" ry="25" fill="url(#rgBoca${sufijo})"/>
      </g>

      <!-- CUERPO: caras -->
      <polygon points="40,96 100,126 100,180 40,150"   fill="url(#rgIzq${sufijo})"/>
      <polygon points="100,126 160,96 160,150 100,180" fill="url(#rgDer${sufijo})"/>
      <polygon points="63,107.5 77,114.5 77,168.5 63,161.5"     fill="rgba(57,168,255,0.16)"/>
      <polygon points="123,114.5 137,107.5 137,161.5 123,168.5" fill="rgba(255,138,31,0.16)"/>
      <!-- CUERPO: lineas neon -->
      <g filter="url(#rgNeon${sufijo})">
        <polyline class="rg-l rg-lo" points="40,96 100,66 160,96"/>
        <polyline class="rg-l rg-lo" points="40,96 100,126 160,96"/>
        <line class="rg-l rg-lo" x1="40"  y1="96"  x2="40"  y2="150"/>
        <line class="rg-l rg-lo" x1="160" y1="96"  x2="160" y2="150"/>
        <line class="rg-l rg-lb" x1="100" y1="126" x2="100" y2="180"/>
        <polyline class="rg-l rg-la" points="40,150 100,180 160,150"/>
        <line class="rg-l rg-lf rg-lb" x1="63"  y1="107.5" x2="63"  y2="161.5"/>
        <line class="rg-l rg-lf rg-lb" x1="77"  y1="114.5" x2="77"  y2="168.5"/>
        <line class="rg-l rg-lf rg-lo" x1="123" y1="114.5" x2="123" y2="168.5"/>
        <line class="rg-l rg-lf rg-lo" x1="137" y1="107.5" x2="137" y2="161.5"/>
      </g>

      <!-- TAPA (con el lazo): es lo que vuela al abrir -->
      <g class="rg-tapa">
        <polygon points="40,80 100,110 100,126 40,96"   fill="url(#rgIzq${sufijo})"/>
        <polygon points="100,110 160,80 160,96 100,126" fill="url(#rgDer${sufijo})"/>
        <polygon points="100,50 160,80 100,110 40,80"   fill="#100c14"/>
        <polygon points="137,68.5 77,98.5 63,91.5 123,61.5" fill="rgba(57,168,255,0.16)"/>
        <polygon points="77,61.5 137,91.5 123,98.5 63,68.5" fill="rgba(57,168,255,0.16)"/>
        <polygon points="63,91.5 77,98.5 77,114.5 63,107.5"     fill="rgba(57,168,255,0.16)"/>
        <polygon points="123,98.5 137,91.5 137,107.5 123,114.5" fill="rgba(255,138,31,0.16)"/>
        <g filter="url(#rgNeon${sufijo})">
          <polygon class="rg-l rg-la" points="100,50 160,80 100,110 40,80"/>
          <line class="rg-l rg-lo" x1="40"  y1="80"  x2="40"  y2="96"/>
          <line class="rg-l rg-lo" x1="160" y1="80"  x2="160" y2="96"/>
          <line class="rg-l rg-lb" x1="100" y1="110" x2="100" y2="126"/>
          <polyline class="rg-l rg-lo" points="40,96 100,126 160,96"/>
          <line class="rg-l rg-lf rg-lb" x1="137" y1="68.5" x2="77"  y2="98.5"/>
          <line class="rg-l rg-lf rg-lb" x1="123" y1="61.5" x2="63"  y2="91.5"/>
          <line class="rg-l rg-lf rg-lb" x1="77"  y1="61.5" x2="137" y2="91.5"/>
          <line class="rg-l rg-lf rg-lb" x1="63"  y1="68.5" x2="123" y2="98.5"/>
          <line class="rg-l rg-lf rg-lb" x1="63"  y1="91.5" x2="63"  y2="107.5"/>
          <line class="rg-l rg-lf rg-lb" x1="77"  y1="98.5" x2="77"  y2="114.5"/>
          <line class="rg-l rg-lf rg-lo" x1="123" y1="98.5" x2="123" y2="114.5"/>
          <line class="rg-l rg-lf rg-lo" x1="137" y1="91.5" x2="137" y2="107.5"/>
          <!-- lazo -->
          <path class="rg-l rg-lc" fill="rgba(57,168,255,0.10)" d="M100 74 C82 46, 56 52, 68 66 C75 74, 92 78, 100 74 Z"/>
          <path class="rg-l rg-lc" fill="rgba(57,168,255,0.10)" d="M100 74 C118 46, 144 52, 132 66 C125 74, 108 78, 100 74 Z"/>
          <path class="rg-l rg-lf rg-lb" d="M100 72 C88 56, 74 57, 76 65"/>
          <path class="rg-l rg-lf rg-lb" d="M100 72 C112 56, 126 57, 124 65"/>
          <path class="rg-l rg-lf rg-lc" d="M97 78 C92 86, 86 90, 80 90"/>
          <path class="rg-l rg-lf rg-lc" d="M103 78 C108 86, 114 90, 120 90"/>
          <ellipse class="rg-l rg-lc" cx="100" cy="75" rx="5" ry="3.5"/>
        </g>
      </g>
    </svg>
  `;

  const overlayRegalo = document.createElement('div');
  overlayRegalo.className = 'overlay-regalo';
  overlayRegalo.id = 'overlayRegalo';
  overlayRegalo.innerHTML = `
    <canvas id="canvasRegaloCosmico" aria-hidden="true"></canvas>

    <button class="regalo-cosmico-tema" id="regaloCosmicoTema" type="button" aria-label="Abrir regalo cosmico">
      <span class="flota-regalo-tema">
        <span class="regalo-3d-giro">
          <span class="regalo-cara regalo-cara-a">${cajaRegaloSVG('')}</span>
          <span class="regalo-cara regalo-cara-b">${cajaRegaloSVG('B')}</span>
        </span>
      </span>
    </button>

    <div class="hoja-regalo-tema" id="hojaRegaloTema" aria-live="polite">
      <div class="rg-hoja">
        <div class="rg-hoja-cara">
          <div class="rg-barrido"></div>
          <h2 class="rg-hoja-titulo">✦ MENSAJE CÓSMICO ✦</h2>
          <p class="rg-hoja-frase" id="hojaRegaloFrase"></p>
          <div class="rg-hoja-firma">toca para otro regalo ✦</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlayRegalo);

  /* =====================================================================
     3. Lógica del tema "Regalo Cosmico"
        Estados:  'apagado' -> (elegir tema) 'ocupado' -> 'cerrado'
                  'cerrado' -> (toque en el regalo) 'abierto'
                  'abierto' -> (toque en CUALQUIER lugar) 'ocupado' -> 'cerrado'
     ===================================================================== */

  /* ★ FRASES DEL REGALO  ← EDITA ESTA LISTA CON TUS PROPIAS FRASES
     Salen en orden aleatorio y no se repiten hasta usarlas todas. */
  const FRASES_REGALO = [
    'En este mundo de tibios, tú eres mi chispa favorita.',
    'Si las estrellas supieran cómo brillas, se apagarían de envidia.',
    'Guardé un pedacito de galaxia para dártelo hoy.',
    'Eres mi coincidencia más hermosa en todo el cosmos.',
    'Entre tanto ruido, encontré mi frecuencia favorita: tú.',
    'Hoy el universo conspira para que sonrías.',
    'Mereces un mundo entero, pero por ahora te regalo este destello.',
    'Cada latido mío viaja años luz solo para llegar a ti.',
    'Somos polvo de estrellas, y tú eres la parte que más brilla.',
    'Un deseo, una chispa, un mundo soñado. Todo empieza contigo.',
    'Aunque el mundo esté tibio, a tu lado me erizo de alegría.',
    'Abre el regalo, abre el corazón: el cosmos sabe lo que hace.'
  ];

  const regaloCosmico = overlayRegalo.querySelector('#regaloCosmicoTema');
  const hojaRegalo    = overlayRegalo.querySelector('#hojaRegaloTema');
  const fraseRegalo   = overlayRegalo.querySelector('#hojaRegaloFrase');
  const canvasRegalo  = overlayRegalo.querySelector('#canvasRegaloCosmico');
  const ctxRegalo     = canvasRegalo.getContext('2d');
  const contenedorMenu = window.OpcionesTemas.contenedorMenu;

  const TAU = Math.PI * 2;
  const MARGEN_REGALO = 12;        // margen lateral
  const TOPE_REGALO = 64;          // no pegarse arriba (botón del menú)
  const MARGEN_BAJO_REGALO = 24;

  let estadoRegalo = 'apagado';
  let posXRegalo = 0, posYRegalo = 0;
  let mazoRegalo = [];
  let temporizadoresRegalo = [];
  let tipeoRegalo = null;
  let idFuenteRegalo = null;

  function programarRegalo(fn, ms) {
    const id = setTimeout(fn, ms);
    temporizadoresRegalo.push(id);
    return id;
  }
  function cancelarTemporizadoresRegalo() {
    temporizadoresRegalo.forEach(clearTimeout);
    temporizadoresRegalo = [];
    clearTimeout(tipeoRegalo);
  }

  function siguienteFraseRegalo() {
    if (!mazoRegalo.length) mazoRegalo = FRASES_REGALO.slice().sort(() => Math.random() - 0.5);
    return mazoRegalo.pop();
  }

  /* ---------------- Posicion aleatoria del regalo ---------------- */
  function limitesRegalo() {
    const w = regaloCosmico.offsetWidth, h = regaloCosmico.offsetHeight;
    return {
      minX: MARGEN_REGALO,
      maxX: Math.max(window.innerWidth - w - MARGEN_REGALO, MARGEN_REGALO),
      minY: TOPE_REGALO,
      maxY: Math.max(window.innerHeight - h - MARGEN_BAJO_REGALO, TOPE_REGALO)
    };
  }

  function posicionAleatoriaRegalo() {
    const L = limitesRegalo();
    const lejos = Math.min(window.innerWidth, window.innerHeight) * 0.35;
    let elegida = null;
    for (let i = 0; i < 12; i++) {
      const x = L.minX + Math.random() * (L.maxX - L.minX);
      const y = L.minY + Math.random() * (L.maxY - L.minY);
      if (!elegida) elegida = { x, y };
      if (Math.hypot(x - posXRegalo, y - posYRegalo) > lejos) { elegida = { x, y }; break; }
    }
    return elegida;
  }

  function colocarRegalo(x, y) {
    posXRegalo = x; posYRegalo = y;
    regaloCosmico.style.left = x + 'px';
    regaloCosmico.style.top = y + 'px';
  }

  function centroRegalo() {
    const r = regaloCosmico.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  /* Punto por donde sale la luz (centro de la boca de la caja) */
  function bocaRegalo() {
    const r = regaloCosmico.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.47, esc: Math.max(r.width / 200, 0.7) };
  }

  /* ---------------- Ciclo: aparecer / abrir / viajar ---------------- */
  function aparecerRegalo() {
    const p = posicionAleatoriaRegalo();
    colocarRegalo(p.x, p.y);
    regaloCosmico.classList.remove('abierto');
    void regaloCosmico.offsetWidth;
    regaloCosmico.classList.add('visible');
    estadoRegalo = 'cerrado';
    const c = centroRegalo();
    chispasRegalo(c.x, c.y, { cantidad: 16, fuerza: 0.5 });
  }

  function abrirRegalo() {
    estadoRegalo = 'abierto';
    regaloCosmico.classList.add('abierto', 'pop');
    programarRegalo(() => regaloCosmico.classList.remove('pop'), 420);

    // Estallido en la boca del regalo
    const b = bocaRegalo();
    chispasRegalo(b.x, b.y - 10 * b.esc, { cantidad: 60, fuerza: 1.0 * b.esc + 0.2 });

    // 8 cohetes que explotan repartidos por TODA la pantalla (4 columnas x 2 filas,
    // un punto al azar dentro de cada celda y en orden aleatorio)
    const celdas = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5);
    celdas.forEach((celda, i) => {
      const col = celda % 4, fila = Math.floor(celda / 4);
      const x1 = window.innerWidth * ((col + 0.15 + Math.random() * 0.7) / 4);
      const y1 = window.innerHeight * (0.1 + ((fila + 0.15 + Math.random() * 0.7) / 2) * 0.6);
      programarRegalo(() => {
        if (estadoRegalo !== 'abierto') return;
        const bb = bocaRegalo();
        cohetesRegalo.push({
          x0: bb.x, y0: bb.y, x1, y1, x: bb.x, y: bb.y,
          t: 0, dur: 26 + Math.random() * 10,
          hue: HUES_REGALO[(Math.random() * HUES_REGALO.length) | 0]
        });
        arrancarRegalo();
      }, 120 + i * 170 + Math.random() * 90);
    });

    mostrarHojaRegalo();
    iniciarFuenteRegalo();
  }

  function viajarRegalo() {
    estadoRegalo = 'ocupado';
    detenerFuenteRegalo();
    clearTimeout(tipeoRegalo);

    // 1. Se pliega la hojita y se cierra la tapa
    hojaRegalo.classList.remove('abierta');
    hojaRegalo.classList.add('cerrando');
    regaloCosmico.classList.remove('abierto');
    const c = centroRegalo();
    chispasRegalo(c.x, c.y, { cantidad: 26, fuerza: 0.7 });

    // 2. El regalo se desvanece
    programarRegalo(() => regaloCosmico.classList.remove('visible'), 380);

    // 3. Reaparece cerrado en otro lugar
    programarRegalo(() => {
      hojaRegalo.classList.remove('activa', 'cerrando');
      aparecerRegalo();
    }, 900);
  }

  /* ---------------- Toques ----------------
     El regalo puede quedar DETRAS del texto (.contenedor, z-index 5, puede
     tapar al regalo que es z-index 4), asi que en vez de depender solo del
     click directo sobre el boton, comprobamos el area con clickSobreRegalo.

     Regla pedida: mientras el regalo esta ABIERTO, un click en CUALQUIER
     parte de la pantalla (no solo el regalo o la hojita) lo cierra y lo
     hace viajar a otro lugar. Mientras esta CERRADO, solo abre si el click
     cae sobre el regalo (para que no se abra solo por tocar la pantalla). */
  function clickSobreRegalo(e) {
    if (e.target.closest && e.target.closest('#regaloCosmicoTema')) return true;
    const r = regaloCosmico.getBoundingClientRect();
    const m = 6;
    return e.clientX >= r.left - m && e.clientX <= r.right + m &&
           e.clientY >= r.top - m && e.clientY <= r.bottom + m;
  }

  document.addEventListener('click', (e) => {
    if (estadoRegalo === 'apagado' || estadoRegalo === 'ocupado') return;
    if (contenedorMenu && contenedorMenu.contains(e.target)) return;

    if (estadoRegalo === 'abierto') {
      viajarRegalo();
      return;
    }
    if (estadoRegalo === 'cerrado' && clickSobreRegalo(e)) {
      abrirRegalo();
    }
  }, true);

  /* ---------------- Hojita con la frase ---------------- */
  function mostrarHojaRegalo() {
    const frase = siguienteFraseRegalo();
    fraseRegalo.classList.remove('fin');
    fraseRegalo.innerHTML = '<span class="v"></span><span class="h"></span>';
    const v = fraseRegalo.querySelector('.v');
    const h = fraseRegalo.querySelector('.h');
    h.textContent = frase;               // reserva el espacio completo desde el inicio

    hojaRegalo.classList.remove('cerrando', 'abierta');
    hojaRegalo.classList.add('activa');
    colocarHojaRegalo();
    void hojaRegalo.offsetWidth;
    hojaRegalo.classList.add('abierta');

    // Efecto maquina de escribir (empieza cuando la hojita ya se desplego un poco)
    clearTimeout(tipeoRegalo);
    let i = 0;
    function paso() {
      i++;
      v.textContent = frase.slice(0, i);
      h.textContent = frase.slice(i);
      if (i < frase.length) tipeoRegalo = setTimeout(paso, 26 + Math.random() * 24);
      else fraseRegalo.classList.add('fin');
    }
    tipeoRegalo = setTimeout(paso, 650);
  }

  /* La hojita sale arriba del regalo; si no cabe, abajo; si no, al costado. */
  function colocarHojaRegalo() {
    const r = regaloCosmico.getBoundingClientRect();
    const w = hojaRegalo.offsetWidth, h = hojaRegalo.offsetHeight;
    const W = window.innerWidth, H = window.innerHeight, sep = 10;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const clampX = (x) => Math.min(Math.max(x, 8), W - w - 8);
    const clampY = (y) => Math.min(Math.max(y, 58), H - h - 8);

    const opciones = [
      { x: clampX(cx - w / 2), y: r.top - h - sep,    origen: '50% 100%' },   // arriba
      { x: clampX(cx - w / 2), y: r.bottom + sep,     origen: '50% 0%'   },   // abajo
      { x: r.right + sep,      y: clampY(cy - h / 2), origen: '0% 50%'   },   // derecha
      { x: r.left - w - sep,   y: clampY(cy - h / 2), origen: '100% 50%' }    // izquierda
    ];
    const cabe = (o) => o.x >= 8 && o.y >= 58 && o.x + w <= W - 8 && o.y + h <= H - 8;
    const el = opciones.find(cabe) || { x: clampX(cx - w / 2), y: clampY(r.top - h - sep), origen: '50% 100%' };

    hojaRegalo.style.left = el.x + 'px';
    hojaRegalo.style.top = el.y + 'px';
    hojaRegalo.style.setProperty('--origen', el.origen);
  }

  /* =====================================================================
     FUEGOS ARTIFICIALES ESTILO CYBERPUNK (canvas)
     - Dibujo aditivo ('lighter') con estela: sin shadowBlur por particula
       (era lo que hacia parpadear/entrecortar las chispas)
     - 4 tipos de particula, elegidos al azar en cada explosion, para dar
       la sensacion de "explosion digital" a tono con el resto del sitio
       (mismo look que la lluvia de codigo / el glow ciano-magenta):
         raya  -> chispa/estela clasica
         rombo -> destello holografico (contorno, sin relleno solido)
         pixel -> cuadradito hueco, estilo "chip" digital (contorno)
         glifo -> caracter suelto (0 1 # % & ...) como la Lluvia Codificada
     - Paleta ceñida a neón rosa/magenta y azul/celeste (look cyberpunk)
     - cohetes que suben y explotan en cualquier punto de la pantalla
     ===================================================================== */
  const HUES_REGALO = [195, 205, 215, 300, 320, 330];  // azul/celeste neón + rosa/magenta neón
  const GLIFOS_REGALO = '01#%&/*¡!'.split('');
  const particulasRegalo = [];
  const anillosRegalo = [];
  const cohetesRegalo = [];
  let anchoRegalo = 0, altoRegalo = 0, corriendoRegalo = false;

  function ajustarCanvasRegalo() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    anchoRegalo = window.innerWidth;
    altoRegalo = window.innerHeight;
    canvasRegalo.width = anchoRegalo * dpr;
    canvasRegalo.height = altoRegalo * dpr;
    canvasRegalo.style.width = anchoRegalo + 'px';
    canvasRegalo.style.height = altoRegalo + 'px';
    ctxRegalo.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* raya 45% / rombo 20% / pixel 20% / glifo 15% */
  function elegirTipoParticulaRegalo() {
    const r = Math.random();
    if (r < 0.45) return 'raya';
    if (r < 0.65) return 'rombo';
    if (r < 0.85) return 'pixel';
    return 'glifo';
  }

  function particulaRegalo(x, y, vx, vy, o) {
    o = o || {};
    const tipo = o.tipo || elegirTipoParticulaRegalo();
    particulasRegalo.push({
      x, y, vx, vy,
      t: 0,
      dur: o.dur || 60,
      grav: o.grav !== undefined ? o.grav : 0.05,
      roz: o.roz || 0.985,
      hue: o.hue !== undefined ? o.hue : HUES_REGALO[(Math.random() * HUES_REGALO.length) | 0],
      tam: o.tam || 1.4,
      tipo,
      glifo: tipo === 'glifo' ? GLIFOS_REGALO[(Math.random() * GLIFOS_REGALO.length) | 0] : null,
      rot: Math.random() * TAU,
      vrot: (Math.random() - 0.5) * 0.3
    });
    arrancarRegalo();
  }

  function chispasRegalo(x, y, opc) {
    const cantidad = (opc && opc.cantidad) || 40;
    const fuerza = (opc && opc.fuerza) || 1;
    const base = HUES_REGALO[(Math.random() * HUES_REGALO.length) | 0];
    for (let i = 0; i < cantidad; i++) {
      const ang = Math.random() * TAU;
      const vel = (0.7 + Math.random() * 2.6) * fuerza;
      const hue = (Math.random() < 0.7 ? base : HUES_REGALO[(Math.random() * HUES_REGALO.length) | 0]) + (Math.random() * 16 - 8);
      particulaRegalo(x, y, Math.cos(ang) * vel, Math.sin(ang) * vel, {
        hue, dur: 55 + Math.random() * 45, tam: 0.9 + Math.random() * 1.2
      });
    }
    anillosRegalo.push({ x, y, r: 3, vr: 2.2 * fuerza, t: 0, dur: 26, hue: base });
    arrancarRegalo();
  }

  /* Fuente suave de chispas subiendo mientras el regalo esta abierto
     (se deja siempre como "raya" para que no sature de texto/pixeles) */
  function iniciarFuenteRegalo() {
    detenerFuenteRegalo();
    idFuenteRegalo = setInterval(() => {
      const b = bocaRegalo();
      for (let i = 0; i < 2; i++) {
        particulaRegalo(
          b.x + (Math.random() - 0.5) * 60 * b.esc, b.y - 6 * b.esc,
          (Math.random() - 0.5) * 1.2, -(1.4 + Math.random() * 2.2),
          { dur: 45 + Math.random() * 30, tam: 0.9 + Math.random(), grav: 0.03, tipo: 'raya' }
        );
      }
    }, 110);
  }
  function detenerFuenteRegalo() {
    if (idFuenteRegalo) clearInterval(idFuenteRegalo);
    idFuenteRegalo = null;
  }

  function dibujarRomboRegalo(x, y, s, rot, h, a) {
    const c = ctxRegalo;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.beginPath();
    c.moveTo(0, -s); c.lineTo(s * 0.6, 0); c.lineTo(0, s); c.lineTo(-s * 0.6, 0);
    c.closePath();
    c.fillStyle = 'hsla(' + h + ',100%,70%,' + (a * 0.22) + ')';   // relleno tenue: se lee como contorno
    c.fill();
    c.strokeStyle = 'hsla(' + h + ',100%,88%,' + a + ')';
    c.lineWidth = 1;
    c.stroke();
    c.restore();
  }

  function dibujarPixelRegalo(x, y, s, rot, h, a) {
    const c = ctxRegalo;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.fillStyle = 'hsla(' + h + ',100%,75%,' + (a * 0.18) + ')';   // relleno tenue: se lee como contorno
    c.fillRect(-s / 2, -s / 2, s, s);
    c.strokeStyle = 'hsla(' + h + ',100%,90%,' + a + ')';
    c.lineWidth = 0.9;
    c.strokeRect(-s / 2, -s / 2, s, s);
    c.restore();
  }

  function dibujarGlifoRegalo(x, y, tam, h, a, caracter) {
    const c = ctxRegalo;
    c.save();
    c.font = (9 + tam * 6) + 'px "Courier New", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = 'hsla(' + h + ',100%,80%,' + a + ')';
    c.fillText(caracter, x, y);
    c.restore();
  }

  function arrancarRegalo() {
    if (!corriendoRegalo) { corriendoRegalo = true; requestAnimationFrame(cuadroRegalo); }
  }

  function cuadroRegalo() {
    const c = ctxRegalo;
    // Desvanece lo anterior (deja estela) sin tapar la pagina
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(0, 0, anchoRegalo, altoRegalo);
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';

    // Cohetes: suben desde el regalo hasta su punto y ahi explotan
    for (let i = cohetesRegalo.length - 1; i >= 0; i--) {
      const k = cohetesRegalo[i];
      k.t++;
      const f = Math.min(k.t / k.dur, 1);
      const e = 1 - Math.pow(1 - f, 2);
      const nx = k.x0 + (k.x1 - k.x0) * e;
      const ny = k.y0 + (k.y1 - k.y0) * e;
      c.beginPath();
      c.moveTo(k.x, k.y);
      c.lineTo(nx, ny);
      c.strokeStyle = 'hsla(' + k.hue + ',100%,78%,0.9)';
      c.lineWidth = 2;
      c.stroke();
      k.x = nx; k.y = ny;
      if (Math.random() < 0.6) {
        particulaRegalo(nx, ny, (Math.random() - 0.5) * 0.6, Math.random() * 0.6,
          { dur: 16, tam: 0.8, hue: k.hue, grav: 0.02, tipo: 'raya' });
      }
      if (f >= 1) {
        cohetesRegalo.splice(i, 1);
        chispasRegalo(k.x1, k.y1, { cantidad: 46 + ((Math.random() * 30) | 0), fuerza: 1.15 + Math.random() * 0.5 });
      }
    }

    for (let i = particulasRegalo.length - 1; i >= 0; i--) {
      const p = particulasRegalo[i];
      p.t++;
      if (p.t >= p.dur) { particulasRegalo.splice(i, 1); continue; }
      p.vx *= p.roz;
      p.vy = p.vy * p.roz + p.grav;
      p.x += p.vx; p.y += p.vy;
      p.rot += p.vrot;

      const f = p.t / p.dur;
      const a = Math.pow(1 - f, 1.4);
      const h = (p.hue + f * 40) % 360;     // el color migra dentro de la misma familia rosa/azul al morir

      if (p.tipo === 'rombo') {
        dibujarRomboRegalo(p.x, p.y, p.tam * 2.6, p.rot, h, a);
      } else if (p.tipo === 'pixel') {
        dibujarPixelRegalo(p.x, p.y, p.tam * 2.3, p.rot, h, a);
      } else if (p.tipo === 'glifo') {
        dibujarGlifoRegalo(p.x, p.y, p.tam, h, a, p.glifo);
      } else {
        c.beginPath();
        c.moveTo(p.x - p.vx * 1.8, p.y - p.vy * 1.8);
        c.lineTo(p.x, p.y);
        c.strokeStyle = 'hsla(' + h + ',100%,60%,' + (a * 0.28) + ')';
        c.lineWidth = p.tam * 3.2;
        c.stroke();
        c.strokeStyle = 'hsla(' + h + ',100%,82%,' + a + ')';
        c.lineWidth = p.tam;
        c.stroke();
      }
    }

    for (let i = anillosRegalo.length - 1; i >= 0; i--) {
      const r = anillosRegalo[i];
      r.t++;
      if (r.t >= r.dur) { anillosRegalo.splice(i, 1); continue; }
      r.vr *= 0.94;
      r.r += r.vr;
      const a = 1 - r.t / r.dur;
      c.beginPath();
      c.ellipse(r.x, r.y, r.r, r.r * 0.38, 0, 0, TAU);   // disco proyectado en perspectiva
      c.strokeStyle = 'hsla(' + r.hue + ',100%,72%,' + (a * 0.8) + ')';
      c.lineWidth = 1.2;
      c.stroke();
    }

    if (particulasRegalo.length || anillosRegalo.length || cohetesRegalo.length) {
      requestAnimationFrame(cuadroRegalo);
    } else {
      corriendoRegalo = false;
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, anchoRegalo, altoRegalo);
    }
  }

  /* ---------------- Encender / apagar el tema (API del núcleo) -------- */
  function iniciarRegalo() {
    overlayRegalo.style.display = 'block';
    window.OpcionesTemas.ocultarCorazon();  // igual que Mi Prenovia: se apaga el corazon
    ajustarCanvasRegalo();
    regaloCosmico.classList.remove('visible', 'abierto', 'pop');
    hojaRegalo.classList.remove('activa', 'abierta', 'cerrando');
    estadoRegalo = 'ocupado';               // todavia no se puede tocar: se esta materializando
    programarRegalo(aparecerRegalo, 250);
  }

  function detenerRegalo() {
    cancelarTemporizadoresRegalo();
    detenerFuenteRegalo();
    estadoRegalo = 'apagado';
    particulasRegalo.length = 0;
    anillosRegalo.length = 0;
    cohetesRegalo.length = 0;
    overlayRegalo.style.display = 'none';
    regaloCosmico.classList.remove('visible', 'abierto', 'pop');
    hojaRegalo.classList.remove('activa', 'abierta', 'cerrando');
    ctxRegalo.clearRect(0, 0, anchoRegalo, altoRegalo);
    window.OpcionesTemas.mostrarCorazon();
  }

  window.addEventListener('resize', () => {
    ajustarCanvasRegalo();
    if (estadoRegalo === 'apagado') return;
    const L = limitesRegalo();
    colocarRegalo(Math.min(Math.max(posXRegalo, L.minX), L.maxX), Math.min(Math.max(posYRegalo, L.minY), L.maxY));
    if (estadoRegalo === 'abierto') colocarHojaRegalo();
  });
  ajustarCanvasRegalo();

  /* ---------- 4. Registro en el menú (a través del núcleo) ------------- */
  window.OpcionesTemas.registrarTema({
    id: 'regalo',
    etiqueta: 'Regalo Cosmico',
    activar: iniciarRegalo,
    desactivar: detenerRegalo
  });
})();