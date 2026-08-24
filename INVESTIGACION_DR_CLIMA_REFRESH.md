# Investigación dr-clima-refresh.sh - Regiones MTA

## Estado de la investigación

### Hallazgos
- `dr-clima-refresh.sh` NO existe actualmente en el repositorio
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

### Pendientes para Opus
1. Horarios de publicación IDEAM/NOAA (no documentados)
2. Arquitectura del script (ubicación, formato de salida)
3. Estrategia multi-región (paralelo vs secuencial)
4. Integración con commit #3020

ESCALATE_TO_OPUS: Requiere decisiones arquitectónicas e investigación profunda
