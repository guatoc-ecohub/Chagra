---
name: valle-graphics-router
description: Enrutador + protocolo de validación visual para trabajo gráfico en el valle 3D (Three.js r160). Úsalo ANTES de escribir o tocar shaders/materiales/post-proceso del valle, y como puerta de aceptación (VisualContract) antes de dar por bueno un cambio visual. NO define paleta ni familia de material — eso lo manda LEY-VISUAL-VALLE.md.
---

# valle-graphics-router — orden de ejecución + validación visual del valle

Destilado (patrones meta, no código) de **Threejs-Awesome-Graphics-Agent-Skills**
(v0.9.1, licencia `MIT AND GPL-3.0-only`) — skills `threejs-skill-router` y
`threejs-visual-validation`. Ver el ROBO-REPORT (veredicto 9/10) en
`Chagra-strategy/ops/steals/robos-2026-08-23/`.

**Qué NO robamos y por qué:** el pack trae guías de paleta/material/vegetación.
Chagra ya tiene algo MEJOR y propio: `LEY-VISUAL-VALLE.md` + la verdad ejecutable
en `src/visual/mundo3d/direccion/` (paletaValle.js, materialValle.js, sus tests
de CI). Esa ley manda. Esta skill roba solo lo que a Chagra le FALTABA: el
**orden de ejecución** y el **protocolo de validación visual** (VisualContract).
Tampoco vendorizamos el código de ejemplo del pack (hay ejemplos GPL-3.0 y otros
WebGPU/TSL incompatibles con r160): esto son métodos, no archivos copiados.

## Cuándo usar

Antes de: escribir/editar un shader del valle, agregar post-proceso (bloom,
grading), tocar sombras/agua/atmósfera/vegetación, o certificar que un cambio
visual "quedó bien". Si vas a decir "listo/limpio", primero corré el
VisualContract de abajo.

## 1. Orden de ejecución (regla dura)

El error clásico es promptear "buenos gráficos" y empezar por el post-proceso.
Orden correcto, de silueta a brillo:

1. **Silueta y proporción** — que la forma lea sin color ni luz.
2. **Material base** — vía `crearMaterialValle(nombre)` (LEY §2). Una familia,
   tres bandas. Nada de un cuarto modelo de material en el mismo cuadro.
3. **Paleta** — solo `MUESTRAS` de `paletaValle.js` (LEY §1). Cero hex suelto.
4. **Luz y estado horario** — `CIELOS_HORA`. Los estados del día transforman
   por luz, jamás con paletas paralelas.
5. **Sombras** — estables antes que suaves. Estable > bonito.
6. **Post-proceso AL FINAL** — bloom/grading solo cuando 1-5 ya leen. El
   post-proceso NO arregla una silueta o un material malos; los esconde.

**Puerta:** si el cambio toca el paso N, no avances al N+1 hasta que N pase el
VisualContract con post-proceso APAGADO (baseline no-post).

## 2. VisualContract — protocolo de validación (la joya robada)

Un cambio visual NO está "listo" hasta que declares y verifiques un contrato de
**invariantes observables** — afirmaciones que un humano puede confirmar mirando,
no números que el ojo confirma por sesgo. Esto operacionaliza la regla del
operador: *nunca certificar un visual sin mirar crítico por regiones y mostrar el
crudo* (memoria `feedback_no_certificar_mirar_critico_mostrar_crudo`).

Antes de aceptar, escribí y chequeá:

- **Invariantes** (observables, con post-proceso APAGADO): p. ej. "el horizonte
  no muestra borde de malla", "las cards de hoja mantienen la raíz fija bajo
  viento máximo", "el rim primario se ve sin depender del bloom".
- **Baseline no-post**: capturá la escena con post-proceso apagado. Si el
  invariante solo se cumple con bloom, el invariante falla.
- **Envelope de cámara**: verificá en tres distancias — cerca, distancia de
  diseño, lejos. Un efecto que solo aguanta a la distancia de diseño no pasa.
- **Presupuesto**: ms por cuadro y MB de textura/geometría dentro del budget del
  tier (ver `usePerformanceMonitor.jsx` → `PRESUPUESTO_TIER`). Usá el HUD de FPS
  (`ValleFpsHud`, `?fps=1`) para medir en gama baja.
- **Failure conditions** (checklist anti-alucinación): nombrá explícitamente los
  modos de falla ANTES de mirar, y buscalos por regiones (lupa). Ejemplos:
  "el viento de la hoja rota alrededor del centro de la card en vez del pecíolo",
  "el agua refleja el cielo pero no absorbe por profundidad", "la sombra
  parpadea al mover la cámara".
- **Criterio de rechazo explícito**: si CUALQUIER feature que define la identidad
  del objeto está mal, se rechaza aunque el puntaje global se vea bien. Un gate
  2D que pasa (fidelidad alta) sigue siendo ciego al realismo 3D.

**Entrega:** mostrá el crudo (capturas por región, near/design/far, con y sin
post) y que el operador juzgue. No escribas "verificado"; escribí qué miraste,
qué defectos hay y qué queda sin cumplir.

## 3. Routing boundary (qué NO cubre esta skill)

- No define paleta ni familia de material → `LEY-VISUAL-VALLE.md`.
- No es pipeline de assets 3D → para eso `mint-threejs-skills` (Mint MCP).
- No reconstruye modelos desde una imagen → skill `modelo-procedural-desde-imagen`.
- No mide rendimiento adaptativo → `usePerformanceMonitor.jsx` (termostato) y el
  HUD `ValleFpsHud` (diagnóstico de página).

## Atribución / licencia

Patrones destilados de Threejs-Awesome-Graphics-Agent-Skills (`MIT AND
GPL-3.0-only`). Aquí se roban IDEAS y método (orden de ejecución, forma del
VisualContract, checklist de failure conditions), no código fuente. Si algún día
se vendoriza un ejemplo concreto del pack, verificar la traza de licencia por
ejemplo en `source_materials/example-traces.json` del upstream y respetar GPL-3.0
donde aplique.
