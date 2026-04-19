# BOOT DIAGNOSTICS — Nodo Alpha

**Fecha de captura:** 2026-04-19T01:10:57-05:00
**Host:** alpha — kernel 6.18.16
**Boot window observado:** `abr 19 00:53:44 … 00:56:28` (~2 min 44 s)
**Modo:** AUDITORÍA (read-only — prohibido parchar en esta fase)
**Fuente de datos:** `journalctl -b` entregado manualmente por el operador (uid 1000 en sandbox no tenía visibilidad al journal del sistema).

---

## 1. Unidades systemd en estado `failed` tras el arranque

```
● wyoming-piper-default.service  loaded failed failed  Wyoming Piper server instance default
```

Detalle previamente capturado:
- Falla a los 2.3 s con `code=exited, status=1/FAILURE`, timestamp `00:54:16 -05`.
- Declarada en `hosts/alpha/default.nix:147-151`
  (`services.wyoming.piper.servers.default`, voz `es_ES-davefx-medium`, uri
  `tcp://127.0.0.1:10200`).
- **Inconsistencia observada:** a las `00:54:25` el log muestra otro proceso
  `wyoming-piper[4696]` descargando exitosamente `en_US-lessac-medium` y
  reportando `Ready`. La voz descargada NO coincide con la configurada
  (`es_ES-davefx-medium`). Requiere determinación humana de si se trata
  de otra instancia paralela, un restart con unit-file distinto, o un
  default no declarado en el flake.

---

## 2. Hallazgos factuales del journal (ordenados por unidad)

### 2.1 `pre-shutdown.service` — unit file inválido
```
systemd[1]: pre-shutdown.service: Service has no ExecStart=, ExecStop=, or SuccessAction=. Refusing.
```
Unit declarado pero vacío. systemd rehúsa cargarlo. Localizar la fuente
en los módulos Nix (probablemente `modules/` o un hook de ZFS/Cloudflared).

### 2.2 `sops-key-protection.service` — ExecStart malformado
```
systemd[1]: /etc/systemd/system/sops-key-protection.service:10:
Neither a valid executable name nor an absolute path:
KEYFILE=/home/kortux/.config/sops/age/keys.txt
```
El shell heredoc definido en `hosts/alpha/default.nix:31-37` se está
serializando sin envoltura explícita de `${pkgs.bash}/bin/bash -c …`, por
lo que systemd interpreta la primera línea (`KEYFILE="…"`) como el
binario a ejecutar. **Observación factual, no se aplica corrección.**

### 2.3 Kernel — virtualización AMD deshabilitada
```
kernel: kvm_amd: SVM not supported by CPU 9
systemd-modules-load[637]: Failed to insert module 'kvm_amd': Operation not supported
```
SVM/AMD-V ausente o desactivado en BIOS del Ryzen. Bloquea cualquier
hypervisor nativo (qemu-kvm, libvirt, docker nesting con KVM).

### 2.4 Kernel — audit backlog
```
kernel: audit: kauditd hold queue overflow   (×6, entre 00:54:01 y 00:54:10)
```
La cola de auditoría se llena antes de que `auditd` drene. Saturación
transitoria durante el bootstorm de servicios.

### 2.5 `systemd-tmpfiles` — usuario `media` no existe
```
tmpfiles[2099]: /etc/tmpfiles.d/00-nixos.conf:57-60:
Failed to resolve user 'media': Unknown user   (×4)
```
Alguien declaró reglas de tmpfiles con `chown media:…` sin haber creado
el usuario en `users.users`. Procedencia probable: módulo `guatoc.media`
(lidarr/radarr/sonarr/navidrome/qbittorrent/slskd) en `modules/`.

### 2.6 `auditd` — filtro mal formado
```
auditd[2107]: Skipping line 2 in filter.conf: too long
```

### 2.7 `systemctl` (stop plymouth) — benignos
```
systemctl[2502]: Failed to stop systemd-ask-password-plymouth.path: Unit … not loaded.
systemctl[2502]: Failed to stop systemd-ask-password-plymouth.service: Unit … not loaded.
```
Intento de detener unidades no cargadas. Ruido, sin impacto funcional.

### 2.8 `frigate` (container init)
```
frigate[4081]: ./run.user: line 63: /tmp/cache/homekit_config.json: No such file or directory
```
El init del contenedor lee un path aún no generado. No bloquea el arranque.

### 2.9 `homeassistant` — SQLite + sensors duplicados
```
homeassistant[3764]: WARNING The system could not validate that the sqlite3 database
                     at //config/home-assistant_v2.db was shutdown cleanly
homeassistant[3764]: WARNING Ended unfinished session (id=12 from 2026-04-19 05:43:28)
```
```
homeassistant[3764]: ERROR Platform uptime_kuma does not generate unique IDs.
   ID 01KKZPN4YCHP6DM3QY2A9JJKZX_InfluxDB_port              already exists
   ID 01KKZPN4YCHP6DM3QY2A9JJKZX_PostgreSQL FarmOS_port     already exists
   ID 01KKZPN4YCHP6DM3QY2A9JJKZX_Mosquitto (MQTT)_port      already exists
```
La integración `uptime_kuma` en HA duplica unique_ids; HA descarta los
duplicados — los sensores correspondientes no aparecerán en la UI.

### 2.10 `homeassistant` — rich 'return' in 'finally' (upstream)
```
py.warnings: /usr/local/lib/python3.14/site-packages/rich/segment.py:547:
SyntaxWarning: 'return' in a 'finally' block
```
Warning de Python 3.14 sobre código de la librería `rich`. Upstream.

### 2.11 `uptime-kuma`
Dos clases de errores distintos:

**a) Destino NTFY mal configurado (persistente, cada ~60 s):**
```
ERROR: Cannot send notification to NTFY Alpha Watchdog
Error: Notification type is not supported
  at Notification.send (/app/server/notification.js:147:19)
```

**b) Monitores con endpoints rechazando conexión:**
```
WARN Monitor #2 'Home Assistant': connect ECONNREFUSED 192.168.1.100:8123   (transitorio, HA arrancó ~5 s después)
WARN Monitor #9 'Open WebUI':    connect ECONNREFUSED 192.168.1.100:8090   (persistente)
```
El clawbot/openwebui de `guatoc=clawbot { port = 8090; }`
(`hosts/alpha/default.nix:190`) no está aceptando conexiones al momento
en que Uptime Kuma lo sondea. Requiere validar en runtime.

### 2.12 `loki` — ring vacío transitorio
```
loki[5240]: level=error caller=ratestore.go:109 msg="error getting ingester clients"
            err="empty ring"
```
Un único error durante el bootstrap del cluster de un solo nodo. El
ingester se auto-une ~100 ms después (`auto-joining cluster after timeout`)
y el compactor pasa a ACTIVE. Sin impacto posterior.

### 2.13 `nextcloud` — ServerName no resuelve
```
nextcloud[5290]: AH00558: apache2: Could not reliably determine the server's
                 fully qualified domain name, using 10.89.2.7.
                 Set the 'ServerName' directive globally to suppress this message
```
Apache dentro del contenedor Nextcloud no tiene `ServerName`. Usa la IP
interna del pod. Ruido de arranque.

### 2.14 `clawbot-guatoc` — warnings de dependencias
```
WARNING: CORS_ALLOW_ORIGIN IS SET TO '*' - NOT RECOMMENDED FOR PRODUCTION DEPLOYMENTS.
WARNI  [langchain_community.utils.user_agent] USER_AGENT environment variable not set
WARNI  [huggingface_hub.utils._http] You are sending unauthenticated requests to the HF Hub.
BertModel LOAD REPORT: embeddings.position_ids UNEXPECTED
```
Todos son warnings informativos de open-webui / langchain / HF Hub.
El servicio arranca (`Started server process [1]`, `Application startup`).

### 2.15 `immich-server` — WASI experimental
```
immich-server[7270]: (node:2) ExperimentalWarning: WASI is an experimental feature…
```
Runtime de Node avisando sobre WASI. Upstream.

---

## 3. Síntesis por severidad (para triage humano)

| Severidad | Unidad / origen                      | Hallazgo                                                              |
| --------- | ------------------------------------ | --------------------------------------------------------------------- |
| **ALTA**  | `wyoming-piper-default.service`      | `failed (1/FAILURE)` — voz configurada vs. voz descargada no coincide |
| **ALTA**  | `sops-key-protection.service`        | ExecStart malformado — `chattr +i` sobre la age key posiblemente NO se aplicó |
| **ALTA**  | `pre-shutdown.service`               | Unit sin ExecStart/ExecStop — hook de apagado rehusado por systemd    |
| **MEDIA** | `systemd-tmpfiles` + módulo media    | Usuario `media` referenciado pero no declarado                        |
| **MEDIA** | `clawbot` / Open WebUI (:8090)       | ECONNREFUSED persistente para Uptime Kuma                             |
| **MEDIA** | `uptime-kuma` NTFY Watchdog          | Canal de notificación incompatible — no alertas outbound              |
| **MEDIA** | HA integration `uptime_kuma`         | Duplicate unique_ids — sensores descartados                           |
| **BAJA**  | `kvm_amd` SVM                        | Virtualización AMD no cargada (config de BIOS)                        |
| **BAJA**  | `auditd` filter.conf                 | Línea demasiado larga, ignorada                                       |
| **BAJA**  | `kauditd` queue overflow             | Saturación transitoria al bootstrap                                   |
| **BAJA**  | `frigate`, `nextcloud`, `immich`     | Warnings de inicialización de containers                              |
| **BAJA**  | `loki` empty-ring                    | Transitorio durante arranque del cluster de un solo nodo              |

---

## 4. Principio operativo aplicado

Esta captura es estrictamente de lectura. **No se ha propuesto ni
aplicado remedio alguno** a partir de los hallazgos. La correlación con
la directiva `programs.nix-ld.enable` aprovisionada en esta misma
iteración (única mutación del repo) queda reservada al siguiente ciclo
de decisión humana.
