# Docker Compose — Entorno de Desarrollo

**Fecha:** 2026-04-17
**Alcance:** Dependencias externas de Chagra para desarrollo local

## Objetivo

Levantar con un solo comando (`docker compose up`) los tres servicios externos que Chagra necesita, sin tocar `vite.config.ts` ni el flujo `npm run dev` existente.

## Servicios

### postgres
- Imagen: `postgres:16`
- Solo accesible internamente por `farmos`
- Volumen persistente `postgres_data`
- Credenciales en `.env.docker`

### farmos
- Imagen: `farmos/farmos:3`
- Puerto host: `8081`
- Depende de `postgres` con healthcheck
- Variables de entorno: DB host/user/pass, site name

### homeassistant
- Imagen: `ghcr.io/home-assistant/home-assistant:stable`
- Puerto host: `8123`
- Volumen persistente `ha_config` en `./docker/ha-config`
- `network_mode: host` no requerido en dev

### ollama
- Imagen: `ollama/ollama`
- Puerto host: `11434`
- CPU-only (sin `deploy.resources.reservations`)
- Volumen persistente `ollama_models`

### ollama-init (one-shot)
- Misma imagen `ollama/ollama`
- Espera a que `ollama` esté listo, luego ejecuta `ollama pull qwen3.5:4b`
- `restart: no` — se detiene al terminar

## Archivos a crear

```
docker-compose.yml          # definición de servicios
.env.docker                 # credenciales (no en git)
.env.docker.example         # plantilla (sí en git)
docker/ha-config/           # configuración inicial de Home Assistant
```

## Variables de entorno (.env.docker)

```
POSTGRES_DB=farmos
POSTGRES_USER=farmos
POSTGRES_PASSWORD=farmos
FARMOS_SITE_NAME=Chagra Dev
```

## Flujo de uso

```bash
docker compose --env-file .env.docker up -d   # levantar dependencias
npm run dev                                    # Vite en host (sin cambios)
docker compose down                            # detener
docker compose down -v                         # detener + borrar volúmenes
```

## Lo que NO incluye

- SSL/TLS
- Configuración de producción
- GPU para Ollama
- Home Assistant con acceso a hardware real (Zigbee, USB, etc.)
