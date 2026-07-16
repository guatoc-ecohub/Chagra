import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{Ci as t}from"./vendor-icons-C4vhLH2y.js";import{t as n}from"./vendor-react-Bl3EXeX9.js";var r=e(t(),1),i=e(n(),1),a={idle:`Chagra IA`,thinking:`Chagra IA · pensando`,speaking:`Chagra IA · hablando`,listening:`Chagra IA · escuchando`},o={idle:`text-emerald-300`,thinking:`text-amber-200`,speaking:`text-cyan-200`,listening:`text-fuchsia-200`};function s({state:e=`idle`,size:t=56,withLabel:n=!1,onClick:s=void 0,onDoubleClick:c=void 0,glow:l=!1,className:u=``,ariaLabel:d=void 0}){let f=o[e]||o.idle,p=a[e]||a.idle,m=typeof s==`function`||typeof c==`function`,h=r.useId(),g=(0,i.jsxs)(`div`,{className:`relative inline-flex items-center justify-center ${u}`,children:[(0,i.jsxs)(`svg`,{viewBox:`0 0 200 200`,width:t,height:t,className:`chagra-agent-avatar chagra-state-${e}${l?` chagra-glow`:``}`,role:`img`,"aria-label":d||p,children:[(0,i.jsxs)(`defs`,{children:[(0,i.jsxs)(`linearGradient`,{id:`plumaje-${h}`,x1:`0%`,y1:`0%`,x2:`100%`,y2:`80%`,children:[(0,i.jsx)(`stop`,{offset:`0%`,stopColor:`#34d399`}),(0,i.jsx)(`stop`,{offset:`35%`,stopColor:`#10b981`}),(0,i.jsx)(`stop`,{offset:`65%`,stopColor:`#06b6d4`}),(0,i.jsx)(`stop`,{offset:`100%`,stopColor:`#8b5cf6`})]}),(0,i.jsxs)(`radialGradient`,{id:`gorget-${h}`,cx:`50%`,cy:`50%`,r:`50%`,children:[(0,i.jsx)(`stop`,{offset:`0%`,stopColor:`#fde68a`}),(0,i.jsx)(`stop`,{offset:`40%`,stopColor:`#f59e0b`}),(0,i.jsx)(`stop`,{offset:`100%`,stopColor:`#dc2626`})]}),(0,i.jsxs)(`radialGradient`,{id:`corola-${h}`,cx:`50%`,cy:`30%`,r:`80%`,children:[(0,i.jsx)(`stop`,{offset:`0%`,stopColor:`#fef3c7`}),(0,i.jsx)(`stop`,{offset:`20%`,stopColor:`#fbbf24`}),(0,i.jsx)(`stop`,{offset:`55%`,stopColor:`#f97316`}),(0,i.jsx)(`stop`,{offset:`85%`,stopColor:`#dc2626`}),(0,i.jsx)(`stop`,{offset:`100%`,stopColor:`#7c2d12`})]}),(0,i.jsxs)(`linearGradient`,{id:`corola-highlight-${h}`,x1:`0%`,y1:`0%`,x2:`0%`,y2:`100%`,children:[(0,i.jsx)(`stop`,{offset:`0%`,stopColor:`#fffbeb`,stopOpacity:`0.6`}),(0,i.jsx)(`stop`,{offset:`60%`,stopColor:`#fffbeb`,stopOpacity:`0`})]}),(0,i.jsxs)(`linearGradient`,{id:`hoja-${h}`,x1:`0%`,y1:`0%`,x2:`100%`,y2:`100%`,children:[(0,i.jsx)(`stop`,{offset:`0%`,stopColor:`#84cc16`}),(0,i.jsx)(`stop`,{offset:`50%`,stopColor:`#65a30d`}),(0,i.jsx)(`stop`,{offset:`100%`,stopColor:`#15803d`})]}),(0,i.jsxs)(`radialGradient`,{id:`glow-${h}`,cx:`50%`,cy:`50%`,r:`50%`,children:[(0,i.jsx)(`stop`,{offset:`0%`,stopColor:`#10b981`,stopOpacity:`0.3`}),(0,i.jsx)(`stop`,{offset:`100%`,stopColor:`#10b981`,stopOpacity:`0`})]}),(0,i.jsx)(`filter`,{id:`wing-blur-${h}`,x:`-50%`,y:`-50%`,width:`200%`,height:`200%`,children:(0,i.jsx)(`feGaussianBlur`,{stdDeviation:`1.5`})}),(0,i.jsxs)(`radialGradient`,{id:`body-3d-${h}`,cx:`35%`,cy:`30%`,r:`65%`,children:[(0,i.jsx)(`stop`,{offset:`0%`,stopColor:`#ffffff`,stopOpacity:`0.55`}),(0,i.jsx)(`stop`,{offset:`35%`,stopColor:`#ffffff`,stopOpacity:`0.18`}),(0,i.jsx)(`stop`,{offset:`100%`,stopColor:`#ffffff`,stopOpacity:`0`})]}),(0,i.jsxs)(`radialGradient`,{id:`body-shadow-${h}`,cx:`75%`,cy:`80%`,r:`55%`,children:[(0,i.jsx)(`stop`,{offset:`0%`,stopColor:`#020617`,stopOpacity:`0.45`}),(0,i.jsx)(`stop`,{offset:`100%`,stopColor:`#020617`,stopOpacity:`0`})]}),(0,i.jsxs)(`radialGradient`,{id:`eye-${h}`,cx:`35%`,cy:`30%`,r:`70%`,children:[(0,i.jsx)(`stop`,{offset:`0%`,stopColor:`#fefce8`}),(0,i.jsx)(`stop`,{offset:`15%`,stopColor:`#0c0a09`}),(0,i.jsx)(`stop`,{offset:`100%`,stopColor:`#000000`})]}),(0,i.jsxs)(`filter`,{id:`avatar-shadow-${h}`,x:`-20%`,y:`-20%`,width:`140%`,height:`140%`,children:[(0,i.jsx)(`feGaussianBlur`,{in:`SourceAlpha`,stdDeviation:`2.5`}),(0,i.jsx)(`feOffset`,{dx:`0`,dy:`2`,result:`offsetblur`}),(0,i.jsx)(`feComponentTransfer`,{children:(0,i.jsx)(`feFuncA`,{type:`linear`,slope:`0.35`})}),(0,i.jsxs)(`feMerge`,{children:[(0,i.jsx)(`feMergeNode`,{}),(0,i.jsx)(`feMergeNode`,{in:`SourceGraphic`})]})]})]}),(0,i.jsx)(`circle`,{cx:`100`,cy:`100`,r:`92`,fill:`url(#glow-${h})`,className:`chagra-halo`}),(0,i.jsxs)(`g`,{className:`chagra-rama`,children:[(0,i.jsx)(`path`,{d:`M 165 18 Q 158 50 162 80 Q 165 105 158 125`,fill:`none`,stroke:`#3f6212`,strokeWidth:`3`,strokeLinecap:`round`,opacity:`0.9`}),(0,i.jsx)(`path`,{d:`M 165 18 Q 158 50 162 80 Q 165 105 158 125`,fill:`none`,stroke:`#4d7c0f`,strokeWidth:`1.2`,strokeLinecap:`round`,opacity:`0.7`}),(0,i.jsxs)(`g`,{transform:`translate(154 38) rotate(-35)`,children:[(0,i.jsx)(`ellipse`,{cx:`0`,cy:`0`,rx:`14`,ry:`7`,fill:`url(#hoja-${h})`}),(0,i.jsx)(`path`,{d:`M -14 0 L 14 0`,stroke:`#365314`,strokeWidth:`0.7`,opacity:`0.7`}),(0,i.jsx)(`path`,{d:`M -10 -2 L -2 0`,stroke:`#365314`,strokeWidth:`0.4`,opacity:`0.45`}),(0,i.jsx)(`path`,{d:`M -10 2 L -2 0`,stroke:`#365314`,strokeWidth:`0.4`,opacity:`0.45`}),(0,i.jsx)(`path`,{d:`M 2 0 L 10 -2`,stroke:`#365314`,strokeWidth:`0.4`,opacity:`0.45`}),(0,i.jsx)(`path`,{d:`M 2 0 L 10 2`,stroke:`#365314`,strokeWidth:`0.4`,opacity:`0.45`}),(0,i.jsx)(`path`,{d:`M -13 -1.5 Q 0 -4.5 13 -1.5`,fill:`none`,stroke:`#bef264`,strokeWidth:`0.8`,opacity:`0.5`})]}),(0,i.jsxs)(`g`,{transform:`translate(176 72) rotate(35)`,children:[(0,i.jsx)(`ellipse`,{cx:`0`,cy:`0`,rx:`12`,ry:`6`,fill:`url(#hoja-${h})`,opacity:`0.95`}),(0,i.jsx)(`path`,{d:`M -12 0 L 12 0`,stroke:`#365314`,strokeWidth:`0.7`,opacity:`0.7`}),(0,i.jsx)(`path`,{d:`M -8 -1.5 L -1 0`,stroke:`#365314`,strokeWidth:`0.35`,opacity:`0.45`}),(0,i.jsx)(`path`,{d:`M -8 1.5 L -1 0`,stroke:`#365314`,strokeWidth:`0.35`,opacity:`0.45`}),(0,i.jsx)(`path`,{d:`M 1 0 L 8 -1.5`,stroke:`#365314`,strokeWidth:`0.35`,opacity:`0.45`}),(0,i.jsx)(`path`,{d:`M 1 0 L 8 1.5`,stroke:`#365314`,strokeWidth:`0.35`,opacity:`0.45`}),(0,i.jsx)(`path`,{d:`M -11 -1.2 Q 0 -3.8 11 -1.2`,fill:`none`,stroke:`#bef264`,strokeWidth:`0.7`,opacity:`0.5`})]}),(0,i.jsxs)(`g`,{transform:`translate(150 105) rotate(-25)`,children:[(0,i.jsx)(`ellipse`,{cx:`0`,cy:`0`,rx:`10`,ry:`5`,fill:`url(#hoja-${h})`,opacity:`0.9`}),(0,i.jsx)(`path`,{d:`M -10 0 L 10 0`,stroke:`#365314`,strokeWidth:`0.6`,opacity:`0.7`}),(0,i.jsx)(`path`,{d:`M -7 -1.3 L -1 0`,stroke:`#365314`,strokeWidth:`0.35`,opacity:`0.45`}),(0,i.jsx)(`path`,{d:`M -7 1.3 L -1 0`,stroke:`#365314`,strokeWidth:`0.35`,opacity:`0.45`}),(0,i.jsx)(`path`,{d:`M 1 0 L 7 -1.3`,stroke:`#365314`,strokeWidth:`0.35`,opacity:`0.45`}),(0,i.jsx)(`path`,{d:`M 1 0 L 7 1.3`,stroke:`#365314`,strokeWidth:`0.35`,opacity:`0.45`})]}),(0,i.jsxs)(`g`,{className:`chagra-flor`,transform:`translate(160 130)`,children:[(0,i.jsx)(`path`,{d:`M -8 -2 Q 0 -6 8 -2 L 6 4 Q 0 6 -6 4 Z`,fill:`#4d7c0f`}),(0,i.jsx)(`path`,{d:`M -7 -2.5 Q 0 -5 7 -2.5`,fill:`none`,stroke:`#84cc16`,strokeWidth:`0.6`,opacity:`0.7`}),(0,i.jsx)(`path`,{d:`M -9 0
                 Q -13 12 -10 24
                 Q -7 30 -3 31
                 L -3 4 Q -6 3 -9 0 Z`,fill:`url(#corola-${h})`,opacity:`0.85`,stroke:`#92400e`,strokeWidth:`0.4`}),(0,i.jsx)(`path`,{d:`M 9 0
                 Q 13 12 10 24
                 Q 7 30 3 31
                 L 3 4 Q 6 3 9 0 Z`,fill:`url(#corola-${h})`,opacity:`0.85`,stroke:`#92400e`,strokeWidth:`0.4`}),(0,i.jsx)(`path`,{d:`M -10 0
                 Q -14 12 -10 26
                 Q -5 32 0 33
                 Q 5 32 10 26
                 Q 14 12 10 0
                 Q 5 4 0 4
                 Q -5 4 -10 0 Z`,fill:`url(#corola-${h})`,stroke:`#7c2d12`,strokeWidth:`0.9`,className:`chagra-corola`}),(0,i.jsx)(`path`,{d:`M -9 2 Q 0 -1 9 2 Q 11 4 9 6 Q 0 3 -9 6 Q -11 4 -9 2 Z`,fill:`url(#corola-highlight-${h})`,opacity:`0.85`}),(0,i.jsx)(`path`,{d:`M -7 4 Q -8 18 -7 28`,fill:`none`,stroke:`#7c2d12`,strokeWidth:`0.45`,opacity:`0.55`}),(0,i.jsx)(`path`,{d:`M -4 4 Q -4.5 18 -4 29`,fill:`none`,stroke:`#7c2d12`,strokeWidth:`0.35`,opacity:`0.4`}),(0,i.jsx)(`path`,{d:`M 0 4 Q 0 18 0 30`,fill:`none`,stroke:`#7c2d12`,strokeWidth:`0.45`,opacity:`0.55`}),(0,i.jsx)(`path`,{d:`M 4 4 Q 4.5 18 4 29`,fill:`none`,stroke:`#7c2d12`,strokeWidth:`0.35`,opacity:`0.4`}),(0,i.jsx)(`path`,{d:`M 7 4 Q 8 18 7 28`,fill:`none`,stroke:`#7c2d12`,strokeWidth:`0.45`,opacity:`0.55`}),(0,i.jsx)(`line`,{x1:`0`,y1:`33`,x2:`0`,y2:`47`,stroke:`#fbbf24`,strokeWidth:`1.6`}),(0,i.jsx)(`line`,{x1:`-2`,y1:`34`,x2:`-2`,y2:`44`,stroke:`#fbbf24`,strokeWidth:`0.8`,opacity:`0.75`}),(0,i.jsx)(`line`,{x1:`2`,y1:`34`,x2:`2`,y2:`44`,stroke:`#fbbf24`,strokeWidth:`0.8`,opacity:`0.75`}),(0,i.jsx)(`circle`,{cx:`0`,cy:`47.5`,r:`2.4`,fill:`#fef3c7`,stroke:`#f59e0b`,strokeWidth:`0.6`}),(0,i.jsx)(`circle`,{cx:`-2`,cy:`44.5`,r:`0.9`,fill:`#fbbf24`}),(0,i.jsx)(`circle`,{cx:`2`,cy:`44.5`,r:`0.9`,fill:`#fbbf24`}),(0,i.jsx)(`circle`,{cx:`0`,cy:`46.5`,r:`0.4`,fill:`#fef9c3`}),(0,i.jsx)(`circle`,{cx:`-1`,cy:`48`,r:`0.35`,fill:`#fef9c3`}),(0,i.jsx)(`circle`,{cx:`1`,cy:`48`,r:`0.35`,fill:`#fef9c3`})]})]}),(0,i.jsxs)(`g`,{className:`chagra-colibri`,style:{transformOrigin:`90px 110px`},children:[(0,i.jsx)(`g`,{className:`chagra-ala chagra-ala-trasera`,style:{transformOrigin:`70px 105px`},filter:e===`thinking`?`url(#wing-blur-${h})`:void 0,children:(0,i.jsx)(`path`,{d:`M 70 105
                 Q 50 95 35 110
                 Q 45 125 70 115 Z`,fill:`url(#plumaje-${h})`,opacity:`0.55`})}),(0,i.jsxs)(`g`,{className:`chagra-cuerpo`,children:[(0,i.jsx)(`ellipse`,{cx:`80`,cy:`110`,rx:`22`,ry:`13`,fill:`url(#plumaje-${h})`,transform:`rotate(-18 80 110)`}),(0,i.jsx)(`ellipse`,{cx:`80`,cy:`110`,rx:`22`,ry:`13`,fill:`url(#body-shadow-${h})`,transform:`rotate(-18 80 110)`}),(0,i.jsx)(`ellipse`,{cx:`80`,cy:`110`,rx:`22`,ry:`13`,fill:`url(#body-3d-${h})`,transform:`rotate(-18 80 110)`}),(0,i.jsx)(`path`,{d:`M 60 113 L 42 108 L 48 115 L 40 122 L 50 119 L 46 128 L 58 120 Z`,fill:`url(#plumaje-${h})`,opacity:`0.85`}),(0,i.jsx)(`ellipse`,{cx:`78`,cy:`116`,rx:`14`,ry:`6`,fill:`#fef3c7`,opacity:`0.4`,transform:`rotate(-18 78 116)`})]}),(0,i.jsxs)(`g`,{className:`chagra-cabeza`,children:[(0,i.jsx)(`circle`,{cx:`100`,cy:`98`,r:`11`,fill:`url(#plumaje-${h})`}),(0,i.jsx)(`circle`,{cx:`100`,cy:`98`,r:`11`,fill:`url(#body-3d-${h})`}),(0,i.jsx)(`ellipse`,{cx:`102`,cy:`104`,rx:`6`,ry:`4`,fill:`url(#gorget-${h})`,opacity:`0.92`}),(0,i.jsx)(`path`,{d:`M 110 99 Q 130 102 145 110`,fill:`none`,stroke:`#1e293b`,strokeWidth:`2.2`,strokeLinecap:`round`,className:`chagra-pico`}),(0,i.jsx)(`circle`,{cx:`103`,cy:`95`,r:`2.9`,fill:`url(#eye-${h})`}),(0,i.jsx)(`circle`,{cx:`102.4`,cy:`94.3`,r:`0.85`,fill:`#ffffff`,opacity:`0.95`}),(0,i.jsx)(`circle`,{cx:`103.6`,cy:`95.2`,r:`0.35`,fill:`#ffffff`,opacity:`0.6`})]}),(0,i.jsxs)(`g`,{className:`chagra-ala chagra-ala-frontal`,style:{transformOrigin:`75px 105px`},filter:e===`thinking`?`url(#wing-blur-${h})`:void 0,children:[(0,i.jsx)(`path`,{d:`M 75 105
                 Q 60 80 40 88
                 Q 55 105 78 100 Z`,fill:`url(#plumaje-${h})`,opacity:`0.75`}),(0,i.jsx)(`path`,{d:`M 75 105 Q 62 92 50 95`,fill:`none`,stroke:`#0f172a`,strokeWidth:`0.5`,opacity:`0.3`})]})]}),e===`listening`&&(0,i.jsxs)(`g`,{className:`chagra-ondas`,opacity:`0.5`,children:[(0,i.jsx)(`circle`,{cx:`160`,cy:`160`,r:`20`,fill:`none`,stroke:`#a78bfa`,strokeWidth:`1`,className:`chagra-onda chagra-onda-1`}),(0,i.jsx)(`circle`,{cx:`160`,cy:`160`,r:`28`,fill:`none`,stroke:`#a78bfa`,strokeWidth:`0.8`,className:`chagra-onda chagra-onda-2`})]}),(0,i.jsx)(`style`,{children:`
          .chagra-agent-avatar { will-change: transform; }

          /* ===== HALO por estado ===== */
          .chagra-halo { transition: opacity .4s ease; opacity: 0; }
          .chagra-state-thinking .chagra-halo { opacity: 1; animation: chagra-halo-pulse 1.6s ease-in-out infinite; }
          .chagra-state-speaking .chagra-halo { opacity: .7; animation: chagra-halo-pulse 1s ease-in-out infinite; }
          .chagra-state-listening .chagra-halo { opacity: .6; }
          @keyframes chagra-halo-pulse {
            0%, 100% { opacity: .4; }
            50% { opacity: 1; }
          }

          /* ===== IDLE: hovering suave + alas batido normal ===== */
          .chagra-state-idle .chagra-colibri {
            animation: chagra-hover-soft 3s ease-in-out infinite;
          }
          .chagra-state-idle .chagra-ala-frontal {
            animation: chagra-ala-flap-normal .26s ease-in-out infinite;
          }
          .chagra-state-idle .chagra-ala-trasera {
            animation: chagra-ala-flap-normal-back .26s ease-in-out infinite;
          }
          @keyframes chagra-hover-soft {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes chagra-ala-flap-normal {
            0%, 100% { transform: rotate(-18deg); }
            50% { transform: rotate(22deg); }
          }
          @keyframes chagra-ala-flap-normal-back {
            0%, 100% { transform: rotate(15deg); }
            50% { transform: rotate(-22deg); }
          }

          /* ===== THINKING: alas en blur rápido + sip motion al abutilón ===== */
          .chagra-state-thinking .chagra-colibri {
            animation: chagra-sip 1.3s ease-in-out infinite;
          }
          .chagra-state-thinking .chagra-ala-frontal {
            animation: chagra-ala-vibrate .08s linear infinite;
          }
          .chagra-state-thinking .chagra-ala-trasera {
            animation: chagra-ala-vibrate-back .08s linear infinite;
          }
          .chagra-state-thinking .chagra-corola {
            animation: chagra-flor-quiver 1.3s ease-in-out infinite;
            transform-origin: center top;
          }
          @keyframes chagra-sip {
            0%, 100% { transform: translate(0, 0); }
            45%, 55% { transform: translate(15px, 6px); }
          }
          @keyframes chagra-ala-vibrate {
            0%, 100% { transform: rotate(-25deg); }
            50% { transform: rotate(35deg); }
          }
          @keyframes chagra-ala-vibrate-back {
            0%, 100% { transform: rotate(30deg); }
            50% { transform: rotate(-30deg); }
          }
          @keyframes chagra-flor-quiver {
            0%, 100% { transform: rotate(0deg); }
            45%, 55% { transform: rotate(3deg); }
            48%, 52% { transform: rotate(-3deg); }
          }

          /* ===== SPEAKING: cuerpo bob suave + alas batido ligero ===== */
          .chagra-state-speaking .chagra-colibri {
            animation: chagra-speak-bob 1.1s ease-in-out infinite;
          }
          .chagra-state-speaking .chagra-ala-frontal {
            animation: chagra-ala-flap-normal .3s ease-in-out infinite;
          }
          .chagra-state-speaking .chagra-ala-trasera {
            animation: chagra-ala-flap-normal-back .3s ease-in-out infinite;
          }
          @keyframes chagra-speak-bob {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-2px) rotate(-2deg); }
            75% { transform: translateY(2px) rotate(2deg); }
          }

          /* ===== LISTENING: head tilt + ondas desde la flor ===== */
          .chagra-state-listening .chagra-cabeza {
            transform-origin: 100px 98px;
            animation: chagra-head-tilt 2.4s ease-in-out infinite;
          }
          .chagra-state-listening .chagra-ala-frontal,
          .chagra-state-listening .chagra-ala-trasera {
            animation: chagra-ala-flap-normal .35s ease-in-out infinite;
          }
          .chagra-state-listening .chagra-onda-1 {
            animation: chagra-onda-expand 2.2s ease-out infinite;
            transform-origin: 160px 160px;
          }
          .chagra-state-listening .chagra-onda-2 {
            animation: chagra-onda-expand 2.2s ease-out infinite .7s;
            transform-origin: 160px 160px;
          }
          @keyframes chagra-head-tilt {
            0%, 100% { transform: rotate(-4deg); }
            50% { transform: rotate(4deg); }
          }
          @keyframes chagra-onda-expand {
            0% { opacity: .7; transform: scale(.4); }
            100% { opacity: 0; transform: scale(1.3); }
          }

          /* ===== GLOW (task #122): respuesta lista, brilla pulsando ====
             drop-shadow amber #FFB700 1.5s ease-in-out infinite. NO confetti,
             NO bouncing — tono honesto del avatar. Activo en TODA la app
             cuando responseReady=true en useAgentNotificationStore. */
          .chagra-agent-avatar.chagra-glow {
            animation: chagra-glow-pulse 1.5s ease-in-out infinite;
          }
          @keyframes chagra-glow-pulse {
            0%, 100% {
              filter: drop-shadow(0 0 2px rgba(255, 183, 0, .35))
                      drop-shadow(0 0 6px rgba(255, 183, 0, .25));
            }
            50% {
              filter: drop-shadow(0 0 6px rgba(255, 183, 0, .9))
                      drop-shadow(0 0 14px rgba(255, 183, 0, .55));
            }
          }

          /* ===== Reduced motion ===== */
          @media (prefers-reduced-motion: reduce) {
            .chagra-agent-avatar * {
              animation: none !important;
            }
            .chagra-agent-avatar.chagra-glow {
              animation: none !important;
              filter: drop-shadow(0 0 4px rgba(255, 183, 0, .6));
            }
          }
        `})]}),n&&(0,i.jsx)(`span`,{className:`absolute left-1/2 -translate-x-1/2 top-full mt-1 text-[10px] font-bold uppercase tracking-wider ${f} whitespace-nowrap`,children:p})]});return m?(0,i.jsx)(`button`,{type:`button`,onClick:s,onDoubleClick:c,className:`rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:scale-105 active:scale-95`,"aria-label":d||`Abrir ${p}`,title:c?`Doble click silencia o reactiva la voz`:void 0,children:g}):g}export{s as t};