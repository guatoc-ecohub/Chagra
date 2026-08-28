ARREGLAR la REGRESIÓN del CAMINAR del compai (trabajo central, el operador furioso por 8 días). Rama fix/compai-caminar-huesos, off origin/dev (que ya trae el SSOT 536ffa2c). NO romper más.

PROBLEMA 1 — LOS 3 NO CAMINAN (regresión del SSOT):
- Antes (commit 8846c5149) jaguar/oso/zarigüeya SE DESPLAZABAN Y CAMINABAN (patas articulando). El SSOT (useComportamientoCompai reemplazó useCompaiRoam de 207 líneas) LO ROMPIÓ.
- useComportamientoCompai.js devuelve `caminando: moviendo` (línea ~333) pero las PATAS no se mueven. DIAGNOSTICÁ corriendo la app: ¿`moviendo` se activa (el nodo se desplaza)? ¿`caminando` se aplica como data-agt-estado='caminando' al elemento del compai (jaguarHuesos/zariguyaHuesos)? Comparalo con 8846c5149 donde SÍ caminaban (git show 8846c5149:src/hooks/useCompaiRoam.js).
- ARREGLÁ para que jaguar/oso/zarigüeya CAMINEN: se desplazan por la franja + las PATAS ARTICULAN (data-agt-estado='caminando' dispara la marcha CSS de huesos: jhPaso en jaguarHuesos.css, zhPaso/marcha en zariguyaHuesos.css).

PROBLEMA 2 — ZARIGÜEYA no articula (frames sin sentido):
- El operador aprobó el JAGUAR para REPLICAR su comportamiento de HUESOS SVG (patas que articulan) en la zarigüeya. Las láminas GEMINI son el REFERENTE del LOOK, NO frames.
- ZariguyaTrazado actual usa raster Gemini clipeado → las patas NO articulan de verdad (se ve como frames). Que la zarigüeya CAMINE con las patas moviéndose (marcha de huesos como el jaguar). zariguyaHuesos.css YA tiene la marcha (--zh-paso, postura erguida). Asegurá que las regiones de PATAS se muevan al caminar (no un raster estático). Si el raster no permite articular las patas, ajustá el rig para que las patas sean regiones móviles.

PROBLEMA 3 — CREAR zarigueya.guatoc.co: una página STANDALONE (~/demos/zariguya/index.html) que monte la ZariguyaTrazado en sus estados (idle, caminando, hablando, escuchando) lado a lado + un toggle, para probar el rig/marcha. Autocontenida.

VERIFICACIÓN DURA (el operador está harto de regresiones): NO basta con tests. Generá una captura/secuencia de FRAMES del jaguar Y la zarigüeya CAMINANDO donde se VEA que las PATAS se mueven (varios frames del ciclo de marcha). Si no se ven las patas moverse, NO está. Reportá con esos frames.
Tests verdes, build, lint. NO merge. Yo GPU-verifico + deploy zarigueya.guatoc.co. NO tg-send.

INSTRUCCIÓN COMPLETA (operador, reforzada): TODOS los compais deben HABLAR (lip-sync), ESCUCHAR (listening), VER (mirada/cámara), y CAMINAR o VOLAR según especie. ANGELITA tiene el TOTAL de comportamientos integrados = es la REFERENCIA. Todos los demás adoptan la MAYOR CANTIDAD posible, NO el mínimo. El fix del caminar NO debe romper hablar/escuchar/ver. VERIFICÁ los 4 en jaguar/oso/zarigüeya/guacamaya/abejita: hablar(boca), escuchar(estado), ver(mirada), caminar/volar(patas/alas moviéndose).
