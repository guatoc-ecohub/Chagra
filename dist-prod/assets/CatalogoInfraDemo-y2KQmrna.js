import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{Ci as t}from"./vendor-icons-C4vhLH2y.js";import{t as n}from"./vendor-react-Bl3EXeX9.js";import{g as r,p as i,s as a}from"./vendor-three-6PzEuBKZ.js";import{a as o,i as s}from"./atmosferaMadre-Z4z32T2G.js";import{t as c}from"./cielosHoraData-C9k5nqMQ.js";var l=e(t(),1),u=e(n(),1);function d(e=12345){let t=e>>>0;return function(){t|=0,t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}var f=(e,t=.35)=>(0,u.jsx)(`meshLambertMaterial`,{color:e,transparent:!0,opacity:t,depthWrite:!1,side:2,flatShading:!0});function p({largo:e,ancho:t,color:n=s.tierraClara,alto:r=.05}){return(0,u.jsxs)(`mesh`,{position:[0,-r/2,0],children:[(0,u.jsx)(`boxGeometry`,{args:[e,r,t]}),(0,u.jsx)(`meshLambertMaterial`,{color:n,flatShading:!0})]})}function m({dims:e,tinte:t=`#dfeef2`,seed:n=42,frugal:r=!1}){let{largo:i=6,ancho:a=4,alto:c=2.2}=e||{},m=(0,l.useMemo)(()=>d(n),[n]),h=r?4:Math.max(5,Math.floor(i*.8)),g=(0,l.useMemo)(()=>Array.from({length:h},(e,t)=>-i/2+t/(h-1)*i),[i,h]),_=r?6:14,v=(0,l.useMemo)(()=>Array.from({length:_},()=>({x:(m()-.5)*i*.85,z:(m()-.5)*a*.6,h:.15+m()*.2,color:m()>.5?s.follaje:s.follajeClaro})),[i,a,_,m]),y=(0,l.useMemo)(()=>o(`#dfeef2`,t,.35),[t]);return(0,u.jsxs)(`group`,{children:[(0,u.jsx)(p,{largo:i+.5,ancho:a+.5}),(0,u.jsxs)(`mesh`,{position:[0,.02,-a*.22],children:[(0,u.jsx)(`boxGeometry`,{args:[i*.9,.05,a*.3]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.tierra,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,.02,a*.22],children:[(0,u.jsx)(`boxGeometry`,{args:[i*.9,.05,a*.3]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.tierra,flatShading:!0})]}),v.map((e,t)=>(0,u.jsxs)(`mesh`,{position:[e.x,.05+e.h/2,e.z],children:[(0,u.jsx)(`coneGeometry`,{args:[.08,e.h,5]}),(0,u.jsx)(`meshLambertMaterial`,{color:e.color,flatShading:!0})]},t)),g.map((e,t)=>(0,u.jsx)(`group`,{position:[e,0,0],children:(0,u.jsxs)(`mesh`,{rotation:[0,0,Math.PI/2],children:[(0,u.jsx)(`torusGeometry`,{args:[a/2,.05,4,r?8:16,Math.PI]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.maderaClara,flatShading:!0})]})},t)),(0,u.jsxs)(`mesh`,{rotation:[0,0,Math.PI/2],scale:[1,c/(a/2),1],children:[(0,u.jsx)(`cylinderGeometry`,{args:[a/2,a/2,i,r?10:20,1,!0,0,Math.PI]}),f(y,.28)]}),[-i/2,i/2].map((e,t)=>(0,u.jsxs)(`mesh`,{position:[e,0,0],rotation:[0,Math.PI/2,0],scale:[1,c/(a/2),1],children:[(0,u.jsx)(`circleGeometry`,{args:[a/2,r?8:16,0,Math.PI]}),f(y,.2)]},t)),(0,u.jsxs)(`mesh`,{position:[i/2+.01,c*.3,0],children:[(0,u.jsx)(`boxGeometry`,{args:[.02,c*.6,.6]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.madera,flatShading:!0})]})]})}function h({dims:e,tinte:t=s.madera,seed:n=12,frugal:r=!1}){let{largo:i=5,ancho:a=4,alto:c=2}=e||{},m=(0,l.useMemo)(()=>d(n),[n]),h=(0,l.useMemo)(()=>o(s.maderaClara,t,.4),[t]),g=r?3:7,_=(0,l.useMemo)(()=>Array.from({length:g},()=>({x:(m()-.5)*i*.75,z:(m()-.5)*a*.75,rot:m()*Math.PI*2,color:m()>.5?`#efe7d8`:`#c98d4f`})),[i,a,g,m]);return(0,u.jsxs)(`group`,{children:[(0,u.jsx)(p,{largo:i+.2,ancho:a+.2}),[[-i/2,-a/2],[i/2,-a/2],[i/2,a/2],[-i/2,a/2],[0,-a/2],[0,a/2]].map(([e,t],n)=>(0,u.jsxs)(`mesh`,{position:[e,c/2,t],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.04,.04,c,5]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.maderaOscura,flatShading:!0})]},n)),(0,u.jsxs)(`mesh`,{position:[0,c/2,-a/2],children:[(0,u.jsx)(`planeGeometry`,{args:[i,c]}),f(`#b9c2b0`,.25)]}),(0,u.jsxs)(`mesh`,{position:[0,c/2,a/2],children:[(0,u.jsx)(`planeGeometry`,{args:[i,c]}),f(`#b9c2b0`,.25)]}),(0,u.jsxs)(`mesh`,{position:[-i/2,c/2,0],rotation:[0,Math.PI/2,0],children:[(0,u.jsx)(`planeGeometry`,{args:[a,c]}),f(`#b9c2b0`,.25)]}),(0,u.jsxs)(`mesh`,{position:[i/2,c/2,0],rotation:[0,Math.PI/2,0],children:[(0,u.jsx)(`planeGeometry`,{args:[a,c]}),f(`#b9c2b0`,.25)]}),(0,u.jsxs)(`group`,{position:[-i*.25,0,-a*.2],children:[[-.5,.5].map(e=>[-.5,.5].map(t=>(0,u.jsxs)(`mesh`,{position:[e,.2,t],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.03,.03,.4,4]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.maderaOscura,flatShading:!0})]},`${e}:${t}`))),(0,u.jsxs)(`mesh`,{position:[0,.8,0],children:[(0,u.jsx)(`boxGeometry`,{args:[1.2,.8,1.2]}),(0,u.jsx)(`meshLambertMaterial`,{color:h,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,1.2,0],rotation:[.15,0,0],children:[(0,u.jsx)(`boxGeometry`,{args:[1.4,.04,1.4]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.lamina,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,.2,.7],rotation:[.4,0,0],children:[(0,u.jsx)(`boxGeometry`,{args:[.3,.02,.7]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.madera,flatShading:!0})]})]}),_.map((e,t)=>(0,u.jsxs)(`group`,{position:[e.x,.08,e.z],rotation:[0,e.rot,0],children:[(0,u.jsxs)(`mesh`,{position:[0,0,0],scale:[1,.8,.8],children:[(0,u.jsx)(`sphereGeometry`,{args:[.08,6,5]}),(0,u.jsx)(`meshLambertMaterial`,{color:e.color,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[.06,.08,0],children:[(0,u.jsx)(`sphereGeometry`,{args:[.04,5,4]}),(0,u.jsx)(`meshLambertMaterial`,{color:e.color,flatShading:!0})]}),!r&&(0,u.jsxs)(`mesh`,{position:[.06,.12,0],children:[(0,u.jsx)(`boxGeometry`,{args:[.02,.03,.01]}),(0,u.jsx)(`meshLambertMaterial`,{color:`#c9382b`,flatShading:!0})]})]},t))]})}function g({dims:e,tinte:t=`#ea8a24`,_seed:n=88,frugal:r=!1}){let{largo:i=8,ancho:a=5,alto:o=2.4}=e||{},c=(0,l.useMemo)(()=>t,[t]),d=r?4:6,f=(0,l.useMemo)(()=>Array.from({length:d},(e,t)=>-i/2+t/(d-1)*i),[i,d]);return(0,u.jsxs)(`group`,{children:[(0,u.jsx)(p,{largo:i+.4,ancho:a+.4,color:s.concreto}),(0,u.jsxs)(`mesh`,{position:[0,.25,-a/2],children:[(0,u.jsx)(`boxGeometry`,{args:[i,.5,.1]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.concreto,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,.25,a/2],children:[(0,u.jsx)(`boxGeometry`,{args:[i,.5,.1]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.concreto,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,.85,-a/2+.01],children:[(0,u.jsx)(`boxGeometry`,{args:[i*.98,.7,.06]}),(0,u.jsx)(`meshLambertMaterial`,{color:c,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,.85,a/2-.01],children:[(0,u.jsx)(`boxGeometry`,{args:[i*.98,.7,.06]}),(0,u.jsx)(`meshLambertMaterial`,{color:c,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[-i/2,o/2,0],children:[(0,u.jsx)(`boxGeometry`,{args:[.1,o,a]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.cal,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[i/2,o/2,0],children:[(0,u.jsx)(`boxGeometry`,{args:[.1,o,a]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.cal,flatShading:!0})]}),f.map((e,t)=>(0,u.jsxs)(`group`,{children:[(0,u.jsxs)(`mesh`,{position:[e,o/2,-a/2],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.05,.05,o,5]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.maderaOscura,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[e,o/2,a/2],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.05,.05,o,5]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.maderaOscura,flatShading:!0})]})]},t)),(0,u.jsxs)(`mesh`,{position:[0,o+.2,0],rotation:[.2,0,0],children:[(0,u.jsx)(`boxGeometry`,{args:[i+.4,.04,a/2+.3]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.lamina,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,o+.2,0],rotation:[-.2,0,0],children:[(0,u.jsx)(`boxGeometry`,{args:[i+.4,.04,a/2+.3]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.lamina,flatShading:!0})]})]})}function _({dims:e,tinte:t=`#a98a5c`,_seed:n=7,_frugal:r=!1}){let{largo:i=6,ancho:a=4,alto:c=2.6}=e||{},d=(0,l.useMemo)(()=>o(s.madera,t,.3),[t]);return(0,u.jsxs)(`group`,{children:[(0,u.jsx)(p,{largo:i+.2,ancho:a+.2,color:s.concreto}),[[-i/2+.1,-a/2+.1],[i/2-.1,-a/2+.1],[i/2-.1,a/2-.1],[-i/2+.1,a/2-.1],[0,-a/2+.1],[0,a/2-.1]].map(([e,t],n)=>(0,u.jsxs)(`mesh`,{position:[e,c/2,t],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.08,.08,c,5]}),(0,u.jsx)(`meshLambertMaterial`,{color:d,flatShading:!0})]},n)),(0,u.jsxs)(`mesh`,{position:[0,.25,a*.35],children:[(0,u.jsx)(`boxGeometry`,{args:[i*.9,.5,.4]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.concreto,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,.4,a*.35],children:[(0,u.jsx)(`boxGeometry`,{args:[i*.85,.2,.3]}),(0,u.jsx)(`meshLambertMaterial`,{color:`#cbb26a`,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,c+.15,-.2],rotation:[-.15,0,0],children:[(0,u.jsx)(`boxGeometry`,{args:[i+.4,.06,a+.5]}),(0,u.jsx)(`meshLambertMaterial`,{color:`#aa5533`,flatShading:!0}),` `]})]})}function v({dims:e,tinte:t=s.cal,seed:n=512,frugal:r=!1}){let{largo:i=5,ancho:a=4,alto:c=3}=e||{},f=(0,l.useMemo)(()=>d(n),[n]),m=(0,l.useMemo)(()=>o(s.cal,t,.45),[t]),h=r?2:4,g=(0,l.useMemo)(()=>Array.from({length:h},(e,t)=>({x:i*.3+t%2*.25,z:a*.35+Math.floor(t/2)*.25,r:.1+f()*.04,h:.35+f()*.1,color:t%2?`#d8c9a5`:`#c9b487`})),[i,a,h,f]);return(0,u.jsxs)(`group`,{children:[(0,u.jsx)(p,{largo:i+.3,ancho:a+.3,color:s.concreto}),(0,u.jsxs)(`mesh`,{position:[0,c/2,0],children:[(0,u.jsx)(`boxGeometry`,{args:[i,c,a]}),(0,u.jsx)(`meshLambertMaterial`,{color:m,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[-i*.15,c*.4,a/2+.02],children:[(0,u.jsx)(`boxGeometry`,{args:[1.3,c*.8,.05]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.maderaOscura,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[-i*.15,c*.82,a/2+.03],children:[(0,u.jsx)(`boxGeometry`,{args:[1.5,.1,.08]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.madera,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,c+.25,0],rotation:[.25,0,0],children:[(0,u.jsx)(`boxGeometry`,{args:[i+.4,.05,a/2+.4]}),(0,u.jsx)(`meshLambertMaterial`,{color:`#b96a4a`,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,c+.25,0],rotation:[-.25,0,0],children:[(0,u.jsx)(`boxGeometry`,{args:[i+.4,.05,a/2+.4]}),(0,u.jsx)(`meshLambertMaterial`,{color:`#b96a4a`,flatShading:!0})]}),g.map((e,t)=>(0,u.jsxs)(`mesh`,{position:[e.x,e.h/2,e.z],children:[(0,u.jsx)(`cylinderGeometry`,{args:[e.r,e.r*1.1,e.h,6]}),(0,u.jsx)(`meshLambertMaterial`,{color:e.color,flatShading:!0})]},t))]})}function y({dims:e,tinte:t=s.madera,seed:n=73,frugal:r=!1}){let{largo:i=4,ancho:a=3,alto:c=2.8}=e||{},f=(0,l.useMemo)(()=>d(n),[n]),m=(0,l.useMemo)(()=>o(s.madera,t,.35),[t]),h=r?2:3,g=(0,l.useMemo)(()=>Array.from({length:h},(e,t)=>({y:.6+t*.55,granoColor:f()>.5?`#d9a13b`:`#7a3b2a`})),[h,f]);return(0,u.jsxs)(`group`,{children:[(0,u.jsx)(p,{largo:i+.2,ancho:a+.2,color:s.tierraClara}),[[-i/2+.2,-a/2+.2],[i/2-.2,-a/2+.2],[i/2-.2,a/2-.2],[-i/2+.2,a/2-.2]].map(([e,t],n)=>(0,u.jsxs)(`mesh`,{position:[e,c*.45,t],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.07,.07,c*.9,4]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.maderaOscura,flatShading:!0})]},n)),(0,u.jsxs)(`mesh`,{position:[0,c*.45,0],children:[(0,u.jsx)(`boxGeometry`,{args:[i*.95,.08,a*.95]}),(0,u.jsx)(`meshLambertMaterial`,{color:m,flatShading:!0})]}),g.map((e,t)=>(0,u.jsxs)(`group`,{position:[0,e.y,0],children:[(0,u.jsxs)(`mesh`,{children:[(0,u.jsx)(`boxGeometry`,{args:[i*.85,.12,a*.85]}),(0,u.jsx)(`meshLambertMaterial`,{color:m,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,.04,0],children:[(0,u.jsx)(`boxGeometry`,{args:[i*.8,.05,a*.8]}),(0,u.jsx)(`meshLambertMaterial`,{color:e.granoColor,flatShading:!0})]})]},t)),(0,u.jsxs)(`mesh`,{position:[0,c+.15,0],rotation:[.22,0,0],children:[(0,u.jsx)(`boxGeometry`,{args:[i+.3,.04,a/2+.3]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.lamina,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[0,c+.15,0],rotation:[-.22,0,0],children:[(0,u.jsx)(`boxGeometry`,{args:[i+.3,.04,a/2+.3]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.lamina,flatShading:!0})]})]})}function b({dims:e,tinte:t=s.piedra,seed:n=99,frugal:r=!1}){let{ancho:i=3.6,alto:a=2.4}=e||{},c=i/2,f=(0,l.useMemo)(()=>o(s.piedra,t,.4),[t]),m=r?4:8,h=(0,l.useMemo)(()=>d(n),[n]),g=(0,l.useMemo)(()=>Array.from({length:m},(e,t)=>{let n=t/m*Math.PI*2;return{x:Math.cos(n)*(c+.25),z:Math.sin(n)*(c+.25),s:.15+h()*.15}}),[c,m,h]);return(0,u.jsxs)(`group`,{children:[(0,u.jsx)(p,{largo:i+.6,ancho:i+.6,color:s.concreto}),(0,u.jsxs)(`mesh`,{position:[0,a/2,0],children:[(0,u.jsx)(`cylinderGeometry`,{args:[c,c,a,r?10:20,1,!0]}),(0,u.jsx)(`meshLambertMaterial`,{color:f,flatShading:!0,side:2})]}),(0,u.jsxs)(`mesh`,{position:[0,a*.86,0],children:[(0,u.jsx)(`cylinderGeometry`,{args:[c*.94,c*.94,.05,r?10:18]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.agua,flatShading:!0})]}),(0,u.jsxs)(`group`,{position:[c-.2,a*.5,0],children:[(0,u.jsxs)(`mesh`,{position:[0,a*.45,0],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.04,.04,a*.9,6]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.lamina,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{position:[-.15,a*.9-.04,0],rotation:[0,0,Math.PI/2],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.04,.04,.3,6]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.lamina,flatShading:!0})]})]}),g.map((e,t)=>(0,u.jsxs)(`mesh`,{position:[e.x,e.s/2,e.z],scale:[e.s,e.s,e.s],children:[(0,u.jsx)(`dodecahedronGeometry`,{args:[1,0]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.piedra,flatShading:!0})]},t))]})}function x({dims:e,tinte:t=s.madera,seed:n=44,frugal:r=!1}){let{largo:i=4.5,ancho:a=1.6,alto:c=1.2}=e||{},f=(0,l.useMemo)(()=>d(n),[n]),m=(0,l.useMemo)(()=>o(s.madera,t,.3),[t]),h=(0,l.useMemo)(()=>[{color:`#5f8a3f`,h:.4+f()*.2},{color:`#7a5a38`,h:.5+f()*.15},{color:`#3a2a18`,h:.3+f()*.1}],[f]);return(0,u.jsxs)(`group`,{children:[(0,u.jsx)(p,{largo:i+.2,ancho:a+.2,color:s.tierraClara}),[-i/2,-i/6,i/6,i/2].map((e,t)=>(0,u.jsxs)(`group`,{children:[[-a/2,a/2].map(t=>(0,u.jsxs)(`mesh`,{position:[e,c/2,t],children:[(0,u.jsx)(`cylinderGeometry`,{args:[.04,.04,c,4]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.maderaOscura,flatShading:!0})]},t)),t>0&&t<3&&(0,u.jsxs)(`mesh`,{position:[e,c/2,0],children:[(0,u.jsx)(`boxGeometry`,{args:[.04,c*.8,a]}),(0,u.jsx)(`meshLambertMaterial`,{color:m,flatShading:!0})]})]},t)),[-a/2,a/2].map(e=>(0,u.jsxs)(`mesh`,{position:[0,c/2,e],children:[(0,u.jsx)(`boxGeometry`,{args:[i,c*.7,.04]}),(0,u.jsx)(`meshLambertMaterial`,{color:m,flatShading:!0})]},e)),h.map((e,t)=>(0,u.jsxs)(`mesh`,{position:[-i/3+i/3*t,e.h/2,0],scale:[i*.26,e.h,a*.75],children:[(0,u.jsx)(`sphereGeometry`,{args:[1,r?6:10,r?5:7,0,Math.PI*2,0,Math.PI/2]}),(0,u.jsx)(`meshLambertMaterial`,{color:e.color,flatShading:!0})]},t))]})}var S={invernaderoTunel:m,gallineroCampo:h,galpon:g,establo:_,almacenBodega:v,trojaSecado:y,tanqueReservorio:b,compostera:x},C=c.dorada,w={invernaderoTunel:`Invernadero tipo túnel`,gallineroCampo:`Gallinero a campo abierto`,galpon:`Galpón avícola cerrado`,establo:`Establo para ganado`,almacenBodega:`Almacén o bodega de insumos`,trojaSecado:`Troja tradicional de secado`,tanqueReservorio:`Tanque reservorio de agua`,compostera:`Compostera de tres módulos`},T={invernaderoTunel:{largo:12,ancho:6,alto:3,tinte:`#dfeef2`,seed:42},gallineroCampo:{largo:8,ancho:5,alto:2.2,tinte:`#7a5a38`,seed:12},galpon:{largo:16,ancho:8,alto:3.2,tinte:`#ea8a24`,seed:88},establo:{largo:10,ancho:6,alto:3.5,tinte:`#a98a5c`,seed:7},almacenBodega:{largo:8,ancho:6,alto:4,tinte:`#efe7d8`,seed:512},trojaSecado:{largo:4,ancho:3,alto:2.8,tinte:`#7a5a38`,seed:73},tanqueReservorio:{largo:4,ancho:4,alto:2.5,tinte:`#9a8b74`,seed:99},compostera:{largo:4.5,ancho:1.6,alto:1.2,tinte:`#7a5a38`,seed:44}},E=[{nombre:`Guadua / Madera`,hex:`#7a5a38`},{nombre:`Encalado / Blanco`,hex:`#efe7d8`},{nombre:`Naranja Finca`,hex:`#ea8a24`},{nombre:`Hojarasca / Paja`,hex:`#c9b487`},{nombre:`Piedra / Gris`,hex:`#9a8b74`},{nombre:`Plástico Claro`,hex:`#dfeef2`}];function D({tipo:e,dims:t,tinte:n,seed:r,frugal:i}){let a=S[e];return(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(`hemisphereLight`,{intensity:C.hemisferio,color:C.cielo,groundColor:C.suelo}),(0,u.jsx)(`ambientLight`,{intensity:C.ambiente,color:C.luz}),(0,u.jsx)(`directionalLight`,{position:C.solPos,intensity:C.sol,color:C.luz}),(0,u.jsx)(`directionalLight`,{position:[-6,4,-7],intensity:C.rellenoInt,color:C.relleno}),(0,u.jsxs)(`group`,{position:[0,-.01,0],children:[(0,u.jsxs)(`mesh`,{rotation:[-Math.PI/2,0,0],children:[(0,u.jsx)(`planeGeometry`,{args:[25,25]}),(0,u.jsx)(`meshLambertMaterial`,{color:`#8a6b4a`,flatShading:!0})]}),(0,u.jsxs)(`mesh`,{rotation:[-Math.PI/2,0,0],position:[0,.005,0],children:[(0,u.jsx)(`planeGeometry`,{args:[16,16]}),(0,u.jsx)(`meshLambertMaterial`,{color:s.follaje,flatShading:!0})]})]}),a&&(0,u.jsx)(a,{dims:t,tinte:n,seed:r,frugal:i})]})}var O=`
.demo-root {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 480px;
  overflow: hidden;
  background: ${C.fondo};
  color: #3e260e;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.demo-canvas {
  position: absolute;
  inset: 0;
}
.demo-sidebar {
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 22rem;
  max-height: calc(100vh - 2rem);
  background: rgba(255, 251, 242, 0.88);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(74, 52, 24, 0.18);
  border-radius: 1rem;
  padding: 1.5rem;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  box-shadow: 0 10px 30px rgba(74, 52, 24, 0.15);
  overflow-y: auto;
}
.demo-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #4a3418;
  border-bottom: 2px solid rgba(74, 52, 24, 0.1);
  padding-bottom: 0.5rem;
}
.demo-title small {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: #7a5a38;
  margin-top: 0.2rem;
}
.demo-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.demo-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a3418;
}
.demo-select, .demo-input {
  appearance: none;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(74, 52, 24, 0.3);
  border-radius: 0.5rem;
  padding: 0.5rem 0.8rem;
  font-size: 0.9rem;
  color: #4a3418;
  outline: none;
  transition: all 0.2s ease;
}
.demo-select:focus, .demo-input:focus {
  border-color: #aa5533;
  box-shadow: 0 0 0 2px rgba(170, 85, 51, 0.2);
}
.demo-slider-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.demo-slider {
  flex: 1;
  accent-color: #aa5533;
}
.demo-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: #7a5a38;
  min-width: 2.5rem;
  text-align: right;
}
.demo-color-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}
.demo-color-btn {
  border: 1px solid rgba(74, 52, 24, 0.25);
  border-radius: 0.4rem;
  padding: 0.4rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  background: white;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}
.demo-color-btn:hover {
  background: #fdf6e2;
  border-color: #7a5a38;
}
.demo-color-btn.active {
  background: #ffe8b0;
  border-color: #4a3418;
  font-weight: 600;
}
.demo-color-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.15);
}
.demo-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a3418;
  cursor: pointer;
}
.demo-checkbox {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: #aa5533;
  cursor: pointer;
}
.demo-instructions {
  font-size: 0.75rem;
  line-height: 1.4;
  color: #7a5a38;
  background: rgba(74, 52, 24, 0.05);
  padding: 0.6rem 0.8rem;
  border-radius: 0.5rem;
  border-left: 3px solid #aa5533;
}
@media (max-width: 768px) {
  .demo-sidebar {
    width: auto;
    position: absolute;
    inset: auto 1rem 1rem 1rem;
    max-height: 40vh;
  }
}
`;function k(){let[e,t]=(0,l.useState)(`invernaderoTunel`),[n,o]=(0,l.useState)(T.invernaderoTunel.largo),[s,c]=(0,l.useState)(T.invernaderoTunel.ancho),[d,f]=(0,l.useState)(T.invernaderoTunel.alto),[p,m]=(0,l.useState)(T.invernaderoTunel.tinte),[h,g]=(0,l.useState)(T.invernaderoTunel.seed),[_,v]=(0,l.useState)(!0),[y,b]=(0,l.useState)(!1),x=e=>{t(e);let n=T[e];n&&(o(n.largo),c(n.ancho),f(n.alto),m(n.tinte),g(n.seed))},S=(0,l.useMemo)(()=>({largo:n,ancho:s,alto:d}),[n,s,d]);return(0,u.jsxs)(`section`,{className:`demo-root`,children:[(0,u.jsx)(`style`,{children:O}),(0,u.jsxs)(r,{className:`demo-canvas`,camera:{position:[0,6,12],fov:45},gl:{antialias:!y,powerPreference:`high-performance`},frameloop:`always`,children:[(0,u.jsx)(D,{tipo:e,dims:S,tinte:p,seed:h,frugal:y}),(0,u.jsx)(i,{makeDefault:!0,enablePan:!0,enableZoom:!0,minDistance:3,maxDistance:25,target:[0,1,0],enableDamping:!0,dampingFactor:.05,autoRotate:_,autoRotateSpeed:.5}),(0,u.jsx)(a,{pixelated:!0})]}),(0,u.jsxs)(`div`,{className:`demo-sidebar`,children:[(0,u.jsxs)(`h2`,{className:`demo-title`,children:[`Infraestructura 3D`,(0,u.jsx)(`small`,{children:`Modelos procedurales y paramétricos de Chagra`})]}),(0,u.jsxs)(`div`,{className:`demo-group`,children:[(0,u.jsx)(`label`,{className:`demo-label`,htmlFor:`tipo-pieza`,children:`Seleccione la infraestructura:`}),(0,u.jsx)(`select`,{id:`tipo-pieza`,className:`demo-select`,value:e,onChange:e=>x(e.target.value),children:Object.entries(w).map(([e,t])=>(0,u.jsx)(`option`,{value:e,children:t},e))})]}),(0,u.jsxs)(`div`,{className:`demo-group`,children:[(0,u.jsx)(`label`,{className:`demo-label`,htmlFor:`largo-slider`,children:`Largo del espacio:`}),(0,u.jsxs)(`div`,{className:`demo-slider-container`,children:[(0,u.jsx)(`input`,{id:`largo-slider`,className:`demo-slider`,type:`range`,min:`2`,max:`20`,step:`0.5`,value:n,onChange:e=>o(parseFloat(e.target.value))}),(0,u.jsxs)(`span`,{className:`demo-value`,children:[n,` m`]})]})]}),(0,u.jsxs)(`div`,{className:`demo-group`,children:[(0,u.jsx)(`label`,{className:`demo-label`,htmlFor:`ancho-slider`,children:`Ancho del espacio:`}),(0,u.jsxs)(`div`,{className:`demo-slider-container`,children:[(0,u.jsx)(`input`,{id:`ancho-slider`,className:`demo-slider`,type:`range`,min:`2`,max:`12`,step:`0.5`,value:s,onChange:e=>c(parseFloat(e.target.value))}),(0,u.jsxs)(`span`,{className:`demo-value`,children:[s,` m`]})]})]}),(0,u.jsxs)(`div`,{className:`demo-group`,children:[(0,u.jsx)(`label`,{className:`demo-label`,htmlFor:`alto-slider`,children:`Alto de la cumbrera:`}),(0,u.jsxs)(`div`,{className:`demo-slider-container`,children:[(0,u.jsx)(`input`,{id:`alto-slider`,className:`demo-slider`,type:`range`,min:`1`,max:`6`,step:`0.1`,value:d,onChange:e=>f(parseFloat(e.target.value))}),(0,u.jsxs)(`span`,{className:`demo-value`,children:[d,` m`]})]})]}),(0,u.jsxs)(`div`,{className:`demo-group`,children:[(0,u.jsx)(`label`,{className:`demo-label`,children:`Color / Tinte predominante:`}),(0,u.jsx)(`div`,{className:`demo-color-presets`,children:E.map(e=>(0,u.jsxs)(`button`,{type:`button`,className:`demo-color-btn${p===e.hex?` active`:``}`,onClick:()=>m(e.hex),children:[(0,u.jsx)(`span`,{className:`demo-color-dot`,style:{backgroundColor:e.hex}}),e.nombre.split(` `)[0]]},e.hex))})]}),(0,u.jsxs)(`div`,{className:`demo-group`,children:[(0,u.jsx)(`label`,{className:`demo-label`,htmlFor:`semilla-input`,children:`Semilla de variación (PRNG):`}),(0,u.jsxs)(`div`,{className:`demo-slider-container`,children:[(0,u.jsx)(`input`,{id:`semilla-input`,className:`demo-slider`,type:`range`,min:`1`,max:`200`,step:`1`,value:h,onChange:e=>g(parseInt(e.target.value))}),(0,u.jsxs)(`span`,{className:`demo-value`,children:[`#`,h]})]})]}),(0,u.jsx)(`div`,{className:`demo-group`,children:(0,u.jsxs)(`label`,{className:`demo-checkbox-label`,children:[(0,u.jsx)(`input`,{type:`checkbox`,className:`demo-checkbox`,checked:_,onChange:e=>v(e.target.checked)}),`Rotar vista automáticamente`]})}),(0,u.jsx)(`div`,{className:`demo-group`,children:(0,u.jsxs)(`label`,{className:`demo-checkbox-label`,children:[(0,u.jsx)(`input`,{type:`checkbox`,className:`demo-checkbox`,checked:y,onChange:e=>b(e.target.checked)}),`Simular modo frugal (dispositivos lentos)`]})}),(0,u.jsx)(`div`,{className:`demo-instructions`,children:`Use un dedo o el mouse para rotar la visualización tridimensional. Pellizque o use la rueda para hacer zoom.`})]})]})}export{k as default};