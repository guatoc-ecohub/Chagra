export const PROFILE_QUESTIONS = [
  // ── Identidad ────────────────────────────────────────────────────────
  {
    id: 'nombre',
    category: 'identidad',
    title: '¿Cómo te llamas?',
    help: 'Para que el agente te salude por tu nombre. Puedes dejarlo en blanco.',
    type: 'text',
    placeholder: 'Tu nombre',
  },
  {
    id: 'region',
    category: 'identidad',
    title: '¿En qué municipio o región cultivas?',
    help: 'Ej: Choachí, Cauca, Antioquia. Ayuda a dar consejos según tu clima y costumbres.',
    type: 'text',
    placeholder: 'Municipio o departamento',
  },
  {
    id: 'vocacion',
    category: 'identidad',
    title: '¿Cómo te describes mejor?',
    type: 'single',
    options: [
      { value: 'campesino', label: 'Campesino/a — vivo del campo' },
      { value: 'urbano', label: 'Cultivo urbano — balcón, terraza o patio' },
      { value: 'tecnico', label: 'Técnico/a o agrónomo/a' },
      { value: 'curioso', label: 'Curioso/a — apenas estoy aprendiendo' },
    ],
  },
  {
    // ROL de producto (onboarding por perfil). Afina qué herramientas
    // (chips de modo) se despliegan primero. NO es rol de seguridad — es un
    // perfil de USO. Los valores coinciden con PROFILE_ROLES de
    // profileChipSelector.js (fuente de la selección de chips). Skippable:
    // si lo saltan, el rol se infiere de vocación/objetivo/animales.
    id: 'rol',
    category: 'identidad',
    title: '¿Qué es lo tuyo en el campo?',
    help: 'Define qué herramientas te mostramos primero. Puedes saltarlo.',
    type: 'single',
    options: [
      { value: 'campesino', label: '🌱 Cultivo comida — siembro y cosecho' },
      { value: 'ganadero', label: '🐄 Tengo animales — gallinas, cerdos o ganado' },
      { value: 'restaurador', label: '🌳 Restauro la tierra — nativas, bosque, páramo' },
      { value: 'guia_glaciar', label: '⛰️ Guío en la montaña — páramo y glaciar' },
      { value: 'tecnico', label: '🔬 Acompaño técnicamente — agrónomo/a o asesor/a' },
      { value: 'socio', label: '🤝 Soy aliado/a o apenas miro' },
    ],
  },

  // ── Finca ────────────────────────────────────────────────────────────
  {
    id: 'finca_tipo',
    category: 'finca',
    title: '¿Dónde cultivas?',
    type: 'single',
    options: [
      { value: 'rural', label: 'Finca o parcela rural' },
      { value: 'balcon', label: 'Balcón o ventana' },
      { value: 'terraza', label: 'Terraza o patio' },
      { value: 'invernadero', label: 'Invernadero' },
    ],
  },
  {
    id: 'finca_hectareas',
    category: 'finca',
    title: '¿Qué tamaño tiene tu finca?',
    help: 'Aproximado, en hectáreas. Si no lo sabes, sáltalo.',
    type: 'single',
    options: [
      { value: 'menos_1', label: 'Menos de 1 hectárea' },
      { value: '1_5', label: 'Entre 1 y 5 hectáreas' },
      { value: '5_20', label: 'Entre 5 y 20 hectáreas' },
      { value: 'mas_20', label: 'Más de 20 hectáreas' },
    ],
    // Condicional: solo si NO es urbano (balcón/terraza no tienen hectáreas).
    when: (a) => a.vocacion !== 'urbano' && !['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    id: 'finca_altitud',
    category: 'finca',
    title: '¿A qué altura está tu finca?',
    help: 'En metros sobre el nivel del mar (msnm). Define tu piso térmico. Si no la sabes, la detectamos por ubicación.',
    type: 'number',
    placeholder: '1730',
    unit: 'msnm',
    // Condicional: solo para cultivo rural / invernadero (no aplica a balcón urbano).
    when: (a) => a.vocacion !== 'urbano' && !['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    id: 'cultivos_actuales',
    category: 'finca',
    title: '¿Qué cultivas ahora mismo?',
    help: 'Escribe los cultivos que tienes. Ej: café, mora, tomate, plátano.',
    type: 'text',
    placeholder: 'Café, mora, tomate...',
  },
  {
    // ANIMALES (onboarding por perfil). Pregunta pertinente para campesinos y
    // ganaderos. Alimenta la selección de chips: si tiene animales, se le
    // despliega el chip de silvopastoreo (forraje/ganado — el chip REAL que
    // cubre el ángulo pecuario; no existe chip "gallinas" ni "cerdos" en el
    // manifiesto, no se inventan). Multi + skippable. No aplica a cultivo
    // urbano de balcón (sin espacio para animales).
    id: 'animales',
    category: 'finca',
    title: '¿Qué animales tienes?',
    help: 'Marca todos los que apliquen, o sáltala si no tienes.',
    type: 'multi',
    options: [
      { value: 'gallinas', label: '🐔 Gallinas o pollos' },
      { value: 'cerdos', label: '🐖 Cerdos' },
      { value: 'ganado', label: '🐄 Ganado (vacas)' },
      { value: 'ovejas_cabras', label: '🐑 Ovejas o cabras' },
      { value: 'otros', label: '🐝 Otros (abejas, peces, conejos...)' },
      { value: 'ninguno', label: 'Ninguno por ahora' },
    ],
    // No aplica al cultivo urbano de balcón/terraza (sin espacio pecuario).
    when: (a) => a.vocacion !== 'urbano' && !['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    // Para gallinas: aclara el manejo (libres / galpón / corral). Ejemplo
    // explícito del brief (carlos.rivera). Solo si marcó gallinas. Refina el
    // contexto del agente; no cambia la selección de chips por sí sola.
    id: 'gallinas_manejo',
    category: 'finca',
    title: '¿Cómo tienes las gallinas?',
    help: 'Ayuda a dar mejor consejo de sanidad y postura.',
    type: 'single',
    options: [
      { value: 'libres', label: 'Sueltas / libres (pastoreo)' },
      { value: 'galpon', label: 'En galpón' },
      { value: 'corral', label: 'En corral cercado' },
      { value: 'mixto', label: 'Mixto — entran y salen' },
    ],
    when: (a) => Array.isArray(a.animales) && a.animales.includes('gallinas'),
  },
  {
    // OBJETIVO de restauración (onboarding por perfil). Pertinente para
    // restauradores y guías de páramo/glaciar. Refina el contexto y refuerza
    // la selección de chips de restauración. Skippable.
    id: 'restauracion_objetivo',
    category: 'finca',
    title: '¿Qué te gustaría recuperar?',
    help: 'Marca lo que quieres restaurar con nativas. Opcional.',
    type: 'multi',
    options: [
      { value: 'bosque', label: '🌳 Bosque nativo' },
      { value: 'ribera', label: '💧 Orilla de quebrada o nacimiento' },
      { value: 'paramo', label: '⛰️ Páramo (sobre 3000 m)' },
      { value: 'cortafuegos', label: '🔥 Barrera contra incendios' },
      { value: 'silvopastoreo', label: '🐄 Árboles + forraje para ganado' },
    ],
    // Solo si el rol es restaurador / guía de glaciar (perfiles ecológicos).
    when: (a) => ['restaurador', 'guia_glaciar'].includes(a.rol),
  },

  // ── Experiencia ──────────────────────────────────────────────────────
  {
    id: 'anios_cultivando',
    category: 'experiencia',
    title: '¿Hace cuánto cultivas?',
    type: 'single',
    options: [
      { value: 'apenas', label: 'Apenas estoy empezando' },
      { value: 'menos_5', label: 'Menos de 5 años' },
      { value: '5_15', label: 'Entre 5 y 15 años' },
      { value: 'toda_vida', label: 'Toda la vida' },
    ],
  },
  {
    id: 'manejo',
    category: 'experiencia',
    title: '¿Cómo manejas tus cultivos?',
    type: 'single',
    options: [
      { value: 'organico', label: 'Orgánico / agroecológico' },
      { value: 'convencional', label: 'Convencional (agroquímicos)' },
      { value: 'mixto', label: 'Mixto — combino los dos' },
      { value: 'transicion', label: 'En transición a orgánico' },
    ],
  },
  {
    id: 'problemas',
    category: 'experiencia',
    title: '¿Qué problemas tienes con frecuencia?',
    help: 'Marca todos los que apliquen.',
    type: 'multi',
    options: [
      { value: 'plagas', label: 'Plagas e insectos' },
      { value: 'enfermedades', label: 'Enfermedades de plantas' },
      { value: 'clima', label: 'Clima (sequía, heladas, lluvia)' },
      { value: 'suelo', label: 'Suelo pobre o erosionado' },
      { value: 'malezas', label: 'Malezas' },
      { value: 'mercado', label: 'Vender la cosecha' },
    ],
  },

  // ── Objetivos ────────────────────────────────────────────────────────
  {
    id: 'objetivo',
    category: 'objetivos',
    title: '¿Qué quieres lograr con Chagra?',
    type: 'multi',
    options: [
      { value: 'producir_mas', label: 'Producir más y mejor' },
      { value: 'reducir_quimicos', label: 'Reducir o eliminar químicos' },
      { value: 'aprender', label: 'Aprender y entender mi cultivo' },
      { value: 'registrar', label: 'Llevar registro de mi finca' },
      { value: 'biodiversidad', label: 'Cuidar la biodiversidad' },
      { value: 'vender', label: 'Vender mejor mis productos' },
    ],
  },
  {
    id: 'cultivos_interes',
    category: 'objetivos',
    title: '¿Qué cultivos te gustaría sembrar o mejorar?',
    help: 'Cultivos nuevos que te interesan. Opcional.',
    type: 'text',
    placeholder: 'Aguacate, cacao, hortalizas...',
  },

  // ── Preferencias ─────────────────────────────────────────────────────
  {
    id: 'nivel_respuestas',
    category: 'preferencias',
    title: '¿Cómo prefieres que el agente te responda?',
    type: 'single',
    options: [
      { value: 'simple', label: 'Simple y al grano' },
      { value: 'detallado', label: 'Detallado, con explicación técnica' },
    ],
  },
  {
    id: 'notif_clima',
    category: 'preferencias',
    title: '¿Quieres alertas de clima para tu zona?',
    help: 'Avisos de lluvia, heladas o sequía relevantes para tus cultivos.',
    type: 'single',
    options: [
      { value: 'si', label: 'Sí, avísame' },
      { value: 'no', label: 'No, gracias' },
    ],
  },
  {
    id: 'estrato',
    category: 'finca',
    title: '¿En qué estrato vives?',
    help: 'Solo para cultivo urbano — ayuda a sugerir soluciones según tu espacio. Opcional.',
    type: 'single',
    options: [
      { value: '1_2', label: 'Estrato 1 o 2' },
      { value: '3_4', label: 'Estrato 3 o 4' },
      { value: '5_6', label: 'Estrato 5 o 6' },
    ],
    // Condicional: solo para usuarios urbanos.
    when: (a) => a.vocacion === 'urbano' || ['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    id: 'espacio_urbano',
    category: 'finca',
    title: '¿Cuánto espacio tienes para cultivar?',
    help: 'Aproximado. Solo para cultivo urbano.',
    type: 'single',
    options: [
      { value: 'materas', label: 'Unas pocas materas' },
      { value: 'balcon_lleno', label: 'Un balcón completo' },
      { value: 'terraza_grande', label: 'Una terraza o patio grande' },
    ],
    when: (a) => a.vocacion === 'urbano' || ['balcon', 'terraza'].includes(a.finca_tipo),
  },
  {
    id: 'riego',
    category: 'finca',
    title: '¿Cómo riegas tus cultivos?',
    type: 'single',
    options: [
      { value: 'lluvia', label: 'Solo lluvia (secano)' },
      { value: 'manguera', label: 'Manguera o regadera' },
      { value: 'goteo', label: 'Riego por goteo o aspersión' },
      { value: 'acequia', label: 'Acequia o gravedad' },
    ],
    // Condicional: no aplica a balcón con pocas materas (se asume riego manual).
    when: (a) => a.vocacion !== 'urbano' && a.finca_tipo !== 'balcon',
  },
];

/**
 * Devuelve la lista de preguntas que aplican dado el set de respuestas
 * acumuladas. Evalúa `when(answers)` para las condicionales.
 *
 * @param {Object} answers - respuestas acumuladas { id: valor }
 * @returns {Array} subconjunto de PROFILE_QUESTIONS visible
 */
export function getApplicableQuestions(answers = {}) {
  return PROFILE_QUESTIONS.filter((q) => (typeof q.when === 'function' ? q.when(answers) : true));
}
