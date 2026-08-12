# Needle Fase 0: resultado del spike

Fecha de la medición: 2026-08-11.

## Veredicto

**NO-GO para comprometer las fases productivas de Needle 2 todavía.** Hay una señal técnica positiva, pero faltan dos pruebas que el roadmap necesita: el WASM probado en navegador es Needle v1, no Needle 2, y el LoRA mínimo de Needle 2 produjo adaptadores no válidos (`nan`) en dos corridas.

**GO limitado para un Fase 0.5 de ingeniería:** envolver el WASM oficial de Needle 2 y estabilizar el entrenamiento en una CPU de alpha. La arquitectura offline sigue siendo plausible, pero no debe entrar aún en la PWA ni en un compromiso de roadmap.

## Qué se probó

El prototipo está aislado en [`ops/needle-f0/`](./needle-f0/). No modifica la PWA de producción.

- `needle-rs@0.1.0`, runtime comunitario MIT de Needle v1, dentro de un Web Worker.
- WebAssembly: `253,839` bytes.
- Pesos INT4: `22,259,039` bytes.
- Service Worker con caché de runtime, pesos y vocabulario.
- Dos function-calls literales del encargo:
  - `registrá 3 kilos de tomate`
  - `qué biopreparado para la mosca blanca`
- Control positivo en inglés: `Book a flight from London to New York`.
- Segunda corrida con la red del contexto del navegador desconectada.
- Pixel 6 Pro real por ADB, Android 16, Chrome 151.0.7922.83.
- Base oficial Needle 2 en Python (`cactus-needle 2.0.1`) para separar el resultado del runtime v1 del modelo v2.

El runtime comunitario y sus pesos se tomaron de [needle-rs](https://github.com/Geekgineer/needle-rs) y [su repositorio de pesos](https://huggingface.co/Abdalrahman/needle-rs-safetensors). El upstream observado fue `23a638b0e3a952f62d19190680676dc790fb0fbd`.

## Medición, no pronóstico

### WASM en navegador, escritorio

El guard de pantalla reportó `VIVO`. La primera corrida fue abortada porque la pantalla estaba dormida. En la corrida válida había 8 Chromium de otros carriles; el guard dejó continuar y marcó `machineAlone: false`. Por eso estos tiempos sirven como evidencia funcional, no como benchmark de rendimiento limpio.

| Consulta | Resultado | Tiempo de llamada |
|---|---|---:|
| cosecha en español | tool correcta, pero `unidad: "3 kilos"` y falta `cantidad` | 1,425.5 ms |
| plaga en español | tool y `plaga: "mosca blanca"` correctos | 1,295.5 ms |
| control inglés | tool, origen y destino correctos | 968.1 ms |

Las tres repeticiones calientes de cosecha fueron `1,359.6`, `1,400.9` y `1,373.6 ms`. La consulta de plaga funcionó offline después de recargar con el Service Worker bajo control: `controlled: true`, sin errores de página, `1,295.7 ms`.

### Pixel real

Esta corrida empezó con `pgrep -c chromium = 0` y el guard de pantalla en `VIVO`; `machineAlone: true`. El servidor local se expuso al dispositivo mediante ADB reverse, por lo que esto mide inferencia y transporte local, no una red móvil.

| Medición | Resultado |
|---|---:|
| carga WASM + pesos ya cacheados | 112.3 ms |
| primera respuesta, cosecha | 1,625.8 ms |
| primera respuesta, plaga | 1,402.1 ms |
| warm plaga, corrida 1 | 1,401.8 ms |
| warm plaga, corrida 2 | 1,448.0 ms |
| warm plaga, corrida 3 | 1,451.3 ms |

El resultado offline del Service Worker quedó `controlled: true` en el navegador del prototipo. La extracción de cosecha mantuvo el mismo defecto semántico del runtime v1.

La telemetría se imprimió antes del cierre del navegador remoto. El harness tenía un defecto de limpieza con conexiones HTTP persistentes y dejó un servidor local huérfano; se identificó por puerto, se cerró el proceso propio y se verificó que no quedara escuchando. No se detuvo ningún Chromium de otro carril. La rutina de cierre queda corregida en `android-runner.mjs`, pero el cierre limpio posterior no se volvió a certificar con una corrida completa.

### Needle 2 oficial, base sin fine-tune

En Python, con la base oficial y el mismo contrato de tools, Needle 2 respondió:

```json
{
  "registrar_cosecha": {
    "cantidad": 3,
    "unidad": "kg",
    "cultivo": "tomate"
  }
}
```

Para la mosca blanca devolvió `consultar_control_plaga({"plaga":"mosca blanca"})`. El resultado es una señal positiva de español en el modelo v2, pero la confianza fue `0.0` para cosecha y `0.0005` para plaga. Con cualquier umbral razonable de actuación, ambos casos deben escalar o pedir confirmación. La ejecución fue de escritorio, no WASM ni Pixel.

El repositorio oficial publica artefactos `wasm/needle.wasm` y `needle2.cact`, pero no fueron montados en el navegador en esta Fase 0. Por lo tanto, la afirmación verificada es solamente: **Needle v1 comunitario corre offline en navegador y Pixel; Needle 2 corre offline en Python de escritorio.**

## Español y LoRA

Se generó un corpus local de exactamente 50 ejemplos JSONL, 25 de cosecha y 25 de consulta de plaga, con schemas y respuestas gold. No se usó OpenRouter ni ningún generador cloud. El archivo reproducible es [`lora-50.jsonl`](./needle-f0/lora-50.jsonl), generado por [`make-lora-dataset.mjs`](./needle-f0/make-lora-dataset.mjs).

Se instaló `cactus-needle 2.0.1` y `jax 0.10.2` con backend `cpu`. El comando LoRA se ejecutó dos veces:

1. rank 4, alpha 8, learning rate `1e-4`.
2. rank 4, alpha 8, learning rate `1e-6`.

Ambas corridas procesaron los 50 ejemplos. En las dos, el paso 1 produjo una pérdida finita y el paso 2 pasó a `nan`; los adaptadores guardados contienen valores no finitos. No se construyó un `.cact` tuneado ni se afirmó una mejora.

La base se descargó desde el archivo público `weights/needle2.pkl` de [Cactus-Compute/needle2](https://huggingface.co/Cactus-Compute/needle2), porque el comando por defecto buscaba una ruta inexistente `checkpoints/needle2.pkl`. El intento se hizo en la CPU disponible para este carril. **No quedó verificado el entrenamiento en la CPU de alpha**.

## Interpretación

- El camino de caché offline funciona de extremo a extremo para el runtime comunitario probado.
- El modelo oficial Needle 2 entiende los dos ejemplos de español sin fine-tune, pero su confidence gate no permite actuar con seguridad.
- La latencia observada en Pixel para el runtime v1, aproximadamente `1.4 a 1.6 s` por llamada, es usable como NLU de una interacción de voz, pero está muy por encima del pronóstico de `0.1 a 0.3 s` del plan. El STT sigue sin medirse y probablemente dominará la cadena completa.
- La extracción correcta del modelo oficial v2 no demuestra que el paquete WASM oficial tenga la misma ruta de despliegue.
- El LoRA mínimo no es evidencia de mejora: ambas pérdidas divergen a `nan`.

## No pude verificar

- Needle 2 oficial dentro de un Web Worker WASM y funcionando offline.
- Latencia del artefacto oficial `needle2.cact` en el Pixel.
- Fine-tune LoRA estable en la CPU de alpha.
- Comparación base versus LoRA con accuracy, porque no existe un adaptador finito que evaluar.
- STT, TTS o resolución de datos agro locales. Esta Fase 0 solo mide NLU/function-calling.
- Un gate de confidence calibrado para español campesino. Los valores observados son casi cero.

## Próximo gate necesario

Antes de Fase 1, hace falta una reproducción mínima en alpha que: cargue explícitamente `needle2.pkl`, ejecute el mismo corpus sin generación externa, elimine el `nan` con una configuración explicada y compare al menos las 50 respuestas base contra las 50 tuneadas. En paralelo, hay que montar `wasm/needle.wasm` y `needle2.cact` en el mismo Web Worker del prototipo. Hasta que ambas pruebas pasen, el veredicto operativo permanece **NO-GO**.
