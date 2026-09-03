# Investigación dr-clima-refresh.sh - Regiones MTA

## Estado de la investigación

Actualizado el 24 de agosto de 2026. El timer operativo vive fuera de este
repositorio, en `~/.config/systemd/user/`, y no se modifica automáticamente
desde aquí.

### Hallazgos
- `dr-clima-refresh.sh` vive en `~/.local/bin/`; no existe actualmente en el
  repositorio.
- El timer operativo era `Tue,Sat *-*-* 05:40:00`, demasiado temprano para
  SIPSA y con una ejecución los sábados, cuando DANE no publica el boletín
  diario. Ya tenía `Persistent=true`, pero systemd no conoce por sí solo los
  festivos colombianos.
- SIPSA publica el boletín diario normalmente después del mediodía y los
  informes por ciudad observados quedan entre aproximadamente 12:00 y 15:20
  COT, con excepciones. DANE marca sábados, domingos y festivos sin
  publicación ([componente diario SIPSA](https://www.dane.gov.co/index.php/estadisticas-por-tema/agropecuario/sistema-de-informacion-de-precios-sipsa/componente-precios-mayoristas)).
- IDEAM genera el boletín mensual de predicción climática a las 12:00, y el
  diagnóstico ENSO mensual de NOAA CPC se publica el segundo jueves,
  alrededor de las 09:00 ET. La ventana común segura queda después de las
  16:30 COT ([boletines IDEAM](https://ideam.gov.co/sala-de-prensa/boletines/Bolet%C3%ADn-de-predicci%C3%B3n-clim%C3%A1tica), [diagnóstico ENSO CPC](https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml)).
- El calendario `Mon..Fri` no basta: debe saltarse los festivos colombianos
  para no conservar o presentar el dato del último día hábil como si fuera
  del festivo.
- Sistema clima existente usa:
  - Sidecar con endpoint `/clima/snapshot`
  - Tools MCP: `get_clima_ideam`, `get_enso_status`, `get_alertas_clima_zona`
  - Datos de IDEAM/NOAA para ENSO y pronósticos

### Regiones MTA identificadas
- Region Andina
- Caribe Seco / Caribe Humedo  
- Pacifica
- Valles Interandinos
- Amazonia
- Orinoquia
- Nudo de los Pastos
- Altiplano Cundiboyacense

### Cambio versionado

- `ops/systemd-user/dr-clima-refresh.timer` propone `Mon..Fri` a las 16:30
  COT, `Persistent=true` y 15 minutos de aleatoriedad.
- `scripts/clima/dr-clima-refresh-calendar.mjs` implementa el calendario
  nacional colombiano sin dependencias externas. En un festivo termina con
  éxito sin ejecutar `dr-clima-refresh.sh` ni mover `-latest`; en un día hábil
  delega al script existente.
- `ops/systemd-user/dr-clima-refresh.service` conecta el timer con el wrapper.

### Aplicación en el host del timer

No se aplicó ningún cambio bajo `~/.config/systemd/user`. Desde la raíz de
este repositorio, el operador puede instalar exactamente las plantillas y
recargar el timer con:

```bash
install -Dm755 scripts/clima/dr-clima-refresh-calendar.mjs "$HOME/.local/bin/dr-clima-refresh-calendar.mjs" &&
install -Dm644 ops/systemd-user/dr-clima-refresh.service "$HOME/.config/systemd/user/dr-clima-refresh.service" &&
install -Dm644 ops/systemd-user/dr-clima-refresh.timer "$HOME/.config/systemd/user/dr-clima-refresh.timer" &&
systemctl --user daemon-reload &&
systemctl --user enable dr-clima-refresh.timer &&
systemctl --user restart dr-clima-refresh.timer
```

Comprobaciones opcionales antes de activarlo:

```bash
node scripts/clima/dr-clima-refresh-calendar.mjs --dry-run --date=2026-08-17
node scripts/clima/dr-clima-refresh-calendar.mjs --dry-run --date=2026-08-18
systemd-analyze calendar 'Mon..Fri *-*-* 16:30:00 America/Bogota'
```

La primera fecha debe omitirse: el 17 de agosto de 2026 es la observancia
del festivo de la Asunción. La segunda debe permitir la ejecución.
