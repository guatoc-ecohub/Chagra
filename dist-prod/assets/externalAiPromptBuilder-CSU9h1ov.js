import{r as e}from"./speciesResolver-1g9xvoqO.js";var t=500,n=/ignora\s+(las?\s+)?instrucciones?|actúa\s+como|olvida\s+lo\s+anterior|forget\s+(previous|all)\s+instructions?|ignore\s+(all\s+)?instructions?|you\s+are\s+now|jailbreak|prompt\s+injection|\n{3,}/gi;function r(e){if(e==null)return``;let r=String(e).slice(0,t);return r=r.replace(n,`[contenido omitido]`),r}var i=`
IMPORTANTE — HONESTIDAD: No inventes nombres científicos, binomios, dosis, marcas comerciales ni fuentes bibliográficas. Si no tienes certeza de un dato específico, di "no tengo certeza" o "no hay evidencia disponible" en lugar de inventar. Cero alucinaciones.`;function a(e){return typeof e!=`number`||!Number.isFinite(e)||e<0?null:e<1e3?`cálido`:e<2e3?`templado`:e<3e3?`frío`:e<3600?`páramo`:`glacial`}function o(e,t){if(Array.isArray(e)&&e.length>0)return e;let n=a(t);return n?[n]:[]}function s(t){return e(t)}function c(e){return Array.isArray(e)?e.filter(Boolean).map(e=>String(e)):e==null||e===``?[]:[String(e)]}function l(e){let t=c(e);return t.length>0?t.join(`, `):``}function u(e,t){let n=c(e),r=c(t);if(n.length===0||r.length===0)return``;let i=new Set(n.map(s).filter(Boolean)),a=new Set(r.map(s).filter(Boolean));if(i.size===0||a.size===0)return``;for(let e of i)if(a.has(e))return``;let o=l(n),u=l(r);return!o||!u?``:`RESTRICCION DE PISO TERMICO: este cultivo NO figura en el piso ${o}; sus pisos reales son ${u}. Si el usuario pregunta por sembrarlo en ${o}, adviertele que es INVIABLE y ofrece alternativas reales; NO valides la siembra.`}function d(e){let{speciesName:t=`especie desconocida`,scientificName:n,estrato:r,companions:a=[],antagonists:s=[],thermalZones:c=[],speciesThermalZones:l=[],altitudMsnm:d,municipio:f}=e,p=o(c,d),m=p.length>0?p.join(`, `):`no especificado`,h=u(p,l),g=[d?`${d} msnm`:`altitud no especificada`,f].filter(Boolean).join(`, `),_=a.length>0?a.join(`, `):`ninguno aún`,v=s.length>0?s.join(`, `):`ninguno conocido`,y=n?`${n} (${t})`:t,b=r?`Estrato: ${r}`:``;return(`Actúa como agrónomo colombiano especializado en agroecología y diseño de gremios.

CONTEXTO:
- Ubicación: ${g} (piso térmico ${m})
- Especie principal: ${y}
${b?`- ${b}`:``}- Companions ya considerados: ${_}
- Antagonists conocidos: ${v}

PREGUNTA:
Sugiere 5 compañeros adicionales para esta especie en un gremio agroecológico colombiano, priorizando fijación de N, repelencia de plagas, cobertura de suelo, y atractor de polinizadores. Para cada compañero: (a) nombre científico, (b) rol ecológico específico, (c) distancia óptima de siembra, (d) compatibilidad con mi piso térmico.

Responde SOLO en JSON válido: array de objetos con keys name, scientific_name, role, distance_m, notes.`+(h?`\n\n${h}`:``)+i).trim()}function f(e){let{speciesName:t=`cultivo`,scientificName:n,thermalZones:a=[],speciesThermalZones:s=[],altitudMsnm:c,municipio:l,humedad:d,temperatura:f,lluvia:p,sintomas:m=`[usuario describe síntomas aquí]`,fase:h,diasDesdeSiembra:g}=e,_=r(m)||`[usuario describe síntomas aquí]`,v=o(a,c),y=v.length>0?v.join(`, `):`no especificado`,b=u(v,s),x=[c?`${c} msnm`:`altitud no especificada`,l].filter(Boolean).join(`, `),S=n?`${n} (${t})`:t,C=[];d!=null&&C.push(`HR ${d}%`),f!=null&&C.push(`temperatura media ${f}°C`),p!=null&&C.push(`precipitación acumulada ${p}mm`);let w=C.length>0?C.join(`, `):`datos no disponibles`;return(`Actúa como fitopatólogo colombiano especializado en agroecología andina.

CULTIVO: ${S}, ${h||g!=null?`${h?`fase fenológica ${h}`:``}${g==null?``:`, ${g} días desde siembra`}`:`fase no especificada`}
UBICACIÓN: ${x}, piso térmico ${y}
CONDICIONES ÚLTIMOS 7 DÍAS: ${w}
SÍNTOMAS OBSERVADOS: ${_}

TAREA:
Realiza un diagnóstico diferencial priorizando causas más probables a esta altitud y condiciones. Para cada hipótesis, propón:
(a) prueba casera de confirmación
(b) biopreparado agroecológico de tratamiento (NO agroquímicos sintéticos; respetar normativa IFOAM)
(c) medida preventiva para ciclos futuros`+(b?`\n\n${b}`:``)+i).trim()}function p(e){let{speciesName:t=`especie`,scientificName:n,thermalZones:a=[],speciesThermalZones:s=[],altitudMsnm:c,municipio:l,pregunta:d=`[Escribe tu pregunta aquí]`}=e,f=r(d)||`[Escribe tu pregunta aquí]`,p=o(a,c),m=p.length>0?p.join(`, `):`no especificado`,h=u(p,s);return(`Actúa como agrónomo colombiano especializado en agroecología en piso térmico ${m}.

CONTEXTO:
- Ubicación: ${[c?`${c} msnm`:`altitud no especificada`,l].filter(Boolean).join(`, `)}
- Especie: ${n?`${n} (${t})`:t}

PREGUNTA:
${f}`+(h?`\n\n${h}`:``)+i).trim()}export{a as i,d as n,p as r,f as t};