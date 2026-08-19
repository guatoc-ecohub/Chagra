# Handoff de arte: invernadero escalable

Esta pasada resuelve el contrato de escala y GPU, no una nueva interpretación visual del tomate.

- El punto de entrada es `MundoInvernadero({ especie, cantidad, layout })`.
- La masa primaria usa una geometría compartida por familia y un `InstancedMesh` para todas las plantas.
- Tomate es la configuración prioritaria y queda listo para 1.500 y 10.000 instancias.
- La próxima pasada de Fable debe reemplazar los arquetipos visuales sin cambiar `normalizarCultivo`, `posicionesCultivo` ni el contrato de `FloraInvernadero`.
- Criterio visual del tomate: follaje como masa continua, verde dominante, porte indeterminado legible y frutos rojos distribuidos sobre el tutor. Debe validarse cerca, plano medio y amplia distancia.

No se agregan meshes individuales por planta en esta pasada.
