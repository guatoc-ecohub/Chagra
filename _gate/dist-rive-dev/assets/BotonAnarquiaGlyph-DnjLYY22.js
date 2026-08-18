import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{zi as t}from"./vendor-icons-DMS4KM1u.js";import{t as n}from"./vendor-react-BPzue65w.js";import"./apiService-DAFkzv5t.js";import{d as r}from"./sidecarClient-DyOyQqIK.js";import{r as i,t as a}from"./dbCore-UdodrkfO.js";import{t as o}from"./agentCapabilities-CDldYoER.js";var s=[`text`,`voice`,`photo`,`attachment`];function c(e){return new Promise((t,n)=>{e.onsuccess=()=>t(e.result),e.onerror=()=>n(e.error)})}function l(e){return new Promise((t,n)=>{e.oncomplete=()=>t(),e.onerror=()=>n(e.error),e.onabort=()=>n(e.error||Error(`tx abortada`))})}async function u(e={}){let{kind:t,text:n=``,blob:r=null,mime:o=null,fileName:u=null,meta:d={}}=e;if(!s.includes(t))throw Error(`[agentOutbox] kind inválido: ${t} (debe ser ${s.join(` | `)})`);let f=typeof n==`string`&&n.trim().length>0,p=r&&typeof r==`object`;if(!f&&!p)throw Error(`[agentOutbox] enqueue requiere texto o blob (no se persiste un item vacío)`);let m=await i(),h={kind:t,text:typeof n==`string`?n:``,blob:p?r:null,mime:o||p&&r.type||null,fileName:u||null,meta:d||{},status:`queued`,createdAt:typeof d?.createdAt==`number`?d.createdAt:Date.now(),claimedAt:null,answeredAt:null,error:null},g=m.transaction(a.AGENT_OUTBOX,`readwrite`),_=await c(g.objectStore(a.AGENT_OUTBOX).add(h));return await l(g),_}async function d(){try{let e=await c((await i()).transaction(a.AGENT_OUTBOX,`readonly`).objectStore(a.AGENT_OUTBOX).getAll());return(Array.isArray(e)?e:[]).sort((e,t)=>(e.createdAt||0)-(t.createdAt||0))}catch(e){return console.debug(`[agentOutbox] getAll error:`,e),[]}}async function f(){return(await d()).filter(e=>e.status===`queued`||e.status===`processing`)}async function p(){try{let e=(await i()).transaction(a.AGENT_OUTBOX,`readwrite`),t=e.objectStore(a.AGENT_OUTBOX),n=await c(t.getAll()),r=(Array.isArray(n)?n:[]).filter(e=>e.status===`queued`).sort((e,t)=>(e.createdAt||0)-(t.createdAt||0));if(r.length===0)return null;let o={...r[0],status:`processing`,claimedAt:Date.now()};return await c(t.put(o)),await l(e),o}catch(e){return console.debug(`[agentOutbox] claimNext error:`,e),null}}async function m(e,t){try{let n=(await i()).transaction(a.AGENT_OUTBOX,`readwrite`),r=n.objectStore(a.AGENT_OUTBOX),o=await c(r.get(e));if(!o)return null;let s={...o,...t};return await c(r.put(s)),await l(n),s}catch(e){return console.debug(`[agentOutbox] patchItem error:`,e),null}}async function h(e,{answeredText:t=null}={}){return m(e,{status:`answered`,answeredAt:Date.now(),error:null,...t==null?{}:{answeredText:t}})}async function g(e,t){return m(e,{status:`error`,error:t||`fallo desconocido`})}async function _(){try{let e=(await i()).transaction(a.AGENT_OUTBOX,`readwrite`),t=e.objectStore(a.AGENT_OUTBOX),n=await c(t.getAll()),r=(Array.isArray(n)?n:[]).filter(e=>e.status===`processing`);for(let e of r)await c(t.put({...e,status:`queued`,claimedAt:null}));return await l(e),r.length}catch(e){return console.debug(`[agentOutbox] recoverStaleProcessing error:`,e),0}}var v=/\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?)$/i;function y(e){if(!e||typeof e!=`object`)return!1;let t=(e.mime||``).toString().toLowerCase().trim();if(t.startsWith(`image/`))return!0;if(!t||t===`application/octet-stream`){let t=(e.fileName||``).toString();return v.test(t)}return!1}function ee(e){let t=e&&e.fileName?String(e.fileName).trim():``;return`Solo puedo analizar fotos de plantas o cultivos, no ${(e&&e.mime?String(e.mime).toLowerCase():``).includes(`pdf`)||/\.pdf$/i.test(t)?`documentos PDF ni hojas de vida`:`documentos ni archivos`} 😅. Mándame una foto de tu planta y te ayudo.`}var b=e(t(),1),x=new Set(`get_species.get_companions.get_biopreparados.get_pest_controllers.get_multihop_companions.get_subgrafo_relacional.get_diseno_restauracion.get_diseno_silvopastoril.validate_visual_match.validate_taxonomy.get_normativa_ica.get_clima_ideam.get_precio_sipsa.get_enso_status.get_alertas_clima_zona.get_saberes.get_toxicidad.get_variedades.get_suelo.get_calendario_siembra.get_associations.get_fenologia.get_polinizacion.get_invasoras_alternativas.get_saberes_tradicionales.get_variedades_cultivo.get_psa_elegibilidad.get_alerta_carbono.get_alerta_normativa_paramo.get_alerta_clima_consejo`.split(`.`));function S(e,t={}){let{manifest:n=[],isSidecarEnabled:r=!1,sidecarToolNames:i=x}=t,a=i instanceof Set?i:new Set(i),o=Array.isArray(n)?n.find(t=>t.id===e):null;return o?o.status===`soon`?`soon`:o.tool&&a.has(o.tool)&&!r?`down`:`live`:`live`}var C=(e,t,n)=>Math.max(t,Math.min(n,e));function te(e,t,n,r={}){let i=r.ky??1,a=r.fixed||[],o=r.fixedD??t;for(let r=0;r<48;r++){let r=!1;for(let n=0;n<e.length;n++){for(let a=n+1;a<e.length;a++){let o=e[a].x-e[n].x,s=e[a].y-e[n].y,c=Math.hypot(o,s*i);if(c<t){r=!0,c<1&&(o=1,s=0,c=1);let i=(t-c)/2/c;e[n].x-=o*i,e[n].y-=s*i,e[a].x+=o*i,e[a].y+=s*i}}for(let t=0;t<a.length;t++){let s=a[t].d??o,c=e[n].x-a[t].x,l=e[n].y-a[t].y,u=Math.hypot(c,l*i);if(u<s){r=!0,u<1&&(c=1,l=0,u=1);let t=(s-u)/u;e[n].x+=c*t,e[n].y+=l*t}}}if(e.forEach(e=>{e.x=C(e.x,n.x0,n.x1),e.y=C(e.y,n.y0,n.y1)}),!r)break}}function w(e,t,n,r={}){let i=r.fixed||[],a=r.pad??6;for(let r=0;r<96;r++){let r=!1;for(let o=0;o<e.length;o++){for(let n=o+1;n<e.length;n++){let i=e[n].x-e[o].x,s=e[n].y+t[n].oy-(e[o].y+t[o].oy),c=t[o].hw+t[n].hw+a-Math.abs(i),l=t[o].hh+t[n].hh+a-Math.abs(s);if(c>0&&l>0)if(r=!0,c<l){let t=(i>=0?1:-1)*c/2;e[o].x-=t,e[n].x+=t}else{let t=(s>=0?1:-1)*l/2;e[o].y-=t,e[n].y+=t}}for(let s=0;s<i.length;s++){let c=e[o].x-i[s].x,l=e[o].y+t[o].oy-i[s].y,u=t[o].hw+i[s].hw+a-Math.abs(c),d=t[o].hh+i[s].hh+a-Math.abs(l);if(u>0&&d>0){r=!0;let t=(c>=0?1:-1)*u,i=(l>=0?1:-1)*d,a=e[o].x+t>=n.x0&&e[o].x+t<=n.x1,s=e[o].y+i>=n.y0&&e[o].y+i<=n.y1;u<d&&a||!s?e[o].x=C(e[o].x+t,n.x0,n.x1):e[o].y+=i}}}if(e.forEach(e=>{e.x=C(e.x,n.x0,n.x1),e.y=C(e.y,n.y0,n.y1)}),!r)break}}function T(e,t,n=!1){let r=e?e.offsetWidth:0,i=e?e.offsetHeight:0;if(!r&&e&&e.closest){let t=e.closest(`.arm-node`);t&&t.style.display===`none`&&(t.style.display=``,r=e.offsetWidth,i=e.offsetHeight,t.style.display=`none`)}if(!r){let t=(e&&e.textContent||``).trim(),a=Math.round(t.length*7.4)+18;r=C(a,58,128),i=(a>128?42:26)+(n?20:0)}let a=-t-2,o=t+4+i;return{hw:Math.max(t+1,r/2),hh:(o-a)/2,oy:(a+o)/2}}function ne(e,t,n={}){let r=n.pad??8,i=n.jitter??0,a=n.rand||(()=>.5),o=t.x1-t.x0,s=[],c=[],l=0;e.forEach((e,t)=>{let n=e.hw*2+r;c.length&&l+n>o&&(s.push(c),c=[],l=0),c.push(t),l+=n}),c.length&&s.push(c);let u=s.map(t=>Math.max(...t.map(t=>e[t].hh*2))),d=u.reduce((e,t)=>e+t,0)+r*(s.length-1),f=Math.max(0,(t.y1-t.y0-d)/(s.length+1)),p=Array(e.length),m=t.y0+f;return s.forEach((n,s)=>{let c=s%2?[...n].reverse():n,l=n.reduce((t,n)=>t+e[n].hw*2,0),d=Math.max(0,(o-l-r*(n.length-1))/(n.length+1)),h=t.x0+d;c.forEach(t=>{let n=e[t];p[t]={x:h+n.hw+(a(t)-.5)*i,y:m+n.hh-n.oy+(a(t+50)-.5)*i*.6},h+=n.hw*2+r+d}),m+=u[s]+r+f}),p}function re(e,t,n,r,i=6){let a=Array(t),o=t>1?(r-n)/(t-1):0;for(let r=0;r<t;r++){let s=t-1-r,c=s+2,l=n+r*o;if(c<t&&a[c]!=null){let t=e[c].hh+e[s].hh+i+(e[c].oy-e[s].oy);l=Math.max(l,a[c]+t)}a[s]=l}let s=a[0]??n;if(s>r&&s>n){let e=(r-n)/(s-n);for(let r=0;r<t;r++)a[r]=n+(a[r]-n)*e}return a}function E(e,t,n){let{a0:r,a1:i,rx:a,ry:o,pad:s=8}=n,c=(a+o)/2,l=t.map(e=>{let t=Math.hypot(e.hw,e.hh)+s;return 2*Math.asin(Math.min(.95,t/Math.max(1,c)))}),u=l.reduce((e,t)=>e+t,0),d=i-r,f=u>0?Math.min(1.25,d/u):1,p=r+Math.max(0,(d-u*f)/2);return t.map((t,n)=>{let r=p+l[n]*f/2;return p+=l[n]*f,{x:e.x+Math.cos(r)*a,y:e.y+Math.sin(r)*o}})}function ie(e,t,n=[],r=0){let i=(e,t)=>({x0:e.x-t.hw,x1:e.x+t.hw,y0:e.y+t.oy-t.hh,y1:e.y+t.oy+t.hh}),a=(e,t)=>Math.min(e.x1,t.x1)-Math.max(e.x0,t.x0)>r&&Math.min(e.y1,t.y1)-Math.max(e.y0,t.y0)>r,o=e.map((e,n)=>i(e,t[n]));for(let e=0;e<o.length;e++){for(let t=e+1;t<o.length;t++)if(a(o[e],o[t]))return!0;for(let t=0;t<n.length;t++){let r={x0:n[t].x-n[t].hw,x1:n[t].x+n[t].hw,y0:n[t].y-n[t].hh,y1:n[t].y+n[t].hh};if(a(o[e],r))return!0}}return!1}function ae(e,t,n){let{a0:r,a1:i,rx:a,ry:o,bd:s,hard:c=[],soft:l=[],pad:u=6}=n,d=null,f=1,p=1;for(let n=0;n<4;n++){let m=n===0?[...c,...l]:c;if(d=E(e,t,{a0:r,a1:i,rx:a*f,ry:o*p,pad:8}),w(d,t,s,{pad:u,fixed:m}),!ie(d,t,c,2))return d;f*=1.18,p*=1.12}return d}function oe(e,t,n){let r=n.x-e.x,i=n.y-e.y,a=Math.hypot(r,i);if(a<1e-6)return{x:e.x,y:e.y};let o=Math.min(t,a)/a;return{x:e.x+r*o,y:e.y+i*o}}var D=e(n(),1),O=Object.freeze({cultivo:{icon:`🌱`,label:`Mis cultivos`},cuidar:{icon:`🐛`,label:`Cuidar y prevenir`},observar:{icon:`👁️`,label:`Mirar la finca`},restaurar:{icon:`🌳`,label:`Restaurar y conservar`},registrar:{icon:`📝`,label:`Guardar lo que hago`},planear:{icon:`📅`,label:`Planear`},aprender:{icon:`📚`,label:`Aprender`},vender:{icon:`💰`,label:`Vender mejor`}}),k=Object.freeze([`cultivo`,`cuidar`,`observar`,`restaurar`,`registrar`,`planear`,`aprender`,`vender`]),A=o.filter(e=>e.hero===!0&&e.featured===!0),j=new Set(A.map(e=>e.id)),M=k.map(e=>({key:e,icon:O[e].icon,label:O[e].label,leaves:o.filter(t=>t.hero===!0&&t.group===e&&!j.has(t.id))})).filter(e=>e.leaves.length>0),N=[...A.map(e=>({kind:`cap`,key:e.id,icon:e.icon,label:e.label,cap:e,leaves:[]})),...M.map(e=>({kind:`group`,key:e.key,icon:e.icon,label:e.label,leaves:e.leaves}))],P=`http://www.w3.org/2000/svg`,F=e=>Math.round(e*10)/10,se=(e,t,n)=>Math.max(t,Math.min(n,e)),I=e=>1-(1-e)**3;function L(e){let t=Math.sin(e*127.1+311.7)*43758.5453;return t-Math.floor(t)}function R(e,t){let n=document.createElementNS(P,`path`);return t&&n.setAttribute(`class`,t),e.appendChild(n),n}function z(e,t,n){let r=t.x-e.x,i=t.y-e.y,a=Math.hypot(r,i)||1,o=-i/a,s=r/a,c=n%2?1:-1,l=c*(.12+L(n)*.1),u=-c*(.07+L(n+9)*.08),d={x:e.x+r*.3+o*a*l,y:e.y+i*.3+s*a*l},f={x:e.x+r*.72+o*a*u,y:e.y+i*.72+s*a*u};return{d:`M${F(e.x)} ${F(e.y)} C${F(d.x)} ${F(d.y)} ${F(f.x)} ${F(f.y)} ${F(t.x)} ${F(t.y)}`,p0:e,c1:d,c2:f,p1:t}}function ce(e,t,n,r){return{d:`M${F(e.x)} ${F(e.y)} C${F(t.x)} ${F(t.y)} ${F(n.x)} ${F(n.y)} ${F(r.x)} ${F(r.y)}`,p0:e,c1:t,c2:n,p1:r}}function le(e,t){let n=1-t;return{x:n*n*n*e.p0.x+3*n*n*t*e.c1.x+3*n*t*t*e.c2.x+t*t*t*e.p1.x,y:n*n*n*e.p0.y+3*n*n*t*e.c1.y+3*n*t*t*e.c2.y+t*t*t*e.p1.y}}function B(e,t,n){e.setAttribute(`stroke-dasharray`,t),e.setAttribute(`stroke-dashoffset`,t*(1-n))}function V(e){e.removeAttribute(`stroke-dasharray`),e.removeAttribute(`stroke-dashoffset`)}var H=Array.from({length:16},(e,t)=>({lx:`${(6+L(t+3)*88).toFixed(1)}%`,dur:`${(7+L(t+9)*7).toFixed(1)}s`,del:`${(-L(t+17)*12).toFixed(1)}s`,dx:`${((L(t+5)-.5)*70).toFixed(0)}px`,rise:`${(180+L(t+7)*280).toFixed(0)}px`}));function U(){let e=document.documentElement.getAttribute(`data-theme`);return e===`nature`?`nature`:e===`minimalista`?`min`:`biopunk`}function W(e,t){(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),t())}function G(e){e.classList.remove(`arm-tap`),e.offsetWidth,e.classList.add(`arm-tap`)}var K=`
/* SIN MARCO (operador 2026-06-09): nada de caja con borde/radius/fondo —
   la red respira full-bleed sobre el lienzo del AgentHero; el padre da el
   alto. Solo overflow:hidden para que esporas/ramas no se salgan. */
.arm-root{
  position:relative;width:100%;height:100%;min-height:380px;
  /* overflow VISIBLE (2026-06-10): los trazos bajan hasta el botón Ⓐ real
     (vive en el compositor, fuera de este lienzo) — la unión raíz↔red es un
     solo trazo continuo, sin el corte que daba el clip del borde inferior. */
  overflow:visible;background:transparent;
  -webkit-tap-highlight-color:transparent;
  /* ---- tema biopunk (base) ---- */
  --fam:ui-monospace,'Cascadia Mono',Menlo,Consolas,monospace;
  --lblSize:13px; --lblSp:.01em; --lblW:800;
  --lblC:#ffffff; --lblBg:rgba(4,14,11,.97); --lblEdge:rgba(25,199,154,.6);
  --lblShadow:0 2px 10px rgba(0,0,0,.65);
  --branch:#19c79a; --coreW:3px;
  --glowC:rgba(25,199,154,.48); --glowW:13px; --glowO:1; --glowBlur:4px;
  --twigC:rgba(25,199,154,.75);
  --orbBg:radial-gradient(circle at 32% 28%,#15222e,#0b121b 72%);
  --ringGroup:rgba(25,199,154,.85); --ringLeaf:rgba(25,199,154,.6); --ringW:2px;
  --orbShadow:0 0 22px rgba(25,199,154,.32),0 0 6px rgba(25,199,154,.5),inset 0 0 16px rgba(25,199,154,.10);
  --orbRadA:50%; --orbRadB:50%;
  --pulse:rgba(25,199,154,.55);
  --spore:#19c79a; --spO:.7;
  --crumbBg:rgba(25,199,154,.16); --crumbC:#c8f3e2; --crumbEdge:rgba(25,199,154,.45);
  --toastBg:#0e1a18; --toastC:#d8f7e9; --toastEdge:rgba(25,199,154,.45);
  --hintC:rgba(190,240,220,.85);
  --trunkC:#19c79a; --trunkHi:#7defc9;
}
/* ---- tema nature (árbol real) ---- */
.arm-root[data-armtheme="nature"]{
  --fam:'Iowan Old Style','Palatino Linotype','Book Antiqua',Palatino,Georgia,serif;
  --lblSize:13.5px; --lblSp:0; --lblW:700;
  --lblC:#2e2414; --lblBg:rgba(255,250,238,.98); --lblEdge:rgba(121,87,53,.55);
  --lblShadow:0 2px 8px rgba(90,60,30,.3);
  --branch:#6e4f2e; --coreW:4.6px;
  --glowC:rgba(121,87,53,.32); --glowW:12px; --glowO:1; --glowBlur:1.5px;
  --twigC:rgba(110,79,46,.75);
  --orbBg:radial-gradient(circle at 35% 30%,#fffdf4,#efe3c6 78%);
  --ringGroup:rgba(110,79,46,.85); --ringLeaf:rgba(95,124,66,.95); --ringW:2.5px;
  --orbShadow:0 4px 14px rgba(90,60,30,.25),inset 0 1px 0 #fff;
  --orbRadA:58% 42% 55% 45% / 45% 58% 42% 55%;
  --orbRadB:44% 56% 48% 52% / 56% 44% 58% 42%;
  --pulse:rgba(95,124,66,.5);
  --spore:#7c9a4e; --spO:.6;
  --crumbBg:rgba(255,250,238,.9); --crumbC:#4a3a1f; --crumbEdge:rgba(121,87,53,.45);
  --toastBg:#fffaf0; --toastC:#3c2f18; --toastEdge:rgba(121,87,53,.4);
  --hintC:rgba(74,58,31,.8);
  --trunkC:#6e4f2e; --trunkHi:#a37c4f;
}
/* ---- tema minimalista ---- */
.arm-root[data-armtheme="min"]{
  --fam:Futura,'Avenir Next','Century Gothic','Trebuchet MS',Verdana,sans-serif;
  --lblSize:12.5px; --lblSp:.02em; --lblW:700;
  --lblC:#143d31; --lblBg:#ffffff; --lblEdge:rgba(47,110,90,.4);
  --lblShadow:0 1px 5px rgba(30,40,35,.16);
  --branch:#2f6e5a; --coreW:2.1px;
  --glowC:transparent; --glowW:0px; --glowO:0; --glowBlur:0px;
  --twigC:rgba(47,110,90,.6);
  --orbBg:#ffffff;
  --ringGroup:rgba(47,110,90,.6); --ringLeaf:rgba(47,110,90,.45); --ringW:1.5px;
  --orbShadow:0 2px 6px rgba(30,40,35,.1);
  --orbRadA:50%; --orbRadB:50%;
  --pulse:transparent;
  --spore:transparent; --spO:0;
  --crumbBg:#ffffff; --crumbC:#1f5847; --crumbEdge:rgba(47,110,90,.35);
  --toastBg:#ffffff; --toastC:#1f5847; --toastEdge:rgba(47,110,90,.3);
  --hintC:rgba(31,88,71,.7);
  --trunkC:#2f6e5a; --trunkHi:#5ea58d;
}
.arm-root.arm-disabled{pointer-events:none;opacity:.55}
/* La textura de ruido del demo se quitó en la integración: sobre el lienzo
   transparente del hero dibujaba un rectángulo "sucio" (el marco que el
   operador rechazó). El grano ambiente lo pone la escena del hero. */
.arm-web{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}
.arm-gtrunk path{fill:none;stroke-linecap:round;transition:stroke .5s}
.arm-gtrunk .tkB{stroke:var(--trunkC);stroke-width:17px}
.arm-gtrunk .tkO{stroke:var(--trunkC);stroke-width:10px}
.arm-gtrunk .tkI{stroke:var(--trunkHi);stroke-width:3.5px;opacity:.8}
/* vena Ⓐ→tronco (nature): raíz superficial que conecta el botón del agente
   con la base del tronco centrado — un solo organismo, no dos piezas.
   El stroke se pinta con gradiente userSpaceOnUse (savia ocre del botón →
   madera del tronco) puesto inline desde layout(): cero salto de color. */
.arm-gtrunk .vnO{stroke:var(--trunkC);stroke-width:13px;opacity:1}
.arm-gtrunk .vnI{stroke:var(--trunkHi);stroke-width:3.4px;opacity:.8}
.arm-gglow{opacity:var(--glowO);filter:blur(var(--glowBlur));animation:armBreathe 4.5s ease-in-out infinite}
.arm-gglow path{stroke:var(--glowC);stroke-width:var(--glowW);fill:none;stroke-linecap:round;transition:stroke .5s}
.arm-gcore path{stroke:var(--branch);stroke-width:var(--coreW);fill:none;stroke-linecap:round;transition:stroke .5s}
.arm-gcore path.lf{stroke-width:calc(var(--coreW)*.78)}
/* (.arm-gtwig + raicillas .rt + arco de suelo .gd ELIMINADOS 2026-06-20:
   decoración sin nodo destino que moría en el vacío). */
@keyframes armBreathe{0%,100%{opacity:var(--glowO)}50%{opacity:calc(var(--glowO)*.55)}}
.arm-spores{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
.arm-sp{position:absolute;left:var(--lx);bottom:30px;width:3px;height:3px;border-radius:50%;
  background:var(--spore);box-shadow:0 0 7px var(--spore);opacity:0;
  animation:armRise var(--dur) linear infinite;animation-delay:var(--del)}
@keyframes armRise{
  0%{transform:none;opacity:0}
  12%{opacity:var(--spO)}
  82%{opacity:calc(var(--spO)*.3)}
  100%{transform:translate(var(--dx),calc(-1*var(--rise)));opacity:0}
}
/* en nature las esporas son hojitas que CAEN */
.arm-root[data-armtheme="nature"] .arm-sp{
  bottom:auto;top:-16px;width:7px;height:5px;border-radius:60% 40% 60% 40%;
  box-shadow:none;animation-name:armFall;
}
@keyframes armFall{
  0%{transform:none;opacity:0}
  10%{opacity:var(--spO)}
  85%{opacity:calc(var(--spO)*.4)}
  100%{transform:translate(var(--dx),var(--rise)) rotate(320deg);opacity:0}
}
.arm-nodes{position:absolute;inset:0;z-index:3;pointer-events:none}
.arm-node{
  position:absolute;left:0;top:0;width:72px;height:72px;margin:-36px 0 0 -36px;
  pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent;
  touch-action:manipulation;will-change:transform,opacity;z-index:3;
}
.arm-node::before{content:"";position:absolute;inset:-10px} /* target de toque >= 92px */
.arm-node.arm-leaf{width:66px;height:66px;margin:-33px 0 0 -33px;z-index:5}
/* (el nodo raíz Ⓐ propio del menú se ELIMINÓ — operador 2026-06-10: una sola
   Ⓐ, la del botón del agente en el compositor; la red nace de ese ancla) */
.arm-orb{
  position:absolute;inset:0;display:grid;place-items:center;
  background:var(--orbBg);border:var(--ringW) solid var(--ringGroup);
  border-radius:var(--orbRadA);box-shadow:var(--orbShadow);
  transition:background .5s,border-color .5s,box-shadow .5s,border-radius .5s;
  will-change:transform;
}
.arm-node:nth-child(even) .arm-orb{border-radius:var(--orbRadB)}
.arm-node.arm-leaf .arm-orb{border-color:var(--ringLeaf)}
/* destacadas (2026-06-28): acción directa en el anillo principal — anillo de
   hoja (no de grupo) y SIN el latido expansible del grupo, para que se lean como
   "toque y listo", no como "abra para ver más". */
.arm-node.arm-feat .arm-orb{border-color:var(--ringLeaf)}
.arm-node.arm-group .arm-orb::after{
  content:"";position:absolute;inset:-5px;border-radius:inherit;
  border:1px solid var(--pulse);animation:armPing 3.4s ease-out infinite;
  animation-delay:var(--pd,0s);
}
@keyframes armPing{0%{transform:scale(.88);opacity:.8}70%,100%{transform:scale(1.4);opacity:0}}
.arm-ic{display:block;font-size:35px;font-style:normal;
  animation:armSway var(--swD,5s) ease-in-out var(--swDel,0s) infinite alternate}
.arm-node.arm-leaf .arm-ic{font-size:31px}
@keyframes armSway{from{transform:translateY(-1.4px) rotate(-2.4deg)}to{transform:translateY(1.4px) rotate(2.4deg)}}
.arm-node.arm-tap .arm-ic{animation:armTapB .45s cubic-bezier(.34,1.6,.5,1)}
@keyframes armTapB{0%{transform:scale(1)}40%{transform:scale(1.3)}100%{transform:scale(1)}}
.arm-lbl{
  position:absolute;top:calc(100% + 4px);left:50%;transform:translateX(-50%);
  max-width:128px;min-width:58px;width:max-content;text-align:center;pointer-events:none;
  font-family:var(--fam);font-size:var(--lblSize);font-weight:var(--lblW);line-height:1.22;
  letter-spacing:var(--lblSp);
  /* la etiqueta SIEMPRE envuelve (no se corta contra el borde): palabras
     largas rompen y el texto fluye a varias líneas dentro de max-width. */
  white-space:normal;overflow-wrap:break-word;word-break:break-word;hyphens:auto;
  color:var(--lblC);background:var(--lblBg);border:1px solid var(--lblEdge);
  border-radius:10px;padding:4px 8px;box-shadow:var(--lblShadow);
  transition:color .5s,background .5s;
}
.arm-badge{display:inline-block;margin-top:3px;font-size:9px;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;border:1px solid currentColor;border-radius:99px;
  padding:2px 7px;opacity:.9}
.arm-node.arm-soon{cursor:default}
.arm-node.arm-soon .arm-orb{border-style:dashed}
.arm-node.arm-down{cursor:default}
.arm-node.arm-down .arm-orb{border-style:dashed;opacity:.55}
.arm-node.arm-down .arm-lbl{opacity:.6}
.arm-badge-down{color:var(--warnC, #f59e0b);border-color:var(--warnC, #f59e0b40)}
/* pista de uso — abajo-derecha: la esquina libre con la red brotando del
   botón Ⓐ (abajo-izquierda) hacia arriba-derecha. */
.arm-hint{position:absolute;right:14px;bottom:10px;z-index:2;
  font-family:var(--fam);font-size:13.5px;font-weight:700;letter-spacing:.04em;color:var(--hintC);
  pointer-events:none;transition:opacity .6s;white-space:nowrap}
.arm-hint.off{opacity:0}
.arm-crumb{
  position:absolute;left:10px;top:10px;z-index:7;display:flex;align-items:center;gap:6px;
  font-family:var(--fam);font-size:14px;font-weight:700;letter-spacing:var(--lblSp);
  color:var(--crumbC);background:var(--crumbBg);border:1.5px solid var(--crumbEdge);
  border-radius:99px;padding:10px 16px 10px 12px;cursor:pointer;min-height:42px;
  transition:.3s;
}
.arm-toast{
  position:absolute;left:50%;bottom:14px;transform:translateX(-50%) translateY(16px);z-index:9;
  background:var(--toastBg);color:var(--toastC);border:1.5px solid var(--toastEdge);
  border-radius:99px;padding:11px 18px;font-family:var(--fam);font-size:14px;font-weight:700;
  letter-spacing:.02em;opacity:0;pointer-events:none;white-space:nowrap;
  transition:opacity .3s,transform .3s;box-shadow:0 6px 20px rgba(0,0,0,.25);
}
.arm-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media (prefers-reduced-motion: reduce){
  .arm-root *,.arm-root *::before,.arm-root *::after{animation:none !important;transition:none !important}
  /* glow apagado en reduced-motion; la CONTINUIDAD raíz↔red la garantiza el
     trazo core (que nace dentro del disco del botón Ⓐ), no el glow. */
  .arm-gglow{display:none}
}
`;function q({onPick:e,disabled:t=!1,anchorRef:n=null}){let i=(0,b.useRef)(null),a=(0,b.useRef)(null),s=(0,b.useRef)(null),[c,l]=(0,b.useState)(U),[u,d]=(0,b.useState)(null),[f,p]=(0,b.useState)(null);(0,b.useEffect)(()=>{let e=new MutationObserver(()=>l(U()));return e.observe(document.documentElement,{attributes:!0,attributeFilter:[`data-theme`]}),()=>e.disconnect()},[]),(0,b.useEffect)(()=>()=>clearTimeout(s.current),[]);let m=c===`nature`,h=(0,b.useMemo)(()=>{try{let e=r();return new Map(o.map(t=>[t.id,S(t.id,{manifest:o,isSidecarEnabled:e,sidecarToolNames:x})]))}catch{return new Map(o.map(e=>[e.id,`live`]))}},[]);(0,b.useEffect)(()=>{let e=i.current;if(!e)return;let t=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,r=e.querySelector(`[data-arm="web"]`),o=e.querySelector(`[data-arm="gTrunk"]`),s=e.querySelector(`[data-arm="gGlow"]`),c=e.querySelector(`[data-arm="gCore"]`),l=e.querySelector(`[data-arm="tkB"]`),u=e.querySelector(`[data-arm="tkO"]`),f=e.querySelector(`[data-arm="tkI"]`),p=e.querySelector(`[data-arm="vnO"]`),g=e.querySelector(`[data-arm="vnI"]`),_=e.querySelector(`[data-arm="hint"]`),v=N.map((t,n)=>{let r=e.querySelector(`[data-arm-group="${n}"]`);return{i:n,el:r,orb:r.querySelector(`.arm-orb`),lblEl:r.querySelector(`.arm-lbl`),pGlow:R(s,``),pCore:R(c,``),x:0,y:0,scl:0,alp:0,vis:0,visT:0,lbl:0,leafTimers:[],growTimer:null,leafAbsR:[],leafOffR:[],leafAbsT:[],leafOffT:[],leaves:t.leaves.map((t,r)=>{let i=e.querySelector(`[data-arm-leaf="${n}-${r}"]`),a=h.get(t.id)||`live`;return{el:i,orb:i.querySelector(`.arm-orb`),lblEl:i.querySelector(`.arm-lbl`),soon:a===`soon`,down:a===`down`,pGlow:R(s,`lf`),pCore:R(c,`lf`),grow:0,growT:0}})}}),y=v.length,ee=Math.max(1,y-1),b=0,x=0,S=0,C={x:0,y:0},w={x:0,y:0},E=23,ie=[],D=[],O=null,k=1,A=1,j=[],M=[],P=[],H=0,U=0,W=null,G=null,K=0,q=0,ue=!1;function de(){if(b=e.clientWidth,x=e.clientHeight,!b||!x)return;S=b/2;let t=n&&n.current,i=e.getBoundingClientRect();if(t&&i.width>0){let e=t.getBoundingClientRect();C={x:e.left+e.width/2-i.left,y:e.top+e.height/2-i.top},E=Math.max(16,Math.min(e.width,e.height)/2)}else C={x:46,y:x+58},E=23;r.setAttribute(`viewBox`,`0 0 ${b} ${x}`),r.style.overflow=`visible`;let a=e.querySelector(`[data-arm="underGrad"]`),o=e.querySelector(`[data-arm="underMaskRect"]`),s=e.querySelector(`[data-arm="underMask"]`);if(a&&o&&s){a.setAttribute(`x1`,`0`),a.setAttribute(`y1`,F(x)),a.setAttribute(`x2`,`0`),a.setAttribute(`y2`,F(Math.max(x+24,C.y)));let e=Math.max(x,C.y)+E+120;for(let t of[s,o])t.setAttribute(`x`,F(-60)),t.setAttribute(`y`,F(-60)),t.setAttribute(`width`,F(b+120)),t.setAttribute(`height`,F(e))}let c=-1.45,d=v.map(e=>T(e.lblEl,36));ie=ne(d,{x0:10,x1:b-10,y0:44,y1:x-58},{pad:9,jitter:8,rand:L}),D=v.map((e,t)=>{let n=c+(-.3-c)*t/ee,r=t%2?152:110;return{x:C.x+Math.cos(n)*r,y:C.y+Math.sin(n)*r*.9}}),te(D,54,{x0:38,x1:b-44,y0:Math.max(96,x-290),y1:x-28},{ky:.82}),w={x:se(C.x+Math.min(132,b*.3),96,Math.max(98,b-150)),y:Math.max(150,x*.52)};let m=Math.max(96,Math.min(152,b-w.x-62)),h=Math.max(72,Math.min(176,w.y-100,x-w.y-96)),_=D.map(e=>({x:e.x,y:e.y,hw:24,hh:24})),N={x:95,y:33,hw:90,hh:32};v.forEach((e,t)=>{let n=e.leaves.map(e=>T(e.lblEl,33,e.soon)),r={x:w.x,y:w.y+d[t].oy*1.1,hw:d[t].hw*1.1,hh:d[t].hh*1.1},i=Math.max(...n.map(e=>e.hw)),a=Math.max(...n.map(e=>e.hh)),o=Math.max(56,i+4);e.leafAbsR=ae(w,n,{a0:-2.35,a1:.85,rx:Math.max(m,r.hw+i*.7),ry:Math.max(h,r.hh+a*.7),bd:{x0:o,x1:b-o,y0:84,y1:x-76},pad:6,hard:[r,N],soft:_}),e.leafOffR=e.leafAbsR.map(e=>({x:e.x-w.x,y:e.y-w.y}))});let I={x:S,y:x-56},R={x:S+10,y:Math.max(92,x*.14)},z=I.y-R.y;O=ce(I,{x:S+16,y:I.y-z*.32},{x:S-18,y:I.y-z*.7},R),k=z*1.18,l.setAttribute(`d`,O.d),u.setAttribute(`d`,O.d),f.setAttribute(`d`,O.d);let B={x:C.x+6,y:C.y-Math.max(40,(C.y-I.y-26)*.55)},V=ce(oe(C,Math.max(0,E-5),B),B,{x:C.x+(I.x-C.x)*.45,y:I.y+18},{x:I.x-2,y:I.y+6});A=Math.hypot(I.x-C.x,I.y-C.y)*1.3+1,p.setAttribute(`d`,V.d),g.setAttribute(`d`,V.d);let H=e.querySelector(`[data-arm="venaGrad"]`);H&&(H.setAttribute(`x1`,F(C.x)),H.setAttribute(`y1`,F(C.y)),H.setAttribute(`x2`,F(C.x+(I.x-C.x)*.6)),H.setAttribute(`y2`,F(I.y+12)),p.style.stroke=`url(#arm-vena-grad)`),j=[],M=[],P=[];let U=re(d,y,56,I.y-36,6);v.forEach((e,t)=>{let n=.15+.72*t/ee;j.push(le(O,n));let r=t%2==0?-1:1,i=96+L(t+71)*18,a=se(S+r*i,d[t].hw+6,b-d[t].hw-6);M.push({x:a,y:U[t]})}),P=M.map((e,t)=>{let n=t%2==0?-1:1;return{x:e.x-n*30,y:e.y+6}}),v.forEach((e,t)=>{let n=t%2==0?-1:1,r=P[t],i=e.leaves.map(e=>T(e.lblEl,33,e.soon)),a=T(e.lblEl,36),o={x:r.x,y:r.y+a.oy*1.12,hw:a.hw*1.12,hh:a.hh*1.12},s=Math.max(...i.map(e=>e.hw)),c=Math.max(...i.map(e=>e.hh)),l=se((r.y-x*.45)/x,-.35,.45)*2,u=n<0?-l:Math.PI+l,d=Math.max(58,s+4);e.leafAbsT=ae(r,i,{a0:u-1.85,a1:u+1.85,rx:o.hw+s*.7,ry:o.hh+c*.7,bd:{x0:d,x1:b-d,y0:78,y1:I.y-54},pad:6,hard:[o],soft:M.filter((e,n)=>n!==t).map(e=>({x:e.x,y:e.y,hw:33,hh:33}))}),e.leafOffT=e.leafAbsT.map(e=>({x:e.x-r.x,y:e.y-r.y}))})}function J(e){if(!b||!x){G=null;return}let n=Math.min(.05,(e-K)/1e3)||.016;K=e;let r=t?1:1-Math.exp(-n*8),i=t?1:1-Math.exp(-n*11),a=t?1:1-Math.exp(-n*5),s=t?1:1-Math.exp(-n*6.5),c=0,d=W;if(o.style.display=m?``:`none`,m){H+=(U-H)*a,c=Math.max(c,200*Math.abs(U-H));let e=I(H);H<.995?(B(p,A,Math.min(1,e*2.6)),B(g,A,Math.min(1,e*2.6)),B(l,k,Math.min(1,e*4)),B(u,k,e),B(f,k,e)):(V(l),V(u),V(f),V(p),V(g)),o.style.opacity=d==null?1:.55}v.forEach((e,t)=>{let n,o,l,u;m?(n=d===t?P[t]:M[t],o=d==null?1:d===t?1.12:.84,l=(d==null||d===t?1:.35)*Math.min(1,e.vis*1.5),u=(d==null||d===t?1:.3)*(e.vis>.75)):(n=d==null?ie[t]:d===t?w:D[t],o=d==null?1:d===t?1.1:.5,l=(d==null||d===t?1:.28)*Math.min(1,e.vis*1.5),u=(d==null||d===t)*+(e.vis>.75)),e.vis+=(e.visT-e.vis)*a,e.x+=(n.x-e.x)*r,e.y+=(n.y-e.y)*r,e.scl+=(o-e.scl)*i,e.alp+=(l-e.alp)*i,e.lbl+=(u-e.lbl)*i,c=Math.max(c,Math.abs(n.x-e.x),Math.abs(n.y-e.y),200*Math.abs(e.visT-e.vis));let f=m?j[t]:oe(C,Math.max(0,E-5),{x:e.x,y:e.y}),p=z(f,{x:e.x,y:e.y},t*13+5);e.pCore.setAttribute(`d`,p.d),e.pGlow.setAttribute(`d`,p.d);let h=I(e.vis);if(e.vis<.995){let t=Math.hypot(e.x-f.x,e.y-f.y)*1.3+1;B(e.pCore,t,h),B(e.pGlow,t,h)}else V(e.pCore),V(e.pGlow);let g=d==null||d===t?1:.3;e.pCore.style.opacity=String(g),e.pGlow.style.opacity=String(g),e.el.style.transform=`translate(${F(e.x)}px,${F(e.y)}px)`,e.el.style.opacity=e.alp.toFixed(3),e.el.style.zIndex=d===t?6:3,e.orb.style.transform=`scale(${(e.scl*Math.min(1,e.vis*1.25)).toFixed(3)})`,e.lblEl.style.opacity=e.lbl.toFixed(3),e.leaves.forEach((n,r)=>{if(n.grow+=(n.growT-n.grow)*s,c=Math.max(c,200*Math.abs(n.growT-n.grow)),n.grow<.02){n.el.style.display=`none`,n.pCore.style.display=`none`,n.pGlow.style.display=`none`;return}n.el.style.display=``,n.pCore.style.display=``,n.pGlow.style.display=``;let i=I(n.grow),a=m?e.leafOffT[r]:e.leafOffR[r],o=e.x+a.x*i,l=e.y+a.y*i,u=z({x:e.x,y:e.y},{x:o,y:l},t*31+r*7+2);if(n.pCore.setAttribute(`d`,u.d),n.pGlow.setAttribute(`d`,u.d),n.grow<.995){let t=Math.hypot(o-e.x,l-e.y)*1.3+1;B(n.pCore,t,i),B(n.pGlow,t,i)}else V(n.pCore),V(n.pGlow);n.el.style.transform=`translate(${F(o)}px,${F(l)}px)`,n.el.style.opacity=((n.soon||n.down?.72:1)*i).toFixed(3),n.orb.style.transform=`scale(${(.5+.5*i).toFixed(3)})`,n.lblEl.style.opacity=i.toFixed(3)})}),G=!t&&(c>.35||e<q)?requestAnimationFrame(J):null}function Y(e){if(t){J(performance.now());return}q=Math.max(q,performance.now()+(e||500)),G??=(K=performance.now(),requestAnimationFrame(J))}function fe(e){W=e,v.forEach(n=>{n.leafTimers.forEach(clearTimeout),n.leafTimers=[],n.i===e?n.leaves.forEach((e,r)=>{if(t){e.growT=1;return}n.leafTimers.push(setTimeout(()=>{e.growT=1,Y(1200)},150+r*90))}):n.leaves.forEach(e=>{e.growT=0})}),e!=null&&_.classList.add(`off`),d(e),Y(1100)}function pe(){ue=!0,H=0,U=+!!m,v.forEach((e,n)=>{clearTimeout(e.growTimer),e.vis=0,e.visT=0,e.scl=0,e.alp=0,e.lbl=0;let r=m&&j[n]||C;if(e.x=r.x,e.y=r.y,e.leaves.forEach(e=>{e.grow=0,e.growT=0}),t){e.visT=1;return}let i=m?340+n*120:220+n*95;e.growTimer=setTimeout(()=>{e.visT=1,Y(1600)},i)}),t&&(H=U),fe(null),Y(2e3)}a.current={toggleFocus:e=>fe(W===e?null:e),clearFocus:()=>fe(null)};function X(){de(),!ue&&b>0&&x>0?pe():Y(800)}let Z=null;if(typeof ResizeObserver<`u`){Z=new ResizeObserver(X),Z.observe(e);let t=n&&n.current;t&&Z.observe(t)}de(),b>0&&x>0&&pe();let Q=null,me=[];return t?Q=requestAnimationFrame(()=>{Q=null,X()}):(Q=requestAnimationFrame(()=>{Q=null,X()}),[120,280,520].forEach(e=>{me.push(setTimeout(X,e))})),()=>{G!=null&&cancelAnimationFrame(G),Q!=null&&cancelAnimationFrame(Q),me.forEach(clearTimeout),Z&&Z.disconnect(),v.forEach(e=>{clearTimeout(e.growTimer),e.leafTimers.forEach(clearTimeout),[e.pGlow,e.pCore].forEach(e=>e.remove()),e.leaves.forEach(e=>{e.pGlow.remove(),e.pCore.remove()})}),a.current=null}},[m,n,h]);function g(e){p(e),clearTimeout(s.current),s.current=setTimeout(()=>p(null),1700)}function _(n,r){if(t)return;let i=N[n];if(i?.kind===`cap`){let t=i;r?.currentTarget&&G(r.currentTarget);let n=t.cap,a=h.get(n.id)||`live`;if(a===`soon`){g(`${n.icon} ${n.label} — por lanzar`);return}if(a===`down`){g(`${n.icon} ${n.label} — no disponible sin conexión al servidor`);return}e&&e(n);return}a.current?.toggleFocus(n)}function v(n,r){if(t)return;G(n.currentTarget);let i=h.get(r.id)||`live`;if(i===`soon`){g(`${r.icon} ${r.label} — por lanzar`);return}if(i===`down`){g(`${r.icon} ${r.label} — no disponible sin conexión al servidor`);return}e&&e(r)}function y(){t||a.current?.clearFocus()}return(0,D.jsxs)(`div`,{ref:i,className:`arm-root${t?` arm-disabled`:``}`,"data-armtheme":c,"aria-label":`Capacidades de Chagra`,children:[(0,D.jsx)(`style`,{children:K}),(0,D.jsxs)(`svg`,{className:`arm-web`,"data-arm":`web`,preserveAspectRatio:`none`,"aria-hidden":`true`,children:[(0,D.jsxs)(`defs`,{children:[(0,D.jsxs)(`linearGradient`,{id:`arm-vena-grad`,"data-arm":`venaGrad`,gradientUnits:`userSpaceOnUse`,children:[(0,D.jsx)(`stop`,{offset:`0`,style:{stopColor:`rgb(var(--t-accent-rgb))`}}),(0,D.jsx)(`stop`,{offset:`0.45`,style:{stopColor:`var(--trunkC)`}}),(0,D.jsx)(`stop`,{offset:`1`,style:{stopColor:`var(--trunkC)`}})]}),(0,D.jsxs)(`linearGradient`,{id:`arm-under-grad`,"data-arm":`underGrad`,gradientUnits:`userSpaceOnUse`,children:[(0,D.jsx)(`stop`,{offset:`0`,stopColor:`#fff`}),(0,D.jsx)(`stop`,{offset:`1`,stopColor:`#fff`,stopOpacity:`0.55`})]}),(0,D.jsx)(`mask`,{id:`arm-under-mask`,"data-arm":`underMask`,maskUnits:`userSpaceOnUse`,style:{maskType:`alpha`},children:(0,D.jsx)(`rect`,{"data-arm":`underMaskRect`,fill:`url(#arm-under-grad)`})})]}),(0,D.jsxs)(`g`,{mask:`url(#arm-under-mask)`,children:[(0,D.jsxs)(`g`,{className:`arm-gtrunk`,"data-arm":`gTrunk`,children:[(0,D.jsx)(`path`,{className:`vnO`,"data-arm":`vnO`}),(0,D.jsx)(`path`,{className:`vnI`,"data-arm":`vnI`}),(0,D.jsx)(`path`,{className:`tkB`,"data-arm":`tkB`}),(0,D.jsx)(`path`,{className:`tkO`,"data-arm":`tkO`}),(0,D.jsx)(`path`,{className:`tkI`,"data-arm":`tkI`})]}),(0,D.jsx)(`g`,{className:`arm-gglow`,"data-arm":`gGlow`}),(0,D.jsx)(`g`,{className:`arm-gcore`,"data-arm":`gCore`})]})]}),(0,D.jsx)(`div`,{className:`arm-spores`,"aria-hidden":`true`,children:H.map((e,t)=>(0,D.jsx)(`i`,{className:`arm-sp`,style:{"--lx":e.lx,"--dur":e.dur,"--del":e.del,"--dx":e.dx,"--rise":e.rise}},t))}),(0,D.jsxs)(`div`,{className:`arm-nodes`,children:[N.map((e,t)=>{let n=e.kind===`cap`,r=n&&h.get(e.cap.id)||`live`,i=r===`down`;return(0,D.jsxs)(`div`,{className:`arm-node ${n?`arm-feat`:`arm-group`}${r===`soon`?` arm-soon`:``}${i?` arm-down`:``}`,role:`button`,tabIndex:i?-1:0,"aria-label":n&&i?`${e.label} (sin conexión al servidor)`:e.label,"aria-expanded":n?void 0:u===t,"aria-disabled":i||void 0,"data-arm-group":t,style:{opacity:0,"--pd":`${t*.5}s`},onClick:e=>_(t,e),onKeyDown:e=>W(e,()=>_(t,e)),children:[(0,D.jsx)(`div`,{className:`arm-orb`,children:(0,D.jsx)(`i`,{className:`arm-ic`,style:{"--swD":`${(4.2+L(t+2)*2.4).toFixed(1)}s`,"--swDel":`${(-L(t+11)*4).toFixed(1)}s`},children:e.icon})}),(0,D.jsxs)(`div`,{className:`arm-lbl`,children:[e.label,n&&i&&(0,D.jsxs)(D.Fragment,{children:[(0,D.jsx)(`br`,{}),(0,D.jsx)(`span`,{className:`arm-badge arm-badge-down`,children:`no disponible`})]})]})]},e.key)}),N.map((e,n)=>e.leaves.map((e,r)=>{let i=h.get(e.id)||`live`,a=i===`soon`,o=i===`down`,s=a||o;return(0,D.jsxs)(`div`,{className:`arm-node arm-leaf${a?` arm-soon`:``}${o?` arm-down`:``}`,role:`button`,tabIndex:s?-1:0,"aria-label":a?`${e.label} (por lanzar)`:o?`${e.label} (sin conexión al servidor)`:e.label,"aria-disabled":s||t||void 0,"data-arm-leaf":`${n}-${r}`,style:{display:`none`},onClick:t=>v(t,e),onKeyDown:t=>W(t,()=>v(t,e)),children:[(0,D.jsx)(`div`,{className:`arm-orb`,children:(0,D.jsx)(`i`,{className:`arm-ic`,style:{"--swD":`${(3.8+L(n*9+r)*2.5).toFixed(1)}s`,"--swDel":`${(-L(n+r+19)*4).toFixed(1)}s`},children:e.icon})}),(0,D.jsxs)(`div`,{className:`arm-lbl`,children:[e.label,a&&(0,D.jsxs)(D.Fragment,{children:[(0,D.jsx)(`br`,{}),(0,D.jsx)(`span`,{className:`arm-badge`,children:`por lanzar`})]}),o&&(0,D.jsxs)(D.Fragment,{children:[(0,D.jsx)(`br`,{}),(0,D.jsx)(`span`,{className:`arm-badge arm-badge-down`,children:`no disponible`})]})]})]},e.id)}))]}),(0,D.jsx)(`div`,{className:`arm-hint`,"data-arm":`hint`,children:`⸙ toque una rama`}),u!=null&&(0,D.jsxs)(`button`,{type:`button`,className:`arm-crumb`,onClick:y,children:[`‹ `,(0,D.jsx)(`span`,{children:N[u].icon}),(0,D.jsx)(`span`,{children:N[u].label})]}),(0,D.jsx)(`div`,{className:`arm-toast${f?` show`:``}`,role:`status`,children:f})]})}function ue(e,{onAsk:t,onNav:n,onPhoto:r}={}){if(!e)return!1;let i=e.heroRoute||e.route;return e.status===`soon`||!i||i.kind===`unavailable`?!1:i.kind===`ask`?(t?.(i.prompt),!0):i.kind===`nav`?(n?.(i.view),!0):i.kind===`photo`?(r?.(),!0):!1}var de=`translate(70 11) rotate(21)`,J=`M -7 13 L -7 6 A 7 7 0 0 1 7 6 L 7 13`,Y=`M 0 11 L 0 78`,fe=`M -8.5 74 C -10 87 -5.5 99 0 111 C 5.5 99 10 87 8.5 74 C 3.5 78 -3.5 78 -8.5 74 Z`,pe=`translate(70 11) rotate(-21)`,X=`M 0 2 L 0 26`,Z=`M -6 27 L 7 27`,Q=`M -3.5 29 L -3.5 78 Q -3.5 90 8 99 L 13.5 92.5 Q 6.5 86 6 73 L 6 29 Z`,me=`M 8 99 L 13.5 92.5`,he=`translate(40 82)`,ge=`M 8 0 L 58 0`,_e=`M 12 -1 C 4 0 0 3 -1 9`,ve=`M -6 7 L 4 8.5 L 5.5 22 L -10 19 Z`,$={line:`#e8402e`,hi:`#ff6b57`,fill:`#571106`,filo:`#ff6b57`};function ye(){return(0,D.jsxs)(`span`,{className:`baf-fab`,"aria-hidden":`true`,children:[(0,D.jsx)(`style`,{children:be}),(0,D.jsxs)(`svg`,{viewBox:`0 0 140 140`,className:`baf-svg`,"aria-hidden":`true`,focusable:`false`,children:[(0,D.jsx)(`circle`,{className:`baf-face`,cx:`70`,cy:`74`,r:`46`,fill:`#150907`}),(0,D.jsxs)(`g`,{className:`baf-shake`,children:[(0,D.jsxs)(`g`,{className:`baf-aro`,children:[(0,D.jsx)(`circle`,{cx:`70`,cy:`74`,r:`46`,fill:`none`,stroke:`#c93b2a`,strokeWidth:`8`}),(0,D.jsx)(`circle`,{cx:`70`,cy:`74`,r:`46`,fill:`none`,stroke:`#ff6b57`,strokeWidth:`1.4`,opacity:`0.35`}),(0,D.jsx)(`circle`,{className:`baf-grunge`,cx:`70`,cy:`74`,r:`41`,fill:`none`,stroke:`#ffb03a`,strokeWidth:`1.6`,strokeDasharray:`18 26 7 40 24 14`,opacity:`0.5`})]}),(0,D.jsxs)(`g`,{className:`baf-tools`,children:[(0,D.jsx)(`g`,{className:`baf-pala`,children:(0,D.jsxs)(`g`,{className:`baf-tool`,transform:de,children:[(0,D.jsx)(`path`,{d:J,fill:`none`,stroke:$.line,strokeWidth:`6`,strokeLinecap:`round`,strokeLinejoin:`round`}),(0,D.jsx)(`path`,{d:Y,fill:`none`,stroke:$.line,strokeWidth:`8.5`,strokeLinecap:`round`}),(0,D.jsx)(`path`,{d:fe,fill:$.fill,stroke:$.hi,strokeWidth:`3.4`,strokeLinejoin:`round`})]})}),(0,D.jsx)(`g`,{className:`baf-azadon`,children:(0,D.jsxs)(`g`,{className:`baf-tool`,transform:he,children:[(0,D.jsx)(`path`,{d:ge,fill:`none`,stroke:$.line,strokeWidth:`8.5`,strokeLinecap:`round`}),(0,D.jsx)(`path`,{d:_e,fill:`none`,stroke:$.line,strokeWidth:`5`,strokeLinecap:`round`}),(0,D.jsx)(`path`,{d:ve,fill:$.fill,stroke:$.hi,strokeWidth:`3.2`,strokeLinejoin:`round`})]})}),(0,D.jsx)(`g`,{className:`baf-machete`,children:(0,D.jsxs)(`g`,{className:`baf-tool`,transform:pe,children:[(0,D.jsx)(`path`,{d:X,fill:`none`,stroke:$.line,strokeWidth:`8.5`,strokeLinecap:`round`}),(0,D.jsx)(`path`,{d:Z,fill:`none`,stroke:$.line,strokeWidth:`5`,strokeLinecap:`round`}),(0,D.jsx)(`path`,{d:Q,fill:$.fill,stroke:$.hi,strokeWidth:`3.2`,strokeLinejoin:`round`}),(0,D.jsx)(`path`,{d:me,fill:`none`,stroke:$.filo,strokeWidth:`3.2`,strokeLinecap:`round`})]})})]}),(0,D.jsx)(`polygon`,{className:`baf-streak baf-streak-pala`,points:`60,-28 69,-30 72,48 66,49`,fill:`#ff6b57`,opacity:`0`}),(0,D.jsxs)(`g`,{className:`baf-streak baf-streak-azadon`,stroke:`#ff6b57`,strokeWidth:`3`,strokeLinecap:`round`,opacity:`0`,children:[(0,D.jsx)(`line`,{x1:`78`,y1:`82`,x2:`130`,y2:`80`}),(0,D.jsx)(`line`,{x1:`86`,y1:`94`,x2:`132`,y2:`93`})]}),(0,D.jsx)(`polygon`,{className:`baf-streak baf-streak-machete`,points:`86,6 92,1 122,110 114,112`,fill:`#ff6b57`,opacity:`0`}),(0,D.jsxs)(`g`,{className:`baf-splat baf-splat-a`,fill:`#ffb03a`,children:[(0,D.jsx)(`circle`,{cx:`34`,cy:`118`,r:`3.2`}),(0,D.jsx)(`circle`,{cx:`26`,cy:`110`,r:`1.8`}),(0,D.jsx)(`circle`,{cx:`43`,cy:`126`,r:`1.4`}),(0,D.jsx)(`circle`,{cx:`21`,cy:`121`,r:`1.1`})]}),(0,D.jsxs)(`g`,{className:`baf-splat baf-splat-b`,fill:`#ffb03a`,children:[(0,D.jsx)(`circle`,{cx:`122`,cy:`84`,r:`2.8`}),(0,D.jsx)(`circle`,{cx:`128`,cy:`94`,r:`1.6`}),(0,D.jsx)(`circle`,{cx:`117`,cy:`76`,r:`1.2`})]}),(0,D.jsxs)(`g`,{className:`baf-splat baf-splat-c`,fill:`#ffb03a`,children:[(0,D.jsx)(`circle`,{cx:`112`,cy:`120`,r:`3.4`}),(0,D.jsx)(`circle`,{cx:`120`,cy:`112`,r:`1.9`}),(0,D.jsx)(`circle`,{cx:`104`,cy:`128`,r:`1.5`}),(0,D.jsx)(`circle`,{cx:`126`,cy:`124`,r:`1.2`})]})]})]})]})}var be=`
.baf-fab { display: block; width: 100%; height: 100%; pointer-events: none; }
.baf-svg { display: block; width: 100%; height: 100%; overflow: visible; }

/* capas animadas: transform en unidades del viewBox */
.baf-svg g, .baf-svg circle, .baf-svg line, .baf-svg polygon, .baf-svg path {
  transform-box: fill-box;
  transform-origin: center;
}
/* el estampado del aro pivota sobre el CENTRO del botón, no sobre su bbox */
.baf-svg .baf-aro, .baf-svg .baf-grunge {
  transform-box: view-box;
  transform-origin: 70px 74px;
}
/* FIX X→A: los grupos de POSICIÓN (translate al ápice + rotate) pivotan
   sobre el ORIGEN LOCAL tras el translate (semántica SVG nativa). Sin esto,
   rotate(±21°) giraría cada diagonal sobre su propio centro y las dos se
   CRUZARÍAN a media altura → se leería X, no A. */
.baf-svg .baf-tool {
  transform-box: view-box;
  transform-origin: 0 0;
}

.baf-svg { animation: baf-fade 6s linear infinite; }
@keyframes baf-fade {
  0% { opacity: 0; }
  0.9%, 94% { opacity: 1; }
  98%, 100% { opacity: 0; }
}
.baf-aro { animation: baf-aro 6s cubic-bezier(0.2, 0.8, 0.3, 1) infinite; }
@keyframes baf-aro {
  0% { transform: scale(1.32); opacity: 0; }
  4.3%, 100% { transform: scale(1); opacity: 1; }
}
.baf-grunge { animation: baf-grunge 6s linear infinite; }
@keyframes baf-grunge {
  0%, 4.3% { opacity: 0; transform: rotate(-8deg); }
  7.8%, 100% { opacity: 0.5; transform: rotate(0deg); }
}
.baf-shake { animation: baf-shake 6s linear infinite; }
@keyframes baf-shake {
  0%, 10.9% { transform: none; }
  11.4% { transform: translate(-2.6px, 1.6px); }
  11.9% { transform: translate(2.1px, -1.1px); }
  12.4% { transform: translate(-1px, 0.5px); }
  13%, 23.1% { transform: none; }
  23.5% { transform: translate(2.6px, 1.1px); }
  24% { transform: translate(-2.1px, -1.1px); }
  24.7%, 35.2% { transform: none; }
  35.6% { transform: translate(-3.1px, 2.1px); }
  36.2% { transform: translate(2.6px, -1.6px); }
  36.8% { transform: translate(-1px, 1px); }
  37.4%, 100% { transform: none; }
}
.baf-pala { animation: baf-pala 6s linear infinite; }
@keyframes baf-pala {
  0%, 8.7% {
    transform: translate(-8px, -138px) rotate(-22deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  9.2% { opacity: 1; }
  11.3% { transform: translate(0, 3px); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  12.7%, 100% { transform: none; opacity: 1; }
}
.baf-azadon { animation: baf-azadon 6s linear infinite; }
@keyframes baf-azadon {
  0%, 20.8% {
    transform: translate(144px, -8px) rotate(30deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  21.3% { opacity: 1; }
  23.4% { transform: translate(-4px, 0); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  24.8%, 100% { transform: none; opacity: 1; }
}
.baf-machete { animation: baf-machete 6s linear infinite; }
@keyframes baf-machete {
  0%, 32.9% {
    transform: translate(86px, -120px) rotate(48deg) scale(1.08);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.7, 0, 1, 0.6);
  }
  33.5% { opacity: 1; }
  35.5% { transform: translate(-2px, 2px); animation-timing-function: cubic-bezier(0.2, 0.9, 0.4, 1); }
  36.9%, 100% { transform: none; opacity: 1; }
}
.baf-streak { animation-duration: 6s; animation-timing-function: ease-out; animation-iteration-count: infinite; }
.baf-streak-pala { animation-name: baf-streak-pala; }
.baf-streak-azadon { animation-name: baf-streak-azadon; }
.baf-streak-machete { animation-name: baf-streak-machete; }
@keyframes baf-streak-pala {
  0%, 10.8% { transform: none; opacity: 0; }
  11.6% { opacity: 0.7; }
  15.6%, 100% { transform: translate(0, 14px); opacity: 0; }
}
@keyframes baf-streak-azadon {
  0%, 22.9% { transform: none; opacity: 0; }
  23.8% { opacity: 0.7; }
  27.7%, 100% { transform: translate(-16px, 0); opacity: 0; }
}
@keyframes baf-streak-machete {
  0%, 35% { transform: none; opacity: 0; }
  35.9% { opacity: 0.8; }
  40.3%, 100% { transform: translate(-8px, 12px); opacity: 0; }
}
.baf-splat { animation-duration: 6s; animation-timing-function: cubic-bezier(0.2, 0.9, 0.35, 1); animation-iteration-count: infinite; }
.baf-splat-a { animation-name: baf-splat-a; }
.baf-splat-b { animation-name: baf-splat-b; }
.baf-splat-c { animation-name: baf-splat-c; }
@keyframes baf-splat-a {
  0%, 11.1% { transform: scale(0.3); opacity: 0; }
  12.7%, 100% { transform: scale(1); opacity: 1; }
}
@keyframes baf-splat-b {
  0%, 23.2% { transform: scale(0.3); opacity: 0; }
  24.8%, 100% { transform: scale(1); opacity: 1; }
}
@keyframes baf-splat-c {
  0%, 35.4% { transform: scale(0.3); opacity: 0; }
  36.9%, 100% { transform: scale(1); opacity: 1; }
}
.baf-tools { animation: baf-flicker 6s linear infinite; }
@keyframes baf-flicker {
  0%, 52.9% { opacity: 1; }
  53.7% { opacity: 0.45; }
  54.4% { opacity: 1; }
  55.1% { opacity: 0.6; }
  55.8%, 100% { opacity: 1; }
}

/* ── ABIERTO (menú radial desplegado): la Ⓐ pasa a esténcil BLANCO sobre el
   fondo de acento del botón (paridad con el comportamiento del FAB viejo) y
   se congela quieta — la raíz de la red no compite con las ramas. ────────── */
.is-open .baf-svg, .is-open .baf-svg * { animation: none !important; }
.is-open .baf-svg .baf-face { fill: transparent; }
.is-open .baf-svg .baf-aro circle { stroke: #fff; }
.is-open .baf-svg .baf-grunge { stroke: rgba(255, 255, 255, 0.7); opacity: 0.5; }
.is-open .baf-svg .baf-tools path { stroke: #fff; }
.is-open .baf-svg .baf-tools path[fill]:not([fill="none"]) { fill: rgba(255, 255, 255, 0.32); }
.is-open .baf-svg .baf-streak { opacity: 0 !important; }
.is-open .baf-svg .baf-splat { fill: rgba(255, 255, 255, 0.85); opacity: 1; transform: scale(1); }

/* reduced motion: la Ⓐ ensamblada, quieta y digna (estado base = final) */
@media (prefers-reduced-motion: reduce) {
  .baf-svg, .baf-svg * { animation: none !important; }
  .baf-streak { opacity: 0; }
  .baf-grunge { opacity: 0.5; }
}
`;export{y as a,d as c,g as d,_ as f,ee as i,f as l,ue as n,p as o,q as r,u as s,ye as t,h as u};