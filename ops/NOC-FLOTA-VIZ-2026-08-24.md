# NOC / visualización de flota / 2026-08-24

## Estado

La vista está disponible directamente por Tailscale en:

`http://100.117.193.102:8891/`

El servicio de esta entrega escucha en `100.117.193.102`, no en `0.0.0.0`, y
no modifica nginx, DNS público ni configuración de NixOS.

## Qué muestra

- **Zoetrope pulse:** ejecuta `zoe inspect` sobre la sesión Claude Code más
  reciente y grafica agentes, subagentes, tool calls, cola y ediciones. El
  endpoint publica únicamente contadores y estado live. No publica títulos,
  prompts, rutas, UUIDs, nombres de proyectos ni texto de transcript.
- **Fleet ledger:** ejecuta `fleet-ledger` en cada refresco y muestra gasto
  agregado, corridas, salud, cuotas y los carriles allowlisted `codex`, `glm`,
  `opencode`, `deepseek` y `claude`. El parser descarta líneas desconocidas.

## Verificación realizada

- `GET /` responde `200` y contiene los paneles `Zoetrope pulse` y `Fleet ledger`.
- `GET /healthz` responde `200` con `ok: true` y confirma el bind Tailscale.
- `GET /api/zoe` responde con métricas anonimizadas de `zoe inspect`.
- `GET /api/ledger` responde con resumen, cuotas y carriles allowlisted.
- No se instaló la versión WASM de zoetrope en esta fase.

## Pendiente con aprobación del operador

- Para que sobreviva a un reboot, revisar e instalar `ops/fleet-viz/fleet-viz.service.example`
  como unidad systemd de usuario o el mecanismo de supervisión elegido por
  operaciones. No se ejecutó automáticamente para no tocar NixOS.
- Si se desea un nombre DNS propio dentro de la VPN, aprobar un alias
  MagicDNS/Tailscale DNS que apunte a `100.117.193.102:8891`. No se tocó DNS
  público ni nginx.
- Integrar el WASM web completo de zoetrope queda como fase posterior. El
  fallback actual ya entrega el pulso operativo y mantiene el perímetro de
  datos local.
