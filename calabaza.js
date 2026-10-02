/* =====================================================================
   CALABAZA.JS  (tema-plugin)  -  Halloween cyberpunk
   -----------------------------------------------------------------
   Se registra solo en el menu de opciones-temas.js mediante
   window.OpcionesTemas.registrarTema(...). No toca ningun otro archivo.

   Orden de carga en tu HTML:
     <script src="opciones-temas.js"></script>
     <script src="florcita_amarilla.js"></script>   (opcional)
     <script src="calabaza.js"></script>

   Cambios de esta version:
   - CALENDARIO COMPARTIDO: las peliculas se guardan en Firebase Realtime
     Database (via REST, sin librerias). Todos ven lo mismo y se actualiza
     solo cada pocos segundos. Si no configuras FIREBASE_URL funciona en
     modo local (localStorage) y, si existe peliculas.json en tu proyecto,
     lo usa como lista inicial (solo lectura).
   - FIX particulas: la explosion fallaba a veces porque el primer cuadro
     podia tener tiempo negativo y arc() lanzaba error (mataba la animacion).
     Ademas las particulas ahora van por encima de la cara de susto.
   - FIX celular: se puede arrastrar desde cualquier parte de la pelicula
     con pulsacion larga (~0.2 s); el scroll de la lista sigue funcionando.
     El toque corto sigue seleccionando.
   - MUSICA al entrar al tema, con un poquito de reverb.

   Formato del JSON (peliculas.json / boton { }):
     { "version": 1, "peliculas": [ { "id": "p1", "titulo": "Scream", "fecha": "2026-10-31" } ] }

   API extra (consola o tu propio codigo):
     window.CalabazaHalloween.exportarJSON()
     window.CalabazaHalloween.importarJSON(texto)
     window.CalabazaHalloween.irA(2027, 9)      // año, mes (0 = enero)
     window.CalabazaHalloween.aloquese()        // fuerza un ataque de locura
     window.CalabazaHalloween.explotar()        // fuerza la explosion
     window.CalabazaHalloween.sincronizar()     // fuerza una lectura de la nube
   ===================================================================== */

(function () {
  "use strict";

  if (!window.OpcionesTemas) {
    console.error('[calabaza] opciones-temas.js debe cargarse ANTES que este archivo.');
    return;
  }

  /* ---------- CONFIGURACION (edita a gusto) ------------------------------ */

  // ---- Calendario compartido (Firebase Realtime Database) ----
  // Pega aqui la URL de tu base de datos, por ejemplo:
  //   'https://mi-proyecto-default-rtdb.firebaseio.com'
  // Si lo dejas vacio ('') funciona solo en modo local.
  const FIREBASE_URL = 'https://calabazainefarium-default-rtdb.firebaseio.com';
  const RUTA_DB = 'calabaza/peliculas';   // carpeta dentro de la base de datos
  const SYNC_MS = 4000;                   // cada cuanto lee cambios de otros (ms)
  const ARCHIVO_SEMILLA = 'peliculas.json'; // lista inicial en modo local (opcional)

  // ---- Musica ----
  const MUSICA = true;
  const MUSICA_URL = "./cirice_ghost.mp3";        // <-- pon aqui la ruta de TU cancion
  const MUSICA_VOL = 0.25;                 // 0 a 1
  const MUSICA_REVERB = 0.45;             // cantidad de reverb (0 = nada, 0.22 = poquito, 0.5 = mucho)

  const ANIO_INICIAL = 2026;
  const MES_INICIAL = 9;           // 0 = enero ... 9 = octubre
  const ANIO_MIN = 1900;
  const ANIO_MAX = 2200;
  const SEMANA_INICIA_LUNES = true;
  const CLAVE_ALMACEN = 'calabaza_calendario_v1';
  const VEL_RODAR = 60;            // velocidad normal (px/segundo)

  // Modo "loco"
  const LOCO_ESPERA_MIN = 7;       // segundos minimos entre ataques
  const LOCO_ESPERA_MAX = 14;      // segundos maximos entre ataques
  const LOCO_VELOCIDAD = 4.5;      // multiplicador de velocidad durante el ataque
  const LOCO_SALTO = 0.42;         // altura de los saltos (fraccion del tamaño)
  const EXPLOTAR = true;           // si nadie la toca, explota
  const EXPLOTA_MIN = 3;           // segundos de locura antes de explotar (minimo)
  const EXPLOTA_MAX = 5;           // (maximo)
  const REAPARECE_MS = 3200;       // cuanto tarda en volver tras explotar
  const SONIDO = true;             // sonido del "boom"

  // Murcielagos
  const MURCIELAGOS = true;

  const REMOTO = !!FIREBASE_URL;

  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
                 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const DIAS_LUNES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const DIAS_SEMANA = SEMANA_INICIA_LUNES ? DIAS_LUNES : [DIAS_LUNES[6]].concat(DIAS_LUNES.slice(0, 6));

  /* ---------- 1. ESTILOS ------------------------------------------------- */
  const estilos = document.createElement('style');
  estilos.textContent = `
    .overlay-calabaza { display: none; --cal-tam: clamp(190px, 44vmin, 380px); }

    .fondo-calabaza {
      position: fixed; inset: 0; z-index: 3; pointer-events: none;
      background:
        radial-gradient(ellipse at 50% 100%, rgba(255,122,26,0.16), transparent 55%),
        radial-gradient(ellipse at 12% 8%, rgba(123,44,255,0.22), transparent 50%),
        radial-gradient(ellipse at 92% 32%, rgba(57,255,136,0.10), transparent 45%),
        repeating-linear-gradient(0deg, rgba(57,255,136,0.035) 0px, rgba(57,255,136,0.035) 1px, transparent 2px, transparent 4px);
    }

    .cal-titulo, .cal-fantasma, .cal-ayuda b, .cal-input { text-transform: uppercase; }

    /* ----- Suelo ----- */
    .suelo-calabaza {
      position: fixed; left: 0; right: 0; height: 10px; z-index: 4; pointer-events: none;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 6px + var(--cal-tam) * 0.16 - 8px);
    }
    .suelo-calabaza::before {
      content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px;
      background: linear-gradient(90deg, transparent, #39ff88 14%, #c8ffe0 50%, #39ff88 86%, transparent);
      box-shadow: 0 0 6px #39ff88, 0 0 18px rgba(57,255,136,0.55), 0 8px 22px rgba(255,122,26,0.25);
    }
    .suelo-calabaza::after {
      content: ""; position: absolute; left: 6%; right: 6%; top: 6px; height: 1px;
      background: repeating-linear-gradient(90deg, rgba(180,110,255,0.85) 0 14px, transparent 14px 28px);
      -webkit-mask-image: linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent);
              mask-image: linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent);
      opacity: 0.6;
      animation: correrSueloCalabaza 3.2s linear infinite;
    }
    @keyframes correrSueloCalabaza {
      from { background-position: 0 0; }
      to   { background-position: 28px 0; }
    }

    /* ----- La calabaza (boton + canvas 3D) ----- */
    .calabaza-holo {
      position: fixed; left: 0;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 6px);
      width: var(--cal-tam); height: var(--cal-tam);
      margin: 0; padding: 0; border: none; background: transparent;
      z-index: 6; cursor: pointer; will-change: transform;
      transform-origin: 50% 100%;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .calabaza-holo.oculta { display: none; }
    .calabaza-holo:focus-visible { outline: 2px solid #ff00c8; outline-offset: 2px; border-radius: 50%; }
    .calabaza-lienzo {
      display: block; width: 100%; height: 100%;
      filter: drop-shadow(0 0 8px rgba(255,128,24,0.55)) drop-shadow(0 0 18px rgba(57,255,136,0.35));
      animation: parpadeoHoloCalabaza 4.4s infinite;
      transition: transform 0.15s ease;
    }
    .calabaza-holo:active .calabaza-lienzo { transform: scale(0.92); }
    @keyframes parpadeoHoloCalabaza {
      0%, 100% { opacity: 1; }
      92% { opacity: 1; }
      93% { opacity: 0.55; }
      94% { opacity: 1; }
      96% { opacity: 0.72; }
      97% { opacity: 1; }
    }
    /* Ataque de locura: glitch de color y temblor (siempre activo, aunque el sistema reduzca animaciones) */
    .calabaza-holo.loca .calabaza-lienzo {
      animation: locuraCalabaza 0.24s steps(1) infinite;
    }
    @keyframes locuraCalabaza {
      0%   { filter: drop-shadow(0 0 10px rgba(255,0,200,0.9)) drop-shadow(0 0 26px rgba(255,128,24,0.8)); transform: translate(0, 0); opacity: 1; }
      25%  { filter: drop-shadow(0 0 10px rgba(57,255,136,0.9)) drop-shadow(0 0 26px rgba(123,44,255,0.8)) hue-rotate(60deg); transform: translate(-4px, 1px); opacity: 0.8; }
      50%  { filter: drop-shadow(0 0 12px rgba(255,128,24,1)) drop-shadow(0 0 30px rgba(255,0,200,0.8)); transform: translate(3px, -3px); opacity: 1; }
      75%  { filter: drop-shadow(0 0 10px rgba(0,255,255,0.9)) drop-shadow(0 0 26px rgba(255,128,24,0.8)) hue-rotate(-50deg); transform: translate(4px, 2px); opacity: 0.7; }
      100% { filter: drop-shadow(0 0 10px rgba(255,0,200,0.9)) drop-shadow(0 0 26px rgba(255,128,24,0.8)); transform: translate(0, 0); opacity: 1; }
    }

    /* ----- Explosion + cara de scream ----- */
    /* z-index 55: las particulas van POR ENCIMA de la cara de susto (z 50) */
    .cal-boom { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 55; pointer-events: none; display: none; }
    .cal-flash {
      position: fixed; inset: 0; z-index: 45; pointer-events: none;
      background: radial-gradient(circle, #fff 0%, #ffe2b0 38%, #ff7a1a 100%);
      animation: flashCalabaza 0.55s ease-out forwards;
    }
    @keyframes flashCalabaza { 0% { opacity: 0.95; } 100% { opacity: 0; } }
    .cal-susto {
      position: fixed; inset: 0; z-index: 50; pointer-events: none;
      display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle, rgba(0,0,0,0.25) 10%, rgba(0,0,0,0.78) 100%);
      animation: fondoSustoCalabaza 1.6s ease-out forwards;
    }
    .cal-susto svg {
      height: min(80vh, 640px); width: auto;
      filter: drop-shadow(0 0 14px #ff00c8) drop-shadow(0 0 36px rgba(255,122,26,0.85));
      animation: sustoCalabaza 1.6s ease-out forwards;
    }
    @keyframes fondoSustoCalabaza { 0% { opacity: 0; } 8% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes sustoCalabaza {
      0%   { transform: scale(0.15); }
      8%   { transform: scale(1.3); }
      14%  { transform: scale(1) translate(0, 0); }
      24%  { transform: scale(1.04) translate(-7px, 3px); }
      34%  { transform: scale(1.02) translate(7px, -4px); }
      44%  { transform: scale(1.05) translate(-6px, -3px); }
      54%  { transform: scale(1.03) translate(6px, 4px); }
      75%  { transform: scale(1.07) translate(0, 0); }
      100% { transform: scale(1.14); }
    }

    /* ----- Murcielagos ----- */
    .cal-murcis { position: fixed; inset: 0; z-index: 22; pointer-events: none; overflow: hidden; }
    .cal-murci {
      position: absolute; --aleteo: 0.4s; will-change: transform;
      filter: drop-shadow(0 0 4px rgba(180,110,255,0.95)) drop-shadow(0 0 9px rgba(255,122,26,0.45));
    }
    .cal-murci svg { display: block; width: 100%; height: auto; overflow: visible; }
    .ala-i { transform-origin: 30px 17px; animation: aleteoIzqCalabaza var(--aleteo) ease-in-out infinite alternate; }
    .ala-d { transform-origin: 30px 17px; animation: aleteoDerCalabaza var(--aleteo) ease-in-out infinite alternate; }
    @keyframes aleteoIzqCalabaza { from { transform: rotate(-30deg) scaleY(1.05); } to { transform: rotate(24deg) scaleY(0.7); } }
    @keyframes aleteoDerCalabaza { from { transform: rotate(30deg) scaleY(1.05); } to { transform: rotate(-24deg) scaleY(0.7); } }

    /* ----- Panel del calendario ----- */
    .cal-panel {
      position: fixed; z-index: 20;
      top: 66px; left: 10px; right: 10px;
      bottom: calc(10px + env(safe-area-inset-bottom, 0px));
      display: none; flex-direction: column; gap: 8px;
      padding: 10px; overflow: hidden;
      font-family: 'Courier New', monospace; color: #d9ffe9;
      background: linear-gradient(180deg, rgba(20,8,36,0.94), rgba(8,4,16,0.96));
      border: 1px solid #39ff88; border-radius: 10px;
      box-shadow: 0 0 14px rgba(57,255,136,0.4), 0 0 36px rgba(255,122,26,0.18), inset 0 0 22px rgba(123,44,255,0.18);
      user-select: none; -webkit-user-select: none;
      outline: none;
    }
    .cal-panel.abierto { display: flex; animation: abrirPanelCal 0.28s cubic-bezier(0.2, 1.2, 0.4, 1); }
    @keyframes abrirPanelCal {
      from { opacity: 0; transform: translateY(14px) scale(0.97); }
      to   { opacity: 1; transform: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cal-panel.abierto { animation: none; }
      .suelo-calabaza::after { animation: none; }
    }

    .cal-cabecera { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .cal-espacio { flex: 1 1 0; }
    .cal-estado { font-size: 0.82rem; white-space: nowrap; opacity: 0.9; color: #9bf5c4; }
    .cal-estado.mal { color: #ff6a6a; }
    .cal-estado.local { color: #ff9a3d; }
    .cal-btn {
      min-width: 42px; height: 42px; padding: 0 14px;
      font: inherit; font-size: 1.1rem; color: #39ff88; cursor: pointer;
      background: rgba(57,255,136,0.07);
      border: 1px solid rgba(57,255,136,0.55); border-radius: 6px;
    }
    .cal-btn:hover, .cal-btn:focus-visible {
      background: rgba(57,255,136,0.18); outline: none; box-shadow: 0 0 8px rgba(57,255,136,0.5);
    }
    .cal-select, .cal-anio {
      height: 42px; padding: 0 10px; font: inherit; font-size: 1.2rem; color: #ff9a3d;
      background: rgba(255,122,26,0.08); border: 1px solid #ff7a1a; border-radius: 6px;
      text-shadow: 0 0 6px rgba(255,122,26,0.7);
    }
    .cal-select option { background: #12081f; color: #ff9a3d; }
    .cal-anio { width: 100px; user-select: text; -webkit-user-select: text; }
    .cal-select:focus-visible, .cal-anio:focus-visible, .cal-input:focus-visible,
    .cal-json textarea:focus-visible { outline: 2px solid #ff00c8; outline-offset: 1px; }

    .cal-cuerpo { flex: 1 1 0; min-height: 0; display: flex; gap: 10px; }
    .cal-calendario { flex: 1 1 0; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
    .cal-semana { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; margin-bottom: 3px; }
    .cal-semana span { text-align: center; padding: 2px 0; font-size: clamp(0.78rem, 1.7vw, 1.05rem); letter-spacing: 0.5px; color: #39ff88; opacity: 0.9; }
    .cal-grilla { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }

    .cal-dia {
      position: relative; min-width: 0; min-height: 0; overflow: hidden;
      display: flex; flex-direction: column; gap: 2px; padding: 3px;
      border: 1px solid rgba(57,255,136,0.28); border-radius: 5px;
      background: rgba(57,255,136,0.03);
    }
    .cal-dia.vacio { border-color: transparent; background: transparent; }
    .cal-dia.hoy { border-color: #ff7a1a; box-shadow: inset 0 0 8px rgba(255,122,26,0.35); }
    .cal-dia.objetivo { cursor: pointer; }
    .cal-dia.sobre { border-color: #ff00c8; background: rgba(255,0,200,0.14); box-shadow: 0 0 10px rgba(255,0,200,0.5); }
    .cal-num { font-size: 1rem; line-height: 1; color: #9bf5c4; }
    .cal-dia.hoy .cal-num { color: #ff9a3d; }
    .cal-dia.halloween .cal-num::after { content: " \\1F383"; }
    .cal-chips {
      flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: 2px;
      overflow-y: auto; scrollbar-width: none;
    }
    .cal-chips::-webkit-scrollbar { display: none; }

    .cal-peli {
      display: flex; align-items: center; gap: 4px; min-width: 0;
      padding: 3px 6px; font-size: 0.95rem; line-height: 1.15; color: #ffd9b3; cursor: grab;
      background: rgba(255,122,26,0.14); border: 1px solid rgba(255,122,26,0.7); border-radius: 5px;
      -webkit-user-select: none; user-select: none;
      -webkit-touch-callout: none; -webkit-user-drag: none;
    }
    .cal-peli.sel {
      color: #fff; background: rgba(255,0,200,0.2);
      border-color: #ff00c8; box-shadow: 0 0 8px rgba(255,0,200,0.6);
    }
    .cal-titulo { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cal-peli.en-dia { flex: none; padding: 1px 4px; font-size: 0.82rem; touch-action: none; }
    .cal-peli.en-dia .cal-titulo {
      white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .cal-peli.en-lista { padding: 2px 8px 2px 2px; min-height: 40px; }
    .cal-asa {
      flex: none; display: flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; font-size: 1.3rem; color: #ff9a3d; cursor: grab; touch-action: none;
    }

    .cal-lista-zona {
      flex: none; width: min(360px, 36%); min-height: 0;
      display: flex; flex-direction: column; gap: 8px; padding: 10px;
      border: 1px dashed rgba(255,122,26,0.6); border-radius: 8px; background: rgba(255,122,26,0.04);
    }
    .cal-lista-zona.sobre { border-style: solid; border-color: #ff00c8; box-shadow: 0 0 10px rgba(255,0,200,0.45); }
    .cal-lista-titulo {
      margin: 0; font-size: 1.15rem; font-weight: normal; color: #ff9a3d;
      text-shadow: 0 0 6px rgba(255,122,26,0.7);
    }
    .cal-agregar { display: flex; gap: 6px; }
    .cal-input {
      flex: 1 1 auto; min-width: 0; height: 42px; padding: 0 10px;
      font: inherit; font-size: 18px; color: #d9ffe9;
      background: rgba(0,0,0,0.4); border: 1px solid rgba(57,255,136,0.55); border-radius: 6px;
      user-select: text; -webkit-user-select: text;
    }
    .cal-lista { flex: 1 1 0; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 2px; -webkit-overflow-scrolling: touch; }
    .cal-vacio { font-size: 0.95rem; line-height: 1.4; opacity: 0.75; }
    .cal-ayuda { flex: none; font-size: 0.92rem; line-height: 1.4; color: #9bf5c4; }
    .cal-ayuda b { font-weight: normal; color: #ff9a3d; }
    .cal-acciones { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .cal-acciones .cal-btn { height: 38px; font-size: 0.92rem; padding: 0 10px; }

    .cal-json {
      position: absolute; inset: 8px; z-index: 2; display: none; flex-direction: column; gap: 8px; padding: 12px;
      background: rgba(10,4,20,0.98); border: 1px solid #ff00c8; border-radius: 8px;
      box-shadow: 0 0 18px rgba(255,0,200,0.45);
    }
    .cal-json.abierto { display: flex; }
    .cal-json textarea {
      flex: 1 1 0; min-height: 0; resize: none; padding: 8px;
      font-family: inherit; font-size: 0.98rem; color: #d9ffe9;
      background: rgba(0,0,0,0.5); border: 1px solid rgba(57,255,136,0.55); border-radius: 6px;
      user-select: text; -webkit-user-select: text;
    }
    .cal-json-acciones { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .cal-json-msg { font-size: 0.95rem; min-height: 1.2em; color: #9bf5c4; }

    .cal-fantasma {
      position: fixed; left: 0; top: 0; z-index: 60; pointer-events: none; max-width: 240px;
      padding: 6px 12px; font-family: 'Courier New', monospace; font-size: 1rem; color: #fff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      background: rgba(255,122,26,0.35); border: 1px solid #ff00c8; border-radius: 6px;
      box-shadow: 0 0 12px rgba(255,0,200,0.6);
    }

    @media (max-width: 720px) {
      .cal-cuerpo { flex-direction: column; }
      .cal-lista-zona { width: auto; flex: 0 0 42%; }
      .cal-num { font-size: 0.88rem; }
      .cal-peli.en-dia { font-size: 0.72rem; }
      .cal-btn { min-width: 38px; height: 38px; padding: 0 10px; font-size: 1rem; }
      .cal-select, .cal-anio { height: 38px; font-size: 1.05rem; }
      .cal-anio { width: 84px; }
    }
  `;
  document.head.appendChild(estilos);

  /* ---------- 2. HTML ----------------------------------------------------- */
  const overlay = document.createElement('div');
  overlay.className = 'overlay-calabaza';
  overlay.innerHTML = `
    <div class="fondo-calabaza"></div>
    <div class="suelo-calabaza"></div>

    <button class="calabaza-holo" id="calabazaHolo" aria-label="Abrir calendario de Halloween">
      <canvas class="calabaza-lienzo" id="calabazaLienzo" width="100" height="100" aria-hidden="true"></canvas>
    </button>

    <canvas class="cal-boom" id="calBoom" aria-hidden="true"></canvas>
    <div class="cal-murcis" id="calMurcis" aria-hidden="true"></div>

    <section class="cal-panel" id="calPanel" role="dialog" aria-label="Calendario de películas de Halloween" tabindex="-1">
      <header class="cal-cabecera">
        <button class="cal-btn" id="calPrev" aria-label="Mes anterior">◀</button>
        <select class="cal-select" id="calMes" aria-label="Mes"></select>
        <input class="cal-anio" id="calAnio" type="number" inputmode="numeric" aria-label="Año">
        <button class="cal-btn" id="calNext" aria-label="Mes siguiente">▶</button>
        <button class="cal-btn" id="calHoy">Hoy</button>
        <span class="cal-espacio"></span>
        <span class="cal-estado" id="calEstado" aria-live="polite"></span>
        <button class="cal-btn" id="calJsonBtn" aria-label="Ver o cargar JSON">{ }</button>
        <button class="cal-btn" id="calCerrar" aria-label="Cerrar calendario">✕</button>
      </header>

      <div class="cal-cuerpo">
        <div class="cal-calendario">
          <div class="cal-semana" id="calSemana"></div>
          <div class="cal-grilla" id="calGrilla"></div>
        </div>
        <aside class="cal-lista-zona" id="calListaZona">
          <h3 class="cal-lista-titulo">Películas por ver</h3>
          <div class="cal-agregar">
            <input class="cal-input" id="calInput" type="text" maxlength="60" placeholder="Nombre de la película" aria-label="Nombre de la película">
            <button class="cal-btn" id="calAgregar">Agregar</button>
          </div>
          <div class="cal-lista" id="calLista"></div>
          <div class="cal-ayuda" id="calAyuda"></div>
        </aside>
      </div>

      <div class="cal-json" id="calJson">
        <textarea id="calJsonTexto" spellcheck="false" aria-label="JSON del calendario"></textarea>
        <div class="cal-json-acciones">
          <button class="cal-btn" id="calJsonCopiar">Copiar</button>
          <button class="cal-btn" id="calJsonAplicar">Cargar este JSON</button>
          <button class="cal-btn" id="calJsonCerrar">Cerrar</button>
        </div>
        <div class="cal-json-msg" id="calJsonMsg"></div>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);

  const $ = (id) => overlay.querySelector('#' + id);
  const botonCalabaza = $('calabazaHolo');
  const lienzo = $('calabazaLienzo');
  const ctx = lienzo.getContext('2d');
  const lienzoBoom = $('calBoom');
  const capaMurcis = $('calMurcis');
  const panel = $('calPanel');
  const selMes = $('calMes');
  const inpAnio = $('calAnio');
  const semanaEl = $('calSemana');
  const grillaEl = $('calGrilla');
  const listaEl = $('calLista');
  const ayudaEl = $('calAyuda');
  const inpPeli = $('calInput');
  const jsonCaja = $('calJson');
  const jsonTexto = $('calJsonTexto');
  const jsonMsg = $('calJsonMsg');
  const estadoEl = $('calEstado');

  /* ---------- 3. DATOS (peliculas + JSON + nube) -------------------------- */
  let datos = { version: 1, peliculas: [] };
  let vistaAnio = ANIO_INICIAL;
  let vistaMes = MES_INICIAL;
  let seleccionId = null;
  let activo = false;

  // Control de sincronizacion
  let versionLocal = 0;       // sube con cada cambio hecho en ESTE dispositivo
  let pendientes = 0;         // escrituras a la nube en vuelo
  let finEscritura = 0;       // cuando termino la ultima escritura
  let sincronizando = false;
  let tSync = null;

  const fechaValida = (f) => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f);
  const nuevoId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clave = (y, m, d) => String(y).padStart(4, '0') + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  const limpiarId = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '');

  function normalizar(obj) {
    const lista = Array.isArray(obj) ? obj : (obj && Array.isArray(obj.peliculas) ? obj.peliculas : []);
    const usados = {};
    const salida = [];
    lista.forEach((p) => {
      if (!p || typeof p.titulo !== 'string') return;
      const titulo = p.titulo.trim().slice(0, 60).toLocaleUpperCase('es');
      if (!titulo) return;
      let id = (typeof p.id === 'string' || typeof p.id === 'number') ? limpiarId(p.id) : '';
      if (!id || usados[id]) id = nuevoId();
      usados[id] = true;
      salida.push({ id: id, titulo: titulo, fecha: fechaValida(p.fecha) ? p.fecha : null });
    });
    return { version: 1, peliculas: salida };
  }

  function estado(ok) {
    if (!REMOTO) {
      estadoEl.textContent = '● LOCAL';
      estadoEl.className = 'cal-estado local';
      estadoEl.title = 'Solo se guarda en este dispositivo (falta configurar FIREBASE_URL)';
    } else if (ok) {
     
      estadoEl.className = 'cal-estado';
      estadoEl.title = 'Todos ven las mismas películas';
    } else {
      estadoEl.textContent = '● SIN CONEXIÓN';
      estadoEl.className = 'cal-estado mal';
      estadoEl.title = 'No se pudo hablar con la nube; reintentando';
    }
  }

  function cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE_ALMACEN);
      if (crudo) datos = normalizar(JSON.parse(crudo));
    } catch (err) { /* sin almacenamiento o JSON roto: se parte vacio */ }
  }
  function guardar() {   // copia local (cache); la verdad compartida esta en la nube
    try { localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(datos)); } catch (err) { /* ignorar */ }
  }

  // Lista inicial desde peliculas.json (solo modo local y solo si no hay nada guardado)
  async function cargarSemilla() {
    if (REMOTO || datos.peliculas.length) return;
    try {
      const r = await fetch(ARCHIVO_SEMILLA, { cache: 'no-store' });
      if (!r.ok) return;
      const nuevo = normalizar(await r.json());
      if (!nuevo.peliculas.length || datos.peliculas.length) return;
      datos = nuevo;
      guardar();
      if (panel.classList.contains('abierto')) render();
    } catch (err) { /* no hay archivo: se ignora */ }
  }

  /* ----- Nube (Firebase Realtime Database por REST) ----- */
  function rutaDB(id) {
    return FIREBASE_URL.replace(/\/+$/, '') + '/' + RUTA_DB + (id ? '/' + encodeURIComponent(id) : '') + '.json';
  }
  async function peticion(metodo, id, cuerpo) {
    pendientes++;
    try {
      const r = await fetch(rutaDB(id), {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      estado(true);
      return true;
    } catch (err) {
      estado(false);
      return false;
    } finally {
      pendientes--;
      finEscritura = performance.now();
    }
  }
  function subir(p) {
    if (!REMOTO) return;
    peticion('PUT', p.id, { titulo: p.titulo, fecha: p.fecha || null });
  }
  function bajarUna(id) {
    if (!REMOTO) return;
    peticion('DELETE', id);
  }

  async function sincronizar() {
    if (!REMOTO || sincronizando) return;
    sincronizando = true;
    const inicio = performance.now();
    const v = versionLocal;
    try {
      const r = await fetch(rutaDB() + '?_=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const crudo = await r.json();
      estado(true);
      // Si hubo cambios propios en el medio, esta lectura ya es vieja: se descarta.
      if (pendientes > 0 || v !== versionLocal || inicio < finEscritura || arrastre) return;
      const lista = crudo && typeof crudo === 'object'
        ? Object.keys(crudo).map((id) => Object.assign({ id: id }, crudo[id]))
        : [];
      const nuevo = normalizar(lista);
      const firma = (arr) => JSON.stringify(arr.slice().sort((a, b) => (a.id < b.id ? -1 : 1)));
      if (firma(nuevo.peliculas) !== firma(datos.peliculas)) {
        datos = nuevo;
        if (seleccionId && !buscar(seleccionId)) seleccionId = null;
        guardar();
        if (panel.classList.contains('abierto')) render();
      }
    } catch (err) {
      estado(false);
    } finally {
      sincronizando = false;
    }
  }
  function iniciarSync() {
    if (!REMOTO || tSync) return;
    sincronizar();
    tSync = setInterval(sincronizar, SYNC_MS);
  }
  function pararSync() {
    clearInterval(tSync);
    tSync = null;
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && panel.classList.contains('abierto')) sincronizar();
  });

  /* ----- Operaciones ----- */
  function exportarJSON() { return JSON.stringify(datos, null, 2); }
  function importarJSON(texto) {
    let nuevo;
    try { nuevo = normalizar(JSON.parse(texto)); } catch (err) { return false; }
    datos = nuevo;
    seleccionId = null;
    versionLocal++;
    guardar();
    render();
    if (REMOTO) {
      const mapa = {};
      datos.peliculas.forEach((p) => { mapa[p.id] = { titulo: p.titulo, fecha: p.fecha || null }; });
      peticion('PUT', null, datos.peliculas.length ? mapa : null);
    }
    return true;
  }

  function buscar(id) { return datos.peliculas.find((p) => p.id === id); }
  function asignar(id, fecha) {
    const p = buscar(id);
    if (!p) return;
    p.fecha = fecha;
    seleccionId = null;
    versionLocal++;
    guardar();
    subir(p);
    render();
  }
  function borrar(id) {
    datos.peliculas = datos.peliculas.filter((p) => p.id !== id);
    seleccionId = null;
    versionLocal++;
    guardar();
    bajarUna(id);
    render();
  }
  function agregarPelicula() {
    const titulo = inpPeli.value.trim().slice(0, 60).toLocaleUpperCase('es');
    if (!titulo) return;
    const p = { id: nuevoId(), titulo: titulo, fecha: null };
    datos.peliculas.push(p);
    inpPeli.value = '';
    versionLocal++;
    guardar();
    subir(p);
    render();
  }

  /* ---------- 4. RENDER del calendario y la lista ------------------------- */
  let bloqueoClick = 0;

  function crearChip(p, enDia) {
    const el = document.createElement('div');
    el.className = 'cal-peli ' + (enDia ? 'en-dia' : 'en-lista') + (p.id === seleccionId ? ' sel' : '');
    el.dataset.id = p.id;
    el.title = p.titulo;
    if (!enDia) {
      const asa = document.createElement('span');
      asa.className = 'cal-asa';
      asa.textContent = '≡';
      el.appendChild(asa);
    }
    const t = document.createElement('span');
    t.className = 'cal-titulo';
    t.textContent = p.titulo;
    el.appendChild(t);
    el.addEventListener('pointerdown', alPresionarChip);
    el.addEventListener('contextmenu', (e) => e.preventDefault());   // evita el menu de la pulsacion larga
    el.addEventListener('dragstart', (e) => e.preventDefault());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (performance.now() < bloqueoClick) return;
      seleccionId = (seleccionId === p.id) ? null : p.id;
      render();
    });
    return el;
  }

  function renderSemana() {
    semanaEl.textContent = '';
    DIAS_SEMANA.forEach((d) => {
      const s = document.createElement('span');
      s.textContent = d;
      semanaEl.appendChild(s);
    });
  }

  function renderCalendario() {
    const y = vistaAnio, m = vistaMes;
    const dow = new Date(y, m, 1).getDay();
    const desfase = SEMANA_INICIA_LUNES ? (dow + 6) % 7 : dow;
    const dias = new Date(y, m + 1, 0).getDate();
    const filas = Math.ceil((desfase + dias) / 7);
    const hoy = new Date();
    const claveHoy = clave(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    const porDia = {};
    datos.peliculas.forEach((p) => { if (p.fecha) (porDia[p.fecha] = porDia[p.fecha] || []).push(p); });

    grillaEl.style.gridTemplateRows = 'repeat(' + filas + ', minmax(0, 1fr))';
    grillaEl.textContent = '';

    for (let i = 0; i < filas * 7; i++) {
      const d = i - desfase + 1;
      const celda = document.createElement('div');
      if (d < 1 || d > dias) {
        celda.className = 'cal-dia vacio';
        grillaEl.appendChild(celda);
        continue;
      }
      const f = clave(y, m, d);
      celda.className = 'cal-dia' + (f === claveHoy ? ' hoy' : '') + (m === 9 && d === 31 ? ' halloween' : '') + (seleccionId ? ' objetivo' : '');
      celda.dataset.fecha = f;

      const num = document.createElement('div');
      num.className = 'cal-num';
      num.textContent = d;
      celda.appendChild(num);

      const chips = document.createElement('div');
      chips.className = 'cal-chips';
      (porDia[f] || []).forEach((p) => chips.appendChild(crearChip(p, true)));
      celda.appendChild(chips);

      celda.addEventListener('click', () => {
        if (performance.now() < bloqueoClick) return;
        if (seleccionId) asignar(seleccionId, f);
      });
      grillaEl.appendChild(celda);
    }
  }

  function renderLista() {
    const scroll = listaEl.scrollTop;
    listaEl.textContent = '';
    const pendientesLista = datos.peliculas.filter((p) => !p.fecha);
    if (!pendientesLista.length) {
      const v = document.createElement('div');
      v.className = 'cal-vacio';
      v.textContent = datos.peliculas.length
        ? 'Todas las películas ya tienen día. Agrega otra o devuélvelas desde el calendario.'
        : 'Aún no hay películas. Escribe un nombre arriba y toca Agregar.';
      listaEl.appendChild(v);
    }
    pendientesLista.forEach((p) => listaEl.appendChild(crearChip(p, false)));
    listaEl.scrollTop = scroll;
  }

  function botonAccion(texto, fn) {
    const b = document.createElement('button');
    b.className = 'cal-btn';
    b.textContent = texto;
    b.addEventListener('click', fn);
    return b;
  }

  function renderAyuda() {
    ayudaEl.textContent = '';
    const sel = seleccionId ? buscar(seleccionId) : null;
    if (!sel) {
      ayudaEl.textContent = 'Arrastra una pelí a un día, en el celular debes presionar un momento chamoy:3, o tócala y luego toca el día.';
      return;
    }
    const linea = document.createElement('div');
    linea.appendChild(document.createTextNode('Seleccionada: '));
    const negrita = document.createElement('b');
    negrita.textContent = sel.titulo;
    linea.appendChild(negrita);
    linea.appendChild(document.createTextNode(sel.fecha ? '. Toca otro día para moverla.' : '. Toca un día para ponerla.'));
    ayudaEl.appendChild(linea);

    const acc = document.createElement('div');
    acc.className = 'cal-acciones';
    if (sel.fecha) acc.appendChild(botonAccion('Devolver a la lista', () => asignar(sel.id, null)));
    acc.appendChild(botonAccion('Borrar', () => borrar(sel.id)));
    acc.appendChild(botonAccion('Cancelar', () => { seleccionId = null; render(); }));
    ayudaEl.appendChild(acc);
  }

  function sincronizarCabecera() {
    selMes.value = String(vistaMes);
    inpAnio.value = String(vistaAnio);
  }
  function render() {
    renderCalendario();
    renderLista();
    renderAyuda();
  }

  /* ---------- 5. Cabecera: navegacion de meses y años --------------------- */
  MESES.forEach((nombre, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = nombre;
    selMes.appendChild(o);
  });
  inpAnio.min = String(ANIO_MIN);
  inpAnio.max = String(ANIO_MAX);

  function irA(anio, mes) {
    if (!isFinite(anio) || !isFinite(mes)) return;
    if (anio < ANIO_MIN || anio > ANIO_MAX) { sincronizarCabecera(); return; }
    vistaAnio = anio;
    vistaMes = Math.min(Math.max(mes, 0), 11);
    sincronizarCabecera();
    renderCalendario();
  }
  function irMes(delta) {
    let m = vistaMes + delta, y = vistaAnio;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    irA(y, m);
  }

  $('calPrev').addEventListener('click', () => irMes(-1));
  $('calNext').addEventListener('click', () => irMes(1));
  $('calHoy').addEventListener('click', () => { const h = new Date(); irA(h.getFullYear(), h.getMonth()); });
  selMes.addEventListener('change', () => irA(vistaAnio, parseInt(selMes.value, 10)));
  inpAnio.addEventListener('change', () => irA(parseInt(inpAnio.value, 10), vistaMes));
  $('calAgregar').addEventListener('click', () => { agregarPelicula(); inpPeli.focus(); });
  inpPeli.addEventListener('keydown', (e) => { if (e.key === 'Enter') agregarPelicula(); });
  $('calCerrar').addEventListener('click', cerrarCalendario);

  /* ---------- 6. JSON: ver, copiar, cargar -------------------------------- */
  function abrirJson() {
    jsonTexto.value = exportarJSON();
    jsonMsg.textContent = '';
    jsonCaja.classList.add('abierto');
  }
  function cerrarJson() { jsonCaja.classList.remove('abierto'); }

  $('calJsonBtn').addEventListener('click', () => (jsonCaja.classList.contains('abierto') ? cerrarJson() : abrirJson()));
  $('calJsonCerrar').addEventListener('click', cerrarJson);
  $('calJsonCopiar').addEventListener('click', () => {
    jsonTexto.value = exportarJSON();
    const ok = () => { jsonMsg.textContent = 'JSON copiado.'; };
    const fallo = () => {
      jsonTexto.select();
      let listo = false;
      try { listo = document.execCommand('copy'); } catch (err) { /* ignorar */ }
      jsonMsg.textContent = listo ? 'JSON copiado.' : 'No se pudo copiar solo: selecciona el texto y cópialo.';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonTexto.value).then(ok, fallo);
    } else {
      fallo();
    }
  });
  $('calJsonAplicar').addEventListener('click', () => {
    if (REMOTO && !window.confirm('Esto REEMPLAZA las películas que ven todos. ¿Seguro?')) return;
    if (importarJSON(jsonTexto.value)) {
      jsonMsg.textContent = 'Cargado: ' + datos.peliculas.length + ' película(s).';
    } else {
      jsonMsg.textContent = 'JSON no válido. Revisa las comas y las comillas.';
    }
  });

  /* ---------- 7. Arrastrar y soltar (mouse y tactil, con pointer events) ---
     - Mouse: arrastra al mover unos pixeles.
     - Tactil: en el asa (≡) o en una pelicula ya puesta en un dia, arrastra
       al instante. En la lista, mantener presionado ~0.2 s activa el arrastre
       (si mueves el dedo antes, es scroll normal). Un toque corto selecciona.
     ----------------------------------------------------------------------- */
  const UMBRAL_ARRASTRE = 6;
  const ESPERA_LARGA = 220;     // ms de pulsacion larga en tactil
  const TOLERANCIA_LARGA = 10;  // px que puede moverse el dedo durante la espera
  let arrastre = null;

  // Evita que la pagina haga scroll mientras se arrastra (iOS/Android)
  window.addEventListener('touchmove', (e) => {
    if (arrastre && arrastre.activo && e.cancelable) e.preventDefault();
  }, { passive: false });

  function alPresionarChip(e) {
    if (arrastre) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const chip = e.currentTarget;
    const p = buscar(chip.dataset.id);
    if (!p) return;
    const inmediato = e.pointerType === 'mouse' || chip.classList.contains('en-dia') || !!e.target.closest('.cal-asa');
    arrastre = {
      id: p.id, titulo: p.titulo, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      pid: e.pointerId, activo: false, fantasma: null, timer: null, largo: !inmediato
    };
    if (arrastre.largo) {
      arrastre.timer = setTimeout(() => {
        if (arrastre && !arrastre.activo) activarArrastre();
      }, ESPERA_LARGA);
    }
    window.addEventListener('pointermove', alMoverArrastre);
    window.addEventListener('pointerup', alSoltarArrastre);
    window.addEventListener('pointercancel', cancelarArrastre);
  }

  function activarArrastre() {
    arrastre.activo = true;
    const f = document.createElement('div');
    f.className = 'cal-fantasma';
    f.textContent = arrastre.titulo;
    document.body.appendChild(f);
    arrastre.fantasma = f;
    moverFantasma();
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (err) { /* ignorar */ }
  }
  function moverFantasma() {
    const ancho = arrastre.fantasma.offsetWidth;
    const fx = Math.max(4, arrastre.x - 12 - ancho);
    const fy = Math.max(4, arrastre.y - 18);
    arrastre.fantasma.style.transform = 'translate(' + fx + 'px,' + fy + 'px)';
    limpiarResaltado();
    const z = zonaBajo(arrastre.x, arrastre.y);
    if (z) z.el.classList.add('sobre');
  }

  function zonaBajo(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const dia = el.closest('.cal-dia[data-fecha]');
    if (dia) return { tipo: 'dia', fecha: dia.dataset.fecha, el: dia };
    const lista = el.closest('.cal-lista-zona');
    if (lista) return { tipo: 'lista', el: lista };
    return null;
  }
  function limpiarResaltado() {
    panel.querySelectorAll('.sobre').forEach((el) => el.classList.remove('sobre'));
  }

  function alMoverArrastre(e) {
    if (!arrastre || e.pointerId !== arrastre.pid) return;
    arrastre.x = e.clientX;
    arrastre.y = e.clientY;
    if (!arrastre.activo) {
      const dist = Math.hypot(e.clientX - arrastre.x0, e.clientY - arrastre.y0);
      if (arrastre.largo) {
        if (dist > TOLERANCIA_LARGA) cancelarArrastre();   // el dedo se movio antes: es scroll
        return;
      }
      if (dist < UMBRAL_ARRASTRE) return;
      activarArrastre();
      return;
    }
    moverFantasma();
  }

  function terminarSeguimiento() {
    window.removeEventListener('pointermove', alMoverArrastre);
    window.removeEventListener('pointerup', alSoltarArrastre);
    window.removeEventListener('pointercancel', cancelarArrastre);
    if (arrastre) {
      clearTimeout(arrastre.timer);
      if (arrastre.fantasma) arrastre.fantasma.remove();
    }
    limpiarResaltado();
  }
  function alSoltarArrastre(e) {
    if (!arrastre || e.pointerId !== arrastre.pid) return;
    const a = arrastre;
    const huboArrastre = a.activo;
    const destino = huboArrastre ? zonaBajo(e.clientX, e.clientY) : null;
    terminarSeguimiento();
    arrastre = null;
    if (!huboArrastre) return;
    bloqueoClick = performance.now() + 350;
    if (destino && destino.tipo === 'dia') asignar(a.id, destino.fecha);
    else if (destino && destino.tipo === 'lista') asignar(a.id, null);
  }
  function cancelarArrastre() {
    terminarSeguimiento();
    arrastre = null;
  }

  /* =====================================================================
     8. MOTOR 3D DE LA CALABAZA (canvas 2D + proyeccion propia)
     ===================================================================== */
  const COL = {
    o: [255, 128, 24],     // naranja (costillas)
    g: [57, 255, 136],     // verde toxico (tallo, bordes de la cara)
    p: [180, 110, 255],    // violeta (anillos)
    y: [255, 205, 70],     // amarillo-fuego (relleno de la cara)
    m: [255, 0, 200]       // magenta (pupilas)
  };
  const DIST_CAMARA = 5.5;
  const INCLINACION = 0.28;
  const COSTILLAS = 8;
  const ESC_Y = 0.9;

  const MODELO = (function () {
    const caras = [], lineas = [], puntos = [];
    const radio = (phi) => 1 + 0.09 * Math.cos(COSTILLAS * phi);
    const punto = (th, phi) => {
      const r = radio(phi);
      return [r * Math.cos(th) * Math.cos(phi), ESC_Y * r * Math.sin(th), r * Math.cos(th) * Math.sin(phi)];
    };

    // Costillas principales (meridianos)
    for (let k = 0; k < COSTILLAS; k++) {
      const phi = (k / COSTILLAS) * Math.PI * 2;
      const pts = [];
      for (let i = 0; i <= 20; i++) pts.push(punto(-Math.PI / 2 + (i / 20) * Math.PI, phi));
      lineas.push({ p: pts, col: 'o', fino: false, cerrado: false });
    }
    // Costillas finas intermedias
    for (let k = 0; k < COSTILLAS; k++) {
      const phi = ((k + 0.5) / COSTILLAS) * Math.PI * 2;
      const pts = [];
      for (let i = 0; i <= 16; i++) pts.push(punto(-1.3 + (i / 16) * 2.6, phi));
      lineas.push({ p: pts, col: 'p', fino: true, cerrado: false });
    }
    // Anillos
    [[0, false], [0.45, true], [-0.45, true], [0.9, true], [-0.9, true]].forEach((a) => {
      const pts = [];
      for (let i = 0; i < 56; i++) pts.push(punto(a[0], (i / 56) * Math.PI * 2));
      lineas.push({ p: pts, col: 'p', fino: a[1], cerrado: true });
    });
    // Hoyuelos
    [[1.3, 'g'], [-1.3, 'o']].forEach((a) => {
      const pts = [];
      for (let i = 0; i < 32; i++) pts.push(punto(a[0], (i / 32) * Math.PI * 2));
      lineas.push({ p: pts, col: a[1], fino: true, cerrado: true });
    });
    // Nodos luminosos
    [0, 0.9, -0.9].forEach((th) => {
      for (let k = 0; k < COSTILLAS; k++) puntos.push({ p: punto(th, (k / COSTILLAS) * Math.PI * 2), col: 'o' });
    });
    puntos.push({ p: [0, ESC_Y * 0.97, 0], col: 'g' });
    puntos.push({ p: [0, -ESC_Y * 0.97, 0], col: 'g' });

    // Tallo, zarcillo y hoja (quedan "fijos" arriba: no giran con el cuerpo)
    const tallo = [[0, 0.88, 0], [0.02, 0.94, 0.01], [0.05, 1.0, 0.01], [0.1, 1.06, 0], [0.17, 1.1, -0.01], [0.23, 1.12, -0.01]];
    lineas.push({ p: tallo, col: 'g', fino: false, cerrado: false, fijo: true });
    lineas.push({ p: tallo.map((q) => [q[0] + 0.05, q[1] - 0.02, q[2] - 0.03]), col: 'g', fino: true, cerrado: false, fijo: true });
    const baseTallo = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      baseTallo.push([0.09 * Math.cos(a), 0.9, 0.09 * Math.sin(a)]);
    }
    lineas.push({ p: baseTallo, col: 'g', fino: true, cerrado: true, fijo: true });
    const zarcillo = [];
    for (let i = 0; i <= 22; i++) {
      const a = i * 0.55, r = 0.13 * (1 - i / 24);
      zarcillo.push([0.3 + r * Math.cos(a), 1.04 + r * Math.sin(a) + 0.04, -0.02]);
    }
    lineas.push({ p: [[0.2, 1.1, -0.01], [0.26, 1.1, -0.02]].concat(zarcillo), col: 'g', fino: true, cerrado: false, fijo: true });
    const hoja = [[0.0, 0.9, 0.02], [-0.14, 1.03, 0.09], [-0.36, 1.07, 0.16], [-0.3, 0.95, 0.15], [-0.12, 0.9, 0.07]];
    lineas.push({ p: hoja, col: 'g', fino: false, cerrado: true, fijo: true });
    lineas.push({ p: [[0.0, 0.9, 0.02], [-0.18, 0.99, 0.1], [-0.33, 1.03, 0.15]], col: 'g', fino: true, cerrado: false, fijo: true });

    // Cara tallada, siempre derecha y al frente (+z). La cara se dibuja
    // aparte: se recorta el cuerpo detras de ella y se pinta brillante.
    const zc = (x, y) => 1.1 * Math.sqrt(Math.max(0, 1 - x * x - (y / ESC_Y) * (y / ESC_Y))) + 0.02;
    const poligono = (pts, alfa, relleno, linea, borra) => {
      const p3 = pts.map((q) => [q[0], q[1], zc(q[0], q[1])]);
      caras.push({ p: p3, col: relleno, a: alfa, borra: borra });
      lineas.push({ p: p3, col: linea, fino: false, cerrado: true, fijo: true, cara: true });
    };
    const trazo = (pts, col) => {
      lineas.push({ p: pts.map((q) => [q[0], q[1], zc(q[0], q[1]) + 0.01]), col: col, fino: true, cerrado: false, fijo: true, cara: true });
    };
    poligono([[-0.52, 0.12], [-0.18, 0.12], [-0.35, 0.42]], 0.95, 'y', 'g', true);       // ojo izq
    poligono([[0.18, 0.12], [0.52, 0.12], [0.35, 0.42]], 0.95, 'y', 'g', true);          // ojo der
    poligono([[-0.07, -0.04], [0.07, -0.04], [0, 0.09]], 0.95, 'y', 'g', true);          // nariz
    poligono([[-0.55, -0.22], [-0.37, -0.34], [-0.19, -0.22], [0, -0.34], [0.19, -0.22],
              [0.37, -0.34], [0.55, -0.22], [0.4, -0.52], [0.15, -0.64], [-0.15, -0.64], [-0.4, -0.52]], 0.9, 'y', 'g', true); // boca
    // Pupilas magenta
    poligono([[-0.35, 0.17], [-0.31, 0.21], [-0.35, 0.25], [-0.39, 0.21]], 1, 'm', 'm', false);
    poligono([[0.35, 0.17], [0.39, 0.21], [0.35, 0.25], [0.31, 0.21]], 1, 'm', 'm', false);
    // Cejas y marcas
    trazo([[-0.64, 0.5], [-0.4, 0.6], [-0.14, 0.52]], 'g');
    trazo([[0.14, 0.52], [0.4, 0.6], [0.64, 0.5]], 'g');
    trazo([[-0.8, 0.0], [-0.7, -0.1]], 'p');
    trazo([[-0.82, -0.1], [-0.72, -0.2]], 'p');
    trazo([[0.8, 0.0], [0.7, -0.1]], 'p');
    trazo([[0.82, -0.1], [0.72, -0.2]], 'p');

    return { caras: caras, lineas: lineas, puntos: puntos };
  })();

  let raf = null, tAnt = 0;
  let posX = 0, dirX = 1, rodar = 0;
  let T = null, U = 1, CX = 0, CY = 0, escPx = 1;

  // Estado del modo "loco" y de la explosion
  let loco = false, locoRest = 0, locoTotal = 4, proxLoco = 8, cambioDir = 0, faseSalto = 0, salto = 0;
  let explotando = false;
  const azar = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;

  function empezarLoco() {
    loco = true;
    locoTotal = EXPLOTAR ? azar(EXPLOTA_MIN, EXPLOTA_MAX) : azar(2, 3.5);
    locoRest = locoTotal;
    cambioDir = azar(0.2, 0.5);
    faseSalto = 0;
    dirX = Math.random() < 0.5 ? -1 : 1;
    botonCalabaza.classList.add('loca');
  }
  function terminarLoco() {
    loco = false;
    proxLoco = azar(LOCO_ESPERA_MIN, LOCO_ESPERA_MAX);
    botonCalabaza.classList.remove('loca');
  }
  function reiniciarLoco() {
    loco = false;
    salto = 0;
    proxLoco = azar(LOCO_ESPERA_MIN, LOCO_ESPERA_MAX);
    botonCalabaza.classList.remove('loca');
  }

  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
  const aclarar = (c) => c.map((v) => Math.round(v + (255 - v) * 0.4));
  const profundidad = (z) => 0.35 + 0.65 * Math.min(Math.max(0.5 + 0.5 * z / 1.4, 0), 1);

  function aVista(p, fijo) {
    let x = p[0], y = p[1], z = p[2];
    if (!fijo) {                              // el cuerpo gira sobre su eje vertical; tallo y cara no
      x = p[0] * T.cz + p[2] * T.sz;
      z = -p[0] * T.sz + p[2] * T.cz;
    }
    const x2 = x * T.cy + z * T.sy;
    const z2 = -x * T.sy + z * T.cy;
    return [x2, y * T.ct - z2 * T.st, y * T.st + z2 * T.ct];
  }
  function aPantalla(v) {
    const k = DIST_CAMARA / (DIST_CAMARA - v[2]);
    return [CX + v[0] * U * k, CY - v[1] * U * k];
  }
  function trazoNeon(c, ps, col, w, alfa, cerrado) {
    c.beginPath();
    c.moveTo(ps[0][0], ps[0][1]);
    for (let i = 1; i < ps.length; i++) c.lineTo(ps[i][0], ps[i][1]);
    if (cerrado) c.closePath();
    c.strokeStyle = rgba(col, alfa * 0.22);
    c.lineWidth = w * 3.6;
    c.stroke();
    c.strokeStyle = rgba(aclarar(col), alfa);
    c.lineWidth = w;
    c.stroke();
  }
  function proyectar(pts, fijo) {
    let zs = 0;
    const ps = pts.map((q) => { const v = aVista(q, fijo); zs += v[2]; return aPantalla(v); });
    return { ps: ps, z: zs / pts.length };
  }
  function trazarPoligono(c, ps) {
    c.beginPath();
    c.moveTo(ps[0][0], ps[0][1]);
    for (let j = 1; j < ps.length; j++) c.lineTo(ps[j][0], ps[j][1]);
    c.closePath();
  }

  function dibujarModelo(c, W) {
    const wBase = Math.max(1.5, W * 0.012);

    // 1) Cuerpo (costillas, anillos), un poco mas tenue para que la cara destaque
    MODELO.lineas.forEach((l) => {
      if (l.cara) return;
      const r = proyectar(l.p, !!l.fijo);
      trazoNeon(c, r.ps, COL[l.col], l.fino ? wBase * 0.55 : wBase, 0.8 * profundidad(r.z), l.cerrado);
    });

    // 2) Nodos brillantes
    MODELO.puntos.forEach((n) => {
      const v = aVista(n.p, false);
      const s = aPantalla(v);
      c.fillStyle = rgba(aclarar(COL[n.col]), profundidad(v[2]) * 0.9);
      c.beginPath();
      c.arc(s[0], s[1], wBase * 0.85, 0, TAU);
      c.fill();
    });

    // 3) Recortar el cuerpo detras de la cara (con un margen), asi la cara queda limpia
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000';
    c.strokeStyle = '#000';
    c.lineWidth = wBase * 4.5;
    c.lineJoin = 'round';
    MODELO.caras.forEach((f) => {
      if (!f.borra) return;
      const r = proyectar(f.p, true);
      trazarPoligono(c, r.ps);
      c.fill();
      c.stroke();
    });
    c.globalCompositeOperation = 'lighter';

    // 4) Rellenos brillantes de la cara (con resplandor)
    MODELO.caras.forEach((f) => {
      const r = proyectar(f.p, true);
      c.shadowColor = rgba(COL[f.col], 1);
      c.shadowBlur = W * escPx * 0.05;
      trazarPoligono(c, r.ps);
      c.fillStyle = rgba(COL[f.col], f.a);
      c.fill();
    });
    c.shadowBlur = 0;

    // 5) Bordes y rasgos de la cara, mas gruesos
    MODELO.lineas.forEach((l) => {
      if (!l.cara) return;
      const r = proyectar(l.p, true);
      trazoNeon(c, r.ps, COL[l.col], l.fino ? wBase * 0.9 : wBase * 1.5, 1, l.cerrado);
    });
  }

  function limitesX() {
    return { min: 6, max: Math.max(window.innerWidth - botonCalabaza.offsetWidth - 6, 6) };
  }

  function cuadro(ahora) {
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min(Math.max((ahora - tAnt) / 1000, 0), 0.05);
    tAnt = ahora;

    const W = lienzo.clientWidth;
    if (!W || explotando) return;

    let sacudida = 0, prog = 0;
    // ---- ciclo normal -> loco -> (explosion)
    if (!loco) {
      proxLoco -= dt;
      if (proxLoco <= 0) empezarLoco();
    } else {
      locoRest -= dt;
      cambioDir -= dt;
      faseSalto += dt * 11;
      prog = 1 - Math.max(locoRest, 0) / locoTotal;
      if (cambioDir <= 0) {
        if (Math.random() < 0.7) dirX = -dirX;
        cambioDir = azar(0.2, 0.55);
      }
      sacudida = (Math.random() - 0.5) * W * (0.03 + 0.05 * prog);
      if (locoRest <= 0) {
        if (EXPLOTAR) { explotar(); return; }
        terminarLoco();
      }
    }

    // ---- movimiento
    const L = limitesX();
    const dx = dirX * VEL_RODAR * (loco ? LOCO_VELOCIDAD : 1) * dt;
    posX += dx;
    if (posX <= L.min) { posX = L.min; dirX = 1; }
    if (posX >= L.max) { posX = L.max; dirX = -1; }
    rodar -= dx / (W * 0.33) * (loco ? 1.5 : 1);

    const metaSalto = loco ? Math.abs(Math.sin(faseSalto)) * W * LOCO_SALTO : 0;
    salto += (metaSalto - salto) * Math.min(1, dt * 14);
    const escala = 1 + 0.2 * prog * prog;   // se "infla" antes de explotar
    botonCalabaza.style.transform =
      'translate3d(' + (posX + sacudida).toFixed(1) + 'px,' + (-salto).toFixed(1) + 'px,0) scale(' + escala.toFixed(3) + ')';

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(W * dpr);
    if (lienzo.width !== px) { lienzo.width = px; lienzo.height = px; }
    escPx = px / W;
    ctx.setTransform(escPx, 0, 0, escPx, 0, 0);
    ctx.clearRect(0, 0, W, W);

    const vaiven = 0.5 * Math.sin(ahora / 1100) + (loco ? 0.55 * Math.sin(ahora / 75) : 0);
    T = {
      cz: Math.cos(rodar), sz: Math.sin(rodar),
      cy: Math.cos(vaiven), sy: Math.sin(vaiven),
      ct: Math.cos(INCLINACION), st: Math.sin(INCLINACION)
    };
    U = W * 0.335;
    CX = W / 2;
    CY = W * 0.5;

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    dibujarModelo(ctx, W);

    // Lineas de escaneo holograficas solo sobre el dibujo
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    const paso = Math.max(3, W * 0.03);
    const desp = (ahora / (loco ? 12 : 45)) % paso;
    for (let y = -paso + desp; y < W; y += paso) ctx.fillRect(0, y, W, paso * 0.4);
    ctx.globalCompositeOperation = 'source-over';
  }

  function arrancar3D() {
    if (raf) return;
    tAnt = performance.now();
    raf = requestAnimationFrame(cuadro);
  }
  function detener3D() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  /* =====================================================================
     9. AUDIO: contexto, MUSICA (con reverb suave), EXPLOSION + SONIDO
     ===================================================================== */
  let audio = null;
  // Contexto de audio compartido (la musica lo usa aunque SONIDO sea false)
  function ctxAudio() {
    if (!audio) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      try { audio = new A(); } catch (err) { return null; }
    }
    if (audio.state === 'suspended') audio.resume().catch(function () {});
    return audio;
  }
  function obtenerAudio() {
    if (!SONIDO) return null;
    return ctxAudio();
  }

  // Reverb sintetica: ruido con caida exponencial (cola larga y suave)
  function crearReverb(a, segundos, caida) {
    const largo = Math.floor(a.sampleRate * segundos);
    const buf = a.createBuffer(2, largo, a.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, caida);
    }
    const cv = a.createConvolver();
    cv.buffer = buf;
    return cv;
  }

  /* ----- Musica de fondo ----- */
  let musica = null;            // { el }
  let musicaPendiente = false;  // el navegador bloqueo el autoplay: reintentar en el siguiente toque

  function intentarReproducir() {
    if (!musica) return;
    const pr = musica.el.play();
    if (pr && pr.then) {
      pr.then(function () { musicaPendiente = false; })
        .catch(function () { musicaPendiente = true; });
    }
  }

  function iniciarMusica() {
    if (!MUSICA || !MUSICA_URL) return;
    if (!musica) {
      const el = new Audio(MUSICA_URL);
      el.loop = true;
      el.preload = 'auto';
      musica = { el: el };
      const a = ctxAudio();
      if (a) {
        try {
          const fuente = a.createMediaElementSource(el);
          const master = a.createGain();
          master.gain.value = MUSICA_VOL;
          master.connect(a.destination);

          const seco = a.createGain();            // sonido directo
          seco.gain.value = 1;
          fuente.connect(seco);
          seco.connect(master);

          const reverb = crearReverb(a, 1.8, 3);  // cola corta y suave
          const filtro = a.createBiquadFilter();  // oscurece un poco la cola para que sea elegante
          filtro.type = 'lowpass';
          filtro.frequency.value = 5000;
          const mojado = a.createGain();
          mojado.gain.value = MUSICA_REVERB;
          fuente.connect(reverb);
          reverb.connect(filtro);
          filtro.connect(mojado);
          mojado.connect(master);
        } catch (err) {
          el.volume = MUSICA_VOL;                 // sin Web Audio: suena normal, sin reverb
        }
      } else {
        el.volume = MUSICA_VOL;
      }
    }
    try { musica.el.currentTime = 0; } catch (err) { /* ignorar */ }
    ctxAudio();
    intentarReproducir();
  }
  function detenerMusica() {
    musicaPendiente = false;
    if (musica) {
      musica.el.pause();
      try { musica.el.currentTime = 0; } catch (err) { /* ignorar */ }
    }
  }

  // El navegador solo permite sonido despues de un toque: lo "desbloqueamos" en el primero.
  document.addEventListener('pointerdown', function () {
    if (!activo) return;
    obtenerAudio();
    if (musicaPendiente) { ctxAudio(); intentarReproducir(); }
  }, { passive: true });

  // BUM etereo: golpe grave profundo + cola de reverb + campanas fantasmales + soplo de aire
  function sonarBoom() {
    const a = obtenerAudio();
    if (!a) return;
    const t = a.currentTime;

    const comp = a.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    comp.connect(a.destination);
    const master = a.createGain();
    master.gain.value = 0.9;
    master.connect(comp);

    // bus: una parte directa y otra a traves de la reverb
    const reverb = crearReverb(a, 3.4, 2.4);
    const retorno = a.createGain();
    retorno.gain.value = 0.85;
    reverb.connect(retorno);
    retorno.connect(master);
    const seco = a.createGain();
    seco.gain.value = 0.9;
    seco.connect(master);
    const bus = a.createGain();
    bus.connect(seco);
    bus.connect(reverb);

    // 1) BUM: seno grave que cae de frecuencia (sensacion de pecho) + armonico suave
    [[1, 130, 30, 1.0], [2, 260, 60, 0.28]].forEach(function (cfg) {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(cfg[1], t);
      o.frequency.exponentialRampToValueAtTime(cfg[2], t + 0.7);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(cfg[3], t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      o.connect(g); g.connect(bus);
      o.start(t); o.stop(t + 1.6);
    });

    // 2) Impacto: ruido filtrado muy breve (da el "golpe" sin ser duro)
    const largo = Math.floor(a.sampleRate * 0.35);
    const buf = a.createBuffer(1, largo, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3);
    const n = a.createBufferSource();
    n.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1800, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.3);
    const gn = a.createGain();
    gn.gain.value = 0.7;
    n.connect(f); f.connect(gn); gn.connect(bus);
    n.start(t);

    // 3) Campanas fantasmales: parciales armonicos que nacen suaves y se desvanecen en la reverb
    const base = 261.63;   // do central; quintas y octavas = sonido "celestial"
    [1, 1.5, 2, 3, 4.01].forEach(function (mult, i) {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base * mult * 1.06, t + 0.05);
      o.frequency.exponentialRampToValueAtTime(base * mult, t + 0.9);   // baja un poco y se asienta
      o.detune.value = (i - 2) * 4;
      const ini = t + 0.05 + i * 0.045;
      g.gain.setValueAtTime(0.0001, ini);
      g.gain.exponentialRampToValueAtTime(0.11 / (1 + i * 0.35), ini + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0008, ini + 2.8);
      o.connect(g); g.connect(bus);
      o.start(ini); o.stop(ini + 2.9);
    });

    // 4) Soplo de aire: ruido en banda que se infla y se aleja
    const largoV = Math.floor(a.sampleRate * 2.4);
    const bufV = a.createBuffer(1, largoV, a.sampleRate);
    const dv = bufV.getChannelData(0);
    for (let i = 0; i < largoV; i++) dv[i] = Math.random() * 2 - 1;
    const v = a.createBufferSource();
    v.buffer = bufV;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(2400, t + 0.05);
    bp.frequency.exponentialRampToValueAtTime(500, t + 2.2);
    const gv = a.createGain();
    gv.gain.setValueAtTime(0.0001, t + 0.05);
    gv.gain.exponentialRampToValueAtTime(0.22, t + 0.35);
    gv.gain.exponentialRampToValueAtTime(0.0005, t + 2.3);
    v.connect(bp); bp.connect(gv); gv.connect(bus);
    v.start(t + 0.05);
  }

  /* ----- Explosion visual ----- */
  const cb = lienzoBoom.getContext('2d');
  let rafBoom = null;

  function estallido(cx, cy, tam) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const AW = window.innerWidth, AH = window.innerHeight;
    lienzoBoom.width = Math.round(AW * dpr);
    lienzoBoom.height = Math.round(AH * dpr);
    lienzoBoom.style.display = 'block';
    const cols = [COL.o, COL.g, COL.p, COL.m];
    const piezas = [];
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * TAU, v = azar(260, 900);
      piezas.push({
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200,
        r: Math.random() * TAU, vr: azar(-12, 12),
        l: azar(10, tam * 0.2), c: cols[i % cols.length]
      });
    }

    // FIX: el tiempo se mide desde el primer cuadro de ESTA animacion y nunca
    // es negativo (antes arc() recibia un radio negativo, lanzaba error y la
    // animacion moria en silencio: por eso a veces no se veian las particulas).
    let t0 = null;
    function paso(ahora) {
      if (t0 === null) t0 = ahora;
      const t = Math.max(0, (ahora - t0) / 1000);
      cb.setTransform(dpr, 0, 0, dpr, 0, 0);
      cb.clearRect(0, 0, AW, AH);
      if (t > 1.3) { lienzoBoom.style.display = 'none'; rafBoom = null; return; }
      rafBoom = requestAnimationFrame(paso);   // se agenda ANTES de dibujar: un error no la mata
      cb.globalCompositeOperation = 'lighter';
      cb.lineCap = 'round';
      // onda expansiva
      const radioOnda = Math.max(0.1, t * Math.max(AW, AH) * 0.9);
      cb.strokeStyle = rgba([255, 170, 70], Math.max(0, 1 - t / 0.6) * 0.85);
      cb.lineWidth = 8;
      cb.beginPath();
      cb.arc(cx, cy, radioOnda, 0, TAU);
      cb.stroke();
      // pedazos de neon
      const alfa = Math.max(0, 1 - t / 1.2);
      piezas.forEach((p) => {
        const x = cx + p.vx * t, y = cy + p.vy * t + 700 * t * t;
        const ang = p.r + p.vr * t;
        const dx = Math.cos(ang) * p.l, dy = Math.sin(ang) * p.l;
        cb.strokeStyle = rgba(p.c, alfa * 0.3);
        cb.lineWidth = 9;
        cb.beginPath(); cb.moveTo(x - dx, y - dy); cb.lineTo(x + dx, y + dy); cb.stroke();
        cb.strokeStyle = rgba(aclarar(p.c), alfa);
        cb.lineWidth = 3;
        cb.beginPath(); cb.moveTo(x - dx, y - dy); cb.lineTo(x + dx, y + dy); cb.stroke();
      });
      cb.globalCompositeOperation = 'source-over';
    }
    if (rafBoom) cancelAnimationFrame(rafBoom);
    rafBoom = requestAnimationFrame(paso);
  }

  const SUSTO_SVG = `
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="sustoPiel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="0.6" stop-color="#ece6ff"/>
          <stop offset="1" stop-color="#cfc2f2"/>
        </linearGradient>
      </defs>

      <!-- capucha oscura -->
      <path d="M100 0 C168 0 196 70 192 150 C189 230 176 280 150 298 L50 298 C24 280 11 230 8 150 C4 70 32 0 100 0Z"
            fill="#0a0414" stroke="#7b2cff" stroke-width="2.5" stroke-linejoin="round"/>

      <!-- cara -->
      <path d="M100 14 C148 14 170 62 166 130 C163 198 149 256 124 286 C112 298 88 298 76 286 C51 256 37 198 34 130 C30 62 52 14 100 14Z"
            fill="url(#sustoPiel)" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>

      <!-- sombras de las mejillas -->
      <path d="M46 150 C52 200 66 240 84 268" fill="none" stroke="#8a7bb8" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
      <path d="M154 150 C148 200 134 240 116 268" fill="none" stroke="#8a7bb8" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>

      <!-- ojos caidos -->
      <path d="M54 98 C66 84 90 90 94 112 C97 138 88 170 74 172 C58 168 46 124 54 98Z"
            fill="#06020c" stroke="#ff00c8" stroke-width="3" stroke-linejoin="round"/>
      <path d="M146 98 C134 84 110 90 106 112 C103 138 112 170 126 172 C142 168 154 124 146 98Z"
            fill="#06020c" stroke="#ff00c8" stroke-width="3" stroke-linejoin="round"/>

      <!-- nariz -->
      <path d="M94 178 C95 186 97 191 100 192 M106 178 C105 186 103 191 100 192"
            fill="none" stroke="#06020c" stroke-width="3" stroke-linecap="round"/>

      <!-- boca -->
      <path d="M100 200 C124 200 134 224 130 246 C127 266 114 280 100 280 C86 280 73 266 70 246 C66 224 76 200 100 200Z"
            fill="#06020c" stroke="#ff00c8" stroke-width="3" stroke-linejoin="round"/>
    </svg>`;

  let tRespawn = null, tSusto = null, efimeros = [];

  function cancelarExplosion() {
    clearTimeout(tRespawn); clearTimeout(tSusto);
    tRespawn = tSusto = null;
    efimeros.forEach((e) => e.remove());
    efimeros = [];
    if (rafBoom) cancelAnimationFrame(rafBoom);
    rafBoom = null;
    lienzoBoom.style.display = 'none';
    explotando = false;
  }

  function reaparecer() {
    tRespawn = null;
    explotando = false;
    if (!activo || panel.classList.contains('abierto')) return;
    const L = limitesX();
    posX = L.min + Math.random() * (L.max - L.min);
    botonCalabaza.classList.remove('oculta');
    reiniciarLoco();
    proxLoco = azar(12, 22);       // despues de explotar, descanso largo
  }

  function explotar() {
    if (explotando || !activo) return;
    explotando = true;
    loco = false;
    const r = botonCalabaza.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    botonCalabaza.classList.remove('loca');
    botonCalabaza.classList.add('oculta');

    sonarBoom();
    estallido(cx, cy, r.width);
    const flash = document.createElement('div');
    flash.className = 'cal-flash';
    const susto = document.createElement('div');
    susto.className = 'cal-susto';
    susto.innerHTML = SUSTO_SVG;
    overlay.appendChild(flash);
    overlay.appendChild(susto);
    efimeros = [flash, susto];
    tSusto = setTimeout(() => { efimeros.forEach((e) => e.remove()); efimeros = []; }, 1700);
    tRespawn = setTimeout(reaparecer, REAPARECE_MS);
    try { if (navigator.vibrate) navigator.vibrate([60, 40, 120]); } catch (err) { /* ignorar */ }
  }

  /* =====================================================================
     10. MURCIELAGOS alrededor del calendario
     ===================================================================== */
  const MURCI_SVG = `
    <svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="ala-i" d="M30 16 C22 6 10 4 2 8 C6 12 6 16 10 20 C14 16 18 18 22 22 C25 20 28 20 30 16Z" fill="#1b0a33" stroke="#b46eff" stroke-width="1.2" stroke-linejoin="round"/>
      <path class="ala-d" d="M30 16 C38 6 50 4 58 8 C54 12 54 16 50 20 C46 16 42 18 38 22 C35 20 32 20 30 16Z" fill="#1b0a33" stroke="#b46eff" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M27 11 L26 5 L29.5 9.5Z M33 11 L34 5 L30.5 9.5Z" fill="#1b0a33" stroke="#b46eff" stroke-width="1" stroke-linejoin="round"/>
      <ellipse cx="30" cy="16" rx="4" ry="6" fill="#1b0a33" stroke="#b46eff" stroke-width="1.2"/>
      <circle cx="28.4" cy="13.6" r="1" fill="#ff00c8"/><circle cx="31.6" cy="13.6" r="1" fill="#ff00c8"/>
    </svg>`;

  let tAleteo = null;

  function quitarMurcielagos() {
    clearInterval(tAleteo);
    tAleteo = null;
    capaMurcis.querySelectorAll('.cal-murci').forEach((el) => {
      el.getAnimations().forEach((a) => a.cancel());
    });
    capaMurcis.textContent = '';
  }

  function derivaMurci(el, ang) {
    el.animate([
      { transform: 'translate(0px,0px) rotate(' + ang + 'deg)' },
      { transform: 'translate(' + azar(-10, 10).toFixed(1) + 'px,' + azar(-9, 9).toFixed(1) + 'px) rotate(' + (ang + azar(-10, 10)).toFixed(1) + 'deg)' }
    ], { duration: azar(1600, 3200), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  }

  function crearMurcielagos(entrada) {
    quitarMurcielagos();
    if (!MURCIELAGOS || !panel.classList.contains('abierto')) return;
    const x0 = panel.offsetLeft, y0 = panel.offsetTop, w = panel.offsetWidth, h = panel.offsetHeight;
    const per = 2 * (w + h);
    const n = Math.max(8, Math.min(18, Math.round(per / 150)));
    const fase = Math.random();

    for (let i = 0; i < n; i++) {
      const s = (((i + Math.random() * 0.7) / n) + fase) % 1;     // posicion al azar sobre el contorno
      let d = s * per, x, y, nx = 0, ny = 0;
      if (d < w) { x = x0 + d; y = y0; ny = -1; }
      else if ((d -= w) < h) { x = x0 + w; y = y0 + d; nx = 1; }
      else if ((d -= h) < w) { x = x0 + w - d; y = y0 + h; ny = 1; }
      else { d -= w; x = x0; y = y0 + h - d; nx = -1; }
      const fuera = azar(-6, 16);
      x += nx * fuera;
      y += ny * fuera;

      const tam = azar(34, 58);
      const el = document.createElement('div');
      el.className = 'cal-murci';
      el.style.width = tam.toFixed(0) + 'px';
      el.style.left = (x - tam / 2).toFixed(1) + 'px';
      el.style.top = (y - tam / 4).toFixed(1) + 'px';
      el.innerHTML = MURCI_SVG;
      capaMurcis.appendChild(el);

      const ang = azar(-18, 18);
      if (!entrada) {
        el.style.setProperty('--aleteo', azar(0.3, 0.55).toFixed(2) + 's');
        derivaMurci(el, ang);
        continue;
      }
      // Entrada: llegan volando con aleteo fuerte y giro, y se acomodan
      const lejos = azar(160, 420), a = azar(0, TAU);
      const sx = Math.cos(a) * lejos, sy = Math.sin(a) * lejos;
      const giro = (Math.random() < 0.5 ? -1 : 1) * azar(180, 540);
      el.style.setProperty('--aleteo', '0.09s');
      const anim = el.animate([
        { transform: 'translate(' + sx.toFixed(0) + 'px,' + sy.toFixed(0) + 'px) rotate(' + giro.toFixed(0) + 'deg) scale(0.3)', opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.2 },
        { transform: 'translate(' + (-sx * 0.12).toFixed(0) + 'px,' + (-sy * 0.12).toFixed(0) + 'px) rotate(' + (-giro * 0.08).toFixed(0) + 'deg) scale(1.25)', opacity: 1, offset: 0.75 },
        { transform: 'translate(0px,0px) rotate(' + ang.toFixed(1) + 'deg) scale(1)', opacity: 1, offset: 1 }
      ], { duration: azar(950, 1500), delay: Math.random() * 300, easing: 'cubic-bezier(0.22, 0.8, 0.3, 1)', fill: 'both' });
      anim.onfinish = () => {
        el.style.setProperty('--aleteo', azar(0.3, 0.55).toFixed(2) + 's');
        derivaMurci(el, ang);
        anim.cancel();
      };
    }

    // De vez en cuando alguno da un aleteo fuerte
    tAleteo = setInterval(() => {
      const lista = capaMurcis.children;
      if (!lista.length) return;
      const el = lista[Math.floor(Math.random() * lista.length)];
      el.style.setProperty('--aleteo', '0.1s');
      setTimeout(() => el.style.setProperty('--aleteo', azar(0.3, 0.55).toFixed(2) + 's'), 700);
    }, 2200);
  }

  /* ---------- 11. Abrir / cerrar el calendario ---------------------------- */
  function abrirCalendario() {
    cancelarExplosion();
    reiniciarLoco();
    panel.classList.add('abierto');
    botonCalabaza.classList.add('oculta');
    detener3D();
    sincronizarCabecera();
    estado(true);
    render();
    iniciarSync();                 // trae lo que agregaron otros y sigue escuchando
    panel.focus({ preventScroll: true });
    crearMurcielagos(true);
  }
  function cerrarCalendario() {
    cancelarArrastre();
    cerrarJson();
    pararSync();
    quitarMurcielagos();
    seleccionId = null;
    panel.classList.remove('abierto');
    botonCalabaza.classList.remove('oculta');
    reiniciarLoco();
    if (activo) arrancar3D();
  }

  botonCalabaza.addEventListener('click', abrirCalendario);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !panel.classList.contains('abierto')) return;
    if (jsonCaja.classList.contains('abierto')) cerrarJson();
    else cerrarCalendario();
  });

  /* ---------- 12. Encender / apagar el tema (API del nucleo) -------------- */
  function iniciarCalabaza() {
    activo = true;
    overlay.style.display = 'block';
    window.OpcionesTemas.ocultarCorazon();
    panel.classList.remove('abierto');
    botonCalabaza.classList.remove('oculta');
    cancelarExplosion();
    quitarMurcielagos();
    const L = limitesX();
    posX = L.min + Math.random() * (L.max - L.min);
    dirX = Math.random() < 0.5 ? -1 : 1;
    reiniciarLoco();
    arrancar3D();
    iniciarMusica();               // suena la musica con un poquito de reverb
  }
  function detenerCalabaza() {
    activo = false;
    cancelarArrastre();
    cerrarJson();
    pararSync();
    cancelarExplosion();
    quitarMurcielagos();
    seleccionId = null;
    detener3D();
    detenerMusica();
    reiniciarLoco();
    panel.classList.remove('abierto');
    overlay.style.display = 'none';
    window.OpcionesTemas.mostrarCorazon();
  }

  let tResize = null;
  window.addEventListener('resize', () => {
    if (!activo) return;
    const L = limitesX();
    posX = Math.min(Math.max(posX, L.min), L.max);
    if (panel.classList.contains('abierto')) {      // reacomoda los murcielagos al nuevo tamaño
      clearTimeout(tResize);
      tResize = setTimeout(() => crearMurcielagos(false), 200);
    }
  });

  /* ---------- 13. Arranque, API publica y registro en el menu ------------- */
  cargar();
  renderSemana();
  sincronizarCabecera();
  estado(true);
  cargarSemilla();

  window.CalabazaHalloween = {
    exportarJSON: exportarJSON,
    importarJSON: importarJSON,
    irA: irA,
    abrir: abrirCalendario,
    cerrar: cerrarCalendario,
    sincronizar: sincronizar,
    aloquese: function () { if (activo && !explotando && !loco && !panel.classList.contains('abierto')) empezarLoco(); },
    explotar: explotar
  };

  window.OpcionesTemas.registrarTema({
    id: 'calabaza',
    etiqueta: 'Calabaza Cyberpunk',
    activar: iniciarCalabaza,
    desactivar: detenerCalabaza
  });
})();