---
name: modelo-procedural-desde-imagen
description: Reconstruir un ser vivo o objeto del valle como modelo Three.js PROCEDURAL (solo código), a partir de una imagen de referencia, con pipeline de escultura por etapas y bucle de autocorrección por visión. Úsalo cuando haya que construir una criatura/planta/objeto 3D desde una lámina o foto, escribir un spec de escultura, o generar código de un modelo por pasos. NO es fotogrametría ni descarga de packs de arte.
---

# modelo-procedural-desde-imagen

Destilado de **img2threejs** (v1.4.4, licencia **Apache-2.0** — permisiva) — su
`SKILL.md` y el pipeline `forge/`. Ver el ROBO-REPORT en
`Chagra-strategy/ops/steals/robos-2026-08-23/`. Método robado y adaptado al
dominio de Chagra (seres vivos, valle andino), NO el código de ejemplo del
upstream (que reconstruye objetos ajenos al producto).

Encaja con la doctrina propia de Chagra: **"huesos reales, piel dibujada"**
(modelos procedurales por código, no low-poly ni mallas descargadas) y con la
regla de **no sobre-afirmar** un visual. Complementa `LEY-VISUAL-VALLE.md`
(paleta/material) y `CONTRATO-GENERADOR-SERES.md` (contrato de datos de seres).

## Promesa central: esculpir desde una foto, EN ORDEN — nunca one-shot

Nunca dispares una malla completa de una. Esculpe por pasos, con evidencia por
paso:

1. **Validar** que la imagen es un objetivo 3D razonable (¿revela la forma?
   ¿lados ocultos? Dilo explícito).
2. **Evaluar** clase de objeto + complejidad y escribir un **`qualityContract`**
   ANTES de escribir código: qué features definen la identidad (para el cóndor:
   carúncula, pico ganchudo marfil, collar blanco; para una hoja: nervadura,
   pecíolo, masa —no low-poly, memoria `feedback_hojas_masa_no_lowpoly_humboldt`).
3. **Spec**: jerarquía de componentes, materiales (de la familia del valle),
   luces, pivotes, sockets, anclas de acción/animación.
4. **Construir pass-by-pass**: blockout → estructura → forma → material → luz →
   interacción → optimización. Un pass a la vez.
5. **Verificar cada pass** con captura comparada contra la referencia. **Un pass
   FALLA si una feature de identidad está mal, aunque el puntaje global se vea
   bien.** (Un gate 2D ciego al realismo 3D no basta.)

Di explícito cuando la salida es aproximada/estilizada. Una sola imagen no
revela lados ocultos ni garantiza geometría exacta — dilo en vez de fingir
confianza.

## Transparencia y anti-sobre-afirmación (crítico)

El problema: cuando el operador no puede ver qué se hizo ni dónde falló, no puede
depurar el proceso. Sobre-afirmar ("está listo" cuando la feature aún no calza)
destruye la confianza. Regla:

- Tras cada pass lista QUÉ cambió, con valores concretos: "extendí el borde del
  pico de X=-0.56 a -0.48 para cerrar el hueco con la cabeza".
- Nombra qué TODAVÍA no calza: "silueta del ala trazada pero aún plana, sin
  volumen de pluma; falta el escalonado de las primarias".
- Explica POR QUÉ se hizo cada cambio.
- Nunca digas "hecho" cuando es "mejorado" — lenguaje preciso.
- Si un gate pasa pero la inspección a ojo muestra problemas, explica el límite
  del gate.

El operador necesita poder depurar el PROCESO, no solo el output. Procesos
opacos fuerzan reinicios; procesos transparentes permiten refinar. (Esto es la
misma regla `feedback_no_certificar_mirar_critico_mostrar_crudo`: mirar crítico
por regiones, mostrar el crudo, que el operador juzgue.)

## Workflow reanudable (multi-sesión / multi-agente)

img2threejs mantiene un estado local (`forge/state.py` → `.img2threejs/state.json`)
que reporta el checklist ordenado, el próximo comando exacto y el estado del
bucle de corrección acotado; obedece el hard-stop, nunca sigas de memoria. Para
Chagra, el equivalente barato: un checklist por ser en el brief (en disco, no en
el prompt — `feedback_briefs_en_disco_no_en_prompt`), con evidencia por paso
(captura + valores) y razón de cada paso saltado.

## Routing boundary (qué NO cubre)

- No define paleta ni material → `LEY-VISUAL-VALLE.md`.
- No valida el resultado gráfico final → skill `valle-graphics-router`
  (VisualContract).
- No es el contrato de DATOS del ser (taxonomía, piso térmico) →
  `CONTRATO-GENERADOR-SERES.md` + grafo AGE.
- No descarga assets ni hace fotogrametría — es reconstrucción POR CÓDIGO.

## Atribución / licencia

Método destilado de img2threejs (Apache-2.0). Se roba el pipeline por etapas, el
`qualityContract`, la verificación por-pass y la regla anti-sobre-afirmación —
adaptados al dominio de Chagra. El código de ejemplo del upstream (armas/objetos
ajenos) NO se vendoriza.
