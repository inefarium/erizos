import { useEffect, useRef } from 'react';
import { sonarCyberpunk, type TonoCorazon } from '../lib/audio';
import { crearChispas } from '../lib/efectos';

interface TituloProps {
  texto: string;
  variante: 'cyan' | 'pink';
  tono: TonoCorazon;
}

export function Titulo({ texto, variante, tono }: TituloProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const disparando = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const disparar = (e: Event) => {
      if (e.type === 'touchstart') e.preventDefault();
      if (disparando.current) return;
      disparando.current = true;
      window.setTimeout(() => {
        disparando.current = false;
      }, 350);

      el.classList.remove('glitch');
      void el.offsetWidth;
      el.classList.add('glitch');
      window.setTimeout(() => el.classList.remove('glitch'), 300);

      sonarCyberpunk(tono);

      const point = (e as TouchEvent).touches?.[0] ?? (e as MouseEvent);
      crearChispas(point.clientX, point.clientY);
    };

    el.addEventListener('click', disparar);
    el.addEventListener('touchstart', disparar, { passive: false });

    return () => {
      el.removeEventListener('click', disparar);
      el.removeEventListener('touchstart', disparar);
    };
  }, [tono]);

  return (
    <h1 ref={ref} className={variante} data-text={texto}>
      {texto}
    </h1>
  );
}
