---
name: Lista seed de proveedores agroecológicos Colombia 2026 — fuentes verificables
status: seed (pre-DR)
decided_at: 2026-04-26
audit_priority: HIGH
register: power-laws — un proveedor mal-listado destruye credibilidad
---

# Suppliers Colombia — seed list (a expandir vía DR #2)

> **Estatus**: este documento es un **seed pre-DR** con fuentes institucionales que el DR #2 (Knowledge & Capabilities, Área 2) usará como punto de partida para construir la lista verificada definitiva.
> **Regla inviolable**: NINGÚN proveedor entra a la lista oficial sin **fuente pública verificable** (URL institucional, registro ICA público, certificación pública, contacto institucional confirmable).

---

## Fuentes institucionales para verificar proveedores

### 1. ICA — Instituto Colombiano Agropecuario

- URL: https://www.ica.gov.co/
- **Registro de viveros**: viveros con licencia ICA están en bases de datos públicas regionales. Verificar antes de listar cualquier proveedor de plántulas frutales y forestales.
- **Registro de productores de semillas**: certificación obligatoria para semillas comerciales.
- **Certificaciones BPA** (Buenas Prácticas Agrícolas): productores certificados son listados.

### 2. Agrosavia — Corporación Colombiana de Investigación Agropecuaria

- URL: https://www.agrosavia.co/
- **Banco de germoplasma**: variedades nativas y mejoradas con trazabilidad genética.
- **Centros de investigación regional** (Tibaitatá, La Suiza, Palmira, etc.): productores y multiplicadores asociados.
- **Cartillas técnicas**: identifican proveedores recomendados por Agrosavia para cada cultivo.

### 3. Corporaciones Autónomas Regionales (CAR)

- Cada región tiene su CAR (CAR Cundinamarca, CVS Córdoba, CVC Valle, etc.).
- **Viveros municipales y comunitarios**: programas de reforestación con especies nativas.
- Verificar lista activa en página oficial de cada CAR.

### 4. Redes campesinas y de mujeres con presencia pública

> **Nota**: incluir solo si la red tiene página oficial, RUT verificable, o aparece en publicaciones de Agrosavia / MinAgricultura / FAO.

- **Red Colombiana de Reservas Naturales de la Sociedad Civil (RESNATUR)**: https://www.resnatur.org.co/
- **Red Agroecológica Nacional (RECAB / RENAF)**: revisar páginas activas 2026.
- **Red de Mujeres Rurales Colombianas**: programas con apoyo MinAgricultura.
- **Bancos de semillas locales reconocidos** (ej. Custodios de Semillas, Corporación Custodios, Casas Campesinas).

### 5. Distribuidores comerciales con trazabilidad

> Solo listar tras verificar registro mercantil + presencia pública sostenida (≥3 años).

- **Coljap**, **Ecofuturo**, **Soluciones Ambientales SAS**, **Bioterral**, etc. — verificar uno a uno.
- Distribuidores de microorganismos comerciales (Trichoderma harzianum, Bacillus subtilis, micorrizas comerciales).

### 6. Bancos de germoplasma internacionales con presencia o accesibilidad en Colombia

- **CIAT / Alliance Bioversity-CIAT** (Palmira): germoplasma de fríjol, yuca, forrajes tropicales.
- **CIP** (Centro Internacional de la Papa, presencia regional): variedades de papa y andinos.
- **GBIF Colombia**: nodo nacional con datos de biodiversidad.

---

## Plantilla de entrada por proveedor

Cuando el DR #2 valide un proveedor, agregarlo a `suppliers-colombia-2026.md` (lista oficial, archivo aparte que se crea al cerrar DR) con esta plantilla:

```yaml
---
ulid: <ULID>
nombre_legal: <razón social registrada>
nombre_comercial: <si difiere>
tipo:
  - plantulas | semillas | abonos_organicos | microorganismos_comerciales | microorganismos_nativos | herramientas | germoplasma_nativo
ubicacion:
  departamento: <Cundinamarca | Antioquia | …>
  municipio: <…>
  coordenadas_aprox: { lat: , lng: }  # solo si público
cobertura_despacho:
  - departamentos: [..]
  - regiones: [andina | caribe | pacifica | orinoquia | amazonia]
  - alcance: [local | regional | nacional]
certificaciones:
  - tipo: registro_ICA | BPA | organico_BCS | agrosavia_alianza | RESNATUR | otra
    numero: <si público>
    expira: YYYY-MM-DD
    url_verificacion: <URL pública>
    estado: vigente | expirada | en_renovacion | desconocido
contacto_publico:
  url: <URL oficial>
  telefono: <si público>
  email: <si público>
rangos_precios_2026:
  - producto: <plántula aguacate Hass>
    precio_cop: { min: , max: }
    fecha_referencia: YYYY-MM-DD
fuentes_de_verificacion:
  - tipo: ica_registro | agrosavia_publicacion | resnatur_directorio | publicacion_oficial
    cita: <APA o URL>
    fecha_consulta: YYYY-MM-DD
nivel_confianza: alto | medio | bajo
estado_listado: vigente | suspendido | retirado
ultima_verificacion: YYYY-MM-DD
proxima_verificacion: YYYY-MM-DD  # +90 días por defecto (cadencia trimestral)
notas_operador: <observaciones de uso real, opcional>
incidentes_documentados: <si hubo problemas, opcional>
---
```

---

## Workflow de verificación trimestral (ver `ops/calendar-tasks.md`)

1. Leer cada entrada vigente.
2. Para cada una: ir a `url_verificacion` o consultar institución oficial.
3. Si certificación sigue vigente → actualizar `ultima_verificacion`, recalcular `proxima_verificacion`.
4. Si expiró sin renovar → cambiar `estado_listado: suspendido`, alertar al operador.
5. Si proveedor cambió de razón social, ubicación o cobertura → actualizar.
6. Si hay incidente documentado (queja, contaminación, mala calidad) → documentar en `incidentes_documentados`, considerar `retirado`.
7. Commit del cambio con mensaje `chore(suppliers): refresh trimestral YYYY-MM`.

---

## Anti-checklist

- ❌ NO listar proveedor sin URL pública oficial.
- ❌ NO listar proveedor con certificación expirada como vigente.
- ❌ NO incluir contactos privados sin consentimiento (ADR-020 capa 3).
- ❌ NO recomendar proveedor sin que aparezca en la lista oficial verificada.
- ❌ NO publicar lista al libro/producto OSS sin pasar por revisión ICA / Agrosavia / agroecólogo asociado.

---

## Referencias

- DR #2: `deepresearch/architecture/dr-prompt-knowledge-and-capabilities-2026.md` Área 2.
- Plantilla ficha especie (consume esta lista): `deepresearch/knowledge/species-ficha-template.md`.
- ADR-020 anti-leak: `deepresearch/architecture/ADR-020-anti-leak-content-boundary.md`.
- Calendario operativo: `ops/calendar-tasks.md` — entrada `refresh proveedores trimestral`.
