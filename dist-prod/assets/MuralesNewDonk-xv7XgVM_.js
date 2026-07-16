import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{Ci as t}from"./vendor-icons-C4vhLH2y.js";import{t as n}from"./vendor-react-Bl3EXeX9.js";import{t as r}from"./AbejaAngelita-BXQ0WwhF.js";import{Y as i,_ as a,g as o,h as s}from"./vendor-three-6PzEuBKZ.js";import{t as c}from"./TunelOdyssey-Dkctageo.js";var l=e(t(),1),u=e(n(),1),d={w:640,h:360},f=2.5,p=`
.mnd-mural {
  position: relative;
  width: ${d.w}px;
  height: ${d.h}px;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 18px;
  font-family: system-ui, sans-serif;
  user-select: none;
}
.mnd-mural__lienzo {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 9px;
  overflow: hidden;
}
/* ── capas parallax genéricas: el arte (gradients) viene inline del tema ── */
.mnd-capa {
  position: absolute;
  left: 0;
  right: 0;
  background-repeat: repeat-x;
  animation: mndScroll linear infinite;
}
@keyframes mndScroll {
  from { background-position-x: 0; }
  to { background-position-x: var(--mnd-ancho); }
}
/* ── franja de flora cercana: pista al 200% con dos copias idénticas ── */
.mnd-flora { position: absolute; left: 0; right: 0; overflow: hidden; }
.mnd-flora__pista {
  position: absolute;
  bottom: 0;
  left: 0;
  width: ${d.w*2}px;
  height: 100%;
  display: flex;
  animation: mndPista linear infinite;
}
@keyframes mndPista { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.mnd-flora__copia { position: relative; width: 50%; height: 100%; flex: none; }
/* ── Angelita caminando (quieta en X; el mundo es el que corre) ── */
.mnd-angelita {
  position: absolute;
  bottom: 13.5%;
  animation: mndCamina 0.62s ease-in-out infinite;
  transform-origin: 50% 88%;
  filter: drop-shadow(0 10px 7px rgba(30, 54, 20, 0.32));
}
@keyframes mndCamina {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-7px) rotate(2.5deg); }
}
.mnd-placa {
  position: absolute;
  top: 9px;
  left: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  color: #f6ffe6;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
/* reduced-motion: lámina quieta */
.mnd-mural[data-rm='1'] .mnd-capa,
.mnd-mural[data-rm='1'] .mnd-flora__pista,
.mnd-mural[data-rm='1'] .mnd-angelita { animation: none; }
`;function m({cfg:e}){return(0,u.jsx)(`div`,{className:`mnd-capa`,style:{height:e.height,bottom:e.bottom??0,backgroundImage:e.fondo,backgroundSize:e.tam,backgroundPosition:e.posicion??`0 100%`,opacity:e.opacidad,borderTop:e.bordeArriba,borderBottom:e.bordeAbajo,animationDuration:`${e.dur}s`,"--mnd-ancho":e.ancho}})}function h({tema:e,reducedMotion:t=!1,celebra:n=!1}){let{flora:i,angelita:a}=e,o=i.Copia;return(0,u.jsxs)(`div`,{className:`mnd-mural`,"data-rm":t?`1`:`0`,"data-mundo":e.id,style:{background:e.marcoCss,boxShadow:e.marcoSombra},children:[(0,u.jsx)(`style`,{children:p}),(0,u.jsxs)(`div`,{className:`mnd-mural__lienzo`,style:{background:e.lienzo},children:[e.capas.map((e,t)=>(0,u.jsx)(m,{cfg:e},t)),(0,u.jsx)(`div`,{className:`mnd-flora`,style:{bottom:i.bottom,height:i.height},children:(0,u.jsxs)(`div`,{className:`mnd-flora__pista`,style:{animationDuration:`${i.dur}s`},children:[(0,u.jsx)(`div`,{className:`mnd-flora__copia`,children:(0,u.jsx)(o,{})}),(0,u.jsx)(`div`,{className:`mnd-flora__copia`,children:(0,u.jsx)(o,{})})]})}),(0,u.jsx)(m,{cfg:e.suelo}),(0,u.jsx)(`div`,{className:`mnd-angelita`,style:{left:a.left},children:(0,u.jsx)(r,{size:96,animated:!t,pose:n?`celebra`:`vuela`,animo:n?a.animoCelebra??`pleno`:a.animo??`sereno`,energia:1,title:`Angelita caminando por el mural de ${e.nombre}`})}),(0,u.jsx)(`span`,{className:`mnd-placa`,style:{background:e.placaFondo},children:e.placa})]})]})}function g({x:e,alto:t=78,brillo:n=!1}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 64 96`,width:64,height:96,style:{position:`absolute`,bottom:0,left:`${e}%`,height:t,width:`auto`},"aria-hidden":`true`,children:[(0,u.jsx)(`path`,{d:`M32,96 C31,74 33,52 32,26`,stroke:`#4a3521`,strokeWidth:`4`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M32,74 C23,70 13,69 7,73`,stroke:`#4a3521`,strokeWidth:`2.6`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M32,60 C41,56 51,55 57,59`,stroke:`#4a3521`,strokeWidth:`2.6`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M32,46 C24,42 16,41 11,44`,stroke:`#4a3521`,strokeWidth:`2.4`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`ellipse`,{cx:`12`,cy:`70`,rx:`9`,ry:`5`,fill:`#2e5c2b`,transform:`rotate(-16 12 70)`}),(0,u.jsx)(`ellipse`,{cx:`24`,cy:`73`,rx:`8`,ry:`4.6`,fill:`#3f7a36`,transform:`rotate(-8 24 73)`}),(0,u.jsx)(`ellipse`,{cx:`52`,cy:`56`,rx:`9`,ry:`5`,fill:`#2e5c2b`,transform:`rotate(14 52 56)`}),(0,u.jsx)(`ellipse`,{cx:`40`,cy:`59`,rx:`8`,ry:`4.6`,fill:`#3f7a36`,transform:`rotate(8 40 59)`}),(0,u.jsx)(`ellipse`,{cx:`15`,cy:`42`,rx:`8`,ry:`4.4`,fill:`#356b2c`,transform:`rotate(-14 15 42)`}),(0,u.jsx)(`ellipse`,{cx:`32`,cy:`22`,rx:`7`,ry:`9`,fill:`#3f7a36`}),(0,u.jsx)(`ellipse`,{cx:`27`,cy:`28`,rx:`5`,ry:`6`,fill:`#2e5c2b`}),(0,u.jsx)(`circle`,{cx:`27`,cy:`68`,r:`3.1`,fill:`#d9402e`}),(0,u.jsx)(`circle`,{cx:`21`,cy:`71`,r:`2.7`,fill:`#b32b22`}),(0,u.jsx)(`circle`,{cx:`26`,cy:`74`,r:`2.5`,fill:`#d9402e`}),(0,u.jsx)(`circle`,{cx:`38`,cy:`54`,r:`3.1`,fill:n?`#ff6a4d`:`#d9402e`}),(0,u.jsx)(`circle`,{cx:`44`,cy:`57`,r:`2.7`,fill:`#b32b22`}),(0,u.jsx)(`circle`,{cx:`39`,cy:`60`,r:`2.5`,fill:`#d9402e`}),n&&(0,u.jsx)(`circle`,{cx:`38`,cy:`52`,r:`4.6`,fill:`none`,stroke:`#ffd9a0`,strokeWidth:`1.6`,opacity:`0.9`}),(0,u.jsx)(`circle`,{cx:`24`,cy:`44`,r:`2.6`,fill:`#c9862c`}),(0,u.jsx)(`circle`,{cx:`19`,cy:`47`,r:`2.3`,fill:`#d9402e`})]})}function _({x:e,alto:t=140}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 140 150`,width:140,height:150,style:{position:`absolute`,bottom:0,left:`${e}%`,height:t,width:`auto`},"aria-hidden":`true`,children:[(0,u.jsx)(`path`,{d:`M70,150 C68,110 72,74 67,40`,stroke:`#5c422a`,strokeWidth:`6`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M69,96 C82,86 94,80 104,78`,stroke:`#5c422a`,strokeWidth:`3.4`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M70,78 C58,68 46,62 36,60`,stroke:`#5c422a`,strokeWidth:`3.4`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`ellipse`,{cx:`46`,cy:`46`,rx:`40`,ry:`15`,fill:`#3f7a3c`}),(0,u.jsx)(`ellipse`,{cx:`94`,cy:`38`,rx:`38`,ry:`14`,fill:`#4f8f45`}),(0,u.jsx)(`ellipse`,{cx:`66`,cy:`26`,rx:`44`,ry:`15`,fill:`#5c9b4a`}),(0,u.jsx)(`ellipse`,{cx:`104`,cy:`72`,rx:`24`,ry:`9`,fill:`#4f8f45`}),(0,u.jsx)(`ellipse`,{cx:`34`,cy:`56`,rx:`22`,ry:`8.5`,fill:`#3f7a3c`})]})}function v({x:e}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 48 36`,width:48,height:36,style:{position:`absolute`,bottom:0,left:`${e}%`,height:34,width:`auto`},"aria-hidden":`true`,children:[(0,u.jsx)(`path`,{d:`M6,14 L42,14 L37,34 L11,34 Z`,fill:`#8a6d47`,stroke:`#5c422a`,strokeWidth:`2`}),(0,u.jsx)(`path`,{d:`M9,20 L39,20 M11,27 L37,27`,stroke:`#5c422a`,strokeWidth:`1.4`,opacity:`0.7`}),(0,u.jsx)(`circle`,{cx:`17`,cy:`12`,r:`3.4`,fill:`#d9402e`}),(0,u.jsx)(`circle`,{cx:`25`,cy:`10`,r:`3.4`,fill:`#b32b22`}),(0,u.jsx)(`circle`,{cx:`32`,cy:`12`,r:`3.4`,fill:`#d9402e`}),(0,u.jsx)(`circle`,{cx:`21`,cy:`8`,r:`3`,fill:`#c9862c`})]})}function y(){return(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(_,{x:2,alto:150}),(0,u.jsx)(g,{x:17,alto:80}),(0,u.jsx)(g,{x:28,alto:64}),(0,u.jsx)(v,{x:39}),(0,u.jsx)(g,{x:48,alto:86,brillo:!0}),(0,u.jsx)(_,{x:59,alto:132}),(0,u.jsx)(g,{x:76,alto:72}),(0,u.jsx)(g,{x:88,alto:60,brillo:!0})]})}var b={id:`cafe`,nombre:`Café`,placa:`Mundo Café — cafetal con sombrío`,placaFondo:`rgba(84, 52, 26, 0.8)`,marcoCss:`linear-gradient(160deg, #6b4a2a, #46301b 70%)`,marcoSombra:`0 0 0 3px rgba(58, 38, 20, 0.55), 0 14px 34px rgba(46, 30, 14, 0.35)`,lienzo:`radial-gradient(30% 26% at 78% 18%, rgba(255, 214, 140, 0.95) 0 30%, rgba(255, 214, 140, 0) 70%), linear-gradient(#fbe8bd 0%, #ecd99e 40%, #cfd98f 60%)`,capas:[{height:`60%`,fondo:`radial-gradient(60% 115% at 50% 106%, #b3cf8e 0 62%, rgba(0,0,0,0) 63%)`,tam:`300px 172px`,dur:55,ancho:`-300px`,opacidad:.8},{height:`44%`,fondo:`radial-gradient(56% 110% at 50% 108%, #85ac5c 0 62%, rgba(0,0,0,0) 63%)`,tam:`196px 120px`,dur:27,ancho:`-196px`},{height:`11%`,bottom:`15%`,fondo:`radial-gradient(circle at 50% 62%, #4c7c3a 0 34%, rgba(0,0,0,0) 37%)`,tam:`46px 40px`,dur:19,ancho:`-46px`,opacidad:.9}],suelo:{height:`17%`,fondo:`repeating-linear-gradient(90deg, rgba(94, 60, 32, 0.35) 0 8px, rgba(0,0,0,0) 8px 52px), linear-gradient(#b5854f, #96683c 55%, #7d5530)`,tam:`640px 100%, 100% 100%`,dur:9,ancho:`-640px`,bordeArriba:`3px solid rgba(74, 46, 22, 0.55)`},flora:{Copia:y,dur:16,bottom:`15%`,height:`56%`},angelita:{left:`30%`,animo:`sereno`,animoCelebra:`pleno`},marco3d:{frente:`#5c422a`,techo:`#8a6d47`,postes:`#7a5a38`}};function x({x:e,alto:t=84}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 44 92`,width:44,height:92,style:{position:`absolute`,bottom:0,left:`${e}%`,height:t,width:`auto`},"aria-hidden":`true`,children:[(0,u.jsx)(`path`,{d:`M14,92 C13,60 15,38 12,20`,stroke:`#3f7a3c`,strokeWidth:`3.4`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M23,92 C23,56 22,34 25,12`,stroke:`#4f9040`,strokeWidth:`3.4`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M32,92 C33,62 31,44 34,28`,stroke:`#356b2c`,strokeWidth:`3`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M23,74 C31,66 36,58 38,50`,stroke:`#4f9040`,strokeWidth:`2.4`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`rect`,{x:`8.6`,y:`8`,width:`7`,height:`18`,rx:`3.5`,fill:`#7a5a38`}),(0,u.jsx)(`rect`,{x:`21.6`,y:`1`,width:`7`,height:`18`,rx:`3.5`,fill:`#8a6d47`}),(0,u.jsx)(`rect`,{x:`30.8`,y:`17`,width:`6`,height:`15`,rx:`3`,fill:`#7a5a38`})]})}function S({x:e}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 64 32`,width:64,height:32,style:{position:`absolute`,bottom:0,left:`${e}%`,height:30,width:`auto`},"aria-hidden":`true`,children:[(0,u.jsx)(`ellipse`,{cx:`18`,cy:`22`,rx:`16`,ry:`10`,fill:`#8fa3a0`}),(0,u.jsx)(`ellipse`,{cx:`44`,cy:`24`,rx:`14`,ry:`8`,fill:`#7b908d`}),(0,u.jsx)(`ellipse`,{cx:`33`,cy:`14`,rx:`11`,ry:`7`,fill:`#a3b5b0`}),(0,u.jsx)(`path`,{d:`M26,10 C29,8.5 34,8.5 37,10`,stroke:`#e7f2ee`,strokeWidth:`2`,fill:`none`,strokeLinecap:`round`,opacity:`0.85`}),(0,u.jsx)(`path`,{d:`M8,18 C11,16.5 15,16.5 18,18`,stroke:`#dcE9e4`,strokeWidth:`1.8`,fill:`none`,strokeLinecap:`round`,opacity:`0.7`})]})}function C({x:e,alto:t=62}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 60 70`,width:60,height:70,style:{position:`absolute`,bottom:0,left:`${e}%`,height:t,width:`auto`},"aria-hidden":`true`,children:[(0,u.jsx)(`path`,{d:`M30,70 C28,52 18,40 8,36`,stroke:`#3f8a3d`,strokeWidth:`3`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M30,70 C31,50 40,36 52,32`,stroke:`#4f9040`,strokeWidth:`3`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M30,70 C30,50 29,36 30,24`,stroke:`#356b2c`,strokeWidth:`3`,fill:`none`,strokeLinecap:`round`}),[[12,40],[18,46],[24,54]].map(([e,t],n)=>(0,u.jsx)(`ellipse`,{cx:e,cy:t,rx:`5.5`,ry:`2.6`,fill:`#61a548`,transform:`rotate(-38 ${e} ${t})`},`a${n}`)),[[47,36],[41,42],[35,50]].map(([e,t],n)=>(0,u.jsx)(`ellipse`,{cx:e,cy:t,rx:`5.5`,ry:`2.6`,fill:`#4f9040`,transform:`rotate(38 ${e} ${t})`},`b${n}`)),(0,u.jsx)(`ellipse`,{cx:`30`,cy:`28`,rx:`2.8`,ry:`5`,fill:`#61a548`})]})}function w({x:e,alto:t=36}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 30 40`,width:30,height:40,style:{position:`absolute`,bottom:4,left:`${e}%`,height:t,width:`auto`},"aria-hidden":`true`,children:[(0,u.jsx)(`ellipse`,{cx:`15`,cy:`26`,rx:`11`,ry:`12`,fill:`#eafffb`,opacity:`0.55`}),(0,u.jsx)(`path`,{d:`M15,6 C20,15 24,20 24,27 A9,9 0 1 1 6,27 C6,20 10,15 15,6 Z`,fill:`#9fdcd4`,stroke:`#5fb8b4`,strokeWidth:`1.6`}),(0,u.jsx)(`circle`,{cx:`11.5`,cy:`26`,r:`2.4`,fill:`#f0fffb`})]})}function T(){return(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(C,{x:3,alto:64}),(0,u.jsx)(S,{x:14}),(0,u.jsx)(x,{x:25,alto:86}),(0,u.jsx)(w,{x:38}),(0,u.jsx)(x,{x:48,alto:70}),(0,u.jsx)(S,{x:60}),(0,u.jsx)(C,{x:70,alto:56}),(0,u.jsx)(x,{x:82,alto:80}),(0,u.jsx)(w,{x:93,alto:30})]})}var E={id:`agua`,nombre:`Agua`,placa:`Mundo Agua — la quebrada del nacimiento`,placaFondo:`rgba(32, 84, 78, 0.8)`,marcoCss:`linear-gradient(160deg, #2f6b5e, #1e4a41 70%)`,marcoSombra:`0 0 0 3px rgba(20, 54, 46, 0.55), 0 14px 34px rgba(14, 44, 38, 0.35)`,lienzo:`radial-gradient(32% 28% at 72% 16%, rgba(240, 255, 250, 0.92) 0 30%, rgba(240, 255, 250, 0) 70%), linear-gradient(#e7f7ee 0%, #cfeedd 44%, #b7e3c6 60%)`,capas:[{height:`58%`,fondo:`radial-gradient(60% 115% at 50% 106%, #9ecfae 0 62%, rgba(0,0,0,0) 63%)`,tam:`290px 168px`,dur:58,ancho:`-290px`,opacidad:.85},{height:`42%`,fondo:`radial-gradient(58% 112% at 50% 106%, #7dbb84 0 62%, rgba(0,0,0,0) 63%)`,tam:`204px 124px`,dur:27,ancho:`-204px`},{height:`13%`,bottom:`15%`,fondo:`repeating-linear-gradient(100deg, rgba(255, 255, 255, 0.28) 0 7px, rgba(0,0,0,0) 7px 46px, rgba(234, 255, 251, 0.18) 46px 52px, rgba(0,0,0,0) 52px 92px), linear-gradient(#8fd8d0, #5fb8b4 60%, #4aa3a3)`,tam:`368px 100%, 100% 100%`,dur:4.5,ancho:`-320px`,bordeArriba:`2px solid rgba(234, 255, 251, 0.75)`,bordeAbajo:`2px solid rgba(42, 96, 90, 0.5)`}],suelo:{height:`17%`,fondo:`repeating-linear-gradient(90deg, rgba(58, 94, 88, 0.28) 0 6px, rgba(0,0,0,0) 6px 42px), linear-gradient(#7fbf80, #5da268 55%, #4b8a56)`,tam:`640px 100%, 100% 100%`,dur:9,ancho:`-640px`,bordeArriba:`3px solid rgba(38, 70, 56, 0.5)`},flora:{Copia:T,dur:15,bottom:`15%`,height:`46%`},angelita:{left:`32%`,animo:`sereno`,animoCelebra:`pleno`},marco3d:{frente:`#4c5f4a`,techo:`#74806a`,postes:`#5f7058`}};function D({x:e,alto:t=68}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 120 74`,width:120,height:74,style:{position:`absolute`,bottom:0,left:`${e}%`,height:t,width:`auto`},"aria-hidden":`true`,children:[(0,u.jsx)(`rect`,{x:`10`,y:`66`,width:`8`,height:`8`,fill:`#7a5a38`}),(0,u.jsx)(`rect`,{x:`102`,y:`66`,width:`8`,height:`8`,fill:`#7a5a38`}),(0,u.jsx)(`rect`,{x:`6`,y:`42`,width:`108`,height:`26`,rx:`3`,fill:`#8a6d47`,stroke:`#5c422a`,strokeWidth:`2.4`}),(0,u.jsx)(`rect`,{x:`11`,y:`46`,width:`98`,height:`10`,rx:`2`,fill:`#4a3521`}),(0,u.jsx)(`path`,{d:`M16,51 H104`,stroke:`#2e2014`,strokeWidth:`1.6`,opacity:`0.6`,strokeDasharray:`6 8`}),[22,40,58,76,94].map(e=>(0,u.jsxs)(`g`,{children:[(0,u.jsx)(`path`,{d:`M${e},46 C${e-1},40 ${e-1},36 ${e},32`,stroke:`#4f9040`,strokeWidth:`2.4`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`ellipse`,{cx:e-5,cy:`33`,rx:`5.5`,ry:`3`,fill:`#7cc258`,transform:`rotate(-24 ${e-5} 33)`}),(0,u.jsx)(`ellipse`,{cx:e+5,cy:`33`,rx:`5.5`,ry:`3`,fill:`#61a548`,transform:`rotate(24 ${e+5} 33)`})]},e))]})}function O({x:e,alto:t=78}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 96 84`,width:96,height:84,style:{position:`absolute`,bottom:0,left:`${e}%`,height:t,width:`auto`},"aria-hidden":`true`,children:[(0,u.jsx)(`path`,{d:`M18,84 L22,46 M78,84 L74,46 M14,68 L82,68`,stroke:`#7a5a38`,strokeWidth:`4`,strokeLinecap:`round`}),(0,u.jsx)(`rect`,{x:`10`,y:`38`,width:`76`,height:`12`,rx:`2.5`,fill:`#a58757`,stroke:`#5c422a`,strokeWidth:`2`}),[20,34,48,62,76].map(e=>(0,u.jsx)(`path`,{d:`M${e},40 V48`,stroke:`#5c422a`,strokeWidth:`1.4`,opacity:`0.6`},e)),[16,30,44,58,72].map((e,t)=>(0,u.jsxs)(`g`,{children:[(0,u.jsx)(`path`,{d:`M${e+6},38 C${e+5.5},33 ${e+6},30 ${e+6},27`,stroke:`#4f9040`,strokeWidth:`2`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`ellipse`,{cx:e+2.5,cy:27-t%2*2,rx:`4.4`,ry:`2.4`,fill:`#7cc258`,transform:`rotate(-22 ${e+2.5} ${27-t%2*2})`}),(0,u.jsx)(`ellipse`,{cx:e+9.5,cy:27-t%2*2,rx:`4.4`,ry:`2.4`,fill:`#61a548`,transform:`rotate(22 ${e+9.5} ${27-t%2*2})`})]},e))]})}function k({x:e,alto:t=46}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 84 60`,width:84,height:60,style:{position:`absolute`,bottom:0,left:`${e}%`,height:t,width:`auto`},"aria-hidden":`true`,children:[(0,u.jsx)(`rect`,{x:`26`,y:`24`,width:`34`,height:`32`,rx:`6`,fill:`#6f8577`,stroke:`#4c5f4a`,strokeWidth:`2.4`}),(0,u.jsx)(`path`,{d:`M40,24 C40,15 47,12 52,14`,stroke:`#4c5f4a`,strokeWidth:`4`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M28,34 L10,22`,stroke:`#6f8577`,strokeWidth:`5.5`,strokeLinecap:`round`}),(0,u.jsx)(`ellipse`,{cx:`9`,cy:`21`,rx:`4.6`,ry:`3.6`,fill:`#8a9c8e`,stroke:`#4c5f4a`,strokeWidth:`1.6`}),(0,u.jsx)(`circle`,{cx:`4`,cy:`12`,r:`2`,fill:`#9fdcd2`}),(0,u.jsx)(`circle`,{cx:`9`,cy:`8`,r:`2.2`,fill:`#8fd8d0`}),(0,u.jsx)(`circle`,{cx:`15`,cy:`11`,r:`1.8`,fill:`#9fdcd2`})]})}function A({x:e,alto:t=58,brillo:n=!1}){return(0,u.jsxs)(`svg`,{viewBox:`0 0 52 70`,width:52,height:70,style:{position:`absolute`,bottom:0,left:`${e}%`,height:t,width:`auto`},"aria-hidden":`true`,children:[n&&(0,u.jsx)(`ellipse`,{cx:`26`,cy:`26`,rx:`22`,ry:`24`,fill:`#eaffd0`,opacity:`0.6`}),(0,u.jsx)(`path`,{d:`M26,70 C25,52 27,40 26,26`,stroke:`#4f9040`,strokeWidth:`4`,fill:`none`,strokeLinecap:`round`}),(0,u.jsx)(`path`,{d:`M26,42 C15,38 8,30 8,20 C19,22 25,31 26,40 Z`,fill:`#7cc258`}),(0,u.jsx)(`path`,{d:`M26,34 C37,30 44,22 44,12 C33,14 27,23 26,32 Z`,fill:`#61a548`}),(0,u.jsx)(`ellipse`,{cx:`26`,cy:`20`,rx:`6`,ry:`7.5`,fill:n?`#c9ff96`:`#8cc95e`}),n&&(0,u.jsx)(`circle`,{cx:`26`,cy:`18`,r:`2.8`,fill:`#f4ffd9`}),(0,u.jsx)(`path`,{d:`M20,66 C22,64 30,64 32,66`,stroke:`#4a3521`,strokeWidth:`3`,fill:`none`,strokeLinecap:`round`})]})}function j(){return(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(D,{x:2,alto:70}),(0,u.jsx)(A,{x:20,alto:54}),(0,u.jsx)(O,{x:30,alto:80}),(0,u.jsx)(k,{x:46}),(0,u.jsx)(D,{x:56,alto:64}),(0,u.jsx)(A,{x:74,alto:62,brillo:!0}),(0,u.jsx)(O,{x:84,alto:74})]})}var M=[b,E,{id:`semillero`,nombre:`Semillero`,placa:`Mundo Semillero — camas de germinación`,placaFondo:`rgba(74, 84, 28, 0.82)`,marcoCss:`linear-gradient(160deg, #7c8a3a, #55611f 70%)`,marcoSombra:`0 0 0 3px rgba(62, 70, 24, 0.55), 0 14px 34px rgba(48, 56, 18, 0.35)`,lienzo:`radial-gradient(30% 26% at 70% 16%, rgba(255, 250, 205, 0.95) 0 32%, rgba(255, 250, 205, 0) 70%), linear-gradient(#f4fadd 0%, #e2f2bb 42%, #cde8a2 60%)`,capas:[{height:`58%`,fondo:`radial-gradient(46% 76% at 50% 102%, rgba(250, 255, 250, 0.7) 0 58%, rgba(0,0,0,0) 61%), radial-gradient(60% 115% at 50% 106%, #b9dc95 0 62%, rgba(0,0,0,0) 63%)`,tam:`300px 132px, 300px 168px`,dur:56,ancho:`-300px`,opacidad:.85},{height:`42%`,fondo:`radial-gradient(58% 112% at 50% 106%, #94c470 0 62%, rgba(0,0,0,0) 63%)`,tam:`198px 122px`,dur:26,ancho:`-198px`},{height:`8%`,bottom:`15%`,fondo:`radial-gradient(circle at 50% 26%, #7cc258 0 24%, rgba(0,0,0,0) 28%), linear-gradient(rgba(0,0,0,0) 55%, rgba(90, 62, 34, 0.55) 55%)`,tam:`26px 100%, 26px 100%`,dur:13,ancho:`-26px`}],suelo:{height:`17%`,fondo:`repeating-linear-gradient(90deg, rgba(46, 30, 14, 0.42) 0 7px, rgba(0,0,0,0) 7px 46px), linear-gradient(#8a6a44, #6d4f30 55%, #573d24)`,tam:`640px 100%, 100% 100%`,dur:9,ancho:`-640px`,bordeArriba:`3px solid rgba(52, 34, 16, 0.55)`},flora:{Copia:j,dur:15,bottom:`15%`,height:`46%`},angelita:{left:`38%`,animo:`atento`,animoCelebra:`pleno`},marco3d:{frente:`#8a6d47`,techo:`#a58757`,postes:`#96784f`}}],N={cafe:{pos:[-5.1,2,-.7],rotY:.32},agua:{pos:[0,2,-1.9],rotY:0},semillero:{pos:[5.1,2,-.7],rotY:-.32}},P={pos:new i(0,4.4,12.8),mira:new i(0,1.8,-.8),fov:52};function F(e){let t=N[e],n=new i(Math.sin(t.rotY),0,Math.cos(t.rotY));return{pos:new i().fromArray(t.pos).addScaledVector(n,9.2),mira:new i().fromArray(t.pos),fov:20}}var I={cielo:`#e3f3cd`,niebla:`#d6ecc0`,pasto:`#6fae52`,pastoHondo:`#5a9443`,senda:`#8fbf6b`,follaje:`#3f8a3d`,follajeClaro:`#63ad4f`,follajeLima:`#8cc95e`,tronco:`#7a5a38`,piedra:`#93a48b`,espora:`#c4ff8e`,tinta:`#2a3d1f`,crema:`#fdf8e8`};function L({x:e,z:t,alto:n=2.2,copa:r=I.follaje,s:i=1}){return(0,u.jsxs)(`group`,{position:[e,0,t],scale:i,children:[(0,u.jsxs)(`mesh`,{position:[0,n*.35,0],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.1,.16,n*.7,6]}),(0,u.jsx)(`meshLambertMaterial`,{color:I.tronco,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,n*.72,0],children:[(0,u.jsx)(`coneGeometry`,{args:[.85,n*.9,7]}),(0,u.jsx)(`meshLambertMaterial`,{color:r,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,n*1.12,0],children:[(0,u.jsx)(`coneGeometry`,{args:[.55,n*.62,7]}),(0,u.jsx)(`meshLambertMaterial`,{color:I.follajeClaro,flatShading:!0})]})]})}function R({x:e,z:t,s:n=1,color:r=I.follajeLima}){return(0,u.jsxs)(`group`,{position:[e,0,t],scale:n,children:[(0,u.jsxs)(`mesh`,{position:[0,.28,0],scale:[1,.72,1],children:[(0,u.jsx)(`icosahedronGeometry`,{args:[.42,0]}),(0,u.jsx)(`meshLambertMaterial`,{color:r,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[.3,.2,.14],scale:[1,.6,1],children:[(0,u.jsx)(`icosahedronGeometry`,{args:[.26,0]}),(0,u.jsx)(`meshLambertMaterial`,{color:I.follaje,flatShading:!0})]})]})}function z({x:e,z:t,s:n=1}){return(0,u.jsxs)(`mesh`,{position:[e,.16*n,t],scale:[n,n*.62,n],rotation:[0,e+t,0],children:[(0,u.jsx)(`dodecahedronGeometry`,{args:[.34,0]}),(0,u.jsx)(`meshLambertMaterial`,{color:I.piedra,flatShading:!0})]})}var B=Array.from({length:16},(e,t)=>({x:Math.sin(t*2.4)*(4.2+t%4),y:1.1+t*.53%2.4,z:-1.4+Math.cos(t*1.7)*(2.6+t%3),f:.35+t%5*.12,d:t*1.9,r:.035+t%3*.016}));function V({reducedMotion:e}){let t=(0,l.useRef)([]);return a(({clock:n})=>{if(e)return;let r=n.elapsedTime;B.forEach((e,n)=>{let i=t.current[n];i&&(i.position.y=e.y+Math.sin(r*e.f+e.d)*.32,i.position.x=e.x+Math.cos(r*e.f*.7+e.d)*.22)})}),(0,u.jsx)(`group`,{children:B.map((e,n)=>(0,u.jsxs)(`mesh`,{ref:e=>{t.current[n]=e},position:[e.x,e.y,e.z],children:[(0,u.jsx)(`sphereGeometry`,{args:[e.r,6,6]}),(0,u.jsx)(`meshBasicMaterial`,{color:I.espora,toneMapped:!1})]},n))})}function H({reducedMotion:e}){return(0,u.jsxs)(`group`,{children:[(0,u.jsx)(`hemisphereLight`,{args:[`#f3ffe0`,`#48793c`,.85]}),(0,u.jsx)(`directionalLight`,{position:[6,9,5],intensity:1.15,color:`#fff3d2`}),(0,u.jsx)(`ambientLight`,{intensity:.35,color:`#eaffdc`}),(0,u.jsxs)(`mesh`,{rotation:[-Math.PI/2,0,0],position:[0,0,0],children:[(0,u.jsx)(`circleGeometry`,{args:[30,40]}),(0,u.jsx)(`meshLambertMaterial`,{color:I.pasto,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{rotation:[-Math.PI/2,0,0],position:[0,.012,2.2],children:[(0,u.jsx)(`circleGeometry`,{args:[5.6,28]}),(0,u.jsx)(`meshLambertMaterial`,{color:I.senda,flatShading:!0})]}),[[-11,-10,3.4],[9,-11,4.2],[0,-14,5.4],[15,-5,2.8],[-16,-4,2.6]].map(([e,t,n],r)=>(0,u.jsxs)(`mesh`,{position:[e,-n*.45,t],scale:[n*1.5,n,n],children:[(0,u.jsx)(`sphereGeometry`,{args:[1,12,10]}),(0,u.jsx)(`meshLambertMaterial`,{color:r%2?I.pastoHondo:I.follaje,flatShading:!0})]},r)),(0,u.jsx)(L,{x:-9.2,z:-2.4,alto:2.7}),(0,u.jsx)(L,{x:9.4,z:-2.2,alto:2.8,copa:I.follajeClaro}),(0,u.jsx)(L,{x:-2.6,z:-5.4,alto:3.1,s:1.15}),(0,u.jsx)(L,{x:2.8,z:-5.8,alto:3,s:1.2,copa:I.follajeClaro}),(0,u.jsx)(L,{x:-7.4,z:-5.2,alto:3.3,s:1.1}),(0,u.jsx)(L,{x:7.6,z:-5.6,alto:3.2,s:1.15}),(0,u.jsx)(L,{x:-11.2,z:2.4,alto:2.3}),(0,u.jsx)(L,{x:11.4,z:2.8,alto:2.4,copa:I.follaje}),(0,u.jsx)(R,{x:-3,z:1.6,s:1.2}),(0,u.jsx)(R,{x:3.2,z:1.8,s:1.05,color:I.follajeClaro}),(0,u.jsx)(R,{x:-7.3,z:2.2,s:.9}),(0,u.jsx)(R,{x:7.5,z:2.4,s:1.1}),(0,u.jsx)(R,{x:-1.6,z:4.4,s:.8,color:I.follajeLima}),(0,u.jsx)(R,{x:2,z:4.8,s:.85}),(0,u.jsx)(z,{x:-4.4,z:2.9,s:1.1}),(0,u.jsx)(z,{x:4.8,z:3.4,s:.9}),(0,u.jsx)(z,{x:.2,z:-4.2,s:1.3}),(0,u.jsx)(V,{reducedMotion:e})]})}function U({tema:e,fase:t,activo:n,reducedMotion:r,onEntrar:i}){let[a,o]=(0,l.useState)(!1),c=(0,l.useRef)(null),d=N[e.id],p=e.marco3d,m=t===`valle3d`,g=t===`juego2d`&&n,_=(0,l.useCallback)(()=>{if(m){i(e.id);return}g&&(o(!0),clearTimeout(c.current),c.current=setTimeout(()=>o(!1),1400))},[m,g,i,e.id]);return(0,u.jsxs)(`group`,{position:d.pos,rotation:[0,d.rotY,0],children:[(0,u.jsxs)(`mesh`,{position:[0,.12,-.14],children:[(0,u.jsx)(`boxGeometry`,{args:[3.95,2.3,.2]}),(0,u.jsx)(`meshLambertMaterial`,{color:p.frente,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,1.4,-.14],rotation:[0,Math.PI/4,0],scale:[1,.45,1],children:[(0,u.jsx)(`coneGeometry`,{args:[2.75,.55,4]}),(0,u.jsx)(`meshLambertMaterial`,{color:p.techo,flatShading:!0})]}),[-1.75,1.75].map(e=>(0,u.jsxs)(`mesh`,{position:[e,-1.4,-.14],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.09,.12,1.4,6]}),(0,u.jsx)(`meshLambertMaterial`,{color:p.postes,flatShading:!0})]},e)),(0,u.jsx)(s,{transform:!0,distanceFactor:f,zIndexRange:[20,10],style:{pointerEvents:`auto`},children:(0,u.jsx)(`div`,{onClick:_,role:m?`button`:void 0,"aria-label":m?`Mural del mundo ${e.nombre}: toque para entrar al plano 2D`:`Plano 2D del mundo ${e.nombre}`,style:{cursor:m||g?`pointer`:`default`},children:(0,u.jsx)(h,{tema:e,reducedMotion:r,celebra:a})})})]})}var W=`
.mn-raiz {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: ${I.cielo};
  font-family: system-ui, sans-serif;
}
.mn-raiz canvas { touch-action: none; }
.mn-chrome { position: absolute; inset: 0; pointer-events: none; z-index: 40; }
.mn-chrome > * { pointer-events: auto; }
.mn-titulo {
  position: absolute;
  top: 18px;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  color: ${I.tinta};
  font-size: clamp(19px, 3.4vw, 27px);
  letter-spacing: 0.02em;
  text-shadow: 0 2px 0 rgba(255, 255, 255, 0.55);
}
.mn-sub {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  color: #47613a;
  font-size: clamp(12px, 2vw, 15px);
}
.mn-selector {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  padding: 8px;
  border-radius: 999px;
  background: rgba(253, 248, 232, 0.88);
  box-shadow: 0 4px 0 rgba(42, 61, 31, 0.35);
}
.mn-chip {
  padding: 10px 20px;
  border: 3px solid rgba(42, 61, 31, 0.35);
  border-radius: 999px;
  background: transparent;
  color: ${I.tinta};
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease;
}
.mn-chip:hover { transform: translateY(-2px); }
.mn-chip[data-activo='1'] {
  border-color: ${I.tinta};
  background: ${I.follajeLima};
}
.mn-volver {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 16px;
  border: 2px solid rgba(42, 61, 31, 0.6);
  border-radius: 999px;
  background: rgba(253, 248, 232, 0.9);
  color: ${I.tinta};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.mn-salir-valle {
  position: absolute;
  bottom: 96px;
  left: 50%;
  transform: translateX(-50%);
  padding: 11px 22px;
  border: 3px solid ${I.tinta};
  border-radius: 999px;
  background: ${I.crema};
  color: ${I.tinta};
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(42, 61, 31, 0.45);
}
.mn-pista {
  position: absolute;
  bottom: 148px;
  left: 0;
  right: 0;
  text-align: center;
  color: #4a6a3b;
  font-size: 13px;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .mn-chip { transition: none; }
}
`;function G({onBack:e}){let[t]=(0,l.useState)(()=>typeof window<`u`&&!!window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches),[n,r]=(0,l.useState)(()=>{if(typeof window>`u`)return`cafe`;let e=new URLSearchParams(window.location.search).get(`mural`);return N[e]?e:`cafe`}),[i,a]=(0,l.useState)(()=>typeof window<`u`&&new URLSearchParams(window.location.search).get(`plano`)===`2d`?`juego2d`:`valle3d`),s=(0,l.useRef)(null),d=(0,l.useCallback)(e=>{r(e),a(`acercando`)},[]),f=(0,l.useCallback)(()=>{s.current=null,a(`saliendo`)},[]),p=(0,l.useCallback)(e=>{if(i===`valle3d`){r(e),a(`acercando`);return}i===`juego2d`&&e!==n&&(s.current=e,a(`saliendo`))},[i,n]),m=(0,l.useCallback)(e=>{if(e===`acercando`){a(`juego2d`);return}let t=s.current;if(t){s.current=null,r(t),a(`acercando`);return}a(`valle3d`)},[]),h=(0,l.useMemo)(()=>F(n),[n]),g=M.find(e=>e.id===n),_=i===`valle3d`,v=i===`juego2d`,y=i===`acercando`||i===`saliendo`;return(0,u.jsxs)(`section`,{className:`mn-raiz`,"data-fase":i,"data-mural":n,"aria-label":`Murales New Donk por mundo: cada mundo tiene su propio plano 2D dentro del valle 3D`,children:[(0,u.jsx)(`style`,{children:W}),(0,u.jsxs)(o,{dpr:[1,1.5],gl:{antialias:!0,powerPreference:`high-performance`},camera:{position:P.pos.toArray(),fov:P.fov},children:[(0,u.jsx)(`color`,{attach:`background`,args:[I.cielo]}),(0,u.jsx)(`fog`,{attach:`fog`,args:[I.niebla,15,40]}),(0,u.jsx)(c,{fase:i,poseValle:P,poseBoca:h,reducedMotion:t,onLlegada:m}),(0,u.jsx)(H,{reducedMotion:t}),M.map(e=>(0,u.jsx)(U,{tema:e,fase:i,activo:n===e.id,reducedMotion:t,onEntrar:d},e.id))]}),(0,u.jsxs)(`div`,{className:`mn-chrome`,children:[_&&(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(`h2`,{className:`mn-titulo`,children:`Los murales de los mundos`}),(0,u.jsx)(`p`,{className:`mn-sub`,children:`Cada mundo tiene su propio plano 2D dentro del valle — toque un mural para entrar`}),e&&(0,u.jsx)(`button`,{type:`button`,className:`mn-volver`,onClick:e,children:`← Salir`})]}),v&&(0,u.jsxs)(u.Fragment,{children:[(0,u.jsxs)(`p`,{className:`mn-pista`,children:[`Está en el mural de `,g?.nombre,` — el valle sigue ahí, en los bordes`]}),(0,u.jsx)(`button`,{type:`button`,className:`mn-salir-valle`,onClick:f,children:`Volver al valle 3D`})]}),y&&(0,u.jsx)(`p`,{className:`mn-pista`,children:i===`acercando`?`Entrando al mural de ${g?.nombre}…`:`Volviendo al valle…`}),!y&&(0,u.jsx)(`div`,{className:`mn-selector`,role:`group`,"aria-label":`Elija el mundo del mural`,children:M.map(e=>(0,u.jsx)(`button`,{type:`button`,className:`mn-chip`,"data-activo":n===e.id?`1`:`0`,onClick:()=>p(e.id),children:e.nombre},e.id))})]})]})}export{G as default};