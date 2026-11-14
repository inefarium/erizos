import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import type { CorazonConfig } from '../config/corazon';

export interface PuntoContorno {
  x: number;
  y: number;
}

// Curva parametrica clasica del corazon 2D (normalizada aprox a [-1,1])
export function puntoContornoCorazon(t: number): PuntoContorno {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: x / 17, y: y / 17 };
}

// Genera una malla continua: el contorno del corazon se "infla" en el eje Z
// con un perfil tipo lente, creando una superficie curva real.
export function generarGeometriaCorazon(cfg: CorazonConfig): BufferGeometry {
  const { segmentosContorno: U, segmentosProfundidad: V, profundidad, color } = cfg;
  const geometria = new BufferGeometry();
  const posiciones: number[] = [];
  const colores: number[] = [];
  const indices: number[] = [];
  const colorBase = new Color(color);

  for (let j = 0; j <= V; j++) {
    const s = -Math.PI / 2 + (Math.PI * j) / V; // -PI/2 (atras) .. PI/2 (adelante)
    const escala = Math.cos(s);
    const z = profundidad * Math.sin(s);
    const brillo = 0.35 + 0.65 * ((z / profundidad + 1) / 2);
    for (let i = 0; i <= U; i++) {
      const t = (Math.PI * 2 * i) / U;
      const p = puntoContornoCorazon(t);
      posiciones.push(p.x * escala, p.y * escala, z);
      colores.push(colorBase.r * brillo, colorBase.g * brillo, colorBase.b * brillo);
    }
  }

  const filas = U + 1;
  for (let j = 0; j < V; j++) {
    for (let i = 0; i < U; i++) {
      const a = j * filas + i;
      const b = a + filas;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  geometria.setIndex(indices);
  geometria.setAttribute('position', new Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute('color', new Float32BufferAttribute(colores, 3));
  geometria.computeVertexNormals();
  return geometria;
}

