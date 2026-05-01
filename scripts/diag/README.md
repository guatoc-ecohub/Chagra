# scripts/diag — scripts de diagnóstico operativo

> Scripts cortos pensados para correrse en `alpha` desde el árbol del repo,
> sin necesidad de copiar/pegar bloques largos en la terminal (Konsole +
> bracketed-paste rompen indentación Python sistemáticamente).

## Workflow

En `alpha`:

```bash
cd ~/guatoc-nixos-stable
git pull
sudo python3 scripts/diag/<script>.py
```

`sudo` necesario sólo cuando el script accede a `/run/secrets/*`. Cada
script documenta sus requisitos en su docstring.

## Scripts disponibles

| Script | Propósito | Requiere sudo |
|--------|-----------|---------------|
| `check_ha.py` | Lee `HA_LONG_LIVED_TOKEN` de `/run/secrets/oracle-lab-env`, llama `/api/states` de HA, lista `sensor.*` reales para construir `HA_SENSOR_FILTER` | sí |

## Convenciones

- **Solo stdlib** (urllib, json, os, sys) — sin instalar deps en alpha.
- **Salida humana**: una línea por hecho, prefijos `ERROR:`, `WARN:`, sin colores.
- **Exit codes**: 0 OK, 1 ERROR diagnóstico, 2 ERROR usuario (permisos, args).
- **No mutaciones**: scripts read-only por defecto. Si alguno hace cambios, prefijo `apply_*.py` y dry-run por default con `--apply` explícito.

## Por qué este dir existe

Konsole + bracketed-paste + heredocs Python = pesadilla. Pegamos el script
con indentación, bash interpreta `import ` como comando, falla, frustración.
La alternativa base64 (encode → decode → exec) funciona pero es opaca y
no versionada. Tener el script en el repo elimina el copy-paste, queda
versionado, reviewable y reutilizable.

Ver también: el patrón base64 sigue disponible para emergencias one-off
donde no hay tiempo de hacer un PR — pero NO commitear scripts pegados
así, que terminen acá.
