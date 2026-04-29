# Oracle Lab — Hot Deploy (sin nixos-rebuild)

Permite hacer `git pull + systemctl restart` para actualizar el oracle backend en alpha sin pasar por `nixos-rebuild switch`. **15 segundos vs 5 minutos.**

## Cuándo usar

| Escenario | Modo recomendado |
|-----------|------------------|
| Cambios al código Python del backend (collectors, server.py, render.py) | **Hot deploy** ✓ |
| Cambios al frontend (después de `npm run build`) | Hot deploy + copy dist/ |
| Cambios al `default.nix` del módulo (estructura del service) | nixos-rebuild |
| Cambios al SOPS secret oracle-lab-env | nixos-rebuild |
| Adición de Python deps al pythonEnv | nixos-rebuild |

**Regla**: si tocás archivos `.py` o `.html`/`.js` del backend, **hot deploy basta**. Si tocás `.nix`, requiere rebuild.

## Setup inicial (una sola vez)

### 1. Activar `liveReloadPath` en alpha config

Editar `~/Workspace/guatoc-nixos/hosts/alpha/default.nix`, en el bloque `services.oracle-lab`:

```nix
services.oracle-lab = {
  enable = true;
  port = 9090;
  secretsFile = config.sops.secrets.oracle-lab-env.path;

  # Hot deploy mode
  liveReloadPath = "/var/lib/oracle-lab/code";

  # Opcional — auto-restart on file change (intensivo)
  # enableHotReload = false;
};
```

### 2. Rebuild una sola vez

```bash
cd ~/Workspace/guatoc-nixos
sudo nixos-rebuild switch --flake .#alpha --target-host kortux@alpha --sudo
```

Este rebuild:
- Crea el directorio `/var/lib/oracle-lab/code/` con perms `oracle-lab:oracle-lab`
- Instala el comando `oracle-lab-redeploy` en `/run/current-system/sw/bin/`
- Configura sudoers NOPASSWD para `kortux` ejecute el script
- Cambia el `WorkingDirectory` del service al path mutable

### 3. Clonar chagra-pro al path live

```bash
ssh alpha
sudo -u oracle-lab git clone https://github.com/guatoc-ecohub/chagra-pro.git /tmp/_oracle-clone
sudo cp -r /tmp/_oracle-clone/modules/oracle-lab/* /var/lib/oracle-lab/code/
sudo chown -R oracle-lab:oracle-lab /var/lib/oracle-lab/code

# Inicializar git en el path live
cd /var/lib/oracle-lab/code
sudo -u oracle-lab git init
sudo -u oracle-lab git remote add origin https://github.com/guatoc-ecohub/chagra-pro.git
sudo -u oracle-lab git fetch origin
sudo -u oracle-lab git checkout -B main origin/main

# Restart para que tome el path live
sudo systemctl restart oracle-lab
```

> **NOTA**: El path live tiene SOLO los archivos de `modules/oracle-lab/`, no el repo completo. Si querés el repo entero, ajustar `liveReloadPath = "/var/lib/oracle-lab/code/modules/oracle-lab"` y clonar el repo completo en `/var/lib/oracle-lab/code/`.

### 4. Verificar

```bash
systemctl status oracle-lab
# Debe mostrar:
#   Loaded: loaded (...)
#   WorkingDirectory: /var/lib/oracle-lab/code/backend  ← live path

curl http://localhost:9090/api/oracle/snapshot | jq .timestamp
```

## Uso diario (loop de desarrollo)

Cuando hay cambios al código backend en GitHub (mergeados a main):

```bash
# Desde tu workstation stg, vía SSH:
ssh alpha 'sudo oracle-lab-redeploy'
```

O directamente en alpha:

```bash
sudo oracle-lab-redeploy
```

El script:
1. `cd /var/lib/oracle-lab/code`
2. `git pull --ff-only` (como user oracle-lab)
3. `systemctl restart oracle-lab`
4. Muestra status del service

**~15 segundos** vs los ~5 minutos de un nixos-rebuild full.

## Modo desarrollo intensivo (auto-reload)

Para iterar muy rápido (cambias código → ves resultado en segundos sin tener que pull):

```nix
services.oracle-lab.enableHotReload = true;
```

Esto agrega `--reload` a uvicorn + `watchfiles`. El service se reinicia automáticamente cuando detecta cambios en `.py` del backend.

**Solo recomendado para dev local en stg/laptop.** En alpha producción dejar `false` por estabilidad y consumo de inotify watchers.

## Troubleshooting

### El service no arranca después de redeploy
```bash
journalctl -u oracle-lab -n 50 --no-pager
# Si hay un error de Python, revertir el último commit:
cd /var/lib/oracle-lab/code
sudo -u oracle-lab git reset --hard HEAD~1
sudo systemctl restart oracle-lab
```

### `oracle-lab-redeploy: command not found`
- Verificar que `liveReloadPath` está set en alpha config
- Verificar que el último rebuild incluye este módulo
- `which oracle-lab-redeploy` debe mostrar `/run/current-system/sw/bin/oracle-lab-redeploy`

### Error sudo "kortux is not allowed to execute oracle-lab-redeploy"
- El sudoers rule se instala automáticamente cuando `liveReloadPath != null`
- Verificar que `/etc/sudoers.d/` tiene la entrada
- Quizás necesite logout/login post-rebuild

### Permisos en /var/lib/oracle-lab/code
Si git pull falla con "fatal: detected dubious ownership":
```bash
sudo chown -R oracle-lab:oracle-lab /var/lib/oracle-lab/code
sudo -u oracle-lab git config --global --add safe.directory /var/lib/oracle-lab/code
```

## Anti-leak

- El path `/var/lib/oracle-lab/code` es legible por user `oracle-lab` solamente.
- El git remote es público (chagra-pro tiene secrets via SOPS, no en git).
- Si querés repos privados adicionales, agregar deploy key SSH al user oracle-lab.

## Reverso a modo inmutable

Si querés volver al modo nix store inmutable:

```nix
services.oracle-lab.liveReloadPath = null;  # default
```

`nixos-rebuild switch` y volverá a usar el módulo del store. El path `/var/lib/oracle-lab/code` queda huérfano (no afecta nada), podés borrarlo manualmente.
