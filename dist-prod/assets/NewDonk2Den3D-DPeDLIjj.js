import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{Ci as t}from"./vendor-icons-C4vhLH2y.js";import{t as n}from"./vendor-react-Bl3EXeX9.js";import{t as r}from"./AbejaAngelita-BXQ0WwhF.js";import{Y as i,_ as a,g as o,h as s}from"./vendor-three-6PzEuBKZ.js";import{t as c}from"./TunelOdyssey-Dkctageo.js";var l=e(t(),1),u=e(n(),1),d={w:640,h:360},f=2.5,p=[0,2,-1.5],m={pos:new i(7,3.4,6.6),mira:new i(0,1.7,-.6),fov:48},h={pos:new i(0,2,7.7),mira:new i(0,2,-1.5),fov:20},g={cielo:`#dff3d0`,niebla:`#d3ecc2`,pasto:`#6fae52`,pastoHondo:`#5a9443`,senda:`#8fbf6b`,madera:`#6b5233`,maderaClara:`#8a6d47`,follaje:`#3f8a3d`,follajeClaro:`#63ad4f`,follajeLima:`#8cc95e`,tronco:`#7a5a38`,piedra:`#93a48b`,espora:`#c4ff8e`,tinta:`#2a3d1f`,crema:`#fdf8e8`};function _({x:e,z:t,alto:n=2.2,copa:r=g.follaje,s:i=1}){return(0,u.jsxs)(`group`,{position:[e,0,t],scale:i,children:[(0,u.jsxs)(`mesh`,{position:[0,n*.35,0],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.1,.16,n*.7,6]}),(0,u.jsx)(`meshLambertMaterial`,{color:g.tronco,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,n*.72,0],children:[(0,u.jsx)(`coneGeometry`,{args:[.85,n*.9,7]}),(0,u.jsx)(`meshLambertMaterial`,{color:r,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,n*1.12,0],children:[(0,u.jsx)(`coneGeometry`,{args:[.55,n*.62,7]}),(0,u.jsx)(`meshLambertMaterial`,{color:g.follajeClaro,flatShading:!0})]})]})}function v({x:e,z:t,s:n=1,color:r=g.follajeLima}){return(0,u.jsxs)(`group`,{position:[e,0,t],scale:n,children:[(0,u.jsxs)(`mesh`,{position:[0,.28,0],scale:[1,.72,1],children:[(0,u.jsx)(`icosahedronGeometry`,{args:[.42,0]}),(0,u.jsx)(`meshLambertMaterial`,{color:r,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[.3,.2,.14],scale:[1,.6,1],children:[(0,u.jsx)(`icosahedronGeometry`,{args:[.26,0]}),(0,u.jsx)(`meshLambertMaterial`,{color:g.follaje,flatShading:!0})]})]})}function y({x:e,z:t,s:n=1}){return(0,u.jsxs)(`mesh`,{position:[e,.16*n,t],scale:[n,n*.62,n],rotation:[0,e+t,0],children:[(0,u.jsx)(`dodecahedronGeometry`,{args:[.34,0]}),(0,u.jsx)(`meshLambertMaterial`,{color:g.piedra,flatShading:!0})]})}var b=Array.from({length:14},(e,t)=>({x:Math.sin(t*2.4)*(3.2+t%4),y:1.1+t*.53%2.2,z:-1.2+Math.cos(t*1.7)*(2.4+t%3),f:.35+t%5*.12,d:t*1.9,r:.035+t%3*.016}));function x({reducedMotion:e}){let t=(0,l.useRef)([]);return a(({clock:n})=>{if(e)return;let r=n.elapsedTime;b.forEach((e,n)=>{let i=t.current[n];i&&(i.position.y=e.y+Math.sin(r*e.f+e.d)*.32,i.position.x=e.x+Math.cos(r*e.f*.7+e.d)*.22)})}),(0,u.jsx)(`group`,{children:b.map((e,n)=>(0,u.jsxs)(`mesh`,{ref:e=>{t.current[n]=e},position:[e.x,e.y,e.z],children:[(0,u.jsx)(`sphereGeometry`,{args:[e.r,6,6]}),(0,u.jsx)(`meshBasicMaterial`,{color:g.espora,toneMapped:!1})]},n))})}function S(){let[e,t,n]=p;return(0,u.jsxs)(`group`,{children:[(0,u.jsxs)(`mesh`,{position:[e,t+.12,n-.14],children:[(0,u.jsx)(`boxGeometry`,{args:[3.95,2.3,.2]}),(0,u.jsx)(`meshLambertMaterial`,{color:g.madera,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[e,t+1.4,n-.14],rotation:[0,Math.PI/4,0],scale:[1,.45,1],children:[(0,u.jsx)(`coneGeometry`,{args:[2.75,.55,4]}),(0,u.jsx)(`meshLambertMaterial`,{color:g.maderaClara,flatShading:!0})]}),[-1.75,1.75].map(t=>(0,u.jsxs)(`mesh`,{position:[e+t,.6,n-.14],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.09,.12,1.4,6]}),(0,u.jsx)(`meshLambertMaterial`,{color:g.maderaClara,flatShading:!0})]},t))]})}function C({reducedMotion:e}){return(0,u.jsxs)(`group`,{children:[(0,u.jsx)(`hemisphereLight`,{args:[`#f3ffe0`,`#48793c`,.85]}),(0,u.jsx)(`directionalLight`,{position:[6,9,5],intensity:1.15,color:`#fff3d2`}),(0,u.jsx)(`ambientLight`,{intensity:.35,color:`#eaffdc`}),(0,u.jsxs)(`mesh`,{rotation:[-Math.PI/2,0,0],position:[0,0,0],children:[(0,u.jsx)(`circleGeometry`,{args:[26,40]}),(0,u.jsx)(`meshLambertMaterial`,{color:g.pasto,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{rotation:[-Math.PI/2,0,0],position:[0,.012,1.6],children:[(0,u.jsx)(`circleGeometry`,{args:[4.4,28]}),(0,u.jsx)(`meshLambertMaterial`,{color:g.senda,flatShading:!0})]}),[[-9,-9,3.2],[8,-10,4],[0,-13,5.2],[13,-4,2.6]].map(([e,t,n],r)=>(0,u.jsxs)(`mesh`,{position:[e,-n*.45,t],scale:[n*1.5,n,n],children:[(0,u.jsx)(`sphereGeometry`,{args:[1,12,10]}),(0,u.jsx)(`meshLambertMaterial`,{color:r%2?g.pastoHondo:g.follaje,flatShading:!0})]},r)),(0,u.jsx)(_,{x:-4.6,z:-2.6,alto:2.6}),(0,u.jsx)(_,{x:-6.4,z:.4,alto:2.1,copa:g.follajeClaro}),(0,u.jsx)(_,{x:4.8,z:-2.8,alto:2.9}),(0,u.jsx)(_,{x:6.6,z:.8,alto:2,copa:g.follajeClaro}),(0,u.jsx)(_,{x:-3.4,z:-5.5,alto:3.2,s:1.15}),(0,u.jsx)(_,{x:3.2,z:-6,alto:3,s:1.2,copa:g.follajeClaro}),(0,u.jsx)(_,{x:-8.2,z:3.4,alto:2.3}),(0,u.jsx)(_,{x:8.6,z:3.8,alto:2.4,copa:g.follaje}),(0,u.jsx)(v,{x:-2.9,z:.9,s:1.2}),(0,u.jsx)(v,{x:3.1,z:1.2,s:1.05,color:g.follajeClaro}),(0,u.jsx)(v,{x:-5.2,z:2.8,s:.9}),(0,u.jsx)(v,{x:5.4,z:2.6,s:1.1}),(0,u.jsx)(v,{x:-1.8,z:3.8,s:.8,color:g.follajeLima}),(0,u.jsx)(v,{x:2.2,z:4.2,s:.85}),(0,u.jsx)(y,{x:-3.8,z:2.1,s:1.1}),(0,u.jsx)(y,{x:4.2,z:3.3,s:.9}),(0,u.jsx)(y,{x:1.4,z:-3.4,s:1.3}),(0,u.jsx)(S,{}),(0,u.jsx)(x,{reducedMotion:e})]})}var w=`
.nd-mural {
  position: relative;
  width: ${d.w}px;
  height: ${d.h}px;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 18px;
  background: linear-gradient(160deg, #35682c, #234a1e 70%);
  box-shadow: 0 0 0 3px rgba(30, 58, 22, 0.55), 0 14px 34px rgba(24, 46, 16, 0.35);
  font-family: system-ui, sans-serif;
  user-select: none;
}
.nd-mural__lienzo {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 9px;
  overflow: hidden;
  background:
    radial-gradient(34% 30% at 76% 20%, rgba(255, 246, 190, 0.95) 0 28%, rgba(255, 246, 190, 0) 70%),
    linear-gradient(#eaf7c8 0%, #cdeba6 46%, #b3dd8d 62%);
}
/* ── capas parallax (lomas 2D con radial-gradients repetidos) ── */
.nd-capa { position: absolute; left: 0; right: 0; bottom: 0; background-repeat: repeat-x; }
.nd-capa--lejos {
  height: 58%;
  background-image: radial-gradient(60% 115% at 50% 106%, #b7dd92 0 62%, rgba(0,0,0,0) 63%);
  background-size: 280px 165px;
  background-position: 0 100%;
  animation: ndScroll 52s linear infinite;
  --nd-ancho: -280px;
  opacity: 0.85;
}
.nd-capa--medio {
  height: 42%;
  background-image: radial-gradient(58% 112% at 50% 106%, #8cc46a 0 62%, rgba(0,0,0,0) 63%);
  background-size: 200px 122px;
  background-position: 60px 100%;
  animation: ndScroll 26s linear infinite;
  --nd-ancho: -200px;
}
.nd-capa--suelo {
  height: 17%;
  background-image:
    repeating-linear-gradient(90deg, rgba(46, 84, 32, 0.28) 0 7px, rgba(0,0,0,0) 7px 46px),
    linear-gradient(#83b75c, #5f9142 55%, #4d7a36);
  background-size: 640px 100%, 100% 100%;
  animation: ndScroll 9s linear infinite;
  --nd-ancho: -640px;
  border-top: 3px solid rgba(38, 70, 26, 0.5);
}
@keyframes ndScroll {
  from { background-position-x: 0; }
  to { background-position-x: var(--nd-ancho); }
}
/* ── franja de flora cercana: pista al 200% con dos copias idénticas ── */
.nd-flora { position: absolute; left: 0; right: 0; bottom: 15%; height: 46%; overflow: hidden; }
.nd-flora__pista {
  position: absolute; bottom: 0; left: 0;
  width: ${d.w*2}px; height: 100%;
  display: flex;
  animation: ndPista 15s linear infinite;
}
@keyframes ndPista { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.nd-flora__copia { position: relative; width: 50%; height: 100%; flex: none; }
/* ── Angelita caminando (queda quieta en X; el mundo corre) ── */
.nd-angelita {
  position: absolute;
  left: 31%;
  bottom: 13.5%;
  animation: ndCamina 0.62s ease-in-out infinite;
  transform-origin: 50% 88%;
  filter: drop-shadow(0 10px 7px rgba(30, 54, 20, 0.32));
}
@keyframes ndCamina {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-7px) rotate(2.5deg); }
}
.nd-placa {
  position: absolute; top: 9px; left: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(38, 74, 28, 0.78);
  color: #f2ffdd;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
/* reduced-motion: el mural queda como lámina quieta y digna */
.nd-mural[data-rm='1'] .nd-capa,
.nd-mural[data-rm='1'] .nd-flora__pista,
.nd-mural[data-rm='1'] .nd-angelita { animation: none; }
`;function T({x:e,alto:t=74,brillo:n=!1,tono:r=`#3d7c33`}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 40 90`,width:40,height:90,style:{position:`absolute`,bottom:0,left:`${e}%`,height:t,width:`auto`},"aria-hidden":`true`,children:[(0,u.jsx)(`path`,{d:`M20,90 C19,64 21,46 20,26`,stroke:r,strokeWidth:`4.5`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M20,64 C11,60 6,52 7,44 C15,47 19,54 20,62 Z`,fill:`#61a548`}),(0,u.jsx)(`path`,{d:`M20,50 C29,46 34,38 33,30 C25,33 21,40 20,48 Z`,fill:`#4f9040`}),(0,u.jsx)(`ellipse`,{cx:`20`,cy:`22`,rx:`7.5`,ry:`9`,fill:n?`#c9ff96`:`#7cc258`}),n&&(0,u.jsx)(`circle`,{cx:`20`,cy:`20`,r:`3.2`,fill:`#f4ffd9`})]})}function E(){return(0,u.jsxs)(`div`,{className:`nd-flora__copia`,children:[(0,u.jsx)(T,{x:6,alto:70}),(0,u.jsx)(T,{x:21,alto:52,tono:`#356b2c`}),(0,u.jsx)(T,{x:38,alto:84,brillo:!0}),(0,u.jsx)(T,{x:57,alto:60,tono:`#468238`}),(0,u.jsx)(T,{x:72,alto:78,brillo:!0}),(0,u.jsx)(T,{x:88,alto:56,tono:`#356b2c`})]})}function D({fase:e,reducedMotion:t,onEntrar:n}){let[i,a]=(0,l.useState)(!1),o=(0,l.useRef)(null),c=e===`valle3d`,d=e===`juego2d`,m=(0,l.useCallback)(()=>{if(c){n();return}d&&(a(!0),clearTimeout(o.current),o.current=setTimeout(()=>a(!1),1400))},[c,d,n]);return(0,u.jsx)(s,{transform:!0,position:p,distanceFactor:f,zIndexRange:[20,10],style:{pointerEvents:`auto`},children:(0,u.jsxs)(`div`,{className:`nd-mural`,"data-rm":t?`1`:`0`,"data-fase":e,onClick:m,role:c?`button`:void 0,"aria-label":c?`Mural de la finca: toque para entrar al plano 2D`:`Plano 2D de la finca`,style:{cursor:c||d?`pointer`:`default`},children:[(0,u.jsx)(`style`,{children:w}),(0,u.jsxs)(`div`,{className:`nd-mural__lienzo`,children:[(0,u.jsx)(`div`,{className:`nd-capa nd-capa--lejos`}),(0,u.jsx)(`div`,{className:`nd-capa nd-capa--medio`}),(0,u.jsx)(`div`,{className:`nd-flora`,children:(0,u.jsxs)(`div`,{className:`nd-flora__pista`,children:[(0,u.jsx)(E,{}),(0,u.jsx)(E,{})]})}),(0,u.jsx)(`div`,{className:`nd-capa nd-capa--suelo`}),(0,u.jsx)(`div`,{className:`nd-angelita`,children:(0,u.jsx)(r,{size:96,animated:!t,pose:i?`celebra`:`vuela`,animo:i?`pleno`:`sereno`,energia:1,title:`Angelita caminando por el mural`})}),(0,u.jsx)(`span`,{className:`nd-placa`,children:`La finca de Angelita`})]})]})})}var O=`
.nd-raiz {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: ${g.cielo};
  font-family: system-ui, sans-serif;
}
.nd-raiz canvas { touch-action: none; }
.nd-chrome { position: absolute; inset: 0; pointer-events: none; z-index: 40; }
.nd-chrome > * { pointer-events: auto; }
.nd-titulo {
  position: absolute;
  top: 18px;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  color: ${g.tinta};
  font-size: clamp(19px, 3.4vw, 27px);
  letter-spacing: 0.02em;
  text-shadow: 0 2px 0 rgba(255, 255, 255, 0.55);
}
.nd-sub {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  color: #47613a;
  font-size: clamp(12px, 2vw, 15px);
}
.nd-boton {
  position: absolute;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  padding: 13px 26px;
  border: 3px solid ${g.tinta};
  border-radius: 999px;
  background: ${g.crema};
  color: ${g.tinta};
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(42, 61, 31, 0.45);
  transition: transform 0.12s ease;
}
.nd-boton:hover { transform: translateX(-50%) translateY(-2px); }
.nd-boton:active { transform: translateX(-50%) translateY(1px); }
.nd-volver {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 16px;
  border: 2px solid rgba(42, 61, 31, 0.6);
  border-radius: 999px;
  background: rgba(253, 248, 232, 0.9);
  color: ${g.tinta};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.nd-pista {
  position: absolute;
  bottom: 84px;
  left: 0;
  right: 0;
  text-align: center;
  color: #4a6a3b;
  font-size: 13px;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .nd-boton { transition: none; }
}
`;function k({onBack:e}){let[t]=(0,l.useState)(()=>typeof window<`u`&&!!window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches),[n,r]=(0,l.useState)(()=>typeof window<`u`&&new URLSearchParams(window.location.search).get(`nd`)===`2d`?`juego2d`:`valle3d`),i=(0,l.useCallback)(()=>r(`acercando`),[]),a=(0,l.useCallback)(()=>r(`saliendo`),[]),s=(0,l.useCallback)(e=>{r(e===`acercando`?`juego2d`:`valle3d`)},[]),d=n===`valle3d`,f=n===`juego2d`,p=n===`acercando`||n===`saliendo`;return(0,u.jsxs)(`section`,{className:`nd-raiz`,"data-fase":n,"aria-label":`Mural 2D dentro de la finca 3D: la cámara se aplana contra el plano para jugar en 2D con el 3D alrededor`,children:[(0,u.jsx)(`style`,{children:O}),(0,u.jsxs)(o,{dpr:[1,1.5],gl:{antialias:!0,powerPreference:`high-performance`},camera:{position:m.pos.toArray(),fov:m.fov},children:[(0,u.jsx)(`color`,{attach:`background`,args:[g.cielo]}),(0,u.jsx)(`fog`,{attach:`fog`,args:[g.niebla,13,34]}),(0,u.jsx)(c,{fase:n,poseValle:m,poseBoca:h,reducedMotion:t,onLlegada:s}),(0,u.jsx)(C,{reducedMotion:t}),(0,u.jsx)(D,{fase:n,reducedMotion:t,onEntrar:i})]}),(0,u.jsxs)(`div`,{className:`nd-chrome`,children:[d&&(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(`h2`,{className:`nd-titulo`,children:`El mural de la finca`}),(0,u.jsx)(`p`,{className:`nd-sub`,children:`Un plano 2D vive dentro del valle 3D — como los murales de New Donk`}),e&&(0,u.jsx)(`button`,{type:`button`,className:`nd-volver`,onClick:e,children:`← Salir`}),(0,u.jsx)(`button`,{type:`button`,className:`nd-boton`,onClick:i,children:`Toque para entrar`})]}),f&&(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(`p`,{className:`nd-pista`,children:`Está en el plano 2D — el valle sigue ahí, en los bordes`}),(0,u.jsx)(`button`,{type:`button`,className:`nd-boton`,onClick:a,children:`Volver al valle 3D`})]}),p&&(0,u.jsx)(`p`,{className:`nd-pista`,children:n===`acercando`?`Entrando al mural…`:`Volviendo al valle…`})]})]})}export{k as default};