# Clima en Chagra

## Fuentes
- **open-meteo.com**: API gratuita, forecast 7-16 días, datos históricos ERA5
- **IDEAM**: boletines de predicción climática, alertas ENSO, mapas de lluvia

## Régimen bimodal andino
La región andina colombiana tiene DOS temporadas de lluvia (mar-may y sep-nov) y DOS secas (jun-ago y dic-feb). Esto es CLAVE para recomendaciones de siembra.

## Modulación ENSO
- **El Niño**: déficit de lluvia, más sol, menos nubosidad. Riesgo: sequía, incendios.
- **La Niña**: exceso de lluvia, más nubosidad. Riesgo: inundaciones, hongos, deslizamientos.

## Refresco de boletines

El refresco operativo de `dr-clima-refresh.sh` debe ejecutarse a las 16:30 en
hora de Bogotá, de lunes a viernes. Esa hora deja margen para el boletín diario
SIPSA, que DANE suele publicar después del mediodía, y también cubre los
boletines de IDEAM y NOAA CPC publicados antes.

Los sábados, domingos y festivos colombianos no se debe tratar el último
boletín hábil como un dato del día. El wrapper
[`scripts/clima/dr-clima-refresh-calendar.mjs`](../scripts/clima/dr-clima-refresh-calendar.mjs)
omite esos días. El timer usa `Persistent=true` para recuperar una ejecución
perdida por desconexión, y sus plantillas instalables están en
[`ops/systemd-user`](../ops/systemd-user).

La investigación y el comando exacto para aplicar las unidades de usuario
están en [`INVESTIGACION_DR_CLIMA_REFRESH.md`](../INVESTIGACION_DR_CLIMA_REFRESH.md).

## Caso Choachí
Choachí (Cundinamarca, 1900msnm) tiene régimen particular: solo 2 días de sol pleno por semana en promedio (vs 4 esperados). La nubosidad orográfica del páramo de Chingaza domina el microclima.
