import {parseWod,generateSeconds,exerciseKey,palette,swatches} from './parser.js';
const $=id=>document.getElementById(id);let model={intervals:[],blocks:[],warnings:[]},template,installPrompt,ocrBusy=false;
const examples={emom:'EMOM 12 min\n10 burpees\n12 kettlebell swing 24 kg\n14 air squat',mixed:'E2MOM 12 min\n8 front squat 40 kg + 10 box jump\n12 calorie row\n\nRecupero 90 s\n\nAMRAP 8 min\n5 pull-up\n10 push-up\n15 air squat\n\nFOR TIME — 3 round\nTime cap 6 min\n10 burpees\n20 sit-up',tabata:'TABATA 8 round 20/10\nAir squat\nPush-up'};
function message(text,error=false){$('status').textContent=text;$('status').className=error?'error':'';}
function time(s){return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;}
function summary(){const list=model.intervals;$('total').textContent=time(list.reduce((n,i)=>n+(Number.isInteger(i.duration)?i.duration:0),0));$('count').textContent=list.length;$('rounds').textContent=model.blocks.filter(b=>b.type!=='REST').map(b=>b.rounds===null?'liberi':Number.isInteger(b.rounds)?b.rounds:b.rounds.toFixed(1)).join(' / ')||'—';$('download').disabled=!list.length;$('empty').hidden=!!list.length;}
function render(){
  const root=$('intervals');root.replaceChildren();$('warnings').replaceChildren();
  model.warnings.forEach(w=>{const p=document.createElement('p');p.className='warning';p.textContent=w;$('warnings').append(p);});
  model.intervals.forEach((item,index)=>{
    const row=document.createElement('div');row.className='interval';row.style.setProperty('--color',item.rest?'#9ba29b':swatches[palette.indexOf(item.color)]);
    const stripe=document.createElement('div');stripe.className='stripe';row.append(stripe);
    const title=document.createElement('div'),name=document.createElement('input');name.value=item.name;name.setAttribute('aria-label',`Esercizio ${index+1}`);
    name.addEventListener('change',()=>{item.name=name.value;item.exercise_key=item.rest?'rest':exerciseKey(item.name);const same=model.intervals.find(i=>i!==item&&!i.rest&&i.exercise_key===item.exercise_key);if(same)item.color=same.color;render();});
    const meta=document.createElement('div');meta.className='meta';meta.textContent=`${index+1} · Blocco ${item.block||1}${item.round?' · Round '+item.round:''}${item.rest?' · Recupero':''}`;title.append(name,meta);row.append(title);
    const label=document.createElement('label');label.textContent='Secondi';const duration=document.createElement('input');duration.type='number';duration.min='1';duration.max='86400';duration.step='1';duration.value=item.duration;duration.setAttribute('aria-label',`Durata ${index+1} in secondi`);duration.addEventListener('input',()=>{item.duration=Number(duration.value);summary();});label.append(duration);row.append(label);
    const select=document.createElement('select');select.setAttribute('aria-label',`Colore ${index+1}`);(item.rest?[7]:palette).forEach((code)=>{const option=document.createElement('option');option.value=code;option.textContent=code===7?'Riposo':`Cod. ${code}`;option.selected=code===item.color;select.append(option);});select.disabled=item.rest;select.addEventListener('change',()=>{model.intervals.filter(i=>!i.rest&&i.exercise_key===item.exercise_key).forEach(i=>i.color=+select.value);render();});row.append(select);
    const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label',`Elimina intervallo ${index+1}`);del.addEventListener('click',()=>{model.intervals.splice(index,1);model.blocks=[];render();});row.append(del);root.append(row);
  });summary();
}
$('analyze').addEventListener('click',()=>{try{const next=parseWod($('wod').value);model=next;render();message('Sequenza pronta. Controlla sempre esercizi, durate e recuperi prima di esportare.');}catch(e){model={intervals:[],blocks:[],warnings:[]};render();message(e.message,true);}});
document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{$('wod').value=examples[button.dataset.example];$('analyze').click();}));
$('add').addEventListener('click',()=>{if(model.intervals.length>=2000)return message('Massimo 2.000 intervalli.',true);model.intervals.push({name:'Nuovo esercizio',duration:60,rest:false,color:0,exercise_key:'nuovo esercizio',round:1,block:1});model.blocks=[];render();});
$('download').addEventListener('click',async()=>{try{template ||= await fetch('./template.seconds').then(r=>{if(!r.ok)throw Error('Template non disponibile. Ricarica con una connessione attiva.');return r.json();});const result=generateSeconds(template,{name:$('name').value,notes:$('wod').value,intervals:model.intervals});const url=URL.createObjectURL(new Blob([JSON.stringify(result)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=($('name').value.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,80)||'workout')+'.seconds';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);message('File generato. Aprilo con Seconds Pro e verifica l’importazione sul dispositivo.');}catch(e){message(e.message,true);}});
async function loadOcr(){if(window.Tesseract)return;await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('Impossibile caricare OCR. Verifica la connessione e riprova.'));};document.head.append(script);});}
async function recognize(event){
  const file=event.target.files[0];if(!file)return;if(ocrBusy){event.target.value='';return;}
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>15*1024*1024){$('ocr-status').textContent='Usa JPG, PNG o WebP, massimo 15 MB. Converti prima i file HEIC.';event.target.value='';return;}
  ocrBusy=true;$('photo').disabled=$('camera').disabled=true;let worker;
  try{$('ocr-status').textContent='Caricamento OCR locale…';await loadOcr();worker=await Tesseract.createWorker('ita+eng',1,{logger:m=>{$('ocr-status').textContent=`OCR: ${Math.round((m.progress||0)*100)}% · ${m.status}`;}});const {data}=await worker.recognize(file);$('wod').value=[$('wod').value.trim(),data.text.trim()].filter(Boolean).join('\n\n');$('ocr-status').textContent=data.text.trim()?`Testo aggiunto (confidenza OCR ${Math.round(data.confidence)}%). Correggilo prima di analizzare.`:'Nessun testo trovato. Prova una foto più nitida.';}
  catch(e){$('ocr-status').textContent='OCR non riuscito. Verifica connessione e immagine, oppure inserisci il testo manualmente.';}
  finally{if(worker)await worker.terminate();event.target.value='';ocrBusy=false;$('photo').disabled=$('camera').disabled=false;}
}
$('photo').addEventListener('change',recognize);$('camera').addEventListener('change',recognize);
$('clear').addEventListener('click',()=>{if(ocrBusy)return message('Attendi la fine dell’OCR prima di cancellare la sessione.',true);$('wod').value='';$('name').value='Il mio WOD';model={intervals:[],blocks:[],warnings:[]};render();message('Sessione cancellata.');$('ocr-status').textContent='La foto viene elaborata solo sul tuo dispositivo.';});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});$('install').addEventListener('click',async()=>{await installPrompt.prompt();installPrompt=null;$('install').hidden=true;});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();
