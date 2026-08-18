# Handoff de arte: invernadero escalable

Esta pasada resuelve el contrato de escala y GPU, no una nueva interpretación visual del tomate.

- El punto de entrada es `MundoInvernadero({ especie, cantidad, layout })`.
- La masa primaria usa una geometría compartida por familia y un `InstancedMesh` para todas las plantas.
- Tomate es la configuración prioritaria y queda listo para 1.500 y 10.000 instancias.
- La próxima pasada de Fable debe reemplazar los arquetipos visuales sin cambiar `normalizarCultivo`, `posicionesCultivo` ni el contrato de `FloraInvernadero`.
- Criterio visual del tomate: follaje como masa continua, verde dominante, porte indeterminado legible y frutos rojos distribuidos sobre el tutor. Debe validarse cerca, plano medio y amplia distancia.

No se agregan meshes individuales por planta en esta pasada.

## Entrega Fable (2026-08-18, rama `fable/tomate-humboldt`)

Arquetipo del tomate reemplazado por la lámina Humboldt de
`tomateHumboldt.js` (atlas CanvasTexture de 8 variantes + espejo, 3 quads
cruzados, 6 tris/planta, 1 draw call). Contrato intacto: `normalizarCultivo`,
`posicionesCultivo` y las props de `FloraInvernadero` sin cambios. Los
frutos-esfera del tomate salieron: los racimos van pintados en la lámina,
madurando de abajo hacia arriba. Gate GPU headed: 57,9 FPS @1.500 y
55,9 FPS @10.000, `MUNDO VIVO`, 0 errores — ver
`_gate/INFORME-TOMATE-HUMBOLDT.md`.
