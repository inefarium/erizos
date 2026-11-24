# INEFARIUM (erizos)

Experiencia web estática, romántica y cyberpunk, construida con **React + TypeScript + Vite** y desplegada en **GitHub Pages**.

## Requisitos

- Node.js 20 o superior (probado con Node 24)
- npm

## Desarrollo

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite (por defecto `http://localhost:5173`).

## Build y vista previa

```bash
npm run build   # typecheck + build en dist/
npm run preview # sirve dist/ localmente
```

## Despliegue en GitHub Pages

El despliegue se hace con GitHub Actions (`.github/workflows/deploy.yml`):

1. En el repositorio, ve a **Settings → Pages**.
2. En **Build and deployment → Source**, elige **GitHub Actions**.
3. Haz push a `main`. El workflow instala, compila y publica `dist/`.

El `base` de Vite es relativo (`./`), así que funciona tanto en
`https://usuario.github.io/erizos/` como en un dominio propio.

> Importante: ya no se publica el HTML de la raíz directamente. Pages debe
> servir el artefacto generado por el workflow.

## Nube de Navidad de Chamoys

El tema **Navidad de Chamoys** incluye un árbol 3D, 10 adornos arrastrables,
nieve holográfica y guardado local. La estrella solo se puede colocar el 25 de
diciembre.

Los adornos se comparten entre dispositivos con la misma Firebase Realtime
Database que usa el calendario de Calabaza, en la ruta separada
`calabaza/navidad/adornos`. No requiere variables de entorno ni credenciales:
la URL pública ya está incluida en `src/themes/navidad-chamoys.js`.

Si Firebase no responde, el tema sigue funcionando en local y deja los adornos
pendientes para subirlos en la siguiente sincronización.

## Estructura

```text
erizos/
├── index.html                  Entrada de Vite (solo #root + script)
├── src/
│   ├── main.tsx                Arranque de React y carga de temas
│   ├── App.tsx                 Pantalla principal
│   ├── components/
│   │   ├── Titulo.tsx          Títulos con glitch, sonido y chispas
│   │   └── Corazon3D.tsx       Corazón Three.js, estrellas y mensajes
│   ├── config/
│   │   ├── frases.ts           Frases del corazón
│   │   └── corazon.ts          Parámetros del corazón y símbolos
│   ├── lib/
│   │   ├── audio.ts            Web Audio (sonido cyberpunk)
│   │   ├── efectos.ts          Chispas y mensajes flotantes
│   │   └── corazonGeometry.ts  Geometría 3D del corazón
│   ├── styles/index.css        Estilos de la pantalla principal
│   ├── types/global.d.ts       Tipos de las APIs globales legacy
│   └── themes/                 Temas legacy (JS) cargados como plugins
│       ├── opciones-temas.js   Núcleo del menú y temas base
│       ├── regalo-cosmico.js
│       ├── florcita_amarilla.js
│       ├── calabaza.js
│       └── navidad-chamoys.js
├── public/                     Copiado tal cual a dist/
│   ├── libro.html              Libro de fotos
│   ├── mi_prenovia.html        Tarjeta independiente
│   ├── fotos/
│   └── musicas_hallowen/
└── .github/workflows/deploy.yml
```

## Cómo agregar contenido

- **Frases del corazón:** edita `src/config/frases.ts`.
- **Look del corazón:** edita `src/config/corazon.ts`.
- **Colores y estilos:** `src/styles/index.css`.
- **Libro de fotos:** edita `public/libro.html` (lista `paginas`) y coloca las imágenes en `public/fotos/`.
- **Música de Halloween:** añade los `.mp3` en `public/musicas_hallowen/` y actualiza la lista en `src/themes/calabaza.js`.

## Cómo agregar un tema

Los temas legacy se registran solos al cargarse:

```js
window.OpcionesTemas.registrarTema({
  id: 'mi-tema',
  etiqueta: 'Mi Tema',
  activar: iniciarMiTema,
  desactivar: detenerMiTema,
});
```

1. Crea el archivo en `src/themes/`.
2. Impórtalo en `src/main.tsx` **después** de `opciones-temas.js`.
3. Usa `window.OpcionesTemas.ocultarCorazon()` / `mostrarCorazon()` si el tema debe ocultar el corazón.

Los nuevos temas también pueden implementarse como componentes React; el menú
actual sigue aceptando temas legacy sin cambios.

## Documentación funcional

La especificación completa está en
[`ESPECIFICACION-FUNCIONAL.md`](./ESPECIFICACION-FUNCIONAL.md).
