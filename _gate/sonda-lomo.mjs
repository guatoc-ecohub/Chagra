import sharp from 'sharp';
const pngPath = process.argv[2];
const YMIN = parseInt(process.argv[3] || '150');
const { data, info } = await sharp(pngPath).raw().toBuffer({ resolveWithObject: true });
const W = info.width, CH = info.channels;
const BGS = [[0xef,0xe7,0xd4],[0xf7,0xf1,0xe2]]; const TOL = 14;
const isBg = (x,y) => { const i=(y*W+x)*CH, r=data[i],g=data[i+1],b=data[i+2];
  return BGS.some(([a,b2,c]) => Math.abs(r-a)<=TOL && Math.abs(g-b2)<=TOL && Math.abs(b-c)<=TOL); };
const topArt = (x) => { for (let y=YMIN;y<info.height-3;y++) if (!isBg(x,y)&&!isBg(x,y+1)&&!isBg(x,y+2)) return y; return -1; };
let prev = null; const pasos = [];
const perfil = [];
for (let x=180; x<=430; x++) { const y = topArt(x); perfil.push([x,y]);
  if (y>=0 && prev!==null && prev[1]>=0 && x-prev[0]===1) { const d=y-prev[1]; if (Math.abs(d)>=4) pasos.push(`x=${x} dy=${d} (${prev[1]}->${y})`); }
  if (y>=0) prev=[x,y]; }
console.log(perfil.map(([x,y])=>`${x}:${y}`).join(' '));
console.log('PASOS(>=4px):'); console.log(pasos.length?pasos.join('\n'):'ninguno');
