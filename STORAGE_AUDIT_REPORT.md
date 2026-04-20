# STORAGE AUDIT REPORT — Nodo Alpha (ZFS)

**Última actualización:** 2026-04-20T01:30 -05:00 (post-mirror + post-rebuild)
**Host:** alpha
**Modo:** AUDITORÍA + REMEDIACIÓN APLICADA

---

## 1. Estado actual tras la operación mirror

### 1.1 Inventario físico de discos

| Device        | Tamaño  | Modelo / Serial                          | ID estable (by-id)                                | Rol                             |
| ------------- | ------- | ---------------------------------------- | ------------------------------------------------- | ------------------------------- |
| `/dev/nvme0n1`| 477 GB  | Samsung PM981 NVMe / `S3ZHNF0K236768`    | `nvme-PM981_NVMe_Samsung_512GB_..._S3ZHNF0K236768` | Sistema (ESP + swap + `/nix`)   |
| `/dev/sda`    | 10.9 TB | TOSHIBA MG07ACA12TE / `2080A2AHFDUG`     | `ata-TOSHIBA_MG07ACA12TE_2080A2AHFDUG`            | **Mirror secundario de `tank`** |
| `/dev/sdb`    | 10.9 TB | TOSHIBA MG07ACA12TE / `2080A1GWFDUG`     | `ata-TOSHIBA_MG07ACA12TE_2080A1GWFDUG`            | **Mirror primario de `tank`**   |
| `/dev/sdc`    | 932 GB  | Samsung SSD 860 EVO 1 TB                 | `ata-Samsung_SSD_860_EVO_1TB_S3Z6NB0K224082F`     | pool `tank-fast`                |

### 1.2 Estado de pools ZFS (post-resilver)

```
  pool: tank
 state: ONLINE
  scan: resilvered 592M in 00:02:20 with 0 errors on 2026-04-20 01:18:01
config:
        NAME                                      STATE     READ WRITE CKSUM
        tank                                      ONLINE       0     0     0
          mirror-0                                ONLINE       0     0     0
            wwn-0x50000399f8ca0b26-part1          ONLINE       0     0     0
            ata-TOSHIBA_MG07ACA12TE_2080A2AHFDUG  ONLINE       0     0     0

errors: No known data errors
```

- **Topología final:** `tank` = `mirror-0 (2 × 12 TB)`. Redundancia N+1 (sobrevive fallo de 1 disco).
- **Capacidad útil:** 11 TB (mirror, no stripe).
- **`tank-fast`:** sigue en **single-disk** (SSD 860 EVO 1 TB). Sin redundancia — decisión pendiente cuando/si llega un segundo SSD.

### 1.3 Remediación aplicada en este ciclo

| # | Cambio                                                          | Archivo                                    | Estado |
| - | --------------------------------------------------------------- | ------------------------------------------ | ------ |
| 1 | Migración a IDs `/dev/disk/by-id/` en lugar de `/dev/sdX`       | `hosts/alpha/disko.nix`                    | ✅ APLICADO |
| 2 | Añadido `hdd2` (disco nuevo) al manifiesto declarativo          | `hosts/alpha/disko.nix`                    | ✅ APLICADO |
| 3 | `disko.devices.zpool.tank.mode = "mirror"`                      | `hosts/alpha/disko.nix`                    | ✅ APLICADO |
| 4 | `hdparm-spindown.service` sobre ambos HDD por ID estable        | `hosts/alpha/hardware.nix`                 | ⚠ REVERTIDO (working tree limpio — requiere re-aplicar si se desea) |
| 5 | Wipe + `zpool attach` runtime (592 MB resilvered, 0 errores)    | runtime                                    | ✅ APLICADO (script `scripts/tank-mirror-expand.sh`) |
| 6 | `nixos-rebuild switch` anterior aplicó hdparm sobre ambos HDD  | boot actual                                | ✅ OBSERVADO en journal — pero la declaración en `hardware.nix` fue revertida después |
| 7 | Paquetes de auditoría (`hdparm smartmontools gptfdisk parted…`) | `hosts/alpha/default.nix`                  | ⚠ REVERTIDO (requieren re-edit si se desean) |
| 8 | `vm.swappiness: 10 → 1`                                         | `hosts/alpha/hardware.nix`                 | ⚠ REVERTIDO |

**Nota:** los cambios #4, #7, #8 fueron revertidos en el working tree
entre turnos (detectado via `git status`). El estado runtime que ya fue
activado por el rebuild anterior (hdparm aplicado a ambos discos con IDs
by-id) **sigue siendo el estado activo del sistema corriente**, pero la
declaración en `hardware.nix` vuelve a apuntar a `/dev/sda` — lo que
reintroduciría la vulnerabilidad en el próximo rebuild. Decisión
pendiente del operador: re-aplicar estos 3 cambios o dejarlos fuera.

---

## 2. Performance para LLM — palancas y estado actual

Todas las mediciones vienen de capturas runtime del 2026-04-20 entre
00:14 y 01:22 con el modelo `qwen3.5:4b` residente.

### 2.1 CPU — ya óptimo (no hay más qué hacer desde el stack base)

| Palanca                               | Estado   | Valor                              | Comentario                                               |
| ------------------------------------- | -------- | ---------------------------------- | -------------------------------------------------------- |
| `powerManagement.cpuFreqGovernor`     | ✅ OK    | `performance`                      | Declarado en `hardware.nix:10`. Boost 4.31 GHz cuando hay carga. |
| Transparent Huge Pages (THP)          | ✅ OK    | `[always]`                         | Inspeccionado: `/sys/kernel/mm/transparent_hugepage/enabled = [always]`. Ganancia típica en LLM-CPU: 5-10 % tok/s por menor TLB pressure. |
| NUMA                                  | N/A      | 1 nodo, cores 0-11                 | Ryzen 4600G es monolito — no hay que pinnear threads.   |
| KVM AMD (svm)                         | ⚠ OFF   | BIOS disabled                      | `kvm_amd: SVM not supported by CPU 9` en journal. No afecta Ollama (no usa KVM) pero bloquea workloads de virtualización. Activar en BIOS cuando sea conveniente. |

### 2.2 Memoria — aplicado en este ciclo + palancas pendientes

| Palanca                    | Estado       | Valor actual          | Notas                                                              |
| -------------------------- | ------------ | --------------------- | ------------------------------------------------------------------ |
| `vm.swappiness`            | ⚠ 10 (edición revertida) | 10                    | Propuesto bajar a `1` para proteger runner de Ollama; el edit a `hardware.nix` fue revertido. Re-aplicar si se autoriza. |
| `vm.overcommit_memory`     | ✅ OK        | 2 (estricto)          | Necesario para la asignación contigua grande del runner (fix 2026-04-19). |
| `vm.overcommit_ratio`      | ✅ OK        | 150 (≈ 52 GiB límite) | Deja holgura para cargar múltiples modelos tras RAM upgrade.       |
| `vm.vfs_cache_pressure`    | ✅ OK        | 50                    | Balance razonable entre page-cache y dentry/inode cache.           |
| Techo RAM efectiva         | ⚠ 14 GiB   | 11 GiB en uso con modelo cargado | 3.6 GiB libres sólo — cargar un 2º modelo 4B fuerza swap. Ver `LLM_AUDIT_REPORT.md §4` para upgrade a 32 GiB. |
| ZFS ARC `c_max`            | ✅ OK        | 4 GiB                 | `zfs.zfs_arc_max` protege explícitamente a Ollama del hambre de RAM por parte de ZFS. |
| ZFS ARC `size` actual      | ✅ SANO      | 1.03 GiB (25% de c_max) | Headroom grande; no hay presión.                                  |
| **ARC hit ratio**          | ✅ EXCELENTE | **99.51 %**           | 26 316 775 hits / 129 071 misses desde boot. **Storage no es cuello de botella** del pipeline actual. |

### 2.3 ZFS — estado vs. palancas recomendadas

Datos del pool `tank-fast` (donde vive `/mnt/fast/appdata/ollama` con los 12 GB de modelos):

| Atributo               | Declarado en disko | Valor actual runtime          | Recomendación para LLM                   |
| ---------------------- | ------------------ | ----------------------------- | ---------------------------------------- |
| `compression`          | `lz4`              | `lz4` ✅                       | Correcto — GGUF es incompresible, lz4 hace skip rápido. |
| `encryption`           | `aes-256-gcm`      | activa                        | Sin cambio.                              |
| `primarycache`         | default (`all`)    | `all` ✅                       | Correcto — deja al ARC decidir bajo presión. |
| `recordsize`           | default (128K)     | **128K** (no óptimo para GGUF)| ⚠ **Palanca disponible** — ver §2.4.1. |
| `atime`                | no declarado       | default `on` (no verificado)  | ⚠ **Palanca disponible** — ver §2.4.2. |
| `xattr`                | no declarado       | default                       | Marginal. Cambiar a `sa` reduce IOPS en xattr access. |

### 2.4 Palancas ZFS runtime recomendadas (NO aplicadas — requieren tu autorización)

Estas operaciones requieren detener Ollama, recrear el dataset y mover los modelos. Justifican el downtime solo si hay un patrón de carga que las aproveche. Hoy el ARC hit ratio es 99.5 %, así que el gain marginal es **bajo** — documento las palancas por completitud, pero no son urgentes.

#### 2.4.1 Dataset dedicado para Ollama con `recordsize=1M`

Archivos GGUF son blobs inmutables de 3-6 GB que Ollama lee secuencialmente en cold-start. `recordsize=1M` reduce el overhead de pointer indirection en datos grandes y mejora el prefetch lineal; de 128 K a 1 M el cold-start del modelo puede bajar de ~8 s a ~5-6 s (empírico, no medido en este nodo).

```bash
# (ventana de downtime ~5 min para 12 GB)
sudo systemctl stop podman-ollama
sudo mv /mnt/fast/appdata/ollama /mnt/fast/appdata/ollama.bak
sudo zfs create \
  -o recordsize=1M \
  -o atime=off \
  -o compression=lz4 \
  -o xattr=sa \
  tank-fast/appdata/ollama
sudo mv /mnt/fast/appdata/ollama.bak/* /mnt/fast/appdata/ollama/
sudo mv /mnt/fast/appdata/ollama.bak/.?* /mnt/fast/appdata/ollama/ 2>/dev/null || true
sudo rmdir /mnt/fast/appdata/ollama.bak
sudo systemctl start podman-ollama
```

Riesgo: medio — hay downtime + movimiento de 12 GB. Reversible recreando el dataset con recordsize default.

#### 2.4.2 `atime=off` para los pools

Deshabilita actualización del timestamp de acceso en lecturas. En un pool donde Ollama lee modelos y HA/immich/frigate leen medios, `atime=on` genera writes espurios que consumen IOPS. Acción segura, no-destructiva:

```bash
sudo zfs set atime=off tank
sudo zfs set atime=off tank-fast
sudo zfs set xattr=sa tank
sudo zfs set xattr=sa tank-fast
```

### 2.5 Palancas software-only de Ollama (dominio LLM — ver `LLM_AUDIT_REPORT.md §4.2`)

No son storage pero son las palancas de mayor impacto sin hardware nuevo:

| Variable                  | Default actual | Propuesto | Ganancia esperada                                  |
| ------------------------- | -------------- | --------- | -------------------------------------------------- |
| `OLLAMA_FLASH_ATTENTION`  | `false`        | `true`    | 5-15 % tok/s + KV-cache menor.                     |
| `OLLAMA_KV_CACHE_TYPE`    | `""` (f16)     | `q8_0`    | ~50 % RAM del KV-cache. Habilita contextos ~2× más largos sin tocar RAM. |
| `OLLAMA_KEEP_ALIVE`       | `5m0s`         | `30m0s` o `-1` | Evita cold-start de 8 s entre sesiones. Costo: 5.3 GiB RAM residentes permanentemente. Aplicable solo con RAM ≥ 32 GiB. |
| Depurar `paligemma-mix-224:latest` residual | presente | remover | Libera 5.88 GB en `tank-fast`. `ollama rm jyan1/paligemma-mix-224:latest`. |

Van en `modules/ai/ollama.nix → virtualisation.oci-containers.containers.ollama.environment`.
**Edición inicial aplicada y luego revertida** entre turnos de este ciclo
(working tree vuelto a limpio). No se re-aplica sin orden explícita — pendiente de decisión del operador.

---

## 3. Tareas opcionales pendientes post-operación

| # | Tarea                                             | Beneficio                                          | Riesgo            | Cuando                                  |
| - | ------------------------------------------------- | -------------------------------------------------- | ----------------- | --------------------------------------- |
| A | `zfs set atime=off tank tank-fast`                | Elimina writes espurios en reads                   | Nulo              | Ahora mismo, seguro                     |
| B | `zfs set xattr=sa tank tank-fast`                 | Xattr inline, menor IOPS                           | Nulo              | Ahora mismo, seguro                     |
| C | `zpool export tank && zpool import -d /dev/disk/by-id tank` | Uniformar nombre del vdev (`wwn-*` → `ata-*`) | Bajo — requiere quietud en `/mnt/data` | Ventana quiescente        |
| D | `zpool upgrade tank` + `zpool upgrade tank-fast`  | Habilita feature flags ZFS nuevas                  | Medio — irreversible hacia OpenZFS viejo | Cuando la migración fuera del nodo no sea una preocupación |
| E | `zpool scrub tank-fast` + `zpool scrub tank`      | Validación profunda de integridad                  | Nulo (solo lectura) | Ventana baja de uso                  |
| F | Dataset `tank-fast/appdata/ollama` con `recordsize=1M` | ~2-3 s menos en cold-start de modelos           | Medio — downtime ~5 min | Opcional, gain marginal con ARC 99.5 % |
| G | Aplicar palancas software Ollama (§2.5)           | 5-15 % tok/s + RAM KV-cache                        | Bajo — reversible | En próximo rebuild si priorizan LLM     |
| H | Habilitar SVM (AMD-V) en BIOS                     | Permite KVM para futuros workloads virtualizados   | Nulo              | Próximo reboot físico al BIOS           |
| I | Segundo SSD 1 TB → mirror de `tank-fast`          | Redundancia de datos calientes (appdata, modelos)  | Requiere hardware nuevo | Decisión de inversión                |

**Prioridad operativa sugerida:** A + B (zero-risk, zero-downtime) → C (ventana quiescente, estético) → E (post-mantenimiento) → F + G (requieren decisión explícita de downtime/cambio de env vars) → D + H (bajo demanda) → I (nuevo hardware).

---

## 4. Archivos tocados en esta iteración

**Declarativos persistentes (en working tree, listos para commit):**
- `hosts/alpha/disko.nix` — reescrito a IDs by-id + `mode = "mirror"` + `hdd2`.

**Declarativos revertidos entre turnos (working tree vuelto al estado previo):**
- `hosts/alpha/hardware.nix` — cambios `hdparm-spindown by-id` + `vm.swappiness = 1` — **NO persistentes**.
- `hosts/alpha/default.nix` — `systemPackages` +paquetes de disco — **NO persistentes**.
- `modules/ai/ollama.nix` — env vars `FLASH_ATTENTION` + `KV_CACHE_TYPE` — **NO persistentes**.

**Nuevos scripts y reportes (listos para commit):**
- `scripts/tank-mirror-expand.sh` — detección dinámica de vdev source, wrappers `nix shell`, 4 pasos con 2 confirmaciones humanas.
- `scripts/tank-perf-tune.sh` — 3 fases: (1) atime=off + xattr=sa, (2) dataset Ollama recordsize=1M, (3) opt-in export/import del pool tank.
- `BOOT_DIAGNOSTICS.md` — ciclo anterior, referencia.
- `LLM_AUDIT_REPORT.md` — ciclo anterior, referencia.
- `STORAGE_AUDIT_REPORT.md` — este archivo.

## 5. Principio operativo

Runtime aplicado y validado en este ciclo:
- Mirror `tank` activo con 2 × 12 TB. Resilver completado (592 MB, 0 errores).
- hdparm sobre ambos discos (observado en journal del `nixos-rebuild switch` anterior).

**Palancas runtime documentadas pero aún no ejecutadas:**
- `scripts/tank-perf-tune.sh` — correr con `sudo ./scripts/tank-perf-tune.sh` para FASE 1 (atime/xattr, zero-downtime) + FASE 2 (dataset ollama con recordsize=1M, requiere ~5 min downtime de Ollama). Pasar `--all` para incluir FASE 3 (export/import opt-in, requiere detener containers).

**Palancas declarativas pendientes de decisión del operador** (todas fueron editadas durante el ciclo y luego revertidas — no se re-aplican sin orden explícita):
1. `vm.swappiness = 1` en `hardware.nix`
2. Paquetes de disco en `systemPackages` en `default.nix`
3. `hdparm-spindown` declarado por IDs by-id en `hardware.nix` (hoy activo en runtime del rebuild anterior, pero la declaración volvió al default — ⚠ un rebuild sin re-aplicar esto revertiría el servicio a `/dev/sda`)
4. `OLLAMA_FLASH_ATTENTION=true` + `OLLAMA_KV_CACHE_TYPE=q8_0` en `modules/ai/ollama.nix`
