import { SIMBOLOS } from '../config/corazon';
import { FRASES_CORAZON } from '../config/frases';

export function crearChispas(x: number, y: number): void {
  for (let i = 0; i < 6; i++) {
    const chispa = document.createElement('span');
    chispa.className = 'chispa';
    chispa.textContent = SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];
    chispa.style.left = x + (Math.random() * 60 - 30) + 'px';
    chispa.style.top = y + (Math.random() * 20 - 10) + 'px';
    chispa.style.color = Math.random() > 0.5 ? '#0ff' : '#ff00c8';
    document.body.appendChild(chispa);
    window.setTimeout(() => chispa.remove(), 800);
  }
}

export function mostrarMensajeCorazon(x: number, y: number): void {
  const frase = FRASES_CORAZON[Math.floor(Math.random() * FRASES_CORAZON.length)];
  const msg = document.createElement('div');
  msg.className = 'mensaje-flotante';
  msg.textContent = frase;
  msg.style.left = x + 'px';
  msg.style.top = y + 'px';
  document.body.appendChild(msg);

  // Medir el tamano real del mensaje y reubicarlo si se sale de la pantalla
  const margen = 12;
  const rect = msg.getBoundingClientRect();
  const mitadAncho = rect.width / 2;
  let left = x;
  let top = y;
  if (left - mitadAncho < margen) left = mitadAncho + margen;
  if (left + mitadAncho > window.innerWidth - margen) left = window.innerWidth - margen - mitadAncho;
  if (top - rect.height < margen) top = rect.height + margen;
  if (top > window.innerHeight - margen) top = window.innerHeight - margen;
  msg.style.left = left + 'px';
  msg.style.top = top + 'px';

  requestAnimationFrame(() => msg.classList.add('mostrar'));

  window.setTimeout(() => {
    msg.classList.remove('mostrar');
    window.setTimeout(() => msg.remove(), 400);
  }, 2080);
}
