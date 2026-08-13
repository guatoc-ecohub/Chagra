# Plan de Mejora: Juego Micelio

## Diagnóstico del Juego Actual

Ubicación: `_gate/dist-rive-dev/valle/juegos/micelio/main.js` (~1326 líneas)
Dependencias: `lib3d/bio/planta.js`, `lib3d/bio/tropismo.js`, `lib3d/bio/celula.js`, `lib3d/bio/rompecabezas3d.js`

### Por qué es ABURRIDO

1. **Stage 1 (Planta)**: Solo tocar partes para descubrir texto. No hay desafío, reto ni recompensa. Es un catálogo interactivo, no un juego.
2. **Stage 2 (Raíz)**: La raíz crece sola hacia el target que seleccionás. El jugador solo elige cuál, sin timing ni estrategia. No hay fracaso posible.
3. **Stage 3 (Micelio)**: 3 taps para ganar (conectar 3 pares). Sin desafío, sin timer, sin costo por malas conexiones. La planta enferma sana sola con 2+ links.
4. **Stage 4 (Célula)**: El puzzle 3D (arrastre de organelos) es la mecánica más interesante pero no se siente recompensante: no hay feedback satisfactorio al completar.
5. **No hay scoring, no hay tiempo, no hay restricciones.** El jugador puede ignorar todo y avanzar igual.

### Por qué NO FUNCIONA

1. **Stage 2 - raíz**: `updateRootStage` mueve la punta automáticamente hacia el target. El jugador no controla la dirección. Solo elige cuál target, la IA hace el trabajo.
2. **Stage 3 - micelio**: La condición de victoria es `linksMade >= 3 && sickNode.health >= 0.98`. El health sube con `dt * 0.06` cuando `linksMade >= 2`. O sea: conectá 2 cosas, esperá 3 segundos, ganás. No hay interacción del jugador con la sanación.
3. **Stage 4**: `Rompecabezas3D` depende de `DragControls` de Three.js que puede fallar en algunos contextos de embedding. Si falla silenciosamente, el jugador queda trabado sin saber por qué.
4. **Sin feedback de fracaso**: nunca hay "perdiste" o "intentá de nuevo". Esto quita todo tension.

### Por qué es DIFÍCIL DE MANEJAR

1. **Touch en3D con raycaster**: tocar nodos pequeños (esferas de 0.38-0.42 radius) en pantalla móvil es frustrante. El hitbox es pequeño y el feedback visual al tocar es mínimo (solo cambia el label).
2. **Navegación entre escalas**: los botones `+` / `−` no explican qué hacen. No hay indicador visual de qué stage estás ni cuántos quedan.
3. **Sin gesto de arrastre en Stage 2**: la raíz debería poder "guiarse" con arrastre táctil, pero solo responde a taps en targets.
4. **El intro screen** no tiene hints visuales de cómo se juega.

---

## Plan de Mejora (implementable sin arte nuevo)

### FASE 1: Controles y feedback (prioridad ALTA, sin arte nuevo)

#### 1.1 Hacer hitboxes más grandes en Stage 3 (micelio)
- Aumentar radio de hit meshes de 0.42-0.45 a 0.65 en `createMycoStage()`
- Agregar glow pulsante en nodos seleccionables (no seleccionados)
- **Línea**: `createMycoStage()` línea ~579-585

#### 1.2 Feedback visual inmediato al tocar
- Animación de "pop" al seleccionar nodo (scale bounce 1.0→1.3→1.0)
- Cambio de color del borde/label al seleccionar
- **Línea**: handler `pointerup` línea ~1153-1174

#### 1.3 Hacer que el jugador guíe la raíz (Stage 2)
- Agregar arrastre táctil/mouse que mueva la punta de la raíz en el plano XZ
- El jugador arrastra para guiar, la raíz crece en esa dirección
- Mantener targets como puntos de interés que aceleran el crecimiento
- **Línea**: `updateRootStage()` línea ~463-515

### FASE 2: Mecánica real (prioridad ALTA)

#### 2.1 Stage 3: Conexiones con costo y estrategia
- Máximo 5 conexiones permitidas (mostrar contador "3/5 enlaces")
- Conexión Planta→Planta pasa agua (buena para enferma)
- Conexión Planta→Fungus pasa nutrientes (buena para ambas)
- Conexión Fungus→Fungus pasa azúcar (activa micelio central)
- **NUEVO**: Conexión incorrecta (ej: Planta A→Planta B sin pasar por hongo) tiene costo: pierde 1 enlace
- Objetivo: tener la planta enferma con salud > 0.98 con ≤ 5 enlaces

#### 2.2 Stage 2: La raíz necesita de verdad al jugador
- La punta NO crece sola: el jugador la arrastra/guía
- Si no se mueve en 5 segundos, la raíz se marchita un poco (feedback de urgencia)
- Al llegar a un target: absorción con animación + tostada educativa

#### 2.3 Eliminar auto-link en Stage 3
- `stageMyco.autoLink()` (línea ~671-680) se llama... en ningún lado visible, pero la mecánica actual permite links directos Micelio→Planta sin pasar por el jugador
- Asegurar que solo el jugador haga conexiones

### FASE 3: Progresión y motivación (prioridad MEDIA)

#### 3.1 Sistema de puntuación por etapa
- Stage 1: puntos por velocidad al reconocer partes (10pts base, +2 por segundo restante)
- Stage 2: puntos por eficiencia de la raíz (distancia recorrida vs óptima)
- Stage 3: puntos por conexiones mínimas para sanar (menos = mejor)
- Stage 4: puntos por rapidez del puzzle

#### 3.2 Mensajes de avance con tono
- Toast messages conpersonalidad: no solo "absorbido" sino "la raíz encontró agua subterránea"
- Feedback emocional: cuando la planta enferma sana, un efecto de partículas

#### 3.3 Transiciones entre stages más claras
- Animación de zoom con contexto (mostrar qué cambia)
- Indicador de progreso global (barra de 4 etapas en el HUD)

### FASE 4: Lo que necesita ARTE (marcar para Fable)

#### 4.1 Visual del micelio real
- Hilos de micelio blancos/crema que aparecen entre nodos conectados (no solo tubos genéricos)
- Textura procedural de hifas (similar a lo que ya hace `FollajeMasa.js`)

#### 4.2Hongos/frutaciones del micelio
- Setas que aparecen cuando el micelio está activo (usando la paleta Humboldt existente)
- Brillo bioluminiscente del micelio nocturno

#### 4.3 Partículas de sanación
- Esporas/brillo cuando la planta enferma se recupera
- Efecto de "red encendida" cuando todas las conexiones están activas

---

## Orden de Implementación

1. **1.1 + 1.2** (hitboxes grandes + feedback) → arrancar acá
2. **2.3** (eliminar auto-link, asegurar control humano)
3. **2.1** (conexiones con costo)
4. **2.2** (raíz guiada)
5. **3.1 + 3.2** (scoring + mensajes)
6. **3.3** (transiciones claras)
7. **4.x** → Fable (solo marcar en código con `// TODO(Fable): arte pendiente`)

## Criterio de Aceptación

- Jugar cada stage completo en手机 táctil sin frustración
- La raíz Stage 2 responde a arrastre del jugador
- Stage 3 tiene decisiones reales (qué conectar, cuántos enlaces gastar)
- Sin errores en consola del navegador
- Funciona en iframe embebido (sala de juegos)
- Español CO, sin voseo, anti-leak
