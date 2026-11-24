# Nube de Navidad de Chamoys

Worker de Cloudflare + D1 para guardar los adornos colocados en el arbol.
La API guarda tipo, color, posicion, rotacion, escala y fecha de creacion.

## Endpoints

| Metodo | Ruta | Uso |
| --- | --- | --- |
| GET | `/salud` | Comprobar que el Worker responde |
| GET | `/adornos` | Listar adornos guardados |
| POST | `/adornos` | Crear o actualizar un adorno por `id` |

Ejemplo de cuerpo para `POST /adornos`:

```json
{
  "id": "7d9f4d84-4ee2-4d1f-9d4d-1f5985d3b0d2",
  "tipo": "bola",
  "color": "#ff5f7e",
  "x": 0.32,
  "y": -0.15,
  "z": 0.61,
  "rotY": 0.48,
  "rotZ": -0.2,
  "escala": 1.2,
  "creado": "2026-12-01T20:00:00.000Z"
}
```

## Crear la base D1

Desde `worker/`:

```bash
npx wrangler d1 create inefarium-navidad
```

Copia el `database_id` que devuelve el comando en `worker/wrangler.toml`,
en lugar de `REEMPLAZA_CON_D1_DATABASE_ID`. Despues aplica el esquema:

```bash
npx wrangler d1 execute inefarium-navidad --remote --file=schema.sql
```

## Desplegar el Worker

```bash
npx wrangler deploy
```

Anota la URL publicada, por ejemplo
`https://inefarium-navidad.TU-SUBDOMINIO.workers.dev`.

## Conectar el sitio

Opcion recomendada para GitHub Pages: crea una variable de repositorio en
**Settings -> Secrets and variables -> Actions -> Variables**:

```text
VITE_NAVIDAD_NUBE_URL=https://inefarium-navidad.TU-SUBDOMINIO.workers.dev
```

El workflow `.github/workflows/deploy.yml` la inyecta durante el build.
Tambien se puede configurar sin recompilar desde la consola del navegador:

```js
window.NavidadChamoys.configurarNube('https://inefarium-navidad.TU-SUBDOMINIO.workers.dev');
```

La URL queda guardada en `localStorage.navidad_nube_url` para ese navegador.
Sin URL, el tema sigue funcionando con guardado local y deja pendientes para
subirlos en la siguiente sincronizacion.

## Comprobar datos

```bash
npx wrangler d1 execute inefarium-navidad --remote --command="SELECT * FROM adornos ORDER BY creado"
```

El Worker no expone borrado. Para vaciar la tabla manualmente:

```bash
npx wrangler d1 execute inefarium-navidad --remote --command="DELETE FROM adornos"
```
