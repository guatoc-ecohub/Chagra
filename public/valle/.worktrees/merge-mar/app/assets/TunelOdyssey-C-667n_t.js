import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{Ri as t}from"./vendor-icons-CAOH8z0e.js";import{t as n}from"./vendor-react-C-6LStLo.js";import{S as r,U as i,ht as a,x as o}from"./vendor-three-ShL4y-d-.js";var s=e(t(),1),c=40;function l({reducedMotion:e=!1,sinCanvas:t=!1,irisMs:n=640}={}){let[r,i]=(0,s.useState)(`valle3d`),a=(0,s.useCallback)(()=>{i(e?`juego2d`:t?`iris-abre`:`acercando`)},[e,t]),o=(0,s.useCallback)(()=>{i(e?`valle3d`:`iris-cierra`)},[e]),l=(0,s.useCallback)(e=>{e===`acercando`?i(`iris-abre`):e===`saliendo`&&i(`valle3d`)},[]);return(0,s.useEffect)(()=>{if(r!==`iris-abre`&&r!==`iris-cierra`)return;let e=setTimeout(()=>i(r===`iris-abre`?`juego2d`:t?`valle3d`:`saliendo`),n+c);return()=>clearTimeout(e)},[r,n,t]),{fase:r,entrar:a,salir:o,alLlegarCamara:l,mostrar3d:!t&&r!==`juego2d`,mostrarPortada:t&&r!==`juego2d`&&r!==`iris-abre`,mostrar2d:r===`juego2d`||r===`iris-abre`||r===`iris-cierra`,enValle:r===`valle3d`,iris:r===`iris-abre`?`abre`:r===`iris-cierra`?`cierra`:`no`}}var u=e(n(),1),d=`
.tunel-odyssey__iris[data-iris='abre'] {
  animation: tunelOdysseyAbre var(--tunel-odyssey-iris-ms) cubic-bezier(0.3, 0.7, 0.4, 1) forwards;
}
.tunel-odyssey__iris[data-iris='cierra'] {
  animation: tunelOdysseyCierra var(--tunel-odyssey-iris-ms) cubic-bezier(0.6, 0, 0.7, 0.4) forwards;
}
@keyframes tunelOdysseyAbre {
  from { clip-path: circle(2.5% at 50% 52%); }
  to { clip-path: circle(142% at 50% 52%); }
}
@keyframes tunelOdysseyCierra {
  from { clip-path: circle(142% at 50% 52%); }
  to { clip-path: circle(0% at 50% 52%); }
}
`,f=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2;function p(e,t){if(Math.abs(e.fov-t)<.01)return;let n=.5*e.getFilmHeight()/Math.tan(i.degToRad(t)/2);e.setFocalLength(n)}function m({fase:e,poseValle:t,poseBoca:n,reducedMotion:i=!1,viajeSegundos:c=1.25,onLlegada:l}){let{camera:u}=r(),d=(0,s.useRef)({fasePrevia:null,t:0,avisado:!1}),m=(0,s.useRef)(l),h=(0,s.useRef)(new a);return(0,s.useEffect)(()=>{m.current=l}),o((r,a)=>{let o=d.current;o.fasePrevia!==e&&(o.fasePrevia=e,o.t=0,o.avisado=!1);let s=e===`acercando`;if(s||e===`saliendo`){o.t=Math.min(1,o.t+(i?1:Math.min(a,.05)/c));let r=f(o.t),l=s?t:n,d=s?n:t;u.position.lerpVectors(l.pos,d.pos,r),h.current.lerpVectors(l.mira,d.mira,r),u.lookAt(h.current);let g=s?r*r:Math.sqrt(r);p(u,l.fov+(d.fov-l.fov)*g),o.t>=1&&!o.avisado&&(o.avisado=!0,m.current?.(e));return}if(e===`valle3d`){let e=i?0:r.clock.elapsedTime;u.position.set(t.pos.x+Math.sin(e*.16)*.4,t.pos.y+Math.sin(e*.11)*.16,t.pos.z+Math.cos(e*.13)*.32),u.lookAt(t.mira),p(u,t.fov);return}u.position.copy(n.pos),u.lookAt(n.mira),p(u,n.fov)}),null}function h({fase:e,irisMs:t=640,className:n=``,children:r}){let i=e===`iris-abre`?`abre`:e===`iris-cierra`?`cierra`:`no`;return(0,u.jsxs)(`div`,{className:`tunel-odyssey__iris ${n}`.trim(),"data-iris":i,style:{"--tunel-odyssey-iris-ms":`${t}ms`},children:[(0,u.jsx)(`style`,{children:d}),r]})}export{h as n,l as r,m as t};