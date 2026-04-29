# oracle-lab — Dashboard interno Guatoc (provisional)

> ⚠ **Naming provisional**: este módulo se llamará HYTA / BAKATÁ / MYCELIUM (TBD) cuando cierre **DR-029** (`Chagra-strategy/historico/2026-04-28-dr-naming-system.md`). Mientras tanto, vive como `oracle-lab/` para no comprometer ninguno de los 3 candidatos.

## Qué es

Plataforma interna Guatoc para visualizar el ecosistema completo en tiempo real, estilo Jarvis HUD. Va más allá del `ai-stats-panel/` (que solo muestra uso de tokens IA) — el oracle integra:

- Estado finca: FarmOS assets + logs últimas 24h
- Sensores IoT: Home Assistant + AirGradient meteo (Bakatá iniciativa, Antonio Alemania)
- Catálogo Chagra: 84 species + alertas plagas + fenología
- Ai-stats-panel (consumido como fuente)
- OpenFang Picoclaw: voz + transcripciones recientes
- Cloudflare tunnels: uptime, requests/s
- Git activity: commits últimos 7d Chagra/chagra-pro/guatoc-nixos
- Climate: Open-Meteo Choachí + IDEAM + Star Link telemetry
- Lunar calendar + ventana de siembra
- Hash chain audit ADR-019
- Acción Antipoética: métricas torneo + erradicación Ojo de Poeta

## Audiencias

| Cliente | Cómo accede | Vista |
|---------|-------------|-------|
| Operador (Miguel) vía Tailscale | `http://alpha:9090/` | Full HUD Jarvis |
| Visitantes Guatoc físicos | Pantalla en lounge | Modo cinema fullscreen |
| Bot Telegram OpenFang | `/api/render-png` | Imagen PNG snapshot |
| Google Nest Hub Guatoc | Home Assistant Lovelace cast | Vista lite simplificada |
| Live Sessions audiencia | Stream OBS overlay | Modo performance |

## Estado actual

- ✅ Estructura modules/oracle-lab/ con backend/frontend/docs
- ⏳ Backend: FastAPI + WebSocket pendiente
- ⏳ Frontend: React + R3F + Three.js pendiente (aguardando logos finales 2026 Liliana)
- ⏳ Identidad visual: paleta cyan #0E92A6 placeholder hasta firmar
- ⏳ Naming definitivo: DR-029 pending

## Stack tecnológico decidido

```
Backend:
  • Python 3.11 + FastAPI
  • uvicorn standalone
  • WebSocket nativo /ws/oracle/stream
  • httpx async para fan-out a fuentes
  • Cache local SQLite + JSON snapshots
  • SOPS para secrets

Frontend:
  • Vite + React 18 + TypeScript
  • @react-three/fiber + @react-three/drei
  • Framer Motion (transiciones)
  • Tailwind CSS + tokens.css (CSS vars cambiables post-identidad)
  • Recharts (datos series temporales)
  • Tone.js (sound design opcional)

Infra:
  • NixOS module dedicado
  • Acceso Tailscale-only por default
  • Cloudflare Access opcional para URL pública
```

## Roadmap

### Fase 0 — Scaffold tech-only (esta PR)
- [x] Estructura directorios
- [ ] Backend FastAPI placeholder con endpoints stub
- [ ] WebSocket stream stub
- [ ] Frontend React + R3F skeleton sin colores definitivos
- [ ] NixOS module declaración

### Fase 1 — Audit fuentes de datos (post DR-029)
- [ ] `docs/data-sources.md` — inventory completo
- [ ] Adaptadores por fuente (FarmOS, HA, AirGradient, etc.)

### Fase 2 — Visual identity (post identidad firmada Liliana)
- [ ] Aplicar paleta oficial 2026
- [ ] Three.js globo con geo-pin Guatoc
- [ ] Particle field con red micelial

### Fase 3 — Modos de presentación
- [ ] Modo cinema fullscreen (pantalla lounge)
- [ ] Modo lite (Nest Hub via HA Lovelace)
- [ ] Render PNG endpoint (bot Telegram)
- [ ] Stream overlay (OBS Live Sessions)

### Fase 4 — Producción
- [ ] Tests E2E Playwright
- [ ] Deploy alpha vía nixos-rebuild
- [ ] Smoke prod desde stg via Tailscale

## Anti-leak

Este módulo es **chagra-pro** (privado). Puede mencionar:
- ✅ Topología red interna (alpha, stg, Tailscale)
- ✅ Rutas Cloudflare tunnels
- ✅ Identidades operativas (Miguel, Liliana, Antonio)
- ✅ Codenames internos del paraguas IA (HYTA/BAKATÁ/MYCELIUM)

NO puede contener:
- ❌ API keys (van por SOPS, nunca commit)
- ❌ Patterns de PROHIBITED_INTERNAL.md que afecten el repo público Chagra OSS
- ❌ Hashes operacionales sin enmascarar

## Referencias

- ADR-023 (eco-oracle-dashboard-storage) — fundamento storage local-first
- ADR-026 (OSS/Pro boundary) — este módulo es Pro
- DR-029 (naming-system) — naming definitivo pending
- DR-030 (redes-estrategia) — quién comunica qué desde el oracle
