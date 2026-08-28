import React from 'react';
import { createRoot } from 'react-dom/client';
import ChagraAgentAvatarChivitoPunk from '../components/ChagraAgentAvatarChivitoPunk.jsx';
const STATES=['idle','thinking','speaking','listening'];
function App(){return(<div style={{padding:20,fontFamily:'system-ui',background:'#f4f4ef'}}>
<h2 style={{fontSize:15}}>Chivito — estados tras hostALigero (¿speaking≠idle ahora?)</h2>
<div style={{display:'flex',gap:14}}>{STATES.map(s=>(
<div key={s} style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
<div style={{width:190,height:190,display:'flex',alignItems:'center',justifyContent:'center',background:'#fff',borderRadius:12}} data-estado={s}>
<ChagraAgentAvatarChivitoPunk state={s} size={170}/></div>
<span style={{fontSize:12,fontFamily:'monospace',color:'#555'}}>{s}</span></div>))}</div></div>);}
createRoot(document.getElementById('root')).render(<App/>);
