# Integración OpenFang Picoclaw — skill `/stats`

> Skill para que el bot Telegram (Personal_Hand_Kortux) responda al comando
> `/stats` con la imagen actual del Oracle Guatoc.

## Manifest TOML — agregar a OpenFang Picoclaw

En el manifest del agente Picoclaw (vive en `guatoc-nixos/modules/ai/openfang.nix` o similar), agregar este tool:

```toml
[tools.oracle_stats]
trigger = "/stats"
description = "Obtiene snapshot visual actual del Oracle Guatoc (clima + finca + IoT + ollama + git activity) como imagen PNG"
handler = "shell"
command = """
curl -fsS \\
  -H "User-Agent: openfang-picoclaw" \\
  "http://localhost:9090/api/oracle/render/png?width=1024&height=768" \\
  -o /tmp/oracle-stats-$$.png \\
  && echo "/tmp/oracle-stats-$$.png"
"""
response_type = "photo"
caption_template = "Oracle Guatoc — {{ now().strftime('%Y-%m-%d %H:%M') }}"
timeout_secs = 15

[tools.oracle_farm]
trigger = "/finca"
description = "Estado actual de la finca: assets activos, logs últimos 7d, clima"
handler = "shell"
command = """
curl -fsS http://localhost:9090/api/oracle/farm/state | python3 -c "
import sys, json
d = json.load(sys.stdin)
w = d.get('weather') or {}
print(f\\"📊 *Estado finca Guatoc*

🌡 Temp: {w.get('temperature_2m', '?')}°C / Humedad: {w.get('relative_humidity_2m', '?')}%
🌱 Assets activos: {d.get('farm_assets', 0)}
🏠 Sensores IoT: {d.get('ha_sensors', 0)}

Sincronizado: {d.get('timestamp', '?')[:19]}\\")
"
"""
response_type = "markdown"
timeout_secs = 8
```

## Configuración del bot

El comando funciona si:

1. ✅ Oracle Lab corriendo en `:9090` (verificable: `systemctl status oracle-lab`)
2. ✅ OpenFang Picoclaw daemon corriendo y suscrito al chat de Telegram
3. ✅ Bot puede ejecutar `curl` localhost (sin firewall blockeando)

## Flujo de uso desde Telegram

```
Tú: /stats
Bot: [imagen PNG con 4 cards: clima, farm, ha, sistema]
     "Oracle Guatoc — 2026-04-29 14:23"

Tú: /finca
Bot: 📊 Estado finca Guatoc

     🌡 Temp: 18.2°C / Humedad: 78%
     🌱 Assets activos: 12
     🏠 Sensores IoT: 8

     Sincronizado: 2026-04-29T14:23:01
```

## Operación

- **Costo por request**: 1 PNG = ~500ms render server-side. Con cache 30s del oracle, requests subsecuentes son <50ms (sirve PNG cacheado).
- **Token consumption del bot**: el tool `shell` NO consume LLM tokens (es ejecución directa). Solo respuesta al usuario consume token mínimo (~100 tokens).
- **Privacy**: imagen contiene info operativa de Guatoc + su IP Tailscale. NO compartir el bot con personas no autorizadas. ADR-020 anti-leak aplica.

## Pendiente

- Bot puede agregar comando `/refresh` que fuerza recolección con `POST /api/oracle/event` antes del render (push real-time).
- Si querés alertas push del oracle al bot (sin que el usuario pida), implementar webhook desde el oracle al endpoint OpenFang.
