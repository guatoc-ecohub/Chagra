/**
 * metalSlugCampoData — DATA del "Metal Slug del campo" (Chagra).
 *
 * GANCHO PEDAGÓGICO: un juego de acción lateral (estilo Metal Slug) donde el
 * jugador recorre fincas andinas reales, identifica plagas reales (con nombre
 * común y científico) y las controla con el organismo benéfico CORRECTO, y
 * libera animales silvestres cazados, todo ambientado en las amenazas reales
 * de la vereda: sequía, deforestación, agroquímico. Es SOLO DATA: otro módulo
 * (fable, motor, dibujo) la consume. Este archivo no construye el juego: lo
 * provee de fichas agronómicas y biogeográficas coherentes.
 *
 * GROUNDING (anti-alucinación, anti-invento):
 *   - Los pares plaga↔controlador se reusan de `src/components/juego/doomFincaData.js`
 *     (PLAGAS_DOOM + BENEFICOS_DOOM, relaciones 'grafo' / 'cenicafe') y de
 *     `src/components/juego/defensoresFincaData.js` (PARES_CONTROL, fuentes
 *     'grafo' / 'cenicafe' / 'ica-ciat' / 'ecologia'). NO se inventa ningún par.
 *   - Los tipos de ARMAS (depredador / parasitoide / microbiano / botánico) se
 *     asignan según la biología real del controlador (coccinélidos y crisopas =
 *     depredadores; avispitas Trichogramma/Cotesia = parasitoides; Beauveria/Bt
 *     = microbiano). El único BOTÁNICO es el purín de ortiga, documentado en
 *     `catalog/biopreparados-seed.json` como repelente de insectos chupadores.
 *   - Los REHENES son fauna con identidad visual ya canónica en el repo
 *     (`src/visual/creatures/`): borugo, oso andino, jaguar y morrocoy. La
 *     causa real de cacería se grounds en el contexto que ya vive en esos
 *     archivos (carne de monte, conflicto, mascota/tráfico).
 *   - Los JEFES son amenazas estructurales (sequía, deforestación, agroquímico)
 *     con enlaces a `src/data/climaBoletines.js` (ENSO/sequía) y al contexto
 *     agroecológico del repo.
 *
 * i18n (ADR-050): juego servido solo en es-CO (mismo criterio que doomFincaData
 * y defensoresFincaData). Regla chagra-i18n es soft (warn); aquí se mantiene el
 * mismo estándar de la carpeta de juego: datos en español colombiano tú/usted.
 *
 * SIN voseo argentino. SIN nombres propios de stakeholders. SIN secretos.
 */

/* ────────────────────────────────────────────────────────────────────────
 * ARMAS — arsenal de control biológico (el "arma" que el jugador escoje).
 * Cada arma controla una o más plagas; cada plaga tiene al menos un arma.
 * Tipos válidos: 'depredador' | 'parasitoide' | 'microbiano' | 'botanico'.
 *
 * Fuentes:
 *   - depredador / parasitoide / microbiano → BENEFICOS_DOOM y PARES_CONTROL
 *     (reusados textualmente en mecanismo / como_actua).
 *   - botanico → catalog/biopreparados-seed.json (purin_ortiga, documentado
 *     como repelente de insectos chupadores: áfidos/pulgones).
 * ──────────────────────────────────────────────────────────────────────── */

/** @typedef {'depredador'|'parasitoide'|'microbiano'|'botanico'} TipoArma */

/**
 * @typedef {Object} Arma
 * @property {string} id                  Identificador estable (snake_case).
 * @property {string} nombre              Nombre común campesino.
 * @property {string} cientifico          Nombre científico (cuando aplica).
 * @property {TipoArma} tipo              Rol biológico del controlador.
 * @property {string[]} plagas_que_controla  ids de ENEMIGOS que esta arma controla.
 * @property {string} como_actua          Una línea clara: el porqué del control.
 * @property {string} fuente              Origen de la relación ('grafo' | 'cenicafe' | 'ica-ciat' | 'ecologia' | 'biopreparado').
 */

export const ARMAS = Object.freeze([
  {
    id: 'bt',
    nombre: 'Bt (Bacillus thuringiensis)',
    cientifico: 'Bacillus thuringiensis',
    tipo: 'microbiano',
    plagas_que_controla: ['cogollero', 'gusano_mazorca'],
    como_actua:
      'La oruga come la hoja con Bt; el cristal de la bacteria le rompe el intestino y deja de comer en horas. No afecta abejas, gallinas ni gente.',
    fuente: 'grafo',
  },
  {
    id: 'beauveria',
    nombre: 'Beauveria bassiana',
    cientifico: 'Beauveria bassiana',
    tipo: 'microbiano',
    plagas_que_controla: ['broca', 'moscablanca'],
    como_actua:
      'El hongo germina sobre el insecto, lo penetra y lo coloniza por dentro hasta secarlo. Es el estándar de Cenicafé contra broca y mosca blanca.',
    fuente: 'cenicafe',
  },
  {
    id: 'trichogramma',
    nombre: 'Avispita Trichogramma',
    cientifico: 'Trichogramma pretiosum',
    tipo: 'parasitoide',
    plagas_que_controla: ['cogollero'],
    como_actua:
      'La avispita pone su huevo DENTRO del huevo de la mariposa-polilla. La larva nunca nace: no hay gusano que coma el cultivo.',
    fuente: 'grafo',
  },
  {
    id: 'telenomus',
    nombre: 'Avispita Telenomus',
    cientifico: 'Telenomus remus',
    tipo: 'parasitoide',
    plagas_que_controla: ['gusano_mazorca'],
    como_actua:
      'Pone su huevo dentro del huevo del elotero: el gusano no alcanza a nacer ni a entrar a la mazorca.',
    fuente: 'ica-ciat',
  },
  {
    id: 'cotesia',
    nombre: 'Avispita Cotesia',
    cientifico: 'Cotesia flavipes',
    tipo: 'parasitoide',
    plagas_que_controla: ['barrenador'],
    como_actua:
      'Rastrea la larva del barrenador dentro del tallo y la parasita en su propio túnel.',
    fuente: 'ica-ciat',
  },
  {
    id: 'cephalonomia',
    nombre: 'Avispa Cephalonomia',
    cientifico: 'Cephalonomia stephanoderis',
    tipo: 'parasitoide',
    plagas_que_controla: ['broca'],
    como_actua:
      'Esta avispita entra al grano picado, parasita a la broca y corta su reproducción donde el veneno no llega.',
    fuente: 'cenicafe',
  },
  {
    id: 'closterocerus',
    nombre: 'Avispa Closterocerus',
    cientifico: 'Closterocerus coffeellae',
    tipo: 'parasitoide',
    plagas_que_controla: ['minador'],
    como_actua:
      'Es una avispita que busca la larva del minador dentro de la galería de la hoja y la parasita.',
    fuente: 'cenicafe',
  },
  {
    id: 'catarina',
    nombre: 'Mariquita',
    cientifico: 'Hippodamia convergens',
    tipo: 'depredador',
    plagas_que_controla: ['pulgon', 'afido'],
    como_actua:
      'La mariquita y sus larvas devoran colonias enteras de pulgones y áfidos, hasta decenas al día.',
    fuente: 'grafo',
  },
  {
    id: 'crisopa',
    nombre: 'Crisopa (león de áfidos)',
    cientifico: 'Chrysoperla externa',
    tipo: 'depredador',
    plagas_que_controla: ['moscablanca', 'pulgon', 'afido', 'aranita'],
    como_actua:
      'La larva de crisopa, el "león de áfidos", chupa pulgones, huevos, mosca blanca y ácaros con sus mandíbulas curvas.',
    fuente: 'grafo',
  },
  {
    id: 'sirfido',
    nombre: 'Mosca de las flores (sírfido)',
    cientifico: 'Syrphidae',
    tipo: 'depredador',
    plagas_que_controla: ['afido'],
    como_actua:
      'Su larva se come los áfidos uno a uno; el adulto, además, poliniza las flores del cultivo.',
    fuente: 'grafo',
  },
  {
    id: 'cryptolaemus',
    nombre: 'Escarabajo come-cochinillas',
    cientifico: 'Cryptolaemus montrouzieri',
    tipo: 'depredador',
    plagas_que_controla: ['cochinilla'],
    como_actua:
      'Este escarabajo y sus larvas (parecidas a la cochinilla) devoran las motas blancas hasta limpiar la rama.',
    fuente: 'grafo',
  },
  {
    id: 'amblyseius',
    nombre: 'Ácaro Amblyseius',
    cientifico: 'Amblyseius swirskii',
    tipo: 'depredador',
    plagas_que_controla: ['trips'],
    como_actua:
      'Es un ácaro bueno que se come a los trips chiquitos antes de que se vuelvan plaga.',
    fuente: 'grafo',
  },
  {
    id: 'phytoseiulus',
    nombre: 'Ácaro depredador',
    cientifico: 'Phytoseiulus persimilis',
    tipo: 'depredador',
    plagas_que_controla: ['aranita'],
    como_actua:
      'Es un ácaro cazador que persigue y se come a la araña roja plaga, huevo por huevo.',
    fuente: 'grafo',
  },
  {
    id: 'mantis',
    nombre: 'Mantis religiosa',
    cientifico: 'Mantodea',
    tipo: 'depredador',
    plagas_que_controla: ['saltamontes'],
    como_actua:
      'Es una cazadora general: atrapa al saltamontes con sus patas y se lo come.',
    fuente: 'ecologia',
  },
  {
    id: 'doru',
    nombre: 'Tijereta',
    cientifico: 'Doru luteipes',
    tipo: 'depredador',
    plagas_que_controla: ['chicharrita'],
    como_actua:
      'La tijereta patrulla el cogollo de noche y devora chicharritas y huevos de otras plagas.',
    fuente: 'ica-ciat',
  },
  {
    id: 'purin_ortiga',
    nombre: 'Purín de ortiga',
    cientifico: 'Urtica dioica (fermentado)',
    tipo: 'botanico',
    plagas_que_controla: ['pulgon', 'afido'],
    como_actua:
      'Fermentado de ortiga que se aplica diluido al follaje; reprime plagas chupadoras (pulgones y áfidos) como repelente botánico, sin romper los controladores naturales.',
    fuente: 'biopreparado',
  },
]);

/* ────────────────────────────────────────────────────────────────────────
 * ENEMIGOS — plagas reales como enemigos del jugador (no son ficticios).
 * Cada uno declara qué cultivo ataca, qué daño hace y qué armas (controladores
 * biológicos) lo abaten. La ficha didáctica se muestra al derrotarla.
 *
 * GROUNDING: cada plaga aquí listada ya existe en PLAGAS_DOOM o PARES_CONTROL.
 * Su `controladores` son SIEMPRE un subconjunto de ARMAS (validado por tests).
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} Enemigo
 * @property {string} id
 * @property {string} nombre_comun
 * @property {string} nombre_cientifico
 * @property {string} cultivo_objetivo   Cultivo principal que ataca (texto corto, HUD).
 * @property {string} dano               Línea clara del daño que causa.
 * @property {string[]} controladores    ids de ARMAS que lo controlan (≥ 1).
 * @property {number} nivel_sugerido     Nivel (1..4) sugerido para que aparezca.
 * @property {string} ficha              Mensaje didáctico al derrotarla.
 * @property {'grafo'|'cenicafe'|'ica-ciat'|'ecologia'} fuente Origen del par.
 */

export const ENEMIGOS = Object.freeze([
  {
    id: 'cogollero',
    nombre_comun: 'Gusano cogollero',
    nombre_cientifico: 'Spodoptera frugiperda',
    cultivo_objetivo: 'Maíz',
    dano: 'Se mete en el cogollo del maíz y se come el centro tierno: la planta queda sin punto de crecimiento.',
    controladores: ['bt', 'trichogramma'],
    nivel_sugerido: 1,
    ficha: 'El cogollero es una oruga: el Bt la detiene al primer bocado y la avispita Trichogramma ataca el huevo antes de que nazca.',
    fuente: 'grafo',
  },
  {
    id: 'gusano_mazorca',
    nombre_comun: 'Gusano de la mazorca',
    nombre_cientifico: 'Helicoverpa zea',
    cultivo_objetivo: 'Maíz',
    dano: 'Entra por la punta de la mazorca y se come los granos tiernos en formación.',
    controladores: ['bt', 'telenomus'],
    nivel_sugerido: 4,
    ficha: 'Al elotero lo controlan el Bt (al comer la hoja) y la avispita Telenomus (atacando el huevo). Sin huevo no hay gusano en la mazorca.',
    fuente: 'ica-ciat',
  },
  {
    id: 'barrenador',
    nombre_comun: 'Barrenador del tallo',
    nombre_cientifico: 'Diatraea saccharalis',
    cultivo_objetivo: 'Maíz',
    dano: 'Hace túneles por dentro del tallo del maíz; la planta se debilita y se quiebra con el viento.',
    controladores: ['cotesia'],
    nivel_sugerido: 4,
    ficha: 'El barrenador vive dentro del tallo: solo la avispa Cotesia lo persigue por el túnel y lo parasita donde ningún veneno llega.',
    fuente: 'ica-ciat',
  },
  {
    id: 'chicharrita',
    nombre_comun: 'Chicharrita del maíz',
    nombre_cientifico: 'Dalbulus maidis',
    cultivo_objetivo: 'Maíz',
    dano: 'Chupa la savia y le transmite al maíz el achaparramiento, una enfermedad que enana la planta.',
    controladores: ['doru'],
    nivel_sugerido: 4,
    ficha: 'La tijereta Doru es la guardiana nocturna del maizal: patrulla el cogollo y devora chicharritas mientras usted duerme.',
    fuente: 'ica-ciat',
  },
  {
    id: 'moscablanca',
    nombre_comun: 'Mosca blanca',
    nombre_cientifico: 'Bemisia tabaci',
    cultivo_objetivo: 'Frijol y hortalizas',
    dano: 'Chupa savia por debajo de la hoja y transmite virus que la enrollan y la amarillan.',
    controladores: ['beauveria', 'crisopa'],
    nivel_sugerido: 1,
    ficha: 'La mosca blanca es de cuerpo blando: el hongo Beauveria la seca por dentro y la larva de crisopa la caza.',
    fuente: 'grafo',
  },
  {
    id: 'pulgon',
    nombre_comun: 'Pulgón',
    nombre_cientifico: 'Aphididae',
    cultivo_objetivo: 'Frijol, tomate y hortalizas',
    dano: 'Chupa la savia de los brotes; la hoja tierna se enrolla y se pone pegajosa.',
    controladores: ['catarina', 'crisopa', 'purin_ortiga'],
    nivel_sugerido: 1,
    ficha: 'Para el pulgón, suelte mariquitas: se los comen vivos. La crisopa y el purín de ortiga ayudan. Eso es control biológico, no veneno.',
    fuente: 'grafo',
  },
  {
    id: 'afido',
    nombre_comun: 'Áfido del frijol',
    nombre_cientifico: 'Aphis fabae',
    cultivo_objetivo: 'Frijol',
    dano: 'Forma colonias pegajosas en los brotes, chupa savia y debilita la mata de frijol.',
    controladores: ['catarina', 'sirfido', 'crisopa', 'purin_ortiga'],
    nivel_sugerido: 1,
    ficha: 'Los áfidos los controlan mariquita, sírfido y crisopa; el purín de ortiga los reprime como repelente botánico.',
    fuente: 'grafo',
  },
  {
    id: 'aranita',
    nombre_comun: 'Araña roja (ácaro)',
    nombre_cientifico: 'Tetranychus urticae',
    cultivo_objetivo: 'Mora, tomate y fresa',
    dano: 'Pica el envés de la hoja, la puntea y la seca; teje telaraña fina en los bordes.',
    controladores: ['crisopa', 'phytoseiulus'],
    nivel_sugerido: 2,
    ficha: 'La araña roja es un ácaro diminuto: lo cazan la crisopa y el ácaro bueno Phytoseiulus, huevo por huevo.',
    fuente: 'grafo',
  },
  {
    id: 'trips',
    nombre_comun: 'Trips',
    nombre_cientifico: 'Thysanoptera',
    cultivo_objetivo: 'Cebolla, tomate y hortalizas',
    dano: 'Raspa la hoja y la flor para chupar; deja manchas plateadas y puntos negros.',
    controladores: ['amblyseius'],
    nivel_sugerido: 2,
    ficha: 'Para los trips, suelte el ácaro bueno Amblyseius: caza los trips jóvenes sin un solo veneno.',
    fuente: 'grafo',
  },
  {
    id: 'saltamontes',
    nombre_comun: 'Saltamontes',
    nombre_cientifico: 'Caelifera',
    cultivo_objetivo: 'Maíz y hortalizas',
    dano: 'Mastica las hojas y los brotes tiernos; en grupo deja la planta pelada.',
    controladores: ['mantis'],
    nivel_sugerido: 2,
    ficha: 'La mantis es cazadora general: atrapa al saltamontes con sus patas. Cuídela, no la mate: ayuda a la finca.',
    fuente: 'ecologia',
  },
  {
    id: 'broca',
    nombre_comun: 'Broca del café',
    nombre_cientifico: 'Hypothenemus hampei',
    cultivo_objetivo: 'Café',
    dano: 'Escarabajito que perfora el grano de café por dentro y arruina la calidad de la cosecha.',
    controladores: ['beauveria', 'cephalonomia'],
    nivel_sugerido: 3,
    ficha: 'La broca vive DENTRO del grano: el hongo Beauveria la alcanza y la seca, y la avispa Cephalonomia la parasita. Estándar de Cenicafé.',
    fuente: 'cenicafe',
  },
  {
    id: 'minador',
    nombre_comun: 'Minador de la hoja',
    nombre_cientifico: 'Leucoptera coffeella',
    cultivo_objetivo: 'Café',
    dano: 'Su larva cava galerías cafés por dentro de la hoja del café; la hoja se seca y se cae.',
    controladores: ['closterocerus'],
    nivel_sugerido: 3,
    ficha: 'Para el minador del café, la avispa Closterocerus encuentra la larva dentro de la galería y la parasita.',
    fuente: 'cenicafe',
  },
  {
    id: 'cochinilla',
    nombre_comun: 'Cochinilla harinosa',
    nombre_cientifico: 'Planococcus citri',
    cultivo_objetivo: 'Café y frutales',
    dano: 'Forma motas blancas pegajosas en ramas y raíces, chupa la savia y atrae hormigas.',
    controladores: ['cryptolaemus'],
    nivel_sugerido: 3,
    ficha: 'Para la cochinilla, el escarabajo Cryptolaemus se la come; le dicen "destructor de cochinillas".',
    fuente: 'grafo',
  },
]);

/* ────────────────────────────────────────────────────────────────────────
 * REHENES — animales silvestres cazados a rescatar (estilo POW de Metal Slug).
 *
 * Cada uno es fauna con identidad visual canónica en `src/visual/creatures/`
 * (borugoIdentidad.js, faunaAndina.js, jaguarIdentidad.js, morrocoyIdentidad.js).
 * La causa de la cacería se documenta tal cual la realidad colombiana: carne de
 * monte, conflicto con cultivos/ganado, o tráfico como mascota.
 * NADA de sangre ni cacería gráfica en el juego: el jugador LOS LIBERA.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} Rehen
 * @property {string} id
 * @property {string} nombre
 * @property {string} cientifico
 * @property {string} por_que_lo_cazan  Motivo real (1-2 líneas claras).
 * @property {string} mensaje_educativo Mensaje al rescatarlo (tú/usted, es-CO).
 * @property {string} amenaza           Categoría IUCN/sintética (referencia).
 */

export const REHENES = Object.freeze([
  {
    id: 'borugo',
    nombre: 'Borugo (paca de montaña)',
    cientifico: 'Cuniculus taczanowskii',
    por_que_lo_cazan:
      'En la vereda lo cazan con perros para vender su carne como "carne de monte". Es roedor nocturno de bosque andino.',
    mensaje_educativo:
      'El borugo es tímido y nocturno: dispersa semillas del bosque. Si lo cuidamos, el bosque se regenera y hay agua limpia abajo.',
    amenaza: 'Casi amenazada (NT) — IUCN, presión por cacería y pérdida de bosque.',
  },
  {
    id: 'oso_andino',
    nombre: 'Oso de anteojos (oso andino)',
    cientifico: 'Tremarctos ornatus',
    por_que_lo_cazan:
      'Lo cazan por conflicto con cultivos y ganado, y por trofeo. Es el único oso de Suramérica y depende del bosque andino.',
    mensaje_educativo:
      'El oso andino siembra el bosque: lleva semillas en el estiércol y abre claros que renuevan el monte. Sin oso, no hay bosque de niebla.',
    amenaza: 'Vulnerable (VU) — IUCN, pérdida de hábitat y cacería retaliativa.',
  },
  {
    id: 'jaguar',
    nombre: 'Jaguar (yaguareté)',
    cientifico: 'Panthera onca',
    por_que_lo_cazan:
      'Lo cazan por conflicto con ganado vacuno y por temor. Es el felino más grande de América y la especie tótem de las selvas cálidas.',
    mensaje_educativo:
      'El jaguar es el guardián del bosque: al ser el depredador tope, regula a herbívoros y mantiene el equilibrio. Sin jaguar, el bosque se desordena.',
    amenaza: 'Casi amenazada (NT) — IUCN, pérdida y fragmentación de selva.',
  },
  {
    id: 'morrocoy',
    nombre: 'Morrocoy (galápago de patas rojas)',
    cientifico: 'Chelonoidis carbonarius',
    por_que_lo_cazan:
      'Lo capturan para comerlo en fiestas y para venderlo como mascota. Es tortuga de tierra caliente, lenta y longeva.',
    mensaje_educativo:
      'El morrocoy vive décadas y dispersa semillas de frutales del bosque seco. Si se lo lleva de su casa, el bosque pierde a su sembrador paciente.',
    amenaza: 'Casi amenazada (NT) — IUCN, tráfico y consumo.',
  },
]);

/* ────────────────────────────────────────────────────────────────────────
 * JEFES — 3 amenazas estructurales (los "jefes finales" del campo).
 *
 * NO son plagas agronómicas: son fuerzas mayores que amenazan la finca entera
 * (sequía prolongada, deforestación del bosque, agroquímico que envenena
 * suelo y agua). Cada uno propone UNA mecánica de juego y UNA lección que el
 * jugador se lleva al vencerlo. La fuente es el contexto agroecológico del
 * repo (climaBoletines.js para ENSO/sequía; restauracion-especies.json para
 * deforestación; aguaFinca.js / toxicologia-suelo.js para agroquímico).
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} Jefe
 * @property {string} id
 * @property {string} nombre
 * @property {'sequia'|'deforestacion'|'agroquimico'} tema
 * @property {string} mecanica_sugerida  Idea de juego (no implica código aquí).
 * @property {string} ensenanza         Lección didáctica al vencerlo.
 * @property {string} fuente            Referencia documental (sin DOI inventado).
 */

export const JEFES = Object.freeze([
  {
    id: 'jefe_sequia',
    nombre: 'El Niño abrasador (sequía)',
    tema: 'sequia',
    mecanica_sugerida:
      'Jefe que se nutre del sol: el jugador debe cubrirlo con sombra (setos vivos, cobertura del suelo, riego ahorrador) mientras esquiva sus rachas de calor. Cada cobertura bajada reduce su vida.',
    ensenanza:
      'En fase El Niño llueve menos y sube el riesgo de sequía, incendio y falta de agua. Cobertura del suelo, setos y riego ahorrador son el escudo de la finca.',
    fuente: 'IDEAM · Fenalce (boletín ENSO); ver src/data/climaBoletines.js.',
  },
  {
    id: 'jefe_deforestacion',
    nombre: 'La motoerra (deforestación)',
    tema: 'deforestacion',
    mecanica_sugerida:
      'Jefe-correteo: arrasa con bosque en franjas. El jugador debe reforestnar (sembrar árboles nativos en los claros) para cerrarle el paso mientras libera a los animales cercados.',
    ensenanza:
      'Talar el bosque andino seca los nacimientos de agua y deja ir a oso, borugo y jaguar. Reforestar con nativas (aliso, nacedero, encenillo) devuelve el agua y devuelve la fauna.',
    fuente: 'IAvH / CIPAV; ver src/data/restauracion-especies.json.',
  },
  {
    id: 'jefe_agroquimico',
    nombre: 'El veneno de garrafa (agroquímico)',
    tema: 'agroquimico',
    mecanica_sugerida:
      'Jefe tóxico que suelta nubes venenosas: el jugador usa controladores biológicos (armas del juego) para neutralizar cada nube; los químicos NO sirven aquí (le devuelven el daño).',
    ensenanza:
      'El agroquímico mal usado mata a los controladores naturales ( mariquita, crisopa, avispitas ) y envenena suelo y agua. La salida es control biológico y biopreparados: la misma lección del juego.',
    fuente: 'ICA, AGROSAVIA; ver src/data/toxicologia-suelo.js.',
  },
]);

/* ────────────────────────────────────────────────────────────────────────
 * NIVELES — biogeografía coherente (piso térmico + fauna + plaga + jefe).
 *
 * Cada nivel aparece en un piso térmico real de Colombia (ver
 * src/data/piso-termico.json: páramo / frío / templado / cálido). Las plagas
 * que aparecen son las que de verdad presionan esos cultivos en ese piso; el
 * rehén y el jefe calzan con la amenaza del lugar.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} Nivel
 * @property {string} id
 * @property {number} numero
 * @property {string} nombre
 * @property {'paramo'|'frio'|'templado'|'calido'} piso_termico
 * @property {string[]} enemigos    ids de ENEMIGOS que aparecen aquí.
 * @property {string} rehen        id de REHEN a rescatar.
 * @property {string} jefe         id de JEFE final del nivel.
 * @property {string} intro        Línea de contexto para la pantalla de inicio.
 */

export const NIVELES = Object.freeze([
  {
    id: 'nivel_1',
    numero: 1,
    nombre: 'La huerta de la ladera (templado)',
    piso_termico: 'templado',
    enemigos: ['cogollero', 'pulgon', 'afido', 'moscablanca'],
    rehen: 'oso_andino',
    jefe: 'jefe_sequia',
    intro:
      'Mañana en la ladera templada. Pulgones, áfidos y cogollero atacan la huerta. El oso andino está acorralado; la sequía aprieta.',
  },
  {
    id: 'nivel_2',
    numero: 2,
    nombre: 'El cafetal en la niebla (frío)',
    piso_termico: 'frio',
    enemigos: ['broca', 'minador', 'cochinilla', 'trips', 'aranita'],
    rehen: 'borugo',
    jefe: 'jefe_agroquimico',
    intro:
      'Niebla en el cafetal de altura. Broca, minador y cochinilla presionan los granos. El borugo huye de los perros; el agroquímico amenaza el agua.',
  },
  {
    id: 'nivel_3',
    numero: 3,
    nombre: 'La milpa al sol (cálido)',
    piso_termico: 'calido',
    enemigos: ['chicharrita', 'gusano_mazorca', 'barrenador', 'saltamontes'],
    rehen: 'morrocoy',
    jefe: 'jefe_deforestacion',
    intro:
      'Tarde caliente en la milpa. El maíz recibe a chicharrita, elotero y barrenador. El morrocoy es capturado; la motoerra arrasa el bosque cercano.',
  },
  {
    id: 'nivel_4',
    numero: 4,
    nombre: 'El páramo herido (páramo)',
    piso_termico: 'paramo',
    enemigos: ['aranita', 'trips', 'saltamontes', 'moscablanca'],
    rehen: 'jaguar',
    jefe: 'jefe_deforestacion',
    intro:
      'Sube al páramo: el jaguar perdió su corredor y la motoerra sube la cinta. Ácaros, trips y saltamontes presionan los cultivos de altura. Cierra el ciclo.',
  },
]);

/* ────────────────────────────────────────────────────────────────────────
 * HELPERS DE LOOKUP (data-driven, sin lógica de juego).
 *
 * Consumidores (fable, motor, pantalla) usan estos accesos para no tener que
 * armar índices a mano. Puros: sin estado, sin efectos, sin DOM.
 * ──────────────────────────────────────────────────────────────────────── */

const ARMAS_POR_ID = Object.freeze(
  ARMAS.reduce((acc, a) => {
    acc[a.id] = a;
    return acc;
  }, {}),
);

const ENEMIGOS_POR_ID = Object.freeze(
  ENEMIGOS.reduce((acc, e) => {
    acc[e.id] = e;
    return acc;
  }, {}),
);

const REHENES_POR_ID = Object.freeze(
  REHENES.reduce((acc, r) => {
    acc[r.id] = r;
    return acc;
  }, {}),
);

const JEFES_POR_ID = Object.freeze(
  JEFES.reduce((acc, j) => {
    acc[j.id] = j;
    return acc;
  }, {}),
);

const NIVELES_POR_NUMERO = Object.freeze(
  NIVELES.reduce((acc, n) => {
    acc[n.numero] = n;
    return acc;
  }, {}),
);

/** Busca un arma por id. Devuelve undefined si no existe. @param {string} id @returns {Arma|undefined} */
export function getArma(id) {
  return ARMAS_POR_ID[id];
}

/** Busca un enemigo por id. @param {string} id @returns {Enemigo|undefined} */
export function getEnemigo(id) {
  return ENEMIGOS_POR_ID[id];
}

/** Busca un rehén por id. @param {string} id @returns {Rehen|undefined} */
export function getRehen(id) {
  return REHENES_POR_ID[id];
}

/** Busca un jefe por id. @param {string} id @returns {Jefe|undefined} */
export function getJefe(id) {
  return JEFES_POR_ID[id];
}

/** Busca un nivel por número (1-indexado). @param {number} numero @returns {Nivel|undefined} */
export function getNivel(numero) {
  return NIVELES_POR_NUMERO[numero];
}

/**
 * ¿El arma `armaId` controla al enemigo `enemigoId`?
 * @param {string} armaId
 * @param {string} enemigoId
 * @returns {boolean}
 */
export function armaControlaEnemigo(armaId, enemigoId) {
  const arma = ARMAS_POR_ID[armaId];
  if (!arma) return false;
  return arma.plagas_que_controla.includes(enemigoId);
}
