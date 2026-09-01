import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{Ri as t}from"./vendor-icons-CAOH8z0e.js";import{t as n}from"./vendor-react-C-6LStLo.js";import{n as r}from"./deviceTier-B-jDHPew.js";import{A as i,N as a,X as o,f as s,ht as c,ot as l,rt as u}from"./vendor-three-ShL4y-d-.js";import{o as d}from"./cielosHoraData-wXYl_k9S.js";import{t as f}from"./useCicloDia-BNoLQWsi.js";import{o as p,r as m}from"./atmosferaMadre-D2ajRvZ4.js";import"./sombreadoVegetal-BStrazjc.js";import"./transiciones-DbXJ2ojT.js";import"./CamaraDirector-CxEV1PT6.js";import"./ruido-B1xtqgZ_.js";import"./camaraDioramas-D5JzQsFq.js";import{t as h}from"./SombraContacto-DZsiE8GG.js";var g=e(t(),1);function _(e,t){let n=d(t),r=p(m[e],n);return{fondo:r.fondo,cielo:r.cielo,suelo:r.suelo,niebla:r.niebla,alfombra:r.alfombra,intensidad:r.intensidad,luz:n.luz,relleno:n.relleno,sombra:n.sombra,solPos:n.solPos,estrellas:n.estrellas,franja:t}}function v({familia:e=`neutro`,reducedMotion:t=!1}={}){let{franja:n}=f({reducedMotion:t});return(0,g.useMemo)(()=>_(e,n),[e,n])}var y=e(n(),1);function b({familia:e=`neutro`,tier:t=`alto`,reducedMotion:n=!1,radio:i=6.5,piso:a=0,conSuelo:o=!0,conNiebla:c=!0,conEstrellas:l=!0,sombra:u=null}){let d=v({familia:e,reducedMotion:n}),f=t===`bajo`,p=r(t),m=!!(u&&p.sombras);return(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)(`color`,{attach:`background`,args:[d.fondo]}),c&&!f&&(0,y.jsx)(`fog`,{attach:`fog`,args:[d.niebla,i*1.4,i*4.6]}),(0,y.jsx)(`hemisphereLight`,{intensity:.55*d.intensidad,color:d.cielo,groundColor:d.suelo}),(0,y.jsx)(`ambientLight`,{intensity:.28*d.intensidad,color:d.luz}),(0,y.jsx)(`directionalLight`,{position:d.solPos,intensity:.9*d.intensidad,color:d.luz,castShadow:m,...m?{"shadow-mapSize":[1024,1024],"shadow-camera-far":u.far??30,"shadow-camera-left":u.left??-12,"shadow-camera-right":u.right??12,"shadow-camera-top":u.top??12,"shadow-camera-bottom":u.bottom??-12}:null}),(0,y.jsx)(`directionalLight`,{position:[-5,4,-6],intensity:.22,color:d.relleno}),l&&d.estrellas>0&&!f&&(0,y.jsx)(s,{radius:i*8,depth:30,count:Math.round(p.estrellas*d.estrellas),factor:3,saturation:0,fade:!0,speed:n?0:.5}),o&&!f&&(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)(h,{refExt:void 0,pos:[0,a+.008,0],radio:i*.68,color:d.alfombra,opacidad:.5,orden:1}),(0,y.jsx)(h,{refExt:void 0,pos:[0,a+.02,0],radio:i*.4,color:d.sombra,opacidad:.3,orden:2})]})]})}var x={amanecer:.55,manana:.3,mediodia:.22,tarde:.32,atardecer:.75,noche:.32},S=`
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,C=`
  varying vec3 vPos;
  uniform vec3 uCenit;
  uniform vec3 uHorizonte;
  uniform vec3 uAstro;
  uniform vec3 uSolDir;
  uniform float uGlow;
  void main() {
    vec3 dir = normalize(vPos);
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(uHorizonte, uCenit, pow(h, 0.58));
    float s = pow(max(dot(dir, normalize(uSolDir)), 0.0), 5.0);
    col += uAstro * s * uGlow;
    gl_FragColor = vec4(col, 1.0);
  }
`;function w({atm:e,radio:t=60,glow:n=null}){let r=(0,g.useRef)(null),a=(0,g.useMemo)(()=>new l({vertexShader:S,fragmentShader:C,uniforms:{uCenit:{value:new i(`#6fb0dd`)},uHorizonte:{value:new i(`#eae9c0`)},uAstro:{value:new i(`#fff3cf`)},uSolDir:{value:new c(6,9,4)},uGlow:{value:.3}},side:1,depthWrite:!1,fog:!1}),[]);return(0,g.useEffect)(()=>()=>a.dispose(),[a]),(0,g.useLayoutEffect)(()=>{let t=r.current;if(!t)return;let i=t.material.uniforms,a=Math.min(1,.22+.78*e.intensidad);i.uCenit.value.set(e.cielo).multiplyScalar(a),i.uHorizonte.value.set(e.niebla).multiplyScalar(a),i.uAstro.value.set(e.luz),i.uSolDir.value.set(e.solPos[0],e.solPos[1],e.solPos[2]),i.uGlow.value=n??x[e.franja]??.3},[e,n]),(0,y.jsx)(`mesh`,{ref:r,material:a,renderOrder:-10,frustumCulled:!1,children:(0,y.jsx)(`sphereGeometry`,{args:[t,24,12]})})}var T=[70,128,192,255];function E(e=4){let t=new a(e===T.length?new Uint8Array(T):new Uint8Array(Array.from({length:e},(t,n)=>Math.round(70+185*n/Math.max(1,e-1)))),e,1,u);return t.minFilter=o,t.magFilter=o,t.needsUpdate=!0,t}function D(e=4){let t=(0,g.useMemo)(()=>E(e),[e]);return(0,g.useEffect)(()=>()=>t.dispose(),[t]),t}export{v as i,w as n,b as r,D as t};