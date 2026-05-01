#!/usr/bin/env python3
"""check_ha.py — diagnóstico Home Assistant collector del oracle-lab.

Lee HA_LONG_LIVED_TOKEN del envfile real del service (/run/secrets/oracle-lab-env)
para descartar discrepancias entre lo que el operador cree que está y lo que
el systemd realmente expone al collector. Pega a /api/states de HA y lista
los entity_ids tipo `sensor.*` para que el operador pueda construir el regex
HA_SENSOR_FILTER correcto sin adivinar.

Uso (en alpha, requiere sudo para leer /run/secrets/):
    sudo python3 scripts/diag/check_ha.py

Salida típica:
    Token len: 185, last 15: ...wQlN0VV6mic
    Total entities: 133 | Sensors: 47
    --- primeros 60 sensores ---
      sensor.airgradient_pm25
      sensor.matera_cocina_humidity
      sensor.matera_cocina_temperature
      ...

Refs:
    - chagra-pro/modules/oracle-lab/backend/collectors/home_assistant.py
    - hosts/alpha/secrets.yaml (clave oracle-lab-env)
"""
import urllib.request
import json
import sys

ENVFILE = "/run/secrets/oracle-lab-env"
HA_BASE = "http://localhost:8123"
SHOW_FIRST_N = 60


def main():
    try:
        with open(ENVFILE) as f:
            env = dict(
                line.split("=", 1)
                for line in f.read().splitlines()
                if "=" in line and not line.startswith("#")
            )
    except PermissionError:
        sys.exit(f"ERROR: necesita sudo para leer {ENVFILE}")
    except FileNotFoundError:
        sys.exit(f"ERROR: {ENVFILE} no existe — corré nixos-rebuild switch primero")

    token = env.get("HA_LONG_LIVED_TOKEN", "").strip()
    if not token:
        sys.exit("ERROR: HA_LONG_LIVED_TOKEN no aparece en envfile")

    print(f"Token len: {len(token)}, last 15: ...{token[-15:]}")

    req = urllib.request.Request(
        f"{HA_BASE}/api/states",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ERROR HTTP {e.code}: {e.reason} — token rechazado o endpoint inválido")
    except Exception as e:
        sys.exit(f"ERROR: {e}")

    sensors = sorted(
        e["entity_id"] for e in data if e["entity_id"].startswith("sensor.")
    )
    print(f"Total entities: {len(data)} | Sensors: {len(sensors)}")
    print(f"--- primeros {SHOW_FIRST_N} sensores ---")
    for s in sensors[:SHOW_FIRST_N]:
        print(f"  {s}")

    if len(sensors) > SHOW_FIRST_N:
        print(f"... +{len(sensors) - SHOW_FIRST_N} más (ver con `python3 scripts/diag/check_ha.py | less`)")


if __name__ == "__main__":
    main()
