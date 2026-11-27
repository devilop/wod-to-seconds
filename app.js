import {parseWod,generateSeconds,exerciseKey,palette,swatches} from './parser.js?v=15';
const $=id=>document.getElementById(id);let model={intervals:[],blocks:[],warnings:[]},template,installPrompt,ocrBusy=false;
const examples={emom:'EMOM 12 min\n10 burpees\n12 kettlebell swing 24 kg\n14 air squat',mixed:'E2MOM 12 min\n8 front squat 40 kg + 10 box jump\n12 calorie row\n\nRecupero 90 s\n\nAMRAP 8 min\n5 pull-up\n10 push-up\n15 air squat\n\nFOR TIME — 3 round\nTime cap 6 min\n10 burpees\n20 sit-up',tabata:'TABATA 8 round 20/10\nAir squat\nPush-up'};
function message(text,error=false){$('status').textContent=text;$('status').className=error?'error':'';}
function time(s){return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;}
function summary(){const list=model.intervals;$('total').textContent=time(list.reduce((n,i)=>n+(Number.isInteger(i.duration)?i.duration:0),0));$('count').textContent=list.length;$('rounds').textContent=model.blocks.filter(b=>b.type!=='REST').map(b=>b.rounds===null?'liberi':Number.isInteger(b.rounds)?b.rounds:b.rounds.toFixed(1)).join(' / ')||'—';$('download').disabled=!list.length;$('empty').hidden=!!list.length;}
function render(){
  const root=$('intervals');root.replaceChildren();$('warnings').replaceChildren();
  model.warnings.filter(w=>!/^Titolo o testo introduttivo:|^Intestazione For Time:|^(?:EMOM|E[23]MOM): (?:stazioni numerate|ogni riga è una stazione)/.test(w)).forEach(w=>{const p=document.createElement('p');p.className='warning';p.textContent=w;$('warnings').append(p);});
  model.intervals.forEach((item,index)=>{
    const row=document.createElement('div');row.className='interval';row.style.setProperty('--color',item.rest?'#9ba29b':swatches[palette.indexOf(item.color)]);
    const stripe=document.createElement('div');stripe.className='stripe';row.append(stripe);row.dataset.index=index;
    const handle=document.createElement('button');handle.type='button';handle.className='drag-handle';handle.textContent='⠿';handle.setAttribute('aria-label',`Sposta esercizio ${index+1}`);handle.title='Trascina per spostare. Con tastiera: frecce su e giù.';handle.addEventListener('pointerdown',e=>startDrag(e,row,index));handle.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();moveInterval(index,index+(e.key==='ArrowUp'?-1:1));}});row.append(handle);
    const title=document.createElement('div'),name=document.createElement('input');name.value=item.name;name.setAttribute('aria-label',`Esercizio ${index+1}`);
    name.addEventListener('change',()=>{item.name=name.value;item.exercise_key=item.rest?'rest':exerciseKey(item.name);const same=model.intervals.find(i=>i!==item&&!i.rest&&i.exercise_key===item.exercise_key);if(same)item.color=same.color;render();});
    const meta=document.createElement('div');meta.className='meta';meta.textContent=`${item.round?'Giro '+item.round:''}${item.rest?' · Recupero':''}`;title.className='interval-title';title.append(name,meta);row.append(title);
    const label=document.createElement('label');label.textContent='Secondi';const duration=document.createElement('input');duration.type='number';duration.min='1';duration.max='86400';duration.step='1';duration.value=item.duration;duration.setAttribute('aria-label',`Durata ${index+1} in secondi`);duration.addEventListener('input',()=>{item.duration=Number(duration.value);summary();});label.append(duration);row.append(label);
    const picker=document.createElement('details');picker.className='color-picker';
    const toggle=document.createElement('summary');toggle.setAttribute('aria-label',`Colore esercizio ${index+1}`);toggle.title=item.rest?'Recupero':'Cambia colore';picker.append(toggle);
    if(item.rest){toggle.setAttribute('aria-disabled','true');picker.addEventListener('click',e=>e.preventDefault());}
    else {const choices=document.createElement('div');choices.className='color-options';const names=['Lime','Azzurro','Arancio','Rosa','Viola','Turchese','Giallo'];palette.forEach((code,n)=>{const choice=document.createElement('button');choice.type='button';choice.style.setProperty('--swatch',swatches[n]);choice.setAttribute('aria-label',names[n]);choice.title=names[n];choice.setAttribute('aria-pressed',String(code===item.color));choice.addEventListener('click',()=>{model.intervals.filter(i=>!i.rest&&i.exercise_key===item.exercise_key).forEach(i=>i.color=code);render();root.querySelectorAll('.color-picker summary')[index]?.focus();});choices.append(choice);});picker.append(choices);}
    row.append(picker);
    const del=document.createElement('button');del.className='delete-interval';del.textContent='×';del.setAttribute('aria-label',`Elimina intervallo ${index+1}`);del.addEventListener('click',()=>{model.intervals.splice(index,1);model.blocks=[];render();});row.append(del);root.append(row);
  });summary();
}
function moveInterval(from,to){
  if(to<0||to>=model.intervals.length||from===to)return;
  const [item]=model.intervals.splice(from,1);model.intervals.splice(to,0,item);
  model.blocks=[];render();$('intervals').querySelectorAll('.drag-handle')[to]?.focus({preventScroll:true});
  message(`Intervallo spostato alla posizione ${to+1}.`);
}
function startDrag(event,row,from){
  if(event.button!==0)return;
  const handle=event.currentTarget,root=$('intervals');let y=event.clientY,target=from,frame;
  handle.setPointerCapture(event.pointerId);row.classList.add('dragging');
  const update=()=>{
    const box=root.getBoundingClientRect();
    if(y<box.top+48)root.scrollTop-=10;else if(y>box.bottom-48)root.scrollTop+=10;
    const rows=[...root.querySelectorAll('.interval')];
    target=rows.reduce((best,r,i)=>Math.abs(y-(r.getBoundingClientRect().top+r.offsetHeight/2))<best.distance?{index:i,distance:Math.abs(y-(r.getBoundingClientRect().top+r.offsetHeight/2))}:best,{index:from,distance:Infinity}).index;
    rows.forEach((r,i)=>{r.classList.toggle('drop-before',i===target&&target<from);r.classList.toggle('drop-after',i===target&&target>from);});
    frame=requestAnimationFrame(update);
  };
  const move=e=>{y=e.clientY;};
  const finish=e=>{
    cancelAnimationFrame(frame);handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);handle.removeEventListener('lostpointercapture',finish);
    root.querySelectorAll('.interval').forEach(r=>r.classList.remove('dragging','drop-before','drop-after'));
    if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
    if(e.type==='pointerup')moveInterval(from,target);
  };
  handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('lostpointercapture',finish);update();
}
const capRequest=$('cap-request');
const capMinutes=$('cap-minutes');
function resetCap(){capRequest.hidden=true;capMinutes.value='';}
$('wod').addEventListener('input',resetCap);
$('analyze').addEventListener('click',()=>{
  try{
    let text=$('wod').value;
    if(!capRequest.hidden&&capMinutes.value){
      const cap=Number(capMinutes.value);
      if(!Number.isInteger(cap)||cap<1||cap>1440){capMinutes.reportValidity();return;}
      text+='\nTime cap '+cap+' min';
    }
    const next=parseWod(text);
    resetCap();
    $('wod').value=text;
    model=next;
    if($('name').value==='Il mio WOD')$('name').value=suggestName(text);
    render();
    $('input-step').open=false;
    $('preview-step').open=true;
    $('preview-step').scrollIntoView({behavior:'smooth',block:'start'});
    message('Controlla la sequenza prima di esportare.');
  }catch(error){
    model={intervals:[],blocks:[],warnings:[]};
    render();
    if(error.code==='MISSING_TIME_CAP'&&error.lastBlock){
      capRequest.hidden=false;
      capMinutes.focus();
    }
    message(error.message,true);
  }
});
document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{resetCap();$('wod').value=examples[button.dataset.example];$('analyze').click();}));
$('add').addEventListener('click',()=>{if(model.intervals.length>=2000)return message('Massimo 2.000 intervalli.',true);model.intervals.push({name:'Nuovo esercizio',duration:60,rest:false,color:0,exercise_key:'nuovo esercizio',round:1,block:1});model.blocks=[];render();});
$('download').addEventListener('click',async()=>{try{template ||= await fetch('./template.seconds').then(r=>{if(!r.ok)throw Error('Template non disponibile. Ricarica con una connessione attiva.');return r.json();});const result=generateSeconds(template,{name:$('name').value,notes:$('wod').value,intervals:model.intervals});const url=URL.createObjectURL(new Blob([JSON.stringify(result)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=($('name').value.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,80)||'workout')+'.seconds';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);message('File pronto. Aprilo in Seconds Pro.');}catch(e){message(e.message,true);}});
async function loadOcr(){if(window.Tesseract)return;await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('Impossibile caricare OCR. Verifica la connessione e riprova.'));};document.head.append(script);});}
async function recognize(event){
  const file=event.target.files[0];if(!file)return;if(ocrBusy){event.target.value='';return;}
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>15*1024*1024){$('ocr-status').textContent='Usa JPG, PNG o WebP, massimo 15 MB. Converti prima i file HEIC.';event.target.value='';return;}
  ocrBusy=true;$('photo').disabled=$('camera').disabled=true;let worker;
  try{$('ocr-status').textContent='Caricamento OCR locale…';await loadOcr();worker=await Tesseract.createWorker('ita+eng',1,{logger:m=>{$('ocr-status').textContent=`OCR: ${Math.round((m.progress||0)*100)}% · ${m.status}`;}});const {data}=await worker.recognize(file);resetCap();$('wod').value=data.text.trim();$('name').value=suggestName(data.text);$('ocr-status').textContent=data.text.trim()?`Testo aggiunto (confidenza OCR ${Math.round(data.confidence)}%). Correggilo prima di analizzare.`:'Nessun testo trovato. Prova una foto più nitida.';}
  catch(e){$('ocr-status').textContent='OCR non riuscito. Verifica connessione e immagine, oppure inserisci il testo manualmente.';}
  finally{if(worker)await worker.terminate();event.target.value='';ocrBusy=false;$('photo').disabled=$('camera').disabled=false;}
}
$('photo').addEventListener('change',recognize);$('camera').addEventListener('change',recognize);
$('clear').addEventListener('click',()=>{if(ocrBusy)return message('Attendi la fine dell’OCR prima di cancellare la sessione.',true);resetCap();$('wod').value='';$('name').value='Il mio WOD';model={intervals:[],blocks:[],warnings:[]};render();$('input-step').open=true;$('preview-step').open=false;message('Sessione cancellata.');$('ocr-status').textContent='La foto viene elaborata solo sul tuo dispositivo.';});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});$('install').addEventListener('click',async()=>{await installPrompt.prompt();installPrompt=null;$('install').hidden=true;});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();

for(const id of ['input-step','preview-step'])$(id).addEventListener('toggle',()=>{if($(id).open)$(id==='input-step'?'preview-step':'input-step').open=false;});

function suggestName(text){const lines=text.trim().split(/\n/).map(x=>x.trim()).filter(Boolean);const title=lines.find(x=>!/(EMOM|AMRAP|TABATA|FOR TIME|TIME CAP|EVERY|E[23]MOM)/i.test(x));const heading=lines.find(x=>/(EMOM|AMRAP|TIME CAP|EVERY|E[23]MOM)/i.test(x));const minutes=heading?.match(/(\d+)\s*(?:min|['’′])/i);return ((title&&!/\d/.test(title)?title:heading?.split(/\d/)[0]?.trim()||'Allenamento')+(minutes?' '+minutes[1]+'′':'')).slice(0,120);}
const storageKey='wod-seconds-saved-v1';
function saved(){try{return JSON.parse(localStorage.getItem(storageKey)||'[]');}catch{return [];}}
function persist(items){localStorage.setItem(storageKey,JSON.stringify(items));drawSaved();}
function snapshot(){generateSeconds(template||{items:[{intervals:[{}]}]},{name:$('name').value,intervals:model.intervals});return {id:crypto.randomUUID(),name:$('name').value,text:$('wod').value,model:structuredClone(model)};}
function loadWorkout(w){if(!w||typeof w.name!=='string'||typeof w.text!=='string'||!Array.isArray(w.model?.intervals)||w.model.intervals.length>2000)throw Error('Allenamento non valido.');generateSeconds({items:[{intervals:[{}]}]},{name:w.name,intervals:w.model.intervals});model=structuredClone(w.model);model.blocks=Array.isArray(model.blocks)?model.blocks:[];model.warnings=Array.isArray(model.warnings)?model.warnings:[];$('name').value=w.name;resetCap();$('wod').value=w.text;render();$('input-step').open=false;$('preview-step').open=true;}
function drawSaved(){const root=$('saved-list');root.replaceChildren();for(const w of saved()){const row=document.createElement('div');row.className='saved-row';const title=document.createElement('strong');title.textContent=w.name;row.append(title);const actions=document.createElement('div');actions.className='saved-actions';row.append(actions);for(const [label,action] of [['Apri',()=>loadWorkout(w)],['QR',()=>share(w)],['Elimina',()=>{if(confirm('Eliminare questo allenamento salvato?'))persist(saved().filter(x=>x.id!==w.id));}]]){const b=document.createElement('button');b.className='secondary';b.setAttribute('aria-label',label);b.title=label;const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('width','22');icon.setAttribute('height','22');icon.setAttribute('fill','none');icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.8');icon.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',label==='Apri'?'M4 4h10v4H8v12H4z M12 12h9m-4-4 4 4-4 4':label==='QR'?'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M14 13h3v4h4v4h-7v-4m7-4v2': 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7');icon.append(path);b.append(icon);b.onclick=()=>Promise.resolve().then(action).catch(e=>alert(e.message));actions.append(b);}root.append(row);}if(!root.children.length)root.textContent='Nessun allenamento salvato.';}
let savedNoticeTimer;
$('save-workout').onclick=()=>{const notice=$('save-notice');clearTimeout(savedNoticeTimer);try{const w=snapshot();persist([...saved(),w]);notice.className='save-notice';notice.textContent='✓ Allenamento salvato sul dispositivo';message('Salvato sul dispositivo.');savedNoticeTimer=setTimeout(()=>{notice.textContent='';},6000);}catch(e){notice.className='save-notice error';notice.textContent='Salvataggio non riuscito: '+e.message;message(notice.textContent,true);}};
async function encodeWorkout(w){const bytes=new TextEncoder().encode(JSON.stringify(w));const packed=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());return btoa(String.fromCharCode(...packed)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
async function share(w){try{if(!window.qrcode)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';s.onload=resolve;s.onerror=()=>reject(Error('Connessione necessaria per generare il QR.'));document.head.append(s);});const url=location.origin+location.pathname+'#wod='+await encodeWorkout(w);const qr=qrcode(0,'L');qr.addData(url);qr.make();$('qr-image').innerHTML=qr.createSvgTag({cellSize:5,margin:20,scalable:true});$('qr-link').href=url;$('qr-dialog').showModal();}catch(e){alert('QR non disponibile: allenamento troppo grande oppure connessione assente. '+e.message);}}
$('qr-close').onclick=()=>$('qr-dialog').close();
async function importHash(){if(!location.hash.startsWith('#wod='))return;try{const raw=location.hash.slice(5);if(raw.length>12000)throw Error('Link troppo lungo');const binary=atob(raw.replaceAll('-','+').replaceAll('_','/'));const stream=new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'));const reader=stream.getReader();let size=0,chunks=[];while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>1000000){await reader.cancel();throw Error('Dati troppo grandi');}chunks.push(r.value);}const w=JSON.parse(await new Blob(chunks).text());loadWorkout(w);w.id=crypto.randomUUID();persist([...saved(),w]);history.replaceState(null,'',location.pathname+location.search);message('Allenamento importato e salvato su questo dispositivo.');}catch(e){message('Importazione non riuscita: '+e.message,true);}}
drawSaved();importHash();window.addEventListener('hashchange',importHash);
