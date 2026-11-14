/* =====================================================================
   REGALO-COSMICO.JS  (tema-plugin)
   -----------------------------------------------------------------
   Se registra solo en el menú de opciones-temas.js mediante
   window.OpcionesTemas.registrarTema(...). No toca opciones-temas.js.

   Requiere que opciones-temas.js esté cargado ANTES que este archivo:
     <script src="opciones-temas.js"></script>
     <script src="regalo-cosmico.js"></script>

   Comportamiento (igual que antes):
   - El regalo aparece en un lugar aleatorio (detrás del texto).
   - 1er toque SOBRE el regalo: se abre, salen chispas y ~8 explosiones
     repartidas por TODA la pantalla, y se despliega la hojita con la frase
     (las frases se editan en FRASES_REGALO).
   - Mientras está abierto: un toque EN CUALQUIER LUGAR de la pantalla
     lo pliega y lo hace reaparecer cerrado en otro lugar.

   CAMBIOS DE ESTA VERSION
   - El regalo ya NO es un SVG plano girando. Ahora es un modelo 3D real
     (vertices + rotacion + perspectiva) dibujado en un <canvas> como
     wireframe holografico neon. Gira sobre su propio eje vertical, se ve
     la caja por todos sus lados, y la tapa + lazo se levantan en 3D.
     (El giro anterior no era 3D porque `opacity` y `filter` animados sobre
     un elemento con transform-style: preserve-3d lo APLANAN.)
   - Particulas con el look de la pagina: SOLO cian #0ff y magenta #ff00c8
     (sin azul/lila), puntos-estrella como el fondo, destellos ✦ como los
     del corazon, glifos de codigo en Courier New con desdoblado RGB
     (glitch), y anillos elipticos como la orbita del corazon.
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
      width: clamp(240px, 50vmin, 400px);     /* TAMAÑO DE LA CAJITA: sube/baja estos 3 valores */
      margin: 0; padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      touch-action: manipulation;
      z-index: 4;
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
      animation: flotarRegalo 3.6s ease-in-out infinite;
    }
    @keyframes flotarRegalo {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-8px); }
    }

    /* El regalo es un modelo 3D dibujado en canvas (ver MOTOR 3D mas abajo).
       Todo el 3D vive DENTRO del canvas, asi que ya no hay preserve-3d ni
       backface-visibility que se rompan por animar opacity/filter. */
    .regalo-lienzo3d {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 1 / 1;
      filter: drop-shadow(0 0 10px rgba(255,140,30,0.35)) drop-shadow(0 0 26px rgba(57,168,255,0.28));
      animation: parpadeoHolograma 4.2s infinite;
    }
    .regalo-cosmico-tema:hover .regalo-lienzo3d {
      filter: drop-shadow(0 0 14px rgba(255,140,30,0.6)) drop-shadow(0 0 30px rgba(57,168,255,0.45));
    }
    .regalo-cosmico-tema.pop .regalo-lienzo3d {
      animation: popRegalo 0.4s ease-out, parpadeoHolograma 4.2s infinite;
    }
    @keyframes popRegalo {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.12) rotate(-2deg); }
      100% { transform: scale(1); }
    }

    /* ----- La hojita con la frase -----
       OJO: el parpadeo (animation sobre opacity) va en .rg-hoja-cara y el
       desplegado en .rg-hoja. Si ambos estuvieran en el mismo elemento, la
       animacion del parpadeo (opacity:1) anularia el opacity:0 inicial y la
       hoja se veria siempre en pantalla. */
    .hoja-regalo-tema {
      position: fixed;
      left: 0; top: 0;
      width: clamp(240px, 84vw, 380px);     /* ANCHO DE LA NOTITA: sube/baja estos 3 valores */
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
      text-align: center;                       /* URL al medio de la notita */
      letter-spacing: 1px;
      overflow-wrap: anywhere;                  /* una URL larga no se sale de la notita */
    }
    .rg-hoja-firma a {
      display: inline-block;
      padding: 0.4em 0.5em;                     /* area de toque comoda en celular */
      color: #0ff;
      text-decoration: underline;
      text-underline-offset: 3px;
      text-shadow: 0 0 6px #0ff;
      cursor: pointer;
    }
    .rg-hoja-firma a:hover,
    .rg-hoja-firma a:focus-visible {
      color: #fff;
      text-shadow: 0 0 6px #0ff, 0 0 14px #0ff;
      outline: none;
    }

    /* Canvas de los fuegos artificiales (encima del texto, sin capturar clicks) */
    #canvasRegaloCosmico {
      position: fixed;
      left: 0; top: 0;
      z-index: 7;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .rg-hoja-cara,
      .rg-hoja-cara::before, .rg-barrido { animation: none; }
    }
  `;
  document.head.appendChild(estilos);

  /* ---------- 2. HTML: canvas de fuegos + regalo (canvas 3D) + hojita --- */
  const overlayRegalo = document.createElement('div');
  overlayRegalo.className = 'overlay-regalo';
  overlayRegalo.id = 'overlayRegalo';
  overlayRegalo.innerHTML = `
    <canvas id="canvasRegaloCosmico" aria-hidden="true"></canvas>

    <button class="regalo-cosmico-tema" id="regaloCosmicoTema" type="button" aria-label="Abrir regalo cosmico">
      <span class="flota-regalo-tema">
        <canvas class="regalo-lienzo3d" id="regaloLienzo3D" width="300" height="300" aria-hidden="true"></canvas>
      </span>
    </button>

    <div class="hoja-regalo-tema" id="hojaRegaloTema" aria-live="polite">
      <div class="rg-hoja">
        <div class="rg-hoja-cara">
          <div class="rg-barrido"></div>
          <h2 class="rg-hoja-titulo">✦ FELIZ CUMPLEAÑOS MI AMOR ✦</h2>
          <p class="rg-hoja-frase" id="hojaRegaloFrase"></p>
          <div class="rg-hoja-firma">✦ <a href="https://n9.cl/qi0m5b" target="_blank" rel="noopener noreferrer">https://n9.cl/qi0m5b</a> ✦</div>
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
    'En este mundo de humo, eres mi piedrita filosofal',
    'Cuando miro a la luna, veo tu luz, quiza quiera darme el mensaje de cuanto brillas',
    'El dia C de cuando lo nostalgico se volvio magico',
    'Mi vida... Mi lugar seguro... Mi sentido de existencia...',
    'INEFARIUM CELEBRA, PEDRO EMPIEZA A SALTAR DE EMOCION!!!',
    'Michitos se acercan a ti y te daran muchos muacks :3',
    'Vesiculin empieza a girar y volar por toda Arcelum (se perdio del camino xD)',
    'LORD WEEDESTON EMPEZO A REGALAR HONGUITOS A TODOS POR LA CELEBRACION!!',
    'Somos polvo de estrellas, y atomos encontrados',
    'LAS VAQUITAS POLACAS SE LIBERARON, BAILARAN POR TU NOMBRE',
    'Una cancion en mi alma, como el pensamiento de voz en mi mente💕'
  ];

  const regaloCosmico = overlayRegalo.querySelector('#regaloCosmicoTema');
  const hojaRegalo    = overlayRegalo.querySelector('#hojaRegaloTema');
  const fraseRegalo   = overlayRegalo.querySelector('#hojaRegaloFrase');
  const canvasRegalo  = overlayRegalo.querySelector('#canvasRegaloCosmico');
  const ctxRegalo     = canvasRegalo.getContext('2d');
  const lienzoCaja    = overlayRegalo.querySelector('#regaloLienzo3D');
  const ctxCaja       = lienzoCaja.getContext('2d');
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

  /* =====================================================================
     SONIDO COSMICO AL ABRIR  (Web Audio: se sintetiza, sin archivos de audio)
     -----------------------------------------------------------------
     Suena cada vez que se abre la caja (~2.5 s). Capas:
       1) "zap" de desbloqueo: barrido de sierra filtrado + ruido glitch
       2) golpe grave suave (sub) para dar cuerpo al abrir
       3) chirridos digitales cortitos (cuadradas agudas)
       4) colchon etereo: acorde La menor add9 con filtro que se abre y cierra
       5) arpegio de destellos ascendente (pentatonica menor), distinto cada vez
       6) campanita final con vibrato
     Todo pasa por reverb + eco con lowpass para que se sienta amplio/espacial.
     Ajustes:
       SONIDO_REGALO_ACTIVO     -> false para silenciar todo
       VOLUMEN_SONIDO_REGALO    -> 0 a 1
     Los navegadores solo dejan sonar audio tras un toque del usuario; como
     la caja se abre con un toque, el audio se crea/reanuda justo ahi.
     Si algo falla, el regalo sigue funcionando sin sonido (try/catch).
     ===================================================================== */
  const SONIDO_REGALO_ACTIVO = true;
  const VOLUMEN_SONIDO_REGALO = 0.5;
  let audioRegalo = null, reverbRegalo = null, ruidoRegalo = null, maestroSonidoRegalo = null;

  function contextoAudioRegalo() {
    if (audioRegalo) return audioRegalo;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { audioRegalo = new AC(); } catch (err) { audioRegalo = null; }
    return audioRegalo;
  }

  /* Reverb generada (ruido que decae): cola de ~2.6 s, estereo */
  function crearReverbRegalo(ac) {
    const n = Math.floor(ac.sampleRate * 2.6);
    const buf = ac.createBuffer(2, n, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    return buf;
  }

  function sonidoAbrirRegalo() {
    if (!SONIDO_REGALO_ACTIVO) return;
    try {
      const ac = contextoAudioRegalo();
      if (!ac) return;
      if (ac.state === 'suspended') ac.resume();
      const t0 = ac.currentTime + 0.03;
      const rnd = (a, b) => a + Math.random() * (b - a);

      // --- Cadena: fuentes -> bus -> (seco + reverb + eco) -> maestro -> compresor -> salida
      const maestro = ac.createGain();
      maestro.gain.value = VOLUMEN_SONIDO_REGALO * 0.6;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      maestro.connect(comp);
      comp.connect(ac.destination);
      maestroSonidoRegalo = maestro;

      if (!reverbRegalo) reverbRegalo = crearReverbRegalo(ac);
      const rev = ac.createConvolver();
      rev.buffer = reverbRegalo;
      const revNivel = ac.createGain();
      revNivel.gain.value = 0.7;
      rev.connect(revNivel);
      revNivel.connect(maestro);

      const eco = ac.createDelay(1);
      eco.delayTime.value = 0.21;
      const ecoFb = ac.createGain();
      ecoFb.gain.value = 0.4;
      const ecoFiltro = ac.createBiquadFilter();
      ecoFiltro.type = 'lowpass';
      ecoFiltro.frequency.value = 2400;
      eco.connect(ecoFiltro);
      ecoFiltro.connect(ecoFb);
      ecoFb.connect(eco);
      const ecoNivel = ac.createGain();
      ecoNivel.gain.value = 0.45;
      ecoFiltro.connect(ecoNivel);
      ecoNivel.connect(maestro);
      ecoFiltro.connect(rev);

      const bus = ac.createGain();            // todo lo "aereo" pasa por aqui
      bus.connect(maestro);
      bus.connect(rev);
      bus.connect(eco);

      // Ruido blanco corto (para el glitch)
      if (!ruidoRegalo) {
        const n = Math.floor(ac.sampleRate * 0.2);
        ruidoRegalo = ac.createBuffer(1, n, ac.sampleRate);
        const d = ruidoRegalo.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      }

      // Voz simple: oscilador con envolvente (ataque rapido, caida exponencial)
      const voz = (tipo, f0, f1, ini, dur, vol, ataque, destino) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = tipo;
        o.frequency.setValueAtTime(f0, t0 + ini);
        if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + ini + dur);
        g.gain.setValueAtTime(0.0001, t0 + ini);
        g.gain.exponentialRampToValueAtTime(vol, t0 + ini + ataque);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
        o.connect(g);
        g.connect(destino || bus);
        o.start(t0 + ini);
        o.stop(t0 + ini + dur + 0.05);
        return { o, g };
      };

      // 1) Golpe grave suave (va directo al maestro, sin reverb)
      voz('sine', 120, 42, 0, 0.45, 0.5, 0.01, maestro);

      // 2) "Zap" de desbloqueo: sierra que sube, filtrada
      {
        const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(160, t0);
        o.frequency.exponentialRampToValueAtTime(2400, t0 + 0.3);
        f.type = 'bandpass';
        f.Q.value = 6;
        f.frequency.setValueAtTime(400, t0);
        f.frequency.exponentialRampToValueAtTime(4200, t0 + 0.3);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
        o.connect(f); f.connect(g); g.connect(bus);
        o.start(t0);
        o.stop(t0 + 0.4);
      }

      // 3) Glitch de ruido (dos ráfagas digitales)
      const glitch = (ini, dur, vol) => {
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = ruidoRegalo;
        f.type = 'highpass';
        f.frequency.value = 4000;
        g.gain.setValueAtTime(vol, t0 + ini);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
        s.connect(f); f.connect(g); g.connect(bus);
        s.start(t0 + ini);
        s.stop(t0 + ini + dur + 0.02);
      };
      glitch(0.0, 0.10, 0.12);
      glitch(0.19, 0.05, 0.07);

      // 4) Chirridos digitales cortitos
      for (let i = 0; i < 4; i++) {
        voz('square', rnd(1800, 3800), rnd(1800, 3800), 0.03 + i * 0.09 + rnd(0, 0.04), 0.035, 0.02, 0.004);
      }

      // 5) Colchon etereo: La menor add9 (A2, E3, C4) con filtro que se abre y se cierra
      {
        const filtro = ac.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.Q.value = 2;
        filtro.frequency.setValueAtTime(250, t0);
        filtro.frequency.exponentialRampToValueAtTime(3200, t0 + 0.9);
        filtro.frequency.exponentialRampToValueAtTime(700, t0 + 2.4);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.04, t0 + 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
        filtro.connect(g);
        g.connect(bus);
        [[110, -7], [110, 7], [164.81, -5], [164.81, 5], [261.63, 0]].forEach((n) => {
          const o = ac.createOscillator();
          o.type = n[0] > 200 ? 'triangle' : 'sawtooth';
          o.frequency.value = n[0];
          o.detune.value = n[1];
          o.connect(filtro);
          o.start(t0);
          o.stop(t0 + 2.7);
        });
      }

      // 6) Arpegio de destellos ascendente (pentatonica menor de La), distinto cada vez
      const escala = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1318.5, 1567.98, 1760];
      const inicio = (Math.random() * 3) | 0;
      for (let i = 0; i < 7; i++) {
        voz(i % 2 ? 'sine' : 'triangle', escala[inicio + i], 0, 0.14 + i * 0.075 + rnd(0, 0.012), 1.1, 0.06 - i * 0.003, 0.008);
      }

      // 7) Campanita final con vibrato
      {
        const fb = escala[7 + ((Math.random() * 3) | 0)];
        const campana = voz('sine', fb, 0, 0.5, 1.9, 0.04, 0.2);
        const lfo = ac.createOscillator(), lfoG = ac.createGain();
        lfo.frequency.value = 5.5;
        lfoG.gain.value = fb * 0.006;
        lfo.connect(lfoG);
        lfoG.connect(campana.o.frequency);
        lfo.start(t0 + 0.5);
        lfo.stop(t0 + 2.5);
      }

      // Limpieza: suelta la cadena cuando ya no suena nada (incluida la cola de reverb)
      setTimeout(() => {
        try { maestro.disconnect(); } catch (err) { /* ya desconectado */ }
        if (maestroSonidoRegalo === maestro) maestroSonidoRegalo = null;
      }, 6000);
    } catch (err) {
      console.warn('[regalo-cosmico] sonido no disponible:', err);
    }
  }

  /* Corta el sonido con un fundido rapido (al apagar el tema) */
  function silenciarSonidoRegalo() {
    if (!maestroSonidoRegalo || !audioRegalo) return;
    try { maestroSonidoRegalo.gain.setTargetAtTime(0, audioRegalo.currentTime, 0.04); } catch (err) { /* nada */ }
  }

  /* =====================================================================
     MOTOR 3D DEL REGALO  (canvas 2D + proyeccion propia, sin librerias)
     -----------------------------------------------------------------
     Es un modelo 3D REAL: cada punto tiene (x, y, z) y en cada cuadro se
       1) rota sobre el eje Y (el giro sobre su propio eje),
       2) se inclina la camara un poco hacia abajo (para ver la tapa),
       3) se aplica perspectiva y se dibuja como wireframe neon.
     Las aristas del fondo se atenuan segun su profundidad, asi se lee
     como una proyeccion holografica con volumen.

     Ajustes rapidos:
       VEL_GIRO_REGALO   -> radianes/seg (0.7 = una vuelta cada ~9 s)
       INCLINACION_REGALO-> cuanto se ve "desde arriba" (radianes)
       ALTURA_TAPA_REGALO-> cuanto sube la tapa al abrir
     ===================================================================== */
  const VEL_GIRO_REGALO = 0.7;
  const INCLINACION_REGALO = 0.42;
  const ALTURA_TAPA_REGALO = 0.75;
  const DIST_CAMARA_REGALO = 7;        // distancia de camara (perspectiva suave)
  const COL_REGALO = {                 // paleta neon original del regalo
    o: [255, 138, 31],                 // naranja
    a: [255, 194, 26],                 // ambar
    b: [57, 168, 255],                 // azul
    c: [159, 220, 255]                 // celeste (lazo)
  };

  /* ---- Geometria: cuerpo (fijo) y tapa+lazo (grupo que se levanta) ---- */
  const MODELO_REGALO = (function () {
    const BX = 0.8, Y0 = -0.9, Y1 = 0.3;   // cuerpo: semi-ancho y rango vertical
    const LX = 0.9, LH = 0.16;              // tapa: semi-ancho y semi-alto (coords locales, centrada)
    const CINTA = 0.14;                     // semi-ancho de la cinta

    const cuerpo = { caras: [], lineas: [] };
    const tapa   = { caras: [], lineas: [] };

    const linea = (g, pts, col, fino, cerrado) => g.lineas.push({ p: pts, col, fino: !!fino, cerrado: !!cerrado });
    const cara  = (g, pts, n, col, a) => g.caras.push({ p: pts, n, col, a });

    function aristasCaja(g, hx, y0, y1, hz, cTop, cBase, cVert) {
      const A = [[-hx, y0, -hz], [hx, y0, -hz], [hx, y0, hz], [-hx, y0, hz]];
      const B = [[-hx, y1, -hz], [hx, y1, -hz], [hx, y1, hz], [-hx, y1, hz]];
      linea(g, B, cTop, false, true);
      linea(g, A, cBase, false, true);
      for (let i = 0; i < 4; i++) linea(g, [A[i], B[i]], cVert[i]);
    }

    /* 4 lados con su cinta (banda tenue + 2 lineas finas). ±Z azul, ±X naranja */
    function lados(g, h, y0, y1, aCara, aBanda) {
      [[0, 1, 'b'], [0, -1, 'b'], [1, 0, 'o'], [-1, 0, 'o']].forEach((d) => {
        const nx = d[0], nz = d[1], col = d[2];
        const tx = nz, tz = -nx;
        const P = (s, y) => [nx * h + tx * s, y, nz * h + tz * s];
        cara(g, [P(-h, y0), P(h, y0), P(h, y1), P(-h, y1)], [nx, 0, nz], col, aCara);
        cara(g, [P(-CINTA, y0), P(CINTA, y0), P(CINTA, y1), P(-CINTA, y1)], [nx, 0, nz], col, aBanda);
        linea(g, [P(-CINTA, y0), P(-CINTA, y1)], col, true);
        linea(g, [P(CINTA, y0), P(CINTA, y1)], col, true);
      });
    }

    /* --- Cuerpo --- */
    lados(cuerpo, BX, Y0, Y1, 0.20, 0.30);
    cara(cuerpo, [[-BX, Y0, -BX], [BX, Y0, -BX], [BX, Y0, BX], [-BX, Y0, BX]], [0, -1, 0], 'a', 0.10);
    aristasCaja(cuerpo, BX, Y0, Y1, BX, 'o', 'a', ['o', 'b', 'o', 'b']);

    /* --- Tapa --- */
    lados(tapa, LX, -LH, LH, 0.20, 0.30);
    cara(tapa, [[-LX, LH, -LX], [LX, LH, -LX], [LX, LH, LX], [-LX, LH, LX]], [0, 1, 0], 'a', 0.12);
    cara(tapa, [[-LX, -LH, -LX], [LX, -LH, -LX], [LX, -LH, LX], [-LX, -LH, LX]], [0, -1, 0], 'a', 0.08);
    aristasCaja(tapa, LX, -LH, LH, LX, 'a', 'o', ['o', 'b', 'o', 'b']);
    // cintas cruzadas sobre la tapa
    cara(tapa, [[-LX, LH, -CINTA], [LX, LH, -CINTA], [LX, LH, CINTA], [-LX, LH, CINTA]], [0, 1, 0], 'b', 0.28);
    cara(tapa, [[-CINTA, LH, -LX], [CINTA, LH, -LX], [CINTA, LH, LX], [-CINTA, LH, LX]], [0, 1, 0], 'b', 0.28);
    linea(tapa, [[-LX, LH, -CINTA], [LX, LH, -CINTA]], 'b', true);
    linea(tapa, [[-LX, LH, CINTA], [LX, LH, CINTA]], 'b', true);
    linea(tapa, [[-CINTA, LH, -LX], [-CINTA, LH, LX]], 'b', true);
    linea(tapa, [[CINTA, LH, -LX], [CINTA, LH, LX]], 'b', true);

    /* --- Lazo: nudo + 4 lazadas (en 3D real, se ve desde todos los lados) --- */
    aristasCaja(tapa, 0.09, LH, LH + 0.11, 0.09, 'c', 'c', ['c', 'c', 'c', 'c']);
    for (let k = 0; k < 4; k++) {
      const ang = Math.PI / 4 + k * Math.PI / 2;
      const ux = Math.cos(ang), uz = Math.sin(ang);
      const N = 12, L = 0.62, H = 0.34, cy = 0.20, pts = [];
      for (let i = 0; i <= N; i++) {                 // arco alto de la lazada
        const t = i / N;
        pts.push([ux * (0.07 + L * t), cy + H * Math.sin(Math.PI * t), uz * (0.07 + L * t)]);
      }
      for (let i = N - 1; i >= 1; i--) {             // arco bajo (vuelve al nudo)
        const t = i / N;
        pts.push([ux * (0.07 + L * t), cy + 0.10 * Math.sin(Math.PI * t), uz * (0.07 + L * t)]);
      }
      cara(tapa, pts, null, 'b', 0.12);
      linea(tapa, pts, 'c', false, true);
    }
    // dos colitas del lazo que caen por la tapa
    [1, -1].forEach((s) => {
      linea(tapa, [
        [s * 0.10, LH + 0.01, 0], [s * 0.42, LH + 0.005, 0.06],
        [s * 0.78, LH + 0.005, 0.03], [s * 0.91, LH - 0.06, 0.05], [s * 0.93, -LH + 0.05, 0.05]
      ], 'c', true);
    });

    return { cuerpo, tapa };
  })();

  /* ---- Estado y matematicas del render ---- */
  let anguloCaja = 0.7;               // giro actual sobre el eje Y
  let aperturaCaja = 0;               // 0 = cerrada, 1 = abierta (con rebote)
  let velAperturaCaja = 0;
  let tCajaAnt = 0;
  let rafCaja = null;
  let _T = null, _L = null, _u = 1, _cx = 0, _cy = 0;

  const rgbaRegalo = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
  const aclararRegalo = (c) => [c[0] + (255 - c[0]) * 0.4, c[1] + (255 - c[1]) * 0.4, c[2] + (255 - c[2]) * 0.4].map(Math.round);
  const profundidadRegalo = (z) => 0.35 + 0.65 * Math.min(Math.max(0.5 + 0.5 * z / 1.4, 0), 1);

  /* Mundo -> vista. Si esTapa, primero aplica el transform de la tapa
     (giro propio + inclinacion + subida). dir=true para vectores normales. */
  function aVista(p, esTapa, dir) {
    let x = p[0], y = p[1], z = p[2];
    if (esTapa) {
      const x1 = x * _L.cs + z * _L.ss;
      const z1 = -x * _L.ss + z * _L.cs;
      x = x1 * _L.cr - y * _L.sr;
      y = x1 * _L.sr + y * _L.cr;
      z = z1;
      if (!dir) { x += _L.tx; y += _L.ty; }
    }
    const X = x * _T.ca + z * _T.sa;              // giro del regalo sobre Y
    const Z = -x * _T.sa + z * _T.ca;
    return [X, y * _T.cp - Z * _T.sp, y * _T.sp + Z * _T.cp];   // camara inclinada
  }
  function aPantalla(v) {
    const k = DIST_CAMARA_REGALO / (DIST_CAMARA_REGALO - v[2]);  // perspectiva
    return [_cx + v[0] * _u * k, _cy - v[1] * _u * k];
  }

  function trazoNeonRegalo(c, ps, col, w, alfa, cerrado) {
    c.beginPath();
    c.moveTo(ps[0][0], ps[0][1]);
    for (let i = 1; i < ps.length; i++) c.lineTo(ps[i][0], ps[i][1]);
    if (cerrado) c.closePath();
    c.strokeStyle = rgbaRegalo(col, alfa * 0.22);          // halo
    c.lineWidth = w * 3.6;
    c.stroke();
    c.strokeStyle = rgbaRegalo(aclararRegalo(col), alfa);  // nucleo
    c.lineWidth = w;
    c.stroke();
  }

  function dibujarGrupoRegalo(c, g, esTapa, W) {
    const wBase = Math.max(1.3, W * 0.0078);
    for (let i = 0; i < g.caras.length; i++) {
      const f = g.caras[i];
      let zs = 0;
      const ps = [];
      for (let j = 0; j < f.p.length; j++) {
        const v = aVista(f.p[j], esTapa);
        zs += v[2];
        ps.push(aPantalla(v));
      }
      const frente = f.n ? aVista(f.n, esTapa, true)[2] > 0 : true;
      const a = f.a * (frente ? 1 : 0.3) * profundidadRegalo(zs / f.p.length);
      c.beginPath();
      c.moveTo(ps[0][0], ps[0][1]);
      for (let j = 1; j < ps.length; j++) c.lineTo(ps[j][0], ps[j][1]);
      c.closePath();
      c.fillStyle = rgbaRegalo(COL_REGALO[f.col], a);
      c.fill();
    }
    for (let i = 0; i < g.lineas.length; i++) {
      const l = g.lineas[i];
      let zs = 0;
      const ps = [];
      for (let j = 0; j < l.p.length; j++) {
        const v = aVista(l.p[j], esTapa);
        zs += v[2];
        ps.push(aPantalla(v));
      }
      const a = 0.95 * profundidadRegalo(zs / l.p.length);
      trazoNeonRegalo(c, ps, COL_REGALO[l.col], l.fino ? wBase * 0.65 : wBase, a, l.cerrado);
    }
  }

  /* Haz de luz que sale de la boca (un tronco de piramide en 3D) + brillo de la boca */
  function dibujarLuzRegalo(c, g) {
    const yB = 0.3, yT = 1.55, sB = 0.7, sT = 0.38;
    const anillo = (y, s) => [[-s, y, -s], [s, y, -s], [s, y, s], [-s, y, s]].map((p) => aPantalla(aVista(p, false)));
    const B = anillo(yB, sB), Tp = anillo(yT, sT);
    const cB = aPantalla(aVista([0, yB, 0], false));
    const cT = aPantalla(aVista([0, yT, 0], false));

    const gr = c.createLinearGradient(cB[0], cB[1], cT[0], cT[1]);
    gr.addColorStop(0,    'rgba(255,224,138,' + (0.40 * g).toFixed(3) + ')');
    gr.addColorStop(0.45, 'rgba(57,168,255,'  + (0.14 * g).toFixed(3) + ')');
    gr.addColorStop(1,    'rgba(255,0,200,0)');
    c.fillStyle = gr;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      c.beginPath();
      c.moveTo(B[i][0], B[i][1]); c.lineTo(B[j][0], B[j][1]);
      c.lineTo(Tp[j][0], Tp[j][1]); c.lineTo(Tp[i][0], Tp[i][1]);
      c.closePath();
      c.fill();
    }

    const r = Math.hypot(B[0][0] - B[2][0], B[0][1] - B[2][1]) / 2;
    const gb = c.createRadialGradient(cB[0], cB[1], 0, cB[0], cB[1], r);
    gb.addColorStop(0,   'rgba(255,242,176,' + (0.75 * g).toFixed(3) + ')');
    gb.addColorStop(0.5, 'rgba(255,160,48,'  + (0.38 * g).toFixed(3) + ')');
    gb.addColorStop(1,   'rgba(255,138,31,0)');
    c.fillStyle = gb;
    c.beginPath();
    c.moveTo(B[0][0], B[0][1]);
    for (let i = 1; i < 4; i++) c.lineTo(B[i][0], B[i][1]);
    c.closePath();
    c.fill();
  }

  function cuadroCaja(ahora) {
    rafCaja = requestAnimationFrame(cuadroCaja);
    const dt = Math.min(Math.max((ahora - tCajaAnt) / 1000, 0), 0.05);
    tCajaAnt = ahora;

    const W = lienzoCaja.clientWidth;
    if (!W) return;
    const c = ctxCaja;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(W * dpr);
    if (lienzoCaja.width !== px) { lienzoCaja.width = px; lienzoCaja.height = px; }
    c.setTransform(px / W, 0, 0, px / W, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, W, W);

    // Giro sobre su propio eje (siempre activo: no depende de "reducir movimiento" del sistema)
    anguloCaja += dt * VEL_GIRO_REGALO;

    // Tapa: resorte (sube con rebote al abrir, baja seca al cerrar)
    const objetivo = regaloCosmico.classList.contains('abierto') ? 1 : 0;
    const rig = objetivo ? 95 : 260, amort = objetivo ? 9.5 : 32;
    velAperturaCaja += (rig * (objetivo - aperturaCaja) - amort * velAperturaCaja) * dt;
    aperturaCaja += velAperturaCaja * dt;
    if (aperturaCaja < 0) { aperturaCaja = 0; velAperturaCaja = 0; }
    const o = aperturaCaja;

    _T = {
      ca: Math.cos(anguloCaja), sa: Math.sin(anguloCaja),
      cp: Math.cos(INCLINACION_REGALO), sp: Math.sin(INCLINACION_REGALO)
    };
    const giroTapa = 0.55 * o, ladeoTapa = 0.16 * o;
    _L = {
      cs: Math.cos(giroTapa), ss: Math.sin(giroTapa),
      cr: Math.cos(ladeoTapa), sr: Math.sin(ladeoTapa),
      tx: 0.26 * o,
      ty: 0.42 + ALTURA_TAPA_REGALO * o + Math.sin(ahora / 650) * 0.035 * Math.min(o, 1)
    };
    _u = W * 0.22;
    _cx = W / 2;
    _cy = W * 0.535;          // la boca de la caja cae en ~47% de la altura (ver bocaRegalo)

    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    c.lineJoin = 'round';

    const brillo = Math.min(Math.max(o, 0), 1);
    if (brillo > 0.02) dibujarLuzRegalo(c, brillo);
    dibujarGrupoRegalo(c, MODELO_REGALO.cuerpo, false, W);
    dibujarGrupoRegalo(c, MODELO_REGALO.tapa, true, W);

    // Lineas de escaneo holograficas SOLO sobre el dibujo (source-atop no pinta el fondo)
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(0,0,0,0.30)';
    const paso = Math.max(3, W * 0.014);
    const desp = (ahora / 45) % paso;
    for (let y = -paso + desp; y < W; y += paso) c.fillRect(0, y, W, paso * 0.4);
    const sy = ((ahora / 2800) % 1) * W * 1.3 - W * 0.15, alto = W * 0.09;
    const gs = c.createLinearGradient(0, sy - alto, 0, sy + alto);
    gs.addColorStop(0, 'rgba(0,255,255,0)');
    gs.addColorStop(0.5, 'rgba(0,255,255,0.22)');
    gs.addColorStop(1, 'rgba(0,255,255,0)');
    c.fillStyle = gs;
    c.fillRect(0, sy - alto, W, alto * 2);
    c.globalCompositeOperation = 'source-over';
  }

  function arrancarCajaRegalo() {
    if (rafCaja) return;
    tCajaAnt = performance.now();
    rafCaja = requestAnimationFrame(cuadroCaja);
  }
  function detenerCajaRegalo() {
    if (rafCaja) cancelAnimationFrame(rafCaja);
    rafCaja = null;
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
    sonidoAbrirRegalo();                    // sonido cosmico (se llama dentro del click: el audio esta permitido)
    regaloCosmico.classList.add('abierto', 'pop');
    programarRegalo(() => regaloCosmico.classList.remove('pop'), 420);

    // Estallido en la boca del regalo
    const b = bocaRegalo();
    chispasRegalo(b.x, b.y - 10 * b.esc, { cantidad: 60, fuerza: Math.min(b.esc, 1.5) + 0.2 });

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
    // El enlace de la notita solo abre la URL: no debe plegar ni mover el regalo
    if (e.target.closest && e.target.closest('.rg-hoja-firma a')) return;

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
     FUEGOS ARTIFICIALES CYBERPUNK (canvas)  -  look de la pagina
     -----------------------------------------------------------------
     La pagina usa: cian #0ff y magenta #ff00c8 puros sobre negro, texto
     Courier New con glow, puntitos cian/magenta de fondo, un corazon de
     malla con una orbita eliptica y destellos ✦, y lluvia de codigo.
     Por eso ahora las particulas son:
       raya     -> estela neon (cian/magenta puro, con halo)
       punto    -> puntito con halo, igual que las estrellas del fondo
       estrella -> destello ✦ de 4 puntas, como los del corazon
       glifo    -> caracter de codigo (Courier New) con desdoblado RGB
                   cian/magenta, parpadeo y cambio de caracter (glitch)
       pixel / rombo -> contornos holograficos (poco frecuentes)
     Ya no hay tonos azul/lila: el color NO migra al morir la particula,
     solo se desvanece, como el resto de los neones de la pagina.
     Dibujo aditivo ('lighter') con estela; sin shadowBlur por particula.
     ===================================================================== */
  const HUES_REGALO = [180, 313];                       // cian #0ff  y  magenta #ff00c8
  const GLIFOS_REGALO = '0101010110{}[]<>/;#$%&*+='.split('');
  const particulasRegalo = [];
  const anillosRegalo = [];
  const cohetesRegalo = [];
  let anchoRegalo = 0, altoRegalo = 0, corriendoRegalo = false;

  const nRegalo = (h, l, a) => 'hsla(' + h + ',100%,' + l + '%,' + a + ')';
  const opuestoRegalo = (h) => (h < 250 ? 313 : 180);   // el "otro" color de la pagina

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

  /* raya 32% / punto 20% / estrella 16% / glifo 22% / pixel 5% / rombo 5% */
  function elegirTipoParticulaRegalo() {
    const r = Math.random();
    if (r < 0.32) return 'raya';
    if (r < 0.52) return 'punto';
    if (r < 0.68) return 'estrella';
    if (r < 0.90) return 'glifo';
    if (r < 0.95) return 'pixel';
    return 'rombo';
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
      // ~70% del color dominante y ~30% del otro: dos tonos, como el texto de la pagina
      const hue = (Math.random() < 0.7 ? base : opuestoRegalo(base)) + (Math.random() * 8 - 4);
      particulaRegalo(x, y, Math.cos(ang) * vel, Math.sin(ang) * vel, {
        hue, dur: 55 + Math.random() * 45, tam: 0.9 + Math.random() * 1.2
      });
    }
    anillosRegalo.push({ x, y, r: 3, vr: 2.2 * fuerza, t: 0, dur: 26, hue: base });
    arrancarRegalo();
  }

  /* Fuente suave de chispas subiendo mientras el regalo esta abierto.
     Casi todo son rayas; de vez en cuando sube un 0/1 como codigo flotando. */
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
      if (Math.random() < 0.3) {
        particulaRegalo(
          b.x + (Math.random() - 0.5) * 50 * b.esc, b.y - 6 * b.esc,
          (Math.random() - 0.5) * 0.8, -(0.9 + Math.random() * 1.4),
          { dur: 60 + Math.random() * 30, tam: 0.9, grav: 0.012, tipo: 'glifo' }
        );
      }
    }, 110);
    programarFuegosCajaRegalo();           // + fuegos artificiales aleatorios dentro de la caja
  }
  function detenerFuenteRegalo() {
    if (idFuenteRegalo) clearInterval(idFuenteRegalo);
    idFuenteRegalo = null;
    clearTimeout(idFuegosCajaRegalo);      // tambien apaga los fuegos de dentro de la caja
    idFuegosCajaRegalo = null;
  }

  /* ---------- Fuegos artificiales DENTRO de la caja (aleatorios) ----------
     Mientras el regalo esta abierto, cada 0.25-0.9 s (al azar) aparece un
     mini fuego artificial en un punto cualquiera de la boca de la caja:
       - 60%: un mini cohete que sube desde el fondo de la caja y explota
       - 40%: una explosion directa que "brota" dentro de la caja
     A veces salen dos casi juntos. Tamaño, cantidad y color son al azar y
     escalan con el tamaño de la caja. Ajusta:
       FUEGOS_CAJA_MIN / FUEGOS_CAJA_MAX -> tiempo entre fuegos (ms)
       FUEGOS_CAJA_RADIO                 -> que tan abierta es la zona (fraccion del ancho) */
  const FUEGOS_CAJA_MIN = 250, FUEGOS_CAJA_MAX = 900;
  const FUEGOS_CAJA_RADIO = 0.13;
  let idFuegosCajaRegalo = null;

  function fuegoDentroCajaRegalo() {
    const r = regaloCosmico.getBoundingClientRect();
    const W = r.width;
    const esc = W / 280;                                       // 1 = tamaño original de la caja
    // Punto al azar dentro de la boca (elipse: la caja se ve un poco desde arriba)
    const ang = Math.random() * TAU;
    const rad = Math.sqrt(Math.random()) * W * FUEGOS_CAJA_RADIO;
    const x1 = r.left + W / 2 + Math.cos(ang) * rad;
    const y1 = r.top + r.height * 0.47 + Math.sin(ang) * rad * 0.45 - Math.random() * r.height * 0.05;
    const cantidad = 12 + ((Math.random() * 16) | 0);
    const fuerza = (0.3 + Math.random() * 0.3) * Math.min(esc, 1.5);

    if (Math.random() < 0.6) {
      cohetesRegalo.push({                                     // mini cohete desde el fondo de la caja
        x0: x1 + (Math.random() - 0.5) * W * 0.06, y0: r.top + r.height * 0.64,
        x1, y1, x: x1, y: r.top + r.height * 0.64,
        t: 0, dur: 9 + Math.random() * 7,
        hue: HUES_REGALO[(Math.random() * HUES_REGALO.length) | 0],
        cant: cantidad, fuerza
      });
      arrancarRegalo();
    } else {
      chispasRegalo(x1, y1, { cantidad, fuerza });             // explosion directa
    }
  }

  function programarFuegosCajaRegalo() {
    clearTimeout(idFuegosCajaRegalo);
    idFuegosCajaRegalo = setTimeout(() => {
      if (estadoRegalo !== 'abierto') return;
      fuegoDentroCajaRegalo();
      if (Math.random() < 0.25) setTimeout(() => { if (estadoRegalo === 'abierto') fuegoDentroCajaRegalo(); }, 70 + Math.random() * 120);
      programarFuegosCajaRegalo();
    }, FUEGOS_CAJA_MIN + Math.random() * (FUEGOS_CAJA_MAX - FUEGOS_CAJA_MIN));
  }

  function dibujarRomboRegalo(x, y, s, rot, h, a) {
    const c = ctxRegalo;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.beginPath();
    c.moveTo(0, -s); c.lineTo(s * 0.6, 0); c.lineTo(0, s); c.lineTo(-s * 0.6, 0);
    c.closePath();
    c.fillStyle = nRegalo(h, 55, a * 0.18);
    c.fill();
    c.strokeStyle = nRegalo(h, 66, a);
    c.lineWidth = 1;
    c.stroke();
    c.restore();
  }

  function dibujarPixelRegalo(x, y, s, rot, h, a) {
    const c = ctxRegalo;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.fillStyle = nRegalo(h, 55, a * 0.16);
    c.fillRect(-s / 2, -s / 2, s, s);
    c.strokeStyle = nRegalo(h, 66, a);
    c.lineWidth = 0.9;
    c.strokeRect(-s / 2, -s / 2, s, s);
    c.restore();
  }

  /* Puntito con halo: mismo look que las estrellitas cian/magenta del fondo */
  function dibujarPuntoRegalo(x, y, s, h, a) {
    const c = ctxRegalo;
    c.beginPath();
    c.arc(x, y, s * 3, 0, TAU);
    c.fillStyle = nRegalo(h, 50, a * 0.16);
    c.fill();
    c.beginPath();
    c.arc(x, y, s, 0, TAU);
    c.fillStyle = nRegalo(h, 62, a);
    c.fill();
  }

  /* Destello ✦ de 4 puntas (como los que rodean al corazon) */
  function dibujarEstrellaRegalo(x, y, s, rot, h, a) {
    const c = ctxRegalo;
    const k = s * 0.2;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.beginPath();
    c.arc(0, 0, s * 0.95, 0, TAU);
    c.fillStyle = nRegalo(h, 55, a * 0.14);
    c.fill();
    c.beginPath();
    c.moveTo(0, -s); c.lineTo(k, -k); c.lineTo(s, 0); c.lineTo(k, k);
    c.lineTo(0, s);  c.lineTo(-k, k); c.lineTo(-s, 0); c.lineTo(-k, -k);
    c.closePath();
    c.fillStyle = nRegalo(h, 68, a);
    c.fill();
    c.restore();
  }

  /* Glifo de codigo en Courier New (la tipografia de la pagina) con desdoblado RGB */
  function dibujarGlifoRegalo(x, y, tam, h, a, caracter) {
    const c = ctxRegalo;
    c.save();
    c.font = 'bold ' + Math.round(8 + tam * 4.5) + 'px "Courier New", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = nRegalo(opuestoRegalo(h), 58, a * 0.5);   // copia desfasada del otro color
    c.fillText(caracter, x + 1.6, y);
    c.fillStyle = nRegalo(h, 62, a);
    c.fillText(caracter, x - 0.8, y);
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
      c.strokeStyle = nRegalo(k.hue, 50, 0.3);
      c.lineWidth = 5;
      c.stroke();
      c.strokeStyle = nRegalo(k.hue, 66, 0.95);
      c.lineWidth = 1.8;
      c.stroke();
      k.x = nx; k.y = ny;
      if (Math.random() < 0.6) {
        particulaRegalo(nx, ny, (Math.random() - 0.5) * 0.6, Math.random() * 0.6,
          { dur: 16, tam: 0.8, hue: k.hue, grav: 0.02, tipo: 'raya' });
      }
      if (f >= 1) {
        cohetesRegalo.splice(i, 1);
        chispasRegalo(k.x1, k.y1, {
          cantidad: k.cant || (46 + ((Math.random() * 30) | 0)),
          fuerza: k.fuerza || (1.15 + Math.random() * 0.5)
        });
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
      const a = Math.pow(1 - f, 1.3);
      const h = p.hue;                      // el color NO cambia: solo se desvanece

      if (p.tipo === 'rombo') {
        dibujarRomboRegalo(p.x, p.y, p.tam * 2.6, p.rot, h, a);
      } else if (p.tipo === 'pixel') {
        dibujarPixelRegalo(p.x, p.y, p.tam * 2.3, p.rot, h, a);
      } else if (p.tipo === 'punto') {
        dibujarPuntoRegalo(p.x, p.y, p.tam * 1.5, h, a);
      } else if (p.tipo === 'estrella') {
        const brillo = 0.65 + 0.35 * Math.sin(p.t * 0.7 + p.rot);   // titileo
        dibujarEstrellaRegalo(p.x, p.y, p.tam * 3.6, p.rot * 0.2, h, a * brillo);
      } else if (p.tipo === 'glifo') {
        if (Math.random() < 0.06) p.glifo = GLIFOS_REGALO[(Math.random() * GLIFOS_REGALO.length) | 0];   // cambia como lluvia de codigo
        if (Math.random() > 0.10) dibujarGlifoRegalo(p.x, p.y, p.tam, h, a, p.glifo);                    // parpadeo glitch
      } else {
        c.beginPath();
        c.moveTo(p.x - p.vx * 1.8, p.y - p.vy * 1.8);
        c.lineTo(p.x, p.y);
        c.strokeStyle = nRegalo(h, 50, a * 0.30);
        c.lineWidth = p.tam * 3.4;
        c.stroke();
        c.strokeStyle = nRegalo(h, 68, a);
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
      // Orbita eliptica (como la del corazon): un anillo del color base + uno interior del otro color
      c.beginPath();
      c.ellipse(r.x, r.y, r.r, r.r * 0.38, 0, 0, TAU);
      c.strokeStyle = nRegalo(r.hue, 60, a * 0.85);
      c.lineWidth = 1.4;
      c.stroke();
      c.beginPath();
      c.ellipse(r.x, r.y, r.r * 0.62, r.r * 0.62 * 0.38, 0, 0, TAU);
      c.strokeStyle = nRegalo(opuestoRegalo(r.hue), 60, a * 0.5);
      c.lineWidth = 1;
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
    aperturaCaja = 0; velAperturaCaja = 0;  // la caja arranca cerrada
    arrancarCajaRegalo();                   // enciende el motor 3D
    programarRegalo(aparecerRegalo, 250);
  }

  function detenerRegalo() {
    cancelarTemporizadoresRegalo();
    detenerFuenteRegalo();
    detenerCajaRegalo();                    // apaga el motor 3D (no consume CPU con el tema apagado)
    silenciarSonidoRegalo();                // si estaba sonando, se corta con un fundido rapido
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