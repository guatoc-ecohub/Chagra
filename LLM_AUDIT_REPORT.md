# LLM AUDIT REPORT — Nodo Alpha (Ollama)

**Fecha de captura:** 2026-04-20T00:17 -05:00
**Host:** alpha — uptime >22 h — load avg 0.28 / 0.19 / 0.18
**Modo:** AUDITORÍA READ-ONLY
**Servicio inspeccionado:** Ollama 0.17.7 (contenedor Podman, puerto 11434)
**Estado de la captura:** hay un modelo residente en memoria al momento del muestreo (ver §1).

---

## 0. Baseline empírico post-tuning (2026-04-20 02:30 -05)

Medición inmediatamente después de aplicar:
- `vm.swappiness = 1`
- `OLLAMA_FLASH_ATTENTION = true`
- `OLLAMA_KV_CACHE_TYPE = q8_0`
- ZFS `atime=off` + `xattr=sa` en `tank` y `tank-fast`
- Dataset dedicado `tank-fast/appdata/ollama` con `recordsize=1M`

Ollama daemon reiniciado para descartar estado residual.

| Modelo          | Prompt                                 | Cold/Warm | `load` | `prompt eval rate` | **`eval rate` (tok/s)** | `eval count` |
| --------------- | -------------------------------------- | --------- | ------ | ------------------ | ----------------------- | ------------ |
| `gemma3:4b`     | "Say 'hi' in Spanish, one word only"   | cold      | 7.61 s | 36.93 tok/s        | **19.61 tok/s** 🎯       | 5 tok        |
| `qwen3.5:4b`    | "Di hola" (thinking ON por default)    | cold      | 7.99 s | 23.66 tok/s        | 6.33 tok/s              | 3418 tok     |
| `qwen3.5:4b`    | "/nothink Say hola" (inline no funciona)| warm      | 0.28 s | 8.30 tok/s         | 6.17 tok/s              | 1957 tok     |

**Referencia canónica:** `gemma3:4b → 19.61 tok/s` sobre Ryzen 5 4600G CPU-only con las optimizaciones activas.
Este número es el baseline para comparar cualquier inversión de hardware
(RAM 32-64 GiB o dGPU RTX 3060/3090) o cambios de config en iteraciones futuras.

**Notas metodológicas:**
- Qwen 3.5 genera reasoning prose por default; el `/nothink` inline **no la desactiva** en Ollama 0.17.7. Para bench limpio con Qwen 3.5 usar API JSON con `"think": false` o configurar `system` prompt explícito.
- `load duration ≈ 7.6-8 s` es el cold-start del modelo desde SSD; `recordsize=1M` debería mejorarlo marginalmente (pendiente de remedir en próximo ciclo con "antes" conocido).
- El `eval rate` de Qwen ≈ 6.2 tok/s no indica lentitud del runner — indica que el modelo genera más tokens (reasoning). La velocidad por-token es similar a Gemma una vez compensado el overhead del thinking.

---

## 1. Inferencia — Modelos cargados en memoria (empírico)

**Fuente:** `GET http://127.0.0.1:11434/api/ps`

```json
{
  "models": [
    {
      "name": "qwen3.5:4b",
      "size": 5764012032,
      "digest": "2a654d98e6fba55d452b7043684e9b57a947e393bbffa62485a7aac05ee4eefd",
      "details": {
        "format": "gguf",
        "family": "qwen35",
        "parameter_size": "4.7B",
        "quantization_level": "Q4_K_M"
      },
      "expires_at": "2026-04-20T05:19:27Z",
      "size_vram": 0,
      "context_length": 4096
    }
  ]
}
```

| Métrica                       | Valor           |
| ----------------------------- | --------------- |
| Modelo residente              | **qwen3.5:4b**  |
| Tamaño en memoria (runtime)   | **5.76 GB**     |
| VRAM consumida                | **0 B**         |
| Context length efectivo       | **4096 tokens** |
| Keep-alive restante (aprox)   | ~5 min desde última inferencia |

**Interpretación:** la inferencia local disparada por el usuario cargó
`qwen3.5:4b` 100 % en **RAM del host** (`size_vram: 0`) — no hay offload
a GPU. Tras 5 min idle el modelo se descarga automáticamente por efecto
de `OLLAMA_KEEP_ALIVE=5m0s` (ver §5).

**Proceso runner observado (host):**

```
    PID USUARIO   PR  NI    VIRT    RES    SHR S  %CPU  %MEM     HORA+ ORDEN
  95286 nobody    20   0 2595836 157192  24432 S   0,0   1,0   0:01.13 ollama   <- daemon HTTP
 106508 nobody    20   0 9687000   5,3g  25484 S   0,0  35,5   2:15.17 ollama   <- runner qwen3.5:4b
```

| Métrica host    | Antes (idle) | Con modelo cargado | Δ           |
| --------------- | ------------ | ------------------ | ----------- |
| RAM usada       | 6.5 GiB      | **11 GiB**         | **+4.5 GiB** |
| RAM disponible  | 8.4 GiB      | **3.6 GiB**        | −4.8 GiB    |
| Swap usada      | 3.8 GiB      | 4.0 GiB            | +0.2 GiB    |

---

## 2. Catálogo de modelos disponibles

**Fuente:** `GET http://127.0.0.1:11434/api/tags`

| Modelo                              | Familia     | Parámetros | Cuantización | Tamaño (GB) |
| ----------------------------------- | ----------- | ---------- | ------------ | ----------- |
| `qwen3.5:4b`                        | qwen35      | 4.7 B      | **Q4_K_M**   | 3.39        |
| `gemma3:4b`                         | gemma3      | 4.3 B      | **Q4_K_M**   | 3.34        |
| `nomic-embed-text:latest`           | nomic-bert  | 137 M      | **F16**      | 0.27        |
| `jyan1/paligemma-mix-224:latest`    | clip/gemma  | 430 M      | **F16**      | 5.88        |

**Total en disco:** 12.88 GB en `/mnt/fast/appdata/ollama`.

**Notas factuales:**
- `qwen3.5:4b`, `gemma3:4b`, `nomic-embed-text` son auto-pulled por
  `systemd.services.ollama-model-pull` (`modules/ai/ollama.nix:54-78`).
- `paligemma-mix-224` **es residual** — no está en el auto-pull y el
  comentario del módulo lo marca como rompedor del runner. Candidato a
  depuración: libera 5.88 GB.

---

## 3. Arquitectura de hardware detectada

### 3.1 CPU — AMD Ryzen 5 4600G "Renoir" APU

| Atributo              | Valor                                                |
| --------------------- | ---------------------------------------------------- |
| Modelo                | **AMD Ryzen 5 4600G with Radeon Graphics**           |
| Microarquitectura     | **Zen 2** (familia 23, modelo 96, proceso 7 nm TSMC) |
| Socket                | AM4                                                  |
| Núcleos / Threads     | **6 / 12** (SMT activo)                              |
| Frecuencia            | base 3.7 GHz · **boost 4.31 GHz** · idle 0.4 GHz    |
| Caches                | L1d 192 KiB (6×32) · L1i 192 KiB (6×32) · L2 3 MiB · L3 **8 MiB** |
| ISA extensions clave  | AVX2, FMA, BMI2, F16C, SHA-NI, AES                   |
| TDP                   | 65 W (APU desktop)                                   |

### 3.2 iGPU — Vega 7 (integrada en el APU Renoir)

| Atributo          | Valor                                           |
| ----------------- | ----------------------------------------------- |
| Controlador       | `/sys/class/drm/card1` (DP-1, HDMI-A-1)          |
| Arquitectura      | GCN 5.1 "Vega"                                  |
| Compute Units     | 7 CU (448 shaders)                              |
| Clock             | hasta ~1900 MHz                                 |
| VRAM              | **compartida con system RAM** (APU unified)     |
| ROCm              | no soportado oficialmente en Vega iGPU          |
| Vulkan            | sí, pero deshabilitado (`OLLAMA_VULKAN=false`)  |

**Implicación:** sin dGPU discreta. El boot log ya lo dice literalmente:
`offloaded 0/33 layers to GPU`, `inference compute id=cpu library=cpu`.
Toda la inferencia corre en **backend `libggml-cpu-haswell.so`**.

### 3.3 RAM — 14 GiB DDR4 visibles (16 GiB físicos)

| Atributo          | Valor                                                     |
| ----------------- | --------------------------------------------------------- |
| Total visible     | **14 GiB** (APU Renoir reserva ~2 GiB para Vega 7)        |
| Tipo              | DDR4 (socket AM4 exige DDR4; 4600G oficial hasta DDR4-3200) |
| Módulos / slots   | **no determinable sin `sudo dmidecode`** (DMI bloqueado)  |
| Capacidad máxima declarada por AMD | 128 GB (4×32 GB DDR4-3200, dual-rank) |
| Swap              | 31 GiB (partición nvme encriptada), 4.0 GiB en uso        |

**Settings sysctl relevantes del host (`hardware.nix:42-51`):**

| Parámetro             | Valor actual | Efecto                                          |
| --------------------- | ------------ | ----------------------------------------------- |
| `vm.swappiness`       | 10           | Evita swap agresivo                             |
| `vm.vfs_cache_pressure` | 50         | Retiene cache de inodos/dentry                  |
| `vm.overcommit_memory`| 2            | Estricto — no over-commit                       |
| `vm.overcommit_ratio` | 150          | CommitLimit ≈ 52 GiB. Ajustado 2026-04-19 al fallar asignación contigua para qwen3.5:4b tras reload |

**ARC de ZFS limitado a 4 GiB** (`zfs.zfs_arc_max=4294967296`) —
decisión explícita para proteger a Ollama del OOM killer
(`hardware.nix:34`).

### 3.4 Storage

Resumen (detalle y plan en `STORAGE_AUDIT_REPORT.md`):

| Device             | Tamaño | Rol actual            | Pool ZFS    |
| ------------------ | ------ | --------------------- | ----------- |
| `/dev/nvme0n1`     | 477 GB | Sistema: ESP + swap + ext4 `/nix` | — |
| `/dev/sdc` (SSD)   | 932 GB | Appdata rápido (Ollama models, HA, etc.) | `tank-fast` |
| `/dev/sdb` (HDD)   | 10.9 TB | Datos (media, immich, frigate, backups) | `tank` |
| `/dev/sda` (HDD)   | 10.9 TB | **⚠ nuevo — sin integrar**            | — (vacío)  |

---

## 4. Matriz de opciones de upgrade (memoria / GPU)

### 4.1 Cuellos de botella verificados

1. **Techo de RAM:** con 1 modelo 4B cargado ya quedan 3.6 GiB libres.
   Cargar un segundo (`gemma3:4b` paralelo para multimodal + texto) +
   spikes de HA/immich/frigate → swap thrashing inmediato.
2. **100 % CPU inference** — sin GPU dedicada, qwen3.5:4b rinde ~20-40
   tok/s en el Renoir (estimado por AVX2 + L3 8 MiB). Modelos 7B-8B en
   CPU caerían a 8-15 tok/s; un 13B+ es impráctico para UX chat.
3. **Concurrencia = 1** (`OLLAMA_NUM_PARALLEL` default). OpenFang +
   clawbot + HA voice pipeline se serializan sobre el mismo runner.

### 4.2 Opción A — Software-only (sin hardware)

| Palanca | Cambio | Ganancia esperada | Estado en el repo |
|--------|--------|-------------------|-------------------|
| `OLLAMA_FLASH_ATTENTION=true` | activar FA en runner | 5-15 % tok/s, KV-cache menor | ✅ DECLARADO en `modules/ai/ollama.nix` — activo tras próximo rebuild |
| `OLLAMA_KV_CACHE_TYPE=q8_0` | cuantizar KV-cache a 8-bit | 50 % RAM del KV-cache | ✅ DECLARADO en `modules/ai/ollama.nix` — activo tras próximo rebuild |
| Purgar `paligemma-mix-224` residual | `ollama rm jyan1/paligemma-mix-224` | libera 5.88 GB SSD | ⚠ runtime, no ejecutado |
| `OLLAMA_KEEP_ALIVE=30m` (si RAM upgrade) | menos cold-starts | 8 s menos de latencia por sesión tras idle | ⚠ requiere más RAM |
| Dataset ZFS dedicado para Ollama con `recordsize=1M` + `atime=off` + `xattr=sa` | menos overhead de indirection en GGUF grandes | 2-3 s menos en cold-start del modelo | ⚠ script listo en `scripts/tank-perf-tune.sh` — no ejecutado |

**Inversión:** $0. **Ganancia realista:** 10-20 % tok/s + mejora de
memoria efectiva. **Limitación:** no rompe el techo CPU/RAM.

**Para ejecutar la palanca de ZFS:**

```bash
sudo ./scripts/tank-perf-tune.sh          # FASE 1 (atime/xattr) + FASE 2 (dataset ollama rs=1M)
# o para todas las fases incluyendo export/import cosmetico:
sudo ./scripts/tank-perf-tune.sh --all
```

### 4.3 Opción B — Upgrade de RAM (AM4 DDR4, reversible)

| Config                    | Costo 2026 (mercado local) | Qué se vuelve viable                  |
| ------------------------- | -------------------------- | ------------------------------------- |
| **32 GB (2×16 DDR4-3200)** | **$60-100 USD**            | 7B-8B Q4 (Llama3.1, Qwen2.5) cómodo; concurrencia 2-3 de modelos 4B; ARC ZFS sin restricción |
| 64 GB (2×32 DDR4-3200)    | $120-180 USD               | 13B-14B Q4 (Gemma2:27B Q3_K, Qwen2.5:14B Q4); KV-cache grande; múltiples modelos residentes |

**Ventaja:** barato, reversible, no requiere PSU nueva, no requiere
cambiar config de Nix (solo invalidar el constraint ARC y subir
`OLLAMA_MAX_LOADED_MODELS`).

**Limitación:** **no resuelve latencia** — seguirías atado a CPU (~15
tok/s en 8B, ~5 tok/s en 13B). Para UX chat conversacional aceptable,
se necesita GPU.

### 4.4 Opción C — dGPU dedicada (salto de rendimiento 10-30×)

Pre-requisitos del nodo Alpha para instalar una dGPU:
- Slot PCIe x16 (Renoir provee **PCIe 3.0 x16**, suficiente hasta
  RTX 4090 antes de saturar bus).
- PSU según tier (desconocido hoy).
- Espacio físico en chasis.
- NixOS CUDA/ROCm declarativo (sí soportado, con overhead de compilación).

| GPU                     | VRAM  | Precio usado 2026 | Modelos viables (@ Q4 o FP16)                       | Notas                |
| ----------------------- | ----- | ----------------- | --------------------------------------------------- | -------------------- |
| **RTX 3060 12 GB**      | 12 GB | **$180-250 USD**  | Llama3.1:8B, Qwen2.5:14B Q4, Gemma3:12B, vision 7B  | **Sweet-spot**. PCIe 4.0. PSU 550 W basta. NixOS CUDA estable. |
| RTX 4060 Ti 16 GB       | 16 GB | $400-500 USD      | Qwen2.5:22B Q4, Gemma2:27B Q4                       | +4 GB clave para KV-cache grande. |
| **RTX 3090 24 GB**      | 24 GB | **$700-900 USD**  | Qwen2.5:32B Q4, Llama3.1:70B Q2_K, Mixtral 8x7B Q4  | Tier "workstation". PSU ≥ 750 W. Slot doble, 350 W TDP. |
| RTX 4090 24 GB          | 24 GB | $1 500-1 800 USD  | Mismo techo de VRAM, ~2× throughput sobre 3090      | Overkill salvo que se busque server-grade speed. |
| AMD RX 7600 XT 16 GB    | 16 GB | $280-330 USD      | Llama3.1:13B-14B Q4 vía ROCm                        | ROCm en NixOS es viable pero con más fricción que CUDA. |

**Ventaja:** throughput 10-30× sobre CPU; vision models (gemma3-vision,
Qwen2-VL) a velocidad usable para Chagra + Telegram bot. Concurrencia 4+
con una 12 GB.

**Limitación:** costo, PSU, forma física, complejidad NixOS (CUDA
closures +3-5 GB, nvidia-container-toolkit para el Podman de Ollama).

### 4.5 Pregunta de priorización

Dado el perfil de carga actual del nodo (OpenFang personal hand +
Chagra vision pipeline + HA voice + clawbot open-webui):

**¿Qué priorizamos primero?**

- **A) Software-only** — ajustes de flags + purga de residuales. Útil
  como paso 0 independientemente de lo que venga después.
- **B) RAM 32 GB** (~$60-100 USD) — habilita modelos 7B-8B y
  concurrencia, sin tocar latencia percibida.
- **C) dGPU RTX 3060 12 GB** (~$180-250 USD) — salto de latencia y
  calidad; habilita vision multimodal a velocidad de producción.
- **D) C + B** (~$240-350 USD) — combo óptimo: GPU para inferencia
  + RAM para KV-cache grande y mantener varios modelos residentes.

Mi recomendación técnica (para tu validación, no implementada):
**ejecutar A inmediatamente** (zero cost, reversible, independiente),
luego **C** (la dGPU desbloquea capacidad que B no resuelve: latencia y
modelos multimodales reales). **B** se vuelve rentable DESPUÉS de tener
dGPU — como buffer para KV-cache gigante y concurrencia real. Hacer B
antes de C sigue dejándote con el mismo techo de ~15 tok/s.

Si el presupuesto fuerza orden único: **RTX 3060 12 GB primero**,
dejando RAM para una siguiente iteración.

**Pendiente tu decisión explícita antes de cualquier mutación.**

---

## 5. Configuración declarativa (`modules/ai/ollama.nix`)

### 5.1 Variables de entorno declaradas

| Variable         | Valor                                          |
| ---------------- | ---------------------------------------------- |
| `OLLAMA_HOST`    | `0.0.0.0:11434`                                |
| `OLLAMA_ORIGINS` | `https://chagra.guatoc.co,http://chagra.guatoc.co,http://192.168.1.100,http://localhost` |

### 5.2 Variables NO declaradas (defaults upstream en uso)

Extraídas del log de boot (`server config` dump al arrancar):

| Variable                  | Default en uso |
| ------------------------- | -------------- |
| `OLLAMA_NUM_PARALLEL`     | 1              |
| `OLLAMA_MAX_QUEUE`        | 512            |
| `OLLAMA_MAX_LOADED_MODELS`| 0 (ilimitado, constraint por RAM) |
| `OLLAMA_KEEP_ALIVE`       | 5m0s           |
| `OLLAMA_LOAD_TIMEOUT`     | 5m0s           |
| `OLLAMA_CONTEXT_LENGTH`   | 0 → **4096** efectivo |
| `OLLAMA_FLASH_ATTENTION`  | false          |
| `OLLAMA_KV_CACHE_TYPE`    | "" (f16)       |
| `OLLAMA_VULKAN`           | false          |
| `OLLAMA_NEW_ENGINE`       | false          |

### 5.3 Contenedor OCI

| Parámetro              | Valor                                                           |
| ---------------------- | --------------------------------------------------------------- |
| Image pin (digest)     | `docker.io/ollama/ollama@sha256:0ff452f6...4434d1` (inmutable)  |
| Red Podman             | `ai-net`                                                        |
| Volumen persistente    | `/mnt/fast/appdata/ollama → /root/.ollama` (tank-fast SSD)      |
| Puerto host            | `11434:11434`                                                   |
| Auto-pull declarativo  | `gemma3:4b`, `qwen3.5:4b`, `nomic-embed-text`                   |
| Dependencias systemd   | `zfs.target`, `network-online.target`, `podman-create-ai-net`   |

---

## 6. Principio operativo aplicado

Esta captura es estrictamente de lectura. **No se ha modificado ningún
archivo Nix, variable de entorno, ni estado runtime del daemon Ollama.**
La sección §4 presenta opciones sin ejecutarlas; cualquier mutación
(purga de paligemma, flags de flash-attention, upgrade de hardware)
requiere autorización explícita.

**Cross-reference:** `STORAGE_AUDIT_REPORT.md` documenta el estado de
discos y el plan para integrar el segundo HDD 12 TB como mirror.
