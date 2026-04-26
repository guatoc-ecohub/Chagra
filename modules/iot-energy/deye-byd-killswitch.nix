# modules/iot-energy/deye-byd-killswitch.nix
# =============================================================================
# Kill-switch automatizado: corta cargador EV (BYD) cuando SoC del banco
# Deye baja del umbral seguro de operación de la vivienda.
#
# Detonante histórico: 2026-04-26 — BYD quedó conectado, banco drenó a 25%.
# Ver INCIDENT-2026-04-26-byd-drain.md (raíz del repo).
#
# IMPORTANTE — PRE-REQUISITOS NO IMPLEMENTADOS AL 2026-04-26:
#   1. Integración Deye en Home Assistant (Modbus TCP / Solarman / Sunsynk).
#      Sin entidad sensor.deye_battery_soc, este módulo solo provisiona la
#      automation pero no se dispara nunca.
#   2. Switch o relé controlable en el circuito del cargador BYD.
#      Sin entidad switch.<X> o sin la wallbox API, el "kill" no corta nada.
#
# Hasta que (1) y (2) existan, este módulo provee:
#   - Provisión declarativa de la automation HA (vía packages/).
#   - Validación de dependencias en activación (warn si falta entidad).
#   - Camino claro para activar tras integración.
#   - Telegram alert preventiva al cruzar el warn-threshold (40% por defecto).
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.iot-energy.deyeBydKillswitch;
  packagesDir = "/mnt/fast/appdata/homeassistant/packages";

  # Plantilla del package HA. Las entidades referidas DEBEN existir tras
  # configurar la integración Deye + el switch del cargador.
  haPackageYaml = ''
    # ============================================================
    # Generado por NixOS módulo deye-byd-killswitch.nix
    # NO editar a mano — los cambios serán sobrescritos.
    # Para deshabilitar: set guatoc.iot-energy.deyeBydKillswitch.enable = false
    # ============================================================

    # ---- Sensores derivados (estado del kill-switch) ----
    template:
      - sensor:
          - name: "Deye SoC battery (resolved)"
            unique_id: deye_soc_resolved
            state: "{{ states('${cfg.socSensorEntity}') | float(default=-1) }}"
            unit_of_measurement: "%"
            availability: "{{ states('${cfg.socSensorEntity}') not in ['unknown','unavailable','none'] }}"
          - name: "Deye SoC zona"
            unique_id: deye_soc_zone
            state: >-
              {%- set s = states('${cfg.socSensorEntity}') | float(default=-1) -%}
              {%- if s < 0 -%}desconocido
              {%- elif s < ${toString cfg.cutThresholdPercent} -%}critico
              {%- elif s < ${toString cfg.warnThresholdPercent} -%}alerta
              {%- else -%}ok
              {%- endif -%}

    # ---- Automatizaciones de seguridad ----
    automation:
      - id: deye_killswitch_warn
        alias: "[ENERGY-W1] SoC bajo warn (${toString cfg.warnThresholdPercent}%) → notificar Telegram ops"
        description: >-
          Avisa al operador en Telegram cuando el SoC cae por debajo de
          ${toString cfg.warnThresholdPercent}% para que tenga ventana de
          decisión antes del corte automático en ${toString cfg.cutThresholdPercent}%.
        mode: single
        max_exceeded: silent
        trigger:
          - platform: numeric_state
            entity_id: ${cfg.socSensorEntity}
            below: ${toString cfg.warnThresholdPercent}
            for: "00:01:00"
        condition:
          - condition: state
            entity_id: ${cfg.chargerSwitchEntity}
            state: "on"
        action:
          - service: notify.${cfg.notifyService}
            data:
              title: "🟠 SoC ${toString cfg.warnThresholdPercent}% — cargador EV aún encendido"
              message: >-
                SoC actual: {{ states('${cfg.socSensorEntity}') }}%.
                Si baja a ${toString cfg.cutThresholdPercent}% se corta el
                cargador automáticamente. Considera desconectar manualmente
                o mover carga a la red.

      - id: deye_killswitch_cut
        alias: "[ENERGY-C1] SoC crítico (${toString cfg.cutThresholdPercent}%) → CORTAR cargador EV"
        description: >-
          Corte automatizado del cargador del BYD cuando el banco Deye llega
          al umbral mínimo de operación segura de la vivienda.
        mode: single
        max_exceeded: silent
        trigger:
          - platform: numeric_state
            entity_id: ${cfg.socSensorEntity}
            below: ${toString cfg.cutThresholdPercent}
            for: "00:00:30"
        condition:
          - condition: state
            entity_id: ${cfg.chargerSwitchEntity}
            state: "on"
          - condition: template
            value_template: >-
              {{ states('${cfg.socSensorEntity}') not in ['unknown','unavailable','none'] }}
        action:
          - service: switch.turn_off
            target:
              entity_id: ${cfg.chargerSwitchEntity}
          - service: notify.${cfg.notifyService}
            data:
              title: "🔴 SoC ${toString cfg.cutThresholdPercent}% — CARGADOR EV CORTADO"
              message: >-
                Banco Deye en SoC {{ states('${cfg.socSensorEntity}') }}%.
                Cargador BYD desactivado automáticamente para preservar
                operación de la vivienda. Re-encender requiere intervención
                manual cuando el banco recupere ≥${toString cfg.rearmThresholdPercent}%.
          - service: persistent_notification.create
            data:
              title: "Kill-switch activado"
              message: >-
                {{ now().strftime('%Y-%m-%d %H:%M:%S') }}: corte automatizado.
                Re-armado bloqueado hasta SoC ≥${toString cfg.rearmThresholdPercent}%.

      - id: deye_killswitch_rearm_unlock
        alias: "[ENERGY-R1] SoC ≥${toString cfg.rearmThresholdPercent}% → permitir re-armado manual"
        description: >-
          NO re-enciende automáticamente el cargador. Solo notifica al operador
          que ya es seguro re-armarlo manualmente desde HA o físicamente.
        mode: single
        trigger:
          - platform: numeric_state
            entity_id: ${cfg.socSensorEntity}
            above: ${toString cfg.rearmThresholdPercent}
            for: "00:05:00"
        condition:
          - condition: state
            entity_id: ${cfg.chargerSwitchEntity}
            state: "off"
        action:
          - service: notify.${cfg.notifyService}
            data:
              title: "🟢 SoC ≥${toString cfg.rearmThresholdPercent}% — cargador EV puede re-armarse"
              message: >-
                Banco recuperado a {{ states('${cfg.socSensorEntity}') }}%.
                Cargador BYD listo para re-encender manualmente cuando lo
                necesites.

      - id: deye_killswitch_data_loss
        alias: "[ENERGY-D1] Sensor Deye desaparece → alerta inmediata"
        description: >-
          Defensa contra falla del sensor: si el SoC se vuelve unavailable
          mientras el cargador está prendido, no se puede tomar decisiones.
        mode: single
        trigger:
          - platform: state
            entity_id: ${cfg.socSensorEntity}
            to:
              - unavailable
              - unknown
              - none
            for: "00:02:00"
        condition:
          - condition: state
            entity_id: ${cfg.chargerSwitchEntity}
            state: "on"
        action:
          - service: notify.${cfg.notifyService}
            data:
              title: "⚠️  Sensor Deye desapareció con cargador EV ON"
              message: >-
                Kill-switch ciego. Considera desconectar el cargador
                manualmente hasta restablecer telemetría.
  '';

in
{
  options.guatoc.iot-energy.deyeBydKillswitch = {
    enable = lib.mkEnableOption "Kill-switch automatizado Deye SoC → cargador BYD";

    socSensorEntity = lib.mkOption {
      type = lib.types.str;
      default = "sensor.deye_battery_soc";
      example = "sensor.deye_state_of_charge";
      description = ''
        Entidad HA del SoC del banco Deye en porcentaje (0-100).
        Debe existir tras configurar la integración Deye en Home Assistant
        (vía Modbus TCP, Solarman API, Sunsynk integration, o ESPHome
        bridge). Si la entidad no existe, las automations no se disparan.
      '';
    };

    chargerSwitchEntity = lib.mkOption {
      type = lib.types.str;
      default = "switch.byd_ev_charger";
      example = "switch.shelly_pro_2pm_ev_charger";
      description = ''
        Entidad HA del switch que corta físicamente el cargador EV.
        Opciones típicas:
          - Relé Shelly Pro 2PM (16A) en el circuito dedicado del cargador.
          - Smart plug Sonoff S40 / Athom Smart Plug (16A) si el cargador
            usa toma estándar.
          - Switch nativo de wallboxes inteligentes (Wallbox Pulsar Plus,
            Easee Home, OpenEVSE).
          - MQTT switch hacia un relé controlado por ESPHome custom.
        Sin esta entidad, el corte no tiene actuador.
      '';
    };

    cutThresholdPercent = lib.mkOption {
      type = lib.types.int;
      default = 35;
      description = ''
        Umbral de corte automático (% SoC). 35% es punto de partida; ajustar
        tras observar el patrón de descarga real de la vivienda al menos un
        ciclo completo. Considerar:
          - Banco Deye recomienda DoD ≤80% (LiFePO4) → SoC mínimo 20%.
          - Margen para arranque de cargas grandes (bombas, neveras) sin
            apagar: ~10-15% sobre el mínimo absoluto.
          - 35% deja ~15% de margen sobre 20% mínimo del fabricante.
      '';
    };

    warnThresholdPercent = lib.mkOption {
      type = lib.types.int;
      default = 40;
      description = "Umbral de aviso preventivo en Telegram (% SoC).";
    };

    rearmThresholdPercent = lib.mkOption {
      type = lib.types.int;
      default = 60;
      description = ''
        SoC mínimo para considerar re-armar el cargador EV. NO re-arma
        automáticamente; solo notifica que el operador puede re-encender.
        60% deja margen suficiente para que el cargador no vuelva a tirar
        el banco al cruzar otra vez el cut-threshold en cuestión de minutos.
      '';
    };

    notifyService = lib.mkOption {
      type = lib.types.str;
      default = "telegram_ops";
      description = ''
        Servicio de notificación HA para alertas. Debe estar configurado en
        configuration.yaml (sección telegram_bot + notify) apuntando al canal
        de operaciones del operador.
      '';
    };
  };

  config = lib.mkIf cfg.enable {
    # Aserciones bloqueantes: no permitir umbrales inseguros.
    assertions = [
      {
        assertion = cfg.cutThresholdPercent >= 20 && cfg.cutThresholdPercent <= 50;
        message = ''
          deyeBydKillswitch.cutThresholdPercent (${toString cfg.cutThresholdPercent})
          fuera del rango seguro [20, 50]. Por debajo de 20 viola DoD del
          fabricante; por encima de 50 desperdicia capacidad útil.
        '';
      }
      {
        assertion = cfg.warnThresholdPercent > cfg.cutThresholdPercent;
        message = ''
          warnThresholdPercent debe ser > cutThresholdPercent
          (warn=${toString cfg.warnThresholdPercent}, cut=${toString cfg.cutThresholdPercent}).
        '';
      }
      {
        assertion = cfg.rearmThresholdPercent > cfg.warnThresholdPercent;
        message = ''
          rearmThresholdPercent debe ser > warnThresholdPercent
          (rearm=${toString cfg.rearmThresholdPercent}, warn=${toString cfg.warnThresholdPercent}).
        '';
      }
    ];

    # Provisión del archivo package HA. NO toca automations.yaml manual.
    # El operador debe asegurarse que configuration.yaml tenga `homeassistant.packages: !include_dir_named packages`.
    systemd.services.deye-killswitch-package = {
      description = "Provisiona package HA para kill-switch Deye/BYD";
      wantedBy = [ "multi-user.target" ];
      after = [ "podman-homeassistant.service" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        ExecStart = pkgs.writeShellScript "deye-killswitch-provision" ''
          set -euo pipefail
          install -d -m 0755 ${packagesDir}
          cat > ${packagesDir}/energy-emergency.yaml <<'NIXEOF'
          ${haPackageYaml}
          NIXEOF
          chown -R root:root ${packagesDir}
          # Trigger HA reload de packages (requiere REST API + token).
          # NO se hace aquí para evitar dependencia circular en arranque.
          # El operador hace "Developer Tools → Check Configuration → Reload"
          # tras nixos-rebuild switch.
        '';
      };
    };

    # Documentación viva: imprimir aviso si las entidades parecen placeholder.
    warnings = lib.optional (cfg.socSensorEntity == "sensor.deye_battery_soc" || cfg.chargerSwitchEntity == "switch.byd_ev_charger") ''
      [deye-byd-killswitch] Estás usando entidades placeholder por defecto.
      socSensor: ${cfg.socSensorEntity}
      chargerSwitch: ${cfg.chargerSwitchEntity}
      Verifica que ambas existan en Home Assistant antes de confiar en el
      kill-switch. Mientras no existan, las automations son inertes.
    '';
  };
}
