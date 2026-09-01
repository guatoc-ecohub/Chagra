import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{Ri as t}from"./vendor-icons-CAOH8z0e.js";import{t as n}from"./vendor-react-C-6LStLo.js";import{n as r,r as i}from"./deviceTier-B-jDHPew.js";import{A as a,T as o,b as s,g as c,u as l,w as u,x as d,y as f}from"./vendor-three-ShL4y-d-.js";import{t as p}from"./atmosferaMadre-D2ajRvZ4.js";import{i as m,n as h,r as g,t as _}from"./pisosTermicos-DFjvlT97.js";var v=e(t(),1),y=e(n(),1),b=(e,t,n)=>e+(t-e)*n,x={[h.SUYO]:.42,[h.COLINDANTE]:.24,[h.OTRO]:.12,[h.NEUTRO]:.18},S={[h.SUYO]:`Usted está aquí`,[h.COLINDANTE]:`Colinda con el suyo`,[h.OTRO]:`Explórelo — no es de su piso`,[h.NEUTRO]:``};function ee({piso:e,geo:t,reducedMotion:n,animar:r,resaltado:i,mostrarEtiqueta:a,etiquetaDistancia:o,onSeleccionPiso:s}){let c=(0,v.useRef)(null),l=(0,v.useRef)(null),[u,p]=(0,v.useState)(!1),m=x[e.estado]??x[h.NEUTRO],g=Math.min(.9,m+((u?.12:0)+(i?.14:0))),_=r&&e.esMio&&!n;d(e=>{if(!_)return;let t=e.clock.elapsedTime,n=(Math.sin(t*1.4)+1)*.5;if(c.current&&(c.current.opacity=g+n*.14),l.current){let e=1+n*.015;l.current.scale.set(e,1,e)}});let b=t=>{t&&typeof t.stopPropagation==`function`&&t.stopPropagation(),s?.(e)};return(0,y.jsxs)(`group`,{position:[0,t.centerY,0],children:[(0,y.jsxs)(`mesh`,{onPointerDown:b,onPointerOver:e=>{e.stopPropagation(),p(!0)},onPointerOut:e=>{e.stopPropagation(),p(!1)},children:[(0,y.jsx)(`cylinderGeometry`,{args:[t.radioTop,t.radioBottom,t.altura,t.segmentos,1,!0]}),(0,y.jsx)(`meshBasicMaterial`,{ref:c,color:e.color,transparent:!0,opacity:g,side:2,depthWrite:!1})]}),(e.esMio||i)&&(0,y.jsxs)(`mesh`,{ref:l,position:[0,t.altura/2,0],rotation:[-Math.PI/2,0,0],children:[(0,y.jsx)(`torusGeometry`,{args:[t.radioTop,t.radioTop*.02+.012,6,t.segmentos]}),(0,y.jsx)(`meshBasicMaterial`,{color:e.color,transparent:!0,opacity:.9,depthWrite:!1})]}),a&&(0,y.jsx)(f,{position:[t.radioTop,0,0],center:!0,distanceFactor:o,zIndexRange:[24,0],style:{pointerEvents:`none`},children:(0,y.jsxs)(`button`,{type:`button`,onClick:b,onPointerEnter:()=>p(!0),onPointerLeave:()=>p(!1),"data-piso":e.id,"data-estado":e.estado,style:{pointerEvents:`auto`,cursor:`pointer`,border:`none`,borderRadius:10,padding:`4px 9px`,font:`600 12px/1.15 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,color:e.esMio?`#241a10`:`#3a3226`,background:e.esMio?`rgba(255,251,240,0.94)`:`rgba(250,246,236,0.8)`,boxShadow:e.esMio?`0 2px 8px rgba(60,44,20,0.28)`:`0 1px 4px rgba(60,44,20,0.16)`,opacity:e.estado===h.OTRO?.82:1,whiteSpace:`nowrap`,transform:`translateX(${e.esMio?6:2}px)`},children:[(0,y.jsx)(`span`,{"aria-hidden":`true`,style:{display:`inline-block`,width:8,height:8,borderRadius:3,marginRight:6,verticalAlign:`baseline`,background:e.color}}),(0,y.jsx)(`span`,{style:{fontWeight:700},children:e.nombre}),(0,y.jsxs)(`span`,{style:{opacity:.66,fontWeight:500},children:[`  `,e.min,`–`,e.max,` m`]}),S[e.estado]?(0,y.jsx)(`span`,{style:{display:`block`,marginTop:1,fontSize:10,fontWeight:e.esMio?700:500,opacity:.82},children:S[e.estado]}):null]})})]})}function C({pisoUsuario:e=null,tier:t=`alto`,reducedMotion:n=!1,onSeleccionPiso:a,centro:o=[0,0,0],alturaCumbre:s=5,radioBase:c=4,radioCumbre:l=.35,holgura:u=1.06,cotaMaxima:d=_,mostrarEtiquetas:f=!0,pisoActivo:p=null}){let{pisos:h}=(0,v.useMemo)(()=>m(e),[e]),x=(0,v.useMemo)(()=>{let e=r(t)?.segmentosTerreno??40;return Math.max(24,Math.min(48,e))},[t]),S=(0,v.useMemo)(()=>{let e=e=>b(c,l,e)*u,t=e=>e*s,n=Math.max(.05,s*.02);return h.map(r=>{let i=g(r.min,d),a=g(r.max,d),o=t(i),s=t(a),c=Math.max(n,s-o);return{piso:r,geo:{centerY:(o+s)/2,altura:c,radioBottom:e(i),radioTop:e(a),segmentos:x}}})},[h,c,l,u,s,d,x]),C=i(t),w=Math.max(4,s*1.6);return(0,y.jsx)(`group`,{position:o,name:`pisos-termicos-bandas`,children:S.map(({piso:e,geo:t})=>(0,y.jsx)(ee,{piso:e,geo:t,reducedMotion:n,animar:C,resaltado:p===e.id,mostrarEtiqueta:f,etiquetaDistancia:w,onSeleccionPiso:a},e.id))})}var w=1500,T=160,te=.7,E=.5;function D(e,t){return t?T:e===`bajo`?Math.round(w*te):w}var O=[{claves:[`nieve`,`nival`,`glaciar`,`simmonds`],nombre:`la nieve perpetua`,a:`#eef4f8`,b:`#9fb8c8`},{claves:[`superparamo`],nombre:`el superpáramo`,a:`#c9d2cf`,b:`#75878a`},{claves:[`paramo`,`frailejon`],nombre:`el páramo`,a:`#c7bb6e`,b:`#5f6b45`},{claves:[`niebla`,`frio`,`bosque de niebla`,`bosque_niebla`,`nublado`],nombre:`el bosque de niebla`,a:`#8fae9a`,b:`#33544a`},{claves:[`templado`,`selva`,`humedo`,`cafetero`,`cafe`],nombre:`la selva húmeda`,a:`#7fae5f`,b:`#2c5a33`},{claves:[`calido`,`bosque seco`,`bosque_seco`,`seco`],nombre:`el bosque seco`,a:`#e8c675`,b:`#8a6a33`},{claves:[`playa`,`mar`,`palomino`,`costa`,`litoral`],nombre:`Palomino`,a:`#8fd0d8`,b:`#2a7c8f`}],k={nombre:`su destino`,a:`#f2c063`,b:`#1d4030`};function A(e){return String(e??``).toLowerCase().normalize(`NFD`).replace(/[\u0300-\u036f]/g,``)}function j(e){let t=A(e);return t&&O.find(e=>e.claves.some(e=>t.includes(e)))||k}function M(e){return e<.5?4*e*e*e:1-(-2*e+2)**3/2}var N=`
.tsm {
  position: fixed;
  inset: 0;
  z-index: 46; /* sobre el velo original (z 40) y el kit (z 44) */
  pointer-events: none;
  overflow: hidden;
}

/* Columna-transecto de la Sierra (300vh): nieve arriba → mar de Palomino
 * abajo, con la franja blanda del bosque de niebla baked en un segundo
 * gradiente. Bajar la ladera = la columna sube ante la cámara. */
.tsm__bandas {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 300vh;
  opacity: 0;
  background:
    linear-gradient(180deg,
      rgba(255, 255, 255, 0) 40%,
      rgba(255, 255, 255, 0.38) 46%,
      rgba(255, 255, 255, 0.55) 50%,
      rgba(255, 255, 255, 0.38) 54%,
      rgba(255, 255, 255, 0) 60%),
    linear-gradient(180deg,
      #f2f7fa 0%, #dfe9ef 6%,
      #aebfc0 12%, #8b9a92 19%,
      #b8b076 27%, #7d7f4e 35%,
      #5d7f6b 43%, #35594d 53%,
      #3f7040 63%, #2f5c33 72%,
      #8a6a33 80%, #caa45c 88%,
      #7fc4cd 94%, #2a7c8f 100%);
  animation:
    tsm-cubre var(--tsm-ms) ease-in-out both,
    tsm-desciende var(--tsm-ms) cubic-bezier(0.55, 0, 0.35, 1) both;
  will-change: transform, opacity;
}

.tsm[data-direccion='subir'] .tsm__bandas {
  animation-name: tsm-cubre, tsm-asciende;
  animation-timing-function: ease-in-out, cubic-bezier(0.4, 0, 0.3, 1);
}

@keyframes tsm-cubre {
  0% { opacity: 0; }
  30%, 70% { opacity: 1; }
  100% { opacity: 0; }
}

/* Recorrido: con -200vh el borde inferior de la columna queda en 100vh, así
 * la pantalla sigue tapada por bandas durante toda la meseta. */
@keyframes tsm-desciende {
  0% { transform: translateY(0); }
  100% { transform: translateY(-200vh); }
}

@keyframes tsm-asciende {
  0% { transform: translateY(-200vh); }
  100% { transform: translateY(0); }
}

/* Beat de llegada: velo radial con el tinte del piso destino que respira en
 * la meseta — el "ya llegó" antes de revelar el diorama. */
.tsm__tinte {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 120% at 50% 45%, var(--tsm-a) 0%, var(--tsm-b) 82%);
  opacity: 0;
  animation: tsm-beat var(--tsm-ms) ease-in-out both;
  will-change: opacity;
}

@keyframes tsm-beat {
  0%, 28% { opacity: 0; }
  45%, 58% { opacity: 0.85; }
  76%, 100% { opacity: 0; }
}

/* Nubes de la franja de niebla en paralaje (adorno tier alto/medio):
 * cruzan más rápido que las bandas — capa cercana del descenso. */
.tsm__nube {
  position: absolute;
  left: 50%;
  width: 72vw;
  height: 24vh;
  margin-left: -36vw;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0));
  opacity: 0;
  animation: tsm-nube calc(var(--tsm-ms) * 0.55) cubic-bezier(0.3, 0, 0.6, 1) both;
  will-change: transform, opacity;
}

.tsm__nube--2 {
  width: 54vw;
  margin-left: -20vw;
  animation-delay: calc(var(--tsm-ms) * 0.16);
}

.tsm__nube--3 {
  width: 62vw;
  margin-left: -44vw;
  animation-delay: calc(var(--tsm-ms) * 0.3);
}

.tsm[data-direccion='subir'] .tsm__nube {
  animation-direction: reverse;
}

@keyframes tsm-nube {
  0% { transform: translateY(112vh) scale(0.8); opacity: 0; }
  22% { opacity: 0.9; }
  100% { transform: translateY(-46vh) scale(1.3); opacity: 0; }
}

/* Viñeta de velocidad (adorno): oscurece bordes durante el tramo rápido. */
.tsm__vineta {
  position: absolute;
  inset: 0;
  background: radial-gradient(90% 90% at 50% 50%, rgba(0, 0, 0, 0) 55%, rgba(8, 20, 24, 0.55) 100%);
  opacity: 0;
  animation: tsm-vineta var(--tsm-ms) ease-in-out both;
  will-change: opacity;
}

@keyframes tsm-vineta {
  0%, 8% { opacity: 0; }
  28%, 66% { opacity: 0.75; }
  88%, 100% { opacity: 0; }
}

/* Destello de llegada (solo tier alto): rompe las nubes justo en la mitad. */
.tsm__destello {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 90vmax;
  height: 90vmax;
  margin: -45vmax 0 0 -45vmax;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 250, 236, 0.95), rgba(255, 250, 236, 0));
  opacity: 0;
  animation: tsm-destello var(--tsm-ms) ease-out both;
  will-change: transform, opacity;
}

@keyframes tsm-destello {
  0%, 40% { opacity: 0; transform: scale(0.55); }
  50% { opacity: 0.9; transform: scale(1); }
  66%, 100% { opacity: 0; transform: scale(1.3); }
}

.tsm__txt {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12vh;
  margin: 0;
  text-align: center;
  color: #fdf8ec;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 8px rgba(10, 24, 20, 0.65);
  opacity: 0;
  animation: tsm-txt var(--tsm-ms) ease-in-out both;
}

@keyframes tsm-txt {
  0%, 12% { opacity: 0; }
  32%, 68% { opacity: 1; }
  90%, 100% { opacity: 0; }
}

/* ------------------- reduced motion = corte con fade -------------------- */
/* Via prop: cubierta YA opaca (el swap de mitad ocurre bajo tapa) que se
 * desvanece corto sobre la escena nueva. */
.tsm__corte {
  position: absolute;
  inset: 0;
  background: var(--tsm-b);
  animation: tsm-corte var(--tsm-ms) linear both;
}

@keyframes tsm-corte {
  0%, 62% { opacity: 1; }
  100% { opacity: 0; }
}

/* Red de seguridad si el host no pasó la prop pero el sistema pide calma. */
@media (prefers-reduced-motion: reduce) {
  .tsm__bandas,
  .tsm__nube,
  .tsm__tinte,
  .tsm__destello,
  .tsm__vineta,
  .tsm__txt {
    display: none;
  }

  .tsm::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--tsm-b);
    animation: tsm-corte var(--tsm-ms) linear both;
  }
}
`;function P({activa:e=!1,direccion:t=`bajar`,pisoDestino:n=``,tier:r=`medio`,reducedMotion:i=!1,onMitad:a,onFin:o,camaraRef:s=null,caidaCamara:c=1.4,colorA:l,colorB:u,etiqueta:d}){let f=(0,v.useRef)(a),p=(0,v.useRef)(o);if((0,v.useEffect)(()=>{f.current=a,p.current=o}),(0,v.useEffect)(()=>{if(!e)return;let t=D(r,i),n=!1,a=!1,o=setTimeout(()=>{n||(n=!0,f.current?.())},Math.round(t*E)),s=setTimeout(()=>{a||(a=!0,p.current?.())},t);return()=>{n=!0,a=!0,clearTimeout(o),clearTimeout(s)}},[e,t,r,i]),(0,v.useEffect)(()=>{if(!e||i||!s)return;let n=s.current;if(!n||!n.position||typeof n.position.y!=`number`)return;let a=Math.round(D(r,!1)*E),o=n.position.y,l=typeof n.fov==`number`?n.fov:null,u=t!==`subir`,d=()=>{typeof n.updateProjectionMatrix==`function`&&n.updateProjectionMatrix()},f=()=>{n.position.y=o,l!=null&&(n.fov=l,d())},p=0,m=0,h=e=>{m||=e;let t=Math.min(1,(e-m)/a);if(t>=1){f();return}let r=M(t);n.position.y=o+(u?-1:1)*c*r,l!=null&&(n.fov=l*(1+(u?-.14:.1)*r),d()),p=requestAnimationFrame(h)};return p=requestAnimationFrame(h),()=>{cancelAnimationFrame(p),f()}},[e,t,r,i,s,c]),!e)return null;let m=j(n),h=D(r,i),g=r!==`bajo`&&!i,_=t!==`subir`,b=d??(_?`Descendiendo a ${m.nombre}…`:`Subiendo a la Sierra…`);return(0,y.jsxs)(`div`,{className:`tsm`,"data-direccion":_?`bajar`:`subir`,"data-tier":r,"data-reducida":i?`1`:`0`,style:{"--tsm-a":l??m.a,"--tsm-b":u??m.b,"--tsm-ms":`${h}ms`},role:`status`,"aria-live":`polite`,"data-testid":`tsm`,children:[(0,y.jsx)(`style`,{children:N}),i?(0,y.jsx)(`div`,{className:`tsm__corte`,"aria-hidden":`true`}):(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)(`div`,{className:`tsm__bandas`,"aria-hidden":`true`}),g&&(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)(`div`,{className:`tsm__nube tsm__nube--1`,"aria-hidden":`true`}),(0,y.jsx)(`div`,{className:`tsm__nube tsm__nube--2`,"aria-hidden":`true`}),(0,y.jsx)(`div`,{className:`tsm__nube tsm__nube--3`,"aria-hidden":`true`}),(0,y.jsx)(`div`,{className:`tsm__vineta`,"aria-hidden":`true`})]}),(0,y.jsx)(`div`,{className:`tsm__tinte`,"aria-hidden":`true`}),r===`alto`&&(0,y.jsx)(`div`,{className:`tsm__destello`,"aria-hidden":`true`}),(0,y.jsx)(`p`,{className:`tsm__txt`,children:b})]})]})}var F=5,I=-3,ne=22,L=20,R=4.15,z=(e,t,n)=>Math.min(n,Math.max(t,e)),B=(e,t,n)=>{let r=z((n-e)/(t-e),0,1);return r*r*(3-2*r)};function V(e,t,n,r,i,a){let o=e-n,s=t-r;return Math.exp(-(o*o/(2*i*i)+s*s/(2*a*a)))}function H(e,t){return Math.sin(e*.9+t*.7)*.5+Math.sin(e*1.7-t*1.3+2.1)*.28+Math.sin(e*2.9+t*2.3+4.7)*.16}function U(e,t){if(t<I-.2)return-.15;let n=z((t-I)/(10-I),0,1),r=n**.9*F*.42;return r+=V(e,t,.6,3.8,1.9,2.4)*F*.4,r+=V(e,t,-1.4,4.4,1.8,2.2)*F*.38,r+=V(e,t,2.9,2.9,1.7,2.1)*F*.42,r+=V(e,t,-4.5,.6,3,3)*F*.16,r+=V(e,t,5,-.4,3,3)*F*.13,r+=H(e,t)*F*.07*n,r*=B(I-1.2,-2,t),r}var W={x:-.4,y:5,z:4.1},G={x:2.9,y:4.36,z:2.9},K={x:5,y:.2,z:-2.85},q=[{tope:.28,c:new a(`#ddc78d`)},{tope:.95,c:new a(`#b3a955`)},{tope:1.75,c:new a(`#437233`)},{tope:2.6,c:new a(`#5c8a69`)},{tope:3.45,c:new a(`#94975a`)},{tope:R,c:new a(`#a58f68`)},{tope:1/0,c:new a(`#f2ead6`)}];function J(e,t){let n=0;for(;n<q.length-1&&e>q[n].tope;)n++;if(n===0)return t.copy(q[0].c);let r=q[n-1].tope,i=B(r-.16,r+.16,e);return t.lerpColors(q[n-1].c,q[n].c,i)}var Y=[{c:`#f2ead6`,t:`Nieve perpetua`},{c:`#a58f68`,t:`Superpáramo`},{c:`#94975a`,t:`Páramo y frailejones`},{c:`#5c8a69`,t:`Bosque de niebla`},{c:`#437233`,t:`Selva húmeda`},{c:`#b3a955`,t:`Bosque seco`},{c:`#ddc78d`,t:`Playa y costa`}],X={calido:.6,templado:1.4,frio:2.2,paramo:3,superparamo:3.9,nival:4.6};function re(e,t,n){let r=e+1,i=t+1,s=new Float32Array(r*i*3),c=new Float32Array(r*i*3),l=new a,d=0;for(let n=0;n<i;n++){let i=-20/2+L*n/t;for(let t=0;t<r;t++){let n=-22/2+ne*t/e,r=U(n,i);s[d]=n,s[d+1]=r,s[d+2]=i,J(r,l),c[d]=l.r,c[d+1]=l.g,c[d+2]=l.b,d+=3}}let f=[];for(let n=0;n<t;n++)for(let t=0;t<e;t++){let e=n*r+t,i=e+1,a=e+r,o=a+1;f.push(e,a,i,i,a,o)}let p=new o;return p.setAttribute(`position`,new u(s,3)),p.setAttribute(`color`,new u(c,3)),p.setIndex(f),n&&(p=p.toNonIndexed()),p.computeVertexNormals(),p}function ie({reducedMotion:e,conNiebla:t}){let n=(0,v.useRef)(null);return d(t=>{e||!n.current||(n.current.material.opacity=.28+Math.sin(t.clock.elapsedTime*.4)*.06)}),(0,y.jsxs)(`group`,{children:[(0,y.jsxs)(`mesh`,{position:[0,.02,-9],rotation:[-Math.PI/2,0,0],children:[(0,y.jsx)(`planeGeometry`,{args:[46,20]}),(0,y.jsx)(`meshLambertMaterial`,{color:`#4c93ab`,transparent:!0,opacity:.96})]}),t&&(0,y.jsxs)(`mesh`,{ref:n,position:[-3.6,.05,-6.5],rotation:[-Math.PI/2,0,0],children:[(0,y.jsx)(`planeGeometry`,{args:[7,12]}),(0,y.jsx)(`meshBasicMaterial`,{color:`#ffe6ad`,transparent:!0,opacity:.3,depthWrite:!1})]})]})}function ae({cuantas:e,reducedMotion:t}){let n=(0,v.useRef)(null),r=(0,v.useMemo)(()=>{let t=[];for(let n=0;n<e;n++){let r=-7+14*(n+.5)/e+Math.sin(n*2.3)*1.4,i=-1.8,a=99;for(let e=-2.5;e<6;e+=.25){let t=Math.abs(U(r,e)-(1.9+n%3*.22));t<a&&(a=t,i=e)}t.push({key:`n${n}`,base:[r,U(r,i)+.35,i],esc:.7+n*37%10/16,fase:n*1.7%(Math.PI*2)})}return t},[e]);return d(e=>{if(t||!n.current)return;let i=e.clock.elapsedTime;n.current.children.forEach((e,t)=>{e.position.x=r[t].base[0]+Math.sin(i*.045+r[t].fase)*.9})}),(0,y.jsx)(`group`,{ref:n,children:r.map(e=>(0,y.jsxs)(`group`,{position:e.base,scale:[e.esc*1.9,e.esc*.5,e.esc*1.2],children:[(0,y.jsxs)(`mesh`,{children:[(0,y.jsx)(`sphereGeometry`,{args:[.6,9,7]}),(0,y.jsx)(`meshBasicMaterial`,{color:`#fbf4e6`,transparent:!0,opacity:.82,depthWrite:!1})]}),(0,y.jsxs)(`mesh`,{position:[.5,.05,.1],scale:.7,children:[(0,y.jsx)(`sphereGeometry`,{args:[.6,8,6]}),(0,y.jsx)(`meshBasicMaterial`,{color:`#fdf8ee`,transparent:!0,opacity:.72,depthWrite:!1})]})]},e.key))})}function oe(){return(0,y.jsxs)(`group`,{position:[-13,4.4,-6],children:[(0,y.jsxs)(`mesh`,{children:[(0,y.jsx)(`circleGeometry`,{args:[1.15,32]}),(0,y.jsx)(`meshBasicMaterial`,{color:`#fff2cf`,transparent:!0,opacity:.98,depthWrite:!1,side:2})]}),(0,y.jsxs)(`mesh`,{position:[0,0,-.05],children:[(0,y.jsx)(`circleGeometry`,{args:[2.1,32]}),(0,y.jsx)(`meshBasicMaterial`,{color:`#ffd98f`,transparent:!0,opacity:.4,depthWrite:!1,side:2})]}),(0,y.jsxs)(`mesh`,{position:[0,0,-.1],children:[(0,y.jsx)(`circleGeometry`,{args:[3.6,32]}),(0,y.jsx)(`meshBasicMaterial`,{color:`#f7c66b`,transparent:!0,opacity:.18,depthWrite:!1,side:2})]})]})}function se(){return(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)(`hemisphereLight`,{intensity:.85,color:p.cielo,groundColor:p.suelo}),(0,y.jsx)(`ambientLight`,{intensity:.32,color:`#fff1d6`}),(0,y.jsx)(`directionalLight`,{position:[-12,6,-4],intensity:1.25,color:p.luz}),(0,y.jsx)(`directionalLight`,{position:[8,4,10],intensity:.28,color:p.relleno})]})}function Z({pos:e,texto:t,sub:n,distancia:r=12,alto:i=.6}){return(0,y.jsxs)(`group`,{position:e,children:[(0,y.jsxs)(`mesh`,{position:[0,.04,0],children:[(0,y.jsx)(`sphereGeometry`,{args:[.055,10,8]}),(0,y.jsx)(`meshBasicMaterial`,{color:`#fff3cf`,depthWrite:!1})]}),(0,y.jsxs)(`mesh`,{position:[0,i/2,0],children:[(0,y.jsx)(`cylinderGeometry`,{args:[.014,.014,i,6]}),(0,y.jsx)(`meshBasicMaterial`,{color:`#5a4326`,transparent:!0,opacity:.65,depthWrite:!1})]}),(0,y.jsx)(f,{center:!0,position:[0,i+.12,0],distanceFactor:r,zIndexRange:[30,10],style:{pointerEvents:`none`},children:(0,y.jsx)(`div`,{className:`vsierra-rotulo`,"aria-hidden":`true`,children:(0,y.jsxs)(`span`,{className:`vsierra-rotulo__txt`,children:[t,n?(0,y.jsx)(`em`,{className:`vsierra-rotulo__sub`,children:n}):null]})})})]})}function Q({piso:e}){let t=(0,v.useMemo)(()=>{let t=X[e];if(t==null)return null;let n=-4.2,r=-2.5,i=99;for(let e=-2.7;e<8;e+=.2){let a=Math.abs(U(n,e)-t);a<i&&(i=a,r=e)}return[n,U(n,r),r]},[e]);return t?(0,y.jsxs)(`group`,{position:t,children:[(0,y.jsxs)(`mesh`,{position:[0,1.4,0],children:[(0,y.jsx)(`cylinderGeometry`,{args:[.04,.32,2.8,10,1,!0]}),(0,y.jsx)(`meshBasicMaterial`,{color:`#fff0c2`,transparent:!0,opacity:.34,side:2,depthWrite:!1})]}),(0,y.jsxs)(`mesh`,{position:[0,.06,0],rotation:[-Math.PI/2,0,0],children:[(0,y.jsx)(`ringGeometry`,{args:[.28,.42,24]}),(0,y.jsx)(`meshBasicMaterial`,{color:`#ffdf9c`,transparent:!0,opacity:.85,depthWrite:!1})]}),(0,y.jsx)(f,{center:!0,distanceFactor:16,position:[0,3,0],zIndexRange:[40,20],style:{pointerEvents:`none`},children:(0,y.jsx)(`div`,{className:`vsierra-aqui`,"aria-hidden":`true`,children:`Aquí está usted`})})]}):null}function ce(){return(0,y.jsx)(`group`,{position:[0,.4,-8.5],children:(0,y.jsx)(f,{center:!0,distanceFactor:26,zIndexRange:[20,5],style:{pointerEvents:`none`},children:(0,y.jsx)(`p`,{className:`vsierra-credito vsierra-credito--3d`,children:`Territorio ancestral y sagrado de los pueblos Kogui, Arhuaco (Iku), Wiwa y Kankuamo — el Corazón del Mundo, dentro de la Línea Negra.`})})})}function $({tier:e=`alto`,reducedMotion:t=!1,pisoUsuario:n,luces:i=!0,atmosfera:a=!0,credito:o=!0,onSeleccionPiso:s,pisoActivo:c=null}){let l=r(e),u=(0,v.useMemo)(()=>re(l.segmentosTerreno,l.segmentosTerreno,l.flatShading),[l.segmentosTerreno,l.flatShading]);(0,v.useEffect)(()=>()=>u.dispose(),[u]);let d=e===`alto`?7:e===`medio`?5:3;return(0,y.jsxs)(y.Fragment,{children:[a&&(0,y.jsx)(`color`,{attach:`background`,args:[p.fondo]}),a&&l.fog&&(0,y.jsx)(`fogExp2`,{attach:`fog`,args:[p.niebla,.028]}),i&&(0,y.jsx)(se,{}),(0,y.jsx)(oe,{}),(0,y.jsx)(`mesh`,{geometry:u,children:(0,y.jsx)(`meshLambertMaterial`,{vertexColors:!0,flatShading:l.flatShading})}),(0,y.jsx)(ie,{reducedMotion:t,conNiebla:l.fog}),(0,y.jsx)(ae,{cuantas:d,reducedMotion:t}),(0,y.jsx)(Z,{pos:[W.x,W.y,W.z],texto:`Cristóbal Colón · Simón Bolívar`,sub:`5.775 m`,distancia:13,alto:1.25}),(0,y.jsx)(Z,{pos:[G.x,G.y,G.z],texto:`Pico Simmonds`,sub:`5.560 m`,distancia:12,alto:.6}),(0,y.jsx)(Z,{pos:[K.x,K.y,K.z],texto:`Palomino`,sub:`Caribe · 0 m`,distancia:11,alto:.45}),n&&(0,y.jsx)(Q,{piso:n}),(0,y.jsx)(C,{pisoUsuario:n,tier:e,reducedMotion:t,alturaCumbre:F,radioBase:4,radioCumbre:.35,onSeleccionPiso:s,pisoActivo:c}),o&&(0,y.jsx)(ce,{})]})}var le=`
.vsierra-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${p.fondo}; }
.vsierra-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.vsierra-canvas--lista { opacity: 1; }
.vsierra-rotulo { white-space: nowrap; font: 600 0.78rem/1.15 system-ui, sans-serif; color: #402c16; padding: 0.16rem 0.5rem; border-radius: 999px; background: rgba(255,248,233,0.82); box-shadow: 0 1px 5px rgba(60,42,24,0.22); }
.vsierra-rotulo__txt { display: inline-flex; align-items: baseline; gap: 0.3rem; }
.vsierra-rotulo__sub { font-weight: 500; font-style: normal; opacity: 0.72; font-size: 0.9em; }
.vsierra-aqui { padding: 0.2rem 0.55rem; border-radius: 999px; background: rgba(64,44,22,0.82); color: #fff3d6; font: 600 0.72rem/1.1 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 8px rgba(30,18,6,0.3); }
.vsierra-credito { margin: 0; max-width: min(90vw, 40rem); text-align: center; font: 500 0.78rem/1.4 system-ui, sans-serif; color: #f4ecdd; }
.vsierra-credito--3d { padding: 0.4rem 0.8rem; border-radius: 0.7rem; background: rgba(24,16,7,0.44); backdrop-filter: blur(3px); }
.vsierra-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.vsierra-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #3a2a18; text-shadow: 0 1px 4px rgba(255,246,224,0.85); font: 700 1.15rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.vsierra-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.78; margin-top: 0.15rem; }
.vsierra-clave { align-self: flex-end; margin: 0 0.8rem 0.55rem; display: flex; flex-direction: column; gap: 0.24rem; padding: 0.5rem 0.65rem; border-radius: 0.7rem; background: rgba(255,248,233,0.72); backdrop-filter: blur(3px); box-shadow: 0 4px 14px rgba(60,42,24,0.16); }
.vsierra-clave li { display: flex; align-items: center; gap: 0.42rem; list-style: none; font: 500 0.72rem/1.1 system-ui, sans-serif; color: #3a2a18; }
.vsierra-clave b { width: 12px; height: 12px; border-radius: 3px; flex: 0 0 auto; box-shadow: inset 0 0 0 1px rgba(60,42,24,0.18); }
.vsierra-clave ul { margin: 0; padding: 0; }
.vsierra-abajo { display: flex; flex-direction: column; align-items: stretch; }
.vsierra-pie { pointer-events: none; padding: 0 1rem 0.85rem; display: flex; justify-content: center; }
.vsierra-pie p { margin: 0; max-width: 42rem; text-align: center; padding: 0.42rem 0.85rem; border-radius: 0.7rem; background: rgba(24,16,7,0.5); backdrop-filter: blur(3px); color: #f4ecdd; font: 500 0.76rem/1.4 system-ui, sans-serif; }
@media (prefers-reduced-motion: reduce) { .vsierra-canvas { transition: none; } }
`;function ue({tier:e=`alto`,reducedMotion:t=!1,pisoUsuario:n,onSeleccionPiso:i,className:a=``}){let[o,u]=(0,v.useState)(!1),[d,f]=(0,v.useState)(null),[p,m]=(0,v.useState)(null),h=r(e),g=(0,v.useCallback)(e=>{f(e.id),m({piso:e,activa:!0})},[]),_=(0,v.useCallback)(()=>{p?.piso&&i?.(p.piso)},[i,p]),b=(0,v.useCallback)(()=>m(null),[]);return(0,y.jsxs)(`section`,{className:`vsierra-root${a?` ${a}`:``}`,"data-tier":e,"aria-label":`Vista global de la Sierra Nevada de Santa Marta: portada y mapa por pisos térmicos`,children:[(0,y.jsx)(`style`,{children:le}),(0,y.jsxs)(s,{className:`vsierra-canvas${o?` vsierra-canvas--lista`:``}`,dpr:h.dpr,gl:{antialias:h.antialias,powerPreference:`high-performance`},camera:{position:[-1.5,5.2,-11],fov:48},frameloop:t?`demand`:`always`,onCreated:()=>u(!0),children:[(0,y.jsx)($,{tier:e,reducedMotion:t,pisoUsuario:n,credito:!1,onSeleccionPiso:g,pisoActivo:d}),(0,y.jsx)(c,{makeDefault:!0,enablePan:!1,enableZoom:!0,minDistance:9,maxDistance:16,target:[0,2.3,2.5],minPolarAngle:1.05,maxPolarAngle:1.45,minAzimuthAngle:-Math.PI,maxAzimuthAngle:-2.75,enableDamping:!0,dampingFactor:.08,autoRotate:!t,autoRotateSpeed:.09}),(0,y.jsx)(l,{pixelated:!0})]}),(0,y.jsx)(P,{activa:p?.activa??!1,pisoDestino:p?.piso.id,tier:e,reducedMotion:t,onMitad:_,onFin:b}),(0,y.jsxs)(`div`,{className:`vsierra-chrome`,children:[(0,y.jsxs)(`h2`,{className:`vsierra-titulo`,children:[`Sierra Nevada de Santa Marta`,(0,y.jsx)(`small`,{children:`Del Caribe a la nieve: todos los pisos térmicos en un solo macizo`})]}),(0,y.jsxs)(`div`,{className:`vsierra-abajo`,children:[(0,y.jsx)(`ul`,{className:`vsierra-clave`,"aria-label":`Pisos térmicos, de la nieve al mar`,children:Y.map(e=>(0,y.jsxs)(`li`,{children:[(0,y.jsx)(`b`,{style:{background:e.c},"aria-hidden":`true`}),e.t]},e.t))}),(0,y.jsx)(`div`,{className:`vsierra-pie`,children:(0,y.jsx)(`p`,{role:`contentinfo`,children:`Territorio ancestral y sagrado de los pueblos Kogui, Arhuaco (Iku), Wiwa y Kankuamo — el Corazón del Mundo, dentro de la Línea Negra. Representado con respeto; su uso público requiere consulta con las comunidades.`})})]})]})]})}export{$ as SierraDiorama,ue as default};