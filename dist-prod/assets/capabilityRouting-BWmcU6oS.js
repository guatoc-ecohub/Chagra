import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{Ci as t}from"./vendor-icons-C4vhLH2y.js";import{t as n}from"./vendor-react-Bl3EXeX9.js";import"./apiService-Cy75Hbfe.js";import{n as r,t as i}from"./dbCore-CbgUSnzw.js";import{sn as a}from"./index--xjsk3Zp.js";import{a as o}from"./profileChipSelector-CRQdA8V3.js";var s=[`text`,`voice`,`photo`,`attachment`];function c(e){return new Promise((t,n)=>{e.onsuccess=()=>t(e.result),e.onerror=()=>n(e.error)})}function l(e){return new Promise((t,n)=>{e.oncomplete=()=>t(),e.onerror=()=>n(e.error),e.onabort=()=>n(e.error||Error(`tx abortada`))})}async function u(e={}){let{kind:t,text:n=``,blob:a=null,mime:o=null,fileName:u=null,meta:d={}}=e;if(!s.includes(t))throw Error(`[agentOutbox] kind inválido: ${t} (debe ser ${s.join(` | `)})`);let f=typeof n==`string`&&n.trim().length>0,p=a&&typeof a==`object`;if(!f&&!p)throw Error(`[agentOutbox] enqueue requiere texto o blob (no se persiste un item vacío)`);let m=await r(),h={kind:t,text:typeof n==`string`?n:``,blob:p?a:null,mime:o||p&&a.type||null,fileName:u||null,meta:d||{},status:`queued`,createdAt:typeof d?.createdAt==`number`?d.createdAt:Date.now(),claimedAt:null,answeredAt:null,error:null},g=m.transaction(i.AGENT_OUTBOX,`readwrite`),_=await c(g.objectStore(i.AGENT_OUTBOX).add(h));return await l(g),_}async function d(){try{let e=await c((await r()).transaction(i.AGENT_OUTBOX,`readonly`).objectStore(i.AGENT_OUTBOX).getAll());return(Array.isArray(e)?e:[]).sort((e,t)=>(e.createdAt||0)-(t.createdAt||0))}catch(e){return console.debug(`[agentOutbox] getAll error:`,e),[]}}async function f(){return(await d()).filter(e=>e.status===`queued`||e.status===`processing`)}async function p(){try{let e=(await r()).transaction(i.AGENT_OUTBOX,`readwrite`),t=e.objectStore(i.AGENT_OUTBOX),n=await c(t.getAll()),a=(Array.isArray(n)?n:[]).filter(e=>e.status===`queued`).sort((e,t)=>(e.createdAt||0)-(t.createdAt||0));if(a.length===0)return null;let o={...a[0],status:`processing`,claimedAt:Date.now()};return await c(t.put(o)),await l(e),o}catch(e){return console.debug(`[agentOutbox] claimNext error:`,e),null}}async function m(e,t){try{let n=(await r()).transaction(i.AGENT_OUTBOX,`readwrite`),a=n.objectStore(i.AGENT_OUTBOX),o=await c(a.get(e));if(!o)return null;let s={...o,...t};return await c(a.put(s)),await l(n),s}catch(e){return console.debug(`[agentOutbox] patchItem error:`,e),null}}async function h(e,{answeredText:t=null}={}){return m(e,{status:`answered`,answeredAt:Date.now(),error:null,...t==null?{}:{answeredText:t}})}async function g(e,t){return m(e,{status:`error`,error:t||`fallo desconocido`})}async function _(){try{let e=(await r()).transaction(i.AGENT_OUTBOX,`readwrite`),t=e.objectStore(i.AGENT_OUTBOX),n=await c(t.getAll()),a=(Array.isArray(n)?n:[]).filter(e=>e.status===`processing`);for(let e of a)await c(t.put({...e,status:`queued`,claimedAt:null}));return await l(e),a.length}catch(e){return console.debug(`[agentOutbox] recoverStaleProcessing error:`,e),0}}var v=/\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?)$/i;function y(e){if(!e||typeof e!=`object`)return!1;let t=(e.mime||``).toString().toLowerCase().trim();if(t.startsWith(`image/`))return!0;if(!t||t===`application/octet-stream`){let t=(e.fileName||``).toString();return v.test(t)}return!1}function b(e){let t=e&&e.fileName?String(e.fileName).trim():``;return`Solo puedo analizar fotos de plantas o cultivos, no ${(e&&e.mime?String(e.mime).toLowerCase():``).includes(`pdf`)||/\.pdf$/i.test(t)?`documentos PDF ni hojas de vida`:`documentos ni archivos`} 😅. Mándame una foto de tu planta y te ayudo.`}var x=e(t(),1),S=new Set(`get_species.get_companions.get_biopreparados.get_pest_controllers.get_multihop_companions.get_subgrafo_relacional.get_diseno_restauracion.get_diseno_silvopastoril.validate_visual_match.validate_taxonomy.get_normativa_ica.get_clima_ideam.get_precio_sipsa.get_enso_status.get_alertas_clima_zona.get_saberes.get_toxicidad.get_variedades.get_suelo.get_calendario_siembra.get_associations.get_fenologia.get_polinizacion.get_invasoras_alternativas.get_saberes_tradicionales.get_variedades_cultivo.get_psa_elegibilidad.get_alerta_carbono.get_alerta_normativa_paramo.get_alerta_clima_consejo`.split(`.`));function C(e,t={}){let{manifest:n=[],isSidecarEnabled:r=!1,sidecarToolNames:i=S}=t,a=i instanceof Set?i:new Set(i),o=Array.isArray(n)?n.find(t=>t.id===e):null;return o?o.status===`soon`?`soon`:o.tool&&a.has(o.tool)&&!r?`down`:`live`:`live`}var w=(e,t,n)=>Math.max(t,Math.min(n,e));function ee(e,t,n,r={}){let i=r.ky??1,a=r.fixed||[],o=r.fixedD??t;for(let r=0;r<48;r++){let r=!1;for(let n=0;n<e.length;n++){for(let a=n+1;a<e.length;a++){let o=e[a].x-e[n].x,s=e[a].y-e[n].y,c=Math.hypot(o,s*i);if(c<t){r=!0,c<1&&(o=1,s=0,c=1);let i=(t-c)/2/c;e[n].x-=o*i,e[n].y-=s*i,e[a].x+=o*i,e[a].y+=s*i}}for(let t=0;t<a.length;t++){let s=a[t].d??o,c=e[n].x-a[t].x,l=e[n].y-a[t].y,u=Math.hypot(c,l*i);if(u<s){r=!0,u<1&&(c=1,l=0,u=1);let t=(s-u)/u;e[n].x+=c*t,e[n].y+=l*t}}}if(e.forEach(e=>{e.x=w(e.x,n.x0,n.x1),e.y=w(e.y,n.y0,n.y1)}),!r)break}}function T(e,t,n,r={}){let i=r.fixed||[],a=r.pad??6;for(let r=0;r<96;r++){let r=!1;for(let o=0;o<e.length;o++){for(let n=o+1;n<e.length;n++){let i=e[n].x-e[o].x,s=e[n].y+t[n].oy-(e[o].y+t[o].oy),c=t[o].hw+t[n].hw+a-Math.abs(i),l=t[o].hh+t[n].hh+a-Math.abs(s);if(c>0&&l>0)if(r=!0,c<l){let t=(i>=0?1:-1)*c/2;e[o].x-=t,e[n].x+=t}else{let t=(s>=0?1:-1)*l/2;e[o].y-=t,e[n].y+=t}}for(let s=0;s<i.length;s++){let c=e[o].x-i[s].x,l=e[o].y+t[o].oy-i[s].y,u=t[o].hw+i[s].hw+a-Math.abs(c),d=t[o].hh+i[s].hh+a-Math.abs(l);if(u>0&&d>0){r=!0;let t=(c>=0?1:-1)*u,i=(l>=0?1:-1)*d,a=e[o].x+t>=n.x0&&e[o].x+t<=n.x1,s=e[o].y+i>=n.y0&&e[o].y+i<=n.y1;u<d&&a||!s?e[o].x=w(e[o].x+t,n.x0,n.x1):e[o].y+=i}}}if(e.forEach(e=>{e.x=w(e.x,n.x0,n.x1),e.y=w(e.y,n.y0,n.y1)}),!r)break}}function E(e,t,n=!1){let r=e?e.offsetWidth:0,i=e?e.offsetHeight:0;if(!r&&e&&e.closest){let t=e.closest(`.arm-node`);t&&t.style.display===`none`&&(t.style.display=``,r=e.offsetWidth,i=e.offsetHeight,t.style.display=`none`)}if(!r){let t=(e&&e.textContent||``).trim(),a=Math.round(t.length*7.4)+18;r=w(a,58,128),i=(a>128?42:26)+(n?20:0)}let a=-t-2,o=t+4+i;return{hw:Math.max(t+1,r/2),hh:(o-a)/2,oy:(a+o)/2}}function te(e,t,n={}){let r=n.pad??8,i=n.jitter??0,a=n.rand||(()=>.5),o=t.x1-t.x0,s=[],c=[],l=0;e.forEach((e,t)=>{let n=e.hw*2+r;c.length&&l+n>o&&(s.push(c),c=[],l=0),c.push(t),l+=n}),c.length&&s.push(c);let u=s.map(t=>Math.max(...t.map(t=>e[t].hh*2))),d=u.reduce((e,t)=>e+t,0)+r*(s.length-1),f=Math.max(0,(t.y1-t.y0-d)/(s.length+1)),p=Array(e.length),m=t.y0+f;return s.forEach((n,s)=>{let c=s%2?[...n].reverse():n,l=n.reduce((t,n)=>t+e[n].hw*2,0),d=Math.max(0,(o-l-r*(n.length-1))/(n.length+1)),h=t.x0+d;c.forEach(t=>{let n=e[t];p[t]={x:h+n.hw+(a(t)-.5)*i,y:m+n.hh-n.oy+(a(t+50)-.5)*i*.6},h+=n.hw*2+r+d}),m+=u[s]+r+f}),p}function ne(e,t,n,r,i=6){let a=Array(t),o=t>1?(r-n)/(t-1):0;for(let r=0;r<t;r++){let s=t-1-r,c=s+2,l=n+r*o;if(c<t&&a[c]!=null){let t=e[c].hh+e[s].hh+i+(e[c].oy-e[s].oy);l=Math.max(l,a[c]+t)}a[s]=l}let s=a[0]??n;if(s>r&&s>n){let e=(r-n)/(s-n);for(let r=0;r<t;r++)a[r]=n+(a[r]-n)*e}return a}function D(e,t,n){let{a0:r,a1:i,rx:a,ry:o,pad:s=8}=n,c=(a+o)/2,l=t.map(e=>{let t=Math.hypot(e.hw,e.hh)+s;return 2*Math.asin(Math.min(.95,t/Math.max(1,c)))}),u=l.reduce((e,t)=>e+t,0),d=i-r,f=u>0?Math.min(1.25,d/u):1,p=r+Math.max(0,(d-u*f)/2);return t.map((t,n)=>{let r=p+l[n]*f/2;return p+=l[n]*f,{x:e.x+Math.cos(r)*a,y:e.y+Math.sin(r)*o}})}function re(e,t,n=[],r=0){let i=(e,t)=>({x0:e.x-t.hw,x1:e.x+t.hw,y0:e.y+t.oy-t.hh,y1:e.y+t.oy+t.hh}),a=(e,t)=>Math.min(e.x1,t.x1)-Math.max(e.x0,t.x0)>r&&Math.min(e.y1,t.y1)-Math.max(e.y0,t.y0)>r,o=e.map((e,n)=>i(e,t[n]));for(let e=0;e<o.length;e++){for(let t=e+1;t<o.length;t++)if(a(o[e],o[t]))return!0;for(let t=0;t<n.length;t++){let r={x0:n[t].x-n[t].hw,x1:n[t].x+n[t].hw,y0:n[t].y-n[t].hh,y1:n[t].y+n[t].hh};if(a(o[e],r))return!0}}return!1}function ie(e,t,n){let{a0:r,a1:i,rx:a,ry:o,bd:s,hard:c=[],soft:l=[],pad:u=6}=n,d=null,f=1,p=1;for(let n=0;n<4;n++){let m=n===0?[...c,...l]:c;if(d=D(e,t,{a0:r,a1:i,rx:a*f,ry:o*p,pad:8}),T(d,t,s,{pad:u,fixed:m}),!re(d,t,c,2))return d;f*=1.18,p*=1.12}return d}function ae(e,t,n){let r=n.x-e.x,i=n.y-e.y,a=Math.hypot(r,i);if(a<1e-6)return{x:e.x,y:e.y};let o=Math.min(t,a)/a;return{x:e.x+r*o,y:e.y+i*o}}var O=e(n(),1),k=Object.freeze({cultivo:{icon:`🌱`,label:`Mis cultivos`},cuidar:{icon:`🐛`,label:`Cuidar y prevenir`},observar:{icon:`👁️`,label:`Mirar la finca`},restaurar:{icon:`🌳`,label:`Restaurar y conservar`},registrar:{icon:`📝`,label:`Guardar lo que hago`},planear:{icon:`📅`,label:`Planear`},aprender:{icon:`📚`,label:`Aprender`},vender:{icon:`💰`,label:`Vender mejor`}}),A=Object.freeze([`cultivo`,`cuidar`,`observar`,`restaurar`,`registrar`,`planear`,`aprender`,`vender`]),j=o.filter(e=>e.hero===!0&&e.featured===!0),M=new Set(j.map(e=>e.id)),N=A.map(e=>({key:e,icon:k[e].icon,label:k[e].label,leaves:o.filter(t=>t.hero===!0&&t.group===e&&!M.has(t.id))})).filter(e=>e.leaves.length>0),P=[...j.map(e=>({kind:`cap`,key:e.id,icon:e.icon,label:e.label,cap:e,leaves:[]})),...N.map(e=>({kind:`group`,key:e.key,icon:e.icon,label:e.label,leaves:e.leaves}))],F=`http://www.w3.org/2000/svg`,I=e=>Math.round(e*10)/10,L=(e,t,n)=>Math.max(t,Math.min(n,e)),R=e=>1-(1-e)**3;function z(e){let t=Math.sin(e*127.1+311.7)*43758.5453;return t-Math.floor(t)}function B(e,t){let n=document.createElementNS(F,`path`);return t&&n.setAttribute(`class`,t),e.appendChild(n),n}function V(e,t,n){let r=t.x-e.x,i=t.y-e.y,a=Math.hypot(r,i)||1,o=-i/a,s=r/a,c=n%2?1:-1,l=c*(.12+z(n)*.1),u=-c*(.07+z(n+9)*.08),d={x:e.x+r*.3+o*a*l,y:e.y+i*.3+s*a*l},f={x:e.x+r*.72+o*a*u,y:e.y+i*.72+s*a*u};return{d:`M${I(e.x)} ${I(e.y)} C${I(d.x)} ${I(d.y)} ${I(f.x)} ${I(f.y)} ${I(t.x)} ${I(t.y)}`,p0:e,c1:d,c2:f,p1:t}}function oe(e,t,n,r){return{d:`M${I(e.x)} ${I(e.y)} C${I(t.x)} ${I(t.y)} ${I(n.x)} ${I(n.y)} ${I(r.x)} ${I(r.y)}`,p0:e,c1:t,c2:n,p1:r}}function se(e,t){let n=1-t;return{x:n*n*n*e.p0.x+3*n*n*t*e.c1.x+3*n*t*t*e.c2.x+t*t*t*e.p1.x,y:n*n*n*e.p0.y+3*n*n*t*e.c1.y+3*n*t*t*e.c2.y+t*t*t*e.p1.y}}function H(e,t,n){e.setAttribute(`stroke-dasharray`,t),e.setAttribute(`stroke-dashoffset`,t*(1-n))}function U(e){e.removeAttribute(`stroke-dasharray`),e.removeAttribute(`stroke-dashoffset`)}var W=Array.from({length:16},(e,t)=>({lx:`${(6+z(t+3)*88).toFixed(1)}%`,dur:`${(7+z(t+9)*7).toFixed(1)}s`,del:`${(-z(t+17)*12).toFixed(1)}s`,dx:`${((z(t+5)-.5)*70).toFixed(0)}px`,rise:`${(180+z(t+7)*280).toFixed(0)}px`}));function G(){let e=document.documentElement.getAttribute(`data-theme`);return e===`nature`?`nature`:e===`minimalista`?`min`:`biopunk`}function K(e,t){(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),t())}function q(e){e.classList.remove(`arm-tap`),e.offsetWidth,e.classList.add(`arm-tap`)}var J=`
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
`;function Y({onPick:e,disabled:t=!1,anchorRef:n=null}){let r=(0,x.useRef)(null),i=(0,x.useRef)(null),s=(0,x.useRef)(null),[c,l]=(0,x.useState)(G),[u,d]=(0,x.useState)(null),[f,p]=(0,x.useState)(null);(0,x.useEffect)(()=>{let e=new MutationObserver(()=>l(G()));return e.observe(document.documentElement,{attributes:!0,attributeFilter:[`data-theme`]}),()=>e.disconnect()},[]),(0,x.useEffect)(()=>()=>clearTimeout(s.current),[]);let m=c===`nature`,h=(0,x.useMemo)(()=>{try{let e=a();return new Map(o.map(t=>[t.id,C(t.id,{manifest:o,isSidecarEnabled:e,sidecarToolNames:S})]))}catch{return new Map(o.map(e=>[e.id,`live`]))}},[]);(0,x.useEffect)(()=>{let e=r.current;if(!e)return;let t=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,a=e.querySelector(`[data-arm="web"]`),o=e.querySelector(`[data-arm="gTrunk"]`),s=e.querySelector(`[data-arm="gGlow"]`),c=e.querySelector(`[data-arm="gCore"]`),l=e.querySelector(`[data-arm="tkB"]`),u=e.querySelector(`[data-arm="tkO"]`),f=e.querySelector(`[data-arm="tkI"]`),p=e.querySelector(`[data-arm="vnO"]`),g=e.querySelector(`[data-arm="vnI"]`),_=e.querySelector(`[data-arm="hint"]`),v=P.map((t,n)=>{let r=e.querySelector(`[data-arm-group="${n}"]`);return{i:n,el:r,orb:r.querySelector(`.arm-orb`),lblEl:r.querySelector(`.arm-lbl`),pGlow:B(s,``),pCore:B(c,``),x:0,y:0,scl:0,alp:0,vis:0,visT:0,lbl:0,leafTimers:[],growTimer:null,leafAbsR:[],leafOffR:[],leafAbsT:[],leafOffT:[],leaves:t.leaves.map((t,r)=>{let i=e.querySelector(`[data-arm-leaf="${n}-${r}"]`),a=h.get(t.id)||`live`;return{el:i,orb:i.querySelector(`.arm-orb`),lblEl:i.querySelector(`.arm-lbl`),soon:a===`soon`,down:a===`down`,pGlow:B(s,`lf`),pCore:B(c,`lf`),grow:0,growT:0}})}}),y=v.length,b=Math.max(1,y-1),x=0,S=0,C=0,w={x:0,y:0},T={x:0,y:0},D=23,re=[],O=[],k=null,A=1,j=1,M=[],N=[],F=[],W=0,G=0,K=null,q=null,J=0,Y=0,ce=!1;function le(){if(x=e.clientWidth,S=e.clientHeight,!x||!S)return;C=x/2;let t=n&&n.current,r=e.getBoundingClientRect();if(t&&r.width>0){let e=t.getBoundingClientRect();w={x:e.left+e.width/2-r.left,y:e.top+e.height/2-r.top},D=Math.max(16,Math.min(e.width,e.height)/2)}else w={x:46,y:S+58},D=23;a.setAttribute(`viewBox`,`0 0 ${x} ${S}`),a.style.overflow=`visible`;let i=e.querySelector(`[data-arm="underGrad"]`),o=e.querySelector(`[data-arm="underMaskRect"]`),s=e.querySelector(`[data-arm="underMask"]`);if(i&&o&&s){i.setAttribute(`x1`,`0`),i.setAttribute(`y1`,I(S)),i.setAttribute(`x2`,`0`),i.setAttribute(`y2`,I(Math.max(S+24,w.y)));let e=Math.max(S,w.y)+D+120;for(let t of[s,o])t.setAttribute(`x`,I(-60)),t.setAttribute(`y`,I(-60)),t.setAttribute(`width`,I(x+120)),t.setAttribute(`height`,I(e))}let c=-1.45,d=v.map(e=>E(e.lblEl,36));re=te(d,{x0:10,x1:x-10,y0:44,y1:S-58},{pad:9,jitter:8,rand:z}),O=v.map((e,t)=>{let n=c+(-.3-c)*t/b,r=t%2?152:110;return{x:w.x+Math.cos(n)*r,y:w.y+Math.sin(n)*r*.9}}),ee(O,54,{x0:38,x1:x-44,y0:Math.max(96,S-290),y1:S-28},{ky:.82}),T={x:L(w.x+Math.min(132,x*.3),96,Math.max(98,x-150)),y:Math.max(150,S*.52)};let m=Math.max(96,Math.min(152,x-T.x-62)),h=Math.max(72,Math.min(176,T.y-100,S-T.y-96)),_=O.map(e=>({x:e.x,y:e.y,hw:24,hh:24})),P={x:95,y:33,hw:90,hh:32};v.forEach((e,t)=>{let n=e.leaves.map(e=>E(e.lblEl,33,e.soon)),r={x:T.x,y:T.y+d[t].oy*1.1,hw:d[t].hw*1.1,hh:d[t].hh*1.1},i=Math.max(...n.map(e=>e.hw)),a=Math.max(...n.map(e=>e.hh)),o=Math.max(56,i+4);e.leafAbsR=ie(T,n,{a0:-2.35,a1:.85,rx:Math.max(m,r.hw+i*.7),ry:Math.max(h,r.hh+a*.7),bd:{x0:o,x1:x-o,y0:84,y1:S-76},pad:6,hard:[r,P],soft:_}),e.leafOffR=e.leafAbsR.map(e=>({x:e.x-T.x,y:e.y-T.y}))});let R={x:C,y:S-56},B={x:C+10,y:Math.max(92,S*.14)},V=R.y-B.y;k=oe(R,{x:C+16,y:R.y-V*.32},{x:C-18,y:R.y-V*.7},B),A=V*1.18,l.setAttribute(`d`,k.d),u.setAttribute(`d`,k.d),f.setAttribute(`d`,k.d);let H={x:w.x+6,y:w.y-Math.max(40,(w.y-R.y-26)*.55)},U=oe(ae(w,Math.max(0,D-5),H),H,{x:w.x+(R.x-w.x)*.45,y:R.y+18},{x:R.x-2,y:R.y+6});j=Math.hypot(R.x-w.x,R.y-w.y)*1.3+1,p.setAttribute(`d`,U.d),g.setAttribute(`d`,U.d);let W=e.querySelector(`[data-arm="venaGrad"]`);W&&(W.setAttribute(`x1`,I(w.x)),W.setAttribute(`y1`,I(w.y)),W.setAttribute(`x2`,I(w.x+(R.x-w.x)*.6)),W.setAttribute(`y2`,I(R.y+12)),p.style.stroke=`url(#arm-vena-grad)`),M=[],N=[],F=[];let G=ne(d,y,56,R.y-36,6);v.forEach((e,t)=>{let n=.15+.72*t/b;M.push(se(k,n));let r=t%2==0?-1:1,i=96+z(t+71)*18,a=L(C+r*i,d[t].hw+6,x-d[t].hw-6);N.push({x:a,y:G[t]})}),F=N.map((e,t)=>{let n=t%2==0?-1:1;return{x:e.x-n*30,y:e.y+6}}),v.forEach((e,t)=>{let n=t%2==0?-1:1,r=F[t],i=e.leaves.map(e=>E(e.lblEl,33,e.soon)),a=E(e.lblEl,36),o={x:r.x,y:r.y+a.oy*1.12,hw:a.hw*1.12,hh:a.hh*1.12},s=Math.max(...i.map(e=>e.hw)),c=Math.max(...i.map(e=>e.hh)),l=L((r.y-S*.45)/S,-.35,.45)*2,u=n<0?-l:Math.PI+l,d=Math.max(58,s+4);e.leafAbsT=ie(r,i,{a0:u-1.85,a1:u+1.85,rx:o.hw+s*.7,ry:o.hh+c*.7,bd:{x0:d,x1:x-d,y0:78,y1:R.y-54},pad:6,hard:[o],soft:N.filter((e,n)=>n!==t).map(e=>({x:e.x,y:e.y,hw:33,hh:33}))}),e.leafOffT=e.leafAbsT.map(e=>({x:e.x-r.x,y:e.y-r.y}))})}function ue(e){if(!x||!S){q=null;return}let n=Math.min(.05,(e-J)/1e3)||.016;J=e;let r=t?1:1-Math.exp(-n*8),i=t?1:1-Math.exp(-n*11),a=t?1:1-Math.exp(-n*5),s=t?1:1-Math.exp(-n*6.5),c=0,d=K;if(o.style.display=m?``:`none`,m){W+=(G-W)*a,c=Math.max(c,200*Math.abs(G-W));let e=R(W);W<.995?(H(p,j,Math.min(1,e*2.6)),H(g,j,Math.min(1,e*2.6)),H(l,A,Math.min(1,e*4)),H(u,A,e),H(f,A,e)):(U(l),U(u),U(f),U(p),U(g)),o.style.opacity=d==null?1:.55}v.forEach((e,t)=>{let n,o,l,u;m?(n=d===t?F[t]:N[t],o=d==null?1:d===t?1.12:.84,l=(d==null||d===t?1:.35)*Math.min(1,e.vis*1.5),u=(d==null||d===t?1:.3)*(e.vis>.75)):(n=d==null?re[t]:d===t?T:O[t],o=d==null?1:d===t?1.1:.5,l=(d==null||d===t?1:.28)*Math.min(1,e.vis*1.5),u=(d==null||d===t)*+(e.vis>.75)),e.vis+=(e.visT-e.vis)*a,e.x+=(n.x-e.x)*r,e.y+=(n.y-e.y)*r,e.scl+=(o-e.scl)*i,e.alp+=(l-e.alp)*i,e.lbl+=(u-e.lbl)*i,c=Math.max(c,Math.abs(n.x-e.x),Math.abs(n.y-e.y),200*Math.abs(e.visT-e.vis));let f=m?M[t]:ae(w,Math.max(0,D-5),{x:e.x,y:e.y}),p=V(f,{x:e.x,y:e.y},t*13+5);e.pCore.setAttribute(`d`,p.d),e.pGlow.setAttribute(`d`,p.d);let h=R(e.vis);if(e.vis<.995){let t=Math.hypot(e.x-f.x,e.y-f.y)*1.3+1;H(e.pCore,t,h),H(e.pGlow,t,h)}else U(e.pCore),U(e.pGlow);let g=d==null||d===t?1:.3;e.pCore.style.opacity=String(g),e.pGlow.style.opacity=String(g),e.el.style.transform=`translate(${I(e.x)}px,${I(e.y)}px)`,e.el.style.opacity=e.alp.toFixed(3),e.el.style.zIndex=d===t?6:3,e.orb.style.transform=`scale(${(e.scl*Math.min(1,e.vis*1.25)).toFixed(3)})`,e.lblEl.style.opacity=e.lbl.toFixed(3),e.leaves.forEach((n,r)=>{if(n.grow+=(n.growT-n.grow)*s,c=Math.max(c,200*Math.abs(n.growT-n.grow)),n.grow<.02){n.el.style.display=`none`,n.pCore.style.display=`none`,n.pGlow.style.display=`none`;return}n.el.style.display=``,n.pCore.style.display=``,n.pGlow.style.display=``;let i=R(n.grow),a=m?e.leafOffT[r]:e.leafOffR[r],o=e.x+a.x*i,l=e.y+a.y*i,u=V({x:e.x,y:e.y},{x:o,y:l},t*31+r*7+2);if(n.pCore.setAttribute(`d`,u.d),n.pGlow.setAttribute(`d`,u.d),n.grow<.995){let t=Math.hypot(o-e.x,l-e.y)*1.3+1;H(n.pCore,t,i),H(n.pGlow,t,i)}else U(n.pCore),U(n.pGlow);n.el.style.transform=`translate(${I(o)}px,${I(l)}px)`,n.el.style.opacity=((n.soon||n.down?.72:1)*i).toFixed(3),n.orb.style.transform=`scale(${(.5+.5*i).toFixed(3)})`,n.lblEl.style.opacity=i.toFixed(3)})}),q=!t&&(c>.35||e<Y)?requestAnimationFrame(ue):null}function X(e){if(t){ue(performance.now());return}Y=Math.max(Y,performance.now()+(e||500)),q??=(J=performance.now(),requestAnimationFrame(ue))}function de(e){K=e,v.forEach(n=>{n.leafTimers.forEach(clearTimeout),n.leafTimers=[],n.i===e?n.leaves.forEach((e,r)=>{if(t){e.growT=1;return}n.leafTimers.push(setTimeout(()=>{e.growT=1,X(1200)},150+r*90))}):n.leaves.forEach(e=>{e.growT=0})}),e!=null&&_.classList.add(`off`),d(e),X(1100)}function fe(){ce=!0,W=0,G=+!!m,v.forEach((e,n)=>{clearTimeout(e.growTimer),e.vis=0,e.visT=0,e.scl=0,e.alp=0,e.lbl=0;let r=m&&M[n]||w;if(e.x=r.x,e.y=r.y,e.leaves.forEach(e=>{e.grow=0,e.growT=0}),t){e.visT=1;return}let i=m?340+n*120:220+n*95;e.growTimer=setTimeout(()=>{e.visT=1,X(1600)},i)}),t&&(W=G),de(null),X(2e3)}i.current={toggleFocus:e=>de(K===e?null:e),clearFocus:()=>de(null)};function Z(){le(),!ce&&x>0&&S>0?fe():X(800)}let Q=null;if(typeof ResizeObserver<`u`){Q=new ResizeObserver(Z),Q.observe(e);let t=n&&n.current;t&&Q.observe(t)}le(),x>0&&S>0&&fe();let $=null,pe=[];return t?$=requestAnimationFrame(()=>{$=null,Z()}):($=requestAnimationFrame(()=>{$=null,Z()}),[120,280,520].forEach(e=>{pe.push(setTimeout(Z,e))})),()=>{q!=null&&cancelAnimationFrame(q),$!=null&&cancelAnimationFrame($),pe.forEach(clearTimeout),Q&&Q.disconnect(),v.forEach(e=>{clearTimeout(e.growTimer),e.leafTimers.forEach(clearTimeout),[e.pGlow,e.pCore].forEach(e=>e.remove()),e.leaves.forEach(e=>{e.pGlow.remove(),e.pCore.remove()})}),i.current=null}},[m,n,h]);function g(e){p(e),clearTimeout(s.current),s.current=setTimeout(()=>p(null),1700)}function _(n,r){if(t)return;let a=P[n];if(a?.kind===`cap`){let t=a;r?.currentTarget&&q(r.currentTarget);let n=t.cap,i=h.get(n.id)||`live`;if(i===`soon`){g(`${n.icon} ${n.label} — por lanzar`);return}if(i===`down`){g(`${n.icon} ${n.label} — no disponible sin conexión al servidor`);return}e&&e(n);return}i.current?.toggleFocus(n)}function v(n,r){if(t)return;q(n.currentTarget);let i=h.get(r.id)||`live`;if(i===`soon`){g(`${r.icon} ${r.label} — por lanzar`);return}if(i===`down`){g(`${r.icon} ${r.label} — no disponible sin conexión al servidor`);return}e&&e(r)}function y(){t||i.current?.clearFocus()}return(0,O.jsxs)(`div`,{ref:r,className:`arm-root${t?` arm-disabled`:``}`,"data-armtheme":c,"aria-label":`Capacidades de Chagra`,children:[(0,O.jsx)(`style`,{children:J}),(0,O.jsxs)(`svg`,{className:`arm-web`,"data-arm":`web`,preserveAspectRatio:`none`,"aria-hidden":`true`,children:[(0,O.jsxs)(`defs`,{children:[(0,O.jsxs)(`linearGradient`,{id:`arm-vena-grad`,"data-arm":`venaGrad`,gradientUnits:`userSpaceOnUse`,children:[(0,O.jsx)(`stop`,{offset:`0`,style:{stopColor:`rgb(var(--t-accent-rgb))`}}),(0,O.jsx)(`stop`,{offset:`0.45`,style:{stopColor:`var(--trunkC)`}}),(0,O.jsx)(`stop`,{offset:`1`,style:{stopColor:`var(--trunkC)`}})]}),(0,O.jsxs)(`linearGradient`,{id:`arm-under-grad`,"data-arm":`underGrad`,gradientUnits:`userSpaceOnUse`,children:[(0,O.jsx)(`stop`,{offset:`0`,stopColor:`#fff`}),(0,O.jsx)(`stop`,{offset:`1`,stopColor:`#fff`,stopOpacity:`0.55`})]}),(0,O.jsx)(`mask`,{id:`arm-under-mask`,"data-arm":`underMask`,maskUnits:`userSpaceOnUse`,style:{maskType:`alpha`},children:(0,O.jsx)(`rect`,{"data-arm":`underMaskRect`,fill:`url(#arm-under-grad)`})})]}),(0,O.jsxs)(`g`,{mask:`url(#arm-under-mask)`,children:[(0,O.jsxs)(`g`,{className:`arm-gtrunk`,"data-arm":`gTrunk`,children:[(0,O.jsx)(`path`,{className:`vnO`,"data-arm":`vnO`}),(0,O.jsx)(`path`,{className:`vnI`,"data-arm":`vnI`}),(0,O.jsx)(`path`,{className:`tkB`,"data-arm":`tkB`}),(0,O.jsx)(`path`,{className:`tkO`,"data-arm":`tkO`}),(0,O.jsx)(`path`,{className:`tkI`,"data-arm":`tkI`})]}),(0,O.jsx)(`g`,{className:`arm-gglow`,"data-arm":`gGlow`}),(0,O.jsx)(`g`,{className:`arm-gcore`,"data-arm":`gCore`})]})]}),(0,O.jsx)(`div`,{className:`arm-spores`,"aria-hidden":`true`,children:W.map((e,t)=>(0,O.jsx)(`i`,{className:`arm-sp`,style:{"--lx":e.lx,"--dur":e.dur,"--del":e.del,"--dx":e.dx,"--rise":e.rise}},t))}),(0,O.jsxs)(`div`,{className:`arm-nodes`,children:[P.map((e,t)=>{let n=e.kind===`cap`,r=n&&h.get(e.cap.id)||`live`,i=r===`down`;return(0,O.jsxs)(`div`,{className:`arm-node ${n?`arm-feat`:`arm-group`}${r===`soon`?` arm-soon`:``}${i?` arm-down`:``}`,role:`button`,tabIndex:i?-1:0,"aria-label":n&&i?`${e.label} (sin conexión al servidor)`:e.label,"aria-expanded":n?void 0:u===t,"aria-disabled":i||void 0,"data-arm-group":t,style:{opacity:0,"--pd":`${t*.5}s`},onClick:e=>_(t,e),onKeyDown:e=>K(e,()=>_(t,e)),children:[(0,O.jsx)(`div`,{className:`arm-orb`,children:(0,O.jsx)(`i`,{className:`arm-ic`,style:{"--swD":`${(4.2+z(t+2)*2.4).toFixed(1)}s`,"--swDel":`${(-z(t+11)*4).toFixed(1)}s`},children:e.icon})}),(0,O.jsxs)(`div`,{className:`arm-lbl`,children:[e.label,n&&i&&(0,O.jsxs)(O.Fragment,{children:[(0,O.jsx)(`br`,{}),(0,O.jsx)(`span`,{className:`arm-badge arm-badge-down`,children:`no disponible`})]})]})]},e.key)}),P.map((e,n)=>e.leaves.map((e,r)=>{let i=h.get(e.id)||`live`,a=i===`soon`,o=i===`down`,s=a||o;return(0,O.jsxs)(`div`,{className:`arm-node arm-leaf${a?` arm-soon`:``}${o?` arm-down`:``}`,role:`button`,tabIndex:s?-1:0,"aria-label":a?`${e.label} (por lanzar)`:o?`${e.label} (sin conexión al servidor)`:e.label,"aria-disabled":s||t||void 0,"data-arm-leaf":`${n}-${r}`,style:{display:`none`},onClick:t=>v(t,e),onKeyDown:t=>K(t,()=>v(t,e)),children:[(0,O.jsx)(`div`,{className:`arm-orb`,children:(0,O.jsx)(`i`,{className:`arm-ic`,style:{"--swD":`${(3.8+z(n*9+r)*2.5).toFixed(1)}s`,"--swDel":`${(-z(n+r+19)*4).toFixed(1)}s`},children:e.icon})}),(0,O.jsxs)(`div`,{className:`arm-lbl`,children:[e.label,a&&(0,O.jsxs)(O.Fragment,{children:[(0,O.jsx)(`br`,{}),(0,O.jsx)(`span`,{className:`arm-badge`,children:`por lanzar`})]}),o&&(0,O.jsxs)(O.Fragment,{children:[(0,O.jsx)(`br`,{}),(0,O.jsx)(`span`,{className:`arm-badge arm-badge-down`,children:`no disponible`})]})]})]},e.id)}))]}),(0,O.jsx)(`div`,{className:`arm-hint`,"data-arm":`hint`,children:`⸙ toque una rama`}),u!=null&&(0,O.jsxs)(`button`,{type:`button`,className:`arm-crumb`,onClick:y,children:[`‹ `,(0,O.jsx)(`span`,{children:P[u].icon}),(0,O.jsx)(`span`,{children:P[u].label})]}),(0,O.jsx)(`div`,{className:`arm-toast${f?` show`:``}`,role:`status`,children:f})]})}function ce(e,{onAsk:t,onNav:n,onPhoto:r}={}){if(!e)return!1;let i=e.heroRoute||e.route;return e.status===`soon`||!i||i.kind===`unavailable`?!1:i.kind===`ask`?(t?.(i.prompt),!0):i.kind===`nav`?(n?.(i.view),!0):i.kind===`photo`?(r?.(),!0):!1}export{p as a,f as c,_ as d,y as i,h as l,Y as n,u as o,b as r,d as s,ce as t,g as u};