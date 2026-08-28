# BRIEF RESULTADO: Angelita P1

## Estado

P1 no se inició. El gate P0 encontró fallas existentes en módulos que la tarea necesita tocar, por lo que se detuvo el trabajo antes de modificar código.

## P0 ejecutado

Se instalaron las dependencias exactas del lockfile con `npm ci`, porque este worktree no tenía `node_modules` y el primer intento no pudo encontrar el binario local de Vitest.

Comando ejecutado después de preparar el entorno:

```bash
npm run test:unit -- src/hooks/__tests__/useAgentAvatarType.contract.test.jsx src/hooks/__tests__/useAgentAvatarType.test.jsx src/compai/nucleo/__tests__/elenco.test.js src/components/__tests__/ChagraAgentAvatar.test.jsx src/components/__tests__/ChagraAgentAvatarElencoUnificado.test.jsx src/components/__tests__/ChagraAgentAvatarOsoBaston.integral.test.jsx src/components/__tests__/AgentFab.silencio.test.jsx src/components/__tests__/AgentFab.temas-fase2.test.jsx src/components/__tests__/AgentFab.politica.test.jsx src/visual/agente/__tests__/AngelitaGuia.test.jsx src/visual/agente/__tests__/AngelitaNoSe.test.jsx src/visual/creatures/__tests__/creatureIdle.test.js src/visual/creatures/__tests__/GuacamayaCompai.test.jsx src/visual/creatures/__tests__/ChivitoPunk.test.jsx src/visual/mundo3d/escenas/__tests__/compaiRegistry.test.js src/visual/mundo3d/escenas/__tests__/JaguarCompaiEscena.test.jsx src/visual/mundo3d/escenas/__tests__/LuciernagaCompaiEscena.test.jsx src/visual/mundo3d/escenas/__tests__/OsoBastonCompaiEscena.test.jsx src/visual/agente/__tests__/GuacamayaEntrada.test.jsx src/visual/agente/__tests__/GuacamayaSalida.test.jsx
```

Resultado:

```text
Test Files  2 failed | 18 passed (20)
Tests       2 failed | 234 passed (236)
Errors      5 errors
Exit code   1
```

Fallas de base:

1. `src/components/__tests__/ChagraAgentAvatar.test.jsx`
   - Caso: `type="guacamaya" con API rica también recibe visema real`.
   - Esperaba `data-visema="V3"`; el nodo no recibió el atributo.

2. `src/components/__tests__/AgentFab.silencio.test.jsx`
   - Caso: `el botón (visible al tocar el compai) alterna silenciado en el store`.
   - No encontró el botón accesible `Que su compañero se quede callado` después del hover.

3. Cinco excepciones no controladas originadas durante `AgentFab.silencio.test.jsx`:
   - `src/hooks/useCompaiDraggable.js:148`
   - `TypeError: Cannot read properties of undefined (reading 'clientX')`
   - El handler intenta leer `e.touches[0].clientX` cuando no existe un toque.

## Alcance P1

- #8 elenco de siete compai: no modificado.
- #52 entrada al mundo por especie: no modificado.
- #19 perfiles idle por especie: no modificado.
- Diez estados, cara, voz, clima y guía: no modificado.
- Patinaje y estado `caminando`: no modificado.

## Pendientes

Se necesita corregir o aceptar explícitamente las fallas de base anteriores y volver a ejecutar el P0. Solo con el gate verde debe retomarse P1.

## GPU verify

No aplica todavía. No se hicieron cambios visuales ni se certificó comportamiento visual. Después de completar P1, el orquestador deberá ejecutar la verificación GPU-headed y el juez visual.
