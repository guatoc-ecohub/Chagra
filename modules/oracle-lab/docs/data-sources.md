# Data sources — Oracle Guatoc

> Audit de TODAS las fuentes de datos potenciales que el Oracle puede consumir. Source-of-truth para diseñar el backend de adaptadores.

## Fuentes confirmadas (alpha node)

### 1. FarmOS

- **Endpoint**: `https://farmos.guatoc.co/api` (probable, verificar config nginx)
- **Tipo**: REST OAuth2 PKCE
- **Datos**:
  - `assets[]` — plantas, equipo, edificios
  - `logs[]` — siembras, cosechas, observaciones, aplicaciones
  - `terms[]` — taxonomía: ubicaciones, lotes, especies referenciadas
  - `quantities[]` — cuantías de cosecha (kg, unidades, etc.)
- **Frecuencia recomendada polling**: 60s (datos cambian con uso humano)
- **Cache local**: SQLite `farmos_cache.db` con TTL 5min
- **Auth**: token OAuth2 vía SOPS

### 2. Home Assistant (IoT)

- **Endpoint**: `https://ha.guatoc.co/api` (Tailscale)
- **Tipo**: REST + WebSocket
- **Datos**:
  - `states/sensor.*` — temperatura, humedad, CO2, luz, suelo
  - `states/binary_sensor.*` — apertura puertas, movimiento
  - `states/switch.*` — bombas riego, iluminación
  - `events/state_changed` (WebSocket) — push real-time
- **Token**: Long-Lived Access Token vía SOPS
- **Frecuencia**: WebSocket = real-time

### 3. AirGradient (Guardianes de Bakatá)

- **Endpoint**: `https://api.airgradient.com/public/api/v1/locations/{id}/measures` (¿probable?)
- **Tipo**: REST
- **Datos**: PM2.5, PM10, CO2, temp, humedad, calidad aire
- **Locations**: Colegio La Victoria + (futuras escuelas)
- **Auth**: API key Antonio Alemania (vía SOPS si compartida)
- **Frecuencia**: 5 min

### 4. Catálogo Chagra (SQLite WASM)

- **Path**: `/var/lib/chagra-catalog/catalog.sqlite` (alpha) o vía API PWA
- **Datos**: 84 species + 16 biopreparados + 52 sources
- **Frecuencia**: Cambia solo en deploys (npm run build:catalog) — refresh post-deploy hook

### 5. Ai-stats-panel

- **Endpoint**: `http://localhost:9292/api/snapshot` (mismo alpha)
- **Datos**: Z.ai balance + Ollama logs + Whisper metrics + Claude Max manual + Gemini manual
- **Frecuencia**: 30 min (lo que ya tiene su timer interno)

### 6. OpenFang Picoclaw (Telegram bot)

- **Endpoint**: socket local `/run/openfang/picoclaw.sock` o REST interno
- **Datos**: últimas N conversaciones, queue intake voice, métricas heartbeat
- **Frecuencia**: WebSocket / pub-sub interno

### 7. Whisper / speaches

- **Endpoint**: `http://localhost:10302/v1` + `/metrics` Prometheus
- **Datos**: count transcripciones, segundos audio procesados, modelos cargados
- **Frecuencia**: 5 min

### 8. Ollama

- **Endpoint**: `http://localhost:11434/api/{tags,ps,generate}`
- **Datos**: modelos, en uso, GPU usage proxy
- **Frecuencia**: 1 min

### 9. Cloudflare tunnels

- **Endpoint**: cloudflared metrics local + cloudflare API zones
- **Datos**: uptime, requests/s, latencia
- **Frecuencia**: 5 min

### 10. Git repositories

- **Repos**: Chagra, chagra-pro, guatoc-nixos, Chagra-strategy
- **Datos**: commits últimos 7d, branches activas, PRs abiertas/cerradas
- **Auth**: GitHub PAT vía SOPS (repos privados)
- **Frecuencia**: 15 min

## Fuentes externas (datos abiertos)

### 11. Open-Meteo (clima Choachí)

- **Endpoint**: `https://api.open-meteo.com/v1/forecast?latitude=4.527&longitude=-73.923&...`
- **Tipo**: REST sin auth
- **Datos**: temp, precip, viento, radiación 7d forecast
- **Frecuencia**: 1 hora

### 12. IDEAM Colombia (estaciones reales cercanas)

- **Endpoint**: `https://www.datos.gov.co/api/...` (datos abiertos Colombia)
- **Datos**: estaciones meteorológicas de la región Choachí/Sabana
- **Frecuencia**: 24h (publicación oficial diaria)

### 13. Lunar calendar

- **Cálculo**: librería local (sin API), fase y siguiente ventana siembra
- **Datos**: fase actual + próxima nueva/llena, ventanas óptimas siembra/cosecha por tradición agrícola lunar
- **Frecuencia**: cálculo bajo demanda

### 14. Hash chain audit (ADR-019)

- **Endpoint**: `Chagra-PWA` envía firma de logs por sync
- **Datos**: último hash chain head verificable, eventos firmados últimas 24h
- **Frecuencia**: real-time vía sync hook

## Fuentes futuras (DR pendientes)

### 15. Acción Antipoética metrics (DR-037 pendiente)

- KPIs torneo: bultos Ojo de Poeta erradicados, hectáreas restauradas, especies nativas sembradas
- Plataforma: posiblemente custom DB + integración FarmOS

### 16. Live Sessions tracking (DR-038 pendiente)

- Tickets vendidos, "1 entrada = 1 árbol" tracking, asistencia Pax
- Plataforma: probablemente integración booking SaaS + FarmOS

### 17. Bayes/MCMC plagas predicción (post ADR-027.iv)

- Output del motor fenológico HMM cuando se implemente
- Frecuencia: 1h recálculo

## Estructura de adaptador (template)

Cada adaptador en `backend/collectors/<name>.py` implementa:

```python
async def fetch() -> dict:
    """Retorna snapshot dict del adaptador.
    
    Retorno SIEMPRE es dict con campos:
      - status: "ok" | "error" | "no_data" | "stale"
      - data: payload específico del adaptador
      - fetched_at: ISO 8601 timestamp
      - source: nombre del adaptador
      - error?: mensaje si status=error
    """
    ...
```

El orquestador `backend/api/snapshot.py` corre fan-out asyncio sobre todos los adaptadores con timeouts individuales y degrada gracefully si alguno falla.

## Política de retención

- **Hot tier** (RAM cache): último snapshot por adaptador, TTL específico
- **Warm tier** (SQLite local alpha): últimas 24h con resolución 5min
- **Cold tier** (Parquet quincenal): últimos 12 meses para gráficos históricos largos

## Privacidad / compliance

- **Ley 1581**: HMAC-SHA256 sobre `operator_id` antes de cualquier export PDF (ADR-019)
- **Coordenadas finca**: precisión truncada en exportables públicos (5 decimales → 2 decimales = ~1km)
- **PII visitantes**: jamás en cache del oracle, solo agregados anónimos
