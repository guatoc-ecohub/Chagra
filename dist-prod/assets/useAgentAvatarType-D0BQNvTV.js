import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{Ci as t}from"./vendor-icons-C4vhLH2y.js";import{t as n}from"./vendor-react-Bl3EXeX9.js";import{t as r}from"./Angelita-D31wzjR-.js";var i=e(t(),1),a=e(n(),1),o={idle:`Chagra IA`,thinking:`Chagra IA · pensando`,speaking:`Chagra IA · hablando`,listening:`Chagra IA · escuchando`},s={idle:`text-emerald-300`,thinking:`text-amber-200`,speaking:`text-cyan-200`,listening:`text-fuchsia-200`};function c({state:e=`idle`,size:t=56,withLabel:n=!1,onClick:r,onDoubleClick:c,glow:l=!1,className:u=``,ariaLabel:d}){let f=s[e]||s.idle,p=o[e]||o.idle,m=typeof r==`function`||typeof c==`function`,h=i.useId(),g=(0,a.jsxs)(`div`,{className:`relative inline-flex items-center justify-center ${u}`,children:[(0,a.jsxs)(`svg`,{viewBox:`0 0 200 200`,width:t,height:t,className:`chagra-agent-avatar chagra-maiz chagra-state-${e}${l?` chagra-glow`:``}`,role:`img`,"aria-label":d||p,children:[(0,a.jsxs)(`defs`,{children:[(0,a.jsxs)(`linearGradient`,{id:`hoja-maiz-${h}`,x1:`0%`,y1:`0%`,x2:`100%`,y2:`100%`,children:[(0,a.jsx)(`stop`,{offset:`0%`,stopColor:`#a3e635`}),(0,a.jsx)(`stop`,{offset:`50%`,stopColor:`#65a30d`}),(0,a.jsx)(`stop`,{offset:`100%`,stopColor:`#3f6212`})]}),(0,a.jsxs)(`linearGradient`,{id:`tallo-maiz-${h}`,x1:`0%`,y1:`0%`,x2:`0%`,y2:`100%`,children:[(0,a.jsx)(`stop`,{offset:`0%`,stopColor:`#84cc16`}),(0,a.jsx)(`stop`,{offset:`70%`,stopColor:`#65a30d`}),(0,a.jsx)(`stop`,{offset:`100%`,stopColor:`#52525b`})]}),(0,a.jsxs)(`linearGradient`,{id:`mazorca-${h}`,x1:`0%`,y1:`0%`,x2:`100%`,y2:`0%`,children:[(0,a.jsx)(`stop`,{offset:`0%`,stopColor:`#fef08a`}),(0,a.jsx)(`stop`,{offset:`50%`,stopColor:`#facc15`}),(0,a.jsx)(`stop`,{offset:`100%`,stopColor:`#a16207`})]}),(0,a.jsxs)(`linearGradient`,{id:`barbas-${h}`,x1:`0%`,y1:`0%`,x2:`0%`,y2:`100%`,children:[(0,a.jsx)(`stop`,{offset:`0%`,stopColor:`#fbbf24`}),(0,a.jsx)(`stop`,{offset:`100%`,stopColor:`#dc2626`})]}),(0,a.jsxs)(`linearGradient`,{id:`panocha-${h}`,x1:`0%`,y1:`0%`,x2:`0%`,y2:`100%`,children:[(0,a.jsx)(`stop`,{offset:`0%`,stopColor:`#fef9c3`}),(0,a.jsx)(`stop`,{offset:`100%`,stopColor:`#a3a3a3`})]}),(0,a.jsxs)(`radialGradient`,{id:`glow-maiz-${h}`,cx:`50%`,cy:`80%`,r:`50%`,children:[(0,a.jsx)(`stop`,{offset:`0%`,stopColor:`#84cc16`,stopOpacity:`0.35`}),(0,a.jsx)(`stop`,{offset:`100%`,stopColor:`#84cc16`,stopOpacity:`0`})]})]}),(0,a.jsx)(`circle`,{cx:`100`,cy:`120`,r:`92`,fill:`url(#glow-maiz-${h})`,className:`chagra-halo`}),(0,a.jsx)(`ellipse`,{cx:`100`,cy:`180`,rx:`50`,ry:`8`,fill:`#78350f`,opacity:`0.6`}),(0,a.jsx)(`ellipse`,{cx:`100`,cy:`180`,rx:`40`,ry:`4`,fill:`#451a03`,opacity:`0.5`}),(0,a.jsxs)(`g`,{className:`chagra-planta-maiz`,style:{transformOrigin:`100px 180px`},children:[(0,a.jsx)(`path`,{d:`M 100 178 Q 99 130 100 80 Q 101 50 100 28`,fill:`none`,stroke:`url(#tallo-maiz-${h})`,strokeWidth:`4.5`,strokeLinecap:`round`}),(0,a.jsx)(`ellipse`,{cx:`100`,cy:`150`,rx:`3.2`,ry:`1.5`,fill:`#3f6212`}),(0,a.jsx)(`ellipse`,{cx:`100`,cy:`110`,rx:`3`,ry:`1.4`,fill:`#3f6212`}),(0,a.jsx)(`ellipse`,{cx:`100`,cy:`75`,rx:`2.8`,ry:`1.3`,fill:`#3f6212`}),(0,a.jsxs)(`g`,{className:`chagra-hoja chagra-hoja-1`,style:{transformOrigin:`100px 150px`},children:[(0,a.jsx)(`path`,{d:`M 100 150
                               Q 70 145 35 155
                               Q 50 162 70 158
                               Q 88 156 100 152 Z`,fill:`url(#hoja-maiz-${h})`}),(0,a.jsx)(`path`,{d:`M 100 150 Q 80 152 50 156`,fill:`none`,stroke:`#365314`,strokeWidth:`0.7`,opacity:`0.65`})]}),(0,a.jsxs)(`g`,{className:`chagra-hoja chagra-hoja-2`,style:{transformOrigin:`100px 145px`},children:[(0,a.jsx)(`path`,{d:`M 100 145
                               Q 130 140 165 150
                               Q 150 158 130 154
                               Q 112 151 100 148 Z`,fill:`url(#hoja-maiz-${h})`}),(0,a.jsx)(`path`,{d:`M 100 145 Q 120 147 150 151`,fill:`none`,stroke:`#365314`,strokeWidth:`0.7`,opacity:`0.65`})]}),(0,a.jsxs)(`g`,{className:`chagra-hoja chagra-hoja-3`,style:{transformOrigin:`100px 105px`},children:[(0,a.jsx)(`path`,{d:`M 100 105
                               Q 75 95 45 100
                               Q 58 110 78 108
                               Q 90 107 100 108 Z`,fill:`url(#hoja-maiz-${h})`,opacity:`0.95`}),(0,a.jsx)(`path`,{d:`M 100 105 Q 82 102 55 102`,fill:`none`,stroke:`#365314`,strokeWidth:`0.6`,opacity:`0.6`})]}),(0,a.jsxs)(`g`,{className:`chagra-hoja chagra-hoja-4`,style:{transformOrigin:`100px 100px`},children:[(0,a.jsx)(`path`,{d:`M 100 100
                               Q 125 90 155 95
                               Q 142 105 122 103
                               Q 110 102 100 103 Z`,fill:`url(#hoja-maiz-${h})`,opacity:`0.95`}),(0,a.jsx)(`path`,{d:`M 100 100 Q 118 97 145 97`,fill:`none`,stroke:`#365314`,strokeWidth:`0.6`,opacity:`0.6`})]}),(0,a.jsxs)(`g`,{className:`chagra-mazorca`,transform:`translate(112 110)`,children:[(0,a.jsx)(`path`,{d:`M -2 -2 Q 8 -3 18 0 Q 22 10 20 22 Q 12 30 0 28 Q -6 14 -2 -2 Z`,fill:`url(#hoja-maiz-${h})`,opacity:`0.85`}),(0,a.jsx)(`ellipse`,{cx:`9`,cy:`10`,rx:`6`,ry:`14`,fill:`url(#mazorca-${h})`}),(0,a.jsx)(`circle`,{cx:`6`,cy:`6`,r:`1.2`,fill:`#a16207`,opacity:`0.6`}),(0,a.jsx)(`circle`,{cx:`11`,cy:`8`,r:`1.2`,fill:`#a16207`,opacity:`0.6`}),(0,a.jsx)(`circle`,{cx:`7`,cy:`11`,r:`1.2`,fill:`#a16207`,opacity:`0.6`}),(0,a.jsx)(`circle`,{cx:`12`,cy:`13`,r:`1.2`,fill:`#a16207`,opacity:`0.6`}),(0,a.jsx)(`circle`,{cx:`8`,cy:`16`,r:`1.2`,fill:`#a16207`,opacity:`0.6`}),(0,a.jsx)(`circle`,{cx:`13`,cy:`18`,r:`1.2`,fill:`#a16207`,opacity:`0.6`}),(0,a.jsxs)(`g`,{className:`chagra-barbas`,children:[(0,a.jsx)(`path`,{d:`M 6 -2 Q 4 -10 0 -16`,fill:`none`,stroke:`url(#barbas-${h})`,strokeWidth:`1.2`,strokeLinecap:`round`}),(0,a.jsx)(`path`,{d:`M 9 -3 Q 9 -12 7 -20`,fill:`none`,stroke:`url(#barbas-${h})`,strokeWidth:`1.2`,strokeLinecap:`round`}),(0,a.jsx)(`path`,{d:`M 12 -2 Q 14 -10 16 -18`,fill:`none`,stroke:`url(#barbas-${h})`,strokeWidth:`1.2`,strokeLinecap:`round`}),(0,a.jsx)(`path`,{d:`M 14 -1 Q 18 -8 22 -14`,fill:`none`,stroke:`url(#barbas-${h})`,strokeWidth:`1`,strokeLinecap:`round`,opacity:`0.85`})]})]}),(0,a.jsxs)(`g`,{className:`chagra-panocha`,style:{transformOrigin:`100px 28px`},children:[(0,a.jsx)(`path`,{d:`M 100 30 L 100 12`,stroke:`url(#panocha-${h})`,strokeWidth:`2.2`,strokeLinecap:`round`}),(0,a.jsx)(`path`,{d:`M 100 24 Q 92 20 88 14`,fill:`none`,stroke:`url(#panocha-${h})`,strokeWidth:`1.2`,strokeLinecap:`round`}),(0,a.jsx)(`path`,{d:`M 100 22 Q 108 18 112 12`,fill:`none`,stroke:`url(#panocha-${h})`,strokeWidth:`1.2`,strokeLinecap:`round`}),(0,a.jsx)(`path`,{d:`M 100 20 Q 95 14 92 8`,fill:`none`,stroke:`url(#panocha-${h})`,strokeWidth:`1`,strokeLinecap:`round`}),(0,a.jsx)(`path`,{d:`M 100 18 Q 105 12 108 6`,fill:`none`,stroke:`url(#panocha-${h})`,strokeWidth:`1`,strokeLinecap:`round`}),(0,a.jsx)(`circle`,{cx:`88`,cy:`14`,r:`1.3`,fill:`#facc15`}),(0,a.jsx)(`circle`,{cx:`112`,cy:`12`,r:`1.3`,fill:`#facc15`}),(0,a.jsx)(`circle`,{cx:`92`,cy:`8`,r:`1.1`,fill:`#fde68a`}),(0,a.jsx)(`circle`,{cx:`108`,cy:`6`,r:`1.1`,fill:`#fde68a`}),(0,a.jsx)(`circle`,{cx:`100`,cy:`11`,r:`1.4`,fill:`#fbbf24`})]})]}),(0,a.jsx)(`style`,{children:`
                    .chagra-agent-avatar.chagra-maiz { display: block; }
                    .chagra-maiz .chagra-halo { animation: chagra-halo-pulse 4s ease-in-out infinite; }
                    @keyframes chagra-halo-pulse {
                        0%, 100% { opacity: 0.55; transform-origin: 100px 120px; transform: scale(1); }
                        50% { opacity: 0.85; transform: scale(1.03); }
                    }

                    /* IDLE — brisa suave en hojas */
                    .chagra-maiz.chagra-state-idle .chagra-hoja-1,
                    .chagra-maiz.chagra-state-idle .chagra-hoja-3 {
                        animation: chagra-hoja-sway-l 2.5s ease-in-out infinite;
                    }
                    .chagra-maiz.chagra-state-idle .chagra-hoja-2,
                    .chagra-maiz.chagra-state-idle .chagra-hoja-4 {
                        animation: chagra-hoja-sway-r 2.5s ease-in-out infinite;
                    }
                    @keyframes chagra-hoja-sway-l {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(-2.5deg); }
                    }
                    @keyframes chagra-hoja-sway-r {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(2.5deg); }
                    }

                    /* THINKING — barbas ondulando + planta atenta */
                    .chagra-maiz.chagra-state-thinking .chagra-barbas {
                        animation: chagra-barbas-wiggle 0.8s ease-in-out infinite;
                        transform-origin: 8px -2px;
                    }
                    @keyframes chagra-barbas-wiggle {
                        0%, 100% { transform: rotate(0deg); }
                        25% { transform: rotate(8deg); }
                        75% { transform: rotate(-8deg); }
                    }
                    .chagra-maiz.chagra-state-thinking .chagra-hoja-1,
                    .chagra-maiz.chagra-state-thinking .chagra-hoja-2,
                    .chagra-maiz.chagra-state-thinking .chagra-hoja-3,
                    .chagra-maiz.chagra-state-thinking .chagra-hoja-4 {
                        animation: chagra-hoja-think 1.2s ease-in-out infinite;
                    }
                    @keyframes chagra-hoja-think {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(1.5deg); }
                    }

                    /* SPEAKING — hojas oscilan rápido + panocha vibra */
                    .chagra-maiz.chagra-state-speaking .chagra-hoja-1,
                    .chagra-maiz.chagra-state-speaking .chagra-hoja-3 {
                        animation: chagra-hoja-sway-l 0.8s ease-in-out infinite;
                    }
                    .chagra-maiz.chagra-state-speaking .chagra-hoja-2,
                    .chagra-maiz.chagra-state-speaking .chagra-hoja-4 {
                        animation: chagra-hoja-sway-r 0.8s ease-in-out infinite;
                    }
                    .chagra-maiz.chagra-state-speaking .chagra-panocha {
                        animation: chagra-panocha-vibrate 0.25s linear infinite;
                    }
                    @keyframes chagra-panocha-vibrate {
                        0%, 100% { transform: translate(0, 0); }
                        25% { transform: translate(-0.5px, 0); }
                        75% { transform: translate(0.5px, 0); }
                    }

                    /* LISTENING — planta inclinada lateralmente, barbas erguidas */
                    .chagra-maiz.chagra-state-listening .chagra-planta-maiz {
                        animation: chagra-planta-lean 3s ease-in-out infinite;
                    }
                    @keyframes chagra-planta-lean {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(-3deg); }
                    }

                    /* Glow override cuando glow=true (respuesta lista) */
                    .chagra-maiz.chagra-glow .chagra-halo {
                        animation: chagra-glow-amber 1.5s ease-in-out infinite;
                    }
                    @keyframes chagra-glow-amber {
                        0%, 100% { filter: drop-shadow(0 0 4px #fbbf24); }
                        50% { filter: drop-shadow(0 0 12px #fbbf24); }
                    }

                    /* Reduced motion */
                    @media (prefers-reduced-motion: reduce) {
                        .chagra-agent-avatar.chagra-maiz * {
                            animation: none !important;
                        }
                        .chagra-agent-avatar.chagra-maiz.chagra-glow .chagra-halo {
                            animation: none !important;
                            filter: drop-shadow(0 0 6px #fbbf24);
                        }
                    }
                `})]}),n&&(0,a.jsx)(`span`,{className:`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium whitespace-nowrap ${f}`,children:p})]});return m?(0,a.jsx)(`button`,{type:`button`,onClick:r,onDoubleClick:c,className:`bg-transparent border-none p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-full`,"aria-label":d||p,children:g}):g}var l={idle:`acompana`,thinking:`pensando`,speaking:`respondiendo`,listening:`escuchando`};function u({state:e=`idle`,size:t=48,withLabel:n=!1,onClick:i,onDoubleClick:o,glow:s=!1,className:c=``,ariaLabel:u=`Chagra IA`}){let d=(0,a.jsx)(r,{estado:l[e]||`acompana`,size:t,className:`${s?`agt-avatar-glow `:``}${c}`.trim()||void 0,title:u}),f=n?(0,a.jsxs)(`span`,{style:{display:`inline-flex`,flexDirection:`column`,alignItems:`center`,gap:4},children:[d,(0,a.jsx)(`span`,{style:{font:`600 0.7rem/1 system-ui, sans-serif`,color:`#94a3b8`},children:`Angelita`})]}):d;return i||o?(0,a.jsx)(`button`,{type:`button`,onClick:i,onDoubleClick:o,"aria-label":u,title:u,style:{background:`none`,border:`none`,padding:0,cursor:`pointer`,lineHeight:0},children:f}):f}var d=`chagra:agent-avatar-type`,f=[`colibri`,`colibri_svg`,`maiz`],p=`colibri`;function m(){try{let e=localStorage.getItem(d);if(e&&f.includes(e))return e}catch{}return p}function h(){let[e,t]=(0,i.useState)(m);return(0,i.useEffect)(()=>{function e(e){e.key===d&&t(m())}function n(e){e.detail&&f.includes(e.detail)&&t(e.detail)}return window.addEventListener(`storage`,e),window.addEventListener(`chagra:agent-avatar-changed`,n),()=>{window.removeEventListener(`storage`,e),window.removeEventListener(`chagra:agent-avatar-changed`,n)}},[]),[e,(0,i.useCallback)(e=>{if(f.includes(e)){try{localStorage.setItem(d,e)}catch{}t(e),window.dispatchEvent(new CustomEvent(`chagra:agent-avatar-changed`,{detail:e}))}},[])]}export{u as n,c as r,h as t};