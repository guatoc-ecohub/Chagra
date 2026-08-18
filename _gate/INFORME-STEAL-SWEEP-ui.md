# STEAL-SWEEP: UI / Estilizado / Iconos

Fecha: 2026-08-10
Carril: opencode (big-pickle)
Cwd: /home/kortux/Workspace/chagra

---

## Estado del stack actual (verificado empíricamente)

| Capa | Actual | Dependencia |
|------|--------|-------------|
| Iconos | lucide-react ^0.577.0 | Ya en package.json |
| 3D | three ^0.180.0 + @react-three/fiber ^9.6.1 + @react-three/drei ^10.7.7 | Ya en package.json |
| Sonidos | AudioContext custom (agentSoundService, useAudioMundo, sonidosAmbientales) | Ninguna lib externa |
| Diagramas | Ninguno | N/A |

---

## 1. cortiz2894/stylized-components

- **URL**: https://github.com/cortiz2894/stylized-components
- **LICENCIA**: MIT (obligatorio atribución a Christian Ortiz / Cortiz)
- **QUÉ ES**: Colección de sistemas de render anime-inspired para web: Water (Voronoi cel-shading + ondas GPU + anillos de ripple) y GrassField (césped instanced con viento, suciedad, trampling). Cada componente es self-contained en GLSL custom, parametrizable desde Leva.
- **STACK**: Next.js 15 + Three.js + React Three Fiber + GLSL custom + GSAP + Leva + Tailwind 4
- **ESTRELLAS**: 314

### Robable concreto para nuestro proyecto

| Componente | Aplicación directa | ¿Cuándo? |
|------------|-------------------|----------|
| **WaterFloor** (cel-shaded + ripple rings + wave PDE + depth intersection glow) | Superficie de ríos/canales en el visor 3D del valle. El wave PDE simula ondas reales al caer piedras/objetos. El depth intersection glow detecta cuando raíces/troncos cruzan el agua. | Cuando el visor 3D del valle necesite cuerpos de agua estilizados |
| **GrassField** (instanced grass + wind + dirt blending + rock trampling + translucency) | Césped/vegetación baja en el visor 3D. La blending de suciedad es exactamente lo que necesitamos para transición tierra-cultivo. El trampling por rocas es aplicable a pisoteo de fauna. | Reemplazo directo del suelo plano actual en el visor 3D |
| **SkyDome** (procedural gradient + FBM clouds + stars + aurora) | Cielo del valle con ciclos día/noche. Ya tenemos mockup `ValleNoche3D.jsx` que necesita un cielo real. | Fase de ambient lighting del visor |
| **useWaterRipple** (hook para emitir ripples desde cualquier objeto R3F) | Interactividad: el usuario toca el agua y genera ondas. Los animales al caminar por el agua generan ripples. | UI/UX del visor 3D |

### Integración

- **Esfuerzo**: MEDIO. Los componentes son React Three Fiber, nuestro stack exacto. Hay que extraer los componentes del monorepo Next.js y adaptarlos a nuestro bundler (Vite). El GLSL es portable. Leva es dependencia adicional (~3KB).
- **Riesgo perf/M6000**: BAJO. El WaterFloor usa ping-pong renders (3 pasadas GPU por frame) y el GrassField usa instancing + onBeforeCompile. En M6000 (Maxwell, SM 5.2, WebGL2) debería correr sin problemas. El wave PDE es lo más pesado: 3 pasadas GPU por frame, pero con resolución configurable. En.Pixel 6 (mobile) habría que bajar resolución del wave sim.
- **Riesgo compat**: El GLSL usa `onBeforeCompile` de Three.js (patrón que ya usamos). No depende de versiones bleeding-edge.
- **Lo que falta para integrar**: Separar los componentes del scaffolding Next.js, quitar dependencia de GSAP (usar nuestro rAF loop), adaptar controles Leva a nuestro panel de debug.

---

## 2. guillermolg00/morphicons

- **URL**: https://github.com/guillermolg00/morphicons
- **LICENCIA**: MIT
- **QUÉ ES**: Morphing universal para iconos stroke-based. Cualquier icono Lucide/Tabler/Heroicons se transforma en cualquier otro con spring physics. Matemática: 2D Procrustes (alineación óptima) + interpolación polar. Cero dependencias runtime, ~7KB gzip.
- **STACK**: Core puro (sin DOM) + drivers (dom, react, vue, svelte, rn, element, astro). ESM only.
- **ESTRELLAS**: 1.6k

### Robable concreto para nuestro proyecto

| Uso | Aplicación | ¿Cuándo? |
|-----|-----------|----------|
| **Menu / X toggle** | El botón hamburguesa del PWA que abre el sidebar. Hamburger se morpha en X con spring "snappy". Ya usamos lucide-react, así que `import { Menu, X } from "lucide"` + `<MorphIcon icon={open ? X : Menu} />` es TODO el código. | Cualquier refactor de nav del PWA |
| **Toggle de sonido** | SpeakerOn / SpeakerOff morphing en el botón de sonido del mundo 3D. | UI del mundo 3D |
| **Flechas de navegación** | ChevronLeft / ChevronRight en carruseles del catálogo de especies. | Catálogo de especies |
| **Estado de sync** | RefreshCw → Check cuando termina la sincronización. El morph comunica "trabajando → listo" sin texto. | Indicador de sync |
| **Canvas target** | Los iconos del HUD del kart como texturas WebGL via OffscreenCanvas + Path2D. Cero DOM overhead, directamente como `gl.texImage2D` source. | HUD del kart si se necesita render2D sobre el canvas 3D |

### Integración

- **Esfuerzo**: BAJO. Ya tenemos lucide-react. Morphicons consume los IconNode de lucide (data, no componentes). Es un drop-in: instalar, importar MorphIcon, pasar los datos de lucide. Sin config adicional.
- **Riesgo perf/M6000**: NULO. Los morphs son SVG paths, no 3D. El spring corre en un solo rAF global compartido. 100 iconos morphing = 1 loop.
- **Riesgo compat**: Los iconos Lucide que ya tenemos son compatibles directamente (24x24 stroke-based). No necesitamos `fitIcon`.
- **Lo que falta**: `npm install morphicons`. Cambiar imports en ~5-10 componentes donde haya toggles visuales.

---

## 3. uisfx (UI Sound Effects)

- **URL**: https://github.com/romainsimon/uisfx / https://uisfx.com
- **LICENCIA**: MIT (código TypeScript) + CC0 (audio y arte de packs). **Sin restricciones de reuso.**
- **QUÉ ES**: 936 efectos de sonido UI semánticos: 78 cues (hover, press, success, error, level-up, etc.) x 12 "feels" (minimal, soft, glass, arcade, mechanical, organic, dreamy, scifi, rubber, cinematic, studio, zen). Runtime Web Audio que sintetiza recetas determinísticas localmente (no descarga archivos). ~12KB compressed.
- **ESTRELLAS**: 509

### Robable concreto para nuestro proyecto

| Cue | Aplicación en Chagra | Feel recomendado |
|-----|---------------------|-----------------|
| `success` | Tarea completada, sync exitoso, harvest registrado | `organic` (madera, agua, piedras — calza con finca) o `zen` |
| `error` | Sync fallido, validación de formulario | `organic` |
| `notification` | Nueva tarea del agente IA, alerta de clima | `soft` o `zen` |
| `toggle-on/off` | Activar/desactivar sonido, toggles de settings | `mechanical` (switches firmes) |
| `select/deselect` | Seleccionar planta en catálogo, deseleccionar | `soft` |
| `level-up` | Logro desbloqueado en el juego de la finca (DefensoresFinca) | `arcade` o `organic` |
| `processing` (loop) | Sync en progreso, IA pensando | `zen` |
| `loading` (loop) | Carga de datos desde farmOS | `soft` |
| `complete` | Proceso batch finalizado (mass-op) | `organic` |
| `drag-start/drop` | Drag and drop en planificador de siembra | `mechanical` |

### Integración

- **Esfuerzo**: BAJO-MEDIO. Actualmente tenemos `agentSoundService.js` y `useAudioMundo.js` que usan AudioContext + OscillatorNode para sonidos custom. uisfx puede:
  1. Reemplazar `agentSoundService.chime()` con `ui.play('notification')` — más rico y semántico.
  2. Complementar `sonidosAmbientales.js` con loops de `processing`/`loading`.
  3. Los sonidos del mundo 3D (ambientales de fauna) se mantienen custom (no son UI cues).
  
  Hay que respetar autoplay policy: ya lo hacemos (AudioContext se crea en gesto del usuario).

- **Riesgo perf/M6000**: NULO. Sintetiza al vuelo y cachea buffers. ~12KB compressed total. Cero downloads.
- **Riesgo compat**: Web Audio API es universal. No requiere Node.js ni bundler especial. Funciona en Chromium, Firefox, Safari. En React Native hay MP3/Ogg files portables incluidos.
- **Lo que falta**: `npm install uisfx`. Decidir feel principal (`organic` o `zen` calzan con la identidad de finca). Mapear cada cue a nuestros eventos existentes. Auditar volumen/ducking contra TTS (voz del agente IA).

---

## 4. cathrynlavery/diagram-design

- **URL**: https://github.com/cathrynlavery/diagram-design
- **LICENCIA**: MIT (código) + CC0 (iconos Simple Icons usados en los diagramas). Tabler Icons (MIT) para los 55 iconos IT.
- **QUÉ ES**: 28 tipos de diagramas editoriales como HTML autocontenido + SVG. No usa Mermaid, no usa Figma, no usa rounded-boxes genéricas. Brand matching desde URL del sitio. Incluye import de draw.io y Mermaid para redraw.
- **ESTRELLAS**: 21.5k

### Robable concreto para nuestro proyecto

| Uso | Aplicación | ¿Cuándo? |
|-----|-----------|----------|
| **Architecture diagrams** | Documentar la arquitectura del sistema (PWA ↔ sync ↔ farmOS ↔ AGE ↔ MCP servers) en ADRs y docs | Ya, para ADRs internos |
| **Flowcharts** | Flujos de sync, conflict resolution, mass-ops flow | Documentación técnica |
| **ER diagrams** | Modelo de datos Asset+Log para documentación pública (CONTRIBUTING.md visual) | Documentación |
| **Sequence diagrams** | Flujos de autenticación, secuencia de sync offline→online | ADRs |
| **Gantt** | Roadmap visual de fases del proyecto | Planificación |
| **Swimlane** | Flujos cross-actor (operador → agente IA → farmOS → ICA) | Documentación |
| **Loop/Flywheel** | El ciclo de vida de un Asset: crear → sync → observar → harvest → vender | Documentación de producto |

### Integración

- **Esfuerzo**: BAJO para uso como herramienta de documentación (no es runtime code). Es un Claude Code skill, no una librería npm. Se usa pidiéndole al agente que genere diagramas HTML. No entra en el bundle de la PWA.
- **Riesgo perf**: N/A. Los diagramas son HTML estático, se abren en browser aparte.
- **Riesgo**: CERO para el proyecto. Es documentación, no code runtime.
- **Lo que falta**: Instalar como skill de Claude Code (`/plugin marketplace add cathrynlavery/diagram-design`). Usar para redactar diagramas en ADRs y docs del repo de estrategia.

---

## 5. stylized-demos.vercel.app

- **URL**: https://stylized-demos.vercel.app
- **LICENCIA**: Mismo MIT del repo cortiz2894/stylized-components
- **QUÉ ES**: Sitio demo del item 1. Muestra Water, Grass y Painterly Effect. Solo es el showcase; todo el código vive en el repo de GitHub.
- **ROBABLE**: Nada adicional al item 1. El "Painterly Effect" (post-proceso que pinta como acuarela) es un shader de post-proceso que podría aplicarse al visor 3D del valle para darle estética artesanal, pero está como demo sin componente extraído.

---

## Ranking de prioridad para nuestro proyecto

| # | Item | ROI | Esfuerzo | Veredicto |
|---|------|-----|----------|-----------|
| 1 | **morphicons** | ALTO | BAJO | **STEAL INMEDIATO**. Drop-in con lucide-react que ya tenemos. Mejora visible de UI sin cambiar arquitectura. |
| 2 | **uisfx** | ALTO | BAJO-MEDIO | **STEAL PRONTO**. Reemplaza nuestro AudioContext manual con sonidos de calidad profesional. CC0 = cero restricción. Feel `organic` o `zen` calza con identidad. |
| 3 | **stylized-components** (WaterFloor + GrassField) | MEDIO-ALTO | MEDIO | **STEAL PARA VISOR 3D**. Stack idéntico al nuestro (R3F). Requiere extracción del monorepo Next.js. Priorizar GrassField (suelo del valle) sobre WaterFloor. |
| 4 | **diagram-design** | MEDIO | BAJO | **STEAL COMO HERRAMIENTA**. No es code runtime. Usar para ADRs y docs. Instalar como skill. |
| 5 | **Painterly Effect** (del demo site) | BAJO | MEDIO | **FUTURO**. Post-proceso estético para el valle. Baja prioridad vs. lo demás. |

---

## Anti-leak verificado

- Ninguno de los 5 links contiene nombres de personas reales de Chagra, IPs, tokens ni material sensible.
- Los repos son públicos con licencia permisiva (MIT o CC0).
- No se encontró código con licencia AGPL contagiosa en ninguno de los5.
- `stylized-components` pide atribución (MIT): cumplir poniendo crédito en credits/about del PWA o en un NOTICES file.

---

## Limitaciones de este carril

- No pude clonar repos a `/tmp` (auto-rejected por opencode). El análisis se hizo via webfetch del README y contenido renderizado. Para verificar shaders GLSL específicos o sizes exactos de bundle, un carril con acceso a `/tmp` podría clonar y medir.
- No pude verificar `package-lock.json` de morphicons para dependencias transitivas. El README dice "zero runtime dependencies" y tiene CI size gates, así que la confianza es alta pero no verificada empíricamente.
- El Painterly Effect del demo site solo se ve en el screenshot del landing; no hay componente extraído en el repo. Habría que extraerlo del shader si se necesita.
