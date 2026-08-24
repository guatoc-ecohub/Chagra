import React from 'react';import {createRoot} from 'react-dom/client';
import Comp from './src/visual/creatures/ZariguyaLaminaViva.jsx';
const q=new URLSearchParams(location.search);
createRoot(document.getElementById('root')).render(React.createElement('div',{style:{display:'grid',placeItems:'center',height:'100vh',background:'#e9e4d6'}},React.createElement(Comp,{estado:q.get('estado')||'idle',size:440,animated:true,tier:'alto'})));
