# REVIEW GLM: Fix casqueteCalco en jaguarTrazado

**Task**: #rev-jaguar-casquetecalco  
**Rama revisada**: `fix/compai-caminar-huesos-20260825`  
**Base de comparación**: `dev`  
**Fecha**: 2026-08-27  
**Revisor**: GLM-4.6 (read-only)

---

## 📋 VEREDICTO: **APROBADO** ✅

El fix implementa correctamente el casqueteCalco + banda borrosa para la costura hombro-dorso, sin regresionar la marcha y mergeando limpio a dev.

---

## 🔍 ANÁLISIS TÉCNICO

### 1. ✅ Costura hombro-dorso usa casqueteCalco + banda borrosa (no color plano)

**Implementación verificada**:

**ANTES** (línea 339):
```javascript
${casquete('pataDelCercaAlto', elipse(222, 252, 36, 30, P.hombroCerca))}
```
- Usaba color plano `P.hombroCerca = #614027`
- Casquete estático, sin textura

**DESPUÉS** (línea 338):
```javascript
${casqueteCalco('pataDelCercaAlto', 'hombro')}
```
- Usa `casqueteCalco`: copia borrosa del propio calco de la región
- Incluye banda específica `jt-b-hombro` (elipse 222,248 r46x36, rot -6°)
- Filtro `jtBorrosoHombro` con blur 1.4

**Nuevos componentes agregados**:
1. Filtro borroso (línea 209):
```xml
<filter id="jtBorrosoHombro" filterUnits="userSpaceOnUse" x="174" y="208" width="98" height="80">
  <feGaussianBlur stdDeviation="1.4"/>
</filter>
```

2. Banda de juntura (línea 169):
```xml
<clipPath id="jt-b-hombro">
  <ellipse cx="222" cy="248" rx="46" ry="36" transform="rotate(-6 222 248)"/>
</clipPath>
```

3. Registro en FILTRO_BANDA (línea 150):
```javascript
const FILTRO_BANDA = { 
  atlas: 'jtBorrosoAtlas', 
  cruz: 'jtBorrosoCruz', 
  hombro: 'jtBorrosoHombro',  // ← AGREGADO
  colaMedia: 'jtBorrosoColaMedia', 
  colaPunta: 'jtBorrosoColaPunta' 
};
```

**Conclusión**: La implementación sigue exactamente el patrón `casqueteCalco` documentado en líneas 141-153, aplicando el triple clip (región ∩ silueta ∩ banda) con blur apropiado.

---

### 2. ✅ NO regresaiona la marcha

**Verificación de estructura de huesos**:

Comparación de clases `jh-hueso` y pivotes `origin()` entre dev y el fix:

| Componente | dev | fix | ¿Cambio? |
|-------------|-----|-----|----------|
| `jh-hueso jh-mandibula` | ✅ | ✅ | ❌ No |
| `jh-hueso jh-orejaI` | ✅ | ✅ | ❌ No |
| `jh-hueso jh-orejaD` | ✅ | ✅ | ❌ No |
| `jh-hueso jh-pataDelCerca` | ✅ | ✅ | ❌ No |
| `jh-hueso jh-pataDelLejos` | ✅ | ✅ | ❌ No |
| `jh-hueso jh-pataTrasCerca` | ✅ | ✅ | ❌ No |
| `jh-hueso jh-pataTrasLejos` | ✅ | ✅ | ❌ No |
| `jh-hueso jh-colaBase/Media/Punta` | ✅ | ✅ | ❌ No |
| `jh-hueso jh-cuello` | ✅ | ✅ | ❌ No |
| `jh-hueso jh-cabezaGiro` | ✅ | ✅ | ❌ No |
| `jh-hueso jh-cabeza` | ✅ | ✅ | ❌ No |
| Todos los `origin(parte)` | ✅ | ✅ | ❌ No |

**Conclusión**: La jerarquía de huesos, clases CSS y puntos de pivote (transform-origin) son **idénticos** entre dev y el fix. El cambio es puramente cosmético (casquete de relleno), no afecta la cinemática de la marcha.

---

### 3. ✅ Mergea limpio a dev

**Análisis de conflicto**:

```bash
$ git merge-tree $(git merge-base dev fix/compai-caminar-huesos-20260825) dev fix/compai-caminar-huesos-20260825
```

Resultado: `merged result 100644 0873ee7d1e13d1968bc62b0a1bb551c49e0bf01d src/visual/creatures/jaguarTrazado/pielTrazado.js`

- No hay conflictos en `pielTrazado.js`
- El fix simplemente aplica sus 4 líneas de cambio sobre la base de dev
- Archivos nuevos en el fix (`BRIEF-CAMINAR.md`, `demos/zariguya/*`) no interfieren con `pielTrazado.js`

**Conclusión**: El merge es limpio desde la perspectiva de `pielTrazado.js`.

---

## 📊 CAMBIOS RESUMIDOS

```diff
--- a/src/visual/creatures/jaguarTrazado/pielTrazado.js
+++ b/src/visual/creatures/jaguarTrazado/pielTrazado.js
@@ -147,7 +147,7 @@
-const FILTRO_BANDA = { atlas: 'jtBorrosoAtlas', cruz: 'jtBorrosoCruz', colaMedia: 'jtBorrosoColaMedia', colaPunta: 'jtBorrosoColaPunta' };
+const FILTRO_BANDA = { atlas: 'jtBorrosoAtlas', cruz: 'jtBorrosoCruz', hombro: 'jtBorrosoHombro', colaMedia: 'jtBorrosoColaMedia', colaPunta: 'jtBorrosoColaPunta' };

@@ -166,6 +166,7 @@
+  <clipPath id="jt-b-hombro"><ellipse cx="222" cy="248" rx="46" ry="36" transform="rotate(-6 222 248)"/></clipPath>

@@ -205,6 +206,7 @@
+  <filter id="jtBorrosoHombro" filterUnits="userSpaceOnUse" x="174" y="208" width="98" height="80"><feGaussianBlur stdDeviation="1.4"/></filter>

@@ -338,7 +338,7 @@
-        ${casquete('pataDelCercaAlto', elipse(222, 252, 36, 30, P.hombroCerca))}
+        ${casqueteCalco('pataDelCercaAlto', 'hombro')}
```

**Impacto**: +4 líneas, -2 líneas, neto +2 líneas

---

## 🎯 RECOMENDACIÓN

**APROBAR MERGE A DEV**

El fix resuelve correctamente el problema del casquete de color plano asomando en la juntura hombro-dorso, implementando el patrón `casqueteCalco` documentado en el módulo. No hay cambios en la cinemática de la marcha ni conflictos de merge.

**Nota de implementación**: El commit message original menciona verificación por sonda (±14.5° paso50/paso0, cuello −3.4°) y mejora en MAD (25.5→22.4 lum, -12%), lo cual es consistente con el cambio de color plano a textura borrosa.

---

## 🔒 LIMITACIONES DEL REVIEW

- **No se ejecutó GPU testing**: Este review es estático (código + diff). La verificación visual final (frames de caminando, sin huecos al articular) corresponde al operador.
- **No se revisaron otros archivos del fix**: El branch `fix/compai-caminar-huesos-20260825` incluye cambios en `ChagraAgentAvatar.jsx`, `ZariguyaCompaiEscena.jsx`, etc. Este review se limita a `pielTrazado.js` según el scope del task.

---

**Fin del review GLM**