import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{zi as t}from"./vendor-icons-DMS4KM1u.js";import{t as n}from"./vendor-react-BPzue65w.js";var r=e(t(),1),i=e(n(),1);function a({intense:e=!1}){let t=(0,r.useRef)(null);return(0,r.useEffect)(()=>{if(!e)return;let n=t.current;if(!n||typeof window<`u`&&window.matchMedia(`(prefers-reduced-motion: reduce)`).matches||typeof window<`u`&&getComputedStyle(document.documentElement).getPropertyValue(`--fx-particles`).trim()===`0`)return;let r=n.getContext(`2d`);if(!r)return;let i=0,a=!0,o=()=>{let e=Math.min(window.devicePixelRatio||1,2),t=n.clientWidth,i=n.clientHeight;n.width=t*e,n.height=i*e,r.scale(e,e)};o(),window.addEventListener(`resize`,o);let s=window.innerWidth<640?32:60,c=[`#10b981`,`#06b6d4`,`#a78bfa`,`#84cc16`,`#22d3ee`],l=Array.from({length:s},()=>({x:Math.random()*n.clientWidth,y:Math.random()*n.clientHeight,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:1.2+Math.random()*2.2,color:c[Math.floor(Math.random()*c.length)],phase:Math.random()*Math.PI*2,speed:.5+Math.random()*.8})),u=performance.now(),d=e=>{if(!a)return;let t=Math.min(50,e-u)/16;u=e;let o=n.clientWidth,s=n.clientHeight;r.clearRect(0,0,o,s);let c=e/1e3;l.forEach(e=>{let n=Math.sin(e.y*.008+c*.5+e.phase)*.4,i=Math.cos(e.x*.008+c*.4+e.phase)*.4;e.vx+=n*.02*t,e.vy+=i*.02*t,e.vx*=.985,e.vy*=.985,e.x+=e.vx*e.speed*t,e.y+=e.vy*e.speed*t,e.x<-10&&(e.x=o+10),e.x>o+10&&(e.x=-10),e.y<-10&&(e.y=s+10),e.y>s+10&&(e.y=-10);let a=e.r*(1+Math.sin(c*e.speed+e.phase)*.3),l=r.createRadialGradient(e.x,e.y,0,e.x,e.y,a*4);l.addColorStop(0,e.color),l.addColorStop(.4,e.color+`88`),l.addColorStop(1,e.color+`00`),r.fillStyle=l,r.beginPath(),r.arc(e.x,e.y,a*4,0,Math.PI*2),r.fill(),r.fillStyle=e.color,r.beginPath(),r.arc(e.x,e.y,a,0,Math.PI*2),r.fill()}),i=requestAnimationFrame(d)};return i=requestAnimationFrame(d),()=>{a=!1,cancelAnimationFrame(i),window.removeEventListener(`resize`,o)}},[e]),(0,i.jsxs)(`div`,{className:`absolute inset-0 pointer-events-none overflow-hidden bp-fx-layer`,"aria-hidden":`true`,"data-biopunk-intense":e?`on`:`off`,style:{opacity:`var(--fx-glow-opacity, 1)`},children:[(0,i.jsx)(`div`,{className:`absolute inset-0 bg-biopunk-pattern transition-opacity duration-[1500ms] ease-out`,style:{opacity:e?0:.08,animation:`none`}}),(0,i.jsx)(`div`,{className:`absolute inset-0 transition-opacity duration-[1500ms] ease-out`,style:{background:`conic-gradient(from 0deg at 50% 50%,
                        rgba(15, 23, 42, 0) 0%,
                        rgba(16, 185, 129, 0.18) 18%,
                        rgba(6, 182, 212, 0.22) 35%,
                        rgba(168, 85, 247, 0.16) 55%,
                        rgba(132, 204, 22, 0.18) 75%,
                        rgba(15, 23, 42, 0) 100%)`,opacity:e?.9:0,animation:e?`biopunk-conic-rotate 40s linear infinite`:`none`,filter:`blur(20px)`}}),(0,i.jsx)(`canvas`,{ref:t,className:`absolute inset-0 w-full h-full transition-opacity duration-[1200ms] ease-out`,style:{opacity:e?.85:0}}),(0,i.jsx)(`div`,{className:`absolute inset-0 transition-opacity duration-[1500ms] ease-out`,style:{background:`radial-gradient(ellipse at center, transparent 30%, rgba(2,6,23,0.75) 95%)`,opacity:e?.6:.3}}),(0,i.jsx)(`style`,{children:`
                @keyframes biopunk-pulse {
                    0%, 100% { filter: hue-rotate(0deg) saturate(1) brightness(1); }
                    50%      { filter: hue-rotate(20deg) saturate(1.4) brightness(1.15); }
                }
                @keyframes biopunk-conic-rotate {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                @media (prefers-reduced-motion: reduce) {
                    [data-biopunk-intense] * {
                        animation: none !important;
                    }
                }
            `})]})}export{a as default};