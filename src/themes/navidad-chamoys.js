import * as THREE from 'three';

(function () {
  "use strict";

  if (!window.OpcionesTemas) {
    console.error('[navidad-chamoys] opciones-temas.js debe cargarse ANTES que este archivo.');
    return;
  }

  const TAU = Math.PI * 2;
  const MAX_DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  const MAX_DPR_NIEVE = Math.min(window.devicePixelRatio || 1, 1.5);
  const VELOCIDAD_GIRO = 0.12;
  const ALTO_ARBOL = 2.55;
  const RADIO_BASE = 0.96;
  const BASE_Y = -1.18;
  const DURACION_NACIMIENTO = 420;
  const MAX_ADORNOS = 48;
  const CLAVE_LOCAL = 'navidad_chamoys_adornos_v1';
  const CLAVE_PENDIENTES = 'navidad_chamoys_pendientes_v1';
  const CLAVE_MUSICAS = 'navidad_chamoys_musicas_v1';
  const CLAVE_MUSICA_SEL = 'navidad_chamoys_musica_sel_v1';
  const NUBE_BASE = 'https://calabazainefarium-default-rtdb.firebaseio.com';
  const NUBE_RUTA = 'calabaza/navidad/adornos';
  const NUBE_RUTA_MUSICAS = 'calabaza/navidad/musicas';
  const LADO_COPO = 64;
  const RADIO_COPO = 24;
  const NIVELES_ARBOL = 6;
  const LOBULOS_ARBOL = 12;
  const MUSICA_VOL = 0.32;
  const MUSICA_MAX_BYTES = 4 * 1024 * 1024;

  const PALETA = {
    cian: 0x00f0ff,
    azul: 0x3fb8ff,
    hielo: 0xbff8ff,
    verde: 0x6bffb8,
    verdeClaro: 0xa6ffd6,
    dorado: 0xffcf7a,
    ambar: 0xffa54d,
    rosa: 0xff5f9a,
    blanco: 0xffffff
  };

  const modulosMusica = import.meta.glob('../musicas/*.{mp3,MP3,ogg,OGG,wav,WAV,m4a,M4A,aac,AAC,flac,FLAC}', {
    eager: true,
    query: '?url',
    import: 'default'
  });
  const modulosMusicaRaiz = import.meta.glob('../../musicas/*.{mp3,MP3,ogg,OGG,wav,WAV,m4a,M4A,aac,AAC,flac,FLAC}', {
    eager: true,
    query: '?url',
    import: 'default'
  });
  const rutasMusicaDefecto = Object.assign({}, modulosMusica, modulosMusicaRaiz);

  const MUSICAS_DEFECTO = Object.keys(rutasMusicaDefecto).sort().map((ruta) => {
    const archivo = ruta.split('/').pop() || ruta;
    const nombre = archivo
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      id: 'defecto:' + archivo,
      nombre: nombre || archivo,
      url: rutasMusicaDefecto[ruta],
      defecto: true
    };
  });

  const ADORNOS = [
    { tipo: 'bola', etiqueta: 'Bola carmesi', color: '#ff5f7e' },
    { tipo: 'estrella', etiqueta: 'Estrella dorada', color: '#ffd27a' },
    { tipo: 'campana', etiqueta: 'Campana ambar', color: '#ffa54d' },
    { tipo: 'copo', etiqueta: 'Copo cian', color: '#8ffcff' },
    { tipo: 'regalo', etiqueta: 'Regalo fucsia', color: '#ff4fd8' },
    { tipo: 'lazo', etiqueta: 'Lazo esmeralda', color: '#6bffb8' },
    { tipo: 'caramelo', etiqueta: 'Caramelo rojo', color: '#ff4d6d' },
    { tipo: 'galleta', etiqueta: 'Galleta de jengibre', color: '#e9ad68' },
    { tipo: 'pina', etiqueta: 'Pina dorada', color: '#c98a4b' },
    { tipo: 'vela', etiqueta: 'Vela calida', color: '#ffe3a3' }
  ];

  const ADORNOS_POR_TIPO = new Map(ADORNOS.map((adorno) => [adorno.tipo, adorno]));
  const TIPOS_VALIDOS = new Set(ADORNOS.map((adorno) => adorno.tipo));
  const COLORES_NIEVE = ['#8ffcff', '#bff8ff', '#3fb8ff', '#6bffb8', '#ffffff'];

  const ICONOS = {
    bola: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9.5 5.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.6 13c.2-2 1.5-3.4 3.4-3.7" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".75"/></svg>',
    estrella: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.1 5.2 5.6.5-4.3 3.7 1.3 5.5L12 15.6l-4.7 2.8 1.3-5.5-4.3-3.7 5.6-.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    campana: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 16.5c.9-1.2 1.2-2.8 1.2-4.2 0-2.7 1.3-4.6 3.8-4.6s3.8 1.9 3.8 4.6c0 1.4.3 3 1.2 4.2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 7.7V6.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="18" r="1.3" fill="currentColor"/></svg>',
    copo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9.6 4.8L12 7.2l2.4-2.4M9.6 19.2L12 16.8l2.4 2.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    regalo: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="9.5" width="15" height="10.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M12 9.5V20" stroke="currentColor" stroke-width="1.6"/><path d="M12 9.5C10.3 6.2 8.2 4.8 7 5.8c-1.5 1.2.4 3.7 5 3.7zm0 0c1.7-3.3 3.8-4.7 5-3.7 1.5 1.2-.4 3.7-5 3.7z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    lazo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c-1.6-3.3-5.6-4.6-7-2.3-1.2 2 .6 4.7 3.4 4.5 1.8-.1 2.9-1 3.6-2.2zm0 0c1.6-3.3 5.6-4.6 7-2.3 1.2 2-.6 4.7-3.4 4.5-1.8-.1-2.9-1-3.6-2.2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M11 13.8l-2 4.7M13 13.8l2 4.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    caramelo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 20V12a4 4 0 018 0v1" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M7.8 20h2.4M9 16.5h2M9 13.4h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    galleta: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="9" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/><circle cx="11" cy="14" r=".8" fill="currentColor"/><circle cx="15.5" cy="15" r=".7" fill="currentColor"/></svg>',
    pina: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4c1.8 1.8 2.3 3.7 2.1 5.3M12 4c-1.8 1.8-2.3 3.7-2.1 5.3M8 6c1.7 1.1 2.7 2.6 3.1 4.1M16 6c-1.7 1.1-2.7 2.6-3.1 4.1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="12" cy="14.5" rx="4.8" ry="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 12.2l6 1.6M8.4 15.4l7.2 1.6M9.6 18.2l4.8 1" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".8"/></svg>',
    vela: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 9h7v11h-7z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 9V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 2.8c1.8 2 1.8 4.1 0 5.2-1.8-1.1-1.8-3.2 0-5.2z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7 20h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };

  const estilos = document.createElement('style');
  estilos.textContent = `
    .navidad-overlay {
      position: fixed; inset: 0; z-index: 3; display: none; overflow: hidden;
      pointer-events: none; user-select: none; font-family: 'Courier New', monospace;
      --nw-hielo: #8ffcff; --nw-cian: #0ff; --nw-magenta: #ff3ee0; --nw-dorado: #ffcf7a; --nw-verde: #6bffb8;
    }
    .navidad-overlay.activo { display: block; animation: nw-entrar .45s ease both; }

    @keyframes nw-entrar { from { opacity: 0; } to { opacity: 1; } }

    .navidad-habitacion {
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse at 74% 58%, rgba(64,178,255,.20), transparent 48%),
        radial-gradient(ellipse at 72% 92%, rgba(38,120,225,.16), transparent 60%),
        radial-gradient(circle at 18% 12%, rgba(24,66,128,.20), transparent 58%),
        radial-gradient(ellipse at 50% 120%, rgba(0,240,255,.08), transparent 60%),
        linear-gradient(180deg, #020610 0%, #040c1b 46%, #010207 100%);
    }
    .navidad-habitacion::after {
      content: ""; position: absolute; inset: 0;
      box-shadow: inset 0 0 18vmax rgba(0,2,10,.92), inset 0 0 5vmax rgba(0,4,14,.55);
    }
    .navidad-habitacion::before {
      content: ""; position: absolute; inset: 0;
      background:
        radial-gradient(1px 1px at 12% 22%, rgba(191,248,255,.8), transparent),
        radial-gradient(1px 1px at 28% 68%, rgba(143,252,255,.55), transparent),
        radial-gradient(1.5px 1.5px at 63% 18%, rgba(255,255,255,.6), transparent),
        radial-gradient(1px 1px at 84% 36%, rgba(143,252,255,.5), transparent),
        radial-gradient(1px 1px at 46% 82%, rgba(191,248,255,.45), transparent),
        radial-gradient(1px 1px at 92% 74%, rgba(143,252,255,.55), transparent);
      opacity: .55;
    }

    .navidad-halo {
      position: absolute; right: -9vw; top: 50%; width: min(68vw, 66vh);
      aspect-ratio: 1 / 1; transform: translateY(-50%); border-radius: 50%;
      background: radial-gradient(circle, rgba(126,220,255,.30) 0%, rgba(56,150,255,.15) 36%, rgba(24,86,190,.05) 58%, transparent 72%);
      animation: nw-latido 6.5s ease-in-out infinite;
    }
    .navidad-suelo {
      position: absolute; right: 0; bottom: -5vh; width: 58vw; height: 22vh;
      background: radial-gradient(ellipse at 70% 50%, rgba(120,215,255,.24), rgba(40,120,220,.08) 46%, transparent 70%);
    }
    @keyframes nw-latido { 0%,100% { opacity: .82; transform: translateY(-50%) scale(1); } 50% { opacity: 1; transform: translateY(-50%) scale(1.03); } }

    .navidad-nieve { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

    .navidad-escena {
      position: absolute; right: clamp(0vw, 3vw, 5vw); top: 51%;
      width: min(42vw, 60vh); height: min(70vh, 88vw);
      transform: translateY(-50%);
    }
    .navidad-escena::before {
      content: ""; position: absolute; inset: 5% 2%; border-radius: 46%;
      border: 1px dashed transparent; pointer-events: none; transition: border-color .2s, box-shadow .2s;
    }
    .navidad-escena.sobre::before {
      border-color: rgba(143,252,255,.55);
      box-shadow: inset 0 0 48px rgba(0,240,255,.10), 0 0 26px rgba(143,252,255,.22);
    }
    .navidad-escena::after {
      content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .16;
      background: repeating-linear-gradient(0deg, rgba(143,252,255,.05) 0 1px, transparent 1px 4px);
    }
    .navidad-arbol-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

    .navidad-catalogo, .navidad-musica {
      position: absolute; left: clamp(12px, 3vw, 52px); top: 50%; transform: translateY(-50%);
      width: clamp(218px, 21vw, 262px); padding: 13px 13px 11px;
      background: linear-gradient(180deg, rgba(4,10,20,.92), rgba(2,5,12,.95));
      border: 1px solid rgba(143,252,255,.30); border-radius: 10px;
      box-shadow: 0 0 20px rgba(0,180,255,.14), inset 0 0 26px rgba(80,190,255,.06);
      display: none; pointer-events: none;
    }
    .navidad-catalogo.abierto, .navidad-musica.abierto {
      display: block; pointer-events: auto; animation: nw-panel .26s ease both;
    }
    @keyframes nw-panel {
      from { opacity: 0; transform: translateY(-50%) translateX(-8px); }
      to { opacity: 1; transform: translateY(-50%) translateX(0); }
    }

    .navidad-cerrar {
      position: absolute; top: 7px; right: 8px; width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      appearance: none; -webkit-appearance: none; cursor: pointer;
      color: var(--nw-hielo); background: rgba(0,0,0,.35);
      border: 1px solid rgba(143,252,255,.24); border-radius: 5px;
      font-family: inherit; font-size: .8rem; line-height: 1;
      transition: color .15s ease, border-color .15s ease, background .15s ease;
    }
    .navidad-cerrar:hover, .navidad-cerrar:focus-visible {
      color: #fff; border-color: rgba(143,252,255,.6); background: rgba(0,240,255,.14); outline: none;
    }
    .navidad-cabecera h2 {
      margin: 0 0 3px; font-size: .74rem; font-weight: normal; letter-spacing: 1.7px;
      text-transform: uppercase; color: var(--nw-hielo); text-shadow: 0 0 9px rgba(0,240,255,.55);
    }
    .navidad-cabecera p {
      margin: 0 0 8px; font-size: .56rem; letter-spacing: .7px; color: var(--nw-dorado);
      opacity: .8; text-transform: uppercase;
    }
    .navidad-nube {
      display: flex; align-items: center; gap: 6px; min-width: 0; margin: 0 0 9px;
      font-size: .5rem; letter-spacing: .5px; color: rgba(255,207,122,.66); text-transform: uppercase;
    }
    .navidad-nube i {
      flex: 0 0 auto; width: 6px; height: 6px; border-radius: 50%; background: var(--nw-dorado);
      box-shadow: 0 0 6px currentColor;
    }
    .navidad-nube span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .navidad-nube[data-estado="nube"] i { background: #6bffb8; box-shadow: 0 0 8px #6bffb8; }
    .navidad-nube[data-estado="error"] i { background: #ff6b6b; box-shadow: 0 0 8px #ff6b6b; }
    .navidad-nube[data-estado="guardando"] i { animation: nw-pulso-nube .9s ease-in-out infinite; }
    @keyframes nw-pulso-nube { 50% { opacity: .22; transform: scale(.7); } }

    .navidad-lista { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 7px; }

    .navidad-chip {
      appearance: none; -webkit-appearance: none; position: relative; display: flex;
      flex-direction: column; align-items: center; justify-content: center; gap: 3px;
      min-height: 58px; padding: 6px 4px; font-family: inherit; font-size: .54rem;
      letter-spacing: .25px; color: var(--adorno); background: rgba(0,0,0,.42);
      border: 1px solid rgba(143,252,255,.20); border-radius: 7px; cursor: grab;
      touch-action: none; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .navidad-chip svg { width: 27px; height: 27px; filter: drop-shadow(0 0 3px var(--adorno)); }
    .navidad-chip:hover { transform: translateY(-2px); border-color: rgba(143,252,255,.48); box-shadow: 0 0 13px -2px var(--adorno); }
    .navidad-chip:active { cursor: grabbing; transform: scale(.97); }
    .navidad-chip:focus-visible { outline: 1px solid var(--nw-hielo); outline-offset: 2px; }
    .navidad-chip[data-tipo="estrella"]::after {
      content: "25 DIC"; position: absolute; top: 3px; right: 3px; padding: 1px 3px;
      border: 1px solid rgba(255,207,122,.32); border-radius: 3px;
      font-size: .38rem; line-height: 1.25; letter-spacing: .3px; color: var(--nw-dorado); opacity: .82;
    }

    .navidad-ayuda {
      margin: 9px 0 0; font-size: .54rem; line-height: 1.45; letter-spacing: .2px;
      color: rgba(191,248,255,.62);
    }

    .navidad-muneco-hit {
      position: absolute; left: 3%; bottom: 2%; z-index: 8;
      width: 34%; height: 42%; padding: 0; margin: 0;
      appearance: none; -webkit-appearance: none; background: transparent;
      border: 1px solid transparent; border-radius: 40% 40% 26% 26%;
      cursor: pointer; touch-action: manipulation; pointer-events: auto;
      transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
    }
    .navidad-muneco-hit::after {
      content: ""; position: absolute; left: 50%; bottom: 4%; width: 42%; height: 10%;
      transform: translateX(-50%); border-radius: 50%;
      background: radial-gradient(ellipse, rgba(143,252,255,.35), transparent 70%);
      opacity: .55; animation: nw-muneco-latido 2.6s ease-in-out infinite;
    }
    .navidad-muneco-hit:hover, .navidad-muneco-hit:focus-visible {
      border-color: rgba(143,252,255,.38);
      box-shadow: inset 0 0 34px rgba(0,200,255,.12), 0 0 22px rgba(0,200,255,.12);
      outline: none;
    }
    .navidad-muneco-etiqueta {
      position: absolute; left: 50%; bottom: -2px; transform: translateX(-50%);
      padding: 2px 7px; border-radius: 20px; white-space: nowrap;
      font-size: .46rem; letter-spacing: 1px; text-transform: uppercase;
      color: var(--nw-hielo); background: rgba(3,10,20,.78);
      border: 1px solid rgba(143,252,255,.28); box-shadow: 0 0 12px rgba(0,200,255,.16);
      pointer-events: none;
    }
    @keyframes nw-muneco-latido { 0%,100% { opacity: .4; transform: translateX(-50%) scale(.92); } 50% { opacity: .9; transform: translateX(-50%) scale(1.08); } }

    .navidad-muneco-menu {
      position: absolute; left: clamp(12px, 62vw, 72vw); bottom: clamp(58px, 20vh, 190px); z-index: 93;
      width: min(222px, 54vw); padding: 10px;
      background: linear-gradient(180deg, rgba(4,10,20,.96), rgba(2,5,12,.97));
      border: 1px solid rgba(143,252,255,.36); border-radius: 10px;
      box-shadow: 0 0 28px rgba(0,180,255,.18), inset 0 0 26px rgba(80,190,255,.06);
      display: none; pointer-events: auto;
      animation: nw-menu .24s ease both;
    }
    .navidad-muneco-menu.abierto { display: block; }
    @keyframes nw-menu {
      from { opacity: 0; transform: translateY(8px) scale(.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .navidad-menu-titulo {
      margin: 0 0 8px; padding-bottom: 7px; border-bottom: 1px solid rgba(143,252,255,.18);
      font-size: .58rem; letter-spacing: 1.4px; text-transform: uppercase;
      color: var(--nw-hielo); text-shadow: 0 0 9px rgba(0,240,255,.5);
    }
    .navidad-menu-opcion {
      appearance: none; -webkit-appearance: none; display: flex; align-items: center; gap: 8px;
      width: 100%; margin: 0 0 6px; padding: 8px 9px; cursor: pointer;
      font-family: inherit; font-size: .62rem; letter-spacing: .55px; text-align: left;
      color: var(--nw-hielo); background: rgba(0,0,0,.34);
      border: 1px solid rgba(143,252,255,.18); border-radius: 7px;
      transition: border-color .15s ease, background .15s ease, color .15s ease;
    }
    .navidad-menu-opcion:last-child { margin-bottom: 0; }
    .navidad-menu-opcion::before { content: "▸"; color: var(--nw-verde); opacity: .8; }
    .navidad-menu-opcion:hover, .navidad-menu-opcion:focus-visible {
      color: #fff; border-color: rgba(143,252,255,.5); background: rgba(0,240,255,.10); outline: none;
    }
    .navidad-menu-opcion.activa {
      color: #fff; border-color: rgba(107,255,184,.55); background: rgba(107,255,184,.12);
      box-shadow: 0 0 16px rgba(107,255,184,.14);
    }

    .navidad-musica-cabecera h2 {
      margin: 0 24px 8px 0; font-size: .7rem; font-weight: normal; letter-spacing: 1.7px;
      text-transform: uppercase; color: var(--nw-hielo); text-shadow: 0 0 9px rgba(0,240,255,.55);
    }
    .navidad-musica-lista { display: flex; flex-direction: column; gap: 5px; max-height: 34vh; overflow-y: auto; overscroll-behavior: contain; }
    .navidad-pista {
      appearance: none; -webkit-appearance: none; display: flex; align-items: center; gap: 7px;
      width: 100%; padding: 6px 7px; cursor: pointer; text-align: left;
      font-family: inherit; font-size: .56rem; letter-spacing: .2px; color: rgba(191,248,255,.82);
      background: rgba(0,0,0,.34); border: 1px solid rgba(143,252,255,.14); border-radius: 6px;
      transition: border-color .15s ease, color .15s ease, background .15s ease;
    }
    .navidad-pista::before { content: "♪"; flex: 0 0 auto; color: var(--nw-verde); }
    .navidad-pista span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .navidad-pista:hover, .navidad-pista:focus-visible { color: #fff; border-color: rgba(143,252,255,.4); outline: none; }
    .navidad-pista.activa {
      color: #fff; border-color: rgba(107,255,184,.5); background: rgba(107,255,184,.10);
      box-shadow: 0 0 14px rgba(107,255,184,.12);
    }
    .navidad-pista.activa::before { content: "▶"; }
    .navidad-musica-vacia { margin: 4px 0; font-size: .54rem; color: rgba(191,248,255,.5); text-align: center; }

    .navidad-musica-controles { display: flex; align-items: center; gap: 6px; margin-top: 9px; }
    .navidad-musica-boton {
      appearance: none; -webkit-appearance: none; width: 28px; height: 26px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-family: inherit; font-size: .72rem; color: var(--nw-hielo);
      background: rgba(0,0,0,.34); border: 1px solid rgba(143,252,255,.24); border-radius: 6px;
      transition: border-color .15s ease, background .15s ease;
    }
    .navidad-musica-boton:hover, .navidad-musica-boton:focus-visible {
      border-color: rgba(143,252,255,.55); background: rgba(0,240,255,.12); outline: none;
    }
    .navidad-musica-vol { display: flex; align-items: center; gap: 5px; margin-left: auto; font-size: .5rem; color: rgba(191,248,255,.7); }
    .navidad-musica-vol input { width: 58px; accent-color: #6bffb8; cursor: pointer; }

    .navidad-musica-subir {
      appearance: none; -webkit-appearance: none; display: flex; align-items: center; justify-content: center; gap: 6px;
      width: 100%; margin-top: 8px; padding: 7px 8px; cursor: pointer;
      font-family: inherit; font-size: .56rem; letter-spacing: .5px; text-transform: uppercase;
      color: var(--nw-verde); background: rgba(107,255,184,.08);
      border: 1px dashed rgba(107,255,184,.42); border-radius: 7px;
      transition: background .15s ease, border-color .15s ease;
    }
    .navidad-musica-subir:hover, .navidad-musica-subir:focus-visible {
      background: rgba(107,255,184,.15); border-color: rgba(107,255,184,.7); outline: none;
    }
    .navidad-musica-estado { margin: 7px 0 0; font-size: .48rem; line-height: 1.4; color: rgba(191,248,255,.55); text-align: center; }
    .navidad-musica-estado[data-estado="error"] { color: #ff8fa8; }
    .navidad-musica-estado[data-estado="ok"] { color: var(--nw-verde); }

    .navidad-aviso {
      position: absolute; left: 50%; bottom: 34px; z-index: 90; width: max-content;
      max-width: min(88vw, 470px); padding: 9px 14px; border-radius: 7px;
      background: rgba(7,3,2,.94); border: 1px solid rgba(255,207,122,.46);
      box-shadow: 0 0 22px rgba(255,165,77,.18); color: var(--nw-dorado);
      font-size: .67rem; line-height: 1.45; letter-spacing: .2px; text-align: center;
      opacity: 0; pointer-events: none; transform: translate(-50%, 10px);
      transition: opacity .2s ease, transform .2s ease;
    }
    .navidad-aviso.visible { opacity: 1; transform: translate(-50%, 0); }

    .navidad-fantasma {
      position: fixed; left: 0; top: 0; z-index: 80; width: 48px; height: 48px;
      color: var(--adorno); pointer-events: none;
      transform: translate(-50%,-50%) scale(1.1);
      filter: drop-shadow(0 0 9px var(--adorno));
    }
    .navidad-fantasma svg { width: 100%; height: 100%; }

    body.navidad-chamoys-activo .contenedor {
      opacity: 0 !important; visibility: hidden !important; pointer-events: none !important;
    }

    .lista-temas { max-height: calc(100vh - 84px); overflow-y: auto; overscroll-behavior: contain; }

    @media (max-width: 760px) {
      .navidad-escena {
        right: 50%; top: 42%; transform: translate(50%,-50%);
        width: min(92vw, 62vh); height: min(70vh, 112vw);
      }
      .navidad-halo { right: 50%; top: 40%; transform: translate(50%,-50%); width: 104vw; }
      .navidad-suelo { width: 100vw; }
      .navidad-catalogo, .navidad-musica {
        left: 8px; right: 8px; top: auto; bottom: 8px; width: auto;
        transform: none; padding: 8px 9px 9px;
      }
      .navidad-catalogo.abierto, .navidad-musica.abierto { animation: none; }
      .navidad-cabecera h2, .navidad-musica-cabecera h2 { margin-bottom: 5px; text-align: center; }
      .navidad-cabecera p, .navidad-ayuda { display: none; }
      .navidad-nube { justify-content: center; margin: 0 0 6px; }
      .navidad-lista { grid-template-columns: repeat(5, minmax(0,1fr)); gap: 4px; }
      .navidad-chip { min-height: 46px; padding: 3px 2px; }
      .navidad-chip svg { width: 23px; height: 23px; }
      .navidad-chip span { display: none; }
      .navidad-musica-lista { max-height: 24vh; }
      .navidad-muneco-menu { left: 10vw; right: auto; bottom: 26vh; width: min(210px, 66vw); transform: none; }
      .navidad-aviso { bottom: 158px; }
    }

    @media (max-height: 560px) {
      .navidad-escena {
        right: 2vw; top: 50%; transform: translateY(-50%);
        width: min(58vw, 64vh); height: min(92vh, 82vw);
      }
      .navidad-halo { right: -6vw; top: 50%; transform: translateY(-50%); width: 72vw; }
      .navidad-catalogo, .navidad-musica {
        left: 8px; right: auto; top: 8px; bottom: 8px; width: 190px;
        transform: none; overflow-y: auto; padding: 8px;
      }
      .navidad-catalogo.abierto, .navidad-musica.abierto { animation: none; }
      .navidad-cabecera h2, .navidad-musica-cabecera h2 { font-size: .66rem; }
      .navidad-cabecera p, .navidad-ayuda { display: none; }
      .navidad-nube { margin-bottom: 6px; }
      .navidad-lista { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 4px; }
      .navidad-chip { min-height: 40px; }
      .navidad-chip svg { width: 21px; height: 21px; }
      .navidad-chip span { font-size: .48rem; }
      .navidad-muneco-menu { bottom: 10px; right: 12px; }
      .navidad-aviso { bottom: 14px; }
    }
  `;
  document.head.appendChild(estilos);

  const overlay = document.createElement('div');
  overlay.className = 'navidad-overlay';
  overlay.innerHTML = `
    <div class="navidad-habitacion"></div>
    <div class="navidad-halo"></div>
    <div class="navidad-suelo"></div>
    <canvas class="navidad-nieve"></canvas>
    <div class="navidad-escena">
      <canvas class="navidad-arbol-canvas"></canvas>
      <button class="navidad-muneco-hit" type="button" aria-label="Abrir opciones del muneco de nieve" aria-expanded="false" title="Toca el muneco de nieve para ver las opciones">
        <span class="navidad-muneco-etiqueta">Opciones</span>
      </button>
    </div>
    <div class="navidad-muneco-menu" role="dialog" aria-label="Opciones del muneco de nieve">
      <div class="navidad-menu-titulo">Muneco de nieve</div>
      <button class="navidad-menu-opcion" type="button" data-panel="catalogo">Catalogo de adornos</button>
      <button class="navidad-menu-opcion" type="button" data-panel="musica">Musica</button>
      <button class="navidad-menu-opcion" type="button" data-panel="cerrar">Cerrar opciones</button>
    </div>
    <aside class="navidad-catalogo" aria-label="Catalogo de adornos">
      <button class="navidad-cerrar" type="button" aria-label="Cerrar catalogo">×</button>
      <div class="navidad-cabecera">
        <h2>Catalogo de adornos</h2>
        <p>Arrastra al arbol</p>
        <div class="navidad-nube" data-estado="local"><i></i><span>Guardado local</span></div>
      </div>
      <div class="navidad-lista"></div>
      <p class="navidad-ayuda">Arrastra un adorno y sueltalo sobre el arbol. La estrella solo se permite el 25 de diciembre.</p>
    </aside>
    <aside class="navidad-musica" aria-label="Musica de navidad">
      <button class="navidad-cerrar" type="button" aria-label="Cerrar musica">×</button>
      <div class="navidad-musica-cabecera">
        <h2>Musica de navidad</h2>
      </div>
      <div class="navidad-musica-lista"></div>
      <div class="navidad-musica-controles">
        <button class="navidad-musica-boton" type="button" data-accion="play" aria-label="Reproducir o pausar">▶</button>
        <button class="navidad-musica-boton" type="button" data-accion="prev" aria-label="Cancion anterior">⏮</button>
        <button class="navidad-musica-boton" type="button" data-accion="next" aria-label="Cancion siguiente">⏭</button>
        <label class="navidad-musica-vol">Vol
          <input type="range" min="0" max="1" step="0.01" value="0.32" aria-label="Volumen de la musica">
        </label>
      </div>
      <button class="navidad-musica-subir" type="button">+ Cargar musica</button>
      <input class="navidad-musica-archivo" type="file" accept="audio/*" hidden>
      <p class="navidad-musica-estado" data-estado="local">Las pistas se guardan en Firebase.</p>
    </aside>
    <div class="navidad-aviso" role="status" aria-live="polite"></div>
  `;
  document.body.appendChild(overlay);

  const escenaEl = overlay.querySelector('.navidad-escena');
  const lienzoArbol = overlay.querySelector('.navidad-arbol-canvas');
  const lienzoNieve = overlay.querySelector('.navidad-nieve');
  const catalogoEl = overlay.querySelector('.navidad-catalogo');
  const listaEl = overlay.querySelector('.navidad-lista');
  const avisoEl = overlay.querySelector('.navidad-aviso');
  const nubeEl = overlay.querySelector('.navidad-nube');
  const nubeTextoEl = nubeEl.querySelector('span');
  const menuEl = overlay.querySelector('.navidad-muneco-menu');
  const munecoHitEl = overlay.querySelector('.navidad-muneco-hit');
  const musicaEl = overlay.querySelector('.navidad-musica');
  const listaMusicaEl = overlay.querySelector('.navidad-musica-lista');
  const estadoMusicaEl = overlay.querySelector('.navidad-musica-estado');
  const archivoMusicaEl = overlay.querySelector('.navidad-musica-archivo');
  const botonSubirMusicaEl = overlay.querySelector('.navidad-musica-subir');
  const volumenEl = overlay.querySelector('.navidad-musica-vol input');

  ADORNOS.forEach((adorno) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'navidad-chip';
    boton.dataset.tipo = adorno.tipo;
    boton.dataset.color = adorno.color;
    boton.style.setProperty('--adorno', adorno.color);
    boton.setAttribute('aria-label', 'Arrastrar ' + adorno.etiqueta + ' al arbol');
    boton.title = adorno.tipo === 'estrella' ? 'La estrella solo se puede poner el 25 de diciembre' : adorno.etiqueta;
    boton.innerHTML = ICONOS[adorno.tipo] + '<span>' + adorno.etiqueta + '</span>';
    boton.addEventListener('pointerdown', alPresionarAdorno);
    boton.addEventListener('dragstart', (e) => e.preventDefault());
    boton.addEventListener('contextmenu', (e) => e.preventDefault());
    listaEl.appendChild(boton);
  });

  let activo = false;
  let escenaLista = false;
  let localRestaurado = false;
  let escena = null;
  let camara = null;
  let renderer = null;
  let grupoArbol = null;
  let grupoMuneco = null;
  let grupoPolvo = null;
  let lucesCalidas = null;
  let materialConcha = null;
  let rafArbol = null;
  let rafNieve = null;
  let ultimoTiempoArbol = null;
  let ultimoTiempoNieve = null;
  let arrastre = null;
  let ignorarMunecoHasta = 0;
  let avisoTimeout = null;
  let sincronizandoNube = false;
  let intervaloNube = null;

  const adornosColocados = [];
  const adornosPorId = new Map();
  const destellos = [];
  const copos = [];
  const cacheCopos = new Map();

  const musicas = MUSICAS_DEFECTO.slice();
  let panelAbierto = null;
  let musicaIndice = -1;
  let cargandoMusicas = false;
  let musicasNubeCargadas = false;
  const audioMusica = new Audio();
  audioMusica.preload = 'metadata';
  audioMusica.volume = MUSICA_VOL;

  function leerAlmacen(clave) {
    try {
      return localStorage.getItem(clave);
    } catch (error) {
      return null;
    }
  }

  function escribirAlmacen(clave, valor) {
    try {
      if (valor === null) localStorage.removeItem(clave);
      else localStorage.setItem(clave, valor);
    } catch (error) {
      return false;
    }
    return true;
  }

  function cerrarPaneles() {
    panelAbierto = null;
    catalogoEl.classList.remove('abierto');
    musicaEl.classList.remove('abierto');
    menuEl.querySelectorAll('.navidad-menu-opcion').forEach((btn) => btn.classList.remove('activa'));
  }

  function alternarMenuMuneco() {
    const abierto = !menuEl.classList.contains('abierto');
    menuEl.classList.toggle('abierto', abierto);
    munecoHitEl.setAttribute('aria-expanded', String(abierto));
    if (!abierto) {
      cerrarPaneles();
    } else {
      void sincronizarNube();
      void cargarMusicasNube();
    }
  }

  function seleccionarPanel(nombre) {
    menuEl.classList.remove('abierto');
    munecoHitEl.setAttribute('aria-expanded', 'false');
    if (nombre === 'cerrar') {
      cerrarPaneles();
      return;
    }
    const mismo = panelAbierto === nombre;
    panelAbierto = mismo ? null : nombre;
    catalogoEl.classList.toggle('abierto', panelAbierto === 'catalogo');
    musicaEl.classList.toggle('abierto', panelAbierto === 'musica');
    menuEl.querySelectorAll('.navidad-menu-opcion').forEach((btn) => {
      btn.classList.toggle('activa', !mismo && btn.dataset.panel === panelAbierto);
    });
    if (panelAbierto === 'musica' && !musicasNubeCargadas) void cargarMusicasNube();
  }

  munecoHitEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (performance.now() < ignorarMunecoHasta) return;
    alternarMenuMuneco();
  });
  menuEl.querySelectorAll('.navidad-menu-opcion').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      seleccionarPanel(btn.dataset.panel);
    });
  });
  overlay.querySelectorAll('.navidad-cerrar').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      cerrarPaneles();
    });
  });

  function estadoMusica(texto, estado) {
    estadoMusicaEl.textContent = texto;
    estadoMusicaEl.dataset.estado = estado || 'local';
  }

  function guardarMusicasLocal() {
    const subidas = musicas.filter((pista) => !pista.defecto).map((pista) => ({
      id: pista.id,
      nombre: pista.nombre,
      data: pista.data,
      creado: pista.creado,
      tamano: pista.tamano
    }));
    if (!subidas.length) escribirAlmacen(CLAVE_MUSICAS, null);
    else escribirAlmacen(CLAVE_MUSICAS, JSON.stringify(subidas));
  }

  function leerMusicasLocal() {
    let datos = [];
    try {
      datos = JSON.parse(leerAlmacen(CLAVE_MUSICAS) || '[]');
    } catch (error) {
      datos = [];
    }
    if (!Array.isArray(datos)) return;
    datos.forEach((valor) => {
      if (!valor || typeof valor.data !== 'string') return;
      if (!valor.data.startsWith('data:audio') && !/^https?:/i.test(valor.data)) return;
      const id = typeof valor.id === 'string' && valor.id ? valor.id : nuevoId();
      if (musicas.some((pista) => pista.id === id)) return;
      musicas.push({
        id: id,
        nombre: String(valor.nombre || 'Musica').slice(0, 80),
        data: valor.data,
        creado: typeof valor.creado === 'string' ? valor.creado : new Date().toISOString(),
        tamano: Number(valor.tamano) || 0,
        subida: true
      });
    });
  }

  function actualizarBotonMusica() {
    const boton = musicaEl.querySelector('[data-accion="play"]');
    if (!boton) return;
    boton.textContent = !audioMusica.paused && musicaIndice >= 0 ? '❚❚' : '▶';
  }

  function renderizarMusicas() {
    listaMusicaEl.innerHTML = '';
    if (!musicas.length) {
      const vacio = document.createElement('p');
      vacio.className = 'navidad-musica-vacia';
      vacio.textContent = 'Aun no hay pistas. Carga una o agrega archivos en la carpeta musicas.';
      listaMusicaEl.appendChild(vacio);
      actualizarBotonMusica();
      return;
    }
    musicas.forEach((pista, indice) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'navidad-pista' + (indice === musicaIndice ? ' activa' : '');
      boton.title = pista.defecto ? 'Pista incluida en el proyecto' : 'Pista cargada y guardada en Firebase';
      const texto = document.createElement('span');
      texto.textContent = pista.nombre || 'Musica';
      boton.appendChild(texto);
      boton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (indice === musicaIndice && !audioMusica.paused) {
          audioMusica.pause();
          actualizarBotonMusica();
          return;
        }
        if (indice === musicaIndice) {
          void reproducirAudio();
          return;
        }
        reproducirMusica(indice);
      });
      listaMusicaEl.appendChild(boton);
    });
    actualizarBotonMusica();
  }

  async function reproducirAudio() {
    if (!musicas.length) return;
    if (musicaIndice < 0 || musicaIndice >= musicas.length) musicaIndice = 0;
    audioMusica.volume = Number(volumenEl.value) || MUSICA_VOL;
    try {
      await audioMusica.play();
      estadoMusica('Reproduciendo ' + musicas[musicaIndice].nombre, 'ok');
    } catch (error) {
      estadoMusica('Toca de nuevo para permitir el audio.', 'error');
    }
    actualizarBotonMusica();
  }

  function reproducirMusica(indice) {
    if (!musicas.length) return;
    const n = musicas.length;
    musicaIndice = ((indice % n) + n) % n;
    audioMusica.src = musicas[musicaIndice].data || musicas[musicaIndice].url;
    try { audioMusica.currentTime = 0; } catch (error) { /* ignorar */ }
    escribirAlmacen(CLAVE_MUSICA_SEL, String(musicaIndice));
    renderizarMusicas();
    void reproducirAudio();
  }

  function pistaSiguiente(delta) {
    if (!musicas.length) return;
    if (musicaIndice < 0) reproducirMusica(0);
    else reproducirMusica(musicaIndice + delta);
  }

  async function enviarMusica(pista) {
    estadoMusica('Guardando musica en Firebase...', 'guardando');
    try {
      const respuesta = await pedirNubeMusicas(pista.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pista.id,
          nombre: pista.nombre,
          data: pista.data,
          creado: pista.creado,
          tamano: pista.tamano
        })
      });
      if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
      estadoMusica('Musica guardada en Firebase.', 'ok');
      return true;
    } catch (error) {
      estadoMusica('No se pudo subir. Quedo guardada en este dispositivo.', 'error');
      return false;
    }
  }

  async function cargarMusicasNube() {
    if (cargandoMusicas || musicasNubeCargadas) return;
    cargandoMusicas = true;
    estadoMusica('Buscando musicas en Firebase...', 'guardando');
    try {
      if (musicas.every((pista) => pista.defecto)) {
        leerMusicasLocal();
        renderizarMusicas();
      }
      const respuesta = await pedirNubeMusicas('', { headers: { Accept: 'application/json' } });
      if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
      const datos = await respuesta.json();
      let lista = [];
      if (Array.isArray(datos)) lista = datos;
      else if (datos && typeof datos === 'object') lista = Object.keys(datos).map((id) => Object.assign({ id: id }, datos[id]));
      let agregadas = 0;
      lista.forEach((valor) => {
        if (!valor || typeof valor.data !== 'string') return;
        if (!valor.data.startsWith('data:audio') && !/^https?:/i.test(valor.data)) return;
        const id = String(valor.id || '').trim() || nuevoId();
        if (musicas.some((pista) => pista.id === id)) return;
        musicas.push({
          id: id,
          nombre: String(valor.nombre || 'Musica').slice(0, 80),
          data: valor.data,
          creado: typeof valor.creado === 'string' ? valor.creado : new Date().toISOString(),
          tamano: Number(valor.tamano) || 0,
          subida: true
        });
        agregadas++;
      });
      musicasNubeCargadas = true;
      if (agregadas) {
        guardarMusicasLocal();
        renderizarMusicas();
        estadoMusica(agregadas + ' pista(s) recuperada(s) de Firebase.', 'ok');
      } else {
        estadoMusica('Musicas sincronizadas con Firebase.', 'ok');
      }
    } catch (error) {
      estadoMusica('Sin conexion. Se usan las pistas locales.', 'error');
    } finally {
      cargandoMusicas = false;
    }
  }

  function cargarArchivoMusica(archivo) {
    if (!archivo) return;
    if (!archivo.type.startsWith('audio/')) {
      estadoMusica('El archivo debe ser de audio.', 'error');
      return;
    }
    if (archivo.size > MUSICA_MAX_BYTES) {
      estadoMusica('Maximo ' + Math.round(MUSICA_MAX_BYTES / (1024 * 1024)) + ' MB por cancion.', 'error');
      return;
    }
    estadoMusica('Leyendo ' + archivo.name + '...', 'guardando');
    const lector = new FileReader();
    lector.onerror = () => estadoMusica('No se pudo leer el archivo.', 'error');
    lector.onload = () => {
      const data = String(lector.result || '');
      if (!data.startsWith('data:audio')) {
        estadoMusica('Formato de audio no reconocido.', 'error');
        return;
      }
      const pista = {
        id: nuevoId(),
        nombre: archivo.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 80) || 'Musica',
        data: data,
        creado: new Date().toISOString(),
        tamano: archivo.size,
        subida: true
      };
      musicas.push(pista);
      guardarMusicasLocal();
      renderizarMusicas();
      void enviarMusica(pista);
    };
    lector.readAsDataURL(archivo);
  }

  botonSubirMusicaEl.addEventListener('click', (e) => {
    e.stopPropagation();
    archivoMusicaEl.click();
  });
  archivoMusicaEl.addEventListener('change', (e) => {
    const archivo = e.target.files && e.target.files[0];
    archivoMusicaEl.value = '';
    if (archivo) cargarArchivoMusica(archivo);
  });
  musicaEl.querySelectorAll('.navidad-musica-boton').forEach((boton) => {
    boton.addEventListener('click', (e) => {
      e.stopPropagation();
      const accion = boton.dataset.accion;
      if (accion === 'play') {
        if (!musicas.length) return;
        if (musicaIndice < 0) reproducirMusica(0);
        else if (audioMusica.paused) void reproducirAudio();
        else audioMusica.pause();
        actualizarBotonMusica();
      } else if (accion === 'next') {
        pistaSiguiente(1);
      } else if (accion === 'prev') {
        pistaSiguiente(-1);
      }
    });
  });
  volumenEl.addEventListener('input', () => {
    audioMusica.volume = Number(volumenEl.value);
  });
  audioMusica.addEventListener('ended', () => pistaSiguiente(1));
  audioMusica.addEventListener('play', actualizarBotonMusica);
  audioMusica.addEventListener('pause', actualizarBotonMusica);

  const azar = (min, max) => min + Math.random() * (max - min);
  const limitar = (v, min, max) => Math.min(Math.max(v, min), max);
  const radioEn = (t) => RADIO_BASE * Math.pow(1 - limitar(t, 0, 1), 1.1) + 0.015;
  const alturaEn = (t) => BASE_Y + limitar(t, 0, 1) * ALTO_ARBOL;

  function radioCapa(t, ang) {
    const seguro = limitar(t, 0, 0.9999);
    const base = radioEn(seguro);
    const nivel = seguro * NIVELES_ARBOL;
    const indice = Math.floor(nivel);
    const dentro = nivel - indice;
    const falda = 1 + 0.26 * Math.pow(1 - dentro, 1.35);
    const lobulo = (0.05 + 0.04 * (1 - dentro)) * Math.sin(ang * LOBULOS_ARBOL + indice * 1.9);
    const ondulado = 0.014 * Math.sin(ang * LOBULOS_ARBOL * 2 - seguro * 26);
    return base * Math.max(0.02, falda + lobulo + ondulado);
  }

  function easeOutBack(p) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  }

  function puntoEnRect(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function puntoSobreArbol(x, y) {
    if (!puntoEnRect(x, y, escenaEl.getBoundingClientRect())) return false;
    if (puntoEnRect(x, y, catalogoEl.getBoundingClientRect())) return false;
    if (puntoEnRect(x, y, musicaEl.getBoundingClientRect())) return false;
    if (puntoEnRect(x, y, menuEl.getBoundingClientRect())) return false;
    const menu = window.OpcionesTemas.contenedorMenu;
    if (menu && puntoEnRect(x, y, menu.getBoundingClientRect())) return false;
    return true;
  }

  function esDiaEstrella() {
    const hoy = new Date();
    return hoy.getMonth() === 11 && hoy.getDate() === 25;
  }

  function mostrarAviso(texto, duracion = 3200) {
    clearTimeout(avisoTimeout);
    avisoEl.textContent = texto;
    avisoEl.classList.add('visible');
    avisoTimeout = setTimeout(() => avisoEl.classList.remove('visible'), duracion);
  }

  function estadoNube(texto, estado) {
    nubeEl.dataset.estado = estado;
    nubeTextoEl.textContent = texto;
  }

  function nuevoId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'nw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  const ctxNieve = lienzoNieve.getContext('2d');

  function crearSpriteCopo(color, brazos) {
    const clave = color + '|' + brazos;
    if (cacheCopos.has(clave)) return cacheCopos.get(clave);
    const lienzo = document.createElement('canvas');
    lienzo.width = LADO_COPO;
    lienzo.height = LADO_COPO;
    const c = lienzo.getContext('2d');
    c.translate(LADO_COPO / 2, LADO_COPO / 2);
    c.strokeStyle = color;
    c.shadowColor = color;
    c.shadowBlur = 7;
    c.lineWidth = 1.8;
    c.lineCap = 'round';
    c.beginPath();
    const paso = TAU / brazos;
    for (let i = 0; i < brazos; i++) {
      const ang = i * paso;
      const bx = Math.cos(ang) * RADIO_COPO;
      const by = Math.sin(ang) * RADIO_COPO;
      c.moveTo(0, 0);
      c.lineTo(bx, by);
      c.moveTo(bx * 0.58, by * 0.58);
      c.lineTo(bx * 0.58 + Math.cos(ang + 0.65) * RADIO_COPO * 0.34, by * 0.58 + Math.sin(ang + 0.65) * RADIO_COPO * 0.34);
      c.moveTo(bx * 0.58, by * 0.58);
      c.lineTo(bx * 0.58 + Math.cos(ang - 0.65) * RADIO_COPO * 0.34, by * 0.58 + Math.sin(ang - 0.65) * RADIO_COPO * 0.34);
    }
    c.stroke();
    cacheCopos.set(clave, lienzo);
    return lienzo;
  }

  function medirNieve() {
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    lienzoNieve.width = Math.round(ancho * MAX_DPR_NIEVE);
    lienzoNieve.height = Math.round(alto * MAX_DPR_NIEVE);
    ctxNieve.setTransform(MAX_DPR_NIEVE, 0, 0, MAX_DPR_NIEVE, 0, 0);
    return { ancho, alto };
  }

  function nuevoCopo(ancho, alto, arriba) {
    const radio = azar(1.1, 4.4);
    return {
      x: azar(-20, ancho + 20),
      y: arriba ? azar(-alto, -10) : azar(-alto, alto),
      radio: radio,
      vy: azar(16, 44) + radio * 7,
      vx: azar(-9, 9),
      fase: azar(0, TAU),
      vaiven: azar(9, 34),
      giro: azar(0, TAU),
      vgiro: azar(-0.55, 0.55),
      alfa: azar(0.34, 0.92),
      color: COLORES_NIEVE[(Math.random() * COLORES_NIEVE.length) | 0],
      brazos: Math.random() < 0.34 ? 6 : 4
    };
  }

  function reiniciarCopos() {
    const { ancho, alto } = medirNieve();
    copos.length = 0;
    const cantidad = Math.round(limitar((ancho * alto) / 22000, 28, 82));
    for (let i = 0; i < cantidad; i++) copos.push(nuevoCopo(ancho, alto, false));
  }

  function dibujarCopo(c, copo) {
    const sprite = crearSpriteCopo(copo.color, copo.brazos);
    const lado = copo.radio * (LADO_COPO / RADIO_COPO);
    c.save();
    c.translate(copo.x, copo.y);
    c.rotate(copo.giro);
    c.globalAlpha = copo.alfa;
    c.drawImage(sprite, -lado / 2, -lado / 2, lado, lado);
    c.restore();
  }

  function cuadroNieve(ahora) {
    rafNieve = requestAnimationFrame(cuadroNieve);
    if (!ultimoTiempoNieve) ultimoTiempoNieve = ahora;
    const dt = Math.min((ahora - ultimoTiempoNieve) / 1000, 0.05);
    ultimoTiempoNieve = ahora;

    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    ctxNieve.clearRect(0, 0, ancho, alto);
    ctxNieve.globalCompositeOperation = 'lighter';

    for (let i = 0; i < copos.length; i++) {
      const copo = copos[i];
      copo.y += copo.vy * dt;
      copo.fase += dt * 0.85;
      copo.giro += copo.vgiro * dt;
      copo.x += (copo.vx + Math.sin(copo.fase) * copo.vaiven) * dt;

      if (copo.y > alto + 24) {
        copos[i] = nuevoCopo(ancho, alto, true);
        continue;
      }
      if (copo.x < -40) copo.x = ancho + 30;
      else if (copo.x > ancho + 40) copo.x = -30;

      dibujarCopo(ctxNieve, copo);
    }
    ctxNieve.globalCompositeOperation = 'source-over';
    ctxNieve.globalAlpha = 1;
  }

  function crearTexturaPunto() {
    const lienzo = document.createElement('canvas');
    lienzo.width = 48;
    lienzo.height = 48;
    const c = lienzo.getContext('2d');
    const gradiente = c.createRadialGradient(24, 24, 0, 24, 24, 23);
    gradiente.addColorStop(0, 'rgba(255,255,255,1)');
    gradiente.addColorStop(0.28, 'rgba(255,255,255,.90)');
    gradiente.addColorStop(0.62, 'rgba(255,255,255,.26)');
    gradiente.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gradiente;
    c.fillRect(0, 0, 48, 48);
    const textura = new THREE.CanvasTexture(lienzo);
    if ('colorSpace' in textura) textura.colorSpace = THREE.SRGBColorSpace;
    return textura;
  }

  const texturaPunto = crearTexturaPunto();

  function materialHolograma(opacidad, plano) {
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: opacidad,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    if (plano) material.clippingPlanes = [plano];
    return material;
  }

  function crearGeometriaLineas() {
    const posiciones = [];
    const colores = [];
    const cian = new THREE.Color(PALETA.cian);
    const azul = new THREE.Color(PALETA.azul);
    const hielo = new THREE.Color(PALETA.hielo);
    const verde = new THREE.Color(PALETA.verde);
    const verdeClaro = new THREE.Color(PALETA.verdeClaro);

    function segmento(ax, ay, az, bx, by, bz, color) {
      posiciones.push(ax, ay, az, bx, by, bz);
      colores.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }

    const anillos = 46;
    const segmentos = 120;
    for (let i = 0; i < anillos; i++) {
      const t = i / (anillos - 1);
      const y = alturaEn(t) + Math.sin(t * 14) * 0.006;
      const color = i % 7 === 0 ? verdeClaro : (i % 4 === 0 ? verde : (i % 3 === 0 ? hielo : cian));
      const puntos = [];
      for (let j = 0; j < segmentos; j++) {
        const ang = (j / segmentos) * TAU;
        const radio = radioCapa(t, ang);
        puntos.push([
          Math.cos(ang) * radio,
          y + Math.sin(ang * 3 + t * 17) * 0.008,
          Math.sin(ang) * radio
        ]);
      }
      for (let j = 0; j < segmentos; j++) {
        const a = puntos[j];
        const b = puntos[(j + 1) % segmentos];
        segmento(a[0], a[1], a[2], b[0], b[1], b[2], color);
      }
    }

    for (let s = 0; s < 18; s++) {
      const pasos = 220;
      const angBase = (s / 18) * TAU;
      const color = s % 3 === 0 ? verde : (s % 2 === 0 ? hielo : cian);
      let anterior = null;
      for (let i = 0; i <= pasos; i++) {
        const t = i / pasos;
        const ang = angBase + Math.sin(t * Math.PI * 2 + s * 0.7) * 0.06 + t * 0.42;
        const radio = radioCapa(t, ang) + 0.004;
        const punto = [Math.cos(ang) * radio, alturaEn(t), Math.sin(ang) * radio];
        if (anterior) segmento(anterior[0], anterior[1], anterior[2], punto[0], punto[1], punto[2], color);
        anterior = punto;
      }
    }

    for (let nivel = 1; nivel < NIVELES_ARBOL; nivel++) {
      const t = nivel / NIVELES_ARBOL + 0.003;
      const pasos = LOBULOS_ARBOL * 8;
      const color = nivel % 2 === 0 ? verdeClaro : hielo;
      let anterior = null;
      for (let j = 0; j <= pasos; j++) {
        const ang = (j / pasos) * TAU;
        const radio = radioCapa(t, ang) + 0.012;
        const punto = [Math.cos(ang) * radio, alturaEn(t) - 0.022, Math.sin(ang) * radio];
        if (anterior) segmento(anterior[0], anterior[1], anterior[2], punto[0], punto[1], punto[2], color);
        anterior = punto;
      }
    }

    for (let nivel = 0; nivel < NIVELES_ARBOL; nivel++) {
      const tAlto = nivel / NIVELES_ARBOL;
      const tBajo = (nivel + 1) / NIVELES_ARBOL;
      const color = nivel % 2 === 0 ? verde : cian;
      for (let lobulo = 0; lobulo < LOBULOS_ARBOL; lobulo++) {
        const angBase = (lobulo / LOBULOS_ARBOL) * TAU + nivel * 0.31;
        let anterior = null;
        for (let i = 0; i <= 9; i++) {
          const p = i / 9;
          const t = tAlto + (tBajo - tAlto) * p * 0.94;
          const ang = angBase + p * 0.24;
          const radio = radioCapa(t, ang) + 0.018 + p * p * 0.065;
          const punto = [
            Math.cos(ang) * radio,
            alturaEn(t) - p * p * 0.045,
            Math.sin(ang) * radio
          ];
          if (anterior) segmento(anterior[0], anterior[1], anterior[2], punto[0], punto[1], punto[2], color);
          anterior = punto;
        }
      }
    }

    for (let i = 0; i < 460; i++) {
      const t = azar(0.04, 0.96);
      const ang = azar(0, TAU);
      const radio = radioCapa(t, ang);
      const x = Math.cos(ang) * radio;
      const y = alturaEn(t);
      const z = Math.sin(ang) * radio;
      const largo = azar(0.024, 0.078);
      const caida = azar(-0.055, -0.008);
      const color = i % 7 === 0 ? verdeClaro : (i % 3 === 0 ? verde : (i % 2 === 0 ? hielo : azul));
      segmento(
        x, y, z,
        Math.cos(ang) * (radio + largo), y + caida, Math.sin(ang) * (radio + largo),
        color
      );
    }

    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
    geometria.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
    return geometria;
  }

  function crearConcha() {
    const filas = 96;
    const segmentos = 144;
    const posiciones = [];
    const indices = [];

    for (let i = 0; i <= filas; i++) {
      const t = i / filas;
      const y = alturaEn(t);
      for (let j = 0; j < segmentos; j++) {
        const ang = (j / segmentos) * TAU;
        const radio = Math.max(radioCapa(t, ang) * 0.965, 0.002);
        posiciones.push(
          Math.cos(ang) * radio,
          y + Math.sin(ang * 4 + t * 18) * 0.006,
          Math.sin(ang) * radio
        );
      }
    }

    for (let i = 0; i < filas; i++) {
      for (let j = 0; j < segmentos; j++) {
        const a = i * segmentos + j;
        const b = (i + 1) * segmentos + j;
        const c = (i + 1) * segmentos + (j + 1) % segmentos;
        const d = i * segmentos + (j + 1) % segmentos;
        indices.push(a, b, d, b, c, d);
      }
    }

    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
    geometria.setIndex(indices);
    geometria.computeVertexNormals();
    return geometria;
  }

  function construirArbol() {
    const grupo = new THREE.Group();
    grupo.name = 'arbol-holografico';

    const geometriaLineas = crearGeometriaLineas();
    const planoFrente = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const planoFondo = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const lineasFondo = new THREE.LineSegments(geometriaLineas, materialHolograma(0.12, planoFondo));
    const lineasFrente = new THREE.LineSegments(geometriaLineas, materialHolograma(0.90, planoFrente));
    lineasFondo.renderOrder = 1;
    lineasFrente.renderOrder = 4;
    grupo.add(lineasFondo, lineasFrente);

    materialConcha = new THREE.ShaderMaterial({
      uniforms: {
        uTiempo: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormalVista;
        varying vec3 vVista;
        varying float vAltura;
        void main() {
          vec4 vista = modelViewMatrix * vec4(position, 1.0);
          vNormalVista = normalize(normalMatrix * normal);
          vVista = normalize(-vista.xyz);
          vAltura = clamp((position.y + 1.18) / 2.55, 0.0, 1.0);
          gl_Position = projectionMatrix * vista;
        }
      `,
      fragmentShader: `
        uniform float uTiempo;
        varying vec3 vNormalVista;
        varying vec3 vVista;
        varying float vAltura;
        void main() {
          float fresnel = pow(1.0 - abs(dot(normalize(vNormalVista), normalize(vVista))), 2.1);
          vec3 abajo = vec3(0.020, 0.105, 0.185);
          vec3 arriba = vec3(0.055, 0.400, 0.510);
          vec3 verde = vec3(0.120, 0.520, 0.380);
          vec3 color = mix(abajo, arriba, vAltura);
          color = mix(color, verde, 0.16 + 0.08 * sin(vAltura * 18.0 + uTiempo * 0.5));
          float lineas = sin(vAltura * 62.0 - uTiempo * 0.8) * 0.022;
          float brillo = 0.090 + fresnel * 0.54 + lineas;
          gl_FragColor = vec4(color + brillo, 0.32 + fresnel * 0.26);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const concha = new THREE.Mesh(crearConcha(), materialConcha);
    concha.renderOrder = 2;
    grupo.add(concha);

    const tronco = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.055, 0.44, 12, 1, false),
      new THREE.MeshStandardMaterial({ color: 0x1d4a63, roughness: 0.78, metalness: 0.12, emissive: 0x0a2436, emissiveIntensity: 0.6 })
    );
    tronco.position.y = BASE_Y - 0.20;
    grupo.add(tronco);

    const materialAroHielo = new THREE.MeshBasicMaterial({
      color: PALETA.hielo, transparent: true, opacity: 0.46,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const materialAroVerde = new THREE.MeshBasicMaterial({
      color: PALETA.verde, transparent: true, opacity: 0.30,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const aroHielo = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.011, 6, 96), materialAroHielo);
    aroHielo.rotation.x = Math.PI / 2;
    aroHielo.position.y = BASE_Y - 0.08;
    aroHielo.renderOrder = 5;
    const aroVerde = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.007, 6, 96), materialAroVerde);
    aroVerde.rotation.x = Math.PI / 2;
    aroVerde.position.y = BASE_Y - 0.08;
    aroVerde.renderOrder = 5;
    grupo.add(aroHielo, aroVerde);

    const posicionesLuces = [];
    for (let i = 0; i < 150; i++) {
      const t = 0.035 + (i / 150) * 0.94;
      const ang = t * TAU * 4.4;
      const radio = radioCapa(t, ang) + 0.022;
      posicionesLuces.push(Math.cos(ang) * radio, alturaEn(t), Math.sin(ang) * radio);
    }
    const geoLuces = new THREE.BufferGeometry();
    geoLuces.setAttribute('position', new THREE.Float32BufferAttribute(posicionesLuces, 3));
    lucesCalidas = new THREE.Points(geoLuces, new THREE.PointsMaterial({
      color: PALETA.hielo, map: texturaPunto, size: 0.062, sizeAttenuation: true,
      transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending,
      depthWrite: false, alphaTest: 0.02
    }));
    lucesCalidas.renderOrder = 6;
    grupo.add(lucesCalidas);

    return grupo;
  }

  function construirPolvo() {
    const cantidad = 100;
    const posiciones = [];
    const colores = [];
    const paleta = [new THREE.Color(PALETA.hielo), new THREE.Color(PALETA.cian), new THREE.Color(PALETA.verde), new THREE.Color(PALETA.azul)];
    for (let i = 0; i < cantidad; i++) {
      const t = Math.random();
      const ang = Math.random() * TAU;
      const radio = radioEn(t) * azar(1.05, 1.7);
      posiciones.push(Math.cos(ang) * radio, alturaEn(t) + azar(-0.2, 0.35), Math.sin(ang) * radio);
      const color = paleta[(Math.random() * paleta.length) | 0];
      colores.push(color.r, color.g, color.b);
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
    geometria.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
    return new THREE.Points(geometria, new THREE.PointsMaterial({
      map: texturaPunto, size: 0.042, sizeAttenuation: true, vertexColors: true,
      transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending,
      depthWrite: false, alphaTest: 0.02
    }));
  }

  function crearLineasMalla(geometria, colorHex, opacidad) {
    const lineas = new THREE.WireframeGeometry(geometria);
    const material = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: opacidad,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    return new THREE.LineSegments(lineas, material);
  }

  function construirMunecoNieve() {
    const grupo = new THREE.Group();
    grupo.name = 'muneco-nieve';

    const materialNieve = new THREE.MeshStandardMaterial({
      color: 0xf4feff,
      emissive: 0x4fb6e8,
      emissiveIntensity: 0.32,
      roughness: 0.58,
      metalness: 0.04,
      transparent: true,
      opacity: 0.95
    });
    const materialCarbon = new THREE.MeshStandardMaterial({
      color: 0x0a1622,
      emissive: 0x001a33,
      emissiveIntensity: 0.45,
      roughness: 0.9,
      metalness: 0.12
    });
    const materialZanahoria = new THREE.MeshStandardMaterial({
      color: 0xff9a3c,
      emissive: 0x8a3200,
      emissiveIntensity: 0.5,
      roughness: 0.45,
      metalness: 0.08
    });
    const materialBufanda = new THREE.MeshStandardMaterial({
      color: 0x36d9a8,
      emissive: 0x0a6b52,
      emissiveIntensity: 0.45,
      roughness: 0.5,
      metalness: 0.06
    });
    const materialSombrero = new THREE.MeshStandardMaterial({
      color: 0x123a5c,
      emissive: 0x0a2cff,
      emissiveIntensity: 0.28,
      roughness: 0.6,
      metalness: 0.18
    });

    function bola(radio, y) {
      const geo = new THREE.SphereGeometry(radio, 22, 16);
      const malla = new THREE.Mesh(geo, materialNieve);
      malla.position.y = y;
      malla.add(crearLineasMalla(geo, 0xdffbff, 0.45));
      return malla;
    }

    grupo.add(bola(0.30, 0.30));
    grupo.add(bola(0.23, 0.61));
    grupo.add(bola(0.17, 0.87));

    [-0.058, 0.058].forEach((x) => {
      const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.020, 10, 8), materialCarbon);
      ojo.position.set(x, 0.915, 0.150);
      grupo.add(ojo);
    });

    for (let i = 0; i < 5; i++) {
      const ang = -0.85 + (i / 4) * 1.7;
      const sonrisa = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), materialCarbon);
      sonrisa.position.set(Math.sin(ang) * 0.082, 0.825 - Math.cos(ang) * 0.052, 0.158);
      grupo.add(sonrisa);
    }

    const nariz = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.15, 12), materialZanahoria);
    nariz.rotation.x = Math.PI / 2;
    nariz.position.set(0, 0.875, 0.205);
    grupo.add(nariz);

    [0.53, 0.63, 0.73].forEach((y) => {
      const boton = new THREE.Mesh(new THREE.SphereGeometry(0.023, 10, 8), materialCarbon);
      boton.position.set(0, y, 0.205);
      grupo.add(boton);
    });

    const bufanda = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.038, 9, 28), materialBufanda);
    bufanda.rotation.x = Math.PI / 2;
    bufanda.position.y = 0.748;
    grupo.add(bufanda);
    const colaBufanda = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.22, 0.035), materialBufanda);
    colaBufanda.position.set(0.13, 0.655, 0.135);
    colaBufanda.rotation.z = -0.22;
    colaBufanda.rotation.x = 0.18;
    grupo.add(colaBufanda);

    const ala = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.028, 24), materialSombrero);
    ala.position.y = 1.022;
    grupo.add(ala);
    const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.15, 0.16, 22), materialSombrero);
    copa.position.y = 1.113;
    grupo.add(copa);
    const cinta = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.018, 6, 24), materialBufanda);
    cinta.rotation.x = Math.PI / 2;
    cinta.position.y = 1.038;
    grupo.add(cinta);

    const brazoGeo = new THREE.CylinderGeometry(0.012, 0.010, 0.34, 7);
    [-1, 1].forEach((lado) => {
      const brazo = new THREE.Mesh(brazoGeo, materialNieve);
      brazo.position.set(lado * 0.245, 0.67, 0.01);
      brazo.rotation.z = lado * -1.02;
      brazo.rotation.y = lado * 0.28;
      grupo.add(brazo);
      const rama = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.007, 0.13, 5), materialNieve);
      rama.position.set(lado * 0.34, 0.735, 0.02);
      rama.rotation.z = lado * -0.42;
      grupo.add(rama);
      const rama2 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, 0.11, 5), materialNieve);
      rama2.position.set(lado * 0.35, 0.62, 0.02);
      rama2.rotation.z = lado * -1.55;
      grupo.add(rama2);
    });

    grupo.position.set(-0.72, BASE_Y - 0.10, 1.05);
    grupo.scale.setScalar(0.82);
    return grupo;
  }

  function crearEscena3D() {
    if (escenaLista) return;
    try {
      escena = new THREE.Scene();
      camara = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
      camara.position.set(0, 0.06, 5.35);
      camara.lookAt(0, -0.02, 0);

      renderer = new THREE.WebGLRenderer({
        canvas: lienzoArbol, alpha: true, antialias: true, powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(MAX_DPR);
      renderer.setClearColor(0x000000, 0);
      renderer.localClippingEnabled = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

      escena.add(new THREE.AmbientLight(0x9fdcff, 1.25));
      const luzPrincipal = new THREE.DirectionalLight(0x9fd4ff, 2.6);
      luzPrincipal.position.set(3, 4, 5);
      escena.add(luzPrincipal);
      const luzFria = new THREE.DirectionalLight(0x7dffcf, 0.75);
      luzFria.position.set(-3, 1.5, 4);
      escena.add(luzFria);
      const luzRim = new THREE.PointLight(0x62fff0, 12, 10, 2);
      luzRim.position.set(-2.1, 1.3, -2.2);
      escena.add(luzRim);
      const luzAzul = new THREE.PointLight(0x3f7bff, 8, 9, 2);
      luzAzul.position.set(2.2, -0.3, -2.5);
      escena.add(luzAzul);

      grupoArbol = construirArbol();
      escena.add(grupoArbol);

      grupoMuneco = construirMunecoNieve();
      escena.add(grupoMuneco);

      grupoPolvo = construirPolvo();
      escena.add(grupoPolvo);

      escenaLista = true;
    } catch (error) {
      console.warn('[navidad-chamoys] no se pudo crear la escena 3D:', error);
      escenaLista = false;
    }
  }

  function ajustarEscena() {
    if (!escenaLista) return;
    const ancho = Math.max(1, escenaEl.clientWidth);
    const alto = Math.max(1, escenaEl.clientHeight);
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
  }

  function materialAdorno(colorHex, opciones = {}) {
    const color = new THREE.Color(colorHex);
    const emision = opciones.emision === undefined ? 0.16 : opciones.emision;
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color.clone().multiplyScalar(emision),
      metalness: opciones.metalness === undefined ? 0.34 : opciones.metalness,
      roughness: opciones.roughness === undefined ? 0.4 : opciones.roughness,
      transparent: opciones.transparent === true,
      opacity: opciones.opacity === undefined ? 1 : opciones.opacity,
      depthWrite: opciones.depthWrite !== false
    });
  }

  function materialDorado(opciones = {}) {
    return materialAdorno(PALETA.dorado, Object.assign({ metalness: 0.7, roughness: 0.26, emision: 0.18 }, opciones));
  }

  function crearEstrellaExtruida(radioExterior, radioInterior, puntas) {
    const forma = new THREE.Shape();
    for (let i = 0; i < puntas * 2; i++) {
      const radio = i % 2 === 0 ? radioExterior : radioInterior;
      const ang = -Math.PI / 2 + (i * Math.PI) / puntas;
      const x = Math.cos(ang) * radio;
      const y = Math.sin(ang) * radio;
      if (i === 0) forma.moveTo(x, y);
      else forma.lineTo(x, y);
    }
    forma.closePath();
    const geometria = new THREE.ExtrudeGeometry(forma, {
      depth: 0.05,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.006,
      bevelThickness: 0.006,
      curveSegments: 2
    });
    geometria.center();
    return geometria;
  }

  function crearAdorno(tipo, colorHex) {
    const grupo = new THREE.Group();
    const color = new THREE.Color(colorHex);
    const material = materialAdorno(colorHex);
    const dorado = materialDorado();

    if (tipo === 'bola') {
      const esfera = new THREE.Mesh(new THREE.SphereGeometry(0.092, 24, 18), material);
      grupo.add(esfera);
      const franja = new THREE.Mesh(new THREE.TorusGeometry(0.0905, 0.007, 6, 28), dorado);
      franja.rotation.x = Math.PI / 2;
      grupo.add(franja);
      const franja2 = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.0045, 6, 24), dorado);
      franja2.rotation.x = Math.PI / 2;
      franja2.position.y = 0.038;
      grupo.add(franja2);
      const casquete = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.033, 0.03, 14), dorado);
      casquete.position.y = 0.096;
      grupo.add(casquete);
      const argolla = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 16), dorado);
      argolla.position.y = 0.126;
      grupo.add(argolla);
    } else if (tipo === 'estrella') {
      const geoEstrella = crearEstrellaExtruida(0.115, 0.049, 5);
      const materialEstrella = materialDorado();
      const estrellaA = new THREE.Mesh(geoEstrella, materialEstrella);
      const estrellaB = new THREE.Mesh(geoEstrella, materialEstrella);
      estrellaB.rotation.y = Math.PI / 2;
      grupo.add(estrellaA, estrellaB);
      const centro = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), materialAdorno(PALETA.blanco, { emision: 0.5, metalness: 0.1, roughness: 0.2 }));
      centro.position.z = 0.03;
      grupo.add(centro);
    } else if (tipo === 'campana') {
      const perfil = [
        new THREE.Vector2(0.035, -0.095),
        new THREE.Vector2(0.061, -0.088),
        new THREE.Vector2(0.085, -0.058),
        new THREE.Vector2(0.092, -0.005),
        new THREE.Vector2(0.075, 0.052),
        new THREE.Vector2(0.044, 0.092),
        new THREE.Vector2(0.021, 0.112)
      ];
      const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 22), material);
      grupo.add(cuerpo);
      const labio = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.009, 6, 22), dorado);
      labio.rotation.x = Math.PI / 2;
      labio.position.y = -0.09;
      grupo.add(labio);
      const asa = new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.007, 6, 16, Math.PI), dorado);
      asa.position.y = 0.118;
      grupo.add(asa);
      const badajo = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), dorado);
      badajo.position.y = -0.117;
      grupo.add(badajo);
    } else if (tipo === 'copo') {
      const materialCopo = materialAdorno(colorHex, { emision: 0.4, metalness: 0.55, roughness: 0.25 });
      const geoBrazo = new THREE.CylinderGeometry(0.005, 0.005, 0.23, 6);
      const brazoY = new THREE.Mesh(geoBrazo, materialCopo);
      const brazoX = new THREE.Mesh(geoBrazo, materialCopo);
      brazoX.rotation.z = Math.PI / 2;
      const brazoZ = new THREE.Mesh(geoBrazo, materialCopo);
      brazoZ.rotation.x = Math.PI / 2;
      grupo.add(brazoY, brazoX, brazoZ);
      const geoPunta = new THREE.OctahedronGeometry(0.012, 0);
      const materialPunta = materialAdorno(PALETA.blanco, { emision: 0.45, metalness: 0.5, roughness: 0.2 });
      [
        [0, 0.115, 0], [0, -0.115, 0], [0.115, 0, 0],
        [-0.115, 0, 0], [0, 0, 0.115], [0, 0, -0.115]
      ].forEach((p) => {
        const punta = new THREE.Mesh(geoPunta, materialPunta);
        punta.position.set(p[0], p[1], p[2]);
        grupo.add(punta);
      });
      const centro = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), materialPunta);
      grupo.add(centro);
    } else if (tipo === 'regalo') {
      const caja = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.125, 0.135), material);
      caja.position.y = -0.01;
      grupo.add(caja);
      const tapa = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.033, 0.155), materialAdorno(colorHex, { emision: 0.2 }));
      tapa.position.y = 0.069;
      grupo.add(tapa);
      const cintaA = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.166, 0.142), dorado);
      cintaA.position.y = -0.008;
      const cintaB = new THREE.Mesh(new THREE.BoxGeometry(0.142, 0.166, 0.026), dorado);
      cintaB.position.y = -0.008;
      grupo.add(cintaA, cintaB);
      const lazoA = new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.010, 6, 14), dorado);
      lazoA.position.set(-0.028, 0.098, 0);
      lazoA.rotation.z = 0.45;
      const lazoB = new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.010, 6, 14), dorado);
      lazoB.position.set(0.028, 0.098, 0);
      lazoB.rotation.z = -0.45;
      grupo.add(lazoA, lazoB);
    } else if (tipo === 'lazo') {
      const materialLazo = materialAdorno(colorHex, { emision: 0.2, roughness: 0.35, metalness: 0.22 });
      const ladoA = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.017, 8, 18), materialLazo);
      ladoA.position.x = -0.05;
      ladoA.rotation.z = 0.32;
      const ladoB = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.017, 8, 18), materialLazo);
      ladoB.position.x = 0.05;
      ladoB.rotation.z = -0.32;
      const nudo = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), materialDorado());
      nudo.position.z = 0.014;
      const colaA = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.105, 4), materialLazo);
      colaA.position.set(-0.035, -0.092, 0);
      colaA.rotation.z = 0.42;
      const colaB = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.105, 4), materialLazo);
      colaB.position.set(0.035, -0.092, 0);
      colaB.rotation.z = -0.42;
      grupo.add(ladoA, ladoB, nudo, colaA, colaB);
    } else if (tipo === 'caramelo') {
      const materialCane = materialAdorno(colorHex, { emision: 0.14, roughness: 0.3, metalness: 0.2 });
      const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.19, 12), materialCane);
      palo.position.y = -0.028;
      const gancho = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.017, 8, 20, Math.PI), materialCane);
      gancho.position.set(-0.055, 0.067, 0);
      grupo.add(palo, gancho);
      const materialRayas = materialAdorno(PALETA.blanco, { emision: 0.22, roughness: 0.28, metalness: 0.25 });
      [-0.088, -0.044, 0, 0.044].forEach((y) => {
        const raya = new THREE.Mesh(new THREE.TorusGeometry(0.0175, 0.0035, 5, 14), materialRayas);
        raya.rotation.x = Math.PI / 2;
        raya.position.y = y;
        grupo.add(raya);
      });
    } else if (tipo === 'galleta') {
      const materialMasa = materialAdorno(colorHex, { emision: 0.08, roughness: 0.86, metalness: 0.02 });
      const masa = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.084, 0.026, 22), materialMasa);
      grupo.add(masa);
      const glaseado = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.065, 0.012, 20),
        materialAdorno(0xfff5e6, { emision: 0.18, roughness: 0.34, metalness: 0.03 })
      );
      glaseado.position.y = 0.018;
      grupo.add(glaseado);
      const coloresChispas = [PALETA.rosa, PALETA.cian, PALETA.dorado, PALETA.verde];
      for (let i = 0; i < 7; i++) {
        const chispa = new THREE.Mesh(
          new THREE.SphereGeometry(0.0075, 6, 5),
          materialAdorno(coloresChispas[i % coloresChispas.length], { emision: 0.3, roughness: 0.28, metalness: 0.2 })
        );
        const ang = (i / 7) * TAU;
        const radio = i === 0 ? 0 : 0.042;
        chispa.position.set(Math.cos(ang) * radio, 0.028, Math.sin(ang) * radio);
        grupo.add(chispa);
      }
    } else if (tipo === 'pina') {
      const materialPina = materialAdorno(colorHex, { emision: 0.1, roughness: 0.68, metalness: 0.16 });
      const cuerpo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 1), materialPina);
      cuerpo.scale.set(0.88, 1.22, 0.88);
      grupo.add(cuerpo);
      const materialEscama = materialAdorno(0x9b673e, { emision: 0.1, roughness: 0.58, metalness: 0.2 });
      const geoEscama = new THREE.ConeGeometry(0.017, 0.037, 5);
      const totalEscamas = 28;
      const escamas = new THREE.InstancedMesh(geoEscama, materialEscama, totalEscamas);
      const matriz = new THREE.Object3D();
      const arriba = new THREE.Vector3(0, 1, 0);
      let indice = 0;
      for (let capa = 0; capa < 5; capa++) {
        const porCapa = 6 - (capa > 2 ? 1 : 0);
        const y = -0.08 + capa * 0.039;
        const radio = 0.068 * (1 - capa * 0.105);
        for (let i = 0; i < porCapa && indice < totalEscamas; i++, indice++) {
          const ang = (i / porCapa) * TAU + capa * 0.52;
          const direccion = new THREE.Vector3(Math.cos(ang), -0.58 + capa * 0.08, Math.sin(ang)).normalize();
          matriz.position.set(Math.cos(ang) * radio, y, Math.sin(ang) * radio);
          matriz.quaternion.setFromUnitVectors(arriba, direccion);
          matriz.scale.setScalar(1 - capa * 0.035);
          matriz.updateMatrix();
          escamas.setMatrixAt(indice, matriz.matrix);
        }
      }
      escamas.count = indice;
      escamas.instanceMatrix.needsUpdate = true;
      grupo.add(escamas);
      const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.045, 7), materialDorado());
      tallo.position.y = 0.112;
      grupo.add(tallo);
    } else if (tipo === 'vela') {
      const cera = materialAdorno(colorHex, { emision: 0.08, roughness: 0.78, metalness: 0.02 });
      const vela = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.04, 0.16, 16), cera);
      vela.position.y = 0.012;
      grupo.add(vela);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.066, 0.018, 18), materialDorado());
      base.position.y = -0.077;
      grupo.add(base);
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.057, 0.006, 6, 20), materialDorado());
      aro.rotation.x = Math.PI / 2;
      aro.position.y = -0.062;
      grupo.add(aro);
      const pabilo = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.025, 5), materialAdorno(0x25201b, { emision: 0, roughness: 1, metalness: 0 }));
      pabilo.position.y = 0.103;
      grupo.add(pabilo);
      const llama = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 10, 8),
        materialAdorno(0xffb347, { emision: 0.9, transparent: true, opacity: 0.94, roughness: 0.15, metalness: 0.02 })
      );
      llama.scale.set(0.72, 1.45, 0.72);
      llama.position.y = 0.133;
      grupo.add(llama);
      const brillo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texturaPunto, color: 0xffa54d, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      brillo.scale.set(0.15, 0.21, 1);
      brillo.position.y = 0.133;
      grupo.add(brillo);
      const gotaA = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), cera);
      gotaA.position.set(0.032, 0.078, 0.012);
      gotaA.scale.y = 1.9;
      const gotaB = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), cera);
      gotaB.position.set(-0.026, 0.064, 0.02);
      gotaB.scale.y = 1.6;
      grupo.add(gotaA, gotaB);
    } else {
      const materialDesconocido = materialAdorno(PALETA.rosa);
      grupo.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), materialDesconocido));
    }

    return grupo;
  }

  function colorPorTipo(tipo) {
    const adorno = ADORNOS_POR_TIPO.get(tipo);
    return adorno ? adorno.color : '#ff5f7e';
  }

  function hayEstrella() {
    return adornosColocados.some((adorno) => adorno.userData.tipo === 'estrella');
  }

  function registroDeAdorno(adorno) {
    return {
      id: adorno.userData.id,
      tipo: adorno.userData.tipo,
      color: adorno.userData.color,
      x: Number(adorno.position.x.toFixed(4)),
      y: Number(adorno.userData.baseY.toFixed(4)),
      z: Number(adorno.position.z.toFixed(4)),
      rotY: Number(adorno.rotation.y.toFixed(4)),
      rotZ: Number(adorno.userData.baseRotZ.toFixed(4)),
      escala: Number(adorno.userData.escalaBase.toFixed(3)),
      creado: adorno.userData.creado
    };
  }

  function guardarLocal() {
    escribirAlmacen(CLAVE_LOCAL, JSON.stringify(adornosColocados.map(registroDeAdorno)));
  }

  function leerPendientes() {
    try {
      const datos = JSON.parse(leerAlmacen(CLAVE_PENDIENTES) || '[]');
      return Array.isArray(datos) ? datos.filter((id) => typeof id === 'string' && id) : [];
    } catch (error) {
      return [];
    }
  }

  function guardarPendientes(ids) {
    if (!ids.length) escribirAlmacen(CLAVE_PENDIENTES, null);
    else escribirAlmacen(CLAVE_PENDIENTES, JSON.stringify(Array.from(new Set(ids))));
  }

  function encolarPendiente(id) {
    const ids = leerPendientes();
    if (!ids.includes(id)) ids.push(id);
    guardarPendientes(ids);
  }

  function quitarPendiente(id) {
    guardarPendientes(leerPendientes().filter((pendiente) => pendiente !== id));
  }

  function normalizarRegistro(valor) {
    if (!valor || typeof valor !== 'object') return null;
    const id = String(valor.id || '').trim();
    if (!/^[A-Za-z0-9_-]{4,90}$/.test(id)) return null;
    const tipo = String(valor.tipo || '').trim();
    if (!TIPOS_VALIDOS.has(tipo)) return null;
    const color = /^#[0-9a-f]{6}$/i.test(String(valor.color || '')) ? String(valor.color).toLowerCase() : colorPorTipo(tipo);
    const x = Number(valor.x);
    const y = Number(valor.y);
    const z = Number(valor.z);
    const rotY = Number(valor.rotY);
    const rotZ = Number(valor.rotZ);
    const escala = Number(valor.escala);
    const creado = typeof valor.creado === 'string' && valor.creado ? valor.creado : new Date().toISOString();
    if (![x, y, z, rotY, rotZ, escala].every(Number.isFinite)) return null;
    return {
      id: id,
      tipo: tipo,
      color: color,
      x: limitar(x, -2.5, 2.5),
      y: limitar(y, -2, 2.5),
      z: limitar(z, -2.5, 2.5),
      rotY: limitar(rotY, -TAU * 2, TAU * 2),
      rotZ: limitar(rotZ, -TAU * 2, TAU * 2),
      escala: limitar(escala, 0.3, 3),
      creado: creado
    };
  }

  function agregarRegistro(registro, animar = true) {
    if (!escenaLista || !grupoArbol || !registro) return null;
    if (adornosPorId.has(registro.id)) return adornosPorId.get(registro.id);
    if (registro.tipo === 'estrella' && hayEstrella()) return null;
    if (adornosColocados.length >= MAX_ADORNOS) return null;

    const adorno = crearAdorno(registro.tipo, registro.color);
    adorno.position.set(registro.x, registro.y, registro.z);
    adorno.rotation.y = registro.rotY;
    adorno.rotation.z = registro.rotZ;
    const ahora = performance.now();
    adorno.userData = {
      id: registro.id,
      tipo: registro.tipo,
      color: registro.color,
      nacimiento: animar ? ahora : ahora - DURACION_NACIMIENTO,
      baseY: registro.y,
      baseRotZ: registro.rotZ,
      fase: azar(0, TAU),
      escalaBase: registro.escala,
      creado: registro.creado
    };
    adorno.scale.setScalar(animar ? 0.001 : registro.escala);
    grupoArbol.add(adorno);
    adornosColocados.push(adorno);
    adornosPorId.set(registro.id, adorno);
    return adorno;
  }

  function restaurarLocal() {
    let registros = [];
    try {
      const datos = JSON.parse(leerAlmacen(CLAVE_LOCAL) || '[]');
      if (Array.isArray(datos)) registros = datos;
    } catch (error) {
      registros = [];
    }
    registros.forEach((valor) => agregarRegistro(normalizarRegistro(valor), false));
  }

  function colocarAdorno(tipo, colorHex, clientX, clientY) {
    if (!escenaLista || !grupoArbol) return false;
    if (tipo === 'estrella') {
      if (!esDiaEstrella()) {
        mostrarAviso('La estrella solo puede coronar el arbol el 25 de diciembre.');
        return false;
      }
      if (hayEstrella()) {
        mostrarAviso('La estrella ya esta en la copa del arbol.');
        return false;
      }
    }
    if (adornosColocados.length >= MAX_ADORNOS) {
      mostrarAviso('El arbol ya esta lleno (' + MAX_ADORNOS + ' adornos).');
      return false;
    }

    const rect = escenaEl.getBoundingClientRect();
    let xDeseado;
    let y;
    let z;
    let rotY;
    let escalaBase;

    if (tipo === 'estrella') {
      xDeseado = 0;
      y = alturaEn(1) + 0.14;
      z = 0;
      rotY = 0;
      escalaBase = 1.55;
    } else {
      const nx = limitar((clientX - rect.left) / rect.width, 0, 1);
      const ny = limitar((clientY - rect.top) / rect.height, 0, 1);
      const t = limitar(1 - (ny - 0.08) / 0.84, 0.07, 0.94) + azar(-0.018, 0.018);
      const haciaCamara = Math.cos(grupoArbol.rotation.y) >= 0 ? 1 : -1;
      const fraccion = limitar((nx - 0.5) * 2.05, -1, 1) * 0.96;
      const ang = Math.asin(limitar(fraccion, -0.99, 0.99));
      const radio = radioCapa(t, ang);
      xDeseado = Math.sin(ang) * radio;
      z = Math.cos(ang) * radio * haciaCamara;
      y = alturaEn(t);
      rotY = Math.atan2(xDeseado, z) + azar(-0.35, 0.35);
      escalaBase = azar(1.12, 1.3);
    }

    const rotZ = tipo === 'estrella' ? 0 : azar(-0.5, 0.5);
    const adorno = crearAdorno(tipo, colorHex);
    adorno.position.set(xDeseado, y, z);
    adorno.rotation.y = rotY;
    adorno.rotation.z = rotZ;
    adorno.scale.setScalar(0.001);
    adorno.userData = {
      id: nuevoId(),
      tipo: tipo,
      color: colorHex,
      nacimiento: performance.now(),
      baseY: y,
      baseRotZ: rotZ,
      fase: azar(0, TAU),
      escalaBase: escalaBase,
      creado: new Date().toISOString()
    };
    grupoArbol.add(adorno);
    adornosColocados.push(adorno);
    adornosPorId.set(adorno.userData.id, adorno);

    const geometriaDestello = new THREE.RingGeometry(tipo === 'estrella' ? 0.085 : 0.055, tipo === 'estrella' ? 0.11 : 0.075, 26);
    const materialDestello = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex), transparent: true, opacity: 0.9,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const destello = new THREE.Mesh(geometriaDestello, materialDestello);
    destello.position.set(xDeseado, y, z);
    destello.lookAt(camara.position);
    destello.userData.inicio = performance.now();
    grupoArbol.add(destello);
    destellos.push(destello);

    const registro = registroDeAdorno(adorno);
    guardarLocal();
    encolarPendiente(registro.id);
    void enviarAdorno(registro);
    return true;
  }

  function actualizarAdornos(ahora) {
    for (let i = 0; i < adornosColocados.length; i++) {
      const adorno = adornosColocados[i];
      const info = adorno.userData;
      const p = Math.min(1, (ahora - info.nacimiento) / DURACION_NACIMIENTO);
      const escala = Math.max(0.001, easeOutBack(p) * info.escalaBase);
      adorno.scale.setScalar(escala);
      adorno.position.y = info.baseY + Math.sin(ahora * 0.0012 + info.fase) * 0.005;
      adorno.rotation.z = info.baseRotZ + Math.sin(ahora * 0.0009 + info.fase) * 0.045;
    }

    for (let i = destellos.length - 1; i >= 0; i--) {
      const destello = destellos[i];
      const p = (ahora - destello.userData.inicio) / 500;
      if (p >= 1) {
        grupoArbol.remove(destello);
        destello.geometry.dispose();
        destello.material.dispose();
        destellos.splice(i, 1);
        continue;
      }
      destello.scale.setScalar(1 + p * 7);
      destello.material.opacity = 0.9 * (1 - p);
      destello.lookAt(camara.position);
    }
  }

  function cuadroArbol(ahora) {
    rafArbol = requestAnimationFrame(cuadroArbol);
    if (!ultimoTiempoArbol) ultimoTiempoArbol = ahora;
    const dt = Math.min((ahora - ultimoTiempoArbol) / 1000, 0.05);
    ultimoTiempoArbol = ahora;

    if (!escenaLista) return;
    grupoArbol.rotation.y += dt * VELOCIDAD_GIRO;
    if (grupoMuneco) {
      grupoMuneco.rotation.z = Math.sin(ahora * 0.0011) * 0.082;
      grupoMuneco.rotation.x = Math.sin(ahora * 0.0007 + 1.2) * 0.018;
      grupoMuneco.position.y = BASE_Y - 0.10 + Math.sin(ahora * 0.0016) * 0.008;
    }
    if (grupoPolvo) {
      grupoPolvo.rotation.y -= dt * 0.022;
      grupoPolvo.position.y = Math.sin(ahora * 0.0004) * 0.03;
    }
    if (lucesCalidas) lucesCalidas.material.opacity = 0.68 + Math.sin(ahora * 0.0016) * 0.18;
    if (materialConcha) materialConcha.uniforms.uTiempo.value = ahora * 0.001;
    actualizarAdornos(ahora);
    renderer.render(escena, camara);
  }

  function moverFantasma(x, y) {
    if (!arrastre) return;
    arrastre.fantasma.style.left = x + 'px';
    arrastre.fantasma.style.top = y + 'px';
  }

  function quitarEscuchasArrastre() {
    window.removeEventListener('pointermove', alMoverAdorno);
    window.removeEventListener('pointerup', alSoltarAdorno);
    window.removeEventListener('pointercancel', alCancelarAdorno);
  }

  function alPresionarAdorno(e) {
    if (!activo || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    if (arrastre) cancelarArrastre();

    const boton = e.currentTarget;
    const fantasma = document.createElement('div');
    fantasma.className = 'navidad-fantasma';
    fantasma.style.setProperty('--adorno', boton.dataset.color);
    fantasma.innerHTML = boton.querySelector('svg').outerHTML;
    document.body.appendChild(fantasma);

    arrastre = {
      pointerId: e.pointerId,
      tipo: boton.dataset.tipo,
      color: boton.dataset.color,
      boton: boton,
      fantasma: fantasma
    };
    moverFantasma(e.clientX, e.clientY);
    escenaEl.classList.toggle('sobre', puntoSobreArbol(e.clientX, e.clientY));

    window.addEventListener('pointermove', alMoverAdorno, { passive: false });
    window.addEventListener('pointerup', alSoltarAdorno);
    window.addEventListener('pointercancel', alCancelarAdorno);
  }

  function alMoverAdorno(e) {
    if (!arrastre || e.pointerId !== arrastre.pointerId) return;
    e.preventDefault();
    moverFantasma(e.clientX, e.clientY);
    escenaEl.classList.toggle('sobre', puntoSobreArbol(e.clientX, e.clientY));
  }

  function alSoltarAdorno(e) {
    if (!arrastre || e.pointerId !== arrastre.pointerId) return;
    const dentro = puntoSobreArbol(e.clientX, e.clientY);
    const color = arrastre.color;
    const tipo = arrastre.tipo;
    const x = e.clientX;
    const y = e.clientY;
    const fantasma = arrastre.fantasma;
    const boton = arrastre.boton;

    quitarEscuchasArrastre();
    escenaEl.classList.remove('sobre');
    arrastre = null;
    ignorarMunecoHasta = performance.now() + 320;

    if (dentro && escenaLista) {
      const colocado = colocarAdorno(tipo, color, x, y);
      if (colocado) {
        fantasma.animate(
          [
            { opacity: 1, transform: 'translate(-50%,-50%) scale(1.1)' },
            { opacity: 0, transform: 'translate(-50%,-50%) scale(.45)' }
          ],
          { duration: 220, easing: 'ease-out', fill: 'forwards' }
        );
        setTimeout(() => fantasma.remove(), 240);
      } else {
        devolverAlCatalogo(fantasma, boton);
      }
    } else {
      devolverAlCatalogo(fantasma, boton);
    }
  }

  function alCancelarAdorno(e) {
    if (!arrastre || e.pointerId !== arrastre.pointerId) return;
    cancelarArrastre();
  }

  function devolverAlCatalogo(fantasma, boton) {
    const rect = fantasma.getBoundingClientRect();
    const origenX = rect.left + rect.width / 2;
    const origenY = rect.top + rect.height / 2;
    const destino = (boton || catalogoEl).getBoundingClientRect();
    const destinoX = destino.left + destino.width / 2;
    const destinoY = destino.top + destino.height / 2;
    const inicio = performance.now();
    const duracion = 360;
    const paso = (ahora) => {
      if (!fantasma.isConnected) return;
      const p = Math.min((ahora - inicio) / duracion, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const x = origenX + (destinoX - origenX) * eased;
      const y = origenY + (destinoY - origenY) * eased;
      fantasma.style.left = x + 'px';
      fantasma.style.top = y + 'px';
      fantasma.style.transform = 'translate(-50%,-50%) scale(' + (1.1 - 0.75 * eased).toFixed(3) + ')';
      fantasma.style.opacity = (1 - eased).toFixed(3);
      if (p < 1) fantasma.__rafVolver = requestAnimationFrame(paso);
      else fantasma.remove();
    };
    fantasma.__rafVolver = requestAnimationFrame(paso);
  }

  function cancelarArrastre() {
    if (!arrastre) return;
    quitarEscuchasArrastre();
    escenaEl.classList.remove('sobre');
    const fantasma = arrastre.fantasma;
    const boton = arrastre.boton;
    arrastre = null;
    ignorarMunecoHasta = performance.now() + 320;
    devolverAlCatalogo(fantasma, boton);
  }

  function urlNube(id) {
    return NUBE_BASE + '/' + NUBE_RUTA + (id ? '/' + encodeURIComponent(id) : '') + '.json';
  }

  function urlNubeMusicas(id) {
    return NUBE_BASE + '/' + NUBE_RUTA_MUSICAS + (id ? '/' + encodeURIComponent(id) : '') + '.json';
  }

  async function pedirConTiempo(url, opciones = {}) {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), 6500);
    const esLectura = !opciones.method || opciones.method === 'GET';
    const destino = url + (esLectura ? '?_=' + Date.now() : '');
    try {
      return await fetch(destino, Object.assign({ cache: 'no-store' }, opciones, { signal: control.signal }));
    } finally {
      clearTimeout(temporizador);
    }
  }

  async function pedirNube(id, opciones = {}) {
    return pedirConTiempo(urlNube(id), opciones);
  }

  async function pedirNubeMusicas(id, opciones = {}) {
    return pedirConTiempo(urlNubeMusicas(id), opciones);
  }

  async function enviarAdorno(registro) {
    estadoNube('Guardando en nube', 'guardando');
    try {
      const respuesta = await pedirNube(registro.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registro)
      });
      if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
      quitarPendiente(registro.id);
      estadoNube('Nube al dia · ' + adornosColocados.length + ' adornos', 'nube');
      return true;
    } catch (error) {
      estadoNube('Sin conexion · local', 'error');
      return false;
    }
  }

  async function subirPendientes() {
    const ids = leerPendientes();
    if (!ids.length) return true;
    for (let i = 0; i < ids.length; i++) {
      const adorno = adornosPorId.get(ids[i]);
      if (!adorno) {
        quitarPendiente(ids[i]);
        continue;
      }
      const enviado = await enviarAdorno(registroDeAdorno(adorno));
      if (!enviado) return false;
    }
    return true;
  }

  async function sincronizarNube() {
    if (sincronizandoNube || !activo) return false;
    sincronizandoNube = true;
    estadoNube('Sincronizando nube', 'guardando');
    try {
      const respuesta = await pedirNube('', { headers: { Accept: 'application/json' } });
      if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
      const datos = await respuesta.json();
      let lista = [];
      if (Array.isArray(datos)) {
        lista = datos;
      } else if (datos && typeof datos === 'object') {
        lista = Object.keys(datos).map((id) => Object.assign({ id: id }, datos[id]));
      }
      let cambios = false;
      lista.forEach((valor) => {
        const registro = normalizarRegistro(valor);
        if (registro && !adornosPorId.has(registro.id)) {
          if (agregarRegistro(registro, true)) cambios = true;
        }
      });
      if (cambios) guardarLocal();
      const pendientesOk = await subirPendientes();
      if (pendientesOk) estadoNube('Nube al dia · ' + adornosColocados.length + ' adornos', 'nube');
      return pendientesOk;
    } catch (error) {
      estadoNube('Sin conexion · local', 'error');
      return false;
    } finally {
      sincronizandoNube = false;
    }
  }

  function iniciarBucles() {
    if (!activo) return;
    ultimoTiempoArbol = null;
    ultimoTiempoNieve = null;
    if (!rafArbol) rafArbol = requestAnimationFrame(cuadroArbol);
    if (!rafNieve) rafNieve = requestAnimationFrame(cuadroNieve);
  }

  function detenerBucles() {
    if (rafArbol) cancelAnimationFrame(rafArbol);
    if (rafNieve) cancelAnimationFrame(rafNieve);
    rafArbol = null;
    rafNieve = null;
    ultimoTiempoArbol = null;
    ultimoTiempoNieve = null;
  }

  function iniciar() {
    if (activo) return;
    activo = true;
    overlay.classList.add('activo');
    document.body.classList.add('navidad-chamoys-activo');
    window.OpcionesTemas.ocultarCorazon();

    crearEscena3D();
    ajustarEscena();
    if (!localRestaurado) {
      restaurarLocal();
      localRestaurado = true;
    }
    reiniciarCopos();
    iniciarBucles();
    if (!musicas.length) {
      leerMusicasLocal();
      if (musicas.length !== MUSICAS_DEFECTO.length) renderizarMusicas();
    }
    const guardada = parseInt(leerAlmacen(CLAVE_MUSICA_SEL) || '-1', 10);
    musicaIndice = guardada >= 0 && guardada < musicas.length ? guardada : -1;
    renderizarMusicas();
    estadoNube('Conectando nube', 'guardando');
    void sincronizarNube();
    void cargarMusicasNube();
    if (!intervaloNube) {
      intervaloNube = setInterval(() => {
        if (activo && !document.hidden) void sincronizarNube();
      }, 30000);
    }
  }

  function detener() {
    if (!activo) return;
    activo = false;
    overlay.classList.remove('activo');
    document.body.classList.remove('navidad-chamoys-activo');
    window.OpcionesTemas.mostrarCorazon();
    detenerBucles();
    escenaEl.classList.remove('sobre');
    clearTimeout(avisoTimeout);
    avisoEl.classList.remove('visible');
    audioMusica.pause();
    menuEl.classList.remove('abierto');
    munecoHitEl.setAttribute('aria-expanded', 'false');
    cerrarPaneles();
    if (intervaloNube) {
      clearInterval(intervaloNube);
      intervaloNube = null;
    }

    if (arrastre) {
      quitarEscuchasArrastre();
      arrastre = null;
    }
    document.querySelectorAll('.navidad-fantasma').forEach((el) => {
      if (el.__rafVolver) cancelAnimationFrame(el.__rafVolver);
      el.remove();
    });
    guardarLocal();
  }

  let tResize = null;
  window.addEventListener('resize', () => {
    if (!activo) return;
    clearTimeout(tResize);
    tResize = setTimeout(() => {
      ajustarEscena();
      reiniciarCopos();
    }, 120);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      detenerBucles();
      return;
    }
    if (activo) {
      iniciarBucles();
      void sincronizarNube();
    }
  });

  window.OpcionesTemas.registrarTema({
    id: 'navidad-chamoys',
    etiqueta: 'Navidad de Chamoys',
    activar: iniciar,
    desactivar: detener
  });

  window.NavidadChamoys = {
    activar: iniciar,
    desactivar: detener,
    adornos: () => adornosColocados.length,
    activo: () => activo,
    registros: () => adornosColocados.map(registroDeAdorno),
    sincronizar: () => sincronizarNube(),
    estrellaPermitida: () => esDiaEstrella(),
    nube: () => ({ url: NUBE_BASE, ruta: NUBE_RUTA, pendientes: leerPendientes().length })
  };
})();
