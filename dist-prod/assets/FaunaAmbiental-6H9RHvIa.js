import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{Ci as t}from"./vendor-icons-C4vhLH2y.js";import{t as n}from"./vendor-react-Bl3EXeX9.js";import{t as r}from"./creatures-qDLlX5sf.js";var i=e(t(),1),a=[`lombriz`,`mariposa`,`escarabajo`],o=`abeja-angelita`;function s(e=o,t=r,n=[]){return Object.keys(t).filter(t=>t!==e&&!a.includes(t)&&!n.includes(t))}var c={alto:3,medio:2,bajo:1};function l(e=`alto`,t=!1){return t?0:c[e]??c.medio}var u=[`saltito`,`sena`,`guino`],d=[`jaguar`],f=e=>d.includes(e),p={entra:700,gesto:2600,sale:700},m=3200,h=2100,g=1300;function _(e,t){let n=Math.max(0,Math.min(t,e.length));return{cast:e,cursor:0,slots:Array.from({length:n},(e,t)=>({slug:null,fase:`descansa`,gesto:u[t%u.length],gen:t}))}}function v(e,t){let n=e.slots.slice(),r={...n[t]},i=e.cursor;if(r.fase===`descansa`){let a=new Set(n.filter((e,n)=>n!==t&&e.slug).map(e=>e.slug));for(let t=0;t<e.cast.length;t+=1){let n=e.cast[(i+t)%e.cast.length];if(!a.has(n)){r.slug=n,i=(i+t+1)%e.cast.length;break}}r.fase=`entra`,r.gen+=1,r.gesto=u[(r.gen+t)%u.length]}else r.fase===`entra`?r.fase=`gesto`:r.fase===`gesto`?r.fase=`sale`:r.fase=`descansa`;return n[t]=r,{...e,cursor:i,slots:n}}function y(e,t){return e.fase===`entra`?p.entra:e.fase===`gesto`?p.gesto:e.fase===`sale`?p.sale:m+t*h+e.gen%3*g}var b=[{estilo:{left:`5%`,top:`38%`},tam:46,lado:`izq`},{estilo:{right:`6%`,top:`32%`},tam:40,voltear:!0,lado:`der`},{estilo:{left:`34%`,top:`24%`},tam:32,lado:`bosque`}],x=e=>e.lado||(e.estilo?.right==null?`izq`:`der`),S=e(n(),1),C=`
.fauna-amb { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 2; }
.fauna-amb__slot {
  position: absolute;
  opacity: 0;
  transition: opacity 0.7s ease, transform 0.7s ease;
  will-change: opacity;
  filter: drop-shadow(0 2px 3px rgba(30, 30, 20, 0.22));
}
/* COHERENCIA: cada animal VIENE de algún lado y SE VA por donde vino.
   Del costado izquierdo/derecho: se desliza entrando a escena. Del bosque:
   asoma SUBIENDO tras la vegetación del horizonte. El estado oculto define
   la procedencia; el visible es siempre su puesto (transform none). */
.fauna-amb__slot[data-entrada='izq'] { transform: translateX(-160%) translateY(6px); }
.fauna-amb__slot[data-entrada='der'] { transform: translateX(160%) translateY(6px); }
.fauna-amb__slot[data-entrada='bosque'] { transform: translateY(60%) scale(0.92); }
/* El JAGUAR es el único que aparece MÁGICO: surge de la nada donde está,
   condensándose (escala desde chiquito, sin viaje) — espíritu del monte. */
.fauna-amb__slot[data-magico='1'] { transform: scale(0.35) rotate(-6deg); }
.fauna-amb__slot[data-fase='entra'],
.fauna-amb__slot[data-fase='gesto'] { opacity: 0.88; transform: none; }
.fauna-amb__slot[data-fase='sale'] { opacity: 0; }
.fauna-amb__gesto { transform-origin: 50% 100%; }
.fauna-amb__cara--voltea { transform: scaleX(-1); }
/* Los tres gestos de "¡venga, míreme!" — corren SOLO en la fase gesto. */
.fauna-amb__slot[data-fase='gesto'][data-gesto='saltito'] .fauna-amb__gesto {
  animation: fauna-amb-salto 1.3s cubic-bezier(0.34, 1.56, 0.64, 1) 2;
}
.fauna-amb__slot[data-fase='gesto'][data-gesto='sena'] .fauna-amb__gesto {
  animation: fauna-amb-sena 0.65s ease-in-out 4;
}
.fauna-amb__slot[data-fase='gesto'][data-gesto='guino'] .fauna-amb__gesto {
  animation: fauna-amb-guino 2.6s ease-in-out 1;
}
/* Saltito rubber-hose: dos brincos con squash & stretch y overshoot. */
@keyframes fauna-amb-salto {
  0%, 100% { transform: none; }
  25% { transform: translateY(-16%) scaleY(1.06) scaleX(0.96); }
  45% { transform: translateY(0) scaleY(0.92) scaleX(1.08); }
  62% { transform: translateY(-9%) scaleY(1.04); }
  80% { transform: translateY(0) scaleY(0.97); }
}
/* Seña con la manita: el cuerpo entero se mece desde los pies, llamando. */
@keyframes fauna-amb-sena {
  0%, 100% { transform: rotate(0deg); }
  35% { transform: rotate(-11deg); }
  70% { transform: rotate(8deg); }
}
/* Guiño/asomo coqueto: se ladea, se estira un pelito hacia usted y vuelve. */
@keyframes fauna-amb-guino {
  0%, 100% { transform: none; }
  22% { transform: rotate(-6deg) scale(1.06); }
  48% { transform: rotate(-6deg) scale(1.06) translateY(-4%); }
  74% { transform: rotate(3deg) scale(1.01); }
}
/* Gama baja: el gesto se apaga — queda apenas el fade (compañía sin costo). */
.fauna-amb[data-tier='bajo'] .fauna-amb__gesto { animation: none !important; }
/* Host inactivo (dolly/túnel en curso): todos se apagan de una. */
.fauna-amb[data-activo='0'] .fauna-amb__slot { opacity: 0 !important; }
/* Cinturón y tirantes: si el gate de reduced-motion no llegó por props. */
@media (prefers-reduced-motion: reduce) {
  .fauna-amb__slot, .fauna-amb__gesto { transition: none !important; animation: none !important; }
}
`;function w({central:e=o,excluir:t=void 0,tier:n=`alto`,reducedMotion:a=!1,activo:c=!0,puntos:u=b,registro:d=r,className:p=``}){let m=l(n,a),h=(0,i.useMemo)(()=>s(e,d,t||[]),[e,d,t]),[g,w]=(0,i.useState)(()=>_(h,m)),T=(0,i.useRef)(g),E=(0,i.useRef)(null),[D,O]=(0,i.useState)(!0),[k,A]=(0,i.useState)(()=>typeof document>`u`||!document.hidden);(0,i.useEffect)(()=>{T.current=_(h,m),w(T.current)},[h,m]),(0,i.useEffect)(()=>{if(typeof document>`u`)return;let e=()=>A(!document.hidden);return document.addEventListener(`visibilitychange`,e),()=>document.removeEventListener(`visibilitychange`,e)},[]),(0,i.useEffect)(()=>{let e=E.current;if(!e||typeof IntersectionObserver>`u`)return;let t=new IntersectionObserver(([e])=>O(e.isIntersecting));return t.observe(e),()=>t.disconnect()},[m]);let j=c&&D&&k&&!a&&m>0;return(0,i.useEffect)(()=>{if(!j||T.current.slots.length===0)return;let e=!0,t=Array(T.current.slots.length),n=r=>{t[r]=setTimeout(()=>{e&&(T.current=v(T.current,r),w(T.current),n(r))},y(T.current.slots[r],r))};return T.current.slots.forEach((e,t)=>n(t)),()=>{e=!1,t.forEach(clearTimeout)}},[j,h,m]),m===0||g.slots.length===0?null:(0,S.jsxs)(`div`,{ref:E,className:`fauna-amb${p?` ${p}`:``}`,"aria-hidden":`true`,"data-tier":n,"data-activo":c?`1`:`0`,children:[(0,S.jsx)(`style`,{children:C}),g.slots.map((e,t)=>{let n=u[t%u.length]||b[0],r=e.slug?d[e.slug]:null,i=r?.Component,a=f(e.slug);return(0,S.jsx)(`div`,{className:`fauna-amb__slot`,"data-fase":e.fase,"data-gesto":e.gesto,"data-slug":e.slug||void 0,"data-entrada":x(n),"data-magico":a?`1`:void 0,style:n.estilo,children:i&&(0,S.jsx)(`div`,{className:`fauna-amb__gesto`,children:(0,S.jsx)(`div`,{className:n.voltear?`fauna-amb__cara fauna-amb__cara--voltea`:`fauna-amb__cara`,children:(0,S.jsx)(i,{size:n.tam??40,animated:!1,title:r.nombre})})})},t)})]})}export{w as t};