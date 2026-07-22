# Roadmap — modos de juego NUEVOS (backlog idle)

**Estado:** análisis + backlog. Decisión del operador (menú de juegos 2026-07-16): *"analiza con
profundidad todas y las encolas como tareas de roadmap para que hagas cuando no tengas nada que hacer."*
→ estas NO son urgentes; se atacan en ratos idle, después del cableado + el pase de belleza + los
modos nuevos ganan valor cuando el toolkit y las criaturas ya estén integrados.

Base: `ops/AUDIT-JUEGOS-2026-07-16.md` + los referentes de consola. Eje: espectacularidad × funcionalidad
× **valor agroecológico para el campesino** (el que manda). Todo debe correr en Android barato y ser
grounded en el grafo AGE (742 especies), no inventado.

---

## 1. Modo RESTAURACIÓN (referente: Terra Nil) — ⭐ máxima prioridad agro
**Qué es:** un "constructor al revés". El campesino recibe un potrero degradado (suelo compactado,
sin agua, sin fauna) y lo restaura por etapas: nativas pioneras → sombra → sucesión → bosque de
alimentos, y la microcuenca revive (el agua baja limpia, vuelve la fauna). Al final, "se retira sin
huella" (la finca se sostiene sola).
- **Mecánica:** colocar especies del grafo por etapa de sucesión (aliso/nacedero/encenillo primero),
  cada acción cambia métricas reales (materia orgánica, retención de agua, biodiversidad) que el grafo
  ya modela. Feedback visual: el terreno pardo → verde, el arroyo que corre, las criaturas que vuelven
  (Oso, Cóndor, Danta como indicadores de bosque sano).
- **Valor agro (10):** es el tema del páramo + agua + restauración hecho juego. Enseña sucesión
  ecológica, nativas, ciclo del agua — el corazón de Guatoc.
- **Usa:** el grafo (GROWS_IN, sucesión, `restauracion-especies.json` que ya existe), las criaturas
  como indicadores, el toolkit para el "antes/después" del terreno.
- **Esfuerzo:** ALTO (motor nuevo de estados + progresión). Riesgo: que se vuelva abstracto — anclarlo
  a la finca real del campesino (su potrero) lo hace concreto.
- **Sinergia:** el "jefe deforestación" de MetalSlug y el `MundoSubsuelo` alimentan este modo.

## 2. La FINCA crece con datos reales (Tamagotchi × agronomía) — ⭐ mayor enganche
**Qué es:** el mundo del juego (el valle/bosque/finca) **refleja la finca REAL** del campesino. Entre
más registra y cuida de verdad (siembras, abono, observaciones vía la app), más florece su mundo:
matas que crecen, fauna que llega, el Ent más frondoso. Al abandonar, el mundo se marchita (con tacto,
nunca castigando).
- **Mecánica:** puente entre los logs reales (Asset+Log del modelo de datos ADR-019) y el estado del
  mundo 3D. No es un juego aparte: es la CAPA VIVA de `MiFincaViva`.
- **Valor agro (9):** premia el hábito real de observar y cuidar — el spine educativo (observación,
  fracaso, paciencia), sin gamificación de puntos.
- **Usa:** el modelo de datos real, el grafo, las criaturas (llegan según lo que el campesino cultiva),
  Angelita que comenta los hitos (primera cosecha, siembra que prosperó).
- **Esfuerzo:** MEDIO (el puente datos→mundo; el mundo 3D ya existe). Riesgo: privacidad/offline —
  respetar local-first.
- **Es el diferenciador #1 de Chagra**: ningún juego de finca refleja tu finca REAL.

## 3. Terminar METAL SLUG del campo — ⭐ el más barato de completar
**Qué es:** el run-and-gun agroecológico YA está diseñado en data (`metalSlugCampoData.js`): 4 niveles,
4 rehenes (fauna=POW: Oso, Borugo→revisar, Jaguar, Morrocoy), 3 jefes (sequía, deforestación,
agroquímico). Pero el JSX solo monta el nivel 1.
- **Mecánica:** montar los niveles 2-4 + los 3 jefes que ya existen en data. El "arma" reencuadrada:
  control biológico, no balas (de Terra Nil/Sakuna). Rescatar la fauna = liberar POWs.
- **Valor agro (7):** enseña amenazas reales (sequía/deforestación/agroquímico) y sus antídotos
  agroecológicos, con punch arcade de anzuelo.
- **Usa:** las criaturas como rehenes/aliados, el grafo para las plagas/controles.
- **Esfuerzo:** BAJO-MEDIO (la data existe; falta el JSX de montaje). El mejor ratio valor/esfuerzo
  para "terminar lo empezado".

## 4. POKÉDEX de las 742 + loop diario (referente: Animal Crossing)
**Qué es:** coleccionar/documentar las especies reales que el campesino encuentra en su finca (foto →
entra al grafo + a su colección), con un loop diario acogedor (razones para volver: floreció una mata,
llegó un visitante, hay que cosechar).
- **Mecánica:** cámara → reconocimiento/registro → colección (extiende `CriaturaCollection` que ya
  existe) + notificaciones diarias con sentido. AR opcional a futuro.
- **Valor agro (8):** convierte al campesino en documentador de su biodiversidad; alimenta el grafo con
  data real de campo (bucle de aprendizaje de la memoria `feedback-case-study-learning-loop`).
- **Usa:** las 742 especies del grafo, `CriaturaCollection`, la cámara/visión local.
- **Esfuerzo:** MEDIO (el reconocimiento visual es lo caro; empezar con registro manual + foto).
- **Sinergia:** con el módulo de inserción / hoja de vida por mata.

---

## Orden sugerido (cuando haya ratos idle)
1. **Terminar Metal Slug** (barato, termina lo empezado, valor claro).
2. **La finca crece con datos reales** (diferenciador #1, esfuerzo medio, engancha).
3. **Modo Restauración** (máximo valor agro, esfuerzo alto — vale un DR de diseño primero).
4. **Pokédex + loop diario** (alimenta el grafo, sinergia con visión local).

**Ideas locas asociadas** (para colar donde encajen): la finca del vecino visible (co-op de la red
humana), máquina del tiempo de restauración (adelantar 20 años), Angelita narradora estilo Miss Minutes.
