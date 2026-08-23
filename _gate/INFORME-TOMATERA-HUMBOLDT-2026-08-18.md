# INFORME — Tomatera Humboldt para el invernadero de David (2026-08-18)

**Encargo:** rehacer la tomatera lowpoly del invernadero con mirada Humboldt
(follaje como masa, frutos rojos realistas racimados, nada lowpoly), entregada
como asset que instancie barato en la M6000 a 1.500 → 10.000 plantas.

**Rama:** `fable/tomate-humboldt-invernadero` (worktree `~/demos/3d-wip-tomate-humboldt`),
commit `86aca43`, montada SOBRE la rama codex `feat/invernadero-tomate-instancing`
(`41c92cf`) para encajar directo en su `instanciar()`.

## Entregado

1. **`lib3d/flora/tomateraFabrica.js`** — la fábrica del asset:
   - Textura canvas determinista de FOLIOLOS de tomate (hoja compuesta
     imparipinnada, borde aserrado) en 3 capas sombra/cuerpo/luz + dilatación
     de borde (sin orla de mip bajo alphaTest).
   - Columna de lóbulos → núcleo esculpido (normales suaves) + cards alpha
     (técnica FollajeMasa de la casa). 2 draw calls de follaje por variante.
   - Frutos: esferas SUAVES oblatas con gajos insinuados, hombro de luz,
     cáliz y pedicelo, en racimos-ramillete compactos colgando por fuera de
     la masa; deshoje bajo real (racimo maduro expuesto). Cero icosaedros,
     cero flatShading.
   - 4 variantes (`cargada`, `media`, `joven`, `deshojada`) × 2 calidades
     (`hero`, `fila`), deterministas por seed.
   - **Lámina-atlas**: atlas canvas ilustrado (4 columnas) + cruz de 3 planos
     (12 vértices/mata) con anti-centelleo — el LOD que hace posible 10.000.
2. **`tomatera-humboldt.html`** — harness de gate con cámaras fijas:
   `?vista=matas|cerca|campo|ab|lamina` (+`ang`, `n`, `laminas`). El A/B
   renderiza la lowpoly archivada como réplica local, mismo encuadre.
3. **`invernadero.js`** — el cultivo `tomate`/`mixto` instancia las variantes
   Humboldt (opaca+cards); desborde a lámina sobre 1.200 matas 3D. Pimentón y
   lechuga intactos.

## Medido (gate GPU headed, M6000, DISPLAY=:0, shot3d)

| vista | resultado |
|---|---|
| campo 1.500 matas | **60,1 FPS** · 2,75M tris · 13 draws |
| campo 10.000 matas | **60,1 FPS** · 2,80M tris · 13 draws (lámina = +51k tris) |
| mundo `?mundo=invernadero&cam=tunel` (1.500 y 10.000) | vivo, 0 page errors |

Métricas de píxel (sharp, canal a canal — cada % con su definición):
- **Verde-dominante** (g>1,12·r y g>1,12·b, excluyendo cielo): túnel integrado
  **52,0%**; en el A/B con el MISMO encuadre/fondo, DESPUÉS 19,0% vs ANTES
  15,0% (+27% relativo de masa verde).
- **Rojo de racimo** (r>1,35·g, r>90): presente en todas las vistas
  (1.9k–7.6k px); en el ANTES había más % rojo porque sus frutos eran
  icosaedros gigantes — el rojo nuevo es menor pero está racimado y en su sitio.

Capturas: `_gate/tomate-humboldt/*.png` · enviadas a Telegram msgs **5040–5042**
(`ok:true`, chat 208512105).

## Pendientes / notas para el operador

- **Cortina blanca lowpoly** cruza el cuadro en `?cam=cama`: es geometría
  PREEXISTENTE del mundo (cortina enrollada), no parte de este encargo.
- **A 10.000 el mundo codex compacta la escala** (`escalaDensidad` ≈ 0,18):
  las matas se ven miniatura. Es decisión de SU rama (silueta compacta al
  crecer). El asset aguanta 10.000 a tamaño real (probado en el harness);
  si David quiere tamaño real, el mundo necesita más camas/largo — decisión
  de mundo, no de asset.
- El umbral 3D→lámina (1.200) vive en `invernadero.js` (`UMBRAL_TOMATE_3D`).
- Sin viento adentro (buzz pollination); a campo abierto, aplicar
  `aplicarVientoMundo` por fuera.
