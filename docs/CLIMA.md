# Clima en Chagra

## Fuentes
- **open-meteo.com**: API gratuita, forecast 7-16 días, datos históricos ERA5
- **IDEAM**: boletines de predicción climática, alertas ENSO, mapas de lluvia

## Régimen bimodal andino
La región andina colombiana tiene DOS temporadas de lluvia (mar-may y sep-nov) y DOS secas (jun-ago y dic-feb). Esto es CLAVE para recomendaciones de siembra.

## Modulación ENSO
- **El Niño**: déficit de lluvia, más sol, menos nubosidad. Riesgo: sequía, incendios.
- **La Niña**: exceso de lluvia, más nubosidad. Riesgo: inundaciones, hongos, deslizamientos.

## Verificación de fuentes

El refresco del cron ejecuta `scripts/clima/verificar-urls.mjs` antes de llamar
a `~/.local/bin/dr-clima-refresh.sh`. El script extrae todas las URLs de
`src/data/climaBoletines.js`, prueba `HEAD` y usa `GET` como respaldo cuando el
servidor no acepta `HEAD`. Solo `200`, `301` y `302` cuentan como vivas; el
reporte JSON se imprime en stdout y los fallos críticos hacen terminar el cron
con código distinto de cero.

Las URLs dentro de `FUENTES_VIVAS` son críticas. Una URL muerta se registra en
el journal del servicio y detiene el refresco. No se sustituyen URLs
automáticamente.

El entry point se ejecuta desde la raíz del repositorio para que pueda resolver
el archivo de fuentes. El comando que debe usar el host del cron, sin editar el
wrapper externo, es:

```bash
DR_CLIMA_REFRESH_SCRIPT="$HOME/.local/bin/dr-clima-refresh.sh" node scripts/clima/dr-clima-refresh-calendar.mjs
```

Prueba local con URLs reales:

```bash
node scripts/clima/verificar-urls.mjs
```

## Caso Choachí
Choachí (Cundinamarca, 1900msnm) tiene régimen particular: solo 2 días de sol pleno por semana en promedio (vs 4 esperados). La nubosidad orográfica del páramo de Chingaza domina el microclima.
