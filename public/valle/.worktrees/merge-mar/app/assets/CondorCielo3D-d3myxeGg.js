import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{Ri as t}from"./vendor-icons-CAOH8z0e.js";import{t as n}from"./vendor-react-C-6LStLo.js";import{n as r,t as i}from"./deviceTier-B-jDHPew.js";import{b as a,g as o,u as s}from"./vendor-three-ShL4y-d-.js";import{t as c}from"./CondorBillboard-CZ3MAJmz.js";var l=e(t(),1),u=e(n(),1),d=`#a8cfe4`,f=`#c3dbe8`,p=[[-16,-30,10,15,`#7fa3b8`],[-4,-36,13,19,`#8fb2c4`],[10,-32,11,16,`#7fa3b8`],[22,-38,14,18,`#97b9ca`],[-26,-34,12,14,`#97b9ca`],[2,-24,8,11,`#6d94ab`]];function m(){return(0,u.jsxs)(`group`,{children:[(0,u.jsxs)(`mesh`,{rotation:[-Math.PI/2,0,0],position:[0,0,0],children:[(0,u.jsx)(`planeGeometry`,{args:[120,120]}),(0,u.jsx)(`meshLambertMaterial`,{color:`#8a9a6b`})]}),p.map(([e,t,n,r,i],a)=>(0,u.jsxs)(`mesh`,{position:[e,r/2-.5,t],children:[(0,u.jsx)(`coneGeometry`,{args:[n,r,5]}),(0,u.jsx)(`meshLambertMaterial`,{color:i})]},a)),(0,u.jsxs)(`mesh`,{position:[-14,22,-34],children:[(0,u.jsx)(`sphereGeometry`,{args:[2.4,12,10]}),(0,u.jsx)(`meshBasicMaterial`,{color:`#fff6dd`})]})]})}function h(){let[e,t]=(0,l.useState)(!1),{tier:n,reducedMotion:p}=(0,l.useMemo)(()=>i(),[]),h=r(n),_=!p&&n!==`bajo`;return(0,u.jsxs)(`section`,{style:{position:`fixed`,inset:0,background:d},"data-tier":n,"aria-label":`El cóndor de los Andes planeando el cielo del páramo`,children:[(0,u.jsx)(`style`,{children:g}),(0,u.jsxs)(a,{className:`cnd-canvas${e?` cnd-canvas--lista`:``}`,dpr:h.dpr,gl:{antialias:h.antialias,powerPreference:`high-performance`},camera:{position:[0,4.5,20],fov:50},frameloop:p?`demand`:`always`,onCreated:({gl:e})=>{e.setClearColor(d),t(!0)},children:[(0,u.jsx)(`fog`,{attach:`fog`,args:[f,26,68]}),(0,u.jsx)(`hemisphereLight`,{args:[`#eaf6ff`,`#6b7a55`,1.05]}),(0,u.jsx)(`directionalLight`,{position:[-8,14,6],intensity:.7,color:`#fff2d8`}),(0,u.jsx)(m,{}),(0,u.jsx)(c,{centro:[0,9.5,-4],radio:9,px:96,factor:17,modo:`orbita`,animated:_,tier:n}),_&&(0,u.jsx)(c,{centro:[0,16,-18],radio:26,px:44,factor:26,modo:`cruce`,animated:!0,tier:n}),(0,u.jsx)(o,{makeDefault:!0,enablePan:!1,enableZoom:!0,minDistance:10,maxDistance:30,target:[0,8,-4],minPolarAngle:.6,maxPolarAngle:1.65,minAzimuthAngle:-1.2,maxAzimuthAngle:1.2,enableDamping:!0,dampingFactor:.08}),(0,u.jsx)(s,{pixelated:!0})]}),(0,u.jsx)(`div`,{className:`cnd-chrome`,children:(0,u.jsxs)(`h2`,{className:`cnd-titulo`,children:[`El cóndor de los Andes`,(0,u.jsx)(`small`,{children:`Vultur gryphus — el señor del viento. Casi no aletea: planea las térmicas, y verlo cruzar el cielo es saber que el páramo está sano.`})]})})]})}var g=`
.cnd-canvas { opacity: 0; transition: opacity 0.6s ease; }
.cnd-canvas--lista { opacity: 1; }
.cnd-chrome {
  position: absolute; left: 0; right: 0; top: 0;
  padding: max(14px, env(safe-area-inset-top)) 18px 0;
  pointer-events: none;
}
.cnd-titulo {
  margin: 0; font-size: 1.15rem; font-weight: 800; color: #1e3442;
  text-shadow: 0 1px 0 rgba(255,255,255,0.35);
}
.cnd-titulo small {
  display: block; margin-top: 4px; max-width: 34rem;
  font-size: 0.8rem; font-weight: 500; line-height: 1.45; color: #2c4a5c;
}
`;export{h as default};