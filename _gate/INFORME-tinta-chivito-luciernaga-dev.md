# Informe de gate: tinta de luciérnaga y chivito punk

Fecha: 2026-09-01

## Diagnóstico

En 2D, `CREATURES` todavía registraba `LuciernagaLaminaViva` y
`ChivitoPunkLaminaViva`. Los adaptadores `ChagraAgentAvatarLuciernaga` y
`ChagraAgentAvatarChivitoPunk` también importaban las implementaciones
anteriores. Por eso el selector de apariencia y las superficies que pasan por
`ChagraAgentAvatar` no montaban la tinta Trazado.

En 3D, el código fuente de `demos/3d` sí contiene las rutas necesarias:

- `luciernaga` apunta a la tinta de luciérnaga.
- `chivito-punk` apunta a la tinta de chivito.
- `chivito` se conserva como alias heredado.
- `portales.js` normaliza `chivito` a `chivito-punk`.

La rama limpia de `dev` no contiene `public/valle/compai/laminas/tintaTrazados.js`.
Ese árbol es generado por `scripts/sync-valle.mjs`, así que el resultado 3D
no se puede certificar en el despliegue de `dev` desde este worktree. No se
encontró un slug faltante en el código fuente 3D; el hueco observado es de
distribución sync/deploy.

## Cambio entregado

- El registro 2D usa `LuciernagaTrazado` y `ChivitoTrazado`.
- Los dos adaptadores del elenco usan Trazado y conservan sus contratos de
  estado, visema, clima, presencia y reduced motion.
- El chivito conserva la identidad canónica `chivito-punk`; la cresta punk se
  muestra sólo con `modo="actuando"`.
- Se actualizaron las pruebas de contrato y de registro para la nueva raíz
  Trazado.

## Gate visual

Antes de cada captura válida:

```text
VIVO :0 /tmp/xauth_ICXMso
chromium=0
```

La sonda propia importó `gate-pantalla.mjs`, confirmó pantalla viva y máquina
sola, descartó las tres primeras capturas tras cada cambio y luego guardó:

- `_gate/tinta-chivito-luciernaga-dev.png`: harness directo, fondo claro y
  oscuro, chivito normal, chivito punk actuando y luciérnaga.
- `_gate/compai-selector-luciernaga-dev.png`: selector real con luciérnaga
  elegida y FAB actualizado.
- `_gate/compai-selector-chivito-punk-dev.png`: selector real con chivito
  elegido y FAB actualizado.

Las imágenes fueron inspeccionadas. La tinta se ve en ambas variantes y el
selector cambia el personaje visible en el FAB.

La consola del harness conserva tres avisos no atribuibles a este cambio:
`VITE_FARMOS_CLIENT_ID` ausente, botones anidados en el selector y favicon
404. Por eso se certifica la lectura visual, pero no una consola limpia.

## Verificaciones

- Vitest: 6 archivos, 92 pruebas, todas pasan.
- ESLint sobre los archivos cambiados: `--max-warnings=0`, sin salida.
- Sintaxis 3D: `laminaFallback.js` y `portales.js`, sin errores.
- Artefacto 3D generado dentro de la rama limpia de `dev`: no presente.
- TypeScript global: falla con errores preexistentes en múltiples áreas del
  repositorio. La primera ejecución también señaló props requeridas en los
  dos nuevos montajes; se corrigieron con defaults. El comando global sigue
  siendo rojo por el baseline ajeno a esta tarea y no se usa como certificación
  del cambio.

## Pendiente de certificación

Abrir el despliegue real de `dev` después de ejecutar el sync del valle desde
la fuente 3D que contiene el mapeo anterior. Esa apertura debe comprobar en
pantalla las dos mitades: que desapareció la ausencia de tinta y que cada
personaje sigue leyéndose como luciérnaga y chivito punk, respectivamente.
