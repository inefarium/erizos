# ESPECIFICACIONES DE SUBIDA A GIT

**Proyecto:** INEFARIUM / erizos
**Repo:** `https://github.com/inefarium/erizos.git`
**Rama:** `main`
**Destino:** GitHub Pages vía GitHub Actions
**URL final:** `https://inefarium.github.io/erizos/`

---

## 1. Regla de oro

Esta versión **no se abre con doble clic ni con Live Server**. Se compila con Vite y se publica el contenido de `dist/` mediante el workflow `.github/workflows/deploy.yml`.

**Nunca** pongas Pages en “Deploy from a branch”. Si lo haces, verás una página en blanco.
**Siempre** usa **GitHub Actions** como fuente.

---

## 2. ¿Todo en un solo commit?

Sí. Todo el cambio va en **un único commit**:

- Migración a Vite + React + TypeScript.
- Archivos movidos (`fotos/`, `musicas_hallowen/`, `libro.html`, `mi_prenovia.html`, temas).
- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`.
- Workflow de despliegue.
- `README.md` y documentación.

El historial anterior **no se pierde**; se agrega un commit nuevo encima de `main`. Los archivos movidos se registran como renames, no como copias.

---

## 3. Checklist antes de subir

- [ ] `npm run build` pasa sin errores.
- [ ] `git status` no muestra `node_modules/` ni `dist/`.
- [ ] No hay claves, tokens ni archivos `.env`.
- [ ] `package-lock.json` está incluido.
- [ ] `.github/workflows/deploy.yml` está incluido.
- [ ] El repo es público (o tu plan permite Pages en privados).

---

## 4. Subida (un solo commit)

Ejecutar desde la raíz del proyecto:

```powershell
npm run build
git add -A
git status --short
git commit -m "migracion a Vite + React + TS y deploy en GitHub Pages"
git push origin main
```

**Qué hace cada línea:**

1. `npm run build`: valida TypeScript y genera `dist/` (ignorado por Git).
2. `git add -A`: prepara TODO el cambio (nuevos, modificados y movidos).
3. `git status --short`: revisión final antes de confirmar.
4. `git commit`: crea el único commit de la migración.
5. `git push`: sube `main` y dispara el workflow.

Si el push pide credenciales, autentícate con tu cuenta de GitHub. Si rechaza el workflow por permisos, tu token necesita el scope **`workflow`**.

---

## 5. Activar Pages (único paso manual)

En GitHub:

1. Entra al repo.
2. **Settings → Pages**.
3. En **Build and deployment → Source**, elige **GitHub Actions**.
4. No configures carpeta ni rama. El workflow ya sabe qué hacer.

Esto habilita Pages y permite que `actions/configure-pages` funcione.

---

## 6. Verificar el despliegue

1. Ve a la pestaña **Actions**.
2. Abre el workflow **Deploy to GitHub Pages**.
3. Espera a que terminen `build` y `deploy` en verde.
4. Abre:

```text
https://inefarium.github.io/erizos/
https://inefarium.github.io/erizos/libro.html
https://inefarium.github.io/erizos/mi_prenovia.html
```

**Prueba mínima en producción:**

- [ ] Se ven los dos títulos.
- [ ] El corazón 3D aparece y gira.
- [ ] Al tocar el corazón salen chispas y un mensaje.
- [ ] El menú de temas abre y activa “Lluvia Codificada”.
- [ ] “Mi Prenovia” oculta el corazón y muestra la tarjeta.
- [ ] El libro carga fotos.
- [ ] Funciona en móvil (sin zoom raro ni scroll horizontal).

---

## 7. Despliegues siguientes

Con Pages ya configurado, cada push a `main` vuelve a compilar y publicar automáticamente. No hay que tocar nada más.

---

## 8. Si algo falla

| Síntoma | Causa | Solución |
|---|---|---|
| Página en blanco en Pages | Source sigue en “Deploy from a branch” | Settings → Pages → Source: **GitHub Actions** |
| 404 en CSS/JS | Se publicó la raíz en vez de `dist/` | Usar el workflow; no publicar la rama |
| El workflow no aparece | `.github/workflows/deploy.yml` no se subió | `git add -A`, commit y push |
| Falla `npm ci` | Falta `package-lock.json` o no se subió | Verificar que esté trackeado |
| Falla `configure-pages` | Pages no está habilitado | Settings → Pages → Source: GitHub Actions |
| “refusing to allow a Personal Access Token to create or update workflow” | Token sin scope `workflow` | Regenerar token con scope `workflow` |
| `permission denied` al hacer push | Credenciales incorrectas | Autenticarse con la cuenta dueña del repo |
| Cambios no se ven | Caché del navegador o deploy viejo | Revisar Actions y recargar con `Ctrl + F5` |

---

## 9. Rollback

Si el despliegue sale mal:

```powershell
git log --oneline -3
git revert <SHA_DEL_COMMIT>
git push origin main
```

El workflow volverá a publicar el estado anterior.

---

## 10. Comandos útiles

```powershell
# Desarrollo local
npm run dev          # http://localhost:5173/

# Build de producción
npm run build
npm run preview      # http://localhost:4173/

# Parar un servidor que quedó vivo
Get-NetTCPConnection -LocalPort 5173 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## 11. Definition of Done

- [ ] Un commit subido a `main`.
- [ ] Pages con Source = **GitHub Actions**.
- [ ] Workflow en verde.
- [ ] `https://inefarium.github.io/erizos/` carga títulos y corazón.
- [ ] Libro y Mi Prenovia cargan sus recursos.
- [ ] Sin errores en la consola del navegador.
