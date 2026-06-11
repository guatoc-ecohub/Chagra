import ANIMAL_DATA from '../data/animal-diagnostics.json';

export function detectarEspecie(descripcion) {
  if (!descripcion) return null;
  const texto = descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Ordenar por especificidad (mas palabras primero) para que "vacas lecheras"
  // matchee antes que solo "vacas"
  const senales = Object.entries(ANIMAL_DATA.senales_voz)
    .sort((a, b) => b[0].split('_').length - a[0].split('_').length);
  for (const [clave, senal] of senales) {
    const palabras = clave.split('_');
    if (palabras.every((p) => texto.includes(p))) {
      const especie = ANIMAL_DATA.especies.find((e) => e.id === senal.especie);
      return especie ? { ...especie, funcion_detectada: senal.funcion || especie.funcion } : null;
    }
  }
  return null;
}

export function recomendarForraje(especieId) {
  const forrajes = ANIMAL_DATA.forrajeras.filter((f) => {
    if (especieId === 'porcino' || especieId === 'cunicola' || especieId === 'avicola') {
      return f.monogastricos_max_pct > 0;
    }
    if (especieId === 'equino') return f.equinos_max_pct > 0;
    return f.rumiantes_max_pct > 0;
  });
  return forrajes;
}

export function getGuardas(especieId) {
  const guardas = [];
  if (['porcino', 'cunicola', 'avicola', 'equino'].includes(especieId)) {
    guardas.push(ANIMAL_DATA.guardas.leucaena_toxica);
  }
  if (especieId === 'apicola') guardas.push(ANIMAL_DATA.guardas.apis_vs_meliponas);
  if (['avicola', 'porcino'].includes(especieId)) guardas.push(ANIMAL_DATA.guardas.estres_termico);
  guardas.push(ANIMAL_DATA.guardas.normativa_ica);
  return guardas;
}

export function diagnosticarAnimal(descripcion) {
  if (!descripcion || descripcion.trim().length < 3) {
    return { especie: null, forrajes: [], guardas: [], sin_datos: true, fuente: ANIMAL_DATA.fuente };
  }
  const texto = descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const especie = detectarEspecie(descripcion);
  if (!especie) {
    return { especie: null, forrajes: [], guardas: [ANIMAL_DATA.guardas.normativa_ica], sin_datos: true, fuente: ANIMAL_DATA.fuente };
  }
  const forrajes = recomendarForraje(especie.id);
  const guardas = getGuardas(especie.id);

  // Detect Leucaena specifically mentioned
  if (texto.includes('leucaena') && ['porcino', 'cunicola', 'avicola', 'equino'].includes(especie.id)) {
    guardas.unshift(ANIMAL_DATA.guardas.leucaena_toxica);
  }

  return { especie, forrajes, guardas, sin_datos: false, fuente: ANIMAL_DATA.fuente };
}

export function formatearGroundingAnimal(d) {
  if (!d || d.sin_datos || !d.especie) return '';
  const partes = [];
  partes.push(`**Especie detectada:** ${d.especie.nombre} (${d.especie.funcion_detectada || d.especie.funcion}).`);
  if (d.forrajes.length > 0) {
    partes.push('**Forrajeras recomendadas:**');
    d.forrajes.forEach((f) => partes.push(`- ${f.nombre}: max ${d.especie.id === 'porcino' || d.especie.id === 'cunicola' ? f.monogastricos_max_pct : f.rumiantes_max_pct}% inclusion. ${f.guarda}`));
  }
  if (d.guardas.length > 0) {
    partes.push('**GUARDAS DE SEGURIDAD:**');
    d.guardas.forEach((g) => partes.push(`- ${g}`));
  }
  partes.push(`Fuente: ${d.fuente}`);
  return partes.join('\n\n');
}
