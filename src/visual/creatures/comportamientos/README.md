# Comportamientos compartidos de los compais

Esta carpeta concentra el contrato reutilizable de conducta. La identidad, la
geometría y el arte siguen en cada creature; las keyframes siguen en los CSS
canónicos. `aplicarComportamientos()` compone snapshots declarativos y evita
que un compai nuevo tenga que conocer todos los módulos internos.

## Inventario completo de Angelita

### Idle determinista

`idleDeCreature()` usa el perfil `abeja-angelita` y una semilla estable. El
repertorio es:

- `respira`: squash and stretch continuo en contrafase.
- `vuelta`: anticipación, vuelta de campana, overshoot y asentamiento.
- `percha`: baja a una flor, reposa con alas plegadas y despega con brinquito.
- `rasca` y `sacude`: aseo corto elegido por ciclo, con decaimiento.
- `celebra`: llegada a un mundo, giro alegre y rebote.
- `acurruca`: de noche, pose `reposo`, respiración lenta y sin piruetas.

`reduced-motion` congela una pose digna. `tier: 'bajo'` conserva solo la
respiración. La misma máquina sirve para zarigüeya, jaguar, oso, chivito y
luciérnaga mediante perfiles de tempo.

### Reacciones de finca y clima

`cuerpoDeClima()` traduce `lluvia`, `niebla`, `dorada`, `soleado`, `noche` y
sequía ENSO a humedad, opacidad, tinte, velocidad de alas y altura. Angelita
añade `mojada` con gotas y brillo, `sed` con lengua y jadeo, y `comiendo` con
probóscide de libar. `animo` cambia la cadencia de antics y `energia` cambia el
aura y su radio. `ropaDeClimaBicho()` resuelve ruana de noche o frío y sombrero
con sudor de día caluroso. El vestuario es opt-in.

### Lip-sync

`visemaDesdeRMS()` resuelve V1 cerrada, V2 entreabierta, V4 fruncida y V3
abierta. `crearDebounceVisema()` evita el castañeteo de mandíbula y
`visemaFallback()` mantiene una boca viva cuando no hay señal de audio.

### Gestos y accesorios

Las poses compartidas son `vuela`, `anda`, `camina`, `celebra`, `reposo` y
`señala`. Angelita además expone `mojada`, `sed`, `comiendo`, `polen`, `gafas`
(`puesta` o `poniendose`), `cejas` (`alegres`, `altas`, `vivas`, `fruncidas`),
prop por `mundoId` y el aura de `poder`. Las gafas caen, rebotan, asientan y
destellan; las cejas pueden hacer eyebrow-flash al hablar. Gafas, cejas, ruana,
sombrero, sudor, prop y aura son capas visuales separadas, por lo que otro
compai puede usar la misma función de estado con sus propias anclas.

### Transiciones 2D y 3D

`configurarTransicion()` centraliza entrar, volver, el instante de atrape y el
instante de suelta. `AbejaTransicion` conserva el overlay de Angelita, pero los
tiempos ya son parte de la API común y pueden reutilizarse con otro componente.

### Política R1-R5

`resolverPoliticaR1R5()` expresa la presencia del compai sin acoplarla a una
especie:

- R1: anclado y no obstruye el centro.
- R2: se atenúa durante la interacción.
- R3: enseña el hint solo en idle elegible.
- R4: responde al toque y abre su menú o panel.
- R5: prioriza un aviso adaptado y descartable.

El host conserva la responsabilidad de posicionamiento, contenido, voz y
accesibilidad; la criatura solo consume el estado resultante.

### Rubber-hose

`aplicarRubberhose()` aplica los gates de animación continua y tier. La familia
comparte line-boil escalonado, aleteo con smear, sway de antenas y miembros,
blink irregular, mirada de reojo, rubor, antics `rh-antic` y `rh-travieso`,
squash and stretch, overshoot, ojos compuestos con catchlight, boca y miembros
del kit existente. En Angelita, la piel añade seis patas en tres pares, ocelos,
pilosidad del tórax, alas de tul, gotas, lengua y polen. `prefers-reduced-motion`
y el CSS de `data-tier='bajo'` siguen siendo la última barrera visual.
`faunaRubberhose.registry.js` sigue siendo el registro de aliados; la API de
esta carpeta reutiliza la ley y los gates sin importar ese registro pesado.

## Ejemplo mínimo para un compai nuevo

```js
import { aplicarComportamientos, celebrar, cuerpoDeClima } from './comportamientos/index.js';
const estado = aplicarComportamientos('jaguar', { idle: { tier: 'alto' }, clima: { estado: 'lluvia' }, gestos: celebrar() });
const pose = celebrar({ activo: true }).pose;
const clima = cuerpoDeClima('niebla', { perfil: miPerfil });
```

El dibujo del jaguar solo conecta `estado.gestos.pose.pose`,
`estado.clima`, `estado.lipsync.visema` y los `data-*` que su arte soporte.
