# E2E NOCTURNO Validación

Test E2E nocturno completo que valida que todos los bugs reportados el 2026-06-20 estén resueltos.

## Bugs Validados

1. **Voseo argentino**: NO debe aparecer voseo (tenés/empezá/recogé/descubrí/preparale)
2. **Fotos de plantas**: Las fotos deben cargar correctamente (no rotas)
3. **Invalid Date**: NO debe aparecer "Invalid Date" en la UI
4. **recordFarmEvent errors**: NO debe aparecer "recordFarmEvent ... not found"
5. **Avance de etapas**: Las etapas del ciclo deben poder avanzar
6. **Visión total del operador**: Con "Visión total" activada deben verse todos los módulos
7. **Solapamiento de mano**: La mano (cursor) NO debe solaparse con inputs

## Flujo del Test

1. Login con usuario demo (creds desde `~/.config/chagra-demo-creds.env`)
2. Recorrer home y validar:
   - Ausencia de voseo
   - Visión total del operador
   - Imágenes rotas
3. Navegar a "Mis módulos"
4. Ir a Inventario y agregar planta (lechuga)
5. Abrir detalle de planta y verificar foto
6. Abrir Ciclo y validar "Invalid Date"
7. Anotar observación y validar solapamiento de mano
8. Abrir Asociaciones
9. Abrir Biodiversidad
10. Jugar Defensores nivel 1
11. Jugar Milpa
12. Jugar Mundo Subsuelo
13. Abrir Agente

## Screenshots

Cada paso captura un screenshot en `screenshots/nocturno-validacion/` con índice secuencial:

```
screenshots/nocturno-validacion/
├── 00-nocturno-01-post-login.png
├── 01-nocturno-02-home-check-voseo.png
├── 02-nocturno-03-vision-total.png
├── ...
├── validation-report.json
```

## Ejecución Local

### En staging HEADED (modo interactivo):

```bash
./scripts/run-nocturno-validacion-stg.sh
```

### En local con dev server:

```bash
# Terminal 1: iniciar dev server
npm run dev

# Terminal 2: ejecutar test
export CHAGRA_USER=demo
export CHAGRA_PASS=tOGF1ezbui1vDvxLxiEo
export RUN_NOCTURNO_VALIDACION=1
npx playwright test tests/e2e-nocturno-validacion.spec.js --headed --project=chromium
```

### Sin interfaz gráfica (headless):

```bash
export CHAGRA_USER=demo
export CHAGRA_PASS=tOGF1ezbui1vDvxLxiEo
export RUN_NOCTURNO_VALIDACION=1
npx playwright test tests/e2e-nocturno-validacion.spec.js
```

## Ejecución en CI

El test se ejecuta automáticamente en el workflow `nightly-click-crawl.yml`:

- **Schedule**: Diariamente a las 02:30 Colombia (07:30 UTC)
- **On-demand**: Via `workflow_dispatch` en GitHub Actions

## Reporte de Resultados

El test genera un reporte JSON con el estado de cada bug:

```json
{
  "voseo": { "status": "PASS", "details": ["No voseo detectado en home"] },
  "brokenImages": { "status": "PASS", "details": ["Todas las imágenes cargan en home"] },
  "invalidDate": { "status": "PASS", "details": ["No 'Invalid Date' en ciclo"] },
  "visionTotal": { "status": "PASS", "details": ["Módulos visibles: Inventario, Biodiversidad, Asociaciones, Tareas"] },
  "stageAdvance": { "status": "PASS", "details": [] },
  "handOverlap": { "status": "PASS", "details": ["La mano NO se solapa con el input"] }
}
```

## Integración con Workflow

El test está integrado en `.github/workflows/nightly-click-crawl.yml`:

```yaml
- name: Run E2E nocturno validación
  run: npm run test:e2e -- tests/e2e-nocturno-validacion.spec.js
  env:
    RUN_NOCTURNO_VALIDACION: '1'
    CHAGRA_USER: ${{ secrets.CHAGRA_USER }}
    CHAGRA_PASS: ${{ secrets.CHAGRA_PASS }}
```

## Resilencia

El test es resiliente ante fallos:

- Usa `expect.soft()` para reportar bugs sin detener la ejecución
- Captura screenshots incluso en caso de error
- Reporta PASS/FAIL por bug individual
- No se rompe si faltan secciones (try/catch con capturas)

## Debugging

Si el test falla, revisa:

1. **Screenshots**: `screenshots/nocturno-validacion/` — muestran el estado visual en cada paso
2. **Reporte JSON**: `screenshots/nocturno-validacion/validation-report.json` — resume el estado de cada bug
3. **Trace**: `playwright-report/` — trace completo de la ejecución (si `trace: 'on-first-retry'` está habilitado)
4. **Playwright Report**: `npx playwright show-report playwright-report` — reporte HTML interactivo
