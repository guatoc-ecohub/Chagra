# 🌙 E2E NOCTURNO Validación - Guía de Ejecución

## PR Creado: #1711

**URL**: https://github.com/guatoc-ecohub/Chagra/pull/1711

## 📋 Descripción

Suite E2E nocturna completa que valida que **todos los bugs reportados el 2026-06-20** estén resueltos.

## 🐛 Bugs Validados

1. **Voseo argentino**: NO debe aparecer (tenés/empezá/recogé/descubrí/preparale)
2. **Fotos de plantas**: Deben cargar correctamente (no rotas)  
3. **Invalid Date**: NO debe aparecer en la UI
4. **recordFarmEvent errors**: NO debe aparecer "recordFarmEvent ... not found"
5. **Avance de etapas**: Las etapas del ciclo deben poder avanzar
6. **Visión total del operador**: Con "Visión total" activada deben verse todos los módulos
7. **Solapamiento de mano**: La mano (cursor) NO debe solaparse con inputs

## 🚀 Cómo Ejecutarlo HEADED en STG

### Opción 1: Script dedicado (recomendado)

```bash
./scripts/run-nocturno-validacion-stg.sh
```

### Opción 2: Manualmente

```bash
# Cargar credenciales
export CHAGRA_USER=demo
export CHAGRA_PASS=tOGF1ezbui1vDvxLxiEo
export RUN_NOCTURNO_VALIDACION=1

# Ejecutar en modo HEADED (ventana interactiva)
npx playwright test tests/e2e-nocturno-validacion.spec.js --headed --project=chromium
```

### Opción 3: Sin interfaz gráfica (headless)

```bash
export CHAGRA_USER=demo
export CHAGRA_PASS=tOGF1ezbui1vDvxLxiEo
export RUN_NOCTURNO_VALIDACION=1
npx playwright test tests/e2e-nocturno-validacion.spec.js
```

## 🌐 Entornos de Ejecución

### Local (con dev server)

```bash
# Terminal 1: iniciar dev server
npm run dev

# Terminal 2: ejecutar test
export CHAGRA_USER=demo
export CHAGRA_PASS=tOGF1ezbui1vDvxLxiEo
export RUN_NOCTURNO_VALIDACION=1
npx playwright test tests/e2e-nocturno-validacion.spec.js --headed
```

### Staging (HEADED)

```bash
# Asegúrate de que la URL de staging sea correcta
export CHAGRA_STG_URL=https://staging.chagra.app
export CHAGRA_USER=demo
export CHAGRA_PASS=tOGF1ezbui1vDvxLxiEo

# Ejecutar script
./scripts/run-nocturno-validacion-stg.sh
```

### Production (HEADLESS - con cuidado!)

```bash
export PLAYWRIGHT_BASE_URL=https://chagra.app
export CHAGRA_USER=demo
export CHAGRA_PASS=tOGF1ezbui1vDvxLxiEo
export RUN_NOCTURNO_VALIDACION=1
npx playwright test tests/e2e-nocturno-validacion.spec.js
```

⚠️ **ADVERTENCIA**: Ejecutar en producción puede afectar datos reales. Usa con precaución.

## 📊 Resultados y Reportes

### Archivos Generados

- **Screenshots**: `screenshots/nocturno-validacion/` (15+ capturas)
- **Reporte JSON**: `screenshots/nocturno-validacion/validation-report.json`
- **Reporte HTML**: `playwright-report/index.html`

### Ver Reporte HTML

```bash
npx playwright show-report playwright-report
```

### Ejemplo de Reporte JSON

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

## 🤖 CI/CD

El test se ejecuta automáticamente en GitHub Actions:

- **Schedule**: Diariamente a las 02:30 Colombia (07:30 UTC)
- **Workflow**: `.github/workflows/nightly-click-crawl.yml`
- **On-demand**: Via botón "Run workflow" en GitHub Actions

### Ver resultados en CI

1. Ve a: https://github.com/guatoc-ecohub/Chagra/actions
2. Busca el workflow "Nightly Click Crawl"
3. Descarga los artefactos:
   - `nightly-click-crawl-report` (contiene screenshots y reportes)

## 🔧 Troubleshooting

### El test falla en "Login"

- Verifica que las credenciales en `~/.config/chagra-demo-creds.env` sean correctas
- Asegúrate de que el entorno (local/stg/prod) esté accesible

### Screenshots no se generan

- Verifica permisos de escritura en `screenshots/nocturno-validacion/`
- Crea el directorio manualmente: `mkdir -p screenshots/nocturno-validacion`

### "Chromedriver not found"

```bash
npx playwright install chromium
```

### Timeout en navegación

- Aumenta el timeout: `--timeout=120000` (2 minutos)
- Verifica la conexión a internet

## 📋 Checklist de Validación

Cuando ejecutes el test, verifica que:

- [ ] Todas las 15+ capturas de pantalla se generan
- [ ] El reporte JSON muestra `status: "PASS"` para todos los bugs
- [ ] No hay errores de "Invalid Date" en la consola
- [ ] Las fotos de plantas cargan correctamente
- [ ] No hay voseo argentino visible
- [ ] La "Visión total" muestra todos los módulos
- [ ] El test completa sin crashes

## 📞 Soporte

Si encuentras problemas:

1. Revisa el reporte HTML: `npx playwright show-report playwright-report`
2. Verifica los logs en GitHub Actions
3. Abre un issue en GitHub con:
   - Capturas de pantalla del error
   - Reporte JSON generado
   - Logs de la consola

## 📝 Notas Importantes

- El test es **resiliente**: si una sección falla, continúa y reporta al final
- Usa `expect.soft()` para validaciones no críticas
- Los screenshots son secuenciales (00, 01, 02, ...) para orden cronológico
- El test NO modifica datos críticos (solo crea observaciones de prueba)

---

**Creado**: 2026-06-20  
**PR**: #1711  
**Branch**: `codex/e2e-nocturno-validacion`
