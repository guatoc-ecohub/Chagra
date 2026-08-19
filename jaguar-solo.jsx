import React from 'react';
import { createRoot } from 'react-dom/client';
import { Jaguar } from './src/visual/creatures/index.js';
const q = new URLSearchParams(location.search);
createRoot(document.getElementById('root')).render(
  React.createElement('div',{style:{display:'grid',placeItems:'center',height:'100vh',background:'#e9e4d6'}},
    React.createElement(Jaguar,{pose:'anda',estado:'camina',size:360,animated:true,title:'jaguar'})
  )
);
