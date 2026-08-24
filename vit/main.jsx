import React from 'react';import {createRoot} from 'react-dom/client';
import Comp from '../src/visual/creatures/ZariguyaLaminaViva.jsx';
createRoot(document.getElementById('r')).render(React.createElement('div',{style:{display:'grid',placeItems:'center',minHeight:'100vh',background:'#e9e4d6'}},React.createElement(Comp,{estado:'idle',size:360,animated:true,tier:'alto'})));
