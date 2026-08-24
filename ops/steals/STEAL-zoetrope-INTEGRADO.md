# Robo-report: zoetrope

Fecha: 2026-08-24
Origen revisado: `furkankly/zoetrope`, clon local en `/tmp/robo-zoetrope`
Destino: superficies de actividad viva de la PWA Chagra

## Qué hace el robo

`zoetrope` lee un transcript JSONL append-only, lo pliega en un modelo
derivado y separa los hechos observados del reloj de presentación. Su
transporte distingue el borde live de una sesión en pausa o en el pasado. La
misma lógica sirve para replay y seguimiento en vivo, sin almacenar un campo
de estado redundante.

## Qué se integró

Se reimplementó en `src/utils/livePulse.js` una derivación pequeña y agnóstica
al dominio:

- normaliza timestamps en segundos, milisegundos o ISO;
- toma el hecho más reciente de sensores sin mutar la colección;
- deriva `live`, `idle`, `stale` o `unknown` con ventanas explícitas;
- produce copy de UI sin declarar actividad cuando no hay lectura.

`AIStatusFooter` ahora usa esa derivación. El badge ya no dice `Live` por
defecto: se actualiza cada 30 segundos y representa la antigüedad de la última
lectura disponible. El valor es efímero, se deriva en memoria y no se agrega a
Assets, Logs ni IndexedDB.

## Qué no se copió

- No se incorporó el binario Rust, el frontend WASM, `rataflow` ni el parser
  del transcript privado de Claude Code.
- No se copiaron assets, estilos ni código del robo.
- No se importó la vista NOC histórica de otra rama: su servicio pertenece al
  perímetro de operaciones y no es una dependencia de la PWA.

## Veredicto

**Integrado, patrón útil de bajo riesgo.** El valor está en distinguir estado
observado de estado presentado y en no confundir ausencia de datos con una
señal `live`. La prueba pura cubre la normalización, la selección del último
hecho y las cuatro transiciones del borde vivo.
