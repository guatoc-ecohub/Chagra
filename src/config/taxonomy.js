export const CROP_TAXONOMY = {
  frutales_perennes: {
    label: 'Frutales y Perennes',
    species: [
      { id: 'passiflora_edulis', name: 'Gulupa (Passiflora edulis f. edulis)' },
      { id: 'passiflora_tarminiana', name: 'Curuba (Passiflora tarminiana)' },
      { id: 'passiflora_ligularis', name: 'Granadilla (Passiflora ligularis)' },
      { id: 'rubus_glaucus', name: 'Mora de Castilla (Rubus glaucus)' },
      { id: 'rubus_fruticosus', name: 'Mora Silvestre (Rubus spp.)' },
      { id: 'rubus_idaeus', name: 'Frambuesa (Rubus idaeus)' },
      { id: 'fragaria_ananassa', name: 'Fresa (Fragaria x ananassa)' },
      { id: 'physalis_peruviana', name: 'Uchuva (Physalis peruviana)' },
      { id: 'solanum_betaceum', name: 'Tomate de Árbol (Solanum betaceum)' },
      { id: 'vaccinium_corymbosum', name: 'Arándano (Vaccinium corymbosum)' },
      { id: 'coffea_arabica', name: 'Café (Coffea arabica)' },
      { id: 'psidium_guajava', name: 'Guayaba Manzana (Psidium guajava)' },
      { id: 'malus_domestica', name: 'Manzana (Malus domestica)' },
      { id: 'pyrus_communis', name: 'Pera (Pyrus communis)' },
      { id: 'prunus_persica', name: 'Durazno (Prunus persica)' },
      { id: 'acca_sellowiana', name: 'Feijoa (Acca sellowiana)' },
      { id: 'vasconcellea_pubescens', name: 'Papayuela (Vasconcellea pubescens)' },
      { id: 'ficus_carica', name: 'Breva / Higo (Ficus carica)' },
      { id: 'citrus_limon', name: 'Limón (Citrus spp.)' },
      // Nativos bosque alto andino (Fase 19 — Gemini Deep Research)
      { id: 'vaccinium_meridionale', name: 'Mortiño / Agraz (Vaccinium meridionale)' },
      { id: 'myrcianthes_leucoxyla', name: 'Arrayán blanco (Myrcianthes leucoxyla)' }
    ]
  },
  leguminosas_granos: {
    label: 'Leguminosas y Granos (Fijadores de N)',
    species: [
      { id: 'zea_mays', name: 'Maíz (Zea mays)' },
      { id: 'phaseolus_vulgaris', name: 'Frijol (Phaseolus vulgaris)' },
      { id: 'pisum_sativum', name: 'Arveja (Pisum sativum)' },
      { id: 'vicia_faba', name: 'Haba (Vicia faba)' },
      { id: 'lupinus_mutabilis', name: 'Chocho / Tarwi (Lupinus mutabilis)' },
      { id: 'chenopodium_quinoa', name: 'Quinua (Chenopodium quinoa)' },
      { id: 'amaranthus_caudatus', name: 'Amaranto (Amaranthus caudatus)' },
      { id: 'erythrina_edulis', name: 'Chachafruto / Balú (Erythrina edulis)' } // Árbol leguminoso nodriza
    ]
  },
  hortalizas_hoja: {
    label: 'Hortalizas de Hoja y Tallo',
    species: [
      { id: 'lactuca_sativa', name: 'Lechuga (Lactuca sativa)' },
      { id: 'spinacia_oleracea', name: 'Espinaca (Spinacia oleracea)' },
      { id: 'beta_vulgaris_cicla', name: 'Acelga (Beta vulgaris var. cicla)' },
      { id: 'brassica_oleracea_capitata', name: 'Repollo (Brassica oleracea)' },
      { id: 'brassica_oleracea_sabellica', name: 'Kale / Col Rizada (Brassica oleracea var. sabellica)' },
      { id: 'apium_graveolens', name: 'Apio (Apium graveolens)' },
      { id: 'coriandrum_sativum', name: 'Cilantro (Coriandrum sativum)' },
      { id: 'petroselinum_crispum', name: 'Perejil (Petroselinum crispum)' },
      { id: 'oxalis_megalorrhiza', name: 'Churco / Vinagrillo (Oxalis megalorrhiza)' }, // Mulch vivo nativo
      { id: 'portulaca_oleracea', name: 'Verdolaga andina (Portulaca oleracea)' } // Cobertura suculenta CAM
    ]
  },
  hortalizas_fruto_flor: {
    label: 'Hortalizas de Fruto y Flor',
    species: [
      { id: 'cucurbita_maxima', name: 'Ahuyama / Zapallo (Cucurbita maxima)' },
      { id: 'cucurbita_pepo', name: 'Calabacín / Zucchini (Cucurbita pepo)' },
      { id: 'brassica_oleracea_botrytis', name: 'Coliflor (Brassica oleracea var. botrytis)' },
      { id: 'brassica_oleracea_italica', name: 'Brócoli (Brassica oleracea var. italica)' },
      { id: 'solanum_lycopersicum', name: 'Tomate (Solanum lycopersicum)' },
      { id: 'solanum_lycopersicum_chonto', name: 'Tomate Chonto (Solanum lycopersicum)' },
      { id: 'solanum_lycopersicum_cherry', name: 'Tomate Cherry (Solanum lycopersicum var. cerasiforme)' },
      { id: 'capsicum_annuum', name: 'Pimentón (Capsicum annuum)' },
      { id: 'cucumis_sativus', name: 'Pepino Cohombro (Cucumis sativus)' },
      { id: 'sechium_edule', name: 'Guatila / Cidra (Sechium edule)' } // Enredadera estrato medio
    ]
  },
  tuberculos_raices: {
    label: 'Tubérculos, Bulbos y Raíces',
    species: [
      { id: 'solanum_tuberosum', name: 'Papa (Solanum tuberosum)' },
      { id: 'solanum_tuberosum_pastusa', name: 'Papa Pastusa (Solanum tuberosum)' },
      { id: 'solanum_tuberosum_sabanera', name: 'Papa Sabanera (Solanum tuberosum)' },
      { id: 'solanum_phureja', name: 'Papa Criolla (Solanum phureja)' },
      { id: 'solanum_tuberosum_nativas', name: 'Papas Nativas / Ancestrales (Solanum spp.)' },
      { id: 'oxalis_tuberosa', name: 'Ibia / Oca (Oxalis tuberosa)' },
      { id: 'ullucus_tuberosus', name: 'Ulluco / Chugua (Ullucus tuberosus)' },
      { id: 'tropaeolum_tuberosum', name: 'Cubio / Mashua (Tropaeolum tuberosum)' },
      { id: 'daucus_carota', name: 'Zanahoria (Daucus carota)' },
      { id: 'beta_vulgaris_rubra', name: 'Remolacha (Beta vulgaris)' },
      { id: 'smallanthus_sonchifolius', name: 'Yacón (Smallanthus sonchifolius)' },
      { id: 'arracacia_xanthorrhiza', name: 'Arracacha (Arracacia xanthorrhiza)' },
      { id: 'allium_fistulosum', name: 'Cebolla Larga / Rama (Allium fistulosum)' },
      { id: 'allium_schoenoprasum', name: 'Cebollín (Allium schoenoprasum)' },
      { id: 'canna_edulis', name: 'Achira / Caña de Indias (Canna edulis)' }, // Almidón radical
      { id: 'brassica_rapa', name: 'Nabo criollo / Yuyo (Brassica rapa)' }, // Descompactador
      { id: 'xanthosoma_sagittifolium', name: 'Mafafa / Bore (Xanthosoma sagittifolium)' } // Tubérculo estrato medio
    ]
  },
  medicinales_alelopaticas: {
    label: 'Medicinales, Aromáticas y Alelopatía',
    species: [
      { id: 'aloe_vera', name: 'Sábila (Aloe vera)' },
      { id: 'calendula_officinalis', name: 'Caléndula (Calendula officinalis)' },
      { id: 'tropaeolum_majus', name: 'Capuchina (Tropaeolum majus)' },
      { id: 'allium_cepa', name: 'Cebolla (Allium cepa)' },
      { id: 'rosmarinus_officinalis', name: 'Romero (Rosmarinus officinalis)' },
      { id: 'artemisia_absinthium', name: 'Ajenjo (Artemisia absinthium)' },
      { id: 'ruta_graveolens', name: 'Ruda (Ruta graveolens)' },
      { id: 'matricaria_chamomilla', name: 'Manzanilla (Matricaria chamomilla)' },
      { id: 'urtica_dioica', name: 'Ortiga (Urtica dioica)' }, // Crítica para purines
      { id: 'symphytum_officinale', name: 'Consuelda (Symphytum officinale)' }, // Rica en potasio
      { id: 'mentha_spicata', name: 'Hierbabuena / Menta (Mentha spp.)' },
      { id: 'mentha_piperita', name: 'Menta Piperita (Mentha piperita)' },
      { id: 'aloysia_citrodora', name: 'Cidrón (Aloysia citrodora)' },
      { id: 'foeniculum_vulgare', name: 'Hinojo (Foeniculum vulgare)' },
      { id: 'cymbopogon_citratus', name: 'Limoncillo / Limonaria (Cymbopogon citratus)' },
      { id: 'pimpinella_anisum', name: 'Anís Verde (Pimpinella anisum)' },
      { id: 'ocimum_basilicum', name: 'Albahaca (Ocimum basilicum) [Invernadero]' },
      { id: 'minthostachys_mollis', name: 'Poleo andino / Muña (Minthostachys mollis)' }, // Repelente polilla de papa
      { id: 'sambucus_peruviana', name: 'Sauco criollo (Sambucus peruviana)' }, // Rompevientos
      { id: 'taraxacum_officinale', name: 'Diente de león (Taraxacum officinale)' }, // Acumulador profundo
      { id: 'plantago_major', name: 'Llantén (Plantago major)' }, // Rosetón de cobertura
      { id: 'melissa_officinalis', name: 'Toronjil (Melissa officinalis)' }
    ]
  },
  abonos_verdes_coberturas: {
    label: 'Abonos Verdes, Coberturas y Árboles Nodriza',
    species: [
      { id: 'avena_sativa', name: 'Avena Forrajera (Avena sativa)' }, // Biomasa rápida
      { id: 'raphanus_sativus', name: 'Rábano Forrajero (Raphanus sativus)' }, // Descompactador de suelo
      { id: 'vicia_sativa', name: 'Veza (Vicia sativa)' }, // Fijador de nitrógeno
      // Estrato emergente — dosel alto andino (árboles nodriza)
      { id: 'alnus_acuminata', name: 'Aliso andino (Alnus acuminata)' }, // Fijador N vía Frankia
      { id: 'weinmannia_tomentosa', name: 'Encenillo (Weinmannia tomentosa)' }, // Suelo ácido tipo mor
      { id: 'tillandsia_maculata', name: 'Quiche / Bromelia epífita (Tillandsia spp.)' }, // Epífito acumulador
      // Estrato alto — pioneras y rompevientos
      { id: 'dodonaea_viscosa', name: 'Hayuelo (Dodonaea viscosa)' }, // Pionera de ladera
      { id: 'escallonia_paniculata', name: 'Tíbar (Escallonia paniculata)' }, // Polinizadores de subpáramo
      { id: 'miconia_squamulosa', name: 'Tuno (Miconia squamulosa)' } // Dispersión por avifauna
    ]
  }
};
