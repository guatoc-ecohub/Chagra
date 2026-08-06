# Gate E2E de Juegos — `tests/juegos/`

Este directorio contiene el **gate E2E (end-to-end)** que todo juego de Chagra debe pasar antes de ser aceptado en el código base. El objetivo: **ningún juego entra sin ser jugable**.

## ¿Qué valida el gate?

El test `juego-jugable.spec.js` verifica que un juego:

1. **Carga sin errores críticos** — No hay crashes de JS, errores de consola graves, ni requests fallidos.
2. **Tiene un canvas renderizado** — El juego dibuja en un `<canvas>` con dimensiones > 0 (no pantalla estática).
3. **Responde a input** — Al simular teclas (flechas y espacio), el canvas cambia de contenido (el juego está vivo).
4. **Tiene metadata básica** — La página tiene título y el canvas es visible e interactuable.

## Uso básico

```bash
# Testear el juego default (angelita-bros)
npm run test:juego

# Testear un juego específico
JUEGO_SLUG=mi-juego npm run test:juego

# Con un servidor de juegos en otro puerto
JUEGO_BASE_URL=http://localhost:9000 npm run test:juego

# Ajustar duración del input simulado (default: 3 segundos)
JUEGO_INPUT_SECONDS=5 npm run test:juego
```

## ¿Cómo agregar un juego nuevo al gate?

### 1. Asegúrate de que tu juego tenga un servidor local

El gate asume que tu juego corre en `http://127.0.0.1:8800/juegos/$SLUG/`. Si tu juego usa una estructura diferente, ajusta `JUEGO_BASE_URL` o la lógica del test.

Ejemplo:
```bash
# Si tu juego está en http://localhost:3000/game/xyz
JUEGO_BASE_URL=http://localhost:3000 JUEGO_SLUG=game/xyz npm run test:juego
```

### 2. Corre el test con tu slug

```bash
JUEGO_SLUG=mi-nuevo-juego npm run test:juego
```

### 3. Si el test pasa: ¡Felicidades! Tu juego es jugable.

El test habrá verificado:
- ✅ Carga sin errores
- ✅ Tiene canvas vivo
- ✅ Responde a input
- ✅ Screenshots guardados en `test-results/`

### 4. Si el test falla: Revisa los errores

El test reporta:
- **Errores críticos de carga** — Revisa la consola del servidor del juego
- **Canvas no encontrado** — Verifica que tu juego tenga un `<canvas>` visible
- **Canvas no cambia** — Tu juego no está respondiendo a input (¿está en pausa? ¿falta event listener?)
- **Requests fallidos** — Revisa que los assets del juego carguen correctamente

## Arquitectura del gate

### Archivos

- **`juego-jugable.spec.js`** — El test E2E reutilizable que valida cualquier juego.
- **`playwright.juegos.config.js`** — Config de Playwright específica para juegos (NO toca el CI principal).
- **`README.md`** — Esta documentación.

### Config separada del CI principal

El gate de juegos usa su propio `playwright.juegos.config.js` para NO romper el CI existente (`test:e2e`). Esto permite:

- ✅ Juegos con servidor diferente (puerto 8800, no 5173/5174)
- ✅ Timeouts y configuración específica para canvas
- ✅ Un solo worker para evitar colisiones de puerto
- ✅ NO levantar el dev server de Vite (el juego corre en su propio server)

### Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `JUEGO_SLUG` | `angelita-bros` | Slug/ID del juego a testear |
| `JUEGO_BASE_URL` | `http://127.0.0.1:8800` | URL base del servidor de juegos |
| `JUEGO_INPUT_SECONDS` | `3` | Segundos de input simulado (flechas + espacio) |

## Debugging

### Ver el test en modo UI

```bash
npx playwright test --config=playwright.juegos.config.js --ui
```

### Ver screenshots después del test

Los screenshots se guardan en `test-results/juego-$SLUG-*.png`:
- `juego-$SLUG-inicial.png` — Canvas antes del input
- `juego-$SLUG-final.png` — Canvas después del input

### Inspeccionar errores en el reporte HTML

```bash
npx playwright show-report tests/juegos/playwright-report
```

## Ejemplos de juegos en el catálogo

Según `src/components/juego/hubJuegosData.js`, los juegos actuales son:

| ID (slug) | Nombre | Ruta |
|-----------|--------|------|
| `mi-finca-viva` | Mi Finca Viva | `#/juego` |
| `defensores` | Defensores de la Finca | `#/defensores` |
| `milpa` | La Milpa | `#/milpa` |
| `doom-finca` | Doom de la Finca | `#/doom_finca` |
| `subsuelo` | Mundo Subsuelo | `#/subsuelo` |
| `finca-odyssey` | Mi finca en 3D | `#/finca_odyssey` |
| `rescate-ladera` | Rescate en la ladera | `#/metal_slug_campo` |
| `mono-vs-poli` | ¿Mono o poli? | `#/mono_vs_poli` |
| `monte-vuelve` | El monte vuelve | `#/monte_vuelve` |

Para testear uno de estos juegos con el gate, ajusta la URL base:

```bash
# Ejemplo: testear Defensores de la Finca (que corre en el servidor principal)
JUEGO_BASE_URL=http://localhost:5173 JUEGO_SLUG=defensores npm run test:juego
```

## Notas técnicas

- **No congelamos animaciones** (`reducedMotion: 'no-preference'`) — Queremos ver el juego en movimiento.
- **Simulamos input real** — Flechas y espacio como si un jugador presionara teclas.
- **Comparamos snapshots** — Si el canvas no cambia, el juego no está vivo.
- **Un solo worker** — Evitamos colisiones de puerto si varios tests corren en paralelo.

## Preguntas frecuentes

### ¿Por qué no usar el config principal de Playwright?

Porque los juegos tienen un servidor diferente (puerto 8800) y timeouts más largos. Un config separado evita romper el CI principal si algo falla.

### ¿Mi juego necesita ser público para pasar el gate?

No. El gate solo valida que sea jugable localmente. La visibilidad pública es una decisión separada.

### ¿El gate reemplaza las pruebas manuales?

No. El gate es un **smoke test automatizado** que valida lo básico: carga, canvas vivo, responde a input. Las pruebas manuales de UX, balance, y diversión siguen siendo necesarias.

### ¿Qué pasa si mi juego no usa canvas?

El gate actual asume que todos los juegos usan `<canvas>`. Si tu juego usa otra tecnología (DOM, WebGL sin canvas, etc.), modifica el test para validar el elemento correcto.

---

**TL;DR:** Para que tu juego entre a Chagra, debe pasar este gate. Corre `npm run test:juego` con tu slug, y si pasa, está listo para merge.
