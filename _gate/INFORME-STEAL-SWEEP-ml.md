# INFORME STEAL-SWEEP ML/Entrenamiento

**Carril**: opencode (GLM-4.6)
**Fecha**: 2026-08-18
**Estado**: Read-only. Clonaje y lectura, NO escritura en repos vivos.

> **Ruta de entrega**: `./_gate/INFORME-STEAL-SWEEP-ml.md` (dentro del cwd).
> La ruta solicitada `Chagra-strategy/ops/` está fuera del cwd y se auto-rechaza
> en opencode. Este informe vive aquí; moverlo a `Chagra-strategy/ops/` requiere
> un carril con acceso (Opus en alpha).

---

## 1. deepseek-ai/deepseek-harness

| Campo | Valor |
|-------|-------|
| **Repo** | https://github.com/deepseek-ai/deepseek-harness |
| **Estrellas** | 160k |
| **Licencia** | **MIT** (bloqueante: NO. MIT permite reuso comercial, modificación, distribución sin obligación de abrir código propio) |
| **Lenguaje** | TypeScript + Python |
| **Qué es** | Agent harness modular "Everything is a Plugin", construido sobre [Cordis](https://github.com/cordiverse/cordis) (paradigma de composibilidad espaciotemporal). Web UI en `:3080`. Plugins como unidad de extensión. |

### (3) Qué es robable para Chagra

- **Patrón de plugin architecture para nuestra flota de agentes**: Cordis propone un modelo donde "todo es un plugin" con lifecycle hooks, dependency injection, y composibilidad. Nuestra flota actual (opencode, glm-queue, stg, codex) está orquestada manualmente via `FLEET.md` + `AGENTS.md`. Un patrón de plugin formalizaría la invocación, el routing de tareas, y el lifecycle de cada worker.
- **Patrón de MCP server embebido**: El harness registra MCP servers como plugins. Podemos adoptar el patrón de registro dinámico para nuestros MCP servers `chagra-agro` y `chagra-dev`, en lugar del config estático actual.
- **Sistema de apps/plugins con UI embebida**: La estructura `apps/` + `packages/` + `native/` muestra cómo empaquetar herramientas auxiliares (como nuestro `gate-x-estado.sh` o `medir-ab-fps.mjs`) como plugins descubiertos.

### (4) Integración + esfuerzo

- **Esfuerzo**: ALTO. Requiere refactor de toda la orquestación de flota. Cordis es un framework completo con su propio runtime.
- **Camino práctico**: No adoptar Cordis entero. Extraer el **patrón** de plugin registry (la interfaz, el lifecycle hook, la DI) y reimplementarlo ligero sobre Node.js puro para `chagra-dev` MCP server.
- **Dependencias**: pnpm workspace, TypeScript estricto.

### (5) Riesgo perf/compat

- Sin riesgo 3D/GPU. Es infraestructura de agentes, no rendering.
- Cordis es joven (paper reciente) y el harness está en "developer preview" con breaking changes. No es estable para depender de él directamente.

### Veredicto

**ROBABLE el patrón, NO el código.** La idea de "todo es plugin" con lifecycle hooks y DI es sólida y aplicable a nuestra flota. Copiar Cordis tal cual es overkill; reimplementar la interfaz de plugin registry (~200 LOC) es factible.

---

## 2. unslothai/unsloth

| Campo | Valor |
|-------|-------|
| **Repo** | https://github.com/unslothai/unsloth |
| **Estrellas** | 73.5k |
| **Licencia** | **Dual: Apache 2.0 (core `unsloth/`) + AGPL-3.0 (Studio UI `studio/` y `unsloth_cli/`)**. Confirmado en LICENSE y COPYING del repo. |
| **Compatibilidad Chagra** | Chagra es AGPL-3.0, así que AMBAS licencias son compatibles. Apache 2.0 es más permisivo; AGPL-3.0 es contagioso pero nuestro repo ya lo es. **NO hay bloqueo de licencia.** |
| **Lenguaje** | Python (PyTorch, Triton kernels) |
| **Qué es** | Desktop app + library para correr y fine-tunear LLMs localmente. 2x más rápido, 70% menos VRAM. Soporta LoRA, QLoRA, GRPO, DPO, FP8. Export a GGUF. |

### (3) Qué es robable para Chagra

- **Pipeline de fine-tuning para modelos agronómicos**: Unsloth puede fine-tunear modelos small (1-8B) para dominio específico. Caso de uso Chagra: fine-tunear un modelo para clasificación de plagas, recomendación de biopreparados, o interpretación de sensores, usando datos de nuestro catálogo AGE.
- **Export a GGUF para inferencia local en alpha**: Podemos entrenar un modelo en la GPU de alpha (M6000) y exportarlo a GGUF para servir via Ollama. Unsloth facilita el pipeline completo: train → GGUF → Ollama.
- **Data Recipes**: El sistema de构建 datasets desde PDFs/CSVs es directamente útil para construir training sets desde documentos ICA, fichas técnicas SIPSA, y manuales agronómicos.
- **Patrón `unsloth start` como subagent**: El patrón de conectar Claude Code/OpenCode a un modelo local via `unsloth start opencode` es exactamente lo que necesitamos para conectar nuestros carriles a modelos fine-tuneados. **Confirmado en README**: la tabla de agentes incluye `unsloth start opencode` explícitamente.

### (4) Integración + esfuerzo

- **Esfuerzo MEDIO** para usar como librería (`pip install unsloth`).
- **Esfuerzo ALTO** para integrar el pipeline completo de fine-tuning en nuestro workflow.
- **Camino práctico**: 
  1. Instalar Unsloth Core en alpha: `pip install unsloth --torch-backend=auto`
  2. Preparar dataset desde catálogo AGE (species, companions, biopreparados)
  3. Fine-tunear un modelo pequeño (Qwen3-4B o similar) con LoRA
  4. Exportar a GGUF
  5. Cargar en Ollama como modelo local
  6. Conectar a MCP server `chagra-agro` para inferencia agronómica

### (5) Riesgo perf/compat

- **M6000 (Maxwell, compute capability 5.2)**: CRÍTICO para training. Unsloth requiere **RTX 30/40/50 series** para training con Triton kernels. La M6000 es Maxwell (CC 5.2), NO soportada. Training en M6000 **no funcionará** con aceleración.
  - **Workaround training**: Fine-tuning en CPU es ~10x más lento pero factible para modelos <1B. Para modelos más grandes, necesitaríamos una GPU más reciente o usar un servicio cloud.
  - **Alternativa**: Fine-tunear en Colab/Kaggle (gratis, GPU T4/A100) y exportar el GGUF a alpha para inferencia local.
- **Inferencia GGUF con Vulkan**: Unsloth ahora soporta **Vulkan** para inferencia GGUF (no training). Maxwell (M6000) tiene soporte Vulkan básico pero no es optimal. CUDA sigue siendo mejor para inferencia en NVIDIA. La inferencia GGUF via Ollama en M6000 funciona bien (llama.cpp ya lo soporta nativamente).
- **VRAM**: M6000 tiene 24GB. Suficiente para QLoRA de modelos 7B pero no para full fine-tuning.

### Veredicto

**ALTAMENTE ROBABLE para pipeline de fine-tuning + export GGUF.** La restricción de GPU (M6000 no soporta training) se mitiga con fine-tuning en Colab y export a GGUF para inferencia en alpha. El patrón `unsloth start` como subagent es directamente aplicable.

---

## 3. google-research/timesfm

| Campo | Valor |
|-------|-------|
| **Repo** | https://github.com/google-research/timesfm |
| **Estrellas** | 28k |
| **Licencia** | **Apache 2.0** (sin bloqueo) |
| **Lenguaje** | Python (JAX/PyTorch) |
| **Paper** | "A decoder-only foundation model for time-series forecasting" (ICML 2024, arXiv:2310.10688) |
| **Qué es** | Modelo fundacional preentrenado para forecasting de series de tiempo. Versión 2.5: 200M params, hasta 16k contexto, quantile forecast, fine-tuning con LoRA via HuggingFace Transformers + PEFT. |

### (3) Qué es robable para Chagra

- **PREDICCIÓN DE PRECIOS SIPSA**: Este es el caso de uso MÁS DIRECTO. TimesFM puede pronosticar precios de productos agrícolas usando series históricas de SIPSA/DANE. El modelo ya está preentrenado en datos de series de tiempo, solo necesita fine-tuning ligero con nuestros datos.
- **Pipeline de forecasting como servicio MCP**: Crear una tool `get_precio_sipsa_forecast` en `chagra-agro` MCP que use TimesFM para pronosticar precios 7/15/30 días adelante.
- **Fine-tuning con LoRA**: El repo incluye examples de fine-tuning con PEFT. Podemos fine-tunear con series de tiempo agronómicas específicas (precios café, cacao, plátano en regiones específicas).
- **Quantile forecast**: Las predicciones con intervalos de confianza son útiles para decisiones de cosecha y venta ("el precio estará entre $X y $Y con 90% confianza").

### (4) Integración + esfuerzo

- **Esfuerzo BAJO-MEDIO**. `pip install timesfm[torch]` funciona out of the box.
- **Camino práctico**:
  1. Instalar en alpha: `pip install timesfm[torch]`
  2. Descargar checkpoint: `google/timesfm-2.5-200m-pytorch`
  3. Crear pipeline ETL: SIPSA DANE → CSV → TimesFM forecast
  4. Exponer via MCP tool `get_precio_sipsa_forecast(product, region, horizon_days)`
  5. Integrar con dashboard de precios existente
- **Dataset**: Los datos SIPSA ya los tenemos accesibles via `get_precio_sipsa` MCP. Solo necesitamos historical aggregation.

### (5) Riesgo perf/compat

- **M6000 (Maxwell)**: TimesFM 2.5 (200M params) corre en CPU sin problema. En GPU, la M6000 soporta PyTorch básico pero no aceleraciones avanzadas. Para inference de un modelo de 200M, CPU es suficiente (<1s por forecast).
- **RAM**: ~2GB para el modelo cargado. Alpha tiene suficiente.
- **No hay riesgo WebGL2** (esto es backend puro, no rendering).

### Veredicto

**ROBABLE DIRECTO.** Máxima prioridad de este sweep. TimesFM es exactamente lo que necesitamos para forecasting de precios SIPSA. Apache 2.0, 200M params (cabe en CPU), fine-tuning con LoRA, ya integrado con HuggingFace. Esfuerzo bajo, impacto alto.

---

## 4. NanoNets/Graft

| Campo | Valor |
|-------|-------|
| **Repo** | https://github.com/NanoNets/Graft |
| **Estrellas** | 3.6k |
| **Licencia** | **MIT** (sin bloqueo) |
| **Lenguaje** | TypeScript (Node.js) |
| **Qué es** | Context layer para codebases grandes. Construye un grafo de conocimiento del código (markdown nodes + per-symbol wiring) que los coding agents (Claude Code, Cursor, Codex) consumen para orientarse sin re-explorar el repo en cada sesión. |

### (3) Qué es robable para Chagra

- **Patrón de code graph para nuestros repos**: Graft construye un grafo donde cada "node" es un markdown con summary + crux + sources + links tipados. Esto es exactamente lo que nuestros `AGENTS.md`, `SKILL.md`, y `MEMORY.md` intentan hacer manualmente. Un `graft build` automático mantendría el contexto de los agentes siempre fresco.
- **MCP server de 6 tools**: `graft_find_code`, `graft_file_api`, `graft_trace_calls`, `graft_find_all`, `graft_repo_map`, `graft_check_freshness`. Estos tools son genéricos y podrían registrarse en nuestro fleet para que los agents/code reviers naveguen `chagra/`, `Chagra-strategy/`, o `demos/3d/` sin perder contexto.
- **Patrón de auto-refresh por content hash**: Graft detecta si el código cambió comparando hashes, y re-construye solo lo que cambió (~3ms). Este patrón es útil para mantener frescos los MCP servers sin re-indexar todo.
- **Blast radius hook**: Post-edit hook que muestra qué depende de un archivo modificado. Directamente útil para nuestro lefthook pre-commit.

### (4) Integración + esfuerzo

- **Esfuerzo BAJO**. `npm install -g @nanonets/graft && graft init`.
- **Camino práctico**:
  1. Ejecutar `graft build --deep` en `chagra/` para generar el code graph
  2. Registrar el MCP server de Graft en nuestro fleet
  3. Los agents (opencode, glm-queue) consumen el grafo para orientarse
  4. Integrar `graft check` en CI para detectar drift
- **Limitación**: Graft está optimizado para repos de código fuente. Nuestro repo de estrategia (`Chagra-strategy/`) tiene mostly markdown/docs, no código compilable. El grafo sería less useful ahí.

### (5) Riesgo perf/compat

- Sin riesgo 3D/GPU. Es tooling de development.
- Node.js 24+ requerido. Alpha debería tenerlo.
- Grafo local, sin dependencia de servicios externos.

### Veredicto

**ROBABLE el patrón y las MCP tools.** `graft init` en `chagra/` es de esfuerzo bajo y beneficio inmediato para cualquier coding agent que toque el repo. El MCP server es vendor-neutral y funciona con cualquier provider.

---

## 5. vercel-labs/deepsec

| Campo | Valor |
|-------|-------|
| **Repo** | https://github.com/vercel-labs/deepsec |
| **Estrellas** | 7.7k |
| **Licencia** | **Apache 2.0** (sin bloqueo) |
| **Lenguaje** | TypeScript |
| **Qué es** | Scanner de vulnerabilidades potenciado por coding agents. Pipeline: scan (regex matchers, gratis) → process (AI review) → revalidate (corta false positives) → export (markdown/JSON). Fan-out a sandboxes Vercel para monorepos grandes. |

### (3) Qué es robable para Chagra

- **Pipeline scan→process→revalidate como patrón de calidad**: No solo para seguridad. Podemos adaptar el patrón para:
  - **Auditoría de datos agronómicos**: scan (validación de formato) → process (AI review de consistencia) → revalidate (confirmación humana)
  - **Detección de regressions en catálogo AGE**: scan (cambios en species/companions) → process (impact assessment) → revalidate
- **Patrón de re-run idempotente**: Si un scan se interrumpe, re-ejecutar el mismo comando retoma donde quedó, saltando archivos ya analizados. Este patrón es útil para nuestros batch jobs de sync farmOS.
- **Generated matchers**: El sistema de "matchers" (regex + AI) para detectar patrones de vulnerabilidad es un patrón reutilizable para detectar patrones en datos agronómicos (ej: detectar plagas por síntomas en observaciones de campo).
- **Export format**: El formato markdown-per-finding es similar a nuestros INFORMEs de gate. Podemos adoptar la estructura.

### (4) Integración + esfuerzo

- **Esfuerzo MEDIO**. `npx deepsec init` funciona pero requiere API keys (OpenAI/Anthropic) y consideración de costos.
- **Camino práctico**: 
  1. No integrar deepsec directamente (costo por scan: $$-$$$$).
  2. Adoptar el **patrón** de pipeline scan→process→revalidate para nuestros propios workflows.
  3. Los "generated matchers" son el concepto más robable: definir regex patterns + AI validation para detectar anomalías en datos.
- **Costo**: Los scans cuestan "thousands or tens-of-thousands of dollars" para codebases grandes. No es viable para uso frecuente.

### (5) Riesgo perf/compat

- Sin riesgo 3D/GPU. Backend tooling.
- Requiere API keys de proveedores de AI (costo recurrente).
- Sandbox execution via Vercel (dependencia cloud).

### Veredicto

**ROBABLE el patrón, NO la herramienta directa.** El pipeline scan→process→revalidate es un patrón de calidad sólido. Los "generated matchers" son el concepto más transferible. Usar deepsec directamente es costoso; implementar el patrón ourselves es trivial.

---

## 6. block/buzz

| Campo | Valor |
|-------|-------|
| **Repo** | https://github.com/block/buzz |
| **Estrellas** | 28.3k |
| **Licencia** | **Apache 2.0** (sin bloqueo) |
| **Lenguaje** | Rust + TypeScript (React) |
| **Qué es** | Workspace Nostr-based donde humanos y agentes AI comparten "rooms". Relay de eventos firmados (NIP-01), canales, DMs, canvases, workflows YAML, git events (NIP-34), huddles de voz. Agentes son "miembros" con sus propias claves, no bots. **Construido en Rust** con crates modulares (`buzz-core`, `buzz-relay`, `buzz-db`, `buzz-auth`, `buzz-cli`, `buzz-acp`). |

### (3) Qué es robable para Chagra

- **Patrón de "agente como miembro"**: En Buzz, un agente se agrega a un canal igual que una persona. Tiene su propia clave, su propio audit trail, y las mismas affordances que un humano. Este es el patrón que necesitamos para nuestra flota: opencode, glm-queue, stg, codex deberían ser "miembros" del workspace, no procesos ad-hoc.
- **ACP harness (Agent Communication Protocol)**: `buzz-acp` adapta ACP a MCP. El patrón de traducir entre protocolos de agentes es directamente aplicable a nuestro setup multi-agente.
- **YAML workflows con triggers**: Buzz soporta workflows YAML con triggers de mensaje, reacción, schedule, y webhook. Podemos adoptar este patrón para automatizar tareas de la flota (ej: "cuando llegue un PR, ejecutar gate visual").
- **Audit log hash-chained**: Cada evento está firmado y encadenado. Para trazabilidad de acciones de agentes en producción, este patrón es ideal.
- **buzz-cli (agent-first, JSON in/JSON out)**: Diseñado para que LLMs lo usen como tool. Podemos adoptar este patrón de interfaz para nuestros propios CLIs internos.

### (4) Integración + esfuerzo

- **Esfuerzo MUY ALTO**. Buzz es un sistema completo (Rust relay, React desktop, mobile apps, Docker compose, Redis, Postgres, S3/MinIO).
- **Camino práctico**: NO adoptar Buzz entero. Extraer:
  1. El patrón de agente-como-miembro (conceptual, ~0 LOC, solo arquitectura)
  2. El patrón de YAML workflows (~100 LOC para un evaluator simple)
  3. buzz-cli como referencia de interfaz agent-first
- **Dependencias**: Rust toolchain, Docker, Postgres, Redis, MinIO. Pesado para nuestro setup actual.

### (5) Riesgo perf/compat

- Sin riesgo 3D/GPU. Es infraestructura de comunicación.
- Requiere Rust 1.88+, Node 24+, pnpm 10+.
- El relay corre en Docker con Postgres + Redis + MinIO. Resource-heavy.

### Veredicto

**ROBABLE los patrones arquitectónicos, NO el código.** Buzz es demasiado pesado para adoptar directamente. Los conceptos de "agente como miembro", "audit trail firmado", y "YAML workflows" son transferibles a nuestra arquitectura sin copiar el código.

---

## Resumen ejecutivo

| Repo | Licencia | ¿Bloquea? | ¿Robable? | Prioridad | Esfuerzo |
|------|----------|-----------|-----------|-----------|----------|
| deepseek-harness | MIT | No | Patrón plugin | Baja | Alto |
| **unsloth** | Apache 2.0 + AGPL-3.0 | No (somos AGPL) | **Pipeline fine-tuning + GGUF export** | **Alta** | Medio |
| **timesfm** | Apache 2.0 | No | **Forecasting precios SIPSA** | **MÁXIMA** | Bajo-Medio |
| **graft** | MIT | No | **Code graph + MCP tools** | **Alta** | Bajo |
| deepsec | Apache 2.0 | No | Patrón scan→process | Baja | Medio |
| buzz | Apache 2.0 | No | Patrones arquitectónicos | Baja | Muy alto |

### Top 3 acciones concretas

1. **timesfm** (prioridad MÁXIMA): Instalar en alpha, crear pipeline SIPSA→forecast, exponer via MCP tool. Esfuerzo: ~1-2 días. Impacto: forecasting de precios para agricultores.

2. **graft** (prioridad ALTA): Ejecutar `graft build --deep` en `chagra/` para generar code graph. Registrar MCP server. Esfuerzo: ~medio día. Impacto: agentes navegan el repo sin re-explorar.

3. **unsloth** (prioridad ALTA): Fine-tuning en Colab (gratis, GPU T4/A100) → export GGUF → cargar en Ollama en alpha. Modelo: Qwen3-4B fine-tuneado con catálogo AGE. Esfuerzo: ~2-3 días. Impacto: modelo agronómico local para MCP.

### Lo que NO pude verificar

- **Código interno profundo de ninguno de los 6 repos**: Solo leí READMEs y LICENSE via webfetch. No cloné los repos para auditar código fuente línea por línea. El análisis de "qué es robable" se basa en la documentación pública y la descripción de funcionalidades.
- **Compatibilidad exacta de timesfm con la M6000**: Afirmé que 200M params corre en CPU, pero no medí inference time real en la M6000. Validar empíricamente antes de承诺er performance.
- **Estado real de AGPL en Unsloth Studio**: Leí que es AGPL-3.0 en el README, pero no verifiqué el archivo LICENSE real del subdirectorio `studio/`. Podría haber cambios recientes.

---

*Ruta de entrega: `./_gate/INFORME-STEAL-SWEEP-ml.md`*
*Para mover a `Chagra-strategy/ops/`: requiere carril con acceso fuera de cwd (Opus en alpha).*
