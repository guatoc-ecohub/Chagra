#!/usr/bin/env python3
"""apply_ha_token.py — re-aplica HA_LONG_LIVED_TOKEN dentro del string
oracle-lab-env del SOPS hosts/alpha/secrets.yaml.

Idempotente: detecta si el token ya está dentro o como key separada,
limpia ambos casos y deja el resultado canónico:
    oracle-lab-env: "...FARMOS_PASSWORD=...\\nHA_LONG_LIVED_TOKEN=<jwt>\\n"

NO commitea ni pushea — eso es decisión del operador. NO restartea
servicios — eso es paso separado (ver mensaje final del script).

Uso (en alpha, requiere sudo para sops decrypt + write encrypted):

    sudo python3 scripts/diag/apply_ha_token.py
    # → "Pegá el JWT (no se muestra):"
    # → pegás el JWT completo, Enter

Después de aplicar, ejecutar para activar:
    sudo nixos-rebuild switch --flake .#alpha
    sudo systemctl restart oracle-lab
    sudo python3 scripts/diag/check_ha.py
"""
import os
import re
import subprocess
import sys
from getpass import getpass

# Path relativo al cwd: el script asume que se ejecuta desde el root del
# repo guatoc-nixos. Usar ~/... no funciona bajo sudo (expande a /root).
SECRETS = "hosts/alpha/secrets.yaml"


def main():
    if not os.path.exists(SECRETS):
        sys.exit(
            f"ERROR: {SECRETS} no existe en cwd ({os.getcwd()}). "
            "Ejecutá desde el root del repo: cd ~/guatoc-nixos-stable && python3 scripts/diag/apply_ha_token.py"
        )

    # Detectar sudo y abortar — SOPS necesita la age key del USER, no de root.
    # Si corremos bajo sudo, HOME cambia a /root y SOPS no encuentra la key
    # en /home/$USER/.config/sops/age/keys.txt → "Failed to get the data key".
    if os.geteuid() == 0:
        sys.exit(
            "ERROR: este script NO debe correrse con sudo. SOPS necesita tu age key "
            "personal (en /home/$USER/.config/sops/age/keys.txt), que sudo no puede leer "
            "porque HOME cambia a /root. Ejecutá sin sudo:\n\n"
            "    python3 scripts/diag/apply_ha_token.py\n\n"
            "Los pasos siguientes (nixos-rebuild + systemctl restart oracle-lab + check_ha.py) "
            "SÍ usan sudo — solo este script va sin sudo."
        )

    # 1. Leer JWT (sin echo)
    print("Pegá el JWT de Home Assistant y presioná Enter (no se muestra):")
    token = getpass("> ").strip()
    if not token or not token.startswith("eyJ"):
        sys.exit("ERROR: JWT vacío o no parece JWT (debe empezar con 'eyJ')")
    print(f"   JWT recibido: {len(token)} chars, ...{token[-12:]}")

    # 2. Decifrar
    try:
        result = subprocess.run(
            ["sops", "-d", SECRETS],
            capture_output=True,
            text=True,
            check=True,
        )
        plain = result.stdout
    except subprocess.CalledProcessError as e:
        sys.exit(f"ERROR sops -d: {e.stderr}")

    # 3. Manipular: eliminar HA_LONG_LIVED_TOKEN standalone + dentro, re-insertar canónico
    new_lines = []
    found_oracle_env = False
    for line in plain.splitlines(keepends=True):
        # 3a. Eliminar línea standalone HA_LONG_LIVED_TOKEN: ...
        if line.startswith("HA_LONG_LIVED_TOKEN:"):
            print("   - eliminada key standalone HA_LONG_LIVED_TOKEN")
            continue
        # 3b. Si es la línea oracle-lab-env, limpiar token previo y agregar nuevo
        if line.startswith("oracle-lab-env:"):
            found_oracle_env = True
            # Limpiar HA_LONG_LIVED_TOKEN= existente dentro del string
            cleaned = re.sub(r"\\nHA_LONG_LIVED_TOKEN=[^\\]*", "", line)
            # Insertar el nuevo antes del \n" de cierre
            if '\\n"' in cleaned:
                new_line = cleaned.replace(
                    '\\n"',
                    f'\\nHA_LONG_LIVED_TOKEN={token}\\n"',
                    1,
                )
                new_lines.append(new_line)
                print("   ✅ HA_LONG_LIVED_TOKEN insertado dentro de oracle-lab-env")
            else:
                sys.exit("ERROR: oracle-lab-env no termina en \\n\" — formato inesperado")
            continue
        new_lines.append(line)

    if not found_oracle_env:
        sys.exit("ERROR: no encontré la key 'oracle-lab-env' en el YAML decifrado")

    new_plain = "".join(new_lines)

    # 4. Verificar idempotencia: el JWT debe aparecer exactamente una vez
    appearances = new_plain.count(token)
    if appearances != 1:
        sys.exit(f"ERROR: JWT aparece {appearances} veces tras edit (esperado 1)")

    # 5. Sobrescribir el path original (matchea creation_rules de SOPS) + re-encriptar
    try:
        with open(SECRETS, "w") as f:
            f.write(new_plain)
        subprocess.run(["sops", "-e", "-i", SECRETS], check=True)
        print(f"   ✅ {SECRETS} re-encriptado")
    except subprocess.CalledProcessError as e:
        sys.exit(f"ERROR sops -e -i: {e}")

    # 6. Verificar el resultado decifrando + grep
    verify = subprocess.run(
        ["sops", "-d", SECRETS],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    matches_inside = sum(
        1
        for line in verify.splitlines()
        if line.startswith("oracle-lab-env:") and "HA_LONG_LIVED_TOKEN=" in line
    )
    matches_standalone = sum(
        1 for line in verify.splitlines() if line.startswith("HA_LONG_LIVED_TOKEN:")
    )
    print(
        f"   Verificación: {matches_inside} oracle-lab-env con token dentro, "
        f"{matches_standalone} standalone (esperado 1 + 0)"
    )
    if matches_inside != 1 or matches_standalone != 0:
        sys.exit("ERROR: verificación post-encrypt falló")

    print()
    print("✅ Token aplicado correctamente. Para activar, ejecutá:")
    print()
    print("   sudo nixos-rebuild switch --flake .#alpha")
    print("   sudo systemctl restart oracle-lab")
    print("   sudo python3 scripts/diag/check_ha.py")
    print()
    print("Y para que NO vuelva a perderse en próximos pulls, commit + push:")
    print()
    print("   git add hosts/alpha/secrets.yaml")
    print("   git commit -m 'chore(secrets): aplicar HA_LONG_LIVED_TOKEN dentro de oracle-lab-env'")
    print("   git push")


if __name__ == "__main__":
    main()
