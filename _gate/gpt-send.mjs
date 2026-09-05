import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const DIR = '/home/kortux/Workspace/chagra/.worktrees/gate-portal-tinta-20260905/_gate';
const token = readFileSync('/home/kortux/.config/.tg-send-token', 'utf8').trim();
const CHAT = '208512105';
const ENVIOS = [
  { file: 'portal-tinta-zariguya.png', cap: '🖋 portal 2D→3D en tinta (PR #3140) · zariguya · SIN-CERTIFICAR · juez-VL: marsupial con hocico puntiagudo y cola larga; en fondo claro la máscara facial oscura puede leerse como "ojos cubiertos" · ojo del lane no ve píxeles, veredicto del operador · commit b3e129f1f' },
  { file: 'portal-tinta-luciernaga.png', cap: '🖋 portal 2D→3D en tinta (PR #3140) · luciernaga · SIN-CERTIFICAR · juez-VL: insecto con antenas, élitros y abdomen luminoso, cara intacta, natural en claro y noche · commit b3e129f1f' },
  { file: 'portal-tinta-chivito-punk.png', cap: '🖋 portal 2D→3D en tinta (PR #3140) · chivito-punk · SIN-CERTIFICAR · juez-VL: ave de páramo con cresta punk, cara intacta, coherente en ambos fondos (punk solo actuando, como manda el contrato) · commit b3e129f1f' },
  { file: 'portal-tinta-oso-baston.png', cap: '🖋 portal 2D→3D (PR #3140) · oso-baston CONTROL, lámina NO tinta · SIN-CERTIFICAR · juez-VL: Tremarctos ornatus, cara intacta, leído como ilustración A COLOR, lenguaje distinto al trazo de tinta de los otros 3 (el harness no miente) · commit b3e129f1f' },
];
for (const e of ENVIOS) {
  const p = `${DIR}/${e.file}`;
  const fs = execFileSync('stat', ['-c', '%s', p]).toString().trim();
  if (Number(fs) < 1000) { console.log(`✗ ${e.file} demasiado chico (${fs})`); process.exit(1); }
  const out = execFileSync('curl', ['-s', `https://api.telegram.org/bot${token}/sendPhoto`, '-F', `chat_id=${CHAT}`, '-F', `photo=@${p}`, '-F', `caption=${e.cap}`], { encoding: 'utf8' });
  const j = JSON.parse(out);
  if (j.ok) { console.log(`OK ${e.file} → msg_id=${j.result.message_id}`); }
  else { console.log(`FALLO ${e.file}: ${j.description} (${j.error_code})`); }
}
