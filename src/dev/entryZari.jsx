import React from 'react';
import { createRoot } from 'react-dom/client';
import ChagraAgentAvatarZariguya from '../components/ChagraAgentAvatarZariguya.jsx';
function Cell({bg,label,state,visema}){return(<div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
<div style={{width:200,height:200,display:'flex',alignItems:'center',justifyContent:'center',background:bg,borderRadius:12}}>
<ChagraAgentAvatarZariguya state={state} visema={visema} size={180}/></div>
<span style={{fontSize:12,fontFamily:'monospace',color:'#888'}}>{label}</span></div>);}
function App(){return(<div style={{padding:20,display:'flex',gap:16,flexWrap:'wrap',fontFamily:'system-ui',background:'#eee'}}>
<Cell bg="#f4f4ef" label="idle · claro" state="idle"/>
<Cell bg="#0a0d11" label="idle · NEGRO (¿legible?)" state="idle"/>
<Cell bg="#0a0d11" label="speaking V1" state="speaking" visema="V1"/>
<Cell bg="#0a0d11" label="speaking V4 (¿jaw abre?)" state="speaking" visema="V4"/>
</div>);}
createRoot(document.getElementById('root')).render(<App/>);
