/**
 * dictionary.js — Diccionario in-app Chagra
 *
 * 0 alucinaciones. Cada definición curada con fuentes consultables.
 * Definiciones complejas explicadas para niño 11 años (audiencia educativa
 * load-bearing — Julieta + futuras generaciones de operadoras).
 *
 * Categorías:
 *   identidad         — Chagra, milpa, conuco, agroecología (núcleo cultural)
 *   microorganismos   — énfasis explícito anti-narrativa capitalista
 *   biopreparados     — bocashi, biol, supermagro, etc.
 *   botanica          — estolón, esqueje, fenología, etc.
 *   plagas            — Phytophthora, oídio, áfidos, etc.
 *   clima             — pisos térmicos, microclima, GDD, DLI
 *   suelo             — pH, EC, NPK, materia orgánica, humus
 *   informatica       — PWA, IndexedDB, FarmOS, GPS, etc.
 *   ia                — Whisper, Ollama, RAG, LLM (Chagra-specific)
 *   ecologia          — gremio, asociación, especies nativa/invasora
 *   sociopolitica     — soberanía alimentaria, RECAB, etnobotánica
 *
 * Schema entry:
 * {
 *   slug: 'kebab-case-id',
 *   termino: 'Display string',
 *   categoria: 'one of categorias',
 *   emoji: '🌱',
 *   definicion_simple: 'Una línea — niño 11 años',
 *   definicion_ampliada: 'Párrafos agronómicos/técnicos',
 *   contexto_cultural: 'Opcional — identidad, política, historia (load-bearing terms)',
 *   en_discusion: { ... }    // Opcional — términos con disputa académica
 *   ver_tambien: ['slug1', 'slug2'],
 *   tambien_le_dicen: ['variante regional 1', 'variante regional 2'],
 *                          // Opcional — sinónimos campesinos regionales del término
 *                          // ("también le dicen…"). Mejora el matching léxico del NLU
 *                          // con el campesino-target. Curado con sabedores regionales.
 *   fuentes: ['Autor 2007 — Título', 'URL si aplica']
 * }
 */

export const DICTIONARY = [
  // ===========================================================================
  // IDENTIDAD (núcleo cultural — primero)
  // ===========================================================================
  {
    slug: 'chagra',
    termino: 'Chagra',
    categoria: 'identidad',
    emoji: '🌿',
    definicion_simple: 'Sistema de cultivo diverso, parecido al jardín de una abuela: muchas plantas distintas que se cuidan entre ellas.',
    definicion_ampliada: 'Chagra es el nombre que pueblos amazónicos colombianos (uitoto, ticuna, embera, entre otros) le dan a sus parcelas de cultivo. No es monocultivo: en una chagra crecen al mismo tiempo yuca, plátano, maíz, ají, frutales y plantas medicinales, en relación de reciprocidad con la selva. Es agricultura como conversación con la tierra, no extracción.\n\nEn esta app, "Chagra" honra ese sistema. Esta herramienta ayuda a registrar y aprender de tu propia chagra, sea finca grande o un balcón con tres materas — la lógica diversa-y-cuidadosa es la misma.',
    contexto_cultural: 'El nombre Chagra es préstamo respetuoso de comunidades amazónicas. La app NO se adueña del concepto, lo reconoce explícitamente. La fitonimia indígena de cada planta queda en el catálogo etnobotánico (curaduría con sabedores, en construcción). El sistema que la app representa es agroecológico-relacional, lo opuesto al monocultivo industrial que domina el agronegocio.',
    ver_tambien: ['milpa', 'conuco', 'agroecologia', 'monocultivo', 'permacultura'],
    fuentes: [
      'Tropenbos Colombia — Etnobotánica amazónica',
      'ICANH — Atlas de pueblos indígenas de Colombia',
      'Pinzón Rueda 2018 — Chagra amazónica como sistema de conocimiento',
    ],
  },

  {
    slug: 'milpa',
    termino: 'Milpa',
    categoria: 'identidad',
    emoji: '🌽',
    definicion_simple: 'Sistema mesoamericano donde maíz, frijol y calabaza crecen juntas y se ayudan: el maíz le da soporte al frijol, el frijol le da nitrógeno al suelo, la calabaza cubre la tierra para que no se seque.',
    definicion_ampliada: 'La milpa es la triada mesoamericana clásica: maíz (Zea mays), frijol (Phaseolus vulgaris) y calabaza/ahuyama (Cucurbita spp). Es policultivo simbiótico documentado por miles de años en pueblos nahua, maya, zapoteco y muchos más. Cada planta cumple función: el maíz da estructura vertical (tutor natural del frijol), el frijol fija nitrógeno atmosférico al suelo (alimenta al maíz), la calabaza sombrea el suelo (mantiene humedad y suprime malezas).\n\nEn Colombia, milpa convive con variantes locales: chagra amazónica (más diversa), conuco caribeño (con ahuyama), jardín andino (con tubérculos como cubio o mashua).',
    contexto_cultural: 'Milpa es el opuesto epistemológico del monocultivo industrial. No produce más por hectárea de un solo cultivo, pero produce mejor nutrición humana por área + cuida el suelo simultáneamente. La FAO lo reconoce como sistema agrícola de importancia patrimonial mundial (SIPAM 2010).',
    ver_tambien: ['chagra', 'conuco', 'monocultivo', 'asociacion'],
    fuentes: [
      'Mt. Pleasant 2016 — The science behind the Three Sisters',
      'CONABIO México — Sistema agrícola tradicional milpa',
      'FAO SIPAM 2010',
    ],
  },

  {
    slug: 'conuco',
    termino: 'Conuco',
    categoria: 'identidad',
    emoji: '🌴',
    definicion_simple: 'Forma caribeña y arawak de cultivar muchas cosas juntas en un mismo terreno, parecido a la chagra y la milpa.',
    definicion_ampliada: 'Conuco viene del taíno (lengua arawak) y nombra la parcela tradicional caribeña: yuca, maíz, ají, ahuyama, batata, frutales. Compartido por culturas wayuu, kogui, arhuaco, embera y campesinos afro-caribeños. Sistema de uso múltiple del suelo con rotación natural: cuando una parte descansa, otras producen.',
    contexto_cultural: 'El conuco fue resistencia agraria afrocaribeña en zonas de cimarronaje (San Basilio de Palenque, Quibdó, Cauca). Cultivar tu conuco era cultivar libertad alimentaria fuera del sistema esclavista de plantación monocultiva. Memoria viva.',
    ver_tambien: ['chagra', 'milpa', 'agroecologia'],
    fuentes: [
      'Patiño 1969 — Plantas cultivadas y animales domésticos en América equinoccial',
      'Friedemann & Patiño 1985 — Cultura y agricultura en el Pacífico colombiano',
    ],
  },

  {
    slug: 'agroecologia',
    termino: 'Agroecología',
    categoria: 'identidad',
    emoji: '🌎',
    definicion_simple: 'Forma de cultivar que copia cómo funciona la naturaleza: muchas plantas juntas, sin venenos, cuidando los bichitos del suelo.',
    definicion_ampliada: 'Agroecología es disciplina y práctica que aplica principios ecológicos al diseño y manejo de sistemas alimentarios sostenibles. Combina ciencia (ecosistemas, microbiología, etología), saberes tradicionales (chagra, milpa, conuco) y movimiento social (soberanía alimentaria). Rechaza biocidas sintéticos, transgénicos y monocultivos industriales.\n\nNo es solo "agricultura orgánica" — agroecología incluye dimensiones culturales, políticas y económicas. Una chagra agroecológica reconoce que cuidar la tierra es también cuidar la comunidad que cultiva y consume.',
    contexto_cultural: 'Pioneros: Miguel Altieri (Chile/EEUU), Stephen Gliessman (EEUU), Jairo Restrepo Rivera (Colombia, biopreparados), Vandana Shiva (India, soberanía de semillas). Chagra hereda esa lineage.',
    ver_tambien: ['permacultura', 'soberania-alimentaria', 'biopreparado', 'monocultivo'],
    fuentes: [
      'Altieri 1995 — Agroecology: The science of sustainable agriculture',
      'Restrepo Rivera 2007 — Manual práctico ABC de la agricultura orgánica',
      'FAO 2015 — Agroecología para la seguridad alimentaria',
    ],
  },

  {
    slug: 'permacultura',
    termino: 'Permacultura',
    categoria: 'identidad',
    emoji: '♻️',
    definicion_simple: 'Forma de diseñar fincas y huertas para que se cuiden solas, casi sin trabajo, copiando los ciclos del bosque.',
    definicion_ampliada: 'Permacultura (de "permanent agriculture") es metodología de diseño desarrollada por Bill Mollison y David Holmgren (Australia, 1978). Tres éticas centrales: cuidar la tierra, cuidar las personas, repartir lo justo. Doce principios de diseño aplicables a cualquier sistema (huerta, finca, comunidad). Énfasis en zonas de manejo (zona 0=casa, zona 5=monte sin tocar), captación de agua, ciclos cerrados de nutrientes, función múltiple por elemento.',
    ver_tambien: ['agroecologia', 'chagra', 'mulch', 'rotacion'],
    fuentes: [
      'Mollison 1988 — Permaculture: A Designer\'s Manual',
      'Holmgren 2002 — Permaculture: Principles & Pathways Beyond Sustainability',
    ],
  },

  {
    slug: 'monocultivo',
    termino: 'Monocultivo',
    categoria: 'identidad',
    emoji: '🚜',
    definicion_simple: 'Cuando se siembra una sola especie en muchas hectáreas. Se ve "ordenado" pero el suelo se cansa, las plagas se multiplican y se necesitan venenos.',
    definicion_ampliada: 'Monocultivo es la siembra extensiva de una sola especie en grandes áreas. Eficiente para mecanización industrial pero ecológicamente frágil: agota nutrientes específicos del suelo, facilita plagas especialistas (que encuentran su alimento concentrado), exige insumos sintéticos (fertilizantes NPK, plaguicidas) crecientes año a año.\n\nLa contraparte agroecológica es el policultivo (chagra, milpa, conuco): muchas especies cohabitando, con interacciones positivas (alelopatía benéfica, fijación de nitrógeno por leguminosas, sombra estructurada).',
    contexto_cultural: 'El monocultivo es invención del agronegocio industrial siglo XX (Revolución Verde). Antes, todas las civilizaciones agrícolas practicaban policultivo. Volver a policultivo no es retroceso; es ciencia + memoria.',
    ver_tambien: ['policultivo', 'milpa', 'soberania-alimentaria'],
    fuentes: [
      'Shiva 1991 — The Violence of the Green Revolution',
      'Altieri & Toledo 2011 — Agroecological revolution Latin America',
    ],
  },

  {
    slug: 'policultivo',
    termino: 'Policultivo',
    categoria: 'identidad',
    emoji: '🌻',
    definicion_simple: 'Sembrar varias plantas juntas que se ayudan entre sí, en lugar de una sola.',
    definicion_ampliada: 'Policultivo (poly = "muchos") es la siembra simultánea o asociada de dos o más especies en el mismo espacio. Engloba chagra, milpa, conuco, jardines de gremios (guild gardens) y agroforestería. Beneficios: mayor biodiversidad, suelo vivo, plagas controladas naturalmente, riesgo distribuido (si una falla, otras producen).',
    ver_tambien: ['monocultivo', 'milpa', 'gremio', 'asociacion'],
    fuentes: [
      'Vandermeer 1989 — The Ecology of Intercropping',
      'Liebman & Dyck 1993 — Crop rotation and intercropping strategies',
    ],
  },

  {
    slug: 'finca',
    termino: 'Finca',
    categoria: 'identidad',
    emoji: '🏡',
    definicion_simple: 'Pedazo de tierra donde se cultiva, se cría animales o se hace cualquier actividad agrícola. En Chagra una finca puede ser desde un balcón hasta varias hectáreas.',
    definicion_ampliada: 'En el contexto de Chagra, "finca" es la unidad operativa de gestión agrícola. Puede ser:\n\n- Finca grande comercial (varias hectáreas, sistema productivo amplio)\n- Finca familiar pequeña (agricultura de subsistencia + excedente)\n- Huerta urbana (m² de balcón, terraza, antejardín)\n- Conuco / chagra / parcela en territorio colectivo\n\nLa app Chagra adapta sus rangos sugeridos según escala, sin imponer un modelo único. Un balcón con 5 lechugas es tan finca como 1500 plantas de tomate en invernadero.',
    ver_tambien: ['chagra', 'huerta', 'conuco'],
    fuentes: ['Convención uso operativo Chagra app'],
  },

  {
    slug: 'mata',
    termino: 'Mata',
    categoria: 'identidad',
    emoji: '🌱',
    definicion_simple: 'Una planta individual. "Tener una mata de tomate" = tener una planta de tomate.',
    definicion_ampliada: 'Coloquialismo colombiano y latinoamericano para "planta". Usado en Chagra UI por familiaridad cultural. Equivalencia: 1 mata = 1 asset--plant individual en el modelo de datos. Para hortalizas que se manejan en grupo (lechugas en cama, cebollín en hilera), Chagra usa qty=N en lugar de N matas individuales — depende del modo de cultivo de la especie.',
    ver_tambien: ['planta', 'asset'],
    tambien_le_dicen: ['matica', 'palo de…'],
    fuentes: ['Diccionario de Colombianismos — Instituto Caro y Cuervo'],
  },

  {
    slug: 'biodiversidad',
    termino: 'Biodiversidad',
    categoria: 'identidad',
    emoji: '🦋',
    definicion_simple: 'La gran cantidad de seres vivos distintos que hay en un lugar: plantas, animales, hongos, bichitos. Más biodiversidad = más vida y más resistencia.',
    definicion_ampliada: 'Biodiversidad (biological diversity) tiene tres niveles: diversidad genética (variedad dentro de una especie), diversidad de especies (cuántas especies en un área), diversidad ecosistémica (variedad de ecosistemas en un territorio).\n\nColombia es uno de los países más biodiversos del planeta — segundo después de Brasil — con ~10% de la biodiversidad mundial concentrada en menos del 1% del territorio terrestre. Esa biodiversidad es activo cultural y económico (no solo ecológico).\n\nEn una chagra, alta biodiversidad significa: muchas especies de plantas + microbiota del suelo viva + insectos polinizadores diversos + aves de control biológico. Cada elemento contribuye resiliencia ante plagas, sequías, enfermedades.',
    contexto_cultural: 'Tesis del operador: "Colombia es el país de la belleza" — biodiversidad colombiana es belleza encarnada. Chagra como herramienta debe reforzar esa identidad, no exportar diseño agtech genérico.',
    ver_tambien: ['policultivo', 'agroecologia', 'especie-nativa'],
    fuentes: [
      'Humboldt Institute 2024 — Reporte biodiversidad Colombia',
      'CBD 1992 — Convention on Biological Diversity',
    ],
  },

  // ===========================================================================
  // MICROORGANISMOS (énfasis explícito anti-narrativa capitalista)
  // ===========================================================================
  {
    slug: 'microorganismo',
    termino: 'Microorganismo',
    categoria: 'microorganismos',
    emoji: '🦠',
    definicion_simple: 'Seres vivos tan pequeños que no se ven a simple vista. La mayoría son nuestros amigos, no enemigos.',
    definicion_ampliada: 'Microorganismos son organismos unicelulares o muy pequeños (bacterias, hongos microscópicos, archaeas, protozoos, virus, algas microscópicas) que solo se observan al microscopio. Son la base de toda la vida en la Tierra: descomponen materia orgánica, fijan nitrógeno atmosférico, producen oxígeno, fermentan alimentos (yogur, kimchi, chicha, queso), forman simbiosis con plantas (micorrizas) y nuestro propio intestino contiene billones que nos mantienen sanos.\n\nDe los millones de especies microbianas conocidas, **menos del 1% causan enfermedad**. La gran mayoría son neutros o benéficos. La narrativa de "todos los gérmenes son malos" es **invención comercial** del siglo XX para vender productos antibacteriales y biocidas.',
    contexto_cultural: '**Anti-narrativa capitalista explícita**: la industria de jabones, desinfectantes y agroquímicos vendió por décadas la idea de "un mundo estéril es un mundo seguro". Falso. Estériles son los hospitales y los suelos muertos del monocultivo. Una piel sana, un suelo vivo, un alimento fermentado — todos están **llenos** de microorganismos amigos. Cuidarlos es cuidar la vida.\n\nEn Chagra, los microorganismos son aliados: bocashi los multiplica, micorrizas los conectan a las raíces, fermentos los preservan en biopreparados. Aplica P6 (identidad sin postureo): no romantizamos ni demonizamos, observamos.',
    ver_tambien: ['microbiota', 'micorriza', 'bacteria', 'hongo', 'biopreparado', 'fermentacion'],
    fuentes: [
      'Margulis 1998 — Symbiotic Planet',
      'Yong 2016 — I Contain Multitudes (microbioma humano y planetario)',
      'Restrepo Rivera 2007 — Manual ABC agricultura orgánica',
    ],
  },

  {
    slug: 'microbiota',
    termino: 'Microbiota',
    categoria: 'microorganismos',
    emoji: '🌿',
    definicion_simple: 'El conjunto completo de microorganismos que viven en un lugar — en tu intestino, en tu piel, o en la tierra de tu chagra.',
    definicion_ampliada: 'Microbiota (también llamada microbioma cuando se enfatiza el ADN colectivo) es el conjunto de microorganismos que habita un ecosistema específico. Hay microbiota intestinal humana (~100 billones de bacterias, ~40% nuestra masa de células no-humanas), microbiota cutánea, vaginal, oral... y microbiota de suelo. Una cucharadita de suelo agroecológico vivo contiene **más microorganismos que personas en la Tierra**.\n\nLa microbiota del suelo determina disponibilidad de nutrientes, supresión de patógenos, estructura física del suelo, captura de carbono. Un suelo agroecológico tiene microbiota rica; un suelo de monocultivo industrial está muerto microbiológicamente — depende exclusivamente de fertilizantes sintéticos.',
    contexto_cultural: 'La microbiota del suelo es el "internet" subterráneo de cualquier chagra. Cuando aplicas bocashi o biol, no estás "fertilizando" — estás **alimentando** a una comunidad invisible que después alimentará a tus plantas.',
    ver_tambien: ['microorganismo', 'micorriza', 'humus', 'bocashi', 'edafico'],
    fuentes: [
      'Lehmann et al. 2020 — Persistence of soil organic carbon in soils as ecosystem property',
      'Bardgett & van der Putten 2014 — Belowground biodiversity and ecosystem functioning',
    ],
  },

  {
    slug: 'micorriza',
    termino: 'Micorriza',
    categoria: 'microorganismos',
    emoji: '🍄',
    definicion_simple: 'Hongos amigos que viven pegados a las raíces de las plantas. Las plantas les dan azúcar y los hongos les ayudan a buscar agua y nutrientes lejos. Trabajan en equipo.',
    definicion_ampliada: 'Micorriza (del griego "myco" hongo + "rhiza" raíz) es la asociación simbiótica entre ciertos hongos del suelo y las raíces de la mayoría de plantas terrestres (~90% de especies vegetales). El hongo extiende sus hifas (filamentos microscópicos) por el suelo formando una red — la "red de madera" (wood wide web) — que le permite a la planta acceder a agua y nutrientes (especialmente fósforo) de zonas mucho mayores a las que sus raíces alcanzarían solas. La planta paga con azúcares producidos en fotosíntesis.\n\nDos tipos principales: arbusculares (AMF, dentro de las células de la raíz) y ectomicorrizas (fuera de las células, en árboles principalmente). Sin micorrizas, muchas plantas crecen débiles. Con micorrizas, son más resistentes a sequía, plagas, y producen mejor.',
    contexto_cultural: 'Suzanne Simard documentó cómo árboles de un bosque "se hablan" entre sí a través de redes micorrízicas — se transfieren nutrientes, advierten plagas. La metáfora del "internet del bosque" tiene base científica.',
    en_discusion: {
      summary: 'Inoculación comercial de micorrizas debate eficacia',
      posiciones: [
        { tesis: 'Inoculación de Trichoderma + Glomus en sustratos agrícolas mejora establecimiento y producción', defensores: ['Berruti et al. 2016 — meta-análisis +20% producción', 'estudios Agrosavia Colombia con frutales'] },
        { tesis: 'Suelos agroecológicos ya tienen micorrizas nativas suficientes; inoculación comercial puede competir con cepas nativas adaptadas localmente', defensores: ['Salomon et al. 2022 — meta-análisis crítico', 'Hart et al. 2018 — riesgo de cepas comerciales sobre nativas'] },
      ],
      sintesis: 'Inocular tiene sentido en sustratos pasteurizados (almácigos), suelos agotados o nuevos. En suelos agroecológicos vivos, fortalecer la microbiota nativa (con bocashi, mantillo, no tilling) es preferible a inoculación externa.',
    },
    ver_tambien: ['microorganismo', 'hongo', 'simbiosis', 'trichoderma', 'humus'],
    fuentes: [
      'Simard et al. 1997 — Net transfer of carbon between ectomycorrhizal tree species in the field (Nature)',
      'Smith & Read 2008 — Mycorrhizal Symbiosis (libro de referencia)',
      'Berruti et al. 2016 — Arbuscular mycorrhizal fungi as natural biofertilizers: meta-analysis',
    ],
  },

  {
    slug: 'trichoderma',
    termino: 'Trichoderma',
    categoria: 'microorganismos',
    emoji: '🍄',
    definicion_simple: 'Un hongo amigo que vive en el suelo y protege las plantas de otros hongos malos. Es como un guardia natural.',
    definicion_ampliada: 'Trichoderma es género de hongos saprófitos del suelo (Trichoderma harzianum, T. asperellum, T. viride, entre otros) ampliamente usado como biocontrolador. Ataca a hongos fitopatógenos por tres mecanismos: micoparasitismo (los come literalmente), competencia por espacio y nutrientes, y producción de antibióticos naturales (gliotoxina, viridina).\n\nProtege contra Fusarium, Rhizoctonia, Phytophthora, Botrytis, entre muchos patógenos. Aplicación típica: drench radicular pre-trasplante (10⁶-10⁸ esporas/ml), o incorporado en bocashi/biol durante fermentación.\n\nProductos comerciales colombianos: Tricotec®, BioTric® (Agrosavia). También se puede multiplicar localmente en arroz cocido o en biol enriquecido.',
    ver_tambien: ['hongo', 'biopreparado', 'biocontrol', 'fitopatogeno'],
    fuentes: [
      'Harman et al. 2004 — Trichoderma species: opportunistic, avirulent plant symbionts (Nat Rev Microbiol)',
      'Agrosavia 2018 — Manual de uso de Trichoderma en agricultura colombiana',
    ],
  },

  {
    slug: 'em-microorganismos-eficientes',
    termino: 'EM (Microorganismos Eficientes)',
    categoria: 'microorganismos',
    emoji: '🦠',
    definicion_simple: 'Mezcla de varios tipos de microorganismos amigos (bacterias del yogur, levaduras del pan, etc.) que se aplican a la tierra y los abonos para acelerar la fermentación y la salud del suelo.',
    definicion_ampliada: 'EM (Effective Microorganisms) es una formulación desarrollada por el Dr. Teruo Higa (Japón, 1980s) que combina ~80 cepas de microorganismos benéficos en estado dormante, agrupadas en tres familias funcionales:\n\n1. **Bacterias ácido-lácticas** (Lactobacillus spp.) — fermentan azúcares produciendo ácido láctico, suprimen patógenos\n2. **Levaduras** (Saccharomyces spp.) — descomponen materia orgánica, producen vitaminas\n3. **Bacterias fototróficas** (Rhodopseudomonas spp.) — fijan nitrógeno, sintetizan compuestos en presencia/ausencia de luz\n\nUsos: activación de bocashi/biol, supresión de olores en compostaje, tratamiento de aguas residuales agrícolas, foliar preventivo. Disponible comercial (EM·1®) y de multiplicación local (EM activado en melaza).',
    en_discusion: {
      summary: 'Eficacia debatida en literatura científica',
      posiciones: [
        { tesis: 'EM aplicado a suelos agrícolas mejora calidad del suelo y reduce uso de químicos', defensores: ['Higa 1991', 'Daiss et al. 2008', 'numerous local studies en Asia/LATAM'] },
        { tesis: 'Evidencia es inconsistente; meta-análisis riguroso encuentra efectos pequeños o no significativos en condiciones agronómicas controladas', defensores: ['Mayer et al. 2010 — meta-análisis crítico', 'Olle & Williams 2013 — review limitations of EM literature'] },
      ],
      sintesis: 'Funciona claramente en compostaje (acelera fermentación, reduce olores). En suelo agrícola directo, los efectos son más pequeños y contexto-dependientes que la propaganda comercial sugiere. Útil pero no milagroso.',
    },
    ver_tambien: ['microorganismo', 'bocashi', 'biol', 'bacteria', 'fermentacion'],
    fuentes: [
      'Higa 1991 — Effective microorganisms: a biotechnology for mankind',
      'Mayer et al. 2010 — How effective are "Effective microorganisms"? meta-analysis (Sci Total Environ)',
      'Daiss et al. 2008 — Use of EM in vegetables in Europe',
    ],
  },

  {
    slug: 'simbiosis',
    termino: 'Simbiosis',
    categoria: 'microorganismos',
    emoji: '🤝',
    definicion_simple: 'Cuando dos seres vivos diferentes viven juntos y los dos ganan algo. Como las plantas y las micorrizas.',
    definicion_ampliada: 'Simbiosis (del griego "syn" = juntos + "bios" = vida) es relación íntima de larga duración entre organismos de especies distintas. Tipos:\n\n- **Mutualismo**: ambos se benefician (planta-micorriza, planta-rizobios, abeja-flor)\n- **Comensalismo**: uno se beneficia, otro neutral (epífitas en árboles)\n- **Parasitismo**: uno se beneficia, otro se perjudica (muérdago en árbol, garrapata en mamífero)\n\nLa biología moderna cada vez ve más mutualismo y menos competencia darwiniana pura. Lynn Margulis demostró que las propias células eucariotas (las nuestras) son resultado de simbiosis ancestral entre bacterias.',
    ver_tambien: ['micorriza', 'mutualismo', 'microbiota'],
    fuentes: ['Margulis 1998 — Symbiotic Planet', 'Sapp 1994 — Evolution by Association'],
  },

  {
    slug: 'fermentacion',
    termino: 'Fermentación',
    categoria: 'microorganismos',
    emoji: '🫙',
    definicion_simple: 'Cuando microorganismos amigos transforman alimentos o abonos descomponiéndolos sin oxígeno. Así se hace el yogur, el queso, el pan y el bocashi.',
    definicion_ampliada: 'Fermentación es proceso metabólico microbiano (bacterias o levaduras) que descompone azúcares en ausencia o limitación de oxígeno (anaerobio o microaerofílico), produciendo ácidos orgánicos, alcohol o gases como subproductos. Ejemplos cotidianos: pan (levadura), yogur (Lactobacillus), kimchi/chucrut (lactofermentación), chicha y guarapo (fermentación alcohólica).\n\nEn agroecología, la fermentación se aplica a biopreparados: bocashi (fermentación aeróbica controlada de materia orgánica + microorganismos), biol (fermentación anaeróbica de estiércol fresco con melaza), supermagro (fermentación con microorganismos eficientes).',
    contexto_cultural: 'Los pueblos de Colombia tienen tradiciones fermentativas profundas: chicha de maíz (muiscas y andinas), masato (afro-colombiano y andino), guarapo, vinagre de panela. Fermentación es saber ancestral; los biopreparados agroecológicos retoman esa lógica.',
    ver_tambien: ['microorganismo', 'bocashi', 'biol', 'em-microorganismos-eficientes'],
    fuentes: ['Katz 2012 — The Art of Fermentation', 'Restrepo Rivera 2007'],
  },

  {
    slug: 'fitopatogeno',
    termino: 'Fitopatógeno',
    categoria: 'microorganismos',
    emoji: '🦠',
    definicion_simple: 'Microorganismo que enferma a las plantas — como un virus, bacteria o hongo malo. Son una minoría entre todos los microorganismos.',
    definicion_ampliada: 'Fitopatógeno (del griego "phyton" planta + "pathos" enfermedad) es microorganismo (hongo, bacteria, virus, viroide, fitoplasma) que causa enfermedad en plantas. Ejemplos críticos en Colombia: Phytophthora infestans (tizón tardío de tomate y papa), Fusarium oxysporum (marchitez), Rhizoctonia solani (damping-off, costra negra), Hemileia vastatrix (roya del café), Sigatoka negra (Mycosphaerella en plátano).\n\nManejo agroecológico: prevención > curación. Suelo vivo con microbiota equilibrada inhibe naturalmente fitopatógenos por competencia y antagonismo (ej. Trichoderma vs Fusarium). Solo cuando la prevención falla se aplican biopreparados específicos (caldo bordelés, sulfocálcico).',
    ver_tambien: ['microorganismo', 'phytophthora-infestans', 'biocontrol', 'trichoderma'],
    fuentes: ['Agrios 2005 — Plant Pathology', 'Agrosavia — Manuales fitopatología cultivos colombianos'],
  },

  {
    slug: 'bacteria',
    termino: 'Bacteria',
    categoria: 'microorganismos',
    emoji: '🦠',
    definicion_simple: 'Seres unicelulares super pequeños. La mayoría son amigos: hacen el yogur, fijan nitrógeno en el suelo, viven en tu intestino ayudándote.',
    definicion_ampliada: 'Bacterias son organismos procariotas unicelulares, los más antiguos y abundantes de la Tierra. Funciones agroecológicas críticas: fijación de nitrógeno atmosférico (Rhizobium en raíces de leguminosas, Azospirillum en gramíneas), descomposición de materia orgánica, producción de fitohormonas (PGPR — Plant Growth Promoting Rhizobacteria), supresión de patógenos.\n\nEn biopreparados: Lactobacillus en bocashi y biol, Bacillus subtilis como biocontrolador de hongos. La narrativa "bacterias = peligro" es propaganda comercial: del millón+ de especies bacterianas conocidas, ~1500 causan enfermedad humana.',
    ver_tambien: ['microorganismo', 'rhizobium', 'fijacion-nitrogeno', 'biopreparado'],
    fuentes: ['Madigan 2017 — Brock Biology of Microorganisms'],
  },

  {
    slug: 'hongo',
    termino: 'Hongo',
    categoria: 'microorganismos',
    emoji: '🍄',
    definicion_simple: 'Seres vivos que no son ni planta ni animal. Algunos hacen el queso roquefort y la cerveza. Otros viven en el suelo ayudando a las plantas (micorrizas).',
    definicion_ampliada: 'Hongos (Reino Fungi) son organismos eucariotas, principalmente saprófitos (descomponen materia muerta) o simbióticos (micorrizas con plantas). En agroecología: 90% de plantas terrestres dependen de micorrizas. Trichoderma es biocontrolador. Saccharomyces hace pan, vino, kombucha. Penicillium produce penicilina.\n\nDe los millones de especies fúngicas, solo una fracción causa fitopatologías (Phytophthora — técnicamente oomicete pero similar; Fusarium, Botrytis, Erysiphe). El bosque NO existiría sin hongos descomponedores reciclando madera muerta a humus.',
    ver_tambien: ['microorganismo', 'micorriza', 'trichoderma', 'fitopatogeno', 'fermentacion'],
    fuentes: ['Sheldrake 2020 — Entangled Life: How Fungi Make Our Worlds'],
  },

  {
    slug: 'rhizobium',
    termino: 'Rhizobium (fijación de nitrógeno)',
    categoria: 'microorganismos',
    emoji: '⚛️',
    definicion_simple: 'Bacteria que vive en las raíces de las leguminosas (frijol, arveja, haba) y convierte el nitrógeno del aire en alimento para la planta. Por eso esas plantas mejoran el suelo gratis.',
    definicion_ampliada: 'Rhizobium es género de bacterias del suelo que forma simbiosis con leguminosas (Fabaceae): frijol, arveja, haba, fríjol, soya, garbanzo, alfalfa, chachafruto, leucaena. La planta forma nódulos en sus raíces donde aloja a la bacteria; la bacteria fija N₂ atmosférico convirtiéndolo en NH₄⁺ que la planta usa. La planta paga con azúcares.\n\nResultado: una hectárea de leguminosas puede fijar 100-300 kg N/año, equivalente a varios bultos de urea sintética. Por eso la milpa es genio: el frijol fertiliza al maíz gratis. La rotación con leguminosas (ej. arveja → papa) es regeneración natural del suelo.',
    ver_tambien: ['microorganismo', 'simbiosis', 'milpa', 'fijacion-nitrogeno', 'leguminosa'],
    fuentes: ['Sprent 2009 — Legume Nodulation', 'Restrepo Rivera — capítulo leguminosas'],
  },

  {
    slug: 'lactobacillus',
    termino: 'Lactobacillus',
    categoria: 'microorganismos',
    emoji: '🥛',
    definicion_simple: 'Bacteria buena que produce ácido láctico. Está en el yogur, kéfir, kimchi y sauerkraut. En la chagra ayuda a fermentar bocashi y biol.',
    definicion_ampliada: 'Lactobacillus es género de bacterias gram-positivas anaerobias facultativas que fermentan azúcares produciendo ácido láctico. Aplicaciones agroecológicas: fermentación de bocashi y biol (acidifica el medio inhibiendo patógenos), inoculante para silajes, componente principal de EM (microorganismos eficientes).\n\nMultiplicación local: leche cruda + arroz cocido → mezcla → fermentación 7 días → suero rico en Lactobacillus filtrado para uso. Fácil, gratis, replicable.',
    ver_tambien: ['bacteria', 'em-microorganismos-eficientes', 'fermentacion', 'biol'],
    fuentes: ['Higa 1991', 'Restrepo Rivera 2007 — sección EM'],
  },

  // ===========================================================================
  // BIOPREPARADOS adicionales
  // ===========================================================================
  {
    slug: 'compost',
    termino: 'Compost',
    categoria: 'biopreparados',
    emoji: '🟫',
    definicion_simple: 'Tierra negra hecha al descomponer hojas, restos de comida y otros materiales orgánicos durante meses. Alimento para tus plantas.',
    definicion_ampliada: 'Compost es resultado de descomposición aeróbica controlada de residuos orgánicos por microorganismos durante 2-6 meses. Diferencia con bocashi: compost es proceso más largo y completamente mineralizado, bocashi es fermentación parcial más rápida con microbiota viva activa al aplicar.\n\nReceta básica: 30:1 ratio C:N (verdes ricos en N como restos de comida + cafés ricos en C como hojas secas, paja, cartón). Pila aireada, humedad ~60%, volteo periódico. Termofílica primeros 30 días (~60°C, mata patógenos y semillas malezas), después mesofílica.',
    ver_tambien: ['bocashi', 'humus', 'mineralizacion', 'materia-organica'],
    tambien_le_dicen: ['abonera', 'tierra de hojas', 'mantillo'],
    fuentes: ['Diaz et al. 2007 — Composting science', 'Restrepo Rivera 2007'],
  },

  {
    slug: 'mulch',
    termino: 'Mulch / Mantillo',
    categoria: 'biopreparados',
    emoji: '🍂',
    definicion_simple: 'Capa de hojas, paja, aserrín o cartón que se pone encima de la tierra para que no se seque, no crezcan malezas, y los bichitos del suelo coman.',
    definicion_ampliada: 'Mulch (o mantillo) es cobertura del suelo con material orgánico o inorgánico. Beneficios: retención de humedad (reduce evapotranspiración 30-50%), supresión de malezas (bloquea luz para semillas), regulación térmica (suelo más estable), aporte gradual de materia orgánica al descomponerse, hábitat para microbiota y fauna edáfica.\n\nMateriales agroecológicos: paja de cereales, hojas secas, aserrín curado, cartón, restos de poda triturados, mulch vivo (cobertura de baja altura como tréboles). Espesor recomendado: 5-10 cm.',
    ver_tambien: ['cobertura', 'humus', 'permacultura'],
    tambien_le_dicen: ['hojarasca', 'cobertura', 'tendido'],
    fuentes: ['Mollison 1988', 'Holzer 2011 — Sepp Holzer\'s Permaculture'],
  },

  {
    slug: 'abono-verde',
    termino: 'Abono verde',
    categoria: 'biopreparados',
    emoji: '🌿',
    definicion_simple: 'Plantas que se siembran no para comerlas sino para cortarlas y enterrarlas en la tierra como abono natural. Las leguminosas son las mejores.',
    definicion_ampliada: 'Abono verde es práctica de sembrar especies vegetales (generalmente de crecimiento rápido) con el propósito de incorporarlas al suelo antes de su madurez para mejorar fertilidad y estructura. Especies preferidas: leguminosas (frijol terciopelo, mucuna, vicia, alfalfa, lupinos) por fijación de N, gramíneas (avena, centeno) por aporte de biomasa C, brassicáceas (mostaza, nabo forrajero) por biofumigación.\n\nMomento ideal de incorporación: pre-floración o inicio de floración (máximo C:N útil). Aporta 50-150 kg N/ha + materia orgánica + actividad microbiana.',
    ver_tambien: ['rotacion', 'leguminosa', 'mulch', 'rhizobium'],
    fuentes: ['Restrepo Rivera 2007', 'Magdoff & van Es 2009 — Building Soils for Better Crops'],
  },

  // ===========================================================================
  // BOTÁNICA adicionales
  // ===========================================================================
  {
    slug: 'acodo',
    termino: 'Acodo',
    categoria: 'botanica',
    emoji: '🪢',
    definicion_simple: 'Forma de hacer una nueva planta: doblas una rama de la planta madre hasta tocar la tierra, la entierras un poco, y al rato echa raíces. Después se corta y queda una planta nueva.',
    definicion_ampliada: 'Acodo es técnica de propagación vegetativa donde se induce el enraizamiento de un tallo aún unido a la planta madre. Tipos:\n\n- **Acodo aéreo**: bolsita con sustrato húmedo amarrada en una rama madura raspada. Usado en frutales (mango, aguacate, mora, cítricos). Tiempo: 1-3 meses.\n- **Acodo terrestre**: rama doblada al suelo, fijada con piedra, cubierta parcialmente. Usado en vid, mora, parras.\n- **Acodo de cepa** (mound layering): se entierra parte de la planta madre para que cada brote forme raíces. Usado en frutales tradicionales.\n\nVentaja sobre esqueje: la rama sigue alimentada por la madre durante el enraizamiento, mayor tasa de éxito.',
    ver_tambien: ['esqueje', 'estolon', 'injerto', 'propagacion-vegetativa'],
    tambien_le_dicen: ['mugrón', 'amugronar', 'agobio'],
    fuentes: ['Hartmann et al. 2011', 'Agrosavia — Propagación frutales'],
  },

  {
    slug: 'injerto',
    termino: 'Injerto',
    categoria: 'botanica',
    emoji: '🧬',
    definicion_simple: 'Pegar un pedazo de una planta encima de otra para que crezcan juntas. La parte de abajo (patrón) da raíces fuertes; la de arriba (variedad) da los frutos buenos.',
    definicion_ampliada: 'Injerto es unión técnica de dos plantas distintas: el patrón (rootstock, parte basal con sistema radicular) y la variedad o yema (parte superior que dará frutos/follaje). Ambos tejidos se sueldan en el cambium (capa generadora). Usos: combinar resistencia del patrón (a Fusarium, nematodos, sequía) con calidad de fruto de la variedad.\n\nFrutales injertados típicos en Colombia: aguacate Hass sobre patrón criollo o West Indies, mango sobre patrón fibroso, cítricos sobre patrón resistente a tristeza. En tomate: práctica creciente en producción tecnificada con patrón híbrido (Solanum lycopersicum × S. habrochaites).\n\nTipos de injerto: yema dormida (chip budding), yema activa (T-budding), púa (cleft), aproximación (ablactación).',
    ver_tambien: ['patron', 'esqueje', 'acodo', 'cultivar'],
    fuentes: ['Hartmann et al. 2011', 'Agrosavia 2018 — Manual injertos frutales'],
  },

  {
    slug: 'patron',
    termino: 'Patrón (rootstock)',
    categoria: 'botanica',
    emoji: '🌳',
    definicion_simple: 'La parte de abajo del injerto: la planta que da las raíces. Se elige porque resiste plagas o sequía, aunque sus frutos no sean los mejores.',
    definicion_ampliada: 'Patrón (en inglés rootstock) es la planta que aporta sistema radicular en un injerto. Se selecciona por características como resistencia a plagas/enfermedades del suelo (nematodos, Fusarium, Phytophthora), tolerancia a estrés hídrico o salino, vigor controlado (enano vs vigoroso), adaptación al piso térmico.\n\nEjemplos colombianos:\n- Aguacate Hass: patrón Trapp, criollo, West Indies (resistente a Phytophthora cinnamomi)\n- Cítricos: Cleopatra mandarina, Citrus volkameriana, Trifoliata (resistencia tristeza CTV)\n- Tomate: variedades híbridas Solanum lycopersicum × S. habrochaites (resistencia nematodos)\n- Vid: Paulsen, R110 (resistencia filoxera)',
    ver_tambien: ['injerto', 'cultivar'],
    fuentes: ['Hartmann et al. 2011', 'Agrosavia — patrones frutales colombianos'],
  },

  {
    slug: 'cultivar',
    termino: 'Cultivar (variedad)',
    categoria: 'botanica',
    emoji: '🌱',
    definicion_simple: 'Una "raza" de planta. Por ejemplo: tomate chonto, tomate cherry y tomate corazón de buey son cultivares distintos de la misma especie tomate.',
    definicion_ampliada: 'Cultivar (de "cultivated variety") es grupo de plantas seleccionadas dentro de una especie que comparten características distintivas estables (tamaño, color, forma, sabor, ciclo). Difiere de "especie" (más amplio, taxonómico) y "variedad botánica" (categoría taxonómica subespecífica natural).\n\nEjemplos:\n- Tomate (Solanum lycopersicum): cultivares chonto, cherry, milano, corazón de buey, larga vida\n- Maíz (Zea mays): capio, montañero, criollo amarillo, blanco común, nariñense, cariaco\n- Papa (Solanum tuberosum): pastusa, criolla, tocarreña, sabanera\n- Café (Coffea arabica): caturra, castillo, geisha, bourbon, típica\n\nCultivares criollos (semilla nativa) se conservan generación a generación y son patrimonio cultural; cultivares comerciales suelen ser híbridos F1 estériles que obligan a comprar semilla cada ciclo.',
    ver_tambien: ['semilla-criolla', 'red-de-semillas-libres', 'patron'],
    fuentes: ['ICA Colombia — Registro de variedades', 'IPGRI — Cultivar diversity'],
  },

  {
    slug: 'semilla-criolla',
    termino: 'Semilla criolla',
    categoria: 'botanica',
    emoji: '🌰',
    definicion_simple: 'Semilla que ha pasado de generación en generación entre campesinos, adaptada al lugar donde vive. No es híbrida ni transgénica.',
    definicion_ampliada: 'Semilla criolla (también semilla nativa, ancestral o tradicional) es material genético seleccionado y conservado por familias y comunidades campesinas durante décadas o siglos, con adaptación local fina al suelo, clima, plagas y prácticas culturales de su territorio.\n\nDiferencias críticas con otras semillas:\n- **vs Híbrida F1**: la criolla es polinización abierta — guardas semilla y siembras siguiente ciclo con mismo resultado. La F1 es estéril o segregante — debes comprar nueva cada vez.\n- **vs Transgénica**: la criolla es genéticamente estable, sin modificación de laboratorio. La transgénica tiene patente corporativa (Monsanto/Bayer) y trae restricciones legales.\n- **vs Certificada ICA**: la criolla puede no estar registrada formalmente (por costo y burocracia ICA Resolución 970). Eso la pone en zona gris legal en Colombia.',
    contexto_cultural: 'La defensa de la semilla criolla es **soberanía alimentaria** concreta. Cada vez que un campesino guarda sus semillas, resiste el modelo industrial. Las casas comunitarias de semillas (Lebrija, Tunja, Quibdó, Cali) son archivos genéticos vivos.\n\nLa Resolución 970 ICA (2010) intentó criminalizar el intercambio de semillas no certificadas — protesta nacional la suspendió parcialmente. La lucha sigue.',
    ver_tambien: ['cultivar', 'red-de-semillas-libres', 'soberania-alimentaria'],
    tambien_le_dicen: ['semilla de la casa', 'semilla nativa', 'pepa'],
    fuentes: ['Grupo Semillas Colombia', 'Documental "9.70" Victoria Solano 2013'],
  },

  {
    slug: 'antesis',
    termino: 'Antesis',
    categoria: 'botanica',
    emoji: '🌸',
    definicion_simple: 'Momento exacto cuando la flor se abre completamente y está lista para recibir polen. Las plantas tienen su "horario de abrir flores" específico.',
    definicion_ampliada: 'Antesis (del griego "anthesis" = florecimiento) es la fase fenológica en que la flor está completamente abierta y funcionalmente lista para polinización. En muchas especies dura horas a pocos días.\n\nEjemplos: tomate antesis ~6:00-10:00 AM (cuando autopolinización es óptima), maíz panoja masculina antesis ~5-7 días antes que estigmas femeninos receptivos (estrategia anti-autopolinización), pasifloras (granadilla, gulupa, curuba) antesis nocturna en algunas, diurna en otras.\n\nConocer antesis ayuda a: timing de polinización manual (cuando hay pocos polinizadores), evitar aplicación de aerosoles durante esa ventana, decidir momento de cosecha de flores comestibles.',
    ver_tambien: ['polinizacion', 'fenologia', 'cuajado'],
    fuentes: ['Schwartz 2013 — Phenology'],
  },

  {
    slug: 'cuajado',
    termino: 'Cuajado',
    categoria: 'botanica',
    emoji: '🍅',
    definicion_simple: 'Cuando la flor ya polinizada empieza a transformarse en fruto. Es el momento crítico: si cuaja bien, hay cosecha.',
    definicion_ampliada: 'Cuajado es la transición de flor fertilizada a fruto en desarrollo inicial. Inicia con cambios hormonales (incremento de auxinas y giberelinas en el ovario) que detienen senescencia floral y activan crecimiento del fruto. Falla común: aborto de cuajado por estrés (calor extremo, déficit hídrico, deficiencias de boro o calcio, polinización pobre).\n\nEn tomate: cuajado óptimo a 18-24°C nocturnos. >32°C diurnos por más de 4 días puede abortar flores. En frutales perennes (mango, aguacate, café), cuajado es proceso masivo concentrado en pocas semanas que define toda la cosecha del año.',
    ver_tambien: ['antesis', 'polinizacion', 'fenologia', 'fructificacion'],
    tambien_le_dicen: ['amarre', 'que amarre el fruto', 'prendió'],
    fuentes: ['Bewley et al. 2013', 'Agrosavia — manuales fenológicos'],
  },

  {
    slug: 'cotiledon',
    termino: 'Cotiledón',
    categoria: 'botanica',
    emoji: '🌱',
    definicion_simple: 'Las primeras "hojitas" que salen al germinar una semilla. Son las que vienen ya guardadas dentro de la semilla. Después salen las hojas verdaderas.',
    definicion_ampliada: 'Cotiledones son las hojas embrionarias contenidas en la semilla, que aparecen primero al germinar. Almacenan reservas (carbohidratos, lípidos, proteínas) que alimentan a la plántula hasta que las primeras hojas verdaderas asuman fotosíntesis.\n\nClasificación botánica fundamental:\n- **Monocotiledóneas**: 1 cotiledón al germinar (gramíneas: maíz, trigo, arroz, caña; bulbosas: cebolla, ajo; bromelias: piña; palmas)\n- **Dicotiledóneas**: 2 cotiledones (leguminosas: frijol, arveja; solanáceas: tomate, papa; cucurbitáceas: zapallo; mayoría de árboles frutales)',
    ver_tambien: ['germinacion', 'plantula', 'semilla'],
    fuentes: ['Bewley et al. 2013'],
  },

   {
     slug: 'plantula',
     termino: 'Plántula',
     categoria: 'botanica',
     emoji: '🌱',
     definicion_simple: 'Planta bebé: ya nació de la semilla, ya tiene sus primeras hojitas, pero todavía es muy chiquita y delicada. Necesita cuidado especial.',
     definicion_ampliada: 'Plántula es la fase juvenil de una planta, desde la emergencia post-germinación hasta el establecimiento de hojas verdaderas y sistema radicular funcional. Período crítico: alta vulnerabilidad a damping-off (Pythium, Rhizoctonia), exceso de riego, plagas (hormigas cortadoras, áfidos, babosas), sol directo intenso.\n\nManejo agroecológico de plántulas: almácigo bajo media-sombra con sustrato suelto bien drenado (tierra negra + cascarilla de arroz + compost en proporción 2:1:1), riego con regadera (no manguera presurizada), trasplante cuando tiene 4-6 hojas verdaderas y sistema radicular bien formado.',
     ver_tambien: ['germinacion', 'cotiledon', 'damping-off', 'sustrato'],
     tambien_le_dicen: ['matica', 'colino', 'chupón'],
     fuentes: ['Hartmann et al. 2011', 'Restrepo Rivera 2007'],
   },
   {
     slug: 'cepellon',
     termino: 'Cepellón',
     categoria: 'botanica',
     emoji: '🌱',
     definicion_simple: 'La bola de tierra que rodea las raíces de una planta al trasplantarla. Mantenerla intacta ayuda a que la planta se adapte mejor.',
     definicion_ampliada: 'El cepellón es el conjunto de raíces y sustrato que permanece unido al trasplantar una planta desde su contenedor original al suelo definitivo. Mantener el cepellón intacto durante el trasplante minimiza el estrés en la planta porque:\n\n1. Las raíces finas responsables de absorción de agua y nutrientes no se rompen\n2. La microbiota benéfica asociada a las raíces se mantiene\n3. El sustrato familiar reduce el choque de adaptación al nuevo entorno\n\nEn agroecología, se recomienda regar bien el cepellón antes del trasplante para que el sustrato se mantenga cohesionado. Al colocar la planta en su nuevo hoyo, se debe asegurar que el cepellón quede completamente cubierto con tierra nueva pero sin comprimirlo excesivamente para permitir buen drenaje y aireación.\n\nAlgunas técnicas especiales incluyen:\n- Trasplante de raíz desnuda (sin cepellón) solo en ciertas especies dormidas\n- Uso de bolsas biodegradables que permiten el crecimiento directo del cepellón\n- Poda de raíces en cepellones muy compactados para estimular nueva absorción',
     contexto_cultural: 'El concepto de cepellón es fundamental en la agricultura tradicional de muchas culturas, donde el trasplante se realiza con extremo cuidado para preservar la vida del suelo alrededor de las raíces. En sistemas como la chagra amazónica, el trasplante se hace considerando no solo la planta individual sino su relación con los microorganismos del suelo que la acompañan.',
     ver_tambien: ['trasplante', 'plantula', 'sustrato', 'micorriza'],
     fuentes: [
       'Hartmann et al. 2011 — Plant Propagation: Principles and Practices',
       'Restrepo Rivera 2007 — Manual práctico ABC de la agricultura orgánica',
     ],
   },

  {
    slug: 'aclareo',
    termino: 'Aclareo',
    categoria: 'botanica',
    emoji: '✂️',
    definicion_simple: 'Quitar algunos frutos cuando la planta tiene demasiados, para que los que queden crezcan más grandes y dulces.',
    definicion_ampliada: 'Aclareo es práctica de remoción selectiva de flores o frutos jóvenes para optimizar tamaño, calidad y vigor de los restantes. Razón: una planta con sobrecarga de frutos los produce todos pequeños o aborta muchos por estrés. Aclareo bien hecho redistribuye recursos.\n\nCuándo: post-cuajado, cuando frutos tienen tamaño de "garbanzo" en frutales. Cuánto: 30-50% reducción en sobre-cargados; criterios de selección (más cercanos al tronco, malformados, dañados se descartan primero).\n\nFrutales que se benefician: durazno, manzana, ciruelo, mango, uchuva. NO necesitan aclareo: tomate (autorregula), maíz (polinización abierta).',
    ver_tambien: ['fenologia', 'fructificacion', 'cosecha'],
    fuentes: ['Hartmann et al. 2011', 'Westwood 1993 — Temperate-zone pomology'],
  },

  {
    slug: 'alelopatia',
    termino: 'Alelopatía',
    categoria: 'botanica',
    emoji: '⚠️',
    definicion_simple: 'Cuando una planta libera químicos en sus hojas o raíces que afectan a otras plantas cerca. Algunas las ayudan, otras las perjudican.',
    definicion_ampliada: 'Alelopatía es proceso por el que una planta produce y libera al ambiente compuestos químicos (aleloquímicos) que afectan crecimiento, supervivencia o reproducción de otras plantas. Puede ser positiva (estimulante) o negativa (inhibitoria).\n\nEjemplos negativos críticos:\n- **Nogal** (Juglans) libera juglona — inhibe germinación de muchas hortalizas en su radio\n- **Eucalipto** sus hojas y raíces inhiben germinación de gramíneas\n- **Cerezo silvestre** libera amigdalina\n\nEjemplos positivos:\n- **Caléndula y tagetes** repelen nematodos\n- **Albahaca** mejora sabor del tomate vecino (controvertido pero documentado)\n- **Romero** repele moscas blancas\n\nClave en diseño chagra: conocer alelopatías = mejor diseño de asociaciones.',
    ver_tambien: ['asociacion', 'gremio', 'antagonista'],
    fuentes: ['Rice 1984 — Allelopathy', 'Putnam & Tang 1986 — The Science of Allelopathy'],
  },

  // ===========================================================================
  // PLAGAS adicionales (críticas Colombia)
  // ===========================================================================
  {
    slug: 'tuta-absoluta',
    termino: 'Tuta absoluta',
    categoria: 'plagas',
    emoji: '🐛',
    definicion_simple: 'Polilla que sus larvas comen las hojas y frutos del tomate haciendo galerías. Es la plaga #1 del tomate en Colombia.',
    definicion_ampliada: 'Tuta absoluta (Lepidoptera: Gelechiidae), conocida como "pasadora" o "minadora del tomate", es la plaga más limitante del cultivo de tomate a nivel global. Origen sudamericano, hoy presente en Colombia (Cundinamarca, Valle, Antioquia), Europa, África, Asia.\n\nSíntomas: galerías serpenteantes en hojas (mining), perforaciones en frutos (entrada larvas), excrementos negros en galerías. Adultos polillas grises 6-7mm vuelan al atardecer. Larvas hasta 5 generaciones por año.\n\nManejo agroecológico: trampas de feromonas (delta) para monitoreo, Bacillus thuringiensis (Bt) en aplicación foliar, parasitoides (Trichogramma pretiosum), rotación con no-solanáceas, eliminación de residuos infectados.',
    ver_tambien: ['fitopatogeno', 'tomate', 'biocontrol', 'feromona'],
    fuentes: ['Desneux et al. 2011 — The invasive Tuta absoluta', 'Agrosavia — Manual manejo Tuta'],
  },

  {
    slug: 'afidos',
    termino: 'Áfidos (pulgones)',
    categoria: 'plagas',
    emoji: '🐜',
    definicion_simple: 'Bichitos pequeños y blanditos que chupan la savia de las hojas y dejan una baba pegajosa. Vienen en colores: verdes, negros, amarillos.',
    definicion_ampliada: 'Áfidos (Aphidoidea, hemípteros) son insectos chupadores de savia, prolíficos por reproducción partenogenética (sin macho). Daño directo: deshidratación de la planta, deformación de hojas y brotes. Daño indirecto crítico: vectores de virus vegetales (PVY en papa, CMV en tomate, BBTV en plátano).\n\nMelaza excretada cubre hojas favoreciendo fumagina (hongo saprófito negro que reduce fotosíntesis). Hormigas cuidan a los áfidos por la melaza, lo que dificulta control biológico.\n\nManejo agroecológico: jabón potásico (suelta exoesqueleto), aceite de neem, mariquitas (Coccinellidae) y crisopas (Chrysopa) como predadores, hidrolato de ortiga foliar, cultivos trampa (caléndula).',
    ver_tambien: ['fitopatogeno', 'biocontrol', 'mariquita'],
    fuentes: ['Blackman & Eastop 2007 — Aphids on the World\'s Crops'],
  },

  {
    slug: 'mosca-blanca',
    termino: 'Mosca blanca',
    categoria: 'plagas',
    emoji: '🦟',
    definicion_simple: 'Insecto pequeñito blanco que vuela alrededor de las plantas (sobre todo tomate, papa, frijol). Chupa savia y deja excremento dulce que atrae hongos negros.',
    definicion_ampliada: 'Mosca blanca (Trialeurodes vaporariorum, Bemisia tabaci, hemípteros) es plaga clave en Solanaceae, Fabaceae y cucurbitáceas en climas templado-cálidos colombianos. Adultos pequeños blancos cubiertos de cera. Daño directo (chupar) e indirecto (vector de geminivirus en frijol, virus del enrollamiento amarillo TYLCV en tomate).\n\nMelaza excretada provoca crecimiento de fumagina (Capnodium). En invernadero las poblaciones explotan rápido por ausencia de predadores naturales y temperatura cálida estable.\n\nManejo agroecológico: trampas amarillas pegajosas (color atrayente), Beauveria bassiana (hongo entomopatógeno), Encarsia formosa (parasitoide), aceite de neem foliar, ventilación de invernaderos, plantas trampa (tabaco silvestre, fresa silvestre).',
    ver_tambien: ['fitopatogeno', 'biocontrol', 'invernadero'],
    fuentes: ['Stansly & Naranjo 2010 — Bemisia: Bionomics and Management'],
  },

  {
    slug: 'damping-off',
    termino: 'Damping-off',
    categoria: 'plagas',
    emoji: '💀',
    definicion_simple: 'Enfermedad de plántulas: las matas bebé se caen de pronto y se mueren. Pasa cuando hay demasiada humedad y suelo no esterilizado.',
    definicion_ampliada: 'Damping-off es síndrome causado por complejo de hongos del suelo (Pythium spp., Rhizoctonia solani, Fusarium spp., Phytophthora spp.) que ataca plántulas en almácigo o post-trasplante. Síntomas: estrangulamiento del tallo a nivel del suelo (cuello), colapso súbito, muerte rápida en horas a días.\n\nFactores predisponentes: exceso de humedad, sustrato no esterilizado, alta densidad de siembra, temperaturas cálidas y húmedas (>22°C + RH >80%), pH cercano a neutro (microorganismos prefieren).\n\nPrevención agroecológica: sustrato pasteurizado (calor solar), inoculación de Trichoderma harzianum pre-trasplante, drenaje excelente, riego con regadera fina (no presión), distancia adecuada entre plántulas, dosis de bocashi al fondo del semillero.',
    ver_tambien: ['fitopatogeno', 'plantula', 'trichoderma', 'almacigo'],
    fuentes: ['Lamichhane et al. 2017 — Thinking outside the box: a holistic approach to managing damping-off'],
  },

  // ===========================================================================
  // SUELO adicionales
  // ===========================================================================
  {
    slug: 'ec',
    termino: 'EC (conductividad eléctrica)',
    categoria: 'suelo',
    emoji: '⚡',
    definicion_simple: 'Medida de cuántas sales hay disueltas en el agua o suelo. Más sales = más EC. Las plantas se enferman si hay demasiada o muy poca.',
    definicion_ampliada: 'EC (Electrical Conductivity) mide la concentración total de iones disueltos en una solución, expresada en mS/cm o dS/m. En agronomía indica salinidad del suelo y nivel nutricional de soluciones nutritivas (hidroponia, fertirrigación).\n\nRangos para suelo agrícola:\n- <1 dS/m: bajo (puede limitar crecimiento por escasez)\n- 1-2 dS/m: óptimo mayoría de cultivos\n- 2-4 dS/m: ligero estrés salino, cultivos sensibles afectados (lechuga, fresa)\n- >4 dS/m: estrés severo, solo cultivos tolerantes (cebada, tomate adulto)\n\nFuentes de salinidad: fertilizantes sintéticos sobreaplicados, agua de riego salina, mineralogía del suelo. En agricultura agroecológica con biopreparados, EC tiende a estabilizarse naturalmente sin acumular sales tóxicas.',
    ver_tambien: ['ph', 'salinidad', 'npk'],
    fuentes: ['Brady & Weil 2017'],
  },

  {
    slug: 'npk',
    termino: 'NPK (nitrógeno, fósforo, potasio)',
    categoria: 'suelo',
    emoji: '🧬',
    definicion_simple: 'Los 3 nutrientes principales que necesitan las plantas: Nitrógeno (N) para hojas verdes, Fósforo (P) para raíces y flores, Potasio (K) para frutos.',
    definicion_ampliada: 'NPK son los 3 macronutrientes primarios. Cada uno cumple funciones específicas:\n\n- **Nitrógeno (N)**: componente de aminoácidos, proteínas, clorofila. Síntomas de deficiencia: hojas amarillentas (clorosis) empezando por las viejas, crecimiento lento, plantas pequeñas.\n- **Fósforo (P)**: ATP/ADP (energía celular), ácidos nucleicos, raíces y floración. Deficiencia: hojas verde oscuro o purpúreas, retraso de floración.\n- **Potasio (K)**: regulación osmótica, apertura/cierre de estomas, transporte de azúcares al fruto. Deficiencia: bordes de hojas amarillos/quemados, frutos pequeños o desabridos.\n\nFuentes agroecológicas: bocashi y compost (NPK equilibrado natural), biol (N, K), harina de huesos (P, Ca), ceniza vegetal (K), guano de murciélago (P alto).\n\nLa industria de fertilizantes sintéticos vende NPK puros (urea, DAP, KCl) creando dependencia. Suelo agroecológico genera sus propios NPK por reciclaje microbiano.',
    ver_tambien: ['ph', 'humus', 'bocashi', 'biol', 'mineralizacion'],
    fuentes: ['Brady & Weil 2017'],
  },

  {
    slug: 'materia-organica',
    termino: 'Materia orgánica',
    categoria: 'suelo',
    emoji: '🍂',
    definicion_simple: 'Todo lo que estuvo vivo y se está descomponiendo en el suelo: hojas, raíces muertas, restos de animales, compost, bocashi. Es comida para los microorganismos.',
    definicion_ampliada: 'Materia orgánica (MO) del suelo es el conjunto de compuestos carbonados de origen biológico en distintas etapas de descomposición. Componentes: residuos frescos (hojas caídas, restos de cosecha), biomasa microbiana viva (~5%), humus estabilizado (40-60%).\n\nFunciones críticas:\n1. Reservorio de N, P, S (mineralización gradual)\n2. Capacidad de intercambio catiónico (CIC) — retiene nutrientes contra lavado\n3. Estructura del suelo (agregación) — mejora aireación y drenaje\n4. Retención de humedad (cada 1% MO retiene ~150-300 mil litros agua/ha)\n5. Hábitat de microbiota y fauna edáfica\n\nNivel saludable: 4-6% MO (medible en laboratorio Agrosavia). Suelos colombianos andinos volcánicos pueden alcanzar 8-15% naturalmente. Suelos agotados de monocultivo industrial: <2%.',
    ver_tambien: ['humus', 'compost', 'bocashi', 'microbiota', 'cic'],
    fuentes: ['Lehmann & Kleber 2015', 'FAO 2017 — Soil organic carbon'],
  },

  // ===========================================================================
  // INFORMÁTICA adicionales
  // ===========================================================================
  {
    slug: 'indexeddb',
    termino: 'IndexedDB',
    categoria: 'informatica',
    emoji: '💾',
    definicion_simple: 'Base de datos que vive dentro del navegador de tu celular. Chagra la usa para guardar tus registros sin necesitar internet.',
    definicion_ampliada: 'IndexedDB es API de almacenamiento estructurado nativa del navegador, soportada en todos los modernos. Permite guardar grandes volúmenes (~varios GB) de datos estructurados localmente con queries indexadas. Diferente de localStorage (clave-valor simple, ~5MB max) o cookies (de servidor).\n\nChagra usa IndexedDB para: pendingTransactions (registros offline), cachéo de assets sincronizados, photos guardadas localmente, preferences. La sync con FarmOS usa IndexedDB como source-of-truth temporal hasta que la conexión permita push al servidor.',
    ver_tambien: ['offline-first', 'sync', 'pwa', 'opfs'],
    fuentes: ['MDN — IndexedDB API'],
  },

  {
    slug: 'sync',
    termino: 'Sync (sincronización)',
    categoria: 'informatica',
    emoji: '🔄',
    definicion_simple: 'Proceso de subir tus datos guardados localmente al servidor cuando hay internet, para que estén respaldados y otros dispositivos los vean.',
    definicion_ampliada: 'Sync (sincronización) en Chagra es el proceso por el que los logs guardados en IndexedDB local se transfieren al servidor FarmOS cuando hay conectividad. Características:\n\n1. **Offline-first**: el operador puede registrar siempre, sin esperar respuesta del servidor.\n2. **Idempotencia**: si un POST falla por timeout pero llegó al servidor, no se duplica al reintentarse (idempotency_key).\n3. **HLC (Hybrid Logical Clock)**: timestamp lógico para resolver orden de eventos en sync multi-dispositivo.\n4. **Sin cancelación**: append-only — sync no muta logs, solo los confirma como "uploaded".\n5. **Retry con backoff**: ante fallo, espera exponencial antes de reintentar.\n\nIndicador visual NetworkStatusBar muestra estado: SYNCING/OFFLINE/SYNCED/ERROR.',
    ver_tambien: ['offline-first', 'indexeddb', 'farmos', 'append-only'],
    fuentes: ['Chagra ADR-019/ADR-027 sub-shapes'],
  },

  {
    slug: 'bitacora',
    termino: 'Bitácora',
    categoria: 'informatica',
    emoji: '📔',
    definicion_simple: 'Lista cronológica de todo lo que has registrado en tu finca: siembras, cosechas, observaciones, fotos. Es la memoria de tu chagra.',
    definicion_ampliada: 'Bitácora (en Chagra UI: "Bitácora" o "Registros recientes") es la vista principal de logs append-only. Muestra eventos en orden cronológico inverso (más reciente arriba). Cada entrada: tipo (siembra/cosecha/observación/insumo/mantenimiento), nombre del asset asociado, fecha, autor (si multi-operador), foto si existe, estado de sync (pendiente/sincronizado/error).\n\nPropósito agroecológico: trazabilidad completa para certificación orgánica, aprendizaje retrospectivo (qué funcionó/qué no), evidencia para asesores externos. Puente entre datos crudos y narrativa de la finca.',
    ver_tambien: ['log', 'asset', 'append-only'],
    fuentes: ['Chagra UI conventions'],
  },

  // ===========================================================================
  // IA adicionales
  // ===========================================================================
  {
    slug: 'llm',
    termino: 'LLM (Large Language Model)',
    categoria: 'ia',
    emoji: '🧠',
    definicion_simple: 'Modelo de inteligencia artificial muy grande que aprendió de millones de textos y puede responder preguntas, escribir y conversar. ChatGPT, Claude y Gemini son LLMs famosos.',
    definicion_ampliada: 'LLM (Large Language Model) es modelo de aprendizaje automático con miles de millones de parámetros, entrenado en grandes corpus de texto para generar lenguaje. Arquitectura típica: Transformer (Attention is All You Need, Vaswani et al. 2017). Capacidades: generación de texto, traducción, resumen, programación, razonamiento limitado.\n\nLimitaciones críticas:\n- **Alucinaciones**: pueden inventar información que suena cierta pero no lo es\n- **Sesgos**: heredan sesgos del training data\n- **Tokens limitados**: contexto finito (~128K-1M tokens según modelo)\n- **Costo computacional**: inferencia local requiere GPU o CPU potente\n\nChagra usa LLMs locales (qwen3.5:4b, gemma3:4b vía Ollama) con guardrails RAG estrictos para evitar alucinaciones en consejos agroecológicos.',
    ver_tambien: ['ollama', 'rag', 'guardrails', 'qwen', 'gemma'],
    fuentes: ['Vaswani et al. 2017 — Attention is All You Need', 'Radford et al. 2019 — Language Models are Unsupervised Multitask Learners'],
  },

  {
    slug: 'guardrails',
    termino: 'Guardrails (barreras de seguridad)',
    categoria: 'ia',
    emoji: '🛡️',
    definicion_simple: 'Reglas que se le ponen a la IA para que NO diga ciertas cosas. Como las barandillas de una carretera para que el carro no se salga.',
    definicion_ampliada: 'Guardrails son mecanismos técnicos y semánticos que restringen qué puede decir o hacer un modelo de IA. En Chagra HelpVoiceQuestion, los guardrails RAG son estrictos:\n\n1. **Corpus único**: la IA solo puede citar el corpus consolidado DR-034 de la especie consultada\n2. **Detección anti-alucinación**: si la pregunta cae fuera del corpus, debe decir "no sé / fuera de corpus"\n3. **Validación de dosis**: dosis de biopreparados sugeridas deben coincidir literalmente con el corpus, no extrapolación\n4. **Citas obligatorias**: respuestas referenciables a entradas específicas del corpus\n\nRazón: una IA libre puede sugerir dosis inventadas de un biopreparado que dañe cultivos reales del operador. Guardrails alinea la IA con responsabilidad agroecológica.',
    ver_tambien: ['rag', 'llm', 'anti-alucinacion', 'corpus'],
    fuentes: ['NeMo Guardrails NVIDIA', 'Anthropic Constitutional AI'],
  },

  {
    slug: 'corpus',
    termino: 'Corpus',
    categoria: 'ia',
    emoji: '📚',
    definicion_simple: 'Conjunto de textos curados que se le da a la IA como única fuente de información. Si la pregunta no está en el corpus, la IA no debe inventar.',
    definicion_ampliada: 'Corpus (latín "cuerpo") en contexto IA es colección estructurada de documentos que sirve de fuente referencial para sistemas RAG. En Chagra:\n\n- **Corpus DR-034**: cycle-content lechuga / fresa / tomate chonto consolidado por convergencia 3/3 de Claude web + Gemini DR + DeepSeek V3 + curaduría humana pendiente. Datos calibrados anti-overpromise, rangos colombianos sin biocidas.\n- **Corpus 100 especies colombianas (en curaduría)**: fitonimia indígena + regionalismos + saberes tradicionales\n\nCorpus debe ser: auditable (fuentes verificables), versionable (cambios trackeados), abierto (revisable por la comunidad), curado (sin contradicciones internas).',
    ver_tambien: ['rag', 'guardrails', 'llm'],
    fuentes: ['Chagra DR-034 + ADR-032 + ADR-033'],
  },

  // ===========================================================================
  // ECOLOGÍA
  // ===========================================================================
  {
    slug: 'gremio',
    termino: 'Gremio (asociación)',
    categoria: 'ecologia',
    emoji: '🤝',
    definicion_simple: 'Grupo de plantas que se ayudan entre sí cuando crecen juntas. Como la milpa: maíz, frijol y calabaza son un gremio clásico.',
    definicion_ampliada: 'Gremio (guild) en permacultura/agroecología es ensamble de especies que cumplen funciones complementarias en un mismo espacio: una fija nitrógeno, otra atrae polinizadores, otra repele plagas, otra cubre suelo. Concepto desarrollado por Bill Mollison.\n\nGremio clásico mesoamericano (milpa): maíz (estructura vertical) + frijol (fijación N) + calabaza (cobertura suelo). En chagra amazónica el gremio se expande: yuca + plátano + ají + frutales. En jardín andino: cubio + papa + mashua + ulluco.\n\nDiseñar gremios reduce drásticamente trabajo de manejo y aumenta productividad por área vs monocultivo.',
    ver_tambien: ['milpa', 'asociacion', 'antagonista', 'permacultura'],
    fuentes: ['Mollison 1988 — Permaculture Design'],
  },

  {
    slug: 'antagonista',
    termino: 'Antagonista (planta)',
    categoria: 'ecologia',
    emoji: '⚔️',
    definicion_simple: 'Planta que NO debe sembrarse cerca de otra porque se hacen daño. Como hinojo y la mayoría de cultivos: el hinojo "molesta" todo.',
    definicion_ampliada: 'Antagonista en agroecología es especie que afecta negativamente el crecimiento o productividad de otra cuando crecen cercanas. Mecanismos: alelopatía química, competencia por nutrientes/agua, atracción de plagas comunes, sombra excesiva.\n\nEjemplos críticos:\n- **Hinojo** vs prácticamente todo (alelopatía agresiva)\n- **Allium** (ajo, cebolla) vs **leguminosas** (frijol, arveja) — interfieren con Rhizobium\n- **Brassica** (col, brócoli) vs **Solanaceae** (tomate, papa) — comparten Phytophthora y otras enfermedades\n- **Nogal** vs **manzana, tomate, papa** (juglona)\n\nConocer antagonistas es tan importante como conocer compañeros — define qué NO sembrar junto.',
    ver_tambien: ['gremio', 'asociacion', 'alelopatia'],
    fuentes: ['Riotte 1998 — Carrots Love Tomatoes', 'Mollison 1988'],
  },

  {
    slug: 'especie-nativa',
    termino: 'Especie nativa',
    categoria: 'ecologia',
    emoji: '🌳',
    definicion_simple: 'Planta o animal que es de aquí, que ha evolucionado en este territorio durante miles de años. Las nativas son las mejores adaptadas al clima local.',
    definicion_ampliada: 'Especie nativa (autóctona) es aquella que evolucionó naturalmente en una región y forma parte de su flora/fauna ancestral, antes de la intervención humana significativa. En Colombia: cacao (Theobroma cacao), yuca (Manihot esculenta), papa (Solanum tuberosum), maíz (Zea mays — de domesticación mesoamericana, llegado temprano a los Andes), aguacate, pasifloras (granadilla, gulupa, curuba), guayaba, lulo, papayuela.\n\nVentajas en agricultura: adaptadas a clima local, suelos, plagas locales — menos insumos, más resistentes. Sembrar nativas también restaura biodiversidad cultural.\n\nChagra prioriza nativas y criollas en sus recomendaciones de gremios y cycle-content.',
    ver_tambien: ['biodiversidad', 'invasora', 'endemica', 'naturalizada'],
    fuentes: ['Humboldt Institute — Listado nacional especies nativas Colombia'],
  },

  {
    slug: 'invasora',
    termino: 'Especie invasora',
    categoria: 'ecologia',
    emoji: '⚠️',
    definicion_simple: 'Planta o animal que vino de otro lugar y se reproduce tanto que desplaza a las especies de aquí. Como el retamo en los páramos colombianos.',
    definicion_ampliada: 'Especie invasora es organismo introducido (intencional o accidentalmente) que se establece, prolifera y desplaza especies nativas, reduciendo biodiversidad y alterando funciones ecosistémicas. Para ser invasora debe cumplir 3 criterios: (1) origen exógeno, (2) reproducción agresiva fuera de control, (3) impacto ecológico medible.\n\nInvasoras críticas en Colombia:\n- **Ulex europaeus (retamo espinoso)**: páramos andinos — desplaza frailejones, modifica ciclo de nutrientes, riesgo de incendios\n- **Megathyrsus maximus (pasto guinea)**: sabanas, ganadería extensiva\n- **Rumex obtusifolius (lengua de vaca)**: huertas frías\n- **Caracol africano** (Achatina fulica)\n- **Trips palmi**\n\nManejo agroecológico: erradicación manual recurrente, NO biocidas (matan especies no-objetivo), reemplazo con nativas (ej. después de retamo: especies del páramo restauradas).',
    contexto_cultural: 'Acción Antipoética (jornadas antes-y-después) — la erradicación de retamo en La Chorrera (Choachí) por Guatoc + comunidad es ejemplo concreto de restauración.',
    ver_tambien: ['especie-nativa', 'biodiversidad', 'endemica'],
    fuentes: ['Humboldt Institute — Especies invasoras de Colombia 2018'],
  },

  // ===========================================================================
  // SOCIOPOLÍTICA adicionales
  // ===========================================================================
  {
    slug: 'vandana-shiva',
    termino: 'Vandana Shiva',
    categoria: 'sociopolitica',
    emoji: '🌾',
    definicion_simple: 'Activista india que pelea por las semillas libres y contra las grandes empresas que las patentan. Es una de las voces más fuertes en defensa de la soberanía alimentaria.',
    definicion_ampliada: 'Vandana Shiva (India, 1952) es física, ecóloga, activista y autora. Fundadora de Navdanya (1987), red de bancos de semillas comunitarias en India que ha conservado >5000 variedades nativas. Crítica feroz de la Revolución Verde, de patentes sobre seres vivos, y del modelo agrícola industrial-corporativo.\n\nLibros clave: "Stolen Harvest" (2000), "Earth Democracy" (2005), "The Violence of the Green Revolution" (1991). Su concepto "biopiratería" denuncia patentes de Monsanto/DuPont sobre saberes y semillas indígenas.\n\nPara Chagra: Shiva es referente de la línea filosófica del producto. La defensa de la semilla criolla, el rechazo a transgénicos, la soberanía alimentaria son posiciones explícitas.',
    ver_tambien: ['soberania-alimentaria', 'red-de-semillas-libres', 'jairo-restrepo'],
    fuentes: ['Shiva 1991, 2000, 2005', 'Navdanya.org'],
  },

  {
    slug: 'via-campesina',
    termino: 'La Vía Campesina',
    categoria: 'sociopolitica',
    emoji: '🌍',
    definicion_simple: 'Movimiento internacional de campesinas y campesinos que defienden la soberanía alimentaria y la agricultura familiar. Creó el concepto de soberanía alimentaria en 1996.',
    definicion_ampliada: 'La Vía Campesina (LVC) es movimiento campesino internacional fundado en 1993 en Mons (Bélgica), que articula >200 organizaciones de >80 países representando ~200 millones de campesinas y campesinos. Enmarcó por primera vez "soberanía alimentaria" como concepto político (Roma 1996, Cumbre Mundial sobre la Alimentación FAO).\n\nEjes de lucha: reforma agraria (tierra para quien la trabaja), agroecología, defensa de semillas, derechos de mujeres rurales, defensa de migrantes campesinos. Capítulo colombiano: Coordinador Nacional Agrario (CNA), ANUC, organizaciones afro y indígenas afiliadas.',
    ver_tambien: ['soberania-alimentaria', 'recab', 'agroecologia'],
    fuentes: ['viacampesina.org', 'Patel 2009 — What does food sovereignty look like?'],
  },

  {
    slug: 'convenio-169-oit',
    termino: 'Convenio 169 OIT',
    categoria: 'sociopolitica',
    emoji: '⚖️',
    definicion_simple: 'Tratado internacional que protege a los pueblos indígenas y tribales: derecho a tierra, identidad, consulta previa para cualquier proyecto en su territorio.',
    definicion_ampliada: 'Convenio 169 sobre Pueblos Indígenas y Tribales (Organización Internacional del Trabajo, 1989) es instrumento jurídico vinculante para estados ratificantes. Colombia lo ratificó mediante Ley 21/1991 — tiene rango constitucional vía bloque de constitucionalidad. Establece:\n\n1. **Autoidentificación**: criterio fundamental para reconocimiento\n2. **Consulta previa, libre e informada (CPLI)**: cualquier medida administrativa o legislativa que afecte a pueblos indígenas requiere consulta\n3. **Tierras ancestrales**: derecho colectivo, no propiedad privada individual\n4. **Saberes tradicionales**: protección de conocimientos etnobotánicos, fitogenéticos, espirituales\n\nPara Chagra: el uso de fitonimia indígena en el catálogo etnobotánico y el ciclo de maíz milpa debe respetar este marco. La implementación incluye consulta a comunidades aliadas antes de publicar corpus etnobotánico.',
    ver_tambien: ['etnobotanica', 'soberania-alimentaria', 'identidad'],
    fuentes: ['ILO Convention No. 169', 'Ley 21 de 1991 Colombia'],
  },

  {
    slug: 'etnobotanica',
    termino: 'Etnobotánica',
    categoria: 'sociopolitica',
    emoji: '🌿',
    definicion_simple: 'Estudio de cómo los pueblos usan las plantas: para comer, curar, hacer ceremonias, construir. Es ciencia + saber ancestral juntos.',
    definicion_ampliada: 'Etnobotánica es disciplina interdisciplinaria que documenta y analiza las relaciones culturales entre pueblos humanos y plantas. Combina antropología, lingüística, botánica taxonómica y ecología. Investiga: nomenclatura local de plantas, usos alimenticios, medicinales, rituales, materiales, agronómicos, mitológicos.\n\nColombia es referente mundial: alta diversidad cultural (>100 pueblos indígenas + comunidades afro + campesinas) × alta diversidad biológica (segunda más biodiversa). Tropenbos Colombia, ICANH, Universidad Nacional, SINCHI, Caro y Cuervo son centros de investigación etnobotánica.\n\nPrincipios éticos: consulta previa (Convenio 169 OIT), reciprocidad (devolver beneficios a comunidades), reconocimiento de autoría colectiva, protección de saberes sagrados.',
    contexto_cultural: 'El catálogo etnobotánico de Chagra (fitonimia y ciclo de maíz milpa) son ejercicios sensibles. La curaduría rigurosa con consulta humana post-LLM no es opcional — es ética fundamental.',
    ver_tambien: ['fitonimia', 'convenio-169-oit', 'sabedor', 'soberania-alimentaria'],
    fuentes: [
      'Schultes & Raffauf 1990 — The Healing Forest (etnobotánica amazónica)',
      'Tropenbos Colombia — Etnobotánica Pacífico colombiano',
      'ICANH — Atlas de pueblos indígenas',
    ],
  },

  {
    slug: 'fitonimia',
    termino: 'Fitonimia',
    categoria: 'botanica',
    emoji: '🌿',
    definicion_simple: 'Los nombres con que las plantas son llamadas en distintas comunidades. Una misma planta puede tener un nombre científico, varios nombres comunes en español y nombres propios en lenguas indígenas o afro.',
    definicion_ampliada: 'Fitonimia es el estudio de los nombres que reciben las plantas. En Colombia conviven tres capas:\n\n1. **Nombre científico** (ej. Solanum lycopersicum) — universal, en latín, cargado por la academia botánica.\n2. **Nombres comunes en español** (ej. tomate, jitomate) — varían por región: en Antioquia "tomate de aliño", en Nariño "tomate de mesa".\n3. **Nombres en lenguas originarias** (ej. en kichwa amazónico, en wayuunaiki, en nasa yuwe) — cargan saber medicinal, ritual y agrícola que el nombre técnico ignora.\n\nUna planta puede tener 5 o más nombres locales en Colombia. Reconocerlos es reconocer a las comunidades que las cultivan, las usan y las nombran.\n\nEn Chagra el catálogo registra el nombre científico + nombres comunes regionales. El plan futuro incluye nombres en lenguas originarias con consulta directa a sabedores y sabedoras de las comunidades, respetando consentimiento previo libre e informado.',
    contexto_cultural: 'Llamar a una planta solo por su nombre científico es una decisión política: borra los saberes locales que la nombran de otra manera. Llamarla por su nombre indígena sin consultar es apropiación. El camino correcto es el diálogo de saberes con las comunidades.',
    ver_tambien: ['etnobotanica', 'sabedor', 'convenio-169-oit', 'soberania-alimentaria'],
    fuentes: [
      'Bernal, Galeano & García 2011 — Las palmas de Colombia',
      'Toledo & Barrera-Bassols 2008 — La memoria biocultural',
    ],
  },

  {
    slug: 'sabedor',
    termino: 'Sabedor / Sabedora',
    categoria: 'sociopolitica',
    emoji: '👵',
    definicion_simple: 'Persona mayor de una comunidad que carga el conocimiento tradicional sobre plantas, salud, agricultura y cultura. Son las "bibliotecas vivas" de los pueblos.',
    definicion_ampliada: 'Sabedor o sabedora (también "mayor", "abuela", "taita") es figura de autoridad cultural en pueblos indígenas, afro y campesinos colombianos. Custodios y custodias de saberes ancestrales transmitidos oralmente: nombres y usos de plantas, recetas medicinales, calendario agrícola lunar, rituales, mitología, técnicas constructivas.\n\nEn agroecología, las sabedoras (mujeres mayoritariamente) son las que mejor conocen las semillas criollas familiares, las recetas de biopreparados tradicionales, las asociaciones plant-plant, las épocas de siembra según ciclos lunares. Su conocimiento NO está en libros — está en práctica viva.\n\nConsultar a sabedores en proyectos etnobotánicos (fitonimia colombiana, ciclo del maíz milpa) es obligación ética y técnicamente superior a depender solo de literatura académica.',
    contexto_cultural: 'La Vía Campesina y RECAB enfatizan el "diálogo de saberes": ciencia académica + saberes tradicionales en pie de igualdad. Chagra adopta esta filosofía.',
    ver_tambien: ['etnobotanica', 'agroecologia', 'recab', 'soberania-alimentaria'],
    fuentes: [
      'Hernández Romero 2004 — Saberes locales y agricultura sustentable',
      'Toledo & Barrera-Bassols 2008 — La memoria biocultural',
    ],
  },

  // ===========================================================================
  // BIOPREPARADOS (continuación)
  // ===========================================================================
  {
    slug: 'biopreparado',
    termino: 'Biopreparado',
    categoria: 'biopreparados',
    emoji: '🧪',
    definicion_simple: 'Mezcla casera para nutrir plantas o cuidarlas de plagas, hecha con materiales naturales (estiércol, plantas, melaza, ceniza). No usa venenos químicos.',
    definicion_ampliada: 'Biopreparados son formulaciones agroecológicas elaboradas a partir de materiales naturales locales (estiércol fresco, plantas, melaza, leche, ceniza, suero, microorganismos) mediante procesos de fermentación, extracción o disolución. Cumplen funciones de fertilización, biocontrol, estimulación o repelencia. Costo bajo, dependencia mínima de insumos comerciales, conocimiento abierto.\n\nFamilias principales: bocashi (sólido fermentado), biol/supermagro (líquidos fermentados), caldos minerales (sulfocálcico, bordelés), purines vegetales (ortiga, equiseto), hidrolatos de plantas aromáticas, EM activado.',
    contexto_cultural: 'Jairo Restrepo Rivera (Colombia) es el referente latinoamericano de biopreparados desde los 1990s. Su Manual ABC de la Agricultura Orgánica está disponible gratuito y formó a miles de campesinos en LATAM. La filosofía: "que el campesino sea su propio insumo".',
    ver_tambien: ['bocashi', 'biol', 'supermagro', 'caldo-bordeles', 'caldo-sulfocalcico', 'em-microorganismos-eficientes'],
    fuentes: [
      'Restrepo Rivera 2007 — Manual práctico ABC de la agricultura orgánica',
      'Pinheiro Machado 2014 — Cómo producir biopreparados',
    ],
  },

  {
    slug: 'bocashi',
    termino: 'Bocashi',
    categoria: 'biopreparados',
    emoji: '🌾',
    definicion_simple: 'Abono sólido hecho fermentando estiércol, hojas, tierra, ceniza, salvado y melaza. Se llama "bocashi" en japonés porque la receta original viene de Japón. Es alimento vivo para tu suelo.',
    definicion_ampliada: 'Bocashi (japonés "ぼかし" = "fermentado suave") es abono orgánico fermentado aeróbicamente (con oxígeno) durante 10-15 días, que descompone parcialmente la materia orgánica produciendo un sustrato denso en microorganismos benéficos, nutrientes asimilables y ácidos húmicos.\n\nReceta clásica Restrepo: estiércol fresco (vaca, gallina, cerdo), salvado de arroz, cascarilla de arroz, tierra negra, carbón vegetal triturado, melaza, levadura de pan, agua. Pila ventilada, volteo diario, fermentación termofílica (~60°C primeros días). Listo cuando baja temperatura y tiene olor a tierra dulce, no a podrido.\n\nDosis típica para hortalizas: 1.5-2 kg/m² incorporado 10-12 días pre-trasplante. Para frutales: 200-500 g/planta al inicio de cada pico de floración.',
    contexto_cultural: 'Originario de Japón natural farming (Mokichi Okada, 1930s). Adoptado y popularizado en LATAM por Jairo Restrepo Rivera (Colombia) desde los 1990s. Hoy es el biopreparado base de cualquier finca agroecológica colombiana.',
    ver_tambien: ['biopreparado', 'fermentacion', 'compost', 'humus', 'mineralizacion'],
    fuentes: [
      'Restrepo Rivera 2007 — Manual ABC, capítulo bocashi',
      'Tolentino et al. 2023 — Efectos de bocashi en suelos colombianos',
      'Boudet et al. 2017 — Reporte 54 t/ha tomate con 2.99 t/ha bocashi',
    ],
  },

  {
    slug: 'biol',
    termino: 'Biol',
    categoria: 'biopreparados',
    emoji: '🥛',
    definicion_simple: 'Abono líquido que se hace fermentando estiércol fresco con melaza y agua en un balde tapado durante un mes. Se diluye y se aplica a las plantas.',
    definicion_ampliada: 'Biol es biofertilizante líquido obtenido por fermentación anaeróbica (sin oxígeno, biodigestor cerrado) de estiércol fresco mezclado con melaza, leche y agua durante 30-45 días. Resultado: líquido marrón rico en hormonas vegetales (auxinas, giberelinas, citoquininas), aminoácidos libres, microorganismos vivos, nutrientes solubles.\n\nDosis: dilución 5-10% en agua para aplicación foliar (mochila), 10-20% para drench radicular. Aplicaciones cada 15-30 días según ciclo del cultivo. Mejora vigor, fructificación, resistencia a estrés hídrico.',
    ver_tambien: ['biopreparado', 'supermagro', 'fermentacion', 'estiercol'],
    fuentes: [
      'Suquilanda 2008 — Producción orgánica de cultivos andinos',
      'Restrepo Rivera 2007 — Manual ABC',
    ],
  },

  {
    slug: 'supermagro',
    termino: 'Supermagro',
    categoria: 'biopreparados',
    emoji: '🪣',
    definicion_simple: 'Versión avanzada del biol: se le agregan minerales y plantas medicinales para que tenga más nutrientes especiales.',
    definicion_ampliada: 'Supermagro es biofertilizante foliar avanzado, evolución del biol clásico desarrollada por Delvino Magro (Brasil). Además de la base de estiércol+melaza, incorpora: harina de huesos (fósforo y calcio), sulfato de zinc, sulfato de manganeso, ácido bórico, sulfato de magnesio, plantas medicinales (cola de caballo, ortiga, ajenjo). Fermentación 30-90 días.\n\nDosis foliar: 2-3% en agua, cada 7-15 días según fenofase. Aporta micronutrientes equilibrados muy difíciles de conseguir en biol simple.',
    en_discusion: {
      summary: 'Eficacia comparada con fertilizantes minerales sintéticos sigue debatida',
      posiciones: [
        { tesis: 'Supermagro replica funciones de fertilización foliar comercial a costo 10-100x menor con base local', defensores: ['Delvino Magro 1990s', 'experiencia campesina LATAM'] },
        { tesis: 'Falta investigación científica formal con controles rigurosos para validar dosis óptimas', defensores: ['literatura científica académica limitada en LATAM'] },
      ],
      sintesis: 'Funciona en práctica de muchas fincas, pero requiere ajustes empíricos por sitio. No reemplaza diagnóstico de suelo previo.',
    },
    ver_tambien: ['biopreparado', 'biol', 'fermentacion'],
    fuentes: ['Magro & Magro 2007', 'Restrepo Rivera 2007 — Manual ABC'],
  },

  {
    slug: 'caldo-bordeles',
    termino: 'Caldo bordelés',
    categoria: 'biopreparados',
    emoji: '🟦',
    definicion_simple: 'Mezcla preventiva contra hongos de las plantas, hecha con sulfato de cobre y cal viva en agua. Tiene color azul.',
    definicion_ampliada: 'Caldo bordelés (origen Burdeos, Francia siglo XIX) es fungicida preventivo de amplio uso en agricultura agroecológica. Composición: sulfato de cobre + cal viva + agua. Forma compuestos básicos de cobre que se adhieren a la cutícula de la planta y liberan iones Cu²⁺ ante humedad, inhibiendo germinación de esporas fúngicas.\n\nUsos: prevención de mildiu (Phytophthora infestans), royas, mancha negra. Aplicación foliar antes de períodos de alta humedad. Concentración estándar: 1% (1 kg de cal + 1 kg sulfato cobre / 100L agua).\n\n**Importante**: el cobre acumulado en suelo es persistente. Uso debe ser preventivo y discreto, no rutinario. Permitido en agricultura orgánica certificada con dosis máximas reguladas.',
    en_discusion: {
      summary: 'Estatus en agroecología estricta vs orgánica certificada',
      posiciones: [
        { tesis: 'Caldo bordelés es herramienta legítima preventiva, especialmente en climas húmedos colombianos donde Phytophthora es problema crítico', defensores: ['Agrosavia recomendaciones manejo tomate', 'Cenicafé manejo roya'] },
        { tesis: 'El cobre acumulado en suelo a largo plazo es contaminante; alternativas (silicio, leche cruda diluida, microorganismos antagonistas) deben preferirse', defensores: ['EU regulación 2018 — limitando Cu en orgánico a 4kg/ha/año', 'Restrepo Rivera — preferencia por alternativas'] },
      ],
      sintesis: 'Útil en emergencia preventiva. NO base de manejo. Combinarlo con biopreparados antagonistas y manejo agronómico de humedad/ventilación.',
    },
    ver_tambien: ['caldo-sulfocalcico', 'biopreparado', 'fitopatogeno', 'phytophthora-infestans'],
    fuentes: [
      'Restrepo Rivera 2007 — Manual ABC',
      'EU Regulation 1981/2018 — Cu in organic farming limits',
    ],
  },

  {
    slug: 'caldo-sulfocalcico',
    termino: 'Caldo sulfocálcico',
    categoria: 'biopreparados',
    emoji: '🟧',
    definicion_simple: 'Mezcla amarilla preventiva contra hongos y ácaros, hecha hirviendo azufre con cal viva. Tiene olor fuerte.',
    definicion_ampliada: 'Caldo sulfocálcico es polisulfuro de calcio elaborado por cocción de azufre + cal viva + agua durante 1 hora. Resultado: líquido rojizo-anaranjado que actúa como acaricida y fungicida preventivo. Mecanismo: liberación de H₂S y polisulfuros que penetran cutícula fúngica.\n\nUsos: oídio (mildiu polvoso), arañita roja, escamas en frutales, costra de frutos. Concentración foliar: dilución 1:80 o 1:100 (≈1% en agua). NO aplicar en pleno sol o temperaturas >30°C (quema follaje).\n\nIncompatible con caldo bordelés (no aplicar mismo día).',
    ver_tambien: ['caldo-bordeles', 'biopreparado', 'fitopatogeno'],
    fuentes: ['Restrepo Rivera 2007 — Manual ABC', 'Cabrera Marulanda et al. 2018'],
  },

  {
    slug: 'hidrolato',
    termino: 'Hidrolato',
    categoria: 'biopreparados',
    emoji: '💧',
    definicion_simple: 'Agua aromática con propiedades de plantas medicinales, sacada por destilación al vapor. Se usa para repeler insectos o estimular plantas.',
    definicion_ampliada: 'Hidrolato (o agua floral) es subproducto de la destilación al vapor de plantas aromáticas: lavanda, romero, menta, ajenjo, ortiga, manzanilla. Cuando se destila la planta para extraer aceite esencial, queda un agua cargada de compuestos volátiles solubles. Esa agua es el hidrolato.\n\nUsos agroecológicos: repelencia de insectos (hidrolato de ajenjo, ortiga), estimulación de defensas vegetales (jasmonatos en hidrolato de manzanilla), aromaterapia agrícola. Aplicación foliar pura o diluida 1:5.\n\nVentaja sobre extractos alcohólicos: no dañan microbiota foliar, son seguros para polinizadores cuando se usan correctamente.',
    ver_tambien: ['biopreparado', 'purin', 'extracto-vegetal'],
    fuentes: ['Catty 2003 — Hydrosols: The Next Aromatherapy', 'Restrepo Rivera 2007'],
  },

  {
    slug: 'purin',
    termino: 'Purín',
    categoria: 'biopreparados',
    emoji: '🌿',
    definicion_simple: 'Té fuerte de plantas: se ponen ortigas, equiseto u otras hojas en agua y se dejan días para sacar todo lo bueno.',
    definicion_ampliada: 'Purín vegetal es extracción acuosa por maceración prolongada (5-15 días, sin oxígeno) de plantas frescas. Más potente que infusión o té. Ejemplos clásicos:\n\n- **Purín de ortiga** (Urtica dioica): rico en N, hierro, defensa contra áfidos\n- **Purín de equiseto** (Equisetum arvense): silicio, antifúngico preventivo (mildiu, oídio)\n- **Purín de consuelda** (Symphytum): potasio, estimulante de fructificación\n- **Purín de ajenjo** (Artemisia absinthium): repelente de insectos\n\nDilución típica: 1:10 a 1:20 para foliar, 1:5 para drench. Olor desagradable durante fermentación, normal.',
    ver_tambien: ['biopreparado', 'hidrolato', 'extracto-vegetal'],
    fuentes: ['Petiot 2004 — Purines de plantes', 'Restrepo Rivera 2007'],
  },

  // ===========================================================================
  // BOTÁNICA (continuación — voy con los más críticos)
  // ===========================================================================
  {
    slug: 'estolon',
    termino: 'Estolón',
    categoria: 'botanica',
    emoji: '🌱',
    definicion_simple: 'Tallo que sale de una planta, se arrastra por el suelo y echa raíces para hacer una nueva planta hija. Las fresas son el ejemplo clásico.',
    definicion_ampliada: 'Estolón es tallo modificado que crece horizontalmente sobre el suelo, con entrenudos largos. En cada nudo, donde toca tierra, desarrolla raíces adventicias y un brote vertical que se convierte en nueva planta hija (clon genético). Es propagación vegetativa eficiente.\n\nEjemplos: fresa (Fragaria), maní (Arachis), maíz en algunas variedades, gramíneas como kikuyo. En el manejo de fresa, los estolones son recurso de propagación gratuito — la plantación se renueva cada 2-3 años con plantines hijos seleccionados de los estolones más vigorosos.',
    ver_tambien: ['esqueje', 'acodo', 'propagacion-vegetativa'],
    tambien_le_dicen: ['guía', 'hijo', 'hijuelo'],
    fuentes: ['Hartmann et al. 2011 — Plant Propagation: Principles and Practices'],
  },

  {
    slug: 'esqueje',
    termino: 'Esqueje',
    categoria: 'botanica',
    emoji: '✂️',
    definicion_simple: 'Pedazo cortado de una rama o tallo que se siembra en tierra y echa raíces para hacer una nueva planta. Como las matas de la abuela que siempre regala.',
    definicion_ampliada: 'Esqueje (también llamado estaca) es porción vegetativa de una planta — generalmente tallo de 10-25 cm con 2-3 nudos — que se enraíza en sustrato húmedo para producir un nuevo individuo genéticamente idéntico. Tipos:\n\n- **Esqueje herbáceo** (tallos blandos): salvia, romero, menta, geranio\n- **Esqueje semileñoso** (tallos parcialmente lignificados): rosa, mora, vid\n- **Esqueje leñoso** (ramas duras): chachafruto, sauce, álamo\n- **Esqueje de hoja**: violeta africana, sanseviera\n- **Esqueje de raíz**: rábano picante, frambuesa\n\nFavorecedores de enraizamiento: hormona auxina natural (saliva de plátano, agua de sauce) o sintética (IBA, NAA). Sustrato bien drenado, humedad constante sin saturación, sombra parcial inicial.',
    ver_tambien: ['estolon', 'acodo', 'injerto', 'propagacion-vegetativa'],
    tambien_le_dicen: ['gajo', 'estaca', 'vara'],
    fuentes: ['Hartmann et al. 2011', 'Agrosavia — Manuales propagación frutales'],
  },

  {
    slug: 'fenologia',
    termino: 'Fenología',
    categoria: 'botanica',
    emoji: '📅',
    definicion_simple: 'Estudio de los momentos importantes en la vida de las plantas: cuándo germinan, cuándo florecen, cuándo dan fruto. Nos ayuda a predecir y planear.',
    definicion_ampliada: 'Fenología es la rama de la biología que estudia los eventos cíclicos del ciclo de vida de organismos en relación con factores ambientales (temperatura, luz, humedad). En agricultura, las **fenofases** clave son:\n\n1. Germinación / brotación\n2. Crecimiento vegetativo (hojas, tallos)\n3. Floración (botón, antesis, polinización)\n4. Cuajado y desarrollo de frutos\n5. Maduración\n6. Senescencia / dormancia\n\nCada fenofase tiene requerimientos específicos de agua, nutrientes y manejo. La acumulación de **grados-día** (GDD) suele predecir la transición entre fenofases mejor que el calendario solar — útil en climas variables como los andinos colombianos.',
    ver_tambien: ['gdd', 'germinacion', 'antesis', 'cuajado'],
    fuentes: ['Schwartz 2013 — Phenology: An Integrative Environmental Science', 'IPGRI/BBCH scale documentation'],
  },

  {
    slug: 'tutorado',
    termino: 'Tutorado',
    categoria: 'botanica',
    emoji: '🪴',
    definicion_simple: 'Poner palos o cuerdas para que las plantas que crecen mucho hacia arriba (como el tomate o el frijol) tengan apoyo y no se caigan.',
    definicion_ampliada: 'Tutorado es práctica agronómica de proporcionar soporte estructural a plantas de hábito indeterminado o trepador. Materiales: estacas de madera, varas de bambú/guadua, hilo agrícola atado a alambres horizontales (espaldera), mallas plásticas o redes.\n\nEsencial en: tomate (sin tutorado el peso del fruto rompe ramas), frijol voluble, lulo, granadilla, gulupa, mora, parchita, vid. En milpa el maíz funciona como tutor natural del frijol trepador.\n\nVentajas del tutorado: mejor exposición a luz, ventilación que reduce hongos, frutos limpios sin contacto con suelo, cosecha ergonómica.',
    ver_tambien: ['tomate', 'milpa', 'asociacion'],
    tambien_le_dicen: ['emparrado', 'enramada', 'espaldera', 'puyón'],
    fuentes: ['Agrosavia 2018 — Manual tomate', 'Restrepo Rivera 2007'],
  },

  {
    slug: 'deshierbe',
    termino: 'Deshierbe',
    categoria: 'botanica',
    emoji: '🌾',
    definicion_simple: 'Quitar las matas que no se sembraron (las "malezas") para que no le roben agua, luz y comida a las plantas que sí queremos.',
    definicion_ampliada: 'Deshierbe es la labor de controlar las plantas espontáneas (arvenses o "malezas") que compiten con el cultivo por agua, luz, nutrientes y espacio. Métodos:\n\n- **Manual / mecánico**: a mano, con azadón, machete o guadaña. Es el más usado en agricultura familiar y el más sano para el suelo y para quien cultiva.\n- **Plateo**: limpiar solo el círculo de tierra alrededor del tronco de un árbol o mata grande (café, frutales), dejando el resto con cobertura.\n- **Socola**: en zonas de monte, cortar la maleza baja y los arbustos antes de sembrar.\n- **Cobertura / mulch**: prevenir la maleza tapando el suelo con hojarasca o plantas de cobertura, en vez de arrancarla después.\n- **Químico (herbicida)**: rápido pero degrada el suelo, contamina aguas y mata microbiota; la agroecología lo evita.\n\nNota agroecológica: no toda arvense es enemiga — muchas protegen el suelo de la erosión, atraen polinizadores o indican la fertilidad. La idea no es "suelo pelado" sino manejar la competencia. El deshierbe manual oportuno + cobertura suele bastar sin necesidad de químicos.',
    contexto_cultural: 'En el campo colombiano "ir a la limpia" o "hacer la socola" es jornada de trabajo conocida por toda la familia. El plateo del cafetal es parte del calendario cafetero. Son saberes de manejo, no solo de "quitar yerba".',
    ver_tambien: ['mulch', 'abono-verde', 'agroecologia', 'monocultivo'],
    tambien_le_dicen: ['limpia', 'desyerbe', 'socola', 'plateo'],
    fuentes: ['Restrepo Rivera 2007 — ABC de la agricultura orgánica', 'Agrosavia — Manejo agroecológico de arvenses'],
  },

  {
    slug: 'germinacion',
    termino: 'Germinación',
    categoria: 'botanica',
    emoji: '🌰',
    definicion_simple: 'Cuando una semilla despierta y empieza a brotar: sale primero la raíz y después la primera hoja.',
    definicion_ampliada: 'Germinación es el proceso por el cual el embrión dentro de una semilla activa su metabolismo y emerge como plántula. Requiere agua (imbibición), oxígeno, temperatura adecuada (especie-específica) y a veces luz o oscuridad (fotoblastismo).\n\nFases: 1) absorción de agua (la semilla se hincha), 2) activación enzimática (movilización de reservas), 3) emergencia de la radícula (raíz primaria), 4) emergencia del hipocótilo (tallo embrionario) y cotiledones, 5) primera hoja verdadera. Tiempo según especie: 3-5 días lechuga, 7-10 días tomate, 15-25 días aguacate, 30+ días cafés.',
    ver_tambien: ['semilla', 'cotiledon', 'plantula', 'fenologia'],
    tambien_le_dicen: ['nacer', 'que nazca la semilla', 'brotar', 'pegar'],
    fuentes: ['Bewley et al. 2013 — Seeds: Physiology of Development, Germination and Dormancy'],
  },

  {
    slug: 'polinizacion',
    termino: 'Polinización',
    categoria: 'botanica',
    emoji: '🐝',
    definicion_simple: 'Cuando el polen de una flor llega a otra para que se forme el fruto. Las abejas, abejorros, mariposas y el viento son los carteros del polen.',
    definicion_ampliada: 'Polinización es la transferencia del polen (que contiene gametos masculinos) desde las anteras de una flor hasta el estigma (parte femenina) para fertilizar el óvulo y formar semilla y fruto. Tipos:\n\n- **Anemófila** (viento): maíz, gramíneas, encino\n- **Entomófila** (insectos): mayoría de cultivos hortícolas y frutales\n- **Ornitófila** (aves): pasifloras como granadilla, gulupa, curuba\n- **Quiropterófila** (murciélagos): cactus columnares, plátanos silvestres\n- **Autógama** (autopolinización): tomate, lechuga, frijol (mayormente)\n\n**75% de los cultivos del mundo dependen de polinizadores**. La pérdida global de abejas por neonicotinoides y monocultivo es crisis alimentaria silenciosa.',
    contexto_cultural: 'Vandana Shiva: "Sin abejas, no hay alimentación humana". Cuidar polinizadores es cuidar nuestra propia mesa. Una chagra agroecológica es refugio para polinizadores nativos colombianos: abejas Melipona y Trigona (sin aguijón, propias del trópico), abejorros Bombus, mariposas, colibríes.',
    ver_tambien: ['antesis', 'cuajado', 'biodiversidad', 'meliponicultura'],
    fuentes: [
      'Klein et al. 2007 — Importance of pollinators in changing landscapes for world crops',
      'Nogueira-Couto 2002 — Apicultura colombiana',
    ],
  },

  // ===========================================================================
  // CLIMA / PISO TÉRMICO
  // ===========================================================================
  {
    slug: 'piso-termico',
    termino: 'Piso térmico',
    categoria: 'clima',
    emoji: '🏔️',
    definicion_simple: 'Las "alturas" de Colombia que tienen climas distintos: cálido (caliente bajo), templado, frío y páramo (helado arriba). Cada uno tiene sus plantas que se dan mejor.',
    definicion_ampliada: 'Pisos térmicos es la clasificación tradicional colombiana de zonas climáticas según altitud sobre el nivel del mar (msnm), basada en variación predecible de temperatura promedio:\n\n- **Cálido** (0-1200 msnm): >24°C promedio. Cultivos: cacao, plátano, yuca, ñame, ají, frutales tropicales, palma, caña.\n- **Templado** (1200-2200 msnm): 18-24°C. Cultivos: café arábica, granadilla, tomate, frijol, mora, durazno, gulupa, lulo.\n- **Frío** (2200-2800 msnm): 12-18°C. Cultivos: papa, fresa, lechuga, brócoli, repollo, arveja, haba, curuba, uchuva, tomate de árbol.\n- **Páramo** (>2800 msnm): <12°C. Cultivos: papa criolla, papa pastusa, frailejón cultivado, papayuela, mortiño, agraz.\n\nFacilita seleccionar especies adaptadas, anticipar productividad y manejar microclimas. Concepto introducido por Francisco José de Caldas (1801).',
    ver_tambien: ['microclima', 'altitud', 'paramo', 'agroecologia'],
    tambien_le_dicen: ['tierra caliente', 'tierra templada', 'tierra fría', 'páramo'],
    fuentes: [
      'Caldas 1801 — Memoria sobre la nivelación de las plantas que se cultivan en la vecindad del Ecuador',
      'IDEAM — Atlas climatológico de Colombia',
    ],
  },

  {
    slug: 'microclima',
    termino: 'Microclima',
    categoria: 'clima',
    emoji: '☁️',
    definicion_simple: 'Clima especial de un pedacito pequeño de la finca que es distinto al de los alrededores. Por ejemplo, una esquina más caliente que tu casa o una zona más húmeda al lado del río.',
    definicion_ampliada: 'Microclima es conjunto de condiciones climáticas (temperatura, humedad, viento, luz, lluvia efectiva) que difieren del macroclima regional debido a factores locales: topografía (ladera norte vs sur), cobertura vegetal (sombra, mulch), proximidad a cuerpos de agua, edificios, suelo.\n\nEn una misma finca pueden existir 5-10 microclimas: invernadero (más cálido y húmedo), borde norte protegido del viento, zona baja con frost pocket en madrugadas, área bajo árbol grande con sombra parcial. El operador agroecológico aprende a leerlos y asignar especies según preferencias.',
    ver_tambien: ['piso-termico', 'invernadero', 'sombra'],
    fuentes: ['Geiger 1965 — The Climate Near the Ground', 'Mollison 1988 — Permaculture Design'],
  },

  {
    slug: 'dli',
    termino: 'DLI (Daily Light Integral)',
    categoria: 'clima',
    emoji: '☀️',
    definicion_simple: 'Cuánta luz le llega a una planta durante un día completo. Las plantas necesitan distintas cantidades de luz para crecer bien.',
    definicion_ampliada: 'DLI (Daily Light Integral) es la cantidad total de luz fotosintéticamente activa (PAR, 400-700 nm) que recibe una superficie durante 24 horas, expresada en mol/m²/día. Es la métrica más relevante para diseñar invernaderos y predecir crecimiento.\n\nRangos típicos:\n- Sombra densa: 1-3 mol/m²/día\n- Plantas de sombra (orquídeas, helechos): 5-10\n- Lechugas/espinacas: 12-17\n- Tomate, pimiento, fresa de invernadero: 20-30\n- Frutales tropicales a pleno sol: 40-50+\n\nEn Colombia tropical (cerca del ecuador), el DLI varía menos por estación pero mucho por nubosidad. Andes >2500 msnm tienen DLI más alto y radiación UV más intensa.',
    ver_tambien: ['fotosintesis', 'invernadero', 'piso-termico'],
    fuentes: ['Faust & Logan 2018 — DLI for ornamental greenhouse production'],
  },

  // ===========================================================================
  // PLAGAS / ENFERMEDADES (críticas Colombia)
  // ===========================================================================
  {
    slug: 'phytophthora-infestans',
    termino: 'Phytophthora infestans (tizón tardío)',
    categoria: 'plagas',
    emoji: '🦠',
    definicion_simple: 'Microorganismo parecido a un hongo (oomicete) que mata tomate y papa rapidísimo cuando hace frío y húmedo. Aparecen manchas oscuras en hojas y se extiende en días.',
    definicion_ampliada: 'Phytophthora infestans es un oomicete (no exactamente "hongo" sino organismo similar) causante del tizón tardío (late blight) en Solanaceae: tomate, papa, principalmente. Históricamente responsable de la Gran Hambruna Irlandesa (1845-1852).\n\nSíntomas: manchas oscuras (marrón-negro) en hojas, expansión rápida con halo amarillo, tallos y frutos también afectados, pelusa blanquecina en envés en alta humedad. Esporula de noche con humedad >95% y temp 10-25°C — perfectos para los Andes colombianos.\n\nManejo agroecológico: ventilación + drenaje, evitar riego foliar nocturno, caldo bordelés preventivo en épocas húmedas, variedades menos susceptibles, rotación de cultivos. Cero biocidas sintéticos ahorran ese ciclo, pero requiere prevención obsesiva.',
    contexto_cultural: 'En Cundinamarca y Boyacá, Phytophthora limita producción de tomate chonto y papa. Es razón por la que en chagras agroecológicas se prefieren variedades resistentes y manejo preventivo sobre fungicidas curativos.',
    ver_tambien: ['fitopatogeno', 'caldo-bordeles', 'tomate', 'papa'],
    fuentes: ['Agrios 2005 — Plant Pathology', 'Agrosavia — Manual manejo Phytophthora'],
  },

  {
    slug: 'oidio',
    termino: 'Oídio (mildiu polvoso)',
    categoria: 'plagas',
    emoji: '⚪',
    definicion_simple: 'Como una capa de talco blanco en las hojas de las plantas. Es un hongo que aparece cuando hay calor seco y noches frescas.',
    definicion_ampliada: 'Oídio (Erysiphales, varios géneros: Erysiphe, Sphaerotheca, Leveillula) es enfermedad fúngica de amplio rango de hospederos: cucurbitáceas (zapallo, calabaza, pepino), Solanaceae, fresa, vid, rosales. Síntomas: micelio blanco-grisáceo polvoriento en haz de hojas, distorsión foliar, reducción de fotosíntesis, frutos pequeños o malformados.\n\nCondiciones: 18-26°C, humedad relativa media (40-70%), noches frescas. Diferencia con mildiu velloso (Peronosporales): este último prefiere humedad alta. Manejo agroecológico: caldo sulfocálcico preventivo, leche cruda diluida 10% (efectivo en cucurbitáceas), variedades resistentes, distanciamiento.',
    ver_tambien: ['mildiu', 'fitopatogeno', 'caldo-sulfocalcico'],
    fuentes: ['Glawe 2008 — The powdery mildews: a review of the world\'s most familiar (yet poorly known) plant pathogens'],
  },

  // ===========================================================================
  // SUELO
  // ===========================================================================
  {
    slug: 'ph',
    termino: 'pH del suelo',
    categoria: 'suelo',
    emoji: '🧪',
    definicion_simple: 'Una medida que dice si la tierra es ácida (como limón, pH bajo), neutra (pH 7) o alcalina (como jabón, pH alto). La mayoría de plantas prefieren pH entre 5.5 y 7.',
    definicion_ampliada: 'pH (potencial de Hidrógeno) mide acidez/alcalinidad en escala 0-14. Suelo con pH 7 es neutro; <7 ácido; >7 alcalino. Determina disponibilidad de nutrientes para las raíces:\n\n- **pH 4-5** (muy ácido, común en Andes colombianos por mineralogía volcánica): toxicidad de aluminio y manganeso, fósforo poco disponible\n- **pH 5.5-6.5** (rango óptimo mayoría hortalizas y frutales)\n- **pH 6.5-7** (cultivos como brócoli, remolacha)\n- **pH >7.5** (alcalino): hierro, manganeso, zinc poco disponibles, clorosis foliar\n\nCorrección: cal dolomita para subir pH (suelos ácidos), sulfato de calcio + materia orgánica para bajar (suelos alcalinos). Bocashi y compost amortiguan pH naturalmente sin shock.',
    ver_tambien: ['ec', 'npk', 'humus', 'dolomita'],
    fuentes: ['Brady & Weil 2017 — The Nature and Properties of Soils', 'Agrosavia — Análisis suelos colombianos'],
  },

  {
    slug: 'humus',
    termino: 'Humus',
    categoria: 'suelo',
    emoji: '🟫',
    definicion_simple: 'Tierra negra y esponjosa que se forma cuando se descomponen las hojas y plantas durante mucho tiempo. Es lo que hace que el suelo de un bosque sea rico.',
    definicion_ampliada: 'Humus es la fracción orgánica estabilizada del suelo, resultado de la descomposición avanzada y mineralización parcial de residuos vegetales y animales por microorganismos. Composición: ácidos húmicos, fúlvicos y huminas — moléculas complejas que retienen agua (hasta 20x su peso), nutrientes, mejoran estructura del suelo (agregación), y son refugio de microbiota.\n\nUn suelo con 5-7% de materia orgánica está vivo y productivo; uno con <2% (típico monocultivo industrial) está agotado. Bocashi, compost y mantillo aportan humus directamente. Los cultivos de cobertura y la rotación con leguminosas también lo construyen lentamente.',
    ver_tambien: ['materia-organica', 'compost', 'bocashi', 'microbiota'],
    tambien_le_dicen: ['tierra negra', 'tierra de capote'],
    fuentes: ['Stevenson 1994 — Humus Chemistry', 'Lehmann & Kleber 2015 — The contentious nature of soil organic matter (Nature)'],
  },

  {
    slug: 'estiercol',
    termino: 'Estiércol',
    categoria: 'suelo',
    emoji: '💩',
    definicion_simple: 'El "popó" de los animales de la finca (vaca, gallina, cerdo, cabra). Bien curado, es uno de los mejores abonos para la tierra.',
    definicion_ampliada: 'Estiércol es el excremento de animales usado como abono orgánico desde hace miles de años. Aporta nitrógeno, fósforo, potasio, materia orgánica y microbiota viva al suelo. Cada animal da un estiércol distinto:\n\n- **Boñiga** (vaca): equilibrada, suave, mucha fibra. La más usada en compost.\n- **Gallinaza** (gallina): muy "caliente" (alta en nitrógeno y amoníaco) — quema las raíces si se aplica fresca.\n- **Porquinaza** (cerdo): rica pero con olor fuerte y riesgo de patógenos; exige buen compostaje.\n- **Caprinaza** (cabra) y la del conejo: secas, en pelotitas, fáciles de manejar.\n\nRegla de oro agroecológica: **nunca aplicar estiércol fresco directo a la planta**. Hay que compostarlo o curarlo primero (2-3 meses) para que: 1) se mueran semillas de maleza y patógenos, 2) se estabilice el nitrógeno y no queme, 3) baje el olor. La clave es la relación carbono/nitrógeno (C/N): el estiércol es rico en nitrógeno, así que se mezcla con material seco rico en carbono (paja, hojas secas, aserrín, cascarilla) buscando ~25-30:1 para un compost sano.',
    contexto_cultural: 'En la finca campesina colombiana el estiércol nunca se bota: la boñiga de la vaca, la gallinaza del corral y la porquinaza cierran el ciclo de nutrientes sin comprar abono de bolsa. Es economía circular ancestral, no moda.',
    ver_tambien: ['compost', 'bocashi', 'materia-organica', 'humus', 'abono-verde'],
    tambien_le_dicen: ['boñiga', 'gallinaza', 'porquinaza', 'caprinaza'],
    fuentes: ['Restrepo Rivera 2007 — Manual de bocashi y abonos orgánicos', 'Agrosavia — Manejo de estiércoles y compostaje'],
  },

  // ===========================================================================
  // INFORMÁTICA (Chagra-specific)
  // ===========================================================================
  {
    slug: 'pwa',
    termino: 'PWA (Progressive Web App)',
    categoria: 'informatica',
    emoji: '📱',
    definicion_simple: 'Aplicación que vive en internet pero funciona casi como una app del celular. Se instala desde el navegador, sirve sin conexión y no necesita Play Store.',
    definicion_ampliada: 'PWA (Progressive Web App) es estándar web que combina capacidades de aplicación nativa (offline, instalable, push notifications) con la accesibilidad de un sitio web (URL única, sin instalación obligatoria desde tienda). Componentes técnicos:\n\n- **Service Worker**: script en background que cachea recursos y permite uso offline\n- **Web App Manifest**: archivo JSON con metadata (icono, nombre, colores)\n- **HTTPS obligatorio**: por seguridad\n- **Responsive design**: adaptable a cualquier tamaño de pantalla\n\nChagra es PWA: vives en chagra.guatoc.co, puedes agregarla a tu pantalla de inicio (Android: instalar app, iOS: añadir a home), funciona offline guardando registros local que sincroniza después.',
    ver_tambien: ['offline-first', 'service-worker', 'indexeddb'],
    fuentes: ['Google Web Fundamentals — PWA', 'MDN — Progressive Web Apps'],
  },

  {
    slug: 'offline-first',
    termino: 'Offline-first',
    categoria: 'informatica',
    emoji: '🛰️',
    definicion_simple: 'Diseño donde la app funciona PRIMERO sin internet. Cuando hay conexión, se sincroniza. Lo opuesto a apps que se mueren si no hay señal.',
    definicion_ampliada: 'Offline-first es filosofía de diseño donde la aplicación está construida asumiendo que la conectividad es opcional o intermitente, no requisito. Datos se guardan localmente (IndexedDB, OPFS, SQLite) y se sincronizan oportunisticamente cuando hay red.\n\nCrítico para Chagra porque las fincas reales colombianas (especialmente rurales) tienen conectividad inestable: muchos pilotos en zonas de minifundio sabanero, ladera cundiboyacense y zonas de transición no tienen WiFi 5G pleno. La app debe funcionar caminando entre matas con el celular sin señal y sincronizar al volver a casa.',
    ver_tambien: ['pwa', 'sync', 'indexeddb'],
    fuentes: ['Hood 2015 — Designing Offline-First Web Apps'],
  },

  {
    slug: 'farmos',
    termino: 'FarmOS',
    categoria: 'informatica',
    emoji: '🚜',
    definicion_simple: 'Software libre de gestión de fincas — el "cerebro de datos" donde Chagra guarda tus registros de manera permanente y verificable.',
    definicion_ampliada: 'FarmOS (farmos.org) es plataforma de código abierto (Drupal-based) para gestión agrícola, especializada en agricultura sostenible y agroecológica. Maneja activos (plantas, animales, equipos, parcelas), logs de eventos (siembras, cosechas, observaciones, aplicaciones de insumos), planes y reportes.\n\nChagra usa FarmOS como backend de sincronización y storage canónico. La PWA Chagra es interfaz amigable y offline-first sobre FarmOS — el operador no necesita saber que existe FarmOS, pero tener Drupal+FarmOS detrás garantiza que los datos son exportables, federables (a otras instancias FarmOS), y sobreviven a la app frontend si esta cambia.',
    ver_tambien: ['pwa', 'sync', 'open-source'],
    fuentes: ['farmOS.org documentation', 'NRCS USA — adopting farmOS'],
  },

  {
    slug: 'asset',
    termino: 'Asset / Activo',
    categoria: 'informatica',
    emoji: '🌳',
    definicion_simple: 'Cualquier "cosa" que vive en tu finca y tiene historia: una planta, una zona, una herramienta, un costal de bocashi. Cada asset tiene su hoja de vida.',
    definicion_ampliada: 'Asset (activo) es el objeto persistente del modelo de datos Chagra/FarmOS. Tipos canónicos:\n\n- **asset--plant**: planta individual (un café, una mata de tomate) o agrupada (cama de lechugas con qty)\n- **asset--land**: zona, parcela, lote, invernadero\n- **asset--structure**: infraestructura física (galpón, vivero, sistema de riego)\n- **asset--equipment**: herramientas, motocultor, mochila\n- **asset--material**: insumos consumibles (semillas, bocashi, biopreparados)\n\nCada asset tiene UUID, nombre, atributos (especie, fecha plantación, ubicación GPS) y acumula logs (eventos) a lo largo de su vida. Asset + Log = modelo de datos canónico ADR-019.',
    ver_tambien: ['log', 'mata', 'bitacora'],
    fuentes: ['Chagra ADR-019 data model'],
  },

  {
    slug: 'log',
    termino: 'Log / Registro',
    categoria: 'informatica',
    emoji: '📜',
    definicion_simple: 'Cada cosa que pasa con tus assets queda anotada como un "log" — siembras, cosechas, observaciones. La bitácora es la lista de todos los logs.',
    definicion_ampliada: 'Log es evento append-only en el modelo Chagra/FarmOS. Tipos canónicos:\n\n- **log--seeding**: siembra (nueva planta nace)\n- **log--planting**: trasplante / replantación\n- **log--harvest**: cosecha (kg, unidades cosechadas de un asset planta)\n- **log--input**: aplicación de insumo (bocashi, biol, riego)\n- **log--observation**: observación libre (fenofase, plagas, fotos)\n- **log--maintenance**: mantenimiento de equipo / infraestructura\n\nLogs son **append-only** (ADR-019 Regla 1): una vez creados nunca se editan ni borran, solo se agregan correcciones. Esto preserva trazabilidad agroecológica auditable. La bitácora muestra el historial cronológico de logs.',
    ver_tambien: ['asset', 'bitacora', 'append-only'],
    fuentes: ['Chagra ADR-019 — Asset-flat + Log append-only'],
  },

  {
    slug: 'append-only',
    termino: 'Append-only',
    categoria: 'informatica',
    emoji: '🔒',
    definicion_simple: 'Lo que se escribe NO se borra ni se cambia, solo se agregan cosas nuevas. Como un cuaderno donde nunca usas borrador.',
    definicion_ampliada: 'Append-only es propiedad del modelo de datos: cada nuevo log se agrega al final pero ningún log existente se modifica ni elimina. Si hubo error, se agrega un nuevo log "log_corrected" que apunta al original sin tocarlo. Beneficios: auditoría completa (siempre se sabe qué pasó cuando), reversibilidad lógica, trazabilidad agroecológica (necesaria para certificaciones orgánicas), simplicidad de sync (no hay conflictos de mutación entre dispositivos).\n\nADR-019 de Chagra es regla inviolable. Cualquier feature debe respetarla.',
    ver_tambien: ['log', 'asset', 'auditoria'],
    fuentes: ['Chagra ADR-019', 'Event Sourcing pattern (Fowler 2005)'],
  },

  // ===========================================================================
  // IA (Chagra-specific)
  // ===========================================================================
  {
    slug: 'whisper',
    termino: 'Whisper',
    categoria: 'ia',
    emoji: '👂',
    definicion_simple: 'Programa de inteligencia artificial que escucha lo que dices y lo escribe en texto. Chagra lo usa para registrar siembras y cosechas por voz.',
    definicion_ampliada: 'Whisper es modelo de speech-to-text (STT) de OpenAI, código abierto, multilingüe, con buena precisión en español. Soporta acentos regionales aunque mejor con vocabulario común. Limitación: vocabulario fitonímico colombiano (ñame, gulupa, mortiño, chachafruto) o términos técnicos pueden transcribirse mal sin vocabulary boost específico — está en planeación una capa de mejora con corpus 100 especies colombianas.\n\nChagra corre Whisper localmente en su servidor (NixOS) — no envía tu voz a la nube. Privacidad por defecto.',
    ver_tambien: ['ollama', 'llm', 'voz'],
    fuentes: ['Radford et al. 2022 — Whisper paper (OpenAI)'],
  },

  {
    slug: 'ollama',
    termino: 'Ollama',
    categoria: 'ia',
    emoji: '🤖',
    definicion_simple: 'Programa que hace funcionar modelos de inteligencia artificial directamente en tu computadora (sin nube). Chagra lo usa para que la IA agroecológica responda sin enviar datos a empresas externas.',
    definicion_ampliada: 'Ollama es runtime de inferencia LLM local (basado en llama.cpp), permite correr modelos (qwen3.5, gemma3, deepseek, llama3, etc.) en hardware modesto sin enviar prompts ni respuestas a APIs externas. Chagra corre Ollama localmente con modelos qwen3.5:4b y gemma3:4b para asistencia por voz y análisis offline.\n\nVentaja crítica: privacidad y soberanía. Tus preguntas agroecológicas no entrenan modelos comerciales ni se monetizan. Costo: hardware propio + electricidad, no subscription mensual SaaS.',
    ver_tambien: ['llm', 'qwen', 'whisper', 'soberania-de-datos'],
    fuentes: ['Ollama.com docs', 'llama.cpp project'],
  },

  {
    slug: 'rag',
    termino: 'RAG (Retrieval-Augmented Generation)',
    categoria: 'ia',
    emoji: '📚',
    definicion_simple: 'Truco para que la IA use SOLO la información que le damos nosotros (un libro, un corpus) en vez de inventar cosas. Así no se equivoca.',
    definicion_ampliada: 'RAG (Retrieval-Augmented Generation) es técnica que combina búsqueda en una base de conocimiento curada con generación LLM. En lugar de dejar que el modelo responda solo con lo que aprendió en pre-training (puede alucinar), se le inyecta como contexto el material relevante recuperado de un corpus específico.\n\nChagra HelpVoiceQuestion usa RAG estricto: cuando haces una pregunta sobre lechuga, fresa o tomate chonto, la IA solo puede responder usando el corpus consolidado DR-034 (validado 3/3 LLMs + curaduría humana pendiente). Si la pregunta cae fuera del corpus, la IA debe decir "no sé, fuera de corpus" en lugar de inventar dosis o recomendaciones peligrosas.',
    contexto_cultural: 'Anti-alucinación es load-bearing en agroecología: una IA que recomienda dosis inventada de un biopreparado puede dañar cultivos reales del operador. RAG estricto es tecnología que ALINEA con responsabilidad campesina.',
    ver_tambien: ['llm', 'guardrails', 'corpus', 'anti-alucinacion'],
    fuentes: ['Lewis et al. 2020 — Retrieval-Augmented Generation (Facebook AI)'],
  },

  // ===========================================================================
  // SOCIOPOLÍTICA (anti-extractivismo)
  // ===========================================================================
  {
    slug: 'soberania-alimentaria',
    termino: 'Soberanía alimentaria',
    categoria: 'sociopolitica',
    emoji: '✊',
    definicion_simple: 'Que las personas y comunidades decidan qué cultivar, qué comer y cómo producirlo, sin depender de grandes empresas ni mercados externos.',
    definicion_ampliada: 'Soberanía alimentaria es concepto político-económico desarrollado por La Vía Campesina (movimiento internacional, 1996). Define el derecho de los pueblos a definir sus propias políticas y estrategias sustentables de producción, distribución y consumo de alimentos, garantizando el derecho a la alimentación a toda la población.\n\nDifiere de "seguridad alimentaria" (que solo asegura suficiente comida, no importa de dónde): la soberanía exige que los pueblos controlen el sistema agroalimentario, no que sean clientes pasivos del agronegocio global.\n\nEjes: tierra para campesinos, semillas libres, mercados locales, agroecología, cultura alimentaria propia.',
    contexto_cultural: 'Tesis del operador: "el capitalismo es una enfermedad y vamos a mostrarlo". Chagra como herramienta agroecológica es práctica de soberanía alimentaria — software que hace al operador-finca más independiente, no más dependiente de plataforma SaaS extractiva.',
    ver_tambien: ['agroecologia', 'red-de-semillas-libres', 'recab'],
    fuentes: ['La Vía Campesina 1996 — Declaración Roma sobre soberanía alimentaria', 'Patel 2009 — What does food sovereignty look like?'],
  },

  {
    slug: 'recab',
    termino: 'RECAB',
    categoria: 'sociopolitica',
    emoji: '🤝',
    definicion_simple: 'Red Colombiana de Agroecología y Biodiversidad — grupo de personas, organizaciones y fincas que practican y comparten saberes agroecológicos en Colombia.',
    definicion_ampliada: 'RECAB (Red Colombiana de Agroecología y Biodiversidad) es asociación de productores, productoras, organizaciones, técnicos y académicos comprometidos con la transición agroecológica en Colombia. Funciones: intercambio de semillas criollas, capacitación campesino-a-campesino (CaC), incidencia política, articulación con La Vía Campesina internacional.\n\nGuatoc es parte natural de la red RECAB por filosofía y práctica. Colaboraciones futuras incluyen: peer-backup mutuo entre fincas amigas, validación del corpus técnico con sabedores RECAB, intercambio de semillas y biopreparados.',
    ver_tambien: ['agroecologia', 'soberania-alimentaria', 'red-de-semillas-libres'],
    fuentes: ['RECAB Colombia website y publicaciones'],
  },

  {
    slug: 'red-de-semillas-libres',
    termino: 'Red de Semillas Libres',
    categoria: 'sociopolitica',
    emoji: '🌾',
    definicion_simple: 'Movimiento de personas que conservan e intercambian semillas tradicionales sin pagarle a las grandes empresas que privatizan las semillas con patentes.',
    definicion_ampliada: 'Red de Semillas Libres es articulación de iniciativas locales que defienden las semillas como bien común, opuesta a los modelos comerciales de privatización (patentes Monsanto/Bayer, hibridación F1 estéril, transgénicos con tecnología "Terminator"). Promueve casas de semillas comunitarias, ferias de intercambio, registro participativo de variedades criollas, defensa legal frente a leyes restrictivas (Resolución 970 ICA en Colombia).\n\nVandana Shiva (India, Navdanya), Centro Latinoamericano de Estudios Rurales (CLAES), GRAIN, son referentes globales. En Colombia: Grupo Semillas, Red Custodios de Semillas Lebrija, RECAB.',
    contexto_cultural: 'La privatización de semillas mediante patentes es uno de los mecanismos más violentos del agronegocio. Quien controla las semillas controla la soberanía alimentaria. Conservar semillas criollas es resistencia política concreta.',
    ver_tambien: ['soberania-alimentaria', 'recab', 'semilla-criolla'],
    fuentes: ['Shiva 2000 — Stolen Harvest', 'Grupo Semillas Colombia — biblioteca digital'],
  },

  {
    slug: 'jairo-restrepo',
    termino: 'Jairo Restrepo Rivera',
    categoria: 'sociopolitica',
    emoji: '👨‍🌾',
    definicion_simple: 'Agroecólogo colombiano que sistematizó las recetas de biopreparados (bocashi, biol, etc.) y enseñó gratis en toda Latinoamérica. Su Manual ABC es libro de cabecera.',
    definicion_ampliada: 'Jairo Restrepo Rivera (Antioquia, 1957) es agroecólogo, escritor y educador popular colombiano referente latinoamericano de agricultura orgánica regenerativa. Trabajó en CLOC (Vía Campesina) y formó miles de campesinos en biopreparados, salud del suelo, economía campesina autosuficiente. Sus libros (Manual ABC de la Agricultura Orgánica, Manejo Ecológico de Insectos, Biofertilizantes Caseros) son patrimonio agroecológico abierto.\n\nFilosofía: "que el campesino sea su propio insumo" — autosuficiencia técnica + económica como condición de libertad. Cero dependencia de paquetes tecnológicos comerciales.',
    contexto_cultural: 'Chagra como producto ES coherente con la filosofía Restrepo: software libre que apoya autosuficiencia, no SaaS que crea dependencia. El bocashi de la receta Restrepo es la base biopreparados curada en cycle-content lechuga/fresa/tomate.',
    ver_tambien: ['biopreparado', 'bocashi', 'agroecologia', 'soberania-alimentaria'],
    fuentes: [
      'Restrepo Rivera 2007 — Manual práctico ABC de la agricultura orgánica',
      'Restrepo Rivera 2010 — La Tierra: agonía o resurrección',
    ],
  },
];

// ============================================================================
// CATEGORÍAS METADATA
// ============================================================================

export const CATEGORIAS = [
  { slug: 'identidad',         label: 'Identidad',         emoji: '🌿', color: 'emerald' },
  { slug: 'microorganismos',   label: 'Microorganismos',   emoji: '🦠', color: 'cyan' },
  { slug: 'biopreparados',     label: 'Biopreparados',     emoji: '🧪', color: 'amber' },
  { slug: 'botanica',          label: 'Botánica',          emoji: '🌱', color: 'lime' },
  { slug: 'plagas',            label: 'Plagas y enfermedades', emoji: '🐛', color: 'rose' },
  { slug: 'clima',             label: 'Clima y altitud',   emoji: '🌡️', color: 'sky' },
  { slug: 'suelo',             label: 'Suelo y química',   emoji: '🟫', color: 'orange' },
  { slug: 'informatica',       label: 'La app por dentro', emoji: '💻', color: 'slate' },
  { slug: 'ia',                label: 'Inteligencia artificial', emoji: '🤖', color: 'violet' },
  { slug: 'ecologia',          label: 'Ecología',          emoji: '🌳', color: 'green' },
  { slug: 'sociopolitica',     label: 'Anti-extractivismo', emoji: '✊', color: 'red' },
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Búsqueda por término o categoría. Match parcial case-insensitive en
 * `termino` y `slug`. Si tieneTexto, también busca en definicion_simple
 * y definicion_ampliada.
 */
export function searchDictionary(query, opts = {}) {
  const { categorias = null, includeBody = true } = opts;
  const q = String(query || '').toLowerCase().trim();
  let entries = DICTIONARY;
  if (categorias && categorias.length > 0) {
    entries = entries.filter((e) => categorias.includes(e.categoria));
  }
  if (!q) return entries;
  return entries.filter((e) => {
    if (e.termino.toLowerCase().includes(q)) return true;
    if (e.slug.toLowerCase().includes(q)) return true;
    if (includeBody) {
      if (e.definicion_simple.toLowerCase().includes(q)) return true;
      if (e.definicion_ampliada && e.definicion_ampliada.toLowerCase().includes(q)) return true;
    }
    return false;
  });
}

/** Lookup directo por slug — para cross-refs ver_tambien. */
export function getEntry(slug) {
  return DICTIONARY.find((e) => e.slug === slug);
}

/** Cuenta por categoría. Útil para mostrar badges en chips. */
export function countByCategoria() {
  const out = {};
  CATEGORIAS.forEach((c) => { out[c.slug] = 0; });
  DICTIONARY.forEach((e) => {
    out[e.categoria] = (out[e.categoria] || 0) + 1;
  });
  return out;
}
