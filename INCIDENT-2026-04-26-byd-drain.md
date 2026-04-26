# INCIDENT — Drenado banco Deye por BYD conectado (2026-04-26)

## Resumen ejecutivo

El vehículo BYD quedó conectado al sistema de la casa y el banco principal de baterías (inversores Deye) se drenó hasta **25% de SoC**. Operación de la vivienda en margen mínimo.

## Régimen del dominio (power-laws check)

✅ Mundo de **cola pesada**:

- Un solo evento de drenaje hasta corte por bajo voltaje destruye ciclos de batería de forma desproporcionada.
- La media histórica (carga balanceada solar/cargas) **no anticipa** el peor caso (BYD enchufado por descuido sin telemetría).
- Hay efectos en cascada: SoC bajo → arranques de cargas grandes (bombas, neveras) fallan o gastan más → descarga acelera.
- Existe agente humano falible (operador olvida desconectar) — no se elimina con disciplina, requiere automatización.

**Estrategia coherente**: corte automatizado con thresholds conservadores, alerta preventiva antes del corte, re-arme manual obligatorio (no auto-rearme para evitar oscilación), telemetría redundante, post-mortem documentado.

## Causa raíz

1. **Falta de telemetría del inversor en HA**: `configuration.yaml` y `automations.yaml` reales no contienen ninguna entidad relacionada con Deye, SoC, ni cargador EV (verificado 2026-04-26 vía SSH a alpha).
2. **Falta de actuador de corte**: el cargador del BYD no está conectado a un switch/relé controlable (Shelly Pro 2PM, Sonoff, smart plug, o wallbox con API).
3. **Falta de alerta preventiva**: aunque el operador se hubiera dado cuenta del descuido, no hay canal proactivo (Telegram, email) que notifique SoC bajo.

## Impacto

- 🔴 Banco Deye en 25% SoC (riesgo de bajo voltaje + ciclo profundo no recomendado para LiFePO4 con DoD >80%).
- 🟡 Pérdida de margen para arranques de cargas grandes en la vivienda.
- 🟢 No hubo apagado de la casa (recuperación posible vía solar / red).

## Fix inmediato (manual, requiere intervención humana ahora)

1. **Desconectar físicamente el cargador del BYD del banco/red** hasta que el SoC recupere ≥60%.
2. Si hay sol disponible: priorizar carga del banco antes de cualquier otra carga grande.
3. Si no hay sol: alimentar prioridades críticas con red eléctrica si el sistema permite bypass.
4. Documentar SoC observado cada 1h hasta recuperación a 80%+ para validar curva de carga real.

## Plan de mitigación a 3 fases

### Fase 1 — Inmediata: workaround interim sin hardware nuevo (días)

Mientras llega el hardware (Fase 2), se puede:

- **Recordatorio automático en bot Telegram** que pregunte cada 6 horas: "¿BYD desconectado?" cuando el operador esté en finca.
- **Hábito declarado**: regla del operador → BYD se conecta sólo de día con SoC ≥80% confirmado a ojo en pantalla del Deye.
- **Bypass del cargador BYD**: si la wallbox tiene timer físico, programar corte manual por horario.

NO sustituye el kill-switch automatizado. Sólo reduce probabilidad mientras se implementa.

### Fase 2 — Esta semana: integración Deye en Home Assistant

Sin telemetría de SoC en HA, ninguna automatización es posible. Opciones:

| Opción | Pros | Contras | Esfuerzo |
|--------|------|---------|----------|
| **Modbus TCP** (si Deye tiene WiFi/LAN dongle) | Estándar, sin cloud, baja latencia | Requiere ajustar IP + ID de esclavo + mapeo de registros | 0.5 dp |
| **Solarman API** (cloud, app oficial Deye) | Setup rápido | Latencia 30-60s, dependencia cloud, riesgo Ley 1581 | 0.25 dp |
| **Sunsynk-haveinverters** (HACS custom) | Comunidad activa | Custom integration, riesgo de bumps | 0.5 dp |
| **ESPHome bridge** (ESP32 + RS485 al Deye) | Total control, offline first | Requiere ESP32 + RS485 + programación | 1 dp |

**Recomendación inicial** (sujeta a verificación con DR si se quiere rigor): **Modbus TCP** si el Deye tiene dongle LAN; ESPHome bridge como fallback. Solarman queda relegado por compliance + privacy.

Tareas:

- [ ] Identificar modelo exacto del Deye + dongle disponible.
- [ ] Configurar la integración elegida en HA.
- [ ] Verificar que `sensor.deye_battery_soc` existe y reporta valor coherente (cruzar con pantalla del inversor).
- [ ] Configurar `notify.telegram_ops` apuntando al canal de operaciones.
- [ ] Validar sensor: dejar bajar SoC controlado y verificar lectura cada 5 min durante 1h.

### Fase 3 — Siguiente semana: hardware de corte + activación del kill-switch

Una vez existe la telemetría, falta el **actuador**:

| Hardware | Capacidad | Pros | Contras | Costo aprox |
|----------|-----------|------|---------|-------------|
| **Shelly Pro 2PM** | 2× 16A | Reportes potencia + corriente, robusto, MQTT/HTTP, certificado | Requiere instalación en tablero | $$ |
| **Sonoff S40 / Athom Smart Plug 16A** | 16A | Plug-and-play | Toma estándar (no garantiza 32A trifásico) | $ |
| **Wallbox con API** (Wallbox Pulsar Plus, Easee, OpenEVSE) | Variable | Control fino de amperaje, no solo on/off | Costo alto, vendor lock-in posible | $$$ |
| **MQTT relay custom** (ESP32 + relé estado sólido) | Variable | Total control, FOSS | DIY, riesgo de error en ensamblado | $ |

**Recomendación inicial** (sujeta a verificación): **Shelly Pro 2PM en el tablero**. Por:
- 16A cubre cargadores AC monofásicos típicos del BYD en casa.
- Reporta potencia real (útil para dashboards futuros).
- Compatible con HA nativo + MQTT como fallback.
- Instalación en tablero — no se descalibra, no se desconecta accidentalmente.

Tareas:

- [ ] Comprar Shelly Pro 2PM (verificar disponibilidad Colombia).
- [ ] Cableado por electricista certificado al circuito del cargador EV.
- [ ] Integrar Shelly en HA (`switch.shelly_pro_2pm_ev_charger`).
- [ ] Activar el módulo NixOS:
      ```nix
      guatoc.iot-energy.deyeBydKillswitch.enable = true;
      ```
- [ ] Validar el kill-switch con prueba controlada:
  1. Confirmar SoC actual ≥80%.
  2. Forzar el sensor SoC vía template helper a 34% temporalmente.
  3. Verificar que `switch.shelly_pro_2pm_ev_charger` se apague en ≤30s.
  4. Verificar que llegue el mensaje 🔴 a Telegram ops.
  5. Restaurar template y SoC real.

## Implementación realizada en este PR

- ✅ Módulo NixOS `modules/iot-energy/deye-byd-killswitch.nix` con la automatización HA completa, parametrizable, con asserciones bloqueantes para umbrales inseguros.
- ✅ Importación en `hosts/alpha/default.nix` con `enable = false` (no afecta deploy hasta activación explícita).
- ✅ Validaciones:
  - `cutThreshold` debe estar en [20, 50] (rango seguro DoD).
  - `warnThreshold` > `cutThreshold`.
  - `rearmThreshold` > `warnThreshold`.
  - Warning en activación si las entidades son las placeholder por defecto.
- ✅ 4 automations HA generadas:
  - `[ENERGY-W1]` warn 40% → notify Telegram.
  - `[ENERGY-C1]` cut 35% → switch.turn_off + notify.
  - `[ENERGY-R1]` rearm 60% → notify (NO auto-rearme).
  - `[ENERGY-D1]` sensor data loss → notify.

## Pendientes (no en este PR)

- ❌ Integración Deye en HA → Fase 2.
- ❌ Hardware actuador → Fase 3.
- ❌ Notify service `telegram_ops` configurado en HA.
- ❌ Validación con ciclo controlado.
- ❌ Calibración de umbrales basada en patrón real de la casa (puede que 35% sea demasiado conservador o no suficiente).

## Comando de despliegue (NixOS — manual SSH)

Tras revisar y mergear el PR:

```bash
ssh alpha
cd ~/guatoc-nixos-stable  # (o ~/Workspace/guatoc-nixos en stg)
git pull origin main
sudo nixos-rebuild switch --flake .#alpha
```

El módulo está `enable = false` por defecto, así que el rebuild **no** modifica HA todavía. Sólo agrega el módulo al árbol de imports.

Para activar tras Fases 2 y 3:

```nix
# hosts/alpha/default.nix
guatoc.iot-energy.deyeBydKillswitch.enable = true;
guatoc.iot-energy.deyeBydKillswitch.socSensorEntity = "sensor.deye_battery_soc"; # nombre real
guatoc.iot-energy.deyeBydKillswitch.chargerSwitchEntity = "switch.shelly_pro_2pm_ev_charger"; # nombre real
```

Luego el `nixos-rebuild switch` provisiona el package en HA.

## Referencias

- HA packages directory: `/mnt/fast/appdata/homeassistant/packages/` (creado por el módulo).
- Configuration.yaml debe tener la línea `homeassistant: packages: !include_dir_named packages` — verificar tras Fase 2.
- Power-laws decision principle: `Chagra-strategy/deepresearch/architecture/power-laws-decision-principle.md`.
- DR triple validation (si se quiere rigor sobre Modbus TCP vs Solarman vs ESPHome): `Chagra-strategy/deepresearch/operations/dr-triple-validation-pattern.md`.
