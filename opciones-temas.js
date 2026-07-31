/* =====================================================================
   OPCIONES-TEMAS.JS
   -----------------------------------------------------------------
   Módulo independiente: agrega un botón de opciones (esquina) con un
   menú desplegable de 5 "temas" tipo trigger (selección exclusiva,
   tipo radio-button). Al elegir uno se activa un efecto visual que se
   superpone AL FONDO (detrás del texto "En un mundo de tibios / Estamos
   erizos", pero encima del negro de fondo).

   "Mi Prenovia" es un tema más: al activarlo aparece la tarjeta
   holograma flotando (igual que en mi_prenovia.html) sobre el fondo,
   dejando el texto principal intacto, y se APAGA el corazón 3D (y sus
   estrellitas) mientras esté activo. Al desactivarlo (click de nuevo o
   elegir otro tema), el corazón vuelve.

   La tarjeta ahora:
   - Solo aparece y se mueve en franjas cercanas a los bordes de la
     pantalla, nunca sobre el texto principal.
   - Deriva lento.
   - Tolera pisar un poco el texto (margen negativo) antes de
     considerarse "choque" y reubicarse.
   - Si choca contra un borde de la pantalla, o su posición se
     superpone con el área del texto (mas alla de la tolerancia), se
     desvanece y vuelve a aparecer en otro punto del borde, con
     transiciones pausadas (no bruscas).

   NO modifica tu index.html: solo agregá antes de </body>:
     <script src="opciones-temas.js"></script>
   ===================================================================== */

(function () {
  "use strict";

  /* ---------- 1. ESTILOS (inyectados, no tocan tu <style> original) --- */
  const estilos = document.createElement('style');
  estilos.textContent = `
    /* Empujamos el texto principal por encima de los overlays de tema. */
    .contenedor {
      position: relative;
      z-index: 5;
    }

    /* ---------- Botón de opciones (esquina superior derecha) ---------- */
    .menu-temas {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 50;
      font-family: 'Courier New', monospace;
      user-select: none;
    }

    .boton-menu-temas {
      width: 42px;
      height: 42px;
      border-radius: 6px;
      background: rgba(0,0,0,0.6);
      border: 1px solid #0ff;
      color: #0ff;
      font-size: 1.3rem;
      cursor: pointer;
      text-shadow: 0 0 6px #0ff;
      box-shadow: 0 0 8px rgba(0,255,255,0.4);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .boton-menu-temas:hover,
    .boton-menu-temas:focus {
      transform: scale(1.05);
      box-shadow: 0 0 16px rgba(0,255,255,0.8);
      outline: none;
    }

    .lista-temas {
      position: absolute;
      top: 50px;
      right: 0;
      min-width: 190px;
      background: rgba(0,0,0,0.85);
      border: 1px solid #ff00c8;
      border-radius: 6px;
      box-shadow: 0 0 14px rgba(255,0,200,0.35);
      overflow: hidden;
      opacity: 0;
      transform: translateY(-8px);
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .menu-temas.abierto .lista-temas {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .opcion-tema {
      display: block;
      width: 100%;
      text-align: left;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      color: #0ff;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .opcion-tema:last-child { border-bottom: none; }
    .opcion-tema:hover { background: rgba(0,255,255,0.08); }

    .opcion-tema.activa {
      color: #ff00c8;
      background: rgba(255,0,200,0.12);
      text-shadow: 0 0 6px #ff00c8;
    }
    .opcion-tema.activa::before {
      content: "● ";
    }
    .opcion-tema:not(.activa)::before {
      content: "○ ";
      opacity: 0.5;
    }

    .titulo-lista-temas {
      padding: 10px 14px 8px;
      font-size: 0.75rem;
      letter-spacing: 1.5px;
      color: #ff00c8;
      text-shadow: 0 0 6px #ff00c8;
      border-bottom: 1px solid rgba(255,0,200,0.35);
      text-transform: uppercase;
    }

    /* ---------- Overlays de temas (siempre detrás del texto) ---------- */
    .canvas-temas {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 3;
      display: none;
      pointer-events: none;
    }

    .overlay-escaner {
      position: fixed;
      inset: 0;
      z-index: 3;
      display: none;
      pointer-events: none;
      background:
        repeating-linear-gradient(
          0deg,
          rgba(0,255,255,0.04) 0px,
          rgba(0,255,255,0.04) 1px,
          transparent 2px,
          transparent 4px
        );
    }
    .overlay-escaner::after {
      content: "";
      position: absolute;
      left: 0;
      width: 100%;
      height: 140px;
      background: linear-gradient(
        180deg,
        transparent 0%,
        rgba(0,255,255,0.18) 50%,
        transparent 100%
      );
      animation: barridoEscaner 3.2s linear infinite;
    }
    @keyframes barridoEscaner {
      0%   { top: -140px; }
      100% { top: 100vh; }
    }

    .overlay-grid {
      position: fixed;
      inset: 0;
      z-index: 3;
      display: none;
      pointer-events: none;
      overflow: hidden;
      perspective: 300px;
    }
    .overlay-grid::before {
      content: "";
      position: absolute;
      left: -50%;
      bottom: -10%;
      width: 200%;
      height: 140%;
      background-image:
        linear-gradient(rgba(255,0,200,0.35) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,0,200,0.35) 1px, transparent 1px);
      background-size: 40px 40px;
      transform: rotateX(75deg);
      animation: moverGrid 6s linear infinite;
    }
    @keyframes moverGrid {
      0%   { background-position: 0 0, 0 0; }
      100% { background-position: 0 80px, 0 0; }
    }

    /* ---------- Tema "Mi Prenovia" (tarjeta holograma flotante) -------- */
    .overlay-prenovia {
      position: fixed;
      inset: 0;
      z-index: 4; /* encima de los demás overlays (3), debajo del texto (5) */
      display: none;
      pointer-events: none;
    }

    .tarjeta-holograma-tema {
      position: fixed;
      width: clamp(220px, 60vw, 320px);
      transform: translateY(140%);
      opacity: 0;
      /* Transiciones mas pausadas: que no se sienta brusco al
         aparecer/desaparecer cuando esquiva bordes o el texto. */
      transition: transform 2.2s cubic-bezier(0.2, 0.8, 0.2, 1),
                  opacity 1.8s ease;
      pointer-events: none;
    }
    .tarjeta-holograma-tema.visible {
      transform: translateY(0);
      opacity: 1;
    }

    .marco-holograma-tema {
      position: relative;
      padding: 1.4em 1.2em;
      border: 1px solid #0ff;
      border-radius: 10px;
      background:
        linear-gradient(180deg, rgba(0,255,255,0.06), rgba(255,0,200,0.05));
      box-shadow:
        0 0 12px rgba(0,255,255,0.55),
        0 0 30px rgba(255,0,200,0.25),
        inset 0 0 18px rgba(0,255,255,0.15);
      overflow: hidden;
      animation: parpadeoHolograma 3.6s infinite;
    }

    @keyframes parpadeoHolograma {
      0%, 100% { opacity: 1; }
      92%      { opacity: 1; }
      93%      { opacity: 0.55; }
      94%      { opacity: 1; }
      96%      { opacity: 0.7; }
      97%      { opacity: 1; }
    }

    .marco-holograma-tema::before {
      content: "";
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        rgba(0,255,255,0.10) 0px,
        rgba(0,255,255,0.10) 1px,
        transparent 2px,
        transparent 4px
      );
      mix-blend-mode: screen;
      animation: desplazarLineas 5s linear infinite;
      pointer-events: none;
    }

    .marco-holograma-tema::after {
      content: "";
      position: absolute;
      left: 0;
      width: 100%;
      height: 40%;
      background: linear-gradient(
        180deg,
        transparent 0%,
        rgba(0,255,255,0.22) 50%,
        transparent 100%
      );
      animation: barridoTarjeta 4s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes desplazarLineas {
      0%   { background-position-y: 0; }
      100% { background-position-y: 40px; }
    }

    @keyframes barridoTarjeta {
      0%   { top: -40%; }
      50%  { top: 100%; }
      100% { top: -40%; }
    }

    .titulo-holograma-tema {
      margin: 0 0 0.5em 0;
      font-size: 1.15rem;
      color: #0ff;
      text-shadow: 0 0 6px #0ff, 0 0 14px #0ff;
      letter-spacing: 2px;
      text-align: center;
    }

    .cuerpo-holograma-tema {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.5em;
      color: #ff00c8;
      text-shadow: 0 0 5px #ff00c8;
      text-align: center;
      letter-spacing: 0.5px;
    }

    .firma-holograma-tema {
      margin-top: 0.9em;
      font-size: 0.75rem;
      color: #0ff;
      opacity: 0.75;
      text-align: right;
      letter-spacing: 1px;
    }

    .link-holograma-tema {
      display: block;
      margin-top: 0.9em;
      text-align: center;
      font-size: 0.9rem;
      letter-spacing: 1px;
      color: #0ff;
      text-shadow: 0 0 6px #0ff;
      text-decoration: underline;
      pointer-events: auto;
      cursor: pointer;
    }
    .link-holograma-tema:hover {
      color: #ff00c8;
      text-shadow: 0 0 8px #ff00c8;
    }

    /* Clase utilitaria para ocultar el corazón (y sus estrellitas)
       mientras el tema "Mi Prenovia" está activo. */
    .prenovia-oculto {
      display: none !important;
    }
  `;
  document.head.appendChild(estilos);

  /* ---------- 2. HTML del botón + menú + overlays ---------------------- */
  const contenedorMenu = document.createElement('div');
  contenedorMenu.className = 'menu-temas';
  contenedorMenu.id = 'menuTemas';
  contenedorMenu.innerHTML = `
    <button class="boton-menu-temas" id="botonMenuTemas" aria-haspopup="true" aria-expanded="false">☰</button>
    <div class="lista-temas" id="listaTemas" role="menu">
      <div class="titulo-lista-temas">Conmemoraciones Inefarium</div>
      <button class="opcion-tema" data-tema="lluvia"     role="menuitemradio">Lluvia de código</button>
      <button class="opcion-tema" data-tema="escaner"    role="menuitemradio">Escáner láser</button>
      <button class="opcion-tema" data-tema="grid"       role="menuitemradio">Grid neón</button>
      <button class="opcion-tema" data-tema="particulas" role="menuitemradio">Partículas</button>
      <button class="opcion-tema" data-tema="prenovia"   role="menuitemradio">Mi Prenovia</button>
    </div>
  `;
  document.body.appendChild(contenedorMenu);

  const canvasTemas = document.createElement('canvas');
  canvasTemas.id = 'canvasTemas';
  canvasTemas.className = 'canvas-temas';
  document.body.appendChild(canvasTemas);

  const overlayEscaner = document.createElement('div');
  overlayEscaner.className = 'overlay-escaner';
  document.body.appendChild(overlayEscaner);

  const overlayGrid = document.createElement('div');
  overlayGrid.className = 'overlay-grid';
  document.body.appendChild(overlayGrid);

  const overlayPrenovia = document.createElement('div');
  overlayPrenovia.className = 'overlay-prenovia';
  overlayPrenovia.id = 'overlayPrenovia';
  overlayPrenovia.innerHTML = `
    <div class="tarjeta-holograma-tema" id="tarjetaHologramaTema">
      <div class="marco-holograma-tema">
        <h2 class="titulo-holograma-tema">TRANSMISIÓN INEFARIUM</h2>
        <p class="cuerpo-holograma-tema">
          En el suspiro de nuestro mundo soñado...<br>
         En aquello que a sido magnificado...<br>
         En el pensamiento de tu linda existencia...<br>
         En mi prenovia... mi amada Princesa...
        </p>
        <p class="firma-holograma-tema">// mi prenovia</p>
        <a class="link-holograma-tema" href="https://youtu.be/3LY99fAO8zE?si=SdWEefDWZtlfPU_l" target="_blank" rel="noopener noreferrer">Presiona aquí</a>
      </div>
    </div>
  `;
  document.body.appendChild(overlayPrenovia);

  /* ---------- 3. Abrir / cerrar el menú --------------------------------- */
  const botonMenu = document.getElementById('botonMenuTemas');
  const listaTemas = document.getElementById('listaTemas');

  let temporizadorCierre = null;

  function abrirMenu() {
    clearTimeout(temporizadorCierre);
    contenedorMenu.classList.add('abierto');
    botonMenu.setAttribute('aria-expanded', 'true');
  }
  function cerrarMenu() {
    clearTimeout(temporizadorCierre);
    contenedorMenu.classList.remove('abierto');
    botonMenu.setAttribute('aria-expanded', 'false');
  }
  function cerrarMenuConTolerancia() {
    clearTimeout(temporizadorCierre);
    temporizadorCierre = setTimeout(cerrarMenu, 300);
  }
  function alternarMenu() {
    contenedorMenu.classList.contains('abierto') ? cerrarMenu() : abrirMenu();
  }

  botonMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    alternarMenu();
  });
  contenedorMenu.addEventListener('mouseenter', abrirMenu);
  contenedorMenu.addEventListener('mouseleave', cerrarMenuConTolerancia);
  listaTemas.addEventListener('mouseenter', abrirMenu);
  listaTemas.addEventListener('mouseleave', cerrarMenuConTolerancia);

  document.addEventListener('click', (e) => {
    if (!contenedorMenu.contains(e.target)) cerrarMenu();
  });

  /* ---------- 4. Lógica de selección exclusiva (tipo trigger) ---------- */
  let temaActivo = null;
  const botonesOpcion = Array.from(document.querySelectorAll('.opcion-tema[data-tema]'));

  function apagarTodosLosEfectos() {
    detenerLluvia();
    detenerParticulas();
    detenerPrenovia();
    canvasTemas.style.display = 'none';
    overlayEscaner.style.display = 'none';
    overlayGrid.style.display = 'none';
  }

  function activarTema(nombre) {
    apagarTodosLosEfectos();
    if (nombre === 'lluvia') {
      canvasTemas.style.display = 'block';
      iniciarLluvia();
    } else if (nombre === 'particulas') {
      canvasTemas.style.display = 'block';
      iniciarParticulas();
    } else if (nombre === 'escaner') {
      overlayEscaner.style.display = 'block';
    } else if (nombre === 'grid') {
      overlayGrid.style.display = 'block';
    } else if (nombre === 'prenovia') {
      iniciarPrenovia();
    }
  }

  botonesOpcion.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tema = btn.dataset.tema;

      if (temaActivo === tema) {
        temaActivo = null;
        botonesOpcion.forEach((b) => b.classList.remove('activa'));
        apagarTodosLosEfectos();
        return;
      }

      temaActivo = tema;
      botonesOpcion.forEach((b) => b.classList.toggle('activa', b === btn));
      activarTema(tema);
    });
  });

  /* ---------- 5. Efecto "Lluvia de código" (canvas) --------------------- */
  const ctx = canvasTemas.getContext('2d');
  let idLluvia = null;
  let columnasLluvia = [];
  const caracteresLluvia = '01#%&/*¡!ERIZO01xX'.split('');

  function ajustarCanvas() {
    canvasTemas.width = window.innerWidth;
    canvasTemas.height = window.innerHeight;
  }
  window.addEventListener('resize', ajustarCanvas);
  ajustarCanvas();

  function iniciarLluvia() {
    ajustarCanvas();
    const tamFuente = 16;
    const numColumnas = Math.floor(canvasTemas.width / tamFuente);
    columnasLluvia = new Array(numColumnas).fill(0);

    function dibujar() {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, canvasTemas.width, canvasTemas.height);
      ctx.font = tamFuente + 'px monospace';

      for (let i = 0; i < columnasLluvia.length; i++) {
        const caracter = caracteresLluvia[Math.floor(Math.random() * caracteresLluvia.length)];
        ctx.fillStyle = Math.random() > 0.85 ? '#ff00c8' : '#0ff';
        ctx.fillText(caracter, i * tamFuente, columnasLluvia[i] * tamFuente);

        if (columnasLluvia[i] * tamFuente > canvasTemas.height && Math.random() > 0.975) {
          columnasLluvia[i] = 0;
        }
        columnasLluvia[i]++;
      }
      idLluvia = requestAnimationFrame(dibujar);
    }
    dibujar();
  }
  function detenerLluvia() {
    if (idLluvia) cancelAnimationFrame(idLluvia);
    idLluvia = null;
    ctx.clearRect(0, 0, canvasTemas.width, canvasTemas.height);
  }

  /* ---------- 6. Efecto "Partículas flotantes" (canvas) ------------------ */
  let idParticulas = null;
  let particulas = [];

  function crearParticulas() {
    ajustarCanvas();
    const cantidad = Math.floor((canvasTemas.width * canvasTemas.height) / 14000);
    particulas = Array.from({ length: cantidad }, () => ({
      x: Math.random() * canvasTemas.width,
      y: Math.random() * canvasTemas.height,
      r: 1 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      color: Math.random() > 0.5 ? '#0ff' : '#ff00c8'
    }));
  }

  function iniciarParticulas() {
    crearParticulas();
    function dibujar() {
      ctx.clearRect(0, 0, canvasTemas.width, canvasTemas.height);
      particulas.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvasTemas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvasTemas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
      });
      idParticulas = requestAnimationFrame(dibujar);
    }
    dibujar();
  }
  function detenerParticulas() {
    if (idParticulas) cancelAnimationFrame(idParticulas);
    idParticulas = null;
    ctx.clearRect(0, 0, canvasTemas.width, canvasTemas.height);
  }

  /* ---------- 7. Efecto "Mi Prenovia" (tarjeta holograma + apaga corazón) */
  const tarjetaPrenovia = document.getElementById('tarjetaHologramaTema');
  let xP = 0, yP = 0, vxP = 0, vyP = 0;
  let driftPrenovia = null;
  let cicloPrenoviaTimeouts = [];
  let anchoP = 0, altoP = 0;

  /* --------------------------------------------------------------------
     El corazón 3D y sus estrellitas viven juntos dentro del contenedor
     con id "escenaCorazon" (index.html: <div class="escena-corazon"
     id="escenaCorazon">...corazón + estrellas...</div>). Por eso ese
     selector va primero: ocultarlo apaga TODO junto (corazón y
     partículas/estrellitas). El resto se deja como respaldo por si el
     markup cambia.
     -------------------------------------------------------------------- */
  const SELECTORES_CORAZON = [
    '#escenaCorazon', '.escena-corazon',
    '#corazon', '.corazon', '#corazon3d', '.corazon-3d',
    '#heart', '.heart', '#corazon-container', '.corazon-container',
    'canvas#corazon', '.contenedor-corazon'
  ];

  function ocultarCorazon() {
    SELECTORES_CORAZON.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => el.classList.add('prenovia-oculto'));
    });
  }
  function mostrarCorazon() {
    document.querySelectorAll('.prenovia-oculto').forEach((el) => el.classList.remove('prenovia-oculto'));
  }

  function medirTarjetaPrenovia() {
    anchoP = tarjetaPrenovia.offsetWidth || 260;
    altoP = tarjetaPrenovia.offsetHeight || 160;
  }

  /* Rectángulo del bloque de texto principal ("En un mundo de tibios /
     Estamos erizos"). Margen NEGATIVO a propósito: hace el rectángulo
     prohibido mas chico que el texto real, dándole tolerancia a la
     tarjeta para pisar un poco el texto antes de considerarse choque.
     Subí el número (ej. -24, -30) si querés que pise mas; bajalo
     (ej. -8) si querés que pise menos. */
  function obtenerRectTextoProhibido(margen = -16) {
    const contenedorTexto = document.querySelector('.contenedor');
    if (!contenedorTexto) return null;
    const r = contenedorTexto.getBoundingClientRect();
    return {
      left: r.left - margen,
      right: r.right + margen,
      top: r.top - margen,
      bottom: r.bottom + margen
    };
  }

  function rectanguloSeSuperponen(a, b) {
    if (!a || !b) return false;
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  /* Elige una posición dentro de una franja cercana a alguno de los 4
     bordes de la pantalla (arriba/abajo/izquierda/derecha), evitando
     siempre superponerse con el texto principal. */
  function posicionAleatoriaEnBorde() {
    medirTarjetaPrenovia();
    const anchoVentana = window.innerWidth;
    const altoVentana = window.innerHeight;
    const maxX = Math.max(anchoVentana - anchoP, 0);
    const maxY = Math.max(altoVentana - altoP, 0);
    const bordes = ['arriba', 'abajo', 'izquierda', 'derecha'];

    let posX = 0, posY = 0;
    let intentos = 0;
    const maximoIntentos = 14;

    do {
      const borde = bordes[Math.floor(Math.random() * bordes.length)];
      if (borde === 'arriba') {
        posX = Math.random() * maxX;
        posY = 0;
      } else if (borde === 'abajo') {
        posX = Math.random() * maxX;
        posY = maxY;
      } else if (borde === 'izquierda') {
        posX = 0;
        posY = Math.random() * maxY;
      } else {
        posX = maxX;
        posY = Math.random() * maxY;
      }
      intentos++;
    } while (
      intentos < maximoIntentos &&
      rectanguloSeSuperponen(
        { left: posX, right: posX + anchoP, top: posY, bottom: posY + altoP },
        obtenerRectTextoProhibido()
      )
    );

    xP = posX;
    yP = posY;
    tarjetaPrenovia.style.left = xP + 'px';
    tarjetaPrenovia.style.top = yP + 'px';

    // Deriva lenta y aleatoria (mas lenta que antes)
    const velocidad = 0.045 + Math.random() * 0.06;
    const angulo = Math.random() * Math.PI * 2;
    vxP = Math.cos(angulo) * velocidad;
    vyP = Math.sin(angulo) * velocidad;
  }

  function detenerDriftPrenovia() {
    if (driftPrenovia) cancelAnimationFrame(driftPrenovia);
    driftPrenovia = null;
  }

  /* Deriva la tarjeta por su franja de borde. Si llega a tocar un
     borde de la pantalla, o su posición se acerca/superpone al texto
     principal (mas alla de la tolerancia), no rebota: se desvanece y
     reaparece en otro punto. */
  function iniciarDriftPrenovia() {
    medirTarjetaPrenovia();
    let posX = parseFloat(tarjetaPrenovia.style.left) || 0;
    let posY = parseFloat(tarjetaPrenovia.style.top) || 0;

    function paso() {
      const nuevoX = posX + vxP;
      const nuevoY = posY + vyP;

      const chocaBorde =
        nuevoX <= 0 || nuevoX + anchoP >= window.innerWidth ||
        nuevoY <= 0 || nuevoY + altoP >= window.innerHeight;

      const rectoTarjeta = { left: nuevoX, right: nuevoX + anchoP, top: nuevoY, bottom: nuevoY + altoP };
      const chocaTexto = rectanguloSeSuperponen(rectoTarjeta, obtenerRectTextoProhibido());

      if (chocaBorde || chocaTexto) {
        reaparecerEnOtroLugar();
        return;
      }

      posX = nuevoX;
      posY = nuevoY;
      tarjetaPrenovia.style.left = posX + 'px';
      tarjetaPrenovia.style.top = posY + 'px';

      driftPrenovia = requestAnimationFrame(paso);
    }
    driftPrenovia = requestAnimationFrame(paso);
  }

  /* Desvanece la tarjeta, espera un momento (ritmo pausado, no
     brusco), la reubica en otro borde y la vuelve a mostrar, para
     luego retomar la deriva. */
  function reaparecerEnOtroLugar() {
    detenerDriftPrenovia();
    tarjetaPrenovia.classList.remove('visible');

    const tEspera = setTimeout(() => {
      posicionAleatoriaEnBorde();
      requestAnimationFrame(() => {
        tarjetaPrenovia.classList.add('visible');
      });

      const tRetomaDrift = setTimeout(() => {
        iniciarDriftPrenovia();
      }, 2000); // espera a que termine la transicion de aparicion (mas lenta)
      cicloPrenoviaTimeouts.push(tRetomaDrift);
    }, 1100); // pausa oculta antes de reaparecer, para que no se sienta rapido

    cicloPrenoviaTimeouts.push(tEspera);
  }

  function iniciarPrenovia() {
    overlayPrenovia.style.display = 'block';
    ocultarCorazon();

    posicionAleatoriaEnBorde();
    requestAnimationFrame(() => {
      tarjetaPrenovia.classList.add('visible');
    });

    const t1 = setTimeout(() => {
      iniciarDriftPrenovia();
    }, 2000);
    cicloPrenoviaTimeouts.push(t1);
  }

  function detenerPrenovia() {
    overlayPrenovia.style.display = 'none';
    detenerDriftPrenovia();
    cicloPrenoviaTimeouts.forEach((id) => clearTimeout(id));
    cicloPrenoviaTimeouts = [];
    tarjetaPrenovia.classList.remove('visible');
    mostrarCorazon();
  }
})();
