import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{zi as t}from"./vendor-icons-DMS4KM1u.js";import{t as n}from"./vendor-react-BPzue65w.js";import{t as r}from"./AbejaAngelita-YxPUXiqH.js";import{St as i,b as a,x as o}from"./vendor-three-681841CB.js";import{t as s}from"./deviceTier-B-jDHPew.js";import{a as c,i as l,o as u,r as d,t as f}from"./atmosferaMadre-Q4-G8LRO.js";import{i as p,r as m}from"./FaunaRubberhose-Btl8p07i.js";import{r as h}from"./particulasData-DmqUfK6Q.js";import{n as g,r as _,t as v}from"./TunelOdyssey-lkFgkFki.js";var y=e(t(),1),b=e(n(),1),x=u(d.huerta),S={pos:new i(9.2,6,12.4),mira:new i(0,1.4,0),fov:46},C={pos:new i(10.6,8.6,14.6),mira:new i(-.2,.9,-.8),fov:50},w={pos:new i(-2.2,1.14,1.05),mira:new i(-2.2,1.02,-1.6),fov:15},T=h(20260710),E=Array.from({length:26},(e,t)=>{let n=Math.floor(t/7);return{x:1.6+t%7*.72+(T()-.5)*.22,z:-1.4+n*.95+(T()-.5)*.2,s:.75+T()*.45,verde:T()>.5?l.follaje:l.follajeClaro}}),D=420,O=2800,k=372,A=2560,j=[{x0:660,x1:1010,y:312},{x0:1140,x1:1450,y:288},{x0:1950,x1:2270,y:312}];function M(e){let t=k;for(let n of j)e>=n.x0&&e<=n.x1&&n.y<t&&(t=n.y);return t}var N=[{id:`riego`,x:470,tipo:`maiz-sed`,titulo:`La mata tiene sed`,accion:`Regar`,tip:`Riegue al pie de la mata y en la mañana: el agua rinde más y no se evapora al sol del mediodía.`},{id:`asocio`,x:850,tipo:`asocio`,titulo:`El maíz está solo`,accion:`Sembrar asocio`,tip:`Las tres hermanas: el maíz sostiene al frijol, el frijol abona la tierra y la auyama tapa el suelo para que no se seque.`},{id:`aliada`,x:1290,tipo:`aliada`,titulo:`Una visita en la hoja`,accion:`Observar`,tip:`La mariquita se come los pulgones. Donde ella vive tranquila, no hace falta fumigar.`},{id:`cosecha`,x:1750,tipo:`cafeto`,titulo:`El cafeto cargó fruto`,accion:`Recoger lo maduro`,tip:`Coseche grano a grano solo el fruto rojo: el verde sigue madurando para la próxima pasada.`}],P=84,F=(()=>{let e=[],t=0;for(;e.length<22&&t<200;){t+=1;let n=90+T()*(O-320);N.some(e=>Math.abs(e.x-n)<110)||Math.abs(A-n)<130||e.push({x:n,y:M(n),s:.7+T()*.6,tono:T()>.55?l.ambar:`#c96f8f`,pasto:T()>.5})}return e})(),I=250,L=2050,R=-700;function z({fase:e,onEntrar:t}){let n=(0,y.useRef)(null);o(t=>{let r=n.current;if(!r)return;let i=t.clock.elapsedTime;r.emissiveIntensity=(e===`acercando`?1.5:.55)+Math.sin(i*2.1)*.18});let r=(0,y.useCallback)(e=>{e.stopPropagation(),t()},[t]),i=(0,y.useCallback)(()=>{document.body.style.cursor=`pointer`},[]),a=(0,y.useCallback)(()=>{document.body.style.cursor=`auto`},[]);return(0,y.useEffect)(()=>()=>{document.body.style.cursor=`auto`},[]),(0,b.jsxs)(`group`,{position:[-2.2,1.02,-1.55],children:[(0,b.jsxs)(`mesh`,{rotation:[0,0,.08],children:[(0,b.jsx)(`torusGeometry`,{args:[.82,.2,8,18]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.piedra,flatShading:!0})]}),(0,b.jsxs)(`mesh`,{position:[-.75,-.85,.1],rotation:[.1,.4,0],children:[(0,b.jsx)(`dodecahedronGeometry`,{args:[.26,0]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.piedra,flatShading:!0})]}),(0,b.jsxs)(`mesh`,{position:[.8,-.8,.14],rotation:[.3,1.1,0],children:[(0,b.jsx)(`dodecahedronGeometry`,{args:[.2,0]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.concreto,flatShading:!0})]}),(0,b.jsxs)(`mesh`,{position:[0,0,-.55],rotation:[Math.PI/2,0,0],children:[(0,b.jsx)(`cylinderGeometry`,{args:[.72,.72,1.1,14,1,!0]}),(0,b.jsx)(`meshLambertMaterial`,{color:f.sombra,side:1})]}),(0,b.jsxs)(`mesh`,{position:[0,0,-.35],onClick:r,onPointerOver:i,onPointerOut:a,children:[(0,b.jsx)(`circleGeometry`,{args:[.7,22]}),(0,b.jsx)(`meshLambertMaterial`,{ref:n,color:c(l.ambar,f.sombra,.55),emissive:l.ambar,emissiveIntensity:.55})]})]})}function B({x:e,z:t,s:n,verde:r}){return(0,b.jsxs)(`group`,{position:[e,0,t],scale:[n,n,n],children:[(0,b.jsxs)(`mesh`,{position:[0,.14,0],children:[(0,b.jsx)(`cylinderGeometry`,{args:[.03,.045,.28,5]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.madera,flatShading:!0})]}),(0,b.jsxs)(`mesh`,{position:[0,.44,0],children:[(0,b.jsx)(`coneGeometry`,{args:[.24,.52,6]}),(0,b.jsx)(`meshLambertMaterial`,{color:r,flatShading:!0})]})]})}function V({fase:e,onEntrar:t,cuidados:n}){return(0,b.jsxs)(`group`,{children:[(0,b.jsx)(`color`,{attach:`background`,args:[x.fondo]}),(0,b.jsx)(`fog`,{attach:`fog`,args:[x.niebla,15,34]}),(0,b.jsx)(`hemisphereLight`,{args:[x.cielo,x.suelo,.95*x.intensidad]}),(0,b.jsx)(`directionalLight`,{position:[6,8,4],intensity:1.05,color:f.luz}),(0,b.jsx)(`directionalLight`,{position:[-5,4,-3],intensity:.22,color:f.relleno}),(0,b.jsxs)(`mesh`,{rotation:[-Math.PI/2,0,0],position:[0,-.02,0],children:[(0,b.jsx)(`circleGeometry`,{args:[17,26]}),(0,b.jsx)(`meshLambertMaterial`,{color:x.alfombra,flatShading:!0})]}),(0,b.jsxs)(`mesh`,{position:[-2.6,-.4,-4.2],scale:[1.5,1,1.15],children:[(0,b.jsx)(`sphereGeometry`,{args:[4.1,14,10]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.follajeOscuro,flatShading:!0})]}),(0,b.jsxs)(`mesh`,{position:[-6.5,-.7,-7],scale:[1.7,.9,1.2],children:[(0,b.jsx)(`sphereGeometry`,{args:[4.4,12,9]}),(0,b.jsx)(`meshLambertMaterial`,{color:c(l.follajeOscuro,x.fondo,.35),flatShading:!0})]}),(0,b.jsxs)(`mesh`,{position:[6.8,-.9,-8],scale:[1.9,1,1.3],children:[(0,b.jsx)(`sphereGeometry`,{args:[4.6,12,9]}),(0,b.jsx)(`meshLambertMaterial`,{color:c(l.follaje,x.fondo,.45),flatShading:!0})]}),(0,b.jsx)(z,{fase:e,onEntrar:t}),(0,b.jsxs)(`group`,{position:[3.4,0,1.6],rotation:[0,-.5,0],children:[(0,b.jsxs)(`mesh`,{position:[0,.55,0],children:[(0,b.jsx)(`boxGeometry`,{args:[1.7,1.1,1.3]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.cal,flatShading:!0})]}),(0,b.jsxs)(`mesh`,{position:[0,1.32,0],rotation:[0,Math.PI/4,0],children:[(0,b.jsx)(`coneGeometry`,{args:[1.35,.75,4]}),(0,b.jsx)(`meshLambertMaterial`,{color:`#a55e3a`,flatShading:!0})]}),(0,b.jsxs)(`mesh`,{position:[0,.38,.66],children:[(0,b.jsx)(`boxGeometry`,{args:[.4,.76,.05]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.maderaOscura,flatShading:!0})]})]}),(0,b.jsxs)(`mesh`,{position:[3.8,.03,.2],rotation:[-Math.PI/2,0,.1],children:[(0,b.jsx)(`planeGeometry`,{args:[5.6,3.4]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.tierra,flatShading:!0})]}),E.map((e,t)=>(0,b.jsx)(B,{...e},t)),(0,b.jsxs)(`group`,{position:[-5.6,0,2.4],children:[(0,b.jsxs)(`mesh`,{position:[0,.7,0],children:[(0,b.jsx)(`cylinderGeometry`,{args:[.12,.18,1.4,6]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.maderaOscura,flatShading:!0})]}),(0,b.jsxs)(`mesh`,{position:[0,1.85,0],children:[(0,b.jsx)(`icosahedronGeometry`,{args:[.95,0]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.follaje,flatShading:!0})]})]}),(0,b.jsxs)(`group`,{position:[.4,0,4.6],scale:[.8,.8,.8],children:[(0,b.jsxs)(`mesh`,{position:[0,.7,0],children:[(0,b.jsx)(`cylinderGeometry`,{args:[.1,.16,1.4,6]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.madera,flatShading:!0})]}),(0,b.jsxs)(`mesh`,{position:[0,1.8,0],children:[(0,b.jsx)(`icosahedronGeometry`,{args:[.85,0]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.follajeClaro,flatShading:!0})]})]}),n>=N.length&&(0,b.jsx)(`group`,{position:[-2.2,.15,-.6],children:[-.5,0,.5].map(e=>(0,b.jsxs)(`mesh`,{position:[e,0,0],children:[(0,b.jsx)(`sphereGeometry`,{args:[.09,8,6]}),(0,b.jsx)(`meshLambertMaterial`,{color:l.ambar,emissive:l.ambar,emissiveIntensity:.7})]},e))})]})}function H(){return(0,b.jsxs)(`svg`,{className:`ody-campesino`,viewBox:`0 0 90 120`,width:`90`,height:`120`,role:`img`,"aria-label":`Campesino caminante`,children:[(0,b.jsx)(`title`,{children:`Campesino caminante`}),(0,b.jsxs)(`g`,{className:`ody-cmp-pierna ody-cmp-pierna--a`,children:[(0,b.jsx)(`path`,{d:`M40 78 Q39 96 37 110`,fill:`none`,stroke:`#4a3626`,strokeWidth:`7`,strokeLinecap:`round`}),(0,b.jsx)(`ellipse`,{cx:`36`,cy:`112`,rx:`8`,ry:`5`,fill:`#2f2318`})]}),(0,b.jsxs)(`g`,{className:`ody-cmp-pierna ody-cmp-pierna--b`,children:[(0,b.jsx)(`path`,{d:`M50 78 Q52 96 54 110`,fill:`none`,stroke:`#4a3626`,strokeWidth:`7`,strokeLinecap:`round`}),(0,b.jsx)(`ellipse`,{cx:`55`,cy:`112`,rx:`8`,ry:`5`,fill:`#2f2318`})]}),(0,b.jsx)(`path`,{d:`M27 50 L63 50 L68 84 L22 84 Z`,fill:`#8f5a3a`}),(0,b.jsx)(`path`,{d:`M24 74 L66 74 L68 84 L22 84 Z`,fill:`#6e4128`}),(0,b.jsx)(`path`,{d:`M27 50 L63 50 L64 58 L26 58 Z`,fill:`#a9714a`}),(0,b.jsxs)(`g`,{className:`ody-cmp-brazo ody-cmp-brazo--a`,children:[(0,b.jsx)(`path`,{d:`M29 56 Q20 66 18 76`,fill:`none`,stroke:`#8f5a3a`,strokeWidth:`7`,strokeLinecap:`round`}),(0,b.jsx)(`circle`,{cx:`17`,cy:`78`,r:`4.5`,fill:`#e8b489`})]}),(0,b.jsxs)(`g`,{className:`ody-cmp-brazo ody-cmp-brazo--b`,children:[(0,b.jsx)(`path`,{d:`M61 56 Q70 66 72 76`,fill:`none`,stroke:`#8f5a3a`,strokeWidth:`7`,strokeLinecap:`round`}),(0,b.jsx)(`circle`,{cx:`73`,cy:`78`,r:`4.5`,fill:`#e8b489`})]}),(0,b.jsx)(`circle`,{cx:`45`,cy:`36`,r:`14`,fill:`#e8b489`}),(0,b.jsx)(`circle`,{cx:`40`,cy:`36`,r:`2.2`,fill:`#2f2318`}),(0,b.jsx)(`circle`,{cx:`50`,cy:`36`,r:`2.2`,fill:`#2f2318`}),(0,b.jsx)(`path`,{d:`M38 43 Q45 47 52 43`,fill:`none`,stroke:`#2f2318`,strokeWidth:`2`,strokeLinecap:`round`}),(0,b.jsx)(`circle`,{cx:`36`,cy:`41`,r:`2.6`,fill:`#d98a6a`,opacity:`0.55`}),(0,b.jsx)(`circle`,{cx:`54`,cy:`41`,r:`2.6`,fill:`#d98a6a`,opacity:`0.55`}),(0,b.jsx)(`ellipse`,{cx:`45`,cy:`24`,rx:`21`,ry:`5.5`,fill:`#e9dfc8`}),(0,b.jsx)(`path`,{d:`M33 24 Q33 12 45 12 Q57 12 57 24 Z`,fill:`#e9dfc8`}),(0,b.jsx)(`path`,{d:`M33 22 L57 22 L57 24 L33 24 Z`,fill:`#5a4326`})]})}function U({tipo:e,cuidada:t}){return e===`maiz-sed`?(0,b.jsxs)(`svg`,{className:`ody-cultivo`,viewBox:`0 0 110 130`,width:`110`,height:`130`,"aria-hidden":`true`,children:[(0,b.jsxs)(`g`,{className:`ody-mata-sed`,style:{display:t?`none`:void 0},children:[(0,b.jsx)(`path`,{d:`M55 126 Q58 84 70 62`,fill:`none`,stroke:`#9a8a4a`,strokeWidth:`6`,strokeLinecap:`round`}),(0,b.jsx)(`path`,{d:`M60 96 Q76 92 84 98`,fill:`none`,stroke:`#b0a054`,strokeWidth:`5`,strokeLinecap:`round`}),(0,b.jsx)(`path`,{d:`M58 78 Q44 76 38 84`,fill:`none`,stroke:`#b0a054`,strokeWidth:`5`,strokeLinecap:`round`})]}),(0,b.jsxs)(`g`,{style:{display:t?void 0:`none`},children:[(0,b.jsx)(`path`,{d:`M55 126 Q55 70 55 34`,fill:`none`,stroke:l.follaje,strokeWidth:`6`,strokeLinecap:`round`}),(0,b.jsx)(`path`,{d:`M55 96 Q76 88 86 92`,fill:`none`,stroke:l.follajeClaro,strokeWidth:`5`,strokeLinecap:`round`}),(0,b.jsx)(`path`,{d:`M55 78 Q34 70 24 74`,fill:`none`,stroke:l.follajeClaro,strokeWidth:`5`,strokeLinecap:`round`}),(0,b.jsx)(`ellipse`,{cx:`63`,cy:`58`,rx:`7`,ry:`13`,fill:l.ambar,transform:`rotate(18 63 58)`}),(0,b.jsxs)(`g`,{className:`ody-gotas`,children:[(0,b.jsx)(`circle`,{cx:`38`,cy:`40`,r:`4`,fill:l.agua}),(0,b.jsx)(`circle`,{cx:`70`,cy:`30`,r:`3.2`,fill:l.agua}),(0,b.jsx)(`circle`,{cx:`52`,cy:`20`,r:`2.6`,fill:l.agua})]})]})]}):e===`asocio`?(0,b.jsxs)(`svg`,{className:`ody-cultivo`,viewBox:`0 0 130 130`,width:`130`,height:`130`,"aria-hidden":`true`,children:[(0,b.jsx)(`path`,{d:`M65 126 Q65 66 65 26`,fill:`none`,stroke:l.follaje,strokeWidth:`6`,strokeLinecap:`round`}),(0,b.jsx)(`path`,{d:`M65 88 Q88 80 98 84`,fill:`none`,stroke:l.follajeClaro,strokeWidth:`5`,strokeLinecap:`round`}),(0,b.jsx)(`path`,{d:`M65 66 Q42 58 32 62`,fill:`none`,stroke:l.follajeClaro,strokeWidth:`5`,strokeLinecap:`round`}),(0,b.jsx)(`ellipse`,{cx:`74`,cy:`46`,rx:`7`,ry:`13`,fill:l.ambar,transform:`rotate(16 74 46)`}),(0,b.jsxs)(`g`,{className:`ody-brote${t?` ody-brote--vivo`:``}`,children:[(0,b.jsx)(`path`,{d:`M52 122 Q46 104 58 96 Q70 88 58 78 Q48 70 60 60 Q70 52 62 42`,fill:`none`,stroke:l.follajeOscuro,strokeWidth:`4`,strokeLinecap:`round`}),(0,b.jsx)(`circle`,{cx:`60`,cy:`58`,r:`4`,fill:l.follajeOscuro}),(0,b.jsx)(`ellipse`,{cx:`30`,cy:`118`,rx:`18`,ry:`9`,fill:l.follajeClaro}),(0,b.jsx)(`ellipse`,{cx:`100`,cy:`118`,rx:`18`,ry:`9`,fill:l.follaje}),(0,b.jsx)(`circle`,{cx:`98`,cy:`110`,r:`8`,fill:l.ambar})]})]}):e===`cafeto`?(0,b.jsxs)(`svg`,{className:`ody-cultivo`,viewBox:`0 0 120 130`,width:`120`,height:`130`,"aria-hidden":`true`,children:[(0,b.jsx)(`path`,{d:`M60 126 Q60 90 60 58`,fill:`none`,stroke:l.maderaOscura,strokeWidth:`6`,strokeLinecap:`round`}),(0,b.jsx)(`ellipse`,{cx:`60`,cy:`52`,rx:`34`,ry:`28`,fill:l.follajeOscuro}),(0,b.jsx)(`ellipse`,{cx:`44`,cy:`42`,rx:`14`,ry:`10`,fill:l.follaje}),(0,b.jsxs)(`g`,{style:{display:t?`none`:void 0},children:[(0,b.jsx)(`circle`,{cx:`42`,cy:`60`,r:`5`,fill:`#b8352f`}),(0,b.jsx)(`circle`,{cx:`58`,cy:`70`,r:`5`,fill:`#b8352f`}),(0,b.jsx)(`circle`,{cx:`76`,cy:`58`,r:`5`,fill:`#b8352f`})]}),(0,b.jsx)(`circle`,{cx:`50`,cy:`46`,r:`4.4`,fill:`#7f9a4a`}),(0,b.jsx)(`circle`,{cx:`70`,cy:`42`,r:`4.4`,fill:`#7f9a4a`}),(0,b.jsxs)(`g`,{style:{display:t?void 0:`none`},children:[(0,b.jsx)(`path`,{d:`M88 112 L112 112 L108 128 L92 128 Z`,fill:l.maderaClara}),(0,b.jsx)(`circle`,{cx:`96`,cy:`110`,r:`4`,fill:`#b8352f`}),(0,b.jsx)(`circle`,{cx:`104`,cy:`109`,r:`4`,fill:`#b8352f`})]})]}):(0,b.jsxs)(`svg`,{className:`ody-cultivo`,viewBox:`0 0 120 130`,width:`120`,height:`130`,"aria-hidden":`true`,children:[(0,b.jsx)(`path`,{d:`M60 126 Q58 92 54 70`,fill:`none`,stroke:l.follaje,strokeWidth:`5`,strokeLinecap:`round`}),(0,b.jsx)(`path`,{d:`M54 70 Q20 62 26 34 Q58 30 62 62 Z`,fill:l.follajeClaro}),(0,b.jsx)(`path`,{d:`M54 70 Q92 66 96 38 Q64 28 58 62 Z`,fill:l.follaje})]})}function W({tier:e,reducedMotion:t,onSalir:n,onProgreso:i}){let a=(0,y.useRef)(null),o=(0,y.useRef)(null),s=(0,y.useRef)(null),c=(0,y.useRef)(null),u=(0,y.useRef)(null),d=(0,y.useRef)(null),f=(0,y.useRef)({x:130,y:k,vy:0,enSuelo:!0,mira:1,cam:0,ax:90,ay:k-120,pisaHasta:0}),h=(0,y.useRef)({izq:!1,der:!1,salto:!1}),g=(0,y.useRef)({ancho:720}),[_,v]=(0,y.useState)(1),[x,S]=(0,y.useState)(null),[C,w]=(0,y.useState)(!1),[T,E]=(0,y.useState)({}),[z,B]=(0,y.useState)({id:`hola`,txt:`Camine con las flechas o los botones. Donde vea la chispa, use «Cuidar».`}),V=Object.keys(T).length,W=V>=N.length;(0,y.useEffect)(()=>{let e=a.current;if(!e)return;let t=()=>{let t=e.getBoundingClientRect(),n=Math.max(.3,t.height/D);g.current={ancho:t.width/n},v(n)};t();let n=new ResizeObserver(t);return n.observe(e),()=>n.disconnect()},[]),(0,y.useEffect)(()=>{i(V)},[V,i]),(0,y.useEffect)(()=>{if(!z)return;let e=setTimeout(()=>B(null),7e3);return()=>clearTimeout(e)},[z]);let G=(0,y.useCallback)(()=>{let e=f.current;if(Math.abs(e.x-A)<P){n();return}let t=N.find(t=>Math.abs(t.x-e.x)<P);t&&(E(e=>e[t.id]?e:{...e,[t.id]:!0}),B({id:t.id,txt:t.tip}))},[n]);(0,y.useEffect)(()=>{let e=e=>{let t=h.current;e.key===`ArrowLeft`||e.key===`a`?(t.izq=!0,e.preventDefault()):e.key===`ArrowRight`||e.key===`d`?(t.der=!0,e.preventDefault()):e.key===`ArrowUp`||e.key===` `||e.key===`w`?(t.salto=!0,e.preventDefault()):(e.key===`e`||e.key===`Enter`)&&!e.repeat&&G()},t=e=>{let t=h.current;e.key===`ArrowLeft`||e.key===`a`?t.izq=!1:e.key===`ArrowRight`||e.key===`d`?t.der=!1:(e.key===`ArrowUp`||e.key===` `||e.key===`w`)&&(t.salto=!1)};return window.addEventListener(`keydown`,e),window.addEventListener(`keyup`,t),()=>{window.removeEventListener(`keydown`,e),window.removeEventListener(`keyup`,t)}},[G]),(0,y.useEffect)(()=>{let e=0,n=performance.now(),r=null,i=!1,a=l=>{let p=Math.min(.05,(l-n)/1e3);n=l;let m=f.current,_=h.current,v=!!_.der-+!!_.izq;v!==0&&(m.mira=v),m.x=Math.max(50,Math.min(O-60,m.x+v*I*p));let y=M(m.x);_.salto&&m.enSuelo&&(m.vy=R,m.enSuelo=!1),!m.enSuelo||m.y<y?(m.vy+=L*p,m.y+=m.vy*p,m.enSuelo=!1,m.vy>0&&m.y>=y&&(m.y=y,m.vy=0,m.enSuelo=!0,m.pisaHasta=l+240)):m.y>y&&(m.y=Math.max(y,m.y-620*p));let b=g.current.ancho,x=Math.max(0,Math.min(O-b,m.x-b*.42));m.cam+=(x-m.cam)*Math.min(1,p*5);let C=l/1e3,T=t?0:Math.sin(C*2.4)*7,E=m.x-m.mira*52,D=m.y-128+T;m.ax+=(E-m.ax)*Math.min(1,p*3.2),m.ay+=(D-m.ay)*Math.min(1,p*3.2);let k=o.current,j=u.current,F=d.current,z=s.current,B=c.current;if(k&&(k.style.transform=`translate3d(${-m.cam}px,0,0)`),z&&(z.style.transform=`translate3d(${-m.cam*.3}px,0,0)`),B&&(B.style.transform=`translate3d(${-m.cam*.55}px,0,0)`),j){j.style.transform=`translate3d(${m.x}px,${m.y}px,0)`;let e=v!==0&&m.enSuelo?`1`:`0`,t=m.enSuelo?`0`:`1`,n=l<m.pisaHasta?`1`:`0`,r=String(m.mira);j.dataset.anda!==e&&(j.dataset.anda=e),j.dataset.salta!==t&&(j.dataset.salta=t),j.dataset.pisa!==n&&(j.dataset.pisa=n),j.dataset.mira!==r&&(j.dataset.mira=r)}F&&(F.style.transform=`translate3d(${m.ax}px,${m.ay}px,0)`);let V=N.find(e=>Math.abs(e.x-m.x)<P)?.id??null;V!==r&&(r=V,S(V));let H=Math.abs(m.x-A)<P;H!==i&&(i=H,w(H)),e=requestAnimationFrame(a)};return e=requestAnimationFrame(a),()=>cancelAnimationFrame(e)},[t]);let K=N.find(e=>e.id===x)||null,q=C||K!=null&&!T[K.id],J=C?`Volver al valle`:K?K.accion:`Cuidar`,Y=(0,y.useCallback)((e,t)=>{h.current[e]=t},[]);return(0,b.jsxs)(`div`,{ref:a,className:`ody-2d-vista`,"data-rm":t?`1`:`0`,children:[(0,b.jsx)(`div`,{className:`ody-2d-cielo`,"aria-hidden":`true`}),(0,b.jsx)(`div`,{ref:s,className:`ody-2d-lomas ody-2d-lomas--lejos`,"aria-hidden":`true`}),(0,b.jsx)(`div`,{ref:c,className:`ody-2d-lomas ody-2d-lomas--cerca`,"aria-hidden":`true`}),(0,b.jsx)(`div`,{className:`ody-2d-marco`,style:{transform:`scale(${_})`},children:(0,b.jsxs)(`div`,{ref:o,className:`ody-2d-mundo`,children:[(0,b.jsx)(`div`,{className:`ody-suelo`,style:{left:0,width:O,top:k}}),j.map(e=>(0,b.jsx)(`div`,{className:`ody-terraza`,style:{left:e.x0,width:e.x1-e.x0,top:e.y,height:k-e.y+48}},e.x0)),F.map((e,t)=>e.pasto?(0,b.jsx)(`svg`,{className:`ody-pasto`,style:{left:e.x,top:e.y},viewBox:`0 0 30 22`,width:30*e.s,height:22*e.s,"aria-hidden":`true`,children:(0,b.jsx)(`path`,{d:`M6 22 Q4 10 2 6 M12 22 Q12 6 10 2 M18 22 Q20 8 24 4`,fill:`none`,stroke:l.follajeClaro,strokeWidth:`2.4`,strokeLinecap:`round`})},t):(0,b.jsxs)(`svg`,{className:`ody-flor`,style:{left:e.x,top:e.y},viewBox:`0 0 24 34`,width:24*e.s,height:34*e.s,"aria-hidden":`true`,children:[(0,b.jsx)(`path`,{d:`M12 34 Q12 20 12 12`,fill:`none`,stroke:l.follaje,strokeWidth:`2.4`,strokeLinecap:`round`}),(0,b.jsx)(`circle`,{cx:`12`,cy:`9`,r:`6`,fill:e.tono}),(0,b.jsx)(`circle`,{cx:`12`,cy:`9`,r:`2.4`,fill:`#f4e6c2`})]},t)),N.map(n=>{let r=M(n.x),i=!!T[n.id];return(0,b.jsxs)(`div`,{className:`ody-estacion`,style:{left:n.x,top:r},"data-cuidada":i?`1`:`0`,children:[(0,b.jsx)(U,{tipo:n.tipo,cuidada:i}),n.tipo===`aliada`&&(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(`div`,{className:`ody-fauna ody-fauna--mariquita`,children:(0,b.jsx)(p,{size:46,inline:!0,animated:!t,tier:e,className:``})}),(0,b.jsx)(`div`,{className:`ody-fauna ody-fauna--lombriz`,children:(0,b.jsx)(m,{size:52,inline:!0,animated:!t,tier:e,className:``})})]}),!i&&x===n.id&&(0,b.jsx)(`div`,{className:`ody-chispa`,"aria-hidden":`true`})]},n.id)}),(0,b.jsx)(`div`,{className:`ody-salida`,style:{left:A,top:M(A)},"data-cerca":C?`1`:`0`,children:(0,b.jsxs)(`svg`,{viewBox:`0 0 150 150`,width:`150`,height:`150`,"aria-hidden":`true`,children:[(0,b.jsx)(`ellipse`,{cx:`75`,cy:`142`,rx:`66`,ry:`8`,fill:l.tierraClara}),(0,b.jsx)(`circle`,{cx:`75`,cy:`82`,r:`56`,fill:l.piedra}),(0,b.jsx)(`circle`,{cx:`75`,cy:`82`,r:`42`,fill:`#2c2013`}),(0,b.jsx)(`circle`,{className:`ody-salida-luz`,cx:`75`,cy:`82`,r:`30`,fill:l.ambar,opacity:`0.55`})]})}),(0,b.jsx)(`div`,{ref:d,className:`ody-angelita`,children:(0,b.jsx)(r,{size:56,animo:W?`pleno`:`sereno`,energia:1,animated:!t,tier:e})}),(0,b.jsx)(`div`,{ref:u,className:`ody-jugador`,"data-anda":`0`,"data-salta":`0`,"data-pisa":`0`,"data-mira":`1`,children:(0,b.jsx)(`div`,{className:`ody-jugador__cuerpo`,children:(0,b.jsx)(H,{})})})]})}),(0,b.jsxs)(`div`,{className:`ody-hud`,children:[(0,b.jsxs)(`p`,{className:`ody-hud__progreso`,role:`status`,children:[`Cuidados: `,V,` de `,N.length,W?` — la finca quedó cuidada`:``]}),z&&(0,b.jsx)(`p`,{className:`ody-hud__mensaje`,role:`status`,children:z.txt})]}),(0,b.jsxs)(`div`,{className:`ody-mandos`,"aria-label":`Controles del juego`,children:[(0,b.jsxs)(`div`,{className:`ody-mandos__grupo`,children:[(0,b.jsx)(`button`,{type:`button`,className:`ody-boton`,"aria-label":`Caminar a la izquierda`,onPointerDown:()=>Y(`izq`,!0),onPointerUp:()=>Y(`izq`,!1),onPointerLeave:()=>Y(`izq`,!1),onPointerCancel:()=>Y(`izq`,!1),onContextMenu:e=>e.preventDefault(),children:`◀`}),(0,b.jsx)(`button`,{type:`button`,className:`ody-boton`,"aria-label":`Caminar a la derecha`,onPointerDown:()=>Y(`der`,!0),onPointerUp:()=>Y(`der`,!1),onPointerLeave:()=>Y(`der`,!1),onPointerCancel:()=>Y(`der`,!1),onContextMenu:e=>e.preventDefault(),children:`▶`})]}),(0,b.jsxs)(`div`,{className:`ody-mandos__grupo`,children:[(0,b.jsx)(`button`,{type:`button`,className:`ody-boton`,"aria-label":`Saltar`,onPointerDown:()=>Y(`salto`,!0),onPointerUp:()=>Y(`salto`,!1),onPointerLeave:()=>Y(`salto`,!1),onPointerCancel:()=>Y(`salto`,!1),onContextMenu:e=>e.preventDefault(),children:`⤒`}),(0,b.jsx)(`button`,{type:`button`,className:`ody-boton ody-boton--cuidar`,onClick:G,disabled:!q,children:J})]})]})]})}function G({onEntrar:e}){return(0,b.jsxs)(`div`,{className:`ody-portada`,"aria-hidden":`true`,children:[(0,b.jsx)(`div`,{className:`ody-portada__loma`}),(0,b.jsx)(`button`,{type:`button`,className:`ody-portada__tunel`,onClick:e,"aria-label":`Entrar al túnel`,children:(0,b.jsx)(`span`,{className:`ody-portada__boca`})})]})}var K=`
.ody-raiz {
  position: relative;
  width: 100%;
  height: 100dvh;
  min-height: 480px;
  overflow: hidden;
  background: ${x.fondo};
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: #3a2a18;
}
.ody-canvas {
  position: absolute !important;
  inset: 0;
  opacity: 0;
  transition: opacity 480ms ease;
}
.ody-canvas--lista { opacity: 1; }

/* ── chrome de la vista 3D ── */
.ody-chrome {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
  transition: opacity 700ms ease;
}
.ody-raiz[data-fase='acercando'] .ody-chrome,
.ody-raiz[data-fase='saliendo'] .ody-chrome { opacity: 0; }
.ody-titulo {
  margin: 0;
  font-size: clamp(1.3rem, 3.5vw, 2rem);
  font-weight: 800;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 0 rgba(255,244,214,0.6);
}
.ody-titulo small {
  display: block;
  font-size: 0.58em;
  font-weight: 600;
  opacity: 0.78;
  margin-top: 2px;
}
.ody-invita {
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: auto;
}
.ody-invita__abeja { flex: 0 0 auto; filter: drop-shadow(0 3px 4px rgba(58,42,24,0.25)); }
.ody-invita__caja {
  background: rgba(255, 249, 235, 0.92);
  border: 1.5px solid rgba(122, 90, 56, 0.35);
  border-radius: 14px;
  padding: 10px 14px;
  max-width: 380px;
  box-shadow: 0 4px 14px rgba(58, 42, 24, 0.18);
}
.ody-invita__caja p { margin: 0 0 8px; font-size: 0.92rem; line-height: 1.35; }
.ody-entrar {
  appearance: none;
  border: none;
  border-radius: 999px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff8ea;
  background: ${l.follajeOscuro};
  cursor: pointer;
  box-shadow: 0 3px 0 ${c(l.follajeOscuro,`#000000`,.35)};
  transition: transform 120ms ease;
}
.ody-entrar:active { transform: translateY(2px); }
.ody-volver-host {
  position: absolute;
  top: 14px;
  right: 16px;
  pointer-events: auto;
  appearance: none;
  border: 1.5px solid rgba(122, 90, 56, 0.4);
  border-radius: 999px;
  background: rgba(255, 249, 235, 0.85);
  color: #5a4326;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 6px 14px;
  cursor: pointer;
}

/* viñeta de succión durante el dolly */
.ody-vineta {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 1100ms ease-in;
  background: radial-gradient(circle at 50% 52%, transparent 34%, rgba(44, 32, 19, 0.55) 78%, rgba(30, 21, 12, 0.9) 100%);
}
.ody-raiz[data-fase='acercando'] .ody-vineta { opacity: 1; }
.ody-raiz[data-fase='iris-cierra'] .ody-vineta { opacity: 1; transition: none; }

/* ── EL IRIS (el cruce): clip-path circular, el portal más barato ── */
.ody-capa2d {
  position: absolute;
  inset: 0;
  background: ${x.fondo};
}

/* ── plano 2D ── */
.ody-2d-vista { position: absolute; inset: 0; overflow: hidden; }
.ody-2d-cielo {
  position: absolute;
  inset: 0;
  background: linear-gradient(${x.cielo} 0%, ${x.fondo} 58%, ${c(x.fondo,l.tierraClara,.35)} 100%);
}
.ody-2d-lomas {
  position: absolute;
  left: 0;
  right: -60%;
  bottom: 0;
  height: 62%;
  pointer-events: none;
  will-change: transform;
}
.ody-2d-lomas--lejos {
  background:
    radial-gradient(58% 90% at 12% 100%, ${c(l.follajeOscuro,x.fondo,.62)} 0 62%, transparent 63%),
    radial-gradient(50% 78% at 46% 100%, ${c(l.follaje,x.fondo,.66)} 0 60%, transparent 61%),
    radial-gradient(62% 95% at 84% 100%, ${c(l.follajeOscuro,x.fondo,.58)} 0 64%, transparent 65%);
}
.ody-2d-lomas--cerca {
  height: 46%;
  background:
    radial-gradient(46% 88% at 24% 100%, ${c(l.follaje,x.fondo,.4)} 0 60%, transparent 61%),
    radial-gradient(52% 92% at 70% 100%, ${c(l.follajeOscuro,x.fondo,.44)} 0 62%, transparent 63%);
}
.ody-2d-marco {
  position: absolute;
  top: 0;
  left: 0;
  width: ${O}px;
  height: ${D}px;
  transform-origin: top left;
}
.ody-2d-mundo { position: absolute; inset: 0; will-change: transform; }
.ody-suelo {
  position: absolute;
  height: ${D}px;
  background: linear-gradient(${l.follajeClaro} 0 10px, ${l.tierra} 10px 100%);
  border-radius: 6px 6px 0 0;
}
.ody-terraza {
  position: absolute;
  background: linear-gradient(${l.follajeClaro} 0 9px, ${l.tierraClara} 9px 100%);
  border-radius: 12px 12px 0 0;
  box-shadow: inset 0 -8px 0 rgba(58, 42, 24, 0.14);
}
.ody-flor, .ody-pasto { position: absolute; transform: translate(-50%, -100%); }
.ody-estacion { position: absolute; transform: translate(-50%, -100%); }
.ody-cultivo { display: block; }
.ody-gotas { animation: odyGoteo 1.6s ease-in-out infinite; }
@keyframes odyGoteo {
  0%, 100% { transform: translateY(0); opacity: 0.9; }
  50% { transform: translateY(6px); opacity: 0.5; }
}
.ody-mata-sed { transform-origin: 55px 126px; animation: odyPenar 3.2s ease-in-out infinite; }
@keyframes odyPenar {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(2.5deg); }
}
.ody-brote { transform-origin: 65px 122px; transform: scale(0); opacity: 0; transition: transform 900ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 500ms ease; }
.ody-brote--vivo { transform: scale(1); opacity: 1; }
.ody-fauna { position: absolute; }
.ody-fauna--mariquita { left: 8px; top: -104px; }
.ody-fauna--lombriz { left: 78px; top: -6px; }
.ody-chispa {
  position: absolute;
  left: 50%;
  top: -148px;
  width: 18px;
  height: 18px;
  transform: translateX(-50%);
  background: ${l.ambar};
  clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
  animation: odyChispa 1.1s ease-in-out infinite;
}
@keyframes odyChispa {
  0%, 100% { transform: translateX(-50%) scale(1) rotate(0deg); opacity: 1; }
  50% { transform: translateX(-50%) scale(1.35) rotate(22deg); opacity: 0.7; }
}
.ody-salida { position: absolute; transform: translate(-50%, -100%); }
.ody-salida-luz { transition: opacity 400ms ease; }
.ody-salida[data-cerca='1'] .ody-salida-luz { animation: odyLatir 1.2s ease-in-out infinite; }
@keyframes odyLatir {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 0.95; }
}
.ody-angelita { position: absolute; left: 0; top: 0; will-change: transform; pointer-events: none; }
.ody-angelita > * { transform: translate(-50%, -50%); }

/* ── el caminante rubber-hose ── */
.ody-jugador { position: absolute; left: 0; top: 0; width: 0; height: 0; will-change: transform; }
.ody-jugador__cuerpo { transform: translate(-50%, -100%); transform-origin: 50% 100%; }
.ody-jugador[data-mira='-1'] .ody-campesino { transform: scaleX(-1); }
.ody-jugador[data-salta='1'] .ody-jugador__cuerpo { animation: odyEstirar 420ms ease-out; }
@keyframes odyEstirar {
  0% { transform: translate(-50%, -100%) scale(1.12, 0.9); }
  40% { transform: translate(-50%, -100%) scale(0.9, 1.14); }
  100% { transform: translate(-50%, -100%) scale(1, 1); }
}
.ody-jugador[data-pisa='1'] .ody-jugador__cuerpo { animation: odyPisar 240ms ease-out; }
@keyframes odyPisar {
  0% { transform: translate(-50%, -100%) scale(1.18, 0.84); }
  100% { transform: translate(-50%, -100%) scale(1, 1); }
}
.ody-cmp-pierna, .ody-cmp-brazo { animation-play-state: paused; }
.ody-cmp-pierna--a { transform-origin: 40px 78px; animation: odyPasoA 0.5s ease-in-out infinite; }
.ody-cmp-pierna--b { transform-origin: 50px 78px; animation: odyPasoB 0.5s ease-in-out infinite; }
.ody-cmp-brazo--a { transform-origin: 29px 56px; animation: odyPasoB 0.5s ease-in-out infinite; }
.ody-cmp-brazo--b { transform-origin: 61px 56px; animation: odyPasoA 0.5s ease-in-out infinite; }
.ody-jugador[data-anda='1'] .ody-cmp-pierna,
.ody-jugador[data-anda='1'] .ody-cmp-brazo { animation-play-state: running; }
@keyframes odyPasoA {
  0%, 100% { transform: rotate(-24deg); }
  50% { transform: rotate(24deg); }
}
@keyframes odyPasoB {
  0%, 100% { transform: rotate(24deg); }
  50% { transform: rotate(-24deg); }
}
.ody-2d-vista[data-rm='1'] .ody-gotas,
.ody-2d-vista[data-rm='1'] .ody-mata-sed,
.ody-2d-vista[data-rm='1'] .ody-chispa,
.ody-2d-vista[data-rm='1'] .ody-cmp-pierna,
.ody-2d-vista[data-rm='1'] .ody-cmp-brazo { animation: none; }

/* ── HUD y mandos ── */
.ody-hud {
  position: absolute;
  top: 12px;
  left: 14px;
  right: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.ody-hud__progreso {
  margin: 0;
  align-self: flex-start;
  background: rgba(255, 249, 235, 0.9);
  border: 1.5px solid rgba(122, 90, 56, 0.3);
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 0.85rem;
  font-weight: 700;
}
.ody-hud__mensaje {
  margin: 0;
  align-self: flex-start;
  max-width: min(460px, 86%);
  background: rgba(255, 249, 235, 0.94);
  border: 1.5px solid rgba(122, 90, 56, 0.35);
  border-radius: 14px;
  padding: 9px 14px;
  font-size: 0.9rem;
  line-height: 1.4;
  box-shadow: 0 4px 12px rgba(58, 42, 24, 0.16);
}
.ody-mandos {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  display: flex;
  justify-content: space-between;
  gap: 10px;
  pointer-events: none;
}
.ody-mandos__grupo { display: flex; gap: 10px; pointer-events: auto; }
.ody-boton {
  appearance: none;
  border: none;
  min-width: 58px;
  min-height: 58px;
  border-radius: 18px;
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff8ea;
  background: rgba(90, 67, 38, 0.82);
  box-shadow: 0 3px 0 rgba(47, 35, 24, 0.7);
  cursor: pointer;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.ody-boton:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(47, 35, 24, 0.7); }
.ody-boton--cuidar { font-size: 0.95rem; padding: 0 18px; background: ${l.follajeOscuro}; }
.ody-boton--cuidar:disabled { opacity: 0.45; cursor: default; }

/* ── portada gemela para tier bajo ── */
.ody-portada { position: absolute; inset: 0; overflow: hidden; }
.ody-portada__loma {
  position: absolute;
  left: -10%;
  right: -10%;
  bottom: 0;
  height: 70%;
  background:
    radial-gradient(55% 92% at 30% 100%, ${l.follajeOscuro} 0 62%, transparent 63%),
    radial-gradient(60% 85% at 78% 100%, ${c(l.follaje,x.fondo,.3)} 0 60%, transparent 61%);
}
.ody-portada__tunel {
  position: absolute;
  left: 30%;
  bottom: 16%;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  border: 14px solid ${l.piedra};
  background: #2c2013;
  cursor: pointer;
  padding: 0;
}
.ody-portada__boca {
  position: absolute;
  inset: 18px;
  border-radius: 50%;
  background: radial-gradient(circle, ${l.ambar} 0%, rgba(217, 161, 59, 0.15) 68%, transparent 72%);
  animation: odyLatir 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .ody-portada__boca { animation: none; }
}
`;function q({onBack:e}){let[{tier:t,reducedMotion:n}]=(0,y.useState)(()=>s()),[i,o]=(0,y.useState)(!1),[c]=(0,y.useState)(()=>typeof window<`u`&&typeof window.matchMedia==`function`&&window.matchMedia(`(max-aspect-ratio: 19/20)`).matches?C:S),[l,u]=(0,y.useState)(0),{fase:d,entrar:f,salir:p,alLlegarCamara:m,mostrar3d:h,mostrarPortada:x,mostrar2d:T,enValle:E}=_({reducedMotion:n,sinCanvas:t===`bajo`}),D=(0,y.useCallback)(e=>u(e),[]),O=l>=N.length;return(0,b.jsxs)(`section`,{className:`ody-raiz`,"data-fase":d,"data-tier":t,"aria-label":`Mi finca: un túnel en la loma lleva del valle 3D a un plano 2D donde se cuida la finca caminando`,children:[(0,b.jsx)(`style`,{children:K}),h&&(0,b.jsxs)(a,{className:`ody-canvas${i?` ody-canvas--lista`:``}`,dpr:t===`alto`?[1,1.5]:[1,1.25],gl:{antialias:t===`alto`,powerPreference:`high-performance`},camera:{position:c.pos.toArray(),fov:c.fov},frameloop:n&&E?`demand`:`always`,onCreated:()=>o(!0),children:[(0,b.jsx)(v,{fase:d,poseValle:c,poseBoca:w,reducedMotion:n,onLlegada:m}),(0,b.jsx)(V,{fase:d,onEntrar:f,cuidados:l})]}),x&&(0,b.jsx)(G,{onEntrar:f}),(E||d===`acercando`||x)&&(0,b.jsxs)(`div`,{className:`ody-chrome`,children:[(0,b.jsxs)(`h2`,{className:`ody-titulo`,children:[`Mi finca`,(0,b.jsx)(`small`,{children:`Un túnel en la loma guarda el plano de la finca`})]}),(0,b.jsxs)(`div`,{className:`ody-invita`,children:[(0,b.jsx)(`div`,{className:`ody-invita__abeja`,children:(0,b.jsx)(r,{size:64,animo:O?`pleno`:`sereno`,energia:1,animated:!n,tier:t})}),(0,b.jsxs)(`div`,{className:`ody-invita__caja`,children:[(0,b.jsx)(`p`,{children:O?`La finca quedó cuidada. Vuelva al túnel cuando quiera.`:`Angelita encontró un túnel en la loma. Adentro, la finca se vuelve un camino que se recorre a pie.`}),(0,b.jsx)(`button`,{type:`button`,className:`ody-entrar`,onClick:f,children:`Entrar al túnel`})]})]})]}),e&&E&&(0,b.jsx)(`button`,{type:`button`,className:`ody-volver-host`,onClick:e,children:`Volver`}),(0,b.jsx)(`div`,{className:`ody-vineta`,"aria-hidden":`true`}),T&&(0,b.jsx)(g,{fase:d,className:`ody-capa2d`,children:(0,b.jsx)(W,{tier:t,reducedMotion:n,onSalir:p,onProgreso:D})})]})}export{q as default};