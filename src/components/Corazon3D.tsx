import { useEffect, useMemo, useRef } from 'react';
import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  TorusGeometry,
  WebGLRenderer,
} from 'three';
import { CONFIG_CORAZON } from '../config/corazon';
import { generarGeometriaCorazon } from '../lib/corazonGeometry';
import { sonarCyberpunk } from '../lib/audio';
import { crearChispas, mostrarMensajeCorazon } from '../lib/efectos';

interface PosicionEstrella {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
}

const POSICIONES_ESTRELLAS: PosicionEstrella[] = [
  { top: '2%', left: '4%' },
  { top: '10%', right: '2%' },
  { bottom: '4%', left: '0%' },
  { bottom: '12%', right: '6%' },
  { top: '46%', left: '-6%' },
];

export function Corazon3D() {
  const escenaRef = useRef<HTMLDivElement>(null);
  const corazonRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const estrellas = useMemo(
    () =>
      POSICIONES_ESTRELLAS.map((pos) => ({
        ...pos,
        delay: `${(Math.random() * 1.5).toFixed(2)}s`,
      })),
    [],
  );

  useEffect(() => {
    const escenaEl = escenaRef.current!;
    const corazonEl = corazonRef.current!;
    const canvas = canvasRef.current!;
    if (!escenaEl || !corazonEl || !canvas) return;

    const timeouts = new Set<number>();

    const escena = new Scene();
    const camara = new PerspectiveCamera(38, 1, 0.1, 10);
    camara.position.set(0, 0, 3.9);
    camara.lookAt(0, 0, 0);

    let renderizador: WebGLRenderer;
    try {
      renderizador = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return;
    }
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // --- Corazon wireframe ---
    const geometriaCorazon = generarGeometriaCorazon(CONFIG_CORAZON);
    const materialCorazon = new MeshBasicMaterial({
      vertexColors: true,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
    });
    const mallaCorazon = new Mesh(geometriaCorazon, materialCorazon);

    // Relleno muy tenue por dentro, solo para insinuar volumen sin tapar la malla
    const materialRelleno = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.025,
      side: DoubleSide,
      depthWrite: false,
    });
    const mallaRelleno = new Mesh(geometriaCorazon, materialRelleno);

    const grupoCorazon = new Group();
    grupoCorazon.add(mallaRelleno);
    grupoCorazon.add(mallaCorazon);
    grupoCorazon.scale.set(
      CONFIG_CORAZON.escalaCorazon,
      CONFIG_CORAZON.escalaCorazon,
      CONFIG_CORAZON.escalaCorazon,
    );
    escena.add(grupoCorazon);

    // --- Anillo tipo Saturno alrededor del corazon ---
    const geometriaAnillo = new TorusGeometry(
      CONFIG_CORAZON.radioAnillo,
      CONFIG_CORAZON.grosorAnillo,
      8,
      100,
    );
    const materialAnillo = new MeshBasicMaterial({
      color: CONFIG_CORAZON.color,
      transparent: true,
      opacity: 0.55,
    });
    const anillo = new Mesh(geometriaAnillo, materialAnillo);
    const grupoAnillo = new Group();
    grupoAnillo.add(anillo);
    grupoAnillo.rotation.x = Math.PI / 2.35;
    escena.add(grupoAnillo);

    let tamanoCanvas = 0;
    function ajustarTamanoCanvas() {
      const tam = corazonEl.clientWidth || 160;
      if (tam === tamanoCanvas) return;
      tamanoCanvas = tam;
      renderizador.setSize(tam, tam, false);
      camara.aspect = 1;
      camara.updateProjectionMatrix();
    }

    let raf = 0;
    function animar() {
      raf = requestAnimationFrame(animar);
      grupoCorazon.rotation.y += CONFIG_CORAZON.velocidadGiro;
      grupoAnillo.rotation.z += CONFIG_CORAZON.velocidadAnillo;
      renderizador.render(escena, camara);
    }

    function posicionarCorazonAleatorio() {
      const tam = escenaEl.offsetWidth || 170;
      const margenLatido = tam * 0.08;
      const maxX = Math.max(window.innerWidth - tam - margenLatido, margenLatido);
      const maxY = Math.max(window.innerHeight - tam - margenLatido, margenLatido);
      const x = margenLatido / 2 + Math.random() * (maxX - margenLatido / 2);
      const y = margenLatido / 2 + Math.random() * (maxY - margenLatido / 2);
      escenaEl.style.left = Math.max(x, 0) + 'px';
      escenaEl.style.top = Math.max(y, 0) + 'px';
    }

    let yaDisparando = false;
    function manejarClickCorazon(e: Event) {
      e.stopPropagation();
      if (e.type === 'touchstart') e.preventDefault();
      if (yaDisparando) return;
      yaDisparando = true;
      const guarda = window.setTimeout(() => {
        timeouts.delete(guarda);
        yaDisparando = false;
      }, 600);
      timeouts.add(guarda);

      const point = (e as TouchEvent).touches?.[0] ?? (e as MouseEvent);
      const x = point.clientX;
      const y = point.clientY;

      sonarCyberpunk('bajo');
      crearChispas(x, y);
      mostrarMensajeCorazon(x, y - 30);

      escenaEl.classList.add('oculto');
      const reaparicion = window.setTimeout(() => {
        timeouts.delete(reaparicion);
        posicionarCorazonAleatorio();
        ajustarTamanoCanvas();
        escenaEl.classList.remove('oculto');
      }, 500);
      timeouts.add(reaparicion);
    }

    ajustarTamanoCanvas();
    window.addEventListener('resize', ajustarTamanoCanvas);
    animar();
    posicionarCorazonAleatorio();

    corazonEl.addEventListener('click', manejarClickCorazon);
    corazonEl.addEventListener('touchstart', manejarClickCorazon, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', ajustarTamanoCanvas);
      corazonEl.removeEventListener('click', manejarClickCorazon);
      corazonEl.removeEventListener('touchstart', manejarClickCorazon);
      timeouts.forEach((id) => window.clearTimeout(id));
      timeouts.clear();

      geometriaCorazon.dispose();
      materialCorazon.dispose();
      materialRelleno.dispose();
      geometriaAnillo.dispose();
      materialAnillo.dispose();
      renderizador.dispose();
    };
  }, []);

  return (
    <div className="escena-corazon" id="escenaCorazon" ref={escenaRef}>
      <div className="corazon-flotante" id="corazon" ref={corazonRef}>
        <canvas id="canvasCorazon" ref={canvasRef} />
      </div>
      {estrellas.map((estrella, i) => (
        <span
          key={i}
          className="estrella"
          style={{
            top: estrella.top,
            left: estrella.left,
            right: estrella.right,
            bottom: estrella.bottom,
            animationDelay: estrella.delay,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}

