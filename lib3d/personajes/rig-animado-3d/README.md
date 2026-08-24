# RiggedActor

Runtime agnóstico para modelos rigueados: mezcla clips `idle`, `walk`, `run`,
`attack` y `death`, bloquea root motion, ofrece fallback procedural y controla
la disolución de los materiales del actor.

El consumidor inyecta `model` y clips compatibles. No se agregan GLB ni un
cargador al bundle. Cada frame debe llamar `actor.update(delta, elapsed)`.

El patrón fue destilado de `rork-medieval-chess`, bajo licencia MIT. La
verificación incluida cubre el `AnimationMixer`, instalación tardía de clips,
root-motion lock y uniform de disolución. La fidelidad visual con un GLB real
requiere una captura headed, que queda pendiente para el orquestador.
