# ESCALATE_TO_OPUS: Needle Fase 0.5 requiere recursos externos y decisiones arquitectónicas

## Razón del escalado

El task #needle-fase05 ("Needle Fase 0.5 WASM oficial Needle2 + estabilizar LoRA nan") 
no puede completarse autónomamente por GLM en este worktree aislado porque:

### 1. Recursos externos no disponibles

El WASM oficial de Needle 2 (`wasm/needle.wasm` y `needle2.cact`) NO está en el repo 
de Chagra. Según NEEDLE-F0-RESULTADO.md, estos artefactos están en el repo upstream:

> "El repositorio oficial publica artefactos `wasm/needle.wasm` y `needle2.cact`, 
> pero no fueron montados en el navegador en esta Fase 0."

Fuente: `Cactus-Compute/needle2` en HuggingFace

### 2. Requiere acceso a hardware específico

El entrenamiento LoRA necesita la CPU de alpha (según NEEDLE-F0-RESULTADO.md):

> "El intento se hizo en la CPU disponible para este carril. 
> **No quedó verificado el entrenamiento en la CPU de alpha**."

### 3. Requiere decisiones arquitectónicas

El spike F0 dio **NO-GO** para producción. La Fase 0.5 es un "GO limitado" que 
requiere decisiones sobre:

- Si integrar Needle 2 en la PWA o mantenerlo aislado en ops/
- Configuración correcta del entrenamiento LoRA para evitar `nan`
- Estrategia de despliegue para los artefactos WASM oficiales

### 4. Es continuación de spike NO-GO

Según el veredicto del spike:

> "**NO-GO para comprometer las fases productivas de Needle 2 todavía.** 
> **GO limitado para un Fase 0.5 de ingeniería:** envolver el WASM oficial 
> de Needle 2 y estabilizar el entrenamiento en una CPU de alpha."

## Qué necesita Opus

1. **Descargar artefactos WASM oficiales** desde el repo upstream
2. **Configurar acceso a CPU de alpha** para entrenamiento LoRA
3. **Implementar envoltorio WASM** para Needle 2 en worker
4. **Corregir configuración LoRA** para evitar divergencia a `nan`
5. **Decidir estrategia de integración** con la PWA

## Archivos existentes relevantes

- `ops/needle-f0/worker.js` - worker actual (Needle v1 comunitario)
- `ops/needle-f0/make-lora-dataset.mjs` - generación dataset 50 ejemplos
- `ops/NEEDLE-F0-RESULTADO.md` - análisis completo del spike

## Recursos externos necesarios

- Repo: `Cactus-Compute/needle2` en HuggingFace
- Artefactos: `wasm/needle.wasm`, `needle2.cact`, `weights/needle2.pkl`
- Hardware: CPU de alpha para entrenamiento LoRA

