# Fichas de especies — corpus base Chagra

Cada `.md` aquí sigue `../species-ficha-template.md`. Estado actual:

- 🟡 **Borrador** — datos correctos verificables institucionalmente (Agrosavia, ICA, GBIF, FAO) pero **pendientes de validación por agroecólogo certificado** antes de marcarse `publicable_libro: true`.
- 🟢 **Validado** — agroecólogo certificado revisó y firmó (`revisor` en frontmatter).
- 🔴 **Stale** — re-revisión requerida (`ultima_revision` >12 meses).

**Workflow para promover a `validado`**:

1. Operador o curador completa secciones 1–12 con citas verificables.
2. Sección 11 (Limitaciones) DEBE estar llena. Sin ella → no avanza.
3. PR con cambio en `nivel_confianza_global: alto` + `publicable_libro: true`.
4. Revisor agroecólogo aprueba (puede ser asíncrono via comentarios PR).
5. Merge → ficha disponible para libro y producto Pro.

Frontmatter consume el catálogo de Chagra (IndexedDB / SQLite) — el campo `ulid` se genera al crear la ficha y se mantiene estable para joins.

## Las 10 fichas iniciales (Fase 0 ADR-022)

| Categoría | Especie | Piso | Estado |
|-----------|---------|------|--------|
| Frutal | Aguacate Hass — *Persea americana* | Templado | 🟡 borrador |
| Frutal | Café arábigo — *Coffea arabica* | Templado | 🟡 borrador |
| Frutal | Mora de Castilla — *Rubus glaucus* | Frío | 🟡 borrador |
| Leguminosa cobertura | Canavalia — *Canavalia ensiformis* | Cálido | 🟡 borrador |
| Leguminosa frijol | Frijol Mortiño — *Phaseolus coccineus* | Frío | 🟡 borrador |
| Leguminosa grano andino | Tarwi (Lupino) — *Lupinus mutabilis* | Frío | 🟡 borrador |
| Forestal | Aliso — *Alnus acuminata* | Frío | 🟡 borrador |
| Forestal sombrío | Guamo / Cachimbo — *Inga edulis* | Templado | 🟡 borrador |
| Microorganismo | Trichoderma harzianum | Universal | 🟡 borrador |
| Microorganismo | Microorganismos de Montaña (MM) | Universal | 🟡 borrador |

Próximos lotes (fase 1 ADR-022): hortalizas templado/frío + raíces andinas + aromáticas.
