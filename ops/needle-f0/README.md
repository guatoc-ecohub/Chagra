# Spike Needle F0

Prototipo aislado de `needle-rs` en un Web Worker, con Service Worker para cachear el runtime y los pesos. No importa este prototipo desde la PWA.

## Preparación local

El runtime probado es `needle-rs@0.1.0`, licenciado MIT. El peso no se versiona. Descargarlo así desde la raíz del repositorio:

```sh
mkdir -p _gate/needle-f0/weights
curl -L --fail https://huggingface.co/Abdalrahman/needle-rs-safetensors/resolve/main/needle.safetensors -o _gate/needle-f0/weights/needle.safetensors
curl -L --fail https://huggingface.co/Abdalrahman/needle-rs-safetensors/resolve/main/vocab.txt -o _gate/needle-f0/weights/vocab.txt
```

El runner sirve esos archivos bajo `/weights/` sin copiarlos al árbol versionado.

## Ejecución

```sh
node ops/needle-f0/runner.mjs
node ops/needle-f0/android-runner.mjs
```

El runner de escritorio usa Chromium headless, ejecuta dos function-calls en español y un control en inglés, repite una llamada caliente y vuelve a ejecutar con la red desconectada después de que el Service Worker llena la caché. El runner Android abre Chrome explícitamente en el Pixel conectado por ADB y usa CDP para medir la primera respuesta y tres repeticiones calientes.

La evidencia de esta fase debe distinguir Needle v1 del objetivo Needle 2. Este runtime no demuestra que Needle 2 tenga un paquete WASM público.
