# Solarman/Deye logger — notas operativas

## Hardware actual Guatoc (alpha)

| Campo | Valor |
|---|---|
| Logger serial | `D258311744E0` |
| Logger IP LAN | `192.168.1.111` |
| Logger MAC | `80:A0:36:0C:23:C4` (OUI Hi-Flying / IGEN Tech) |
| **Logger firmware** | `DYDA_WiBLE_1.6.2` (cloud-locked 2024+) |
| Cloud server activo | `logger-us` (Solarman US) |
| Inversor serial | `2510231027` |
| Inversor modelo | `0300` (Deye 12 kW) |
| Inversor firmware main | `A228-1727` |
| Inversor firmware slave | `C37E` |
| Rated power | 12000 W |

## Firmware DYDA_WiBLE — cloud-locked

El firmware `DYDA_WiBLE_1.6.2` (y posteriores) **NO expone Modbus TCP local** en
ningún puerto. La UI admin web (http://192.168.1.111/) solo tiene 4 pestañas:

- Web Server Settings (login + AP credentials)
- Device Information
- Wireless Settings
- OTA (firmware upgrade)

Las pestañas tradicionales `Other Settings`, `Application Setting`, `Misc`, o
`Modbus TCP Configuration` **fueron removidas** por Solarman/Deye para forzar
el uso exclusivo de su app cloud.

**Implicación**: el component HA `StephanJouberts/home_assistant_solarman`
(protocolo Modbus TCP V4 plano) NO funciona con este firmware. Síntoma: log
loop infinito `WARNING [solarman] Querying [3 - 112]...` sin respuesta.

## Pivote — protocolo Solarman V5

Solarman cloud-locked firmwares siguen aceptando el protocolo **V5** (con
magic header + auth + checksum + serial del logger). Hay integraciones HA
HACS que implementan V5:

| Repo | Stack | Estado | Notas |
|---|---|---|---|
| **`davidrapan/ha-solarman`** | Python + pysolarmanv5 | ✅ mantenido 2024-2026 | Recomendado |
| `cbrunos/home_assistant_solarman_v5` | Python + pysolarmanv5 | mantenido | Alternativa |
| `kbialek/deye-inverter-mqtt` | MQTT bridge | mantenido | Requiere broker MQTT |

Para Guatoc se prefiere `davidrapan/ha-solarman` porque integra directo en
HA sin dependencia de broker MQTT externo.

## Pasos instalación `davidrapan/ha-solarman` (HACS)

1. **Remover el component viejo**:
   ```
   ssh alpha 'sudo systemctl stop podman-homeassistant'
   ssh alpha 'sudo rm -rf /mnt/fast/appdata/homeassistant/custom_components/solarman'
   ```
2. **Remover config entry viejo** (vía UI HA Settings → Devices & Services
   → integraciones rotas → 3 puntos → eliminar). O via script:
   ```
   bash scripts/diag/fix-solarman-remove-old-entry.sh   # TODO crear si necesario
   ```
3. **Instalar integración nueva** (vía HACS UI):
   - HACS → Integrations → 3 puntos → Custom repositories
   - Add: `https://github.com/davidrapan/ha-solarman` category Integration
   - Buscar "Solarman" en HACS → Install
   - Reiniciar HA
4. **Configurar config entry** (UI HA Settings → Devices & Services → Add
   Integration → Solarman):
   - Name: Deye 12K Guatoc
   - Host: `192.168.1.111`
   - Port: `8899` (default V5)
   - Mac: `80:A0:36:0C:23:C4` (algunos forks lo piden, otros lo derivan)
   - Serial: `D258311744E0` (LOGGER, NO inversor)
   - Slave ID: `1`
   - Inverter type: `deye_hybrid` o `deye_sg04lp3` según el modelo 0300
     (probar ambos si UI da fallo de prendimiento)

## Si V5 también falla

Algunos firmwares DYDA muy nuevos bloquean V5 también. Alternativas en
orden de viabilidad:

1. **Cambiar cloud server**: en admin web del stick, cambiar de `logger-us`
   a `logger-eu` o `logger-china` puede liberar el puerto local en algunos
   firmwares (no documentado oficialmente, voodoo de la comunidad).
2. **Factory reset del stick**: pinhole 10s, reconfigurar WiFi STA. Algunos
   firmwares post-reset exponen pestañas adicionales temporalmente.
3. **Downgrade firmware** (riesgo de brick): vía OTA del admin web, subir
   firmware `MW3_16U_x.x.x` versión 1.7.x antigua que sí tenía Modbus TCP
   local. Buscar en foros Solarman comunidad.
4. **Cloud API fallback**: `kbialek/deye-inverter-mqtt` con cloud=true puede
   leer los datos via Solarman API REST (latencia ~5min, requiere internet).
   Va contra principio Chagra local-first ADR-019, usar como fallback.

## Datos para Cenicafé / Guatoc operación

El inversor está produciendo 18540 W con rated 12000 W al momento de la
medición — significa **sobre-producción transitoria** (puntos picos
producción solar > capacidad inversor). El inversor tiene curtailment
interno: clipea a 12000 W en sus stats internos. La cifra "Current power"
del admin web puede ser DC entrada antes de clipping; el AC útil es ≤ 12000 W.

A confirmar con curva diaria una vez integrado en HA.

## Relación con principios Chagra

- ADR-019 inmutable + ADR-027 inventory event sourcing: la telemetría
  Solarman (potencia PV, batería SOC, grid import/export) son source de
  verdad ambiental. Una vez integrado vía V5 local, los eventos van a
  pipeline IoT → ADR-023 Eco-Oracle Dashboard arquitectura.
- Local-first: V5 local cumple. Cloud API fallback NO cumple — preferir
  V5 incluso con costo de configuración inicial.
