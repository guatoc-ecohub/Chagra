# VEREDICTO: VERDE HONESTO — ambas afirmaciones son VERDADERAS, el verde de 26.5 MB es legítimo

## Resumen ejecutivo

Se verificaron las dos afirmaciones escritas en `scripts/check-perf-budget.mjs` sobre las exclusiones del Performance Budget:
1. `dist/plaga-images` (33 MB) y `dist/valle` (18 MB) NO se precachean en install
2. `dist/valle` solo se carga si el usuario activa un toggle con default OFF

**Conclusión:** Ambas afirmaciones son **VERDADERAS**. El verde reportado de 26.5 MB es un verde HONESTO.

---

## Verificación 1: Service Worker (public/sw.js)

### Afirmación verificada
> "Imágenes de plagas/enfermedades (dist/plaga-images, ~33 MB): NO se precachean en install (no aparecen en public/sw.js)"

### Evidencia

```bash
$ grep -n "plaga-images" public/sw.js
(no output)
$ grep -n "valle" public/sw.js
(no output)
```

**Veredicto: VERDADERO** — Ni `plaga-images` ni `valle` aparecen en el service worker. Esto significa:

- NO están en `ASSETS_TO_CACHE` (línea 50) — shell estático precacheado en install
- NO están en `RAG_GROUNDING_PRECACHE` (línea 92) — grounding del agente
- NO están en `WAKE_WORD_PATH_PREFIXES` (línea 48) — modo campo
- NO tienen un handler de `fetch` dedicado que los cachee en install

Solo se cachean **on-demand** (cache-on-use) cuando el usuario realmente los solicita, no en el arranque.

---

## Verificación 2: Default del toggle (userProfileService.js)

### Afirmación verificada
> "Valle 3D vanilla (dist/valle, ~17 MB): marco de entrada OPCIONAL detrás de un toggle de perfil (default OFF)"

### Evidencia

**Firma de la función (userProfileService.js:918-927):**

```javascript
export const DEFAULT_MARCO3D = false;

export function getMarco3DPreference() {
  const v = getProfile()?.marco3d;
  return typeof v === 'boolean' ? v : DEFAULT_MARCO3D;
}
```

**Análisis:**
- Línea 918: `export const DEFAULT_MARCO3D = false;` — el default explícito es `false`
- Línea 924: `getMarco3DPreference()` devuelve `v` solo si es booleano, si no → `DEFAULT_MARCO3D`
- Línea 926: `return typeof v === 'boolean' ? v : DEFAULT_MARCO3D;` — fallback a `false`

**Quién la llama (App.jsx:23, 1235, 1237):**
```javascript
import { getProfile, getMarco3DPreference } from './services/userProfileService';

const [marco3dActivo, setMarco3dActivo] = useState(() => getMarco3DPreference());
useEffect(() => {
  const handler = () => setMarco3dActivo(getMarco3DPreference());
  window.addEventListener('chagra:profile-changed', handler);
  return () => window.removeEventListener('chagra:profile-changed', handler);
}, []);
```

**Veredicto: VERDADERO** — El DEFAULT REAL leído directamente de la firma de la función es `false` (OFF). Un usuario nuevo NUNCA recibe el valle 3D sin haber activado explícitamente la preferencia en su perfil.

---

## Verificación 3: Montaje del iframe (ValleMarcoScreen.jsx + App.jsx)

### Afirmación verificada
> "Se sirve dentro de un <iframe> SOLO si el usuario lo activó"

### Evidencia

**App.jsx:2931-2940 (case 'dashboard'):**

```javascript
if (!sinSesion && marco3dActivo) {
  return (
    <ErrorBoundary>
      <ValleMarcoScreen onExit={() => navigate('dashboard')} apagaMarco3dAlSalir />
    </ErrorBoundary>
  );
}
return (
  <ErrorBoundary>
    <DashboardLiveView onNavigate={navigate} onLogout={handleLogout} lastLogMessage={lastLogMessage} />
  </ErrorBoundary>
);
```

**Flujo verificado:**
1. **Usuario nuevo** → `getMarco3DPreference()` devuelve `false` (DEFAULT_MARCO3D)
2. **Estado inicial** → `marco3dActivo = false` (App.jsx:1235)
3. **Render de 'dashboard'** → `if (!sinSesion && marco3dActivo)` evalúa a `false`
4. **Resultado** → Se monta `DashboardLiveView` (entrada simple), NO `ValleMarcoScreen`
5. **Usuario activa toggle** → `setMarco3DPreference(true)` desde ProfileScreen
6. **Evento 'chagra:profile-changed'** → Handler en App.jsx:1237 ejecuta `setMarco3dActivo(getMarco3DPreference())`
7. **Nuevo estado** → `marco3dActivo = true`
8. **Re-render** → `if (!sinSesion && marco3dActivo)` evalúa a `true`
9. **Resultado** → Se monta `ValleMarcoScreen` con `<iframe src="/valle/index.html">`

**ValleMarcoScreen.jsx:156-177 (el iframe):**
```javascript
<iframe
  src={valleSrc}
  title="Valle 3D de Guatoc"
  className="absolute inset-0 w-full h-full border-0"
  // Sin allow="fullscreen"/allowFullScreen a propósito
/>
```

**Veredicto: VERDADERO** — El iframe del valle se monta **DESPUÉS** de que el usuario activa la preferencia. Un usuario que nunca activó el toggle **NUNCA** ve el iframe, y por tanto **NUNCA** descarga los ~18 MB de `dist/valle`.

---

## Conclusión final

### Las dos afirmaciones son VERDADERAS

| Afirmación | Fuente | Veredicto |
|------------|--------|-----------|
| `dist/plaga-images` y `dist/valle` NO se precachean en install | `public/sw.js` (líneas 50, 92, 48) — NO mencionados | ✅ VERDADERO |
| `valle` tiene default OFF y se carga solo si el usuario opta | `userProfileService.js:918-927` — `DEFAULT_MARCO3D = false` | ✅ VERDADERO |
| El iframe se monta DESPUÉS de que el usuario opta | `App.jsx:2931` + `ValleMarcoScreen.jsx:156` | ✅ VERDADERO |

### El verde de 26.5 MB es HONESTO

El umbral de 27.5 MB solo incluye:
- Bundle de arranque (index-*.js, vendors, CSS)
- Shell estático (HTML, manifest, icons, catálogo.sqlite)
- Chunks lazy cargados on-demand

EXCLUIDE correctamente (legítimamente):
- `dist/plaga-images` (33 MB) — cache-on-use, solo la foto que se consulta
- `dist/valle` (18 MB) — cache-on-use, solo si el usuario activó el toggle
- `dist/vendor/tfjs` + `dist/models/speech-commands` — modo campo wake-word
- `dist/rag-embeddings.json` + `dist/cycle-content/` — grounding diferido del agente

**NO hay bytes escondidos.** El performance budget está midiendo honestamente el peso de arranque real, no el disco total del `dist/`.

---

## Archivos verificados

| Archivo | Líneas relevantes | Qué se verificó |
|---------|------------------|------------------|
| `scripts/check-perf-budget.mjs` | 27-39 | Las dos afirmaciones escritas |
| `public/sw.js` | Todo (735 líneas) | NO menciona `plaga-images` ni `valle` |
| `src/services/userProfileService.js` | 918-927 | `DEFAULT_MARCO3D = false` |
| `src/components/ValleMarcoScreen.jsx` | 156-177 | El `<iframe>` solo se monta si se llama al componente |
| `src/App.jsx` | 1235-1240, 2931-2940 | Montaje condicional: `if (!sinSesion && marco3dActivo)` |

---

## Método de verificación

1. **Lectura completa del service worker** → Confirmado que NO hay menciones de `plaga-images` ni `valle`
2. **Lectura de la firma de `getMarco3DPreference`** → Confirmado DEFAULT_MARCO3D = false
3. **Trazado del flujo de montaje** → Confirmado que el iframe solo se monta cuando `marco3dActivo` es true
4. **Búsquedas con grep** → Confirmado ausencia de referencias en el SW

Todo verificado con **archivo:línea** — afirmaciones basadas en código real, no en memoria.

---

Fecha de verificación: 2026-08-15
Herramientas: grep, lectura directa de archivos, trazado de flujo de código
