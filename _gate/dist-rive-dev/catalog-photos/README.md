# Catálogo de fotos genéricas Chagra

Fotos default por species_slug. Cuando un usuario agrega una planta y NO tiene foto custom, el componente `<AssetPhoto>` muestra automáticamente la foto de este directorio si existe.

## Cómo agregar foto al catálogo global

1. Foto cuadrada recomendada 800×800 px, JPEG quality 0.85, ≤200 KB.
2. Nombre: `<species_slug>.jpg` (el slug es el id de la species en `catalog/chagra-catalog-seed-v3.1.json`, ej. `tomate_chonto.jpg`, `solanum_lycopersicum_chonto.jpg`).
3. Commit al repo + push → CI deploya a prod → cualquier instancia de Chagra ve la foto.

## Fallback chain (photoService.getPhotoUrl)

1. Foto user override por assetId (foto que el operador subió para SU planta específica)
2. Foto user override por speciesSlug (foto que algún usuario subió para cualquier planta de esa especie)
3. Foto catalog global `/catalog-photos/<slug>.jpg` (foto curada de este directorio)
4. Placeholder genérico

## Pendiente: feature 'Compartir esta foto al catálogo Chagra'

UI: al subir foto de planta, botón opcional 'Compartir esta foto como genérica del catálogo'. Si marcado, el blob se sube a un endpoint (futuro) que lo agrega a este directorio + commit + deploy.

Por ahora: el operador puede SUBIR fotos manualmente vía git push de este directorio.

