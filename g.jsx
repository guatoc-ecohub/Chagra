import React from 'react';
import { createRoot } from 'react-dom/client';
import Comp from './src/visual/creatures/LuciernagaLaminaViva.jsx';
const q=new URLSearchParams(location.search);
createRoot(document.getElementById('root')).render(
  React.createElement('div',{style:{position:'relative',display:'grid',placeItems:'center',height:'100vh',background:'#e9e4d6'}},
    React.createElement('div',{style:{position:'absolute',top:8,left:0,right:0,textAlign:'center',fontFamily:'sans-serif',fontWeight:800,fontSize:24,letterSpacing:3,color:'#8a6d3b'}},'ANTES'),
    React.createElement(Comp,{estado:q.get('estado')||'caminando',size:380,animated:true,tier:'alto'})
  )
);
