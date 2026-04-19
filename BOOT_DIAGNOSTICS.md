# BOOT DIAGNOSTICS — Nodo Alpha

**Fecha de captura:** 2026-04-19T01:10:57-05:00
**Host:** alpha — kernel 6.18.16
**Boot window observado:** `abr 19 00:53:44 … 00:56:28` (~2 min 44 s)
**Estado:** FIXES APLICADOS — pendiente `nixos-rebuild switch`

---

## 0. Resumen ejecutivo

| # | Hallazgo                                      | Severidad | Estado                                  |
| - | --------------------------------------------- | --------- | --------------------------------------- |
| 1 | `wyoming-piper-default.service` failed         | ALTA      | ✅ **FIX APLICADO** — colisión puerto 10200 |
| 2 | `sops-key-protection.service` ExecStart inválido | ALTA    | ✅ **FIX APLICADO** — writeShellScript    |
| 3 | `pre-shutdown.service` sin ExecStart          | ALTA      | ✅ **FIX APLICADO** — no-op               |
| 4 | Usuario `media` no declarado                  | MEDIA     | ✅ **FIX APLICADO** — `media-svc media`   |
| 5 | `kauditd hold queue overflow`                 | BAJA      | ✅ **FIX APLICADO** — `backlogLimit=8192` |
| 6 | `kvm_amd` SVM not supported                   | BAJA      | ⚠️ FUERA DE ALCANCE NIX (BIOS)            |
| 7 | `auditd` filter.conf línea muy larga          | BAJA      | ⚠️ UPSTREAM NIXOS                         |
| 8 | Open WebUI (:8090) ECONNREFUSED               | MEDIA     | ⚠️ TRANSITORIO (startup ~80s)             |
| 9 | Uptime Kuma NTFY Watchdog                     | MEDIA     | ⚠️ CONFIG RUNTIME (DB del contenedor)     |
| 10 | HA `uptime_kuma` duplicate unique_ids         | MEDIA     | ⚠️ CONFIG RUNTIME (HA integration)        |
| 11 | HA SQLite unclean shutdown                    | BAJA      | ⚠️ TRANSITORIO (post-crash normal)        |
| 12 | Frigate `homekit_config.json`                 | BAJA      | ⚠️ CONTENEDOR (init interno)              |
| 13 | Nextcloud ServerName                          | BAJA      | ⚠️ CONTENEDOR (Apache interno)            |
| 14 | Immich WASI ExperimentalWarning               | BAJA      | ⚠️ UPSTREAM NODE                          |
| 15 | Loki `empty ring` transient                   | BAJA      | ⚠️ NORMAL (single-node bootstrap)         |

---

## 1. Fixes aplicados (detalle)

### 1.1 — `wyoming-piper-default.service` (ALTA)

**Causa raíz:** colisión de puerto `:10200` entre el servicio nativo
`services.wyoming.piper.servers.default` y el contenedor canónico
`wyoming-piper` del spoke `guatoc.ai.piper` (`modules/ai/piper.nix`).
El contenedor (voz `en_US-lessac-medium`, PID 4696 en el journal)
arranca ~9s después del fallo del nativo (voz `es_ES-davefx-medium`,
PID 2826) y queda activo — confirmando el conflicto.

**Fix en `hosts/alpha/default.nix`:** comentado el bloque nativo
`services.wyoming.piper.servers.default`. El contenedor queda como
fuente de verdad única del puerto 10200.

### 1.2 — `sops-key-protection.service` (ALTA)

**Causa raíz:** `ExecStart` declarado como heredoc multilínea raw. systemd
interpreta la primera línea (`KEYFILE="..."`) como el path al ejecutable,
produciendo: *"Neither a valid executable name nor an absolute path"*.
Consecuencia: `chattr +i` sobre la age-key **nunca se ejecutó**.

**Fix en `hosts/alpha/default.nix`:** envolver el cuerpo en
`pkgs.writeShellScript "sops-key-protect" ''…''` — emite un binario
absoluto en `/nix/store/…-sops-key-protect` que systemd acepta. Añadido
`path = [ pkgs.e2fsprogs ]` para garantizar `chattr` en PATH del servicio.

### 1.3 — `pre-shutdown.service` (ALTA)

**Causa raíz:** el módulo upstream
`nixos/modules/config/power-management.nix` emite la unidad desde la
opción `powerManagement.powerDownCommands`. Cuando ese string es vacío
el script generado queda sólo con comentarios y systemd rehúsa la unidad
(*"Service has no ExecStart=. Refusing."*).

**Fix en `hosts/alpha/default.nix`:** declarar
`powerManagement.powerDownCommands = "true\n"` para que el ExecStart
generado contenga al menos un comando válido.

### 1.4 — Usuario `media` no declarado (MEDIA)

**Causa raíz:** `modules/media/default.nix:75-80` declara tmpfiles con
`media media` como owner/group, pero el único usuario declarado en el
repo es `media-svc` (uid 3000, grupo `media` gid 3000 — ver
`modules/media/legacy-media.nix:14-21`). systemd-tmpfiles fallaba con
*"Failed to resolve user 'media': Unknown user"* ×4.

**Fix en `modules/media/default.nix`:** reemplazar `media media` por
`media-svc media` en las 4 reglas (downloads, music, movies, tv).

### 1.5 — `kauditd hold queue overflow` (BAJA)

**Causa raíz:** `security.audit.backlogLimit` = 1024 (default NixOS) —
insuficiente para el bootstorm simultáneo de contenedores, servicios de
IA y servicios de observabilidad.

**Fix en `hosts/alpha/default.nix`:** `security.audit.backlogLimit = 8192;`
— option declarativo (no duplica flag en kernel cmdline).

---

## 2. Hallazgos fuera del alcance Nix (decisión operativa requerida)

### 2.1 — `kvm_amd: SVM not supported by CPU 9`
SVM/AMD-V requiere activación en BIOS del Ryzen. Acción: reboot al
firmware del servidor, habilitar `SVM Mode` / `Virtualization` en
`Advanced → CPU Configuration`. Nix no gestiona firmware.

### 2.2 — `auditd[2107]: Skipping line 2 in filter.conf: too long`
El `filter.conf` proviene del paquete `audit` upstream. Requiere parche
al paquete (`pkgs.audit.overrideAttrs`) o reportar a nixpkgs. Impacto
funcional: una regla de filtro ignorada; resto del auditd opera.

### 2.3 — Open WebUI (clawbot-guatoc) ECONNREFUSED desde Uptime Kuma
El contenedor clawbot-guatoc ejecuta migraciones Alembic + carga
`BertModel` (all-MiniLM-L6-v2) en arranque: ~78 segundos desde creación
del proceso hasta `Application startup complete`. Durante esa ventana
Uptime Kuma reporta `ECONNREFUSED :8090`. Tras startup el monitor debería
recuperarse naturalmente.

Si la alerta en Uptime Kuma persiste tras el arranque, la causa requiere
inspección runtime (estado del contenedor, not Nix).

### 2.4 — Uptime Kuma: `NTFY Alpha Watchdog` notification type not supported
Configuración del canal almacenada en la DB interna de Uptime Kuma (no
declarativa). Acción: editar el monitor en UI → cambiar tipo de
notificación, o recrear el canal con el provider correcto.

### 2.5 — HA integration `uptime_kuma` duplicate unique_ids
Bug de la integración de HA: reutiliza el mismo `unique_id` para
múltiples monitores con sufijo idéntico (`_port`). Acción: deshabilitar
la integración y reconfigurarla, o reportar a HA upstream. No fixable
desde Nix.

### 2.6 — HA SQLite recorder unclean-shutdown warning
Normal tras corte de energía / crash; HA ejecuta recovery y sigue.
Descartable salvo que se repita en cada boot.

### 2.7 — Frigate `/tmp/cache/homekit_config.json: No such file or directory`
Script `run.user` del contenedor Frigate referencia un cache aún no
generado. Benigno; la app crea el archivo en su primer start-up.

### 2.8 — Nextcloud `AH00558: Could not determine server's FQDN`
Apache dentro del contenedor no tiene `ServerName`. Config interna del
image `nextcloud:apache`. No Nix.

### 2.9 — Immich `WASI is an experimental feature`
Warning de Node upstream. Sin acción.

### 2.10 — Loki `error getting ingester clients: empty ring`
Transitorio de ~100ms durante arranque del ring de un solo nodo. Auto-
resuelve con `auto-joining cluster after timeout`.

---

## 3. Archivos mutados en esta iteración

- `hosts/alpha/default.nix`
  - `programs.nix-ld.enable = true;` (iteración previa — soporte FHS)
  - `powerManagement.powerDownCommands = "true\n";` (fix 1.3)
  - `security.audit.backlogLimit = 8192;` (fix 1.5)
  - `systemd.services.sops-key-protection` — ExecStart con `writeShellScript` (fix 1.2)
  - `services.wyoming.piper.servers.default` — comentado (fix 1.1)
- `modules/media/default.nix`
  - `systemd.tmpfiles.rules` — `media media` → `media-svc media` (fix 1.4)

## 4. Siguiente acción (manual)

```
sudo nixos-rebuild switch --flake .#alpha
```

Validación post-rebuild sugerida:

```bash
systemctl --failed
systemctl status sops-key-protection.service
systemctl status pre-shutdown.service
systemctl status podman-wyoming-piper.service
lsattr /home/kortux/.config/sops/age/keys.txt   # deberia mostrar 'i' (immutable)
cat /proc/cmdline | tr ' ' '\n' | grep audit_backlog_limit   # deberia ser 8192
```
