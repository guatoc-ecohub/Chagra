# ENTREGA POR PERFIL — Chagra v1.0.52

Quick-reference de que ve cada tipo de usuario al abrir la app, segun el
perfil del onboarding. El motor de seleccion adaptativa (`homeModuleSelector` +
`profileChipSelector`) filtra modulos, chips del agente y tarjetas de
seguimiento por perfil, sin que el usuario tenga que configurar nada.

---

## Tabla rapida

| Perfil | Home modules | Chips agente | Seguimiento | Tile glaciar |
|--------|-------------|-------------|-------------|-------------|
| **Campesino** | Hoy en finca, Clima, Plantas, Plagas, Bitacora, Insumos, Zonas, Informes, Analisis | Siembro, Calendario, Plaga, Biopreparado, Clima | (ninguna por defecto) | Si whitelist |
| **Urbano** | Plantas, Plagas, Bitacora, Clima, Hoy en finca | Siembro, Calendario, Plaga | (ninguna) | No |
| **Ganadero** | = Campesino + Silvopastoreo | Siembro, Calendario, Plaga, Biopreparado, Clima, Silvopastoreo | Silvopastoreo (+ Cerdos si tiene cerdos) | Si whitelist |
| **Restaurador** | Clima, Hoy en finca, Plantas, Plagas, Bitacora, Biodiversidad | Restauracion, Paramo, Silvopastoreo, Siembro, Clima | Reforestacion, Paramo | Si whitelist |
| **Guia glaciar** | Clima, Hoy en finca, Biodiversidad | Clima, Paramo (set reducido alta montana) | Paramo, Reforestacion | Si (propio) |
| **Socio/aliado** | Hoy en finca, Plantas, Clima, Informes | Segun rol derivado | (ninguna) | Si whitelist |
| **Tecnico/agr.** | TODO (11 modulos) | TODO | Las 4 (Reforestacion, Silvopastoreo, Paramo, Cerdos) | Si whitelist |
| **Operador** | TODO (11 modulos) | TODO | Las 4 | Si (siempre) |

---

## Referencia de captura de pantalla

Para documentar cada perfil, abrir la app en el navegador y:

1. Limpiar localStorage: `localStorage.clear()` en DevTools > Console.
2. Completar el onboarding (`/onboarding-perfil`) con las respuestas del perfil
   objetivo (ver seccion abajo).
3. Capturar el home completo (scroll incluido si hace falta) con:
   - **Chrome DevTools**: `Ctrl+Shift+P` > "Capture full size screenshot"
   - **Firefox**: boton derecho > "Take Screenshot" > "Save full page"
   - **CLI Playwright**: `npx playwright screenshot --full-page http://localhost:5173 screenshot.png`
4. Nombrar el archivo: `screenshots/entrega-<perfil>-<fecha>.png`

---

## Por perfil

### Campesino (productor agricola)

**Quien es**: Vive del campo, cultiva para comer y vender. Tiene finca con
varias especies, maneja biopreparados, le importa el clima.

**Respuestas del onboarding**:
- `rol`: campesino
- `vocacion`: produccion
- `finca_tipo`: rural
- `cultivos_interes`: los que tenga

**Que VE en el home**:

1. **AgentHero** — saludo regional del colibri Chagra, entrada de texto/voz al
   agente IA.
2. **Hoy en finca** — clima honesto de hoy, fase lunar, agenda campesina de la
   semana.
3. **ClimaStrip** — tarjeta de clima con pronostico Open-Meteo + fase ENSO
   (IDEAM).
4. **Plantas** — contador de cultivos activos, acceso rapido a "Mis plantas".
5. **Plagas** — acceso a reporte de plagas y malezas invasoras.
6. **Bitacora** — historial de actividades (siembras, cosechas, aplicaciones).
7. **Insumos** — inventario de biopreparados, bodega.
8. **Zonas** — gestion de areas de la finca (lotes, camas, surcos).
9. **Informes** — descarga de reportes en CSV.
10. **Analisis IA** — analisis proactivo del agente sobre la finca (sin que el
    usuario pregunte).

**Chips del agente** (toolbar bajo el compositor):
- Siembro (que sembrar a mi altitud)
- Calendario (fechas clave del cultivo)
- Plaga (diagnostico por sintoma)
- Biopreparado (recetas de caldos organicos)
- Clima (pronostico y ENSO)

**Tarjetas de seguimiento**: ninguna por defecto. Si el perfil indica animales
(ganado), se activa Silvopastoreo. Si indica cerdos, se activa Cerdos.

---

### Urbano (balcon / terraza)

**Quien es**: Vive en ciudad, cultiva en materas o terraza. No maneja ganado
ni parcelas grandes.

**Respuestas del onboarding**:
- `vocacion`: urbano **o** `finca_tipo`: balcon / terraza

**Que VE en el home** (set minimo):
1. AgentHero
2. Plantas
3. Plagas
4. Bitacora
5. Clima
6. Hoy en finca

**NO ve**: Zonas, Insumos, Informes, Analisis IA, tarjetas de seguimiento
(cerdos, silvopastoreo, reforestacion, paramo).

**Chips del agente**: Siembro, Calendario, Plaga (set reducido).

---

### Ganadero (productor pecuario)

**Quien es**: Maneja ganado (bovino, porcino, avicola). Combina pastoreo con
arboles (silvopastoreo).

**Respuestas del onboarding**:
- `rol`: ganadero (o campesino + `animales`: [ganado/cerdos/gallinas])
- `animales`: los que maneje

**Que VE en el home**: = Campesino (todos los modulos) mas las tarjetas de
seguimiento:
- **Silvopastoreo** — siempre visible si tiene animales
- **Cerdos** — solo si `animales` incluye "cerdos" o se detecta en texto libre

**Chips del agente**: = Campesino + Silvopastoreo.

---

### Restaurador (ecologico / institucional)

**Quien es**: Trabaja en restauracion ecologica, reforestacion con nativas,
conservacion de paramos. Puede ser institucion (ONG, CAR, alcaldia).

**Respuestas del onboarding**:
- `rol`: restaurador
- `objetivo`: [biodiversidad]
- `restauracion_objetivo`: segun el proyecto

**Que VE en el home**: Campesino-core (Hoy en finca, Clima, Plantas, Plagas,
Bitacora) + Biodiversidad. Tarjetas de seguimiento: Reforestacion + Paramo.

**Chips del agente**:
- Restauracion (arboles nativos a mi altura)
- Paramo (conservacion de paramo y agua)
- Silvopastoreo
- Siembro
- Clima

---

### Guia de glaciar (La Cordada)

**Quien es**: Guia de alta montana, monitorea el glaciar, reporta condiciones
para el equipo de La Cordada. Acceso RESTRINGIDO (whitelist en `glaciarAccess`).

**Respuestas del onboarding**:
- username en whitelist Cordada (lo resuelve `glaciarAccess.js`)

**Que VE en el home** (set de alta montana):
- Clima (prioritario para condiciones de ascenso)
- Hoy en finca
- Biodiversidad (flora y fauna de paramo)

**Tile glaciar**: visible solo para usuarios en la whitelist. Abre el modulo
"Reporte de Punto Glaciar" (`GlaciarReporteScreen`).

**Chips del agente**: Clima, Paramo (set reducido, enfocado en alta montana).

---

### Socio / aliado

**Quien es**: Aliado estrategico, observador, socio de la red. Ve datos
agregados, no gestiona cultivos.

**Respuestas del onboarding**:
- `rol`: socio

**Que VE en el home** (set de lectura):
- Hoy en finca
- Plantas
- Clima
- Informes

**Tarjetas de seguimiento**: ninguna.

---

### Tecnico / agronomo

**Quien es**: Extensionista, tecnico de campo, agronomo que acompana varios
productores. Ve TODO: modo supervisor con panel multi-finca si el feature flag
`VITE_FEATURE_EXTENSIONISTA` esta activo.

**Respuestas del onboarding**:
- `rol`: tecnico

**Que VE en el home**: TODOS los modulos (11) + las 4 tarjetas de seguimiento.

**Chips del agente**: TODOS los disponibles.

**Panel extensionista** (`ExtensionistaScreen`): visible si el feature flag
esta activo y el usuario tiene rol. Permite ver multiples fincas en un panel
supervisor.

---

### Operador (admin / demo / debug)

**Quien es**: El operador del sistema (Miguel). BYPASS de todo el gating por
perfil: ve TODO siempre, para demos, debug y verificacion.

**Que VE en el home**: TODO (modulos + seguimiento + glaciar).

**Regla**: el operador SIEMPRE ve el home completo, sin importar el perfil del
onboarding. Es un bypass explicito en `homeModuleSelector.selectHomeModules` con
`opts.esOperador = true`.

---

## Mecanismo de seleccion

La visibilidad de modulos y tarjetas de seguimiento la decide:

1. **`homeModuleSelector.selectHomeModules(profile, opts)`** — del perfil del
   usuario → lista de modulos visibles + keys de seguimiento.
2. **`profileChipSelector.selectChipIntents(profile, opts)`** — del perfil →
   lista ordenada de chips del agente a mostrar en la toolbar.

Ambos son modulos PUROS (sin red, sin React, sin localStorage). El call-site
(`DashboardLive.jsx`) evalua si el usuario tiene una preferencia manual de
visibilidad guardada en `ProfileScreen`; si existe, ESA gana sobre el default
por perfil (respeta la decision del usuario).

El perfil se construye en el onboarding (`OnboardingPiloto` → `OnboardingProfile`
→ `LocationDetectedScreen`) y se persiste en `localStorage` bajo
`chagra:profile:v1`. El operador que no complete el onboarding ve el default
(campesino, todos los modulos visibles — sin romper la experiencia existente).
