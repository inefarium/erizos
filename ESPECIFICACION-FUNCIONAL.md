# Especificación Funcional - INEFARIUM (erizos)

| Campo | Valor |
| --- | --- |
| Proyecto | INEFARIUM / erizos |
| Tipo de documento | Especificación funcional (SDD - Specification-Driven Development) |
| Versión | 1.2 |
| Fecha | 2026-11-24 |
| Estado | Tema Navidad con persistencia Firebase implementado |
| Repositorio | https://github.com/inefarium/erizos |
| Alcance del documento | Comportamiento funcional, datos, configuración y criterios de aceptación del sitio actual |

---

## 1. Propósito y enfoque SDD

Este documento es la fuente de verdad funcional del proyecto. Describe **qué hace** el sitio, **cómo se comporta** cada módulo y **qué se considera aceptado**, sin entrar en detalles de implementación salvo cuando son necesarios para entender el comportamiento (constantes, estados, almacenamiento).

Se usa como base para:

- Validar que una modificación no rompe el comportamiento existente.
- Priorizar correcciones y mejoras.
- Derivar pruebas manuales o automatizadas.
- Documentar decisiones y deuda técnica.

La especificación describe el **estado actual implementado**. Las discrepancias detectadas entre lo implementado y lo deseable se registran en la sección 15 (Limitaciones conocidas y deuda técnica).

---

## 2. Visión del producto

INEFARIUM es una experiencia web estática, romántica y de estética cyberpunk/neón, pensada para compartir mensajes, recuerdos y pequeñas sorpresas interactivas. El usuario principal es una persona cercana al autor (la "prenovia"), aunque el sitio es accesible a cualquiera con el enlace.

Principios de diseño:

- Fondo negro con neón cian (`#0ff`) y magenta (`#ff00c8`).
- Tipografía monoespaciada (`Courier New`).
- Efectos tipo holograma: brillo, líneas de escaneo, parpadeo, glitch.
- Interacciones simples (toque/click) con reacciones visuales y sonoras.
- React 19 + TypeScript + Vite, con temas legacy en JavaScript del lado del cliente.
- Contenido personal editable mediante constantes/listas en el código.

---

## 3. Alcance

### 3.1 Incluido

- Pantalla principal con títulos animados y corazón 3D interactivo.
- Menú de "Conmemoraciones Inefarium" con temas exclusivos.
- Temas base: Lluvia Codificada, Escáner Holográfico, Grid Neón, Partículas Etéreas, Mi Prenovia, Páginas Cósmicas.
- Temas plugin: Regalo Cósmico, Florcita Amarilla, Calabaza Cyberpunk, Navidad de Chamoys.
- Libro de fotos holográfico (`libro.html`).
- Página independiente de tarjeta holograma (`mi_prenovia.html`).
- Calendario de películas de Halloween con sincronización opcional en Firebase Realtime Database.
- Música de fondo local para el tema de Halloween.
- Persistencia local en `localStorage` y, opcionalmente, en la nube.
- Firebase Realtime Database compartida para el calendario y los adornos de Navidad de Chamoys.

### 3.2 Excluido

- Autenticación de usuarios.
- Backend propio, autenticación o panel de administración; solo se usan las rutas públicas de Firebase.
- Pruebas automatizadas versionadas en el repositorio.
- Internacionalización (todo el contenido está en español).
- Accesibilidad avanzada certificada.

---

## 4. Actores

| Actor | Descripción | Necesidades |
| --- | --- | --- |
| Visitante / Prenovia | Persona que abre el sitio | Descubrir interacciones, leer mensajes, ver fotos, usar el calendario |
| Autor / Administrador | Persona que mantiene el código | Editar frases, fotos, canciones y configuración sin tocar la lógica |
| Dispositivos | Móvil y escritorio, mouse y táctil | Misma experiencia funcional con gestos adecuados |

---

## 5. Glosario

| Término | Definición |
| --- | --- |
| Tema | Efecto visual/sonoro superpuesto al fondo, seleccionable desde el menú |
| Tema plugin | Tema registrado desde un archivo externo vía `window.OpcionesTemas.registrarTema` |
| Overlay | Capa fija que contiene el efecto de un tema |
| Corazón 3D | Malla wireframe de corazón renderizada con Three.js en `index.html` |
| Escena | Contenedor del corazón y sus estrellas |
| Fantasma | Elemento flotante que sigue al puntero/dedo durante un arrastre en el calendario |
| Nube | Firebase Realtime Database usada para sincronizar películas y adornos |
| Modo local | Funcionamiento sin Firebase, usando solo `localStorage` |
| Holograma | Estilo visual con glow, líneas de escaneo, parpadeo y transparencias |

---

## 6. Arquitectura general

### 6.1 Stack

- HTML5, CSS3 y TypeScript/JSX (React 19) sobre Vite.
- Three.js instalado vía npm, empaquetado en el build (sin CDN).
- Scripts legacy de temas cargados como módulos de efecto secundario, en orden.
- Canvas 2D para el resto de modelos 3D (regalo, flor, calabaza, partículas).
- Web Audio API para sonidos sintetizados y reverb.
- Firebase Realtime Database vía REST (`fetch`) para el calendario y los adornos de Navidad.
- `localStorage` para caché, preferencias y cola de sincronización.

### 6.2 Estructura de archivos

```text
erizos/
  index.html                  Entrada de Vite (contenedor #root)
  src/
    main.tsx                  Arranque de React y carga ordenada de temas
    App.tsx                   Pantalla principal
    components/               Titulo y Corazon3D (React + TS)
    config/                   Frases y parámetros del corazón
    lib/                      Audio, efectos y geometría 3D
    styles/index.css          Estilos de la pantalla principal
    types/global.d.ts         Tipos de APIs globales legacy
    themes/opciones-temas.js  Núcleo del menú y temas base
    themes/regalo-cosmico.js  Tema plugin: regalo 3D
    themes/florcita_amarilla.js Tema plugin: flor 3D
    themes/calabaza.js        Tema plugin: calabaza + calendario + música + nube
    themes/navidad-chamoys.js Tema plugin: árbol holográfico + adornos + nieve + nube
  public/                     Copiado tal cual a dist/
    libro.html                Libro de fotos holográfico
    mi_prenovia.html          Página independiente de tarjeta holograma
    fotos/                    Fotos del libro (foto1..foto9)
    musicas_hallowen/         Canciones del tema Calabaza
  .github/workflows/deploy.yml Despliegue en GitHub Pages
```

### 6.3 Orden de carga en `src/main.tsx`

1. `styles/index.css`.
2. `themes/opciones-temas.js` (define el núcleo y `window.OpcionesTemas`).
3. `themes/regalo-cosmico.js` (requiere el núcleo).
4. `themes/florcita_amarilla.js` (requiere el núcleo).
5. `themes/calabaza.js` (requiere el núcleo).
6. `themes/navidad-chamoys.js` (requiere el núcleo).
7. `App` de React (títulos y corazón 3D) sobre `#root`.

Los plugins deben importarse **después** de `opciones-temas.js`; si no, muestran error en consola y no se registran.

### 6.4 Capas y z-index

| Capa | z-index | Archivo |
| --- | --- | --- |
| Overlays de tema (lluvia, escáner, grid, partículas) | 3 | `opciones-temas.js` |
| Fondo de calabaza | 3 | `calabaza.js` |
| Navidad de Chamoys (cuarto, nieve, árbol) | 3 | `navidad-chamoys.js` |
| Suelo de calabaza | 4 | `calabaza.js` |
| Tarjeta Mi Prenovia / Regalo / Florcita | 4 | tema correspondiente |
| Texto principal `.contenedor` | 5 | `opciones-temas.js` |
| Calabaza / partículas del calendario | 6 / 7 | `calabaza.js` |
| Hojita del regalo / mensaje de florcita | 8 | temas |
| Sorpresa de florcitas | 9 | `florcita_amarilla.js` |
| Corazón 3D | 15 | `index.html` |
| Mensaje flotante del corazón | 20 | `index.html` |
| Murciélagos | 22 | `calabaza.js` |
| Panel del calendario | 20-45 | `calabaza.js` |
| Chispas del corazón | 30 | `index.html` |
| Menú de temas | 50 | `opciones-temas.js` |
| Explosión de calabaza | 50-55 | `calabaza.js` |
| Mensaje flotante del calendario | 60 | `calabaza.js` |
| Adorno fantasma durante el arrastre | 80 | `navidad-chamoys.js` |
| Aviso del tema Navidad | 90 | `navidad-chamoys.js` |

Regla de composición: el texto principal siempre queda por encima de los overlays de tema, salvo efectos explícitamente pensados para pasar por encima (fuegos del regalo, mensajes, hojita, sorpresa).

---

## 7. Requisitos funcionales

Cada requisito indica prioridad: **Alta** (experiencia base), **Media** (funcionalidad relevante), **Baja** (detalle o contenido).

### 7.1 RF-01 - Núcleo visual y sonoro de la pantalla principal

**Objetivo:** presentar el mensaje principal y dar retroalimentación al interactuar.

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-01.1 | Mostrar dos títulos: "En un mundo de tibios...." (cian) y "Estamos erizos...." (magenta) | Alta |
| RF-01.2 | Al hacer click o toque sobre un título, reproducir animación glitch de ~0.3 s | Alta |
| RF-01.3 | Al interactuar, generar 6 chispas con símbolos (`# % & / 0 1 x * ¡ !`) que suben y desaparecen en ~0.8 s | Media |
| RF-01.4 | Reproducir un sonido cyberpunk sintetizado (sin archivos) al tocar un título | Media |
| RF-01.5 | Evitar doble disparo por `touchstart` + `click` sintético | Media |
| RF-01.6 | El título cian usa tono alto (660 Hz) y el magenta tono bajo (330 Hz) | Baja |

**Comportamiento del sonido:** dos osciladores (sine + triangle), filtro lowpass con barrido, envolvente y eco con feedback. Cada interacción crea nodos nuevos.

### 7.2 RF-02 - Corazón 3D interactivo

**Objetivo:** elemento sorpresa central que aparece en un lugar aleatorio y entrega mensajes.

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-02.1 | Renderizar un corazón wireframe 3D con Three.js dentro de `#canvasCorazon` | Alta |
| RF-02.2 | El corazón gira sobre su eje y tiene un anillo tipo Saturno girando | Alta |
| RF-02.3 | La escena se posiciona aleatoriamente dentro de la pantalla con margen para el latido | Alta |
| RF-02.4 | El corazón late (escala 1 a 1.06) de forma continua | Media |
| RF-02.5 | Mostrar 5 estrellitas `✦` titilando alrededor | Baja |
| RF-02.6 | Al tocar el corazón: sonido, chispas, mensaje flotante aleatorio | Alta |
| RF-02.7 | Tras el toque, ocultar la escena 500 ms, reposicionarla y mostrarla de nuevo | Media |
| RF-02.8 | Evitar doble disparo durante 600 ms | Media |
| RF-02.9 | Los mensajes se reubican si se salen de la pantalla | Media |
| RF-02.10 | El corazón se oculta mientras un tema que lo requiera está activo | Alta |

**Frases del corazón:** 26 frases definidas en `FRASES_CORAZON` (`index.html`). Se eligen al azar en cada toque.

**Parámetros visuales (CONFIG_CORAZON):**

| Parámetro | Valor | Descripción |
| --- | --- | --- |
| color | `0xff00c8` | Color wireframe |
| segmentosContorno | 20 | Puntos del contorno |
| segmentosProfundidad | 15 | Anillos de profundidad |
| profundidad | 0.4 | Inflado 3D |
| escalaCorazon | 1.15 | Tamaño en escena |
| radioAnillo | 1.2 | Radio del anillo |
| grosorAnillo | 0.014 | Grosor del tubo |
| velocidadGiro | 0.006 | Rotación del corazón |
| velocidadAnillo | 0.018 | Rotación del anillo |

### 7.3 RF-03 - Menú y sistema de temas

**Objetivo:** permitir activar un efecto visual a la vez mediante un menú.

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-03.1 | Inyectar un botón flotante en la esquina superior derecha con icono de esfera geodésica giratoria | Alta |
| RF-03.2 | Al pulsar el botón, desplegar una lista con título "Conmemoraciones Inefarium" | Alta |
| RF-03.3 | La selección de tema es exclusiva: solo uno activo a la vez | Alta |
| RF-03.4 | Volver a pulsar el tema activo lo desactiva | Media |
| RF-03.5 | Al elegir un tema, desactivar todos los demás antes de activar el nuevo | Alta |
| RF-03.6 | Cerrar el menú al elegir una opción o al hacer click fuera | Media |
| RF-03.7 | Soportar temas plugin registrados desde otros archivos | Alta |
| RF-03.8 | Marcar visualmente la opción activa (punto relleno) | Media |
| RF-03.9 | Exponer `window.OpcionesTemas` con API de registro y utilidades del corazón | Alta |
| RF-03.10 | Si un `desactivar()` falla, registrar el error y continuar con los demás | Media |

**Temas base y orden:** Lluvia Codificada, Escáner Holográfico, Grid Neón, Partículas Etéreas, Mi Prenovia, Páginas Cósmicas. Los plugins se agregan al final (Regalo Cósmico, Florcita Amarilla, Calabaza Cyberpunk, Navidad de Chamoys).

**API pública:**

```js
window.OpcionesTemas = {
  registrarTema({ id, etiqueta, activar, desactivar }),
  ocultarCorazon(),
  mostrarCorazon(),
  cerrarMenu(),
  contenedorMenu,
  listaTemas
};
```

### 7.4 RF-04 - Tema "Lluvia Codificada"

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-04.1 | Mostrar lluvia de caracteres `01#%&/*¡!ERIZO01xX` en canvas a pantalla completa | Media |
| RF-04.2 | Alternar color cian/magenta con estela | Baja |
| RF-04.3 | Reiniciar columnas al azar al llegar al fondo | Baja |
| RF-04.4 | Detener animación y limpiar canvas al desactivar | Alta |
| RF-04.5 | Comparte el canvas con Partículas Etéreas; solo uno puede estar activo | Alta |

### 7.5 RF-05 - Tema "Escáner Holográfico"

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-05.1 | Superponer líneas de escaneo horizontales y una barra de barrido animada | Media |
| RF-05.2 | No bloquear clicks (`pointer-events: none`) | Alta |
| RF-05.3 | Ocultar al desactivar | Alta |

### 7.6 RF-06 - Tema "Grid Neón"

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-06.1 | Mostrar una rejilla magenta en perspectiva con movimiento continuo | Media |
| RF-06.2 | No bloquear clicks | Alta |
| RF-06.3 | Ocultar al desactivar | Alta |

### 7.7 RF-07 - Tema "Partículas Etéreas"

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-07.1 | Generar partículas proporcionales al área de pantalla (`w*h/14000`) | Media |
| RF-07.2 | Movimiento flotante con rebote en los bordes | Media |
| RF-07.3 | Colores cian/magenta con glow | Baja |
| RF-07.4 | Detener y limpiar al desactivar | Alta |

### 7.8 RF-08 - Tema "Mi Prenovia" (tarjeta holograma inline)

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-08.1 | Mostrar tarjeta "TRANSMISIÓN INEFARIUM" con mensaje y enlace "Te dedico" | Alta |
| RF-08.2 | La tarjeta aparece en un borde aleatorio de la pantalla | Media |
| RF-08.3 | Se mueve tipo screensaver rebotando en los bordes, sin teletransportes | Media |
| RF-08.4 | El enlace abre YouTube en nueva pestaña | Media |
| RF-08.5 | Ocultar el corazón y sus estrellas mientras el tema está activo | Alta |
| RF-08.6 | Restaurar el corazón al desactivar | Alta |

### 7.9 RF-09 - Tema "Páginas Cósmicas"

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-09.1 | Al seleccionar el tema, navegar a `libro.html` | Alta |
| RF-09.2 | El tema no tiene efecto de retorno (es una navegación) | Baja |

### 7.10 RF-10 - Tema "Regalo Cósmico"

**Objetivo:** caja de regalo 3D holográfica que se abre, suelta fuegos artificiales y una nota con frase.

**Estados:** `apagado -> ocupado -> cerrado -> abierto -> ocupado -> cerrado`.

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-10.1 | Al activar, materializar el regalo tras 250 ms en un lugar aleatorio | Alta |
| RF-10.2 | El regalo es un modelo 3D real dibujado en canvas (cuerpo, tapa, lazo) que gira | Alta |
| RF-10.3 | La tapa se abre con animación de resorte y haz de luz | Alta |
| RF-10.4 | Al abrir, reproducir sonido cósmico sintetizado | Media |
| RF-10.5 | Al abrir: 8 cohetes/explosiones repartidos por la pantalla | Alta |
| RF-10.6 | Al abrir: mostrar hojita con frase, efecto máquina de escribir | Alta |
| RF-10.7 | Mientras está abierto: fuente de chispas y fuegos internos aleatorios | Media |
| RF-10.8 | Mientras está abierto: click en cualquier lugar lo pliega y lo mueve a otro sitio | Alta |
| RF-10.9 | Mientras está cerrado: solo abre si el click cae sobre el regalo | Alta |
| RF-10.10 | Ignorar clicks del menú y del enlace de la firma | Media |
| RF-10.11 | Ocultar el corazón mientras el tema está activo | Alta |
| RF-10.12 | Al desactivar, cancelar temporizadores, detener 3D, silenciar y limpiar | Alta |

**Frases:** 11 frases en `FRASES_REGALO`; se usan en orden aleatorio sin repetir hasta agotar el mazo.

**Enlace de la nota:** `https://n9.cl/qi0m5b`.

### 7.11 RF-11 - Tema "Florcita Amarilla"

**Objetivo:** flor 3D que esquiva el toque la mayoría de las veces y, a veces, se deja atrapar como sorpresa.

**Estados:** `apagado -> ocupado -> quieta`.

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-11.1 | Al activar, mostrar flor 3D girando en un lugar aleatorio | Alta |
| RF-11.2 | Evitar aparecer sobre el texto principal cuando haya espacio libre | Media |
| RF-11.3 | Al tocar cerca de la flor: 75% esquiva, 25% se deja atrapar | Alta |
| RF-11.4 | Esquiva: deslizamiento + desvanecido de 460 ms, chispas y mensaje gracioso | Alta |
| RF-11.5 | Esquiva: reaparecer tras 1800 ms de mensaje + 300 ms de pausa | Media |
| RF-11.6 | Atrapada: mensaje final y efecto pop | Media |
| RF-11.7 | Atrapada: lanzar 26-39 mini flores por la pantalla tras 1800 ms | Media |
| RF-11.8 | Las mini flores desaparecen todas juntas con chispas | Baja |
| RF-11.9 | Ocultar el corazón mientras el tema está activo | Alta |
| RF-11.10 | Al desactivar, limpiar temporizadores, partículas y mini flores | Alta |

**Frases:** 9 frases de esquive y 4 frases finales. Probabilidad de dejarse atrapar: `0.25`.

### 7.12 RF-12 - Tema "Calabaza Cyberpunk"

**Objetivo:** calabaza 3D de Halloween que rueda, se vuelve loca, explota y da acceso a un calendario compartido de películas.

**Estados de la calabaza:** `normal`, `loca`, `explotando`, `oculta`, `panel abierto`.

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-12.1 | Al activar, mostrar calabaza 3D con cara tallada y música de fondo | Alta |
| RF-12.2 | La calabaza rueda horizontalmente y rebota en los bordes | Alta |
| RF-12.3 | Cada 7-14 s entra en modo loco durante 3-5 s (saltos, sacudida, velocidad x4.5) | Media |
| RF-12.4 | Si nadie la toca, explota al terminar el modo loco | Media |
| RF-12.5 | La explosión muestra onda, neón, cara de susto, sonido boom y vibración | Media |
| RF-12.6 | Tras explotar, reaparece a los 3200 ms en otra posición | Media |
| RF-12.7 | Al pulsar la calabaza, abrir el panel del calendario y detener la animación | Alta |
| RF-12.8 | Mostrar murciélagos animados alrededor del panel al abrirlo | Baja |
| RF-12.9 | El calendario muestra mes/año, navegación y destaca el 31 de octubre | Alta |
| RF-12.10 | Agregar películas (máx 60 caracteres, mayúsculas) | Alta |
| RF-12.11 | Asignar película a un día con click (seleccionar y tocar día) | Alta |
| RF-12.12 | Arrastrar y soltar películas a días o a la lista (mouse y táctil) | Alta |
| RF-12.13 | En táctil, mantener presionado ~220 ms para arrastrar desde la lista | Media |
| RF-12.14 | Devolver una película a la lista y borrarla | Alta |
| RF-12.15 | Ver, copiar y cargar el calendario como JSON | Media |
| RF-12.16 | Persistir en `localStorage` y, si hay Firebase, sincronizar cada 4 s | Alta |
| RF-12.17 | Mostrar estado LOCAL / EN LÍNEA / SIN CONEXIÓN | Media |
| RF-12.18 | Reproducir música con reverb, selector y botón de siguiente canción | Media |
| RF-12.19 | Recordar la última canción elegida | Baja |
| RF-12.20 | Ocultar el corazón mientras el tema está activo | Alta |
| RF-12.21 | Al desactivar, detener música, 3D, sincronización y limpiar todo | Alta |

**Calendario:**

- Mes inicial: octubre de 2026 (`ANIO_INICIAL = 2026`, `MES_INICIAL = 9`).
- Semana inicia en lunes (`SEMANA_INICIA_LUNES = true`).
- Rango de años permitido: 1900 a 2200.
- Los días de octubre 31 reciben estilo especial "halloween".

**Sincronización (Firebase):**

- URL base: `https://calabazainefarium-default-rtdb.firebaseio.com`.
- Ruta: `calabaza/peliculas`.
- Intervalo: 4000 ms.
- Sin autenticación en el cliente.
- Si falla, se mantiene el modo local y se reintenta.

**Música:**

| Canción | Archivo |
| --- | --- |
| Cirice Ghost | `./musicas_hallowen/cirice_ghost.mp3` |
| Kidnap the Sandy | `./musicas_hallowen/Kidnap_the_Sandy.mp3` |
| Sweet Dreams | `./musicas_hallowen/Sweet_Dreams.mp3` |

Configuración: volumen `0.25`, reverb `0.48`, loop activo.

**API pública:**

```js
window.CalabazaHalloween = {
  exportarJSON(),
  importarJSON(texto),
  irA(anio, mes),
  abrir(),
  cerrar(),
  sincronizar(),
  musica(indice),
  aloquese(),
  explotar()
};
```

### 7.13 RF-13 - Tema "Navidad de Chamoys"

**Objetivo:** árbol holográfico interactivo en un cuarto oscuro con luz cálida, nieve optimizada, adornos 3D arrastrables y persistencia local/nube.

**Estados:** `inactivo` ↔ `activo`; dentro de activo, cada adorno puede estar `en catálogo`, `arrastrándose`, `colocado en el árbol` o `volviendo al catálogo`.

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-13.1 | Al activar, ocultar los títulos centrales y el corazón | Alta |
| RF-13.2 | Mostrar un cuarto oscuro con brillos cálidos y nostálgicos | Media |
| RF-13.3 | Hacer caer nieve holográfica cian/magenta/dorada usando sprites cacheados | Alta |
| RF-13.4 | Mostrar un árbol 3D girando lentamente, con cuerpo translúcido y líneas frontales/traseras diferenciadas | Alta |
| RF-13.5 | Mostrar un catálogo con 10 adornos: bola, estrella, campana, copo, regalo, lazo, caramelo, galleta, piña y vela | Alta |
| RF-13.6 | Arrastrar adornos con mouse o táctil y resaltar la zona del árbol | Alta |
| RF-13.7 | Al soltar sobre el árbol, proyectar el cursor contra la malla 3D y dejar el adorno exactamente en ese punto, girando con el árbol | Alta |
| RF-13.8 | Al soltar fuera del árbol, el adorno vuelve animado a su botón del catálogo | Alta |
| RF-13.9 | La estrella solo puede colocarse el 25 de diciembre; antes se muestra un aviso y no se coloca | Alta |
| RF-13.10 | Solo puede existir una estrella en el árbol; al intentar otra se informa que ya está colocada | Media |
| RF-13.11 | Guardar cada adorno en `localStorage` con id, tipo, color, posición, rotación, escala y fecha | Alta |
| RF-13.12 | Sincronizar los adornos con Firebase Realtime Database al activar, al recuperar visibilidad y tras colocarlos | Alta |
| RF-13.13 | Si la nube falla, mantener el guardado local y reintentar los pendientes en la siguiente sincronización | Alta |
| RF-13.14 | Restaurar los adornos guardados al recargar o en otro dispositivo conectado a la misma nube | Alta |
| RF-13.15 | Limitar el árbol a 48 adornos y avisar cuando esté lleno | Baja |
| RF-13.16 | Pausar las animaciones al desactivar el tema o al ocultar la pestaña | Media |
| RF-13.17 | Al desactivar, restaurar títulos y corazón, cancelar arrastres y limpiar avisos | Alta |

**Nube:**

- Firebase Realtime Database: `https://calabazainefarium-default-rtdb.firebaseio.com`.
- Ruta separada de las películas: `calabaza/navidad/adornos`.
- Lectura: `GET .../calabaza/navidad/adornos.json`.
- Escritura: `PUT .../calabaza/navidad/adornos/<id>.json`.
- No requiere credenciales ni variables de entorno; usa la misma base pública que el calendario.
- Sin conexión: modo local; los adornos se mantienen y se encolan para subirlos después.
- Si dos estrellas llegan de fuentes distintas, solo se restaura la primera.

**API pública:** `window.NavidadChamoys = { activar(), desactivar(), adornos(), activo(), registros(), sincronizar(), estrellaPermitida(), nube() }`.

### 7.14 RF-14 - Libro de fotos (`libro.html`)

**Objetivo:** presentar fotos y mensajes en un libro 3D holográfico.

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-14.1 | Mostrar libro cerrado con portada "INEFARIUM" y subtítulo | Alta |
| RF-14.2 | Al hacer click, abrir el libro con animación de portada | Alta |
| RF-14.3 | Mostrar dos páginas por vista | Alta |
| RF-14.4 | Navegar con botones "Anterior", "Siguiente" y "Cerrar libro" | Alta |
| RF-14.5 | Navegar con teclado: flecha derecha, flecha izquierda, Escape | Media |
| RF-14.6 | Cada página de foto muestra título, imagen y texto | Alta |
| RF-14.7 | Deshabilitar botones en los extremos | Media |
| RF-14.8 | Enlace "Volver" a `index.html` | Media |
| RF-14.9 | Animación de aparición tipo holograma al cargar | Baja |
| RF-14.10 | Diseño responsive para pantallas menores a 700 px | Media |

**Páginas actuales:** 11 entradas (inicio, 9 fotos, final). Se muestran de a pares; con número impar la última aparece sola.

**Discrepancia conocida:** las fotos se titulan "Página I" a "Página X", pero falta la "Página V" y el pie numérico cuenta todas las páginas (incluida la intro), por lo que no coincide con el título.

### 7.15 RF-15 - Página independiente `mi_prenovia.html`

**Objetivo:** versión autónoma de la tarjeta holograma.

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RF-15.1 | Mostrar tarjeta "TRANSMISIÓN INEFARIUM" | Baja |
| RF-15.2 | Aparecer subiendo desde abajo cada cierto tiempo aleatorio | Baja |
| RF-15.3 | Derivar lentamente y rebotar en los bordes | Baja |
| RF-15.4 | Ocultarse y reaparecer en ciclo | Baja |
| RF-15.5 | Enlace "Volver" a `index.html` | Baja |

**Estado:** página huérfana (no está enlazada desde el sitio) y duplica funcionalidad del tema "Mi Prenovia".

---

## 8. Máquinas de estado

### 8.1 Tema (núcleo)

```text
sin_tema --(elegir tema)--> activo
activo --(elegir mismo tema)--> sin_tema
activo --(elegir otro tema)--> desactivar(actual) -> activar(nuevo)
```

### 8.2 Regalo Cósmico

```text
apagado --(activar)--> ocupado --(250ms)--> cerrado
cerrado --(click sobre regalo)--> abierto
abierto --(click en cualquier lugar)--> ocupado --(900ms)--> cerrado
* --(desactivar)--> apagado
```

### 8.3 Florcita Amarilla

```text
apagado --(activar)--> ocupado --(250ms)--> quieta
quieta --(click cerca, 75%)--> esquiva(460ms) --> reaparece
quieta --(click cerca, 25%)--> atrapada --> sorpresa --> reaparece
* --(desactivar)--> apagado
```

### 8.4 Calabaza Cyberpunk

```text
normal --(7-14s)--> loca --(3-5s)--> explotando --(3200ms)--> normal
normal --(click)--> panel_abierto --(cerrar)--> normal
* --(desactivar)--> apagado
```

### 8.5 Libro

```text
cerrado --(click)--> abierto(pagina 0)
abierto --(Siguiente/Anterior)--> abierto
abierto --(Cerrar/Escape)--> cerrado
```

---

## 9. Modelo de datos y persistencia

### 9.1 localStorage

| Clave | Contenido | Archivo |
| --- | --- | --- |
| `calabaza_calendario_v1` | JSON `{ version, peliculas[] }` | `calabaza.js` |
| `calabaza_musica_v1` | Índice de la canción elegida | `calabaza.js` |
| `navidad_chamoys_adornos_v2` | JSON con los adornos colocados | `navidad-chamoys.js` |
| `navidad_chamoys_pendientes_v2` | IDs de adornos pendientes de subir | `navidad-chamoys.js` |
| `navidad_chamoys_musicas_v1` | Metadatos de pistas subidas y, en registros antiguos, su data URL | `navidad-chamoys.js` |
| `navidad_chamoys_musica_sel_v1` | Índice de la pista de Navidad elegida | `navidad-chamoys.js` |

### 9.2 Esquema de películas

```json
{
  "version": 1,
  "peliculas": [
    { "id": "p1", "titulo": "SCREAM", "fecha": "2026-10-31" }
  ]
}
```

Reglas:

- `id`: cadena alfanumérica con `_` y `-`; si falta o se repite, se genera uno nuevo.
- `titulo`: obligatorio, recortado a 60 caracteres, en mayúsculas.
- `fecha`: `YYYY-MM-DD` válida o `null`.
- `fecha = null` significa "pendiente por ver".

### 9.3 Firebase

```text
calabaza/peliculas/<id> = { "titulo": "...", "fecha": "YYYY-MM-DD" | null }
```

- Lectura completa: `GET calabaza/peliculas.json`.
- Escritura por película: `PUT .../<id>.json`.
- Borrado: `DELETE .../<id>.json`.
- Reemplazo total desde JSON: `PUT .../peliculas.json`.

### 9.4 Archivo semilla opcional

`peliculas.json` en la raíz. Solo se usa en modo local (sin Firebase) y solo si no hay datos guardados. Actualmente no existe en el repositorio.

### 9.5 Firebase Realtime Database (adornos de Navidad)

```text
calabaza/navidad/adornos/<id> = {
  "id": "...",
  "tipo": "...",
  "color": "#rrggbb",
  "x": 0,
  "y": 0,
  "z": 0,
  "rotY": 0,
  "rotZ": 0,
  "escala": 1,
  "creado": "ISO 8601"
}
```

- `id`: UUID generado en el cliente; también acepta IDs alfanuméricos con `_` y `-`.
- `tipo`: uno de los 10 adornos soportados.
- `x`, `y`, `z`: coordenadas locales dentro del grupo del árbol.
- `rotY`, `rotZ`: rotación local del adorno.
- `escala`: escala base restaurada.
- `creado`: ISO 8601.
- Lectura: `GET .../calabaza/navidad/adornos.json` devuelve un objeto indexado por `id`.
- Escritura: `PUT .../calabaza/navidad/adornos/<id>.json` crea o reemplaza ese adorno.
- No hay borrado desde la interfaz; el vaciado se hace manualmente desde Firebase.

### 9.6 Firebase Realtime Database (música de Navidad)

```text
calabaza/navidad/musicas/<id> = {
  "id": "...",
  "nombre": "...",
  "creado": "ISO 8601",
  "tamano": 0,
  "mime": "audio/mpeg",
  "partes": 1,
  "formato": "chunks"
}

calabaza/navidad/musicas_datos/<id>/<indice> = "base64..."
```

- El audio se divide en partes de 600000 bytes antes de convertirlo a base64.
- Primero se suben todas las partes y al final el metadato con `partes`; si falta el metadato la pista se ignora.
- No hay límite de tamaño en el cliente. El límite real depende de las reglas y la cuota de Firebase RTDB.
- Al reproducir una pista en la nube, se descargan sus partes y se reconstruye un `Blob` para el reproductor.
- Los registros antiguos con `data` (data URL) siguen siendo compatibles.

---

## 10. Configuración y parámetros

### 10.1 Calabaza

| Constante | Valor | Descripción |
| --- | --- | --- |
| FIREBASE_URL | URL de proyecto | Nube (vacío = local) |
| RUTA_DB | `calabaza/peliculas` | Ruta en la base |
| SYNC_MS | 4000 | Intervalo de sincronización |
| MUSICA | true | Música activa |
| MUSICA_VOL | 0.25 | Volumen |
| MUSICA_REVERB | 0.48 | Cantidad de reverb |
| ANIO_INICIAL | 2026 | Año inicial |
| MES_INICIAL | 9 | Mes inicial (0 = enero) |
| ANIO_MIN / ANIO_MAX | 1900 / 2200 | Rango de años |
| VEL_RODAR | 60 | Velocidad normal (px/s) |
| LOCO_ESPERA_MIN / MAX | 7 / 14 | Espera entre ataques (s) |
| LOCO_VELOCIDAD | 4.5 | Multiplicador en modo loco |
| LOCO_SALTO | 0.42 | Altura de salto |
| EXPLOTAR | true | Explota si nadie la toca |
| EXPLOTA_MIN / MAX | 3 / 5 | Duración de locura antes de explotar (s) |
| REAPARECE_MS | 3200 | Tiempo de reaparición |
| SONIDO | true | Sonido del boom |
| MURCIELAGOS | true | Murciélagos activos |

### 10.2 Regalo Cósmico

| Constante | Valor | Descripción |
| --- | --- | --- |
| SONIDO_REGALO_ACTIVO | true | Sonido al abrir |
| VOLUMEN_SONIDO_REGALO | 0.5 | Volumen |
| VEL_GIRO_REGALO | 0.7 | Velocidad de giro (rad/s) |
| INCLINACION_REGALO | 0.42 | Inclinación de cámara |
| ALTURA_TAPA_REGALO | 0.75 | Subida de la tapa |
| DIST_CAMARA_REGALO | 7 | Distancia de cámara |

### 10.3 Florcita Amarilla

| Constante | Valor | Descripción |
| --- | --- | --- |
| PROB_DEJARSE_FLOR | 0.25 | Probabilidad de dejarse atrapar |
| DURACION_ANIM_ESQUIVE | 460 ms | Duración del esquive (debe coincidir con CSS) |
| DURACION_MENSAJE_ESQUIVE | 1800 ms | Mensaje de esquive visible |
| PAUSA_ANTES_REAPARECER_ESQ | 300 ms | Pausa antes de reaparecer |
| RETRASO_SORPRESA_FINAL | 1800 ms | Inicio de mini flores |
| DURACION_MENSAJE_FINAL | 3200 ms | Mensaje final visible |
| PAUSA_ANTES_REAPARECER_FIN | 450 ms | Pausa antes de reaparecer |
| HALO_TOQUE_FLOR | 54 px | Margen de "cerca de la flor" |

### 10.4 Libro

La lista `paginas` de `libro.html` define el contenido. Tipos soportados: `inicio`, `foto`, `final`.

### 10.5 Navidad de Chamoys

| Constante | Valor | Descripción |
| --- | --- | --- |
| `MAX_DPR` | 1.75 | Límite de densidad del canvas 3D |
| `MAX_DPR_NIEVE` | 1.5 | Límite de densidad del canvas de nieve |
| `VELOCIDAD_GIRO` | 0.12 rad/s | Giro del árbol |
| `MAX_ADORNOS` | 48 | Cupo total del árbol |
| `DURACION_NACIMIENTO` | 420 ms | Aparición de cada adorno |
| `NUBE_BASE` | `https://calabazainefarium-default-rtdb.firebaseio.com` | Base Firebase compartida |
| `NUBE_RUTA` | `calabaza/navidad/adornos` | Ruta de los adornos |
| `NUBE_RUTA_MUSICAS` | `calabaza/navidad/musicas` | Metadatos de las pistas subidas |
| `NUBE_RUTA_MUSICA_DATOS` | `calabaza/navidad/musicas_datos` | Partes base64 de cada pista |
| `MUSICA_CHUNK_BYTES` | 600000 | Tamaño de cada parte de audio antes de base64 |
| Fecha de estrella | 25 de diciembre | Se evalúa con la fecha local del navegador |

---

## 11. Requisitos no funcionales

| ID | Requisito | Prioridad |
| --- | --- | --- |
| RNF-01 | Debe funcionar en navegadores modernos de escritorio y móviles (Chrome, Edge, Firefox, Safari) | Alta |
| RNF-02 | Debe adaptarse a distintos tamaños de pantalla | Alta |
| RNF-03 | El sitio compilado debe servirse como estático, sin instalación en el cliente; el desarrollo usa Vite | Alta |
| RNF-04 | Los efectos deben pausarse/destruirse al desactivar un tema para no consumir CPU | Media |
| RNF-05 | El audio solo debe iniciarse tras una interacción del usuario | Alta |
| RNF-06 | Los errores de audio o de red no deben romper el resto del sitio | Media |
| RNF-07 | El contenido debe estar en español | Baja |
| RNF-08 | El sitio debe poder publicarse en GitHub Pages o cualquier hosting estático | Media |
| RNF-09 | El código debe mantener el sistema de temas desacoplado (plugins) | Media |
| RNF-10 | La experiencia táctil debe evitar gestos no deseados (scroll durante arrastre, doble disparo) | Media |

**Dependencias externas:**

- Three.js y React se empaquetan en el build (sin CDN).
- Firebase (internet) para la sincronización del calendario y los adornos de Navidad; opcional.
- YouTube y `n9.cl` al pulsar enlaces externos.

**Servido del sitio:** el proyecto se compila con `npm run build` y se publica `dist/` en GitHub Pages mediante el workflow. En desarrollo se usa `npm run dev`. Abrir el `index.html` de la raíz con `file://` ya no funciona, porque es la entrada de Vite.

---

## 12. Manejo de errores y casos borde

| Caso | Comportamiento esperado |
| --- | --- |
| Sin conexión a internet | El corazón funciona sin CDN. El calendario cae a modo local y muestra "SIN CONEXIÓN"; la sincronización con Firebase no está disponible. |
| Audio bloqueado por el navegador | El sitio sigue funcionando en silencio; se reintenta al tocar. |
| `localStorage` no disponible | Se ignora el guardado y se trabaja en memoria. |
| JSON inválido al cargar | Se muestra "JSON no válido" y no se modifica nada. |
| Película con id duplicado | Se genera un id nuevo. |
| Película sin título | Se descarta. |
| Fecha inválida | Se normaliza a `null`. |
| Firebase no responde | Se conserva la copia local y se reintenta en el siguiente ciclo. |
| Cambio local durante una lectura de la nube | La lectura vieja se descarta para no pisar cambios. |
| Nube de Navidad no responde | Se conserva el guardado local, se marca "SIN CONEXIÓN · LOCAL" y los IDs quedan pendientes para el siguiente intento. |
| Adorno remoto inválido o tipo desconocido | Se descarta ese registro y se conserva el resto. |
| Estrella intentada antes del 25 de diciembre | No se coloca; se muestra un aviso y el fantasma vuelve al catálogo. |
| Segunda estrella el 25 de diciembre | No se coloca; se avisa que la estrella ya está en la copa. |
| WebGL no disponible | El tema mantiene DOM, nieve y catálogo, pero no crea la escena 3D. |
| Pantalla demasiado pequeña para la flor | Se usa una posición válida al azar aunque se superponga. |
| Doble toque en títulos/corazón | Se ignora el segundo evento en una ventana de tiempo. |
| Click sobre el menú con un tema abierto | No pliega ni mueve el regalo; el menú gestiona el tema. |
| Click sobre el enlace de la firma del regalo | Abre el enlace y no pliega el regalo. |
| Desactivar un tema a mitad de animación | Se cancelan temporizadores, animaciones y partículas. |

---

## 13. Criterios de aceptación

Formato: dado un contexto, cuando ocurre una acción, entonces se obtiene un resultado observable.

### 13.1 Pantalla principal y corazón

- CA-01: Dado `index.html` cargado, entonces se ven los dos títulos y el corazón 3D en un lugar aleatorio.
- CA-02: Dado un título visible, cuando se hace click, entonces hay glitch, chispas y sonido.
- CA-03: Dado el corazón visible, cuando se toca, entonces aparece una frase al azar y el corazón reaparece en otro lugar.
- CA-04: Dado un tema activo que oculta el corazón, entonces el corazón no es visible ni interactuable.

### 13.2 Menú de temas

- CA-05: Dado el botón de menú, cuando se pulsa, entonces se despliega la lista.
- CA-06: Dado un tema activo, cuando se elige otro, entonces el anterior se apaga y el nuevo se enciende.
- CA-07: Dado un tema activo, cuando se vuelve a pulsar, entonces se apaga.
- CA-08: Dado un tema plugin registrado, entonces aparece en la lista y funciona como los base.

### 13.3 Regalo Cósmico

- CA-09: Dado el tema activo, entonces el regalo aparece y gira en 3D.
- CA-10: Dado el regalo cerrado, cuando se toca, entonces se abre, suena y salen fuegos.
- CA-11: Dado el regalo abierto, cuando se toca en cualquier parte, entonces se pliega y reaparece en otro lugar.
- CA-12: Dado el regalo cerrado, cuando se toca fuera de él, entonces no se abre.

### 13.4 Florcita Amarilla

- CA-13: Dado el tema activo, entonces aparece la flor 3D.
- CA-14: Dado la flor quieta, cuando se toca cerca, entonces esquiva o se deja atrapar según probabilidad.
- CA-15: Dado que se deja atrapar, entonces aparece el mensaje final y luego mini flores.

### 13.5 Calabaza y calendario

- CA-16: Dado el tema activo, entonces la calabaza rueda y suena música.
- CA-17: Dado el paso del tiempo, entonces entra en modo loco y puede explotar.
- CA-18: Dado la calabaza visible, cuando se pulsa, entonces se abre el calendario.
- CA-19: Dado el calendario abierto, cuando se agrega una película, entonces aparece en la lista de pendientes.
- CA-20: Dado una película seleccionada, cuando se toca un día, entonces se asigna a ese día.
- CA-21: Dado una película asignada, cuando se devuelve a la lista, entonces queda pendiente.
- CA-22: Dado el JSON exportado, cuando se importa, entonces el calendario se reemplaza.
- CA-23: Dado Firebase configurado y disponible, entonces los cambios se sincronizan entre dispositivos en pocos segundos.
- CA-24: Dado que se cambia de canción, entonces suena la nueva con el mismo nivel de reverb.

### 13.6 Libro

- CA-25: Dado `libro.html`, entonces se ve el libro cerrado.
- CA-26: Dado el libro cerrado, cuando se hace click, entonces se abre.
- CA-27: Dado el libro abierto, cuando se usa Siguiente/Anterior, entonces cambian las páginas de a dos.
- CA-28: Dado el libro abierto, cuando se pulsa Escape, entonces se cierra.
- CA-29: Dado el libro en los extremos, entonces los botones correspondientes se deshabilitan.

### 13.7 Navidad de Chamoys

- CA-30: Dado el tema activo, entonces se ven el árbol, la nieve, el catálogo de 10 adornos y el estado de nube.
- CA-31: Dado un adorno arrastrado dentro del árbol, cuando se suelta, entonces queda colocado, gira con el árbol y se guarda en local.
- CA-32: Dado un adorno arrastrado fuera del árbol, cuando se suelta, entonces vuelve animado a su botón y no se añade.
- CA-33: Dado un día distinto al 25 de diciembre, cuando se intenta colocar la estrella, entonces no se coloca y aparece el aviso correspondiente.
- CA-34: Dado el 25 de diciembre, cuando se coloca la estrella, entonces queda en la copa y solo puede existir una.
- CA-35: Dado un adorno guardado, cuando se recarga la página y se activa el tema, entonces reaparece en la misma posición.
- CA-36: Dado Firebase disponible, cuando se coloca un adorno, entonces se guarda en `calabaza/navidad/adornos` y aparece en otro navegador tras sincronizar.
- CA-37: Dado Firebase caído o sin conexión, entonces el tema sigue funcionando en local y conserva pendientes.
- CA-38: Dado que se desactiva el tema o se oculta la pestaña, entonces se pausan las animaciones y se limpian arrastres y avisos.

---

## 14. Inventario de assets

| Recurso | Tamaño aproximado | Uso |
| --- | --- | --- |
| `public/fotos/foto1.jpg` | 190 KB | Libro página I |
| `public/fotos/foto2.jpeg` | 70 KB | Libro página II |
| `public/fotos/foto3.jpeg` | 62 KB | Libro página III |
| `public/fotos/foto4.jpeg` | 73 KB | Libro página IV |
| `public/fotos/foto5.jpeg` | 170 KB | Libro página VI |
| `public/fotos/foto6.jpeg` | 26 KB | Libro página VII |
| `public/fotos/foto7.jpeg` | 208 KB | Libro página VIII |
| `public/fotos/foto8.jpeg` | 98 KB | Libro página IX |
| `public/fotos/foto9.png` | 1.2 MB | Libro página X |
| `public/musicas_hallowen/cirice_ghost.mp3` | 14.0 MB | Canción 1 |
| `public/musicas_hallowen/Kidnap_the_Sandy.mp3` | 8.4 MB | Canción 2 |
| `public/musicas_hallowen/Sweet_Dreams.mp3` | 11.4 MB | Canción 3 |
| `public/musicas_hallowen/we_fell_in_love_in_october.mp3` | 7.2 MB | Sin uso actual |

Peso total del proyecto: aproximadamente 43 MB (40.9 MB de audio y 2 MB de fotos).

---

## 15. Limitaciones conocidas y deuda técnica

| ID | Hallazgo | Impacto | Archivo |
| --- | --- | --- | --- |
| DT-01 | Resuelto: `<meta name="viewport">` presente en la entrada y en `mi_prenovia.html` | Bajo | `index.html`, `public/mi_prenovia.html` |
| DT-02 | Resuelto: Three.js se empaqueta vía npm; ya no depende de un CDN | Bajo | `package.json`, `src/components/Corazon3D.tsx` |
| DT-03 | Firebase público sin autenticación; depende de reglas externas | Seguridad | `src/themes/calabaza.js` |
| DT-04 | `fetch` falla con `file://` (Firebase y semilla) | Medio en pruebas locales | `src/themes/calabaza.js` |
| DT-05 | El indicador de estado queda vacío cuando hay conexión | Bajo | `src/themes/calabaza.js` |
| DT-06 | `mi_prenovia.html` está huérfano y duplica el tema inline | Mantenimiento | `public/mi_prenovia.html` |
| DT-07 | La numeración del libro salta la Página V y el pie no coincide con el título | Contenido | `public/libro.html` |
| DT-08 | Canción `we_fell_in_love_in_october.mp3` sin usar | Peso | `public/musicas_hallowen/` |
| DT-09 | `foto9.png` pesa 1.2 MB y no está optimizada | Rendimiento | `public/fotos/` |
| DT-10 | Resuelto: se agregó `.gitignore` para `node_modules/` y `dist/` | Bajo | `.gitignore` |
| DT-11 | Resuelto: `README.md` documenta estructura, desarrollo y despliegue | Bajo | `README.md` |
| DT-12 | La animación del corazón sigue corriendo cuando está oculto | Rendimiento | `src/components/Corazon3D.tsx` |
| DT-13 | Cada click crea nodos de audio que no se desconectan | Memoria a largo plazo | `src/lib/audio.ts` |
| DT-14 | Erratas de contenido ("tube", "qerias") | Contenido | `public/libro.html` |
| DT-15 | Ruta de adornos pública sin autenticación; cualquiera con la URL puede leer y escribir bajo `calabaza/navidad` | Seguridad | Firebase RTDB |

---

## 16. Extensión: cómo agregar un tema nuevo

1. Crear un archivo `mi-tema.js`.
2. Verificar que `window.OpcionesTemas` exista; si no, salir con error.
3. Definir estilos y HTML propios (overlay, elementos, etc.).
4. Implementar `activar()` y `desactivar()` idempotentes.
5. Llamar a `window.OpcionesTemas.ocultarCorazon()` / `mostrarCorazon()` si aplica.
6. Registrar:

```js
window.OpcionesTemas.registrarTema({
  id: 'mi-tema',
  etiqueta: 'Mi Tema',
  activar: iniciarMiTema,
  desactivar: detenerMiTema
});
```

7. Importar el módulo en `src/main.tsx` **después** de `opciones-temas.js`.

---

## 17. Definición de terminado (Definition of Done)

Una modificación se considera terminada cuando:

- El comportamiento descrito en esta especificación sigue cumpliéndose.
- No se introducen errores de sintaxis en los `.js`.
- Los temas se pueden activar y desactivar sin dejar temporizadores, animaciones ni audio activos.
- La experiencia funciona con mouse y con toque.
- Los adornos de Navidad sobreviven a la recarga y, con Firebase disponible, se sincronizan con la nube.
- La cola local de Navidad no pierde pendientes cuando la nube falla.
- Los assets referenciados existen y las rutas son correctas.
- La consola del navegador no muestra errores nuevos.

---

## 18. Control de cambios

| Versión | Fecha | Descripción |
| --- | --- | --- |
| 1.0 | 2026-11-14 | Línea base funcional del proyecto a partir del código actual |
| 1.1 | 2026-11-23 | Navidad de Chamoys: árbol sólido y frontal, 10 adornos, estrella bloqueada al 25 de diciembre y rendimiento |
| 1.2 | 2026-11-24 | Navidad de Chamoys: persistencia migrada a la Firebase compartida, en la ruta `calabaza/navidad/adornos`, sin credenciales ni backend propio |
| 1.3 | 2026-11-25 | Navidad de Chamoys: colocación de adornos por proyección 3D, árbol más grande, limpieza de adornos locales/nube y música sin límite de 4 MB mediante partes en Firebase |
