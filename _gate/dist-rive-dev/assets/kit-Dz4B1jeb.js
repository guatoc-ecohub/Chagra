import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{zi as t}from"./vendor-icons-DMS4KM1u.js";import{t as n}from"./vendor-react-BPzue65w.js";import{A as r,N as i,St as a,f as o,lt as s,nt as c,pt as l}from"./vendor-three-681841CB.js";import{J as u,L as d}from"./main-CHv4HWj2.js";import{n as f}from"./deviceTier-B-jDHPew.js";import{t as p}from"./useCicloDia-sPYZbbhh.js";import{o as m,r as h}from"./atmosferaMadre-Q4-G8LRO.js";import"./sombreadoVegetal-DNovXLBj.js";import"./transiciones-B5SgB-vK.js";import"./ruido-DM7NU56W.js";import"./CamaraDirector-CwMKpnt2.js";import"./camaraDioramas-D5JzQsFq.js";var g=e(t(),1);function _(e,t){let n=u(t),r=m(h[e],n);return{fondo:r.fondo,cielo:r.cielo,suelo:r.suelo,niebla:r.niebla,alfombra:r.alfombra,intensidad:r.intensidad,luz:n.luz,relleno:n.relleno,sombra:n.sombra,solPos:n.solPos,estrellas:n.estrellas,franja:t}}function v({familia:e=`neutro`,reducedMotion:t=!1}={}){let{franja:n}=p({reducedMotion:t});return(0,g.useMemo)(()=>_(e,n),[e,n])}var y=e(n(),1);function b({familia:e=`neutro`,tier:t=`alto`,reducedMotion:n=!1,radio:r=6.5,piso:i=0,conSuelo:a=!0,conNiebla:s=!0,conEstrellas:c=!0,sombra:l=null}){let u=v({familia:e,reducedMotion:n}),p=t===`bajo`,m=f(t),h=!!(l&&m.sombras);return(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)(`color`,{attach:`background`,args:[u.fondo]}),s&&!p&&(0,y.jsx)(`fog`,{attach:`fog`,args:[u.niebla,r*1.4,r*4.6]}),(0,y.jsx)(`hemisphereLight`,{intensity:.55*u.intensidad,color:u.cielo,groundColor:u.suelo}),(0,y.jsx)(`ambientLight`,{intensity:.28*u.intensidad,color:u.luz}),(0,y.jsx)(`directionalLight`,{position:u.solPos,intensity:.9*u.intensidad,color:u.luz,castShadow:h,...h?{"shadow-mapSize":[1024,1024],"shadow-camera-far":l.far??30,"shadow-camera-left":l.left??-12,"shadow-camera-right":l.right??12,"shadow-camera-top":l.top??12,"shadow-camera-bottom":l.bottom??-12}:null}),(0,y.jsx)(`directionalLight`,{position:[-5,4,-6],intensity:.22,color:u.relleno}),c&&u.estrellas>0&&!p&&(0,y.jsx)(o,{radius:r*8,depth:30,count:Math.round(m.estrellas*u.estrellas),factor:3,saturation:0,fade:!0,speed:n?0:.5}),a&&!p&&(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)(d,{refExt:void 0,pos:[0,i+.008,0],radio:r*.68,color:u.alfombra,opacidad:.5,orden:1}),(0,y.jsx)(d,{refExt:void 0,pos:[0,i+.02,0],radio:r*.4,color:u.sombra,opacidad:.3,orden:2})]})]})}var x={amanecer:.55,manana:.3,mediodia:.22,tarde:.32,atardecer:.75,noche:.32},S=`
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
`;function w({atm:e,radio:t=60,glow:n=null}){let i=(0,g.useRef)(null),o=(0,g.useMemo)(()=>new l({vertexShader:S,fragmentShader:C,uniforms:{uCenit:{value:new r(`#6fb0dd`)},uHorizonte:{value:new r(`#eae9c0`)},uAstro:{value:new r(`#fff3cf`)},uSolDir:{value:new a(6,9,4)},uGlow:{value:.3}},side:1,depthWrite:!1,fog:!1}),[]);return(0,g.useEffect)(()=>()=>o.dispose(),[o]),(0,g.useLayoutEffect)(()=>{let t=i.current;if(!t)return;let r=t.material.uniforms,a=Math.min(1,.22+.78*e.intensidad);r.uCenit.value.set(e.cielo).multiplyScalar(a),r.uHorizonte.value.set(e.niebla).multiplyScalar(a),r.uAstro.value.set(e.luz),r.uSolDir.value.set(e.solPos[0],e.solPos[1],e.solPos[2]),r.uGlow.value=n??x[e.franja]??.3},[e,n]),(0,y.jsx)(`mesh`,{ref:i,material:o,renderOrder:-10,frustumCulled:!1,children:(0,y.jsx)(`sphereGeometry`,{args:[t,24,12]})})}var T=[70,128,192,255];function E(e=4){let t=new i(e===T.length?new Uint8Array(T):new Uint8Array(Array.from({length:e},(t,n)=>Math.round(70+185*n/Math.max(1,e-1)))),e,1,s);return t.minFilter=c,t.magFilter=c,t.needsUpdate=!0,t}function D(e=4){let t=(0,g.useMemo)(()=>E(e),[e]);return(0,g.useEffect)(()=>()=>t.dispose(),[t]),t}new a,new a;export{v as i,w as n,b as r,D as t};