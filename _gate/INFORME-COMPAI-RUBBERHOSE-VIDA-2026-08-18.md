# Informe de validación: vida de compais lámina-viva

Fecha: 2026-08-18  
Rama: `feat/compai-rubberhose-life`  
Destino del PR: `dev`

## Alcance

Se ajustó el kit de vida Rubberhose por compai:

- Zarigüeya: parpadeo más lento, balanceo de peso y microgestos en idle. Se conservaron cara y expresión.
- Luciérnaga: parpadeo irregular y natural, con movimiento adicional de idle.
- Oso: respiración, parpadeo y microgesto completos.
- Chivito: parpadeo natural y mejora de respiración, manos y balance corporal.

## Gate visual

- Estado de pantalla: `VIVO`.
- Chromium concurrente: `8`; la máquina no quedó sola después de esperar 5 segundos. No se mató ningún worker.
- Por esa contaminación no se reporta FPS ni se usa FPS como evidencia.
- Se capturaron 12 GIF: 4 compais × 3 distancias (`cerca`, `plano-medio`, `amplia`).
- Se probaron 3 semillas por compai y distancia: `20260807`, `20260808`, `20260809`.
- Se generaron 432 frames. Se descartaron los 3 primeros frames de cada secuencia para excluir recompilación.
- La sonda propia importó `gate-pantalla.mjs`. En este checkout las herramientas canónicas estaban disponibles en el árbol local de gates compartido y no dentro del repositorio, por eso el runner las importó desde esa ubicación.

## Lectura visual

Las comparaciones se hicieron en frames de ojos abiertos y cerrados, en cerca, plano medio y amplia.

- Zarigüeya: el cambio de ojos y el balance corporal son visibles; se sigue leyendo como zarigüeya.
- Luciérnaga: el parpadeo dejó de ser mecánico en la secuencia; antenas, cuerpo y lámpara se mantienen legibles; se lee como luciérnaga.
- Oso: la diferencia entre reposo y gesto es visible en cabeza, cuerpo y corona; se lee como oso con bastón botánico.
- Chivito: el movimiento de cuerpo, cabeza y mano acompaña el parpadeo; se lee como chivito punk.

Los cambios de semilla no alteraron la geometría de estas animaciones, que dependen del reloj y del CSS; los tres valores se conservaron como control de estabilidad.

## Verificación técnica

- Tests dirigidos: `5` archivos, `80` tests, todos pasan.
- ESLint dirigido sobre los cuatro componentes: pasa.
- `npm run build`: pasa.
- La ejecución de la suite completa conserva fallos preexistentes fuera de este alcance; no se usa como criterio de aprobación de estos cambios.

## No pude verificar

No se pudo obtener una medición FPS limpia con la máquina sola porque persistieron 8 procesos Chromium de otros carriles. El veredicto visual sí está respaldado por las capturas, pero no debe citarse como benchmark de rendimiento.
