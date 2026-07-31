/* =====================================================================
   OPCIONES-TEMAS.JS
   -----------------------------------------------------------------
   Módulo independiente: agrega un botón de opciones (esquina) con un
   menú desplegable de 4 "temas" tipo trigger (selección exclusiva,
   tipo radio-button). Al elegir uno se activa un efecto visual que se
   superpone AL FONDO (detrás del texto "En un mundo de tibios / Estamos
   erizos" y detrás del corazón 3D, pero encima del negro de fondo).

   Si volvés a hacer click en el tema ya activo, se desactiva y todo
   vuelve a la normalidad (fondo negro liso).

   NO modifica tu index.html: solo agregá antes de </body>:
     <script src="opciones-temas.js"></script>
   ===================================================================== */

(function () {
  "use strict";

  /* ---------- 1. ESTILOS (inyectados, no tocan tu <style> original) --- */
  const estilos = document.createElement('style');
  estilos.textContent = `
    /* Empujamos el texto principal por encima de los overlays de tema.
       (El resto de tu CSS original no se toca, solo agregamos z-index
       y position a .contenedor para que quede arriba de los efectos) */
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

    /* ---------- Overlays de temas (siempre detrás del texto/corazón) --- */
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
  `;
  document.head.appendChild(estilos);

  /* ---------- 2. HTML del botón + menú + overlays ---------------------- */
  const contenedorMenu = document.createElement('div');
  contenedorMenu.className = 'menu-temas';
  contenedorMenu.id = 'menuTemas';
  contenedorMenu.innerHTML = `
    <button class="boton-menu-temas" id="botonMenuTemas" aria-haspopup="true" aria-expanded="false">☰</button>
    <div class="lista-temas" id="listaTemas" role="menu">
      <button class="opcion-tema" data-tema="lluvia"     role="menuitemradio">Lluvia de código</button>
      <button class="opcion-tema" data-tema="escaner"    role="menuitemradio">Escáner láser</button>
      <button class="opcion-tema" data-tema="grid"       role="menuitemradio">Grid neón</button>
      <button class="opcion-tema" data-tema="particulas" role="menuitemradio">Partículas</button>
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

  /* ---------- 3. Abrir / cerrar el menú --------------------------------- */
  const botonMenu = document.getElementById('botonMenuTemas');
  const listaTemas = document.getElementById('listaTemas');

  function abrirMenu() {
    contenedorMenu.classList.add('abierto');
    botonMenu.setAttribute('aria-expanded', 'true');
  }
  function cerrarMenu() {
    contenedorMenu.classList.remove('abierto');
    botonMenu.setAttribute('aria-expanded', 'false');
  }
  function alternarMenu() {
    contenedorMenu.classList.contains('abierto') ? cerrarMenu() : abrirMenu();
  }

  botonMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    alternarMenu();
  });
  // También se despliega al pasar el cursor (desktop)
  contenedorMenu.addEventListener('mouseenter', abrirMenu);
  contenedorMenu.addEventListener('mouseleave', cerrarMenu);

  document.addEventListener('click', (e) => {
    if (!contenedorMenu.contains(e.target)) cerrarMenu();
  });

  /* ---------- 4. Lógica de selección exclusiva (tipo trigger) ---------- */
  let temaActivo = null;
  const botonesOpcion = Array.from(document.querySelectorAll('.opcion-tema'));

  function apagarTodosLosEfectos() {
    detenerLluvia();
    detenerParticulas();
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
    }
  }

  botonesOpcion.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tema = btn.dataset.tema;

      if (temaActivo === tema) {
        // Ya estaba activo -> se desmarca todo, vuelve a lo normal
        temaActivo = null;
        botonesOpcion.forEach((b) => b.classList.remove('activa'));
        apagarTodosLosEfectos();
        return;
      }

      // Se activa esta y se desmarcan las demás
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
})();
