/* eslint-disable no-undef -- arnés de gate (node), no código de la app */
// Superpone geometría clave del generador sobre el hero para leer deltas.
import sharp from 'sharp';
const HERO = 'public/compai/laminas/zariguya-gemini-hero.png';
const OUT = '/home/kortux/.claude/jobs/6b23183e/tmp';
const Z = 2;
// geometría ACTUAL del generador (mantener en sinc a mano)
const g = [];
const poly = (pts, col) => g.push(`<polygon points="${pts.map(p=>p.map(v=>v*Z).join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="1.2"/>`);
const circ = (x,y,r,col) => g.push(`<circle cx="${x*Z}" cy="${y*Z}" r="${r*Z}" fill="none" stroke="${col}" stroke-width="1.2"/>`);
const line = (pts, col) => g.push(`<polyline points="${pts.map(p=>p.map(v=>v*Z).join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="1.2"/>`);
// ojos
circ(178,82,14.5,'#f0f'); circ(244,74,16.5,'#f0f');
// nariz
poly([[236,112],[244,100],[258,96],[272,100],[280,112],[280,128],[272,142],[258,150],[246,146],[238,132],[234,120]],'#0af');
// boca: labio sup + mandibula + interior
line([[145,105],[156,102],[216,130],[243,139]],'#f00');
line([[146,107],[176,146],[220,178],[254,184],[266,168]],'#c60');
poly([[152,106],[180,120],[212,133],[238,142],[258,150],[264,166],[252,180],[228,182],[202,172],[178,154],[160,132],[150,116]],'#f80');
// orejas
poly([[100,66],[96,40],[104,18],[122,8],[142,10],[158,24],[164,44],[158,62],[140,72],[118,74]],'#0f0');
poly([[220,46],[218,28],[228,12],[244,6],[258,10],[266,24],[266,40],[256,52],[240,54],[228,52]],'#0f0');
// parches
poly([[142,76],[158,62],[178,60],[196,70],[200,84],[192,98],[172,104],[152,98],[142,88]],'#ff0');
poly([[218,62],[238,52],[258,54],[270,66],[270,82],[258,94],[238,96],[222,86],[216,74]],'#ff0');
// coronilla + franja
poly([[152,40],[176,22],[202,14],[228,16],[248,28],[252,46],[238,60],[210,66],[180,64],[158,54]],'#0ff');
poly([[194,18],[212,18],[216,60],[210,88],[200,96],[192,88],[186,60]],'#93f');
// lapiz eje, puño, brujula
line([[8,188],[82,131]],'#00f'); circ(120,261,24.5,'#00f'); circ(94,247,5,'#00f');
poly([[46,128],[80,112],[116,110],[142,122],[152,146],[150,178],[138,206],[116,226],[88,232],[62,222],[46,198],[40,164]],'#a0f');
poly([[128,238],[158,232],[184,238],[196,256],[194,280],[178,298],[154,304],[134,296],[122,276],[120,256]],'#a0f');
// cola eje
line([[386,348],[412,362],[438,362],[458,344],[470,314],[473,284],[466,260],[450,245],[430,240],[412,246],[400,256],[394,262]],'#f0f');
// pecho/panza
poly([[178,160],[200,150],[222,152],[240,168],[252,196],[258,232],[258,268],[248,300],[232,316],[214,316],[200,300],[190,268],[182,232],[176,196]],'#3c3');
poly([[236,250],[270,240],[300,250],[318,276],[326,308],[318,340],[296,362],[268,368],[244,356],[228,330],[222,296],[226,268]],'#3c3');
// pies dedos (ejes)
line([[206,372],[150,374]],'#f66'); line([[206,380],[148,384]],'#f66'); line([[298,398],[272,428]],'#f66'); line([[330,400],[340,424]],'#f66');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${481*Z}" height="${444*Z}">${g.join('')}</svg>`;
await sharp(HERO).resize(481*Z,444*Z,{kernel:'nearest'}).flatten({background:'#f5f0e6'})
  .composite([{input:Buffer.from(svg)}]).png().toFile(`${OUT}/calibracion.png`);
console.log('calibracion.png OK');
