# Auditoría del Flujo de Onboarding - Simplificación Propuesta

**Fecha:** 2026-07-02  
**Autor:** GLM-4.6 (task #audit-onboarding)  
**Status:** Propuesta para Fable (implementación visual)

---

## Resumen Ejecutivo

El flujo actual de onboarding de Chagra tiene **hasta 24 pasos interactivos** (3 componentes × 18 preguntas condicionales) que pueden ser simplificados a **6-8 pasos esenciales** sin pérdida de datos críticos. Esta auditoría identifica redundancias, datos derivables y pasos opcionales que pueden fusionarse o eliminarse para reducir la fricción del cold-start.

**Impacto estimado:** Reducción del 60-70% en tiempo de onboarding (de ~8-12 minutos a ~3-5 minutos).

---

## Flujo ACTUAL (Análisis Paso a Paso)

### 1. OnboardingHero.jsx → LocationDetectedScreen.jsx

**Dato que captura:** Ubicación geográfica precisa

**Campos guardados en perfil:**
- `ubicacion_lat`, `ubicacion_lng` (coordenadas)
- `municipio`, `departamento`, `vereda` (geografía administrativa)
- `region` (texto libre "vereda, municipio, departamento")
- `finca_altitud` (msnm)
- `altitud_source` (manual | derived | cabecera | elevation_api | dado)
- `piso_termico` (derived de altitud)
- `ubicacion_accuracy` (radio de incertidumbre GPS en metros)
- `cultivos recomendados` (del piso térmico, display-only)

**UX actual:**
- Auto-detección GPS al montar (opción "Usar mi ubicación real")
- Búsqueda manual por municipio/vereda
- Dropdown cascade offline (DANE 33 deptos × 1.122 municipios)
- Mini mapa Leaflet con marcador arrastrable
- Input manual de altitud (para corregir lectura de cabecera)
- Visualización del piso térmico (montaña estratificada)
- Botón "Confirmar" → guarda y navega

**Observaciones:**
- ✅ El piso térmico SE DERIVA de la altitud (no necesita pregunta aparte)
- ✅ La confirmación visual del piso (OnboardingHero) es redundante con LocationDetectedScreen
- ⚠️ El paso "ubicación primero" es un bloqueo obligatorio (no se puede saltar)

---

### 2. OnboardingProfile.jsx (18 preguntas condicionales)

#### Categoría: IDENTIDAD (4 preguntas)

| ID | Pregunta | Tipo | ¿Esencial? | Notas |
|----|----------|------|------------|-------|
| `nombre` | ¿Cómo se llama? | text | ⭐ Sí | Personalización del agente |
| `region` | ¿En qué municipio o región cultiva? | text | ❌ No | Redundante con LocationDetectedScreen |
| `vocacion` | ¿Cómo se describe mejor? (campesino/urbano/técnico/curioso) | single | ⭐ Sí | Filtra preguntas siguientes |
| `rol` | ¿Cuál es su labor en el campo? | single | ⭐ Sí | Define chips de modo |

**Observaciones:**
- `region` es REDUNANTE: LocationDetectedScreen ya captura municipio/departamento/vereda
- `vocacion` y `rol` son similares pero `rol` es más específico para la UI

#### Categoría: FINCA (9 preguntas)

| ID | Pregunta | Tipo | ¿Esencial? | Notas |
|----|----------|------|------------|-------|
| `finca_tipo` | ¿Dónde cultiva? (rural/balcón/terraza/invernadero) | single | ⭐ Sí | Filtra preguntas |
| `finca_hectareas` | ¿Qué tamaño tiene su finca? | single | 🔧 Útil | No bloquea nada |
| `finca_altitud` | ¿A qué altura está su finca? | number | ❌ No | REDUNANTE con LocationDetectedScreen |
| `invernadero_tiene` | ¿Tiene invernadero? | single | 🔧 Útil | Para escena F2 |
| `invernadero_forma` | ¿Cómo es su invernadero? | single | 🔧 Útil | Para escena F2 |
| `invernadero_tamano` | ¿De qué tamaño es el invernadero? | text | 🔧 Útil | Para escena F2 |
| `composicion` | ¿Qué tiene en su finca? (huerta/frutales/aromaticas/animales) | multi | 🔧 Útil | Para escena F2 |
| `cultivos_actuales` | ¿Qué cultiva ahora mismo? | text | 🔧 Útil | No bloquea nada |
| `animales` | ¿Qué animales tiene? | multi | 🔧 Útil | No bloquea nada |

**Observaciones:**
- `finca_altitud` es ALTAMENTE REDUNDANTE: LocationDetectedScreen ya la captura con mejor precisión (GPS + Open-Elevation)
- Las preguntas de invernadero (`invernadero_*`) y `composicion` son útiles pero NO ESENCIALES para el cold-start

#### Categoría: EXPERIENCIA (3 preguntas)

| ID | Pregunta | Tipo | ¿Esencial? | Notas |
|----|----------|------|------------|-------|
| `anios_cultivando` | ¿Hace cuánto cultiva? | single | ❌ No | Solo para contexto del agente |
| `manejo` | ¿Cómo maneja sus cultivos? | single | ❌ No | Solo para contexto del agente |
| `problemas` | ¿Qué problemas tiene con frecuencia? | multi | ❌ No | Solo para contexto del agente |

**Observaciones:**
- Ninguna de estas afecta la UI o la funcionalidad inmediata
- Solo alimentan el bloque de perfil del agente (buildProfileContext)
- Pueden preguntarse en la primera interacción con el agente

#### Categoría: OBJETIVOS (2 preguntas)

| ID | Pregunta | Tipo | ¿Esencial? | Notas |
|----|----------|------|------------|-------|
| `objetivo` | ¿Qué quiere lograr con Chagra? | multi | ⭐ Sí | Define valor percibido |
| `cultivos_interes` | ¿Qué cultivos le gustaría sembrar o mejorar? | text | 🔧 Útil | No bloquea nada |

**Observaciones:**
- `objetivo` es ESENCIAL: define qué chips de modo mostrar primero
- `cultivos_interes` es útil pero no bloquea el flujo

#### Categoría: PREFERENCIAS (3 preguntas)

| ID | Pregunta | Tipo | ¿Esencial? | Notas |
|----|----------|------|------------|-------|
| `nivel_respuestas` | ¿Cómo prefiere que el agente le responda? | single | ❌ No | Default: simple |
| `notif_clima` | ¿Quiere alertas de clima para su zona? | single | ❌ No | Default: sí |
| `estrato` | ¿En qué estrato vive? | single | ❌ No | Solo para urbano |

**Observaciones:**
- Todas son opcionales (tienen defaults sanos)
- `estrato` es condicional (solo urbano) y de bajo impacto

#### Categoría: FINCA - ADICIONAL (3 preguntas)

| ID | Pregunta | Tipo | ¿Esencial? | Notas |
|----|----------|------|------------|-------|
| `gallinas_manejo` | ¿Cómo tiene las gallinas? | single | ❌ No | Solo si tiene gallinas |
| `restauracion_objetivo` | ¿Qué le gustaría recuperar? | multi | ❌ No | Solo si rol = restaurador/guia_glaciar |
| `espacio_urbano` | ¿Cuánto espacio tiene para cultivar? | single | ❌ No | Solo para urbano |
| `riego` | ¿Cómo riega sus cultivos? | single | ❌ No | No bloquea nada |

**Observaciones:**
- Todas son condicionales u opcionales
- No afectan la funcionalidad inmediata

---

### 3. Orquestación en App.jsx

```javascript
// Ruta actual:
'onboarding-perfil' → OnboardingProfile → al terminar → 'ubicacion-detectada' → LocationDetectedScreen → dashboard

// Detalles:
- OnboardingProfile: onComplete → navigate('ubicacion-detectada', { next: 'dashboard' })
- LocationDetectedScreen: onConfirm → navigate(currentViewData?.next || 'dashboard')
```

**Observaciones:**
- El usuario DEBE pasar por OnboardingProfile ANTES de LocationDetectedScreen
- No hay ruta directa "ubicación primero → perfil después"
- "Saltar todo" en OnboardingProfile SÍ va a LocationDetectedScreen (no se puede saltar la ubicación)

---

## Flujo PROPUESTO (Simplificación)

### Principios de diseño

1. **Ubicación primero (no opcional):** El piso térmico es el FILTRO MAESTRO de todos los módulos.
2. **Derivación sobre captura:** Si un dato se puede derivar (piso térmico → altitud), NO preguntarlo.
3. **Esencial sobre nice-to-have:** Cold-start debe capturar SOLO lo que afecta la UI inmediata.
4. **Progressive disclosure:** Preguntas secundarias (experiencia, preferencias) pueden esperarse a la primera interacción con el agente.

---

### Propuesta A: Flujo unificado (6-8 pasos esenciales)

**Componente único:** `OnboardingSimplificado.jsx` (fusiona OnboardingProfile + LocationDetectedScreen)

**Paso 1: Ubicación (reutilizar LocationDetectedScreen completo)**
- GPS auto-detect + búsqueda manual + dropdown cascade
- Input manual de altitud (opcional, para corregir cabecera)
- Montaña estratificada del piso térmico
- Confirmar → pasa al Paso 2

**Paso 2: Identidad básica (3 preguntas)**
- Nombre (opcional)
- Vocación (campesino/urbano/técnico/curioso) - FILTRO
- Rol (campesino/ganadero/restaurador/etc) - FILTRO

**Paso 3: Contexto de finca (2-4 preguntas según vocación)**
- SI `vocacion === 'urbano'`:
  - Tipo de espacio (balcón/terraza/invernadero)
  - ¿Qué quieres cultivar? (texto libre)
  
- SI `vocacion === 'campesino'` | `'tecnico'`:
  - Tipo de finca (rural/invernadero)
  - Tamaño (hectáreas - OPCIONAL)
  - Composición (huerta/frutales/aromaticas/animales - MULTI)

**Paso 4: Objetivos (1 pregunta)**
- ¿Qué quieres lograr con Chagra? (producir más/reducir químicos/aprender/registar/biodiversidad/vender)

**Paso 5: Confirmación y dashboard**
- Mostrar resumen visual:
  - "📍 Tu finca está en [Municipio], [Depto], piso [Cálido/Templado/Frío]"
  - "🌱 Tu perfil: [rol] en [tipo de finca]"
  - "🎯 Objetivo principal: [objetivo más seleccionado]"
- Botón "Comenzar" → dashboard

**Total:** 6-8 preguntas efectivas (vs 18-24 actuales)

---

### Propuesta B: Dos rutas (rápida vs completa)

**Ruta RÁPIDA (opción "Quiero respuestas ya"):**
1. Ubicación (LocationDetectedScreen completo)
2. Nombre (opcional) + Rol (campesino/ganadero/restaurador/tecnico/curioso)
3. Objetivo principal (producir más/reducir químicos/aprender/registar)
4. Dashboard

**Ruta COMPLETA (opción "Quiero contar mi historia"):**
1. Ubicación (LocationDetectedScreen completo)
2. Identidad básica (nombre + vocación + rol)
3. Contexto de finca (tipo + tamaño + composición)
4. Objetivos (multi)
5. Dashboard

**UX sugerida:**
- En OnboardingHero, debajo de "Ubicar mi finca":
  - Botón primario: "Quiero respuestas ya" → Ruta RÁPIDA
  - Botón secundario: "Quiero contar mi historia" → Ruta COMPLETA
  - Link: "Omitir todo" → Dashboard (perfil vacío, sin ubicación)

---

## Redundancias Identificadas (Eliminar)

### REDUNDANCIA #1: Altitud duplicada

**Actual:**
- `OnboardingProfile.finca_altitud` (pregunta 7 de 18)
- `LocationDetectedScreen` también captura altitud (GPS + Open-Elevation)

**Propuesta:**
- Eliminar `finca_altitud` de OnboardingProfile
- LocationDetectedScreen ES la única fuente de verdad
- El campo manual de altitud en LocationDetectedScreen es suficiente para correcciones

---

### REDUNDANCIA #2: Región duplicada

**Actual:**
- `OnboardingProfile.region` (pregunta 2 de 18): "¿En qué municipio o región cultiva?"
- `LocationDetectedScreen` captura municipio/departamento/vereda

**Propuesta:**
- Eliminar `region` de OnboardingProfile
- LocationDetectedScreen ES la única fuente de verdad
- El perfil guarda `municipio`, `departamento`, `vereda` por separado

---

### REDUNDANCIA #3: Confirmación de piso térmico

**Actual:**
- OnboardingHero muestra confirmación del piso cuando ya está detectado
- LocationDetectedScreen TAMBIÉN muestra el piso térmico

**Propuesta:**
- Eliminar la confirmación de OnboardingHero
- LocationDetectedScreen ES la única pantalla de confirmación
- OnboardingHero solo muestra CTAs ( Foto / Voz / Escribir )

---

## Derivaciones Posibles (No preguntar)

### DERIVACIÓN #1: Piso térmico

**Actual:**
- `OnboardingProfile` pregunta piso térmico implícitamente (via altitud)

**Propuesta:**
- LocationDetectedScreen DERIVA el piso de la altitud automáticamente
- NO preguntar piso térmico nunca (es un dato derivado)

---

### DERIVACIÓN #2: Cultivos recomendados

**Actual:**
- LocationDetectedScreen muestra "Cultivos recomendados para tu zona"

**Propuesta:**
- MANTENER (es valor agregado visual)
- NO requiere pregunta adicional (ya viene de `piso_termico`)

---

## Pasos Opcionales (Mover a post-onboarding)

### EXPERIENCIA (mover a primera interacción con agente)

**Mover:**
- `anios_cultivando` → Agente pregunta en primera conversación
- `manejo` → Agente pregunta si releva
- `problemas` → Agente pregunta si releva

**Justificación:**
- No afectan la UI ni la funcionalidad inmediata
- El agente puede inferirlos del contexto de la conversación
- Reduce fricción del cold-start

---

### PREFERENCIAS (mover a ProfileScreen)

**Mover:**
- `nivel_respuestas` → ProfileScreen (ajustar después)
- `notif_clima` → ProfileScreen (default: sí)
- `estrato` → Eliminar (bajo impacto)

**Justificación:**
- Todas tienen defaults sanos (simple, sí, no importa)
- No bloquean el uso de la app
- Pueden ajustarse cuando el usuario explore Perfil

---

### DETALLES DE FINCA (mover a "Completar perfil" o primera voz)

**Mover:**
- `invernadero_tiene/forma/tamano` → Primera voz "Registré mi invernadero"
- `composicion` → Inferir de primeros registros de plantas
- `cultivos_actuales` → Primer registro de planta
- `animales` → Primer registro de animal
- `gallinas_manejo` → Primer registro de gallinas
- `restauracion_objetivo` → Primera voz "Quiero restaurar..."
- `espacio_urbano` → Eliminar (bajo impacto)
- `riego` → Primera voz sobre riego

**Justificación:**
- Son detalles que se capturan mejor en el momento de registrar algo concreto
- No afectan la estructura inicial de la app
- Reducen carga cognitiva del cold-start

---

## Matriz de Decisión (Qué mantener vs qué mover)

| Pregunta | ¿Esencial? | ¿Derivable? | ¿Bloquea UI? | Decisión |
|----------|------------|-------------|--------------|----------|
| `nombre` | No | No | No | Mantener (personalización) |
| `region` | No | Sí | No | **ELIMINAR** (redundante) |
| `vocacion` | Sí | No | Sí | Mantener (filtro) |
| `rol` | Sí | No | Sí | Mantener (define chips) |
| `finca_tipo` | Sí | No | Sí | Mantener (filtro) |
| `finca_hectareas` | No | No | No | Mover a post-onboarding |
| `finca_altitud` | No | Sí | No | **ELIMINAR** (redundante) |
| `invernadero_*` | No | No | No | Mover a primera voz |
| `composicion` | No | No | No | Mover a post-onboarding |
| `cultivos_actuales` | No | No | No | Mover a primera voz |
| `animales` | No | No | No | Mover a primera voz |
| `gallinas_manejo` | No | No | No | Mover a primera voz |
| `restauracion_objetivo` | No | No | No | Mover a primera voz |
| `anios_cultivando` | No | No | No | **Mover a agente** |
| `manejo` | No | No | No | **Mover a agente** |
| `problemas` | No | No | No | **Mover a agente** |
| `objetivo` | Sí | No | Sí | Mantener (define valor) |
| `cultivos_interes` | No | No | No | Mover a post-onboarding |
| `nivel_respuestas` | No | No | No | Mover a ProfileScreen |
| `notif_clima` | No | No | No | Mover a ProfileScreen |
| `estrato` | No | No | No | **ELIMINAR** |
| `espacio_urbano` | No | No | No | **ELIMINAR** |
| `riego` | No | No | No | Mover a primera voz |

---

## Impacto Estimado

### Reducción de pasos

- **Antes:** 18-24 pasos interactivos
- **Propuesta A:** 6-8 pasos esenciales
- **Propuesta B:** 4 pasos (rápida) / 6-8 pasos (completa)
- **Reducción:** 60-70%

### Tiempo estimado

- **Antes:** ~8-12 minutos (usuario de campo)
- **Propuesta A:** ~3-5 minutos
- **Propuesta B:** ~2 minutos (rápida) / ~4-6 minutos (completa)

### Retención esperada

- **Antes:** Drop-off estimado 40-60% en OnboardingProfile (demasiadas preguntas)
- **Propuesta:** Drop-off esperado 20-30% (fricción reducida)

---

## Datos CRÍTICOS que SÍ se capturan

Tras la simplificación, el perfil todavía tendrá:

### Ubicación (source of truth)
- `ubicacion_lat`, `ubicacion_lng`
- `municipio`, `departamento`, `vereda`
- `finca_altitud` (con `altitud_source`)
- `piso_termico` (derived)

### Identidad
- `nombre` (opcional)
- `vocacion` (campesino/urbano/técnico/curioso)
- `rol` (campesino/ganadero/restaurador/tecnico/guia_glaciar/socio)

### Contexto de finca (mínimo viable)
- `finca_tipo` (rural/balcón/terraza/invernadero)
- `composicion` (opcional, multi)

### Objetivos
- `objetivo` (multi: producir más/reducir químicos/aprender/registar/biodiversidad/vender)

**Total:** 8-10 campos esenciales (vs 24 actuales)

---

## Datos que se CAPTURAN DESPUÉS (Progressive disclosure)

### Primera interacción con el agente
- `anios_cultivando`
- `manejo`
- `problemas`

### Primer registro por voz
- `cultivos_actuales` → "Registré plantas de tomate"
- `animales` → "Registré gallinas"
- `invernadero_*` → "Registré mi invernadero"
- `gallinas_manejo` → "Mis gallinas están en galpón"
- `restauracion_objetivo` → "Quiero restaurar el bosque"
- `riego` → "Tengo riego por goteo"

### ProfileScreen (ajustes)
- `nivel_respuestas` (default: simple)
- `notif_clima` (default: sí)
- `cultivos_interes` (opcional)

---

## Cambios en componentes (Para Fable)

### OnboardingHero.jsx

**Cambios:**
- Eliminar bloque de confirmación de piso térmico (líneas 157-189)
- Mantener SOLO CTAs: Foto / Voz / Escribir
- Reemplazar CTA "Prefiero contarle de mi finca con preguntas" → "Quiero contar mi historia" (Ruta COMPLETA)
- Agregar CTA "Quiero respuestas ya" (Ruta RÁPIDA)
- "Saltar todo" → Dashboard sin perfil (permite entrar rápido)

**Before:**
```jsx
{needsLocation && (
  <button onClick={() => onNavigate('ubicacion-detectada')}>
    Ubicar mi finca
  </button>
)}
<button onClick={() => onNavigate('onboarding-perfil')}>
  Prefiero contarle de mi finca con preguntas
</button>
```

**After:**
```jsx
{needsLocation && (
  <>
    <button onClick={() => onNavigate('onboarding-rapido')} className="primary">
      Quiero respuestas ya
    </button>
    <button onClick={() => onNavigate('onboarding-completo')} className="secondary">
      Quiero contar mi historia
    </button>
  </>
)}
<button onClick={() => navigate('dashboard')}>
  Omitir todo
</button>
```

---

### OnboardingProfile.jsx

**Cambios:**
- Eliminar preguntas redundantes: `region`, `finca_altitud`
- Mover preguntas opcionales a post-onboarding: `anios_cultivando`, `manejo`, `problemas`, `nivel_respuestas`, `notif_clima`, `estrato`, `espacio_urbano`, `riego`
- Mantener SOLO esenciales: `nombre`, `vocacion`, `rol`, `finca_tipo`, `objetivo`
- Reducir de 18 preguntas a 6-8

**Before (18 preguntas):**
```javascript
const PROFILE_QUESTIONS = [
  // Identidad (4)
  { id: 'nombre', ... },
  { id: 'region', ... },  // ELIMINAR
  { id: 'vocacion', ... },
  { id: 'rol', ... },
  // Finca (9)
  { id: 'finca_tipo', ... },
  { id: 'finca_hectareas', ... },  // MOVER
  { id: 'finca_altitud', ... },  // ELIMINAR
  { id: 'invernadero_tiene', ... },  // MOVER
  // ... 5 más de invernadero/composicion/animales
  // Experiencia (3)
  { id: 'anios_cultivando', ... },  // MOVER a agente
  { id: 'manejo', ... },  // MOVER a agente
  { id: 'problemas', ... },  // MOVER a agente
  // Objetivos (2)
  { id: 'objetivo', ... },
  { id: 'cultivos_interes', ... },  // MOVER
  // Preferencias (3)
  { id: 'nivel_respuestas', ... },  // MOVER a ProfileScreen
  { id: 'notif_clima', ... },  // MOVER a ProfileScreen
  { id: 'estrato', ... },  // ELIMINAR
  // ... 2 más de espacio_urbano/riego
];
```

**After (6-8 preguntas):**
```javascript
const PROFILE_QUESTIONS_ESSENCIALES = [
  // Identidad (2-3)
  { id: 'nombre', category: 'identidad', ... },
  { id: 'vocacion', category: 'identidad', ... },
  { id: 'rol', category: 'identidad', ... },
  // Finca (1-2)
  { id: 'finca_tipo', category: 'finca', ... },
  { id: 'composicion', category: 'finca', when: (a) => a.vocacion !== 'urbano', ... },
  // Objetivos (1)
  { id: 'objetivo', category: 'objetivos', ... },
];
```

---

### LocationDetectedScreen.jsx

**Cambios:**
- MANTENER intacto (ya está bien diseñado)
- Es el SOURCE OF TRUTH para ubicación y altitud
- NO requiere cambios (solo ajustes menores de copy)

---

### App.jsx

**Cambios:**
- Agregar rutas nuevas: `onboarding-rapido`, `onboarding-completo`
- Eliminar ruta `onboarding-perfil`
- Ajustar navegación para que ambos fluyan a dashboard

**Before:**
```javascript
case 'onboarding-perfil':
  return <OnboardingProfile onComplete={() => navigate('ubicacion-detectada', { next: 'dashboard' })} />;
```

**After:**
```javascript
case 'onboarding-rapido':
  return <OnboardingRapido onComplete={() => navigate('dashboard')} />;

case 'onboarding-completo':
  return <OnboardingCompleto onComplete={() => navigate('dashboard')} />;
```

---

## Plan de Implementación (Para Fable)

### Fase 1: Redefinir questions (userProfileService.js)
1. Crear `PROFILE_QUESTIONS_ESSENCIALES` (6-8 preguntas)
2. Mover preguntas opcionales a constantes separadas (para uso futuro)
3. Actualizar `buildUserProfileBlock()` para manejar perfiles parciales

### Fase 2: Crear nuevos componentes
1. `OnboardingRapido.jsx` (4 pasos)
2. `OnboardingCompleto.jsx` (6-8 pasos)
3. Reutilizar `LocationDetectedScreen.jsx` en ambos

### Fase 3: Actualizar App.jsx
1. Agregar rutas `onboarding-rapido` y `onboarding-completo`
2. Eliminar ruta `onboarding-perfil`
3. Ajustar navegación

### Fase 4: Actualizar OnboardingHero.jsx
1. Eliminar confirmación de piso térmico
2. Agregar CTAs "Quiero respuestas ya" / "Quiero contar mi historia"
3. Mantener "Omitir todo"

### Fase 5: Mover preguntas opcionales
1. Agregar preguntas de experiencia al agente (AgentScreen/prompt)
2. Agregar preferencias a ProfileScreen
3. Agregar detalles de finca a primera voz (VoiceCapture)

---

## Riesgos y Mitigaciones

### Riesgo #1: Perfiles "demasiado vacíos"

**Mitigación:**
- La ubicación SIEMPRE se captura (no es opcional)
- `vocacion` y `rol` obligatorios (definen la estructura de la app)
- `objetivo` obligatorio (define valor percibido)
- El agente puede inferir el resto del contexto

---

### Riesgo #2: Pérdida de datos para telemetría

**Mitigación:**
- Mover telemetría de `anios_cultivando` a primera interacción con agente
- Capturar `manejo` y `problemas` en las primeras 3 consultas
- NO perder datos, solo capturarlos en el momento justo

---

### Riesgo #3: Resistencia al cambio (usuarios existentes)

**Mitigación:**
- Migración suave: perfiles existentes NO se borran
- Nuevo flujo solo afecta usuarios nuevos
- Usuarios existentes pueden editar perfil en ProfileScreen

---

## Métricas de Éxito

### Métricas cualitativas
- Tiempo promedio de onboarding (goal: <5 minutos)
- Drop-off rate en OnboardingProfile (goal: <30%)
- Satisfaction score (encuesta post-onboarding)

### Métricas cuantitativas
- % de usuarios que completan onboarding (baseline vs nuevo)
- % de usuarios con ubicación confirmada (goal: >90%)
- % de usuarios que usan la app en las primeras 24h (engagement)

---

## Próximos Pasos

1. **Revisión con operador:** Validar propuesta A vs B (¿qué prefieres?)
2. **Aprobación:** ¿Procedemos con implementación?
3. **Fable:** Implementar componentes nuevos (OnboardingRapido/Completo)
4. **Tests:** Validar flujos con usuarios piloto
5. **Deploy:** Rollout gradual con feature flag

---

## Referencias

- ADR-007: Soberanía de datos (perfil 100% client-side)
- ADR-050: i18n (español Colombia, tú/usted)
- Task #200: Onboarding extendido (18 preguntas)
- Task #201: Ubicación detectada (piso térmico)
- Feedback piloto #113: "Desaparece el form plano"
- Issue #283: Respetar usuarios sin tiempo (skippable)

---

**Fin de auditoría**  
GLM-4.6 para Chagra-strategy/audit  
2026-07-02