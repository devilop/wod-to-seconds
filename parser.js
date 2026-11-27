export const palette = [0,5,1,2,3,4,6];
export const swatches = ['#c9fa65','#80baff','#ffb16b','#ed8fc7','#b7a1ff','#70dbc8','#f2d463'];
export function exerciseKey(name) {
  return name.toLowerCase().replace(/\b\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:kg|lbs?|cal|reps?|ripetizioni|metri|m)?\b/g,'').replace(/[@()–—:,]/g,' ').replace(/\s+/g,' ').trim();
}
export function seconds(text) {
  const clock = text.match(/\b(\d+):(\d{2})\b/);
  if(clock) return Number(clock[1])*60+Number(clock[2]);
  const units = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(minuti|minuto|minutes?|minutos?|mins?|min|secondi|secondo|seconds?|segundos?|secs?|sec|s\b|m\b|['′"″])/gi)];
  if(!units.length) return null;
  return Math.round(units.reduce((sum,m)=>sum+Number(m[1].replace(',','.'))*(/^(m|')|′/i.test(m[2])?60:1),0));
}
const kindPattern = /\b(E[23]MOM|EMOM|AMRAP|TABATA|FOR\s+TIME|EVERY|INTERVAL(?:\s+TRAINING)?)\b/i;
const restPattern = /^(?:rest|recupero|riposo|pausa)\b/i;
function roundsOf(s){const m=s.match(/(\d+)\s*(?:rounds?|rondas?|giri|serie|sets?)\b/i)||s.match(/(?:rounds?|rondas?|giri|serie|sets?)\s*[:x]?\s*(\d+)/i);return m?Number(m[1]):null;}
export function parseWod(input) {
  if(/death by|until failure|as long as possible|fino (?:al |a )?cedimento/i.test(input))throw Error('Protocollo a esaurimento: indica il numero massimo di intervalli e le ripetizioni per ciascuno.');
  if(/tabata (?:this|something else)/i.test(input))throw Error('Tabata con più esercizi: indica un blocco TABATA per ciascun esercizio e gli eventuali recuperi tra blocchi.');
  if(!input.trim()) throw Error('Scrivi o carica un allenamento.');
  if(input.length>20000) throw Error('Testo troppo lungo: massimo 20.000 caratteri.');
  input=input.replace(/\b(?:AFAP|CHIPPER|AS FAST AS POSSIBLE)\b|for-time/gi,'FOR TIME').replace(/(\d+)\s*RFT\b/gi,'FOR TIME $1 rounds');
  input=input.replace(/por tiempo/gi,'FOR TIME').replace(/rondas?/gi,'rounds');
  input=input.replace(/EMOM[^\n]*todos los ejercicios[^\n]*dentro de 1 minuto,?\s*durante (\d+) minutos/gi,'EVERY 1 min FOR $1 min');
  input=input.replace(/every minute(?: on the minute)? for/gi,'EVERY 1 min FOR');
  input=input.replace(/(?:EVERY|OGNI|CADA)\s+(\d+(?::\d{2})?\s*(?:minutes?|minutos?|minuti|mins?|min|seconds?|secondi|segundos?|sec|s\b|['’′]))\s+(?:FOR|PER|DURANTE)\s+([^\n]+)/gi,(_,slot,total)=>`EVERY ${slot} FOR ${total}`);
  input=input.replace(/(?:complete\s+)?as many (?:rounds?(?: and reps?)?|reps?) as possible in/gi,'AMRAP').replace(/(?:più|piu) (?:giri|round|ripetizioni) possibili in/gi,'AMRAP').replace(/ogni ([23]) minuti per/gi,(_,n)=>`E${n}MOM`);
  const lines=input.replace(/\r/g,'').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/;|\s+poi\s+|\s+then\s+/gi,'\n').split('\n').map(s=>s.replace(/^\s*[-•]\s*/,'').trim()).filter(Boolean);
  // A single trailing prescription applies to the preceding exercise list.
  const headers=lines.map((line,index)=>kindPattern.test(line)?index:-1).filter(index=>index>=0);
  if(headers.length===1&&headers[0]>0&&lines.slice(headers[0]+1).every(line=>/^(?:time\s*cap|cap|durata|duration)\b/i.test(line))){
    const at=headers[0];const before=lines.splice(0,at);lines.push(...before);
  }
  const blocks=[]; let block=null; const warnings=[];
  for(const line of lines){
    const type=line.match(kindPattern);
    if(type){
      if(blocks.length===1&&block?.type==='FOR TIME'&&!block.lines.length&&/^for\s+time\s*:?$/i.test(block.header)&&/^(E[23]MOM|EMOM)$/i.test(type[1])){blocks.pop();warnings.push('Intestazione For Time: applicato il protocollo EMOM indicato.');}
      block={type:type[1].toUpperCase().replace(/\s+/g,' '),header:line,lines:[]};blocks.push(block);}
    else if(!block&&/^(?:time\s*cap|cap)\b/i.test(line)){block={type:'FOR TIME',header:'FOR TIME',lines:[line]};blocks.push(block);warnings.push('Time cap senza protocollo: interpretato come FOR TIME, con un unico timer.');}
    else if(restPattern.test(line)&&!block?.type.startsWith('INTERVAL')&&!(block&&/^(E[23]MOM|EMOM)$/.test(block.type)&&!seconds(line))){blocks.push({type:'REST',header:line,lines:[]});block=null;}
    else if(block) block.lines.push(line);
    else if(!blocks.length) warnings.push(`Titolo o testo introduttivo: ${line}`);
    else throw Error(`Riga fuori da un blocco: “${line}”. Aggiungi il tipo di allenamento.`);
  }
  if(!blocks.length) throw Error('Indica il formato: EMOM, E2MOM, E3MOM, AMRAP, TABATA, FOR TIME o INTERVAL.');
  const intervals=[];const summaries=[];const assigned=new Map();
  function add(name,duration,rest,round,blockIndex){
    if(!Number.isInteger(duration)||duration<=0||duration>86400) throw Error('Durata non valida: usa secondi interi positivi, massimo 24 ore.');
    if(intervals.length>=2000) throw Error('Massimo 2.000 intervalli per allenamento.');
    const key=rest?'rest':exerciseKey(name)||name.toLowerCase();
    if(!assigned.has(key)&&!rest)assigned.set(key,palette[assigned.size%palette.length]);
    intervals.push({name,duration,rest,exercise_key:key,color:rest?7:assigned.get(key),round,block:blockIndex+1});
  }
  blocks.forEach((b,bi)=>{
    if(b.type==='REST'){const duration=seconds(b.header);if(!duration)throw Error('Specifica la durata del recupero (es. Recupero 90 s).');add('Recupero',duration,true,0,bi);summaries.push({type:b.type,rounds:0});return;}
    const metadata=b.lines.filter(s=>/^(?:time\s*cap|cap|durata|duration|rounds?\b|\d+\s*(?:rounds?|giri|sets?)\s*$)/i.test(s));
    const info=[b.header,...metadata].join(' ');
    let exercises=b.lines.filter(s=>!metadata.includes(s));
    const inline=b.header.match(/\s[-–—]\s(.+)$|:\s+(.+)$/);
    if(inline&&!/^\d+\s*(?:rounds?|giri|sets?)\s*$/i.test(inline[1]||inline[2]))exercises.unshift(inline[1]||inline[2]);
    exercises=exercises.flatMap(s=>s.split(/\s*,(?!\s*\d)\s*|\s+(?:e|and)\s+(?=\d)/i)).filter(Boolean);
    let rounds=roundsOf(info), total=seconds(info.split(/\s[-–—]\s|:\s+/)[0]);
    if(metadata.length)total=seconds(metadata.join(' '))||total;
    if(rounds!==null&&(rounds<1||rounds>2000))throw Error('Il numero di round deve essere tra 1 e 2.000.');
    if(!exercises.length) throw Error(`${b.type}: aggiungi gli esercizi su righe separate oppure dopo “ — ”.`);
    if(b.type==='EVERY'){
      const timing=b.header.match(/^EVERY\s+(.+?)\s+FOR\s+(.+)$/i);
      const sets=b.header.match(/^EVERY\s+(.+?)\s*[x×]\s*(\d+)\s*(?:sets?|rounds?)\s*:?$/i);
      const slot=seconds((sets||timing)?.[1]||'');
      const duration=sets?slot*Number(sets[2]):timing&&seconds(timing[2]);
      if(!slot||!duration||!Number.isInteger(duration/slot)||duration/slot>2000)throw Error('EVERY: indica una durata totale multipla della finestra (es. EVERY 5 min FOR 15 min).');
      rounds=duration/slot;
      for(let r=1;r<=rounds;r++)add(exercises.join(' + '),slot,false,r,bi);
      warnings.push('EVERY: tutti gli esercizi in ogni finestra; il recupero residuo è incluso.');
    }else if(/^(E[23]MOM|EMOM)$/.test(b.type)){
      const slot=b.type==='EMOM'?60:b.type==='E2MOM'?120:180;
      const progression=exercises.find(s=>/^\d+(?:\s*[-–—]\s*\d+)+$/.test(s));
      if(progression){
        const reps=progression.split(/\s*[-–—]\s*/).map(Number);
        const instructions=exercises.filter(s=>/^(?:START|PARTENZA)\b/i.test(s));
        const movements=exercises.filter(s=>s!==progression&&!instructions.includes(s));
        if(movements.length!==1||!total||total/slot!==reps.length)throw Error('Progressione: serve un esercizio e una ripetizione per ogni finestra temporale.');
        reps.forEach((rep,i)=>add(`${rep} ${movements[0]}${i===0&&instructions.length?' · '+instructions.join(' · '):''}`,slot,false,i+1,bi));
        const key=exerciseKey(movements[0]);const color=intervals[intervals.length-reps.length].color;
        intervals.slice(-reps.length).forEach(i=>{i.exercise_key=key;i.color=color;});
        summaries.push({type:b.type,rounds:reps.length});return;
      }
      let numbered=false;
      exercises=exercises.flatMap(s=>{
        const range=s.match(/^(\d+)\s*[°º]\s*[-–—]\s*(\d+)\s*[°º]\s*(.+)$/);
        if(range){const first=+range[1],last=+range[2];if(last<first||last-first>100)throw Error('Intervallo di stazioni non valido.');numbered=true;return Array(last-first+1).fill(range[3]);}
        const station=s.match(/^(?:(?:min(?:uto|ute)?|station)\s*)?\d+\s*[°º:.)-]\s*(.+)$/i);
        if(station){numbered=true;return [station[1]];}return [s];
      });
      let count=total?total/slot:rounds?rounds*exercises.length:null;
      if(!count||!Number.isInteger(count))throw Error(`${b.type}: indica una durata multipla di ${slot} s oppure il numero di round.`);
      if(rounds&&total&&rounds*exercises.length!==count)throw Error(`${b.type}: durata, round e numero di stazioni non coincidono.`);
      for(let i=0;i<count;i++){const name=exercises[i%exercises.length];add(name,slot,restPattern.test(name),Math.floor(i/exercises.length)+1,bi);}
      rounds=count/exercises.length;
      if(!Number.isInteger(rounds))warnings.push(`${b.type}: ultimo giro incompleto (${count} finestre, ${exercises.length} stazioni).`);
      warnings.push(`${b.type}: ${numbered?'stazioni numerate':'ogni riga è una stazione'}; usa “+” per più esercizi nella stessa finestra. Il recupero residuo resta nella finestra.`);
    }else if(b.type==='AMRAP'||b.type==='FOR TIME'){
      if(!total)throw Error(`${b.type}: ${b.type==='FOR TIME'?'serve un time cap':'specifica la durata'} (es. 12 min).`);
      const scheme=b.header.match(/\d+(?:[-–—]\d+)+/);
      add(`${b.type}${scheme?' · '+scheme[0]+' reps':''}${rounds?' · '+rounds+' round':''} · ${exercises.join(' + ')}`,total,false,1,bi);
      if(b.type==='AMRAP')rounds=null;
    }else if(b.type==='TABATA'){
      const custom=info.match(/(\d+)\s*(?:s|sec)?\s*\/\s*(\d+)\s*(?:s|sec)?/i);
      const workMatch=info.match(/(\d+)\s*(?:s|sec|secondi)\s*(?:work|lavoro)/i);
      const restMatch=info.match(/(\d+)\s*(?:s|sec|secondi)\s*(?:rest|recupero|riposo)/i);
      if((workMatch&&!restMatch)||(!workMatch&&restMatch))throw Error('TABATA: indica sia lavoro sia recupero, es. 30/15.');
      const work=custom?+custom[1]:workMatch?+workMatch[1]:20;
      const rest=custom?+custom[2]:restMatch?+restMatch[1]:10;
      rounds=rounds||8;
      if(!custom&&!workMatch)warnings.push('TABATA: applicato lo standard 8 round (se non specificati), 20 s lavoro / 10 s recupero, incluso il recupero finale.');
      for(let r=1;r<=rounds;r++){add(exercises[(r-1)%exercises.length],work,false,r,bi);if(rest)add('Recupero',rest,true,r,bi);}
    }else{
      rounds=rounds||1;
      for(let r=1;r<=rounds;r++)for(const ex of exercises){const duration=seconds(ex);if(!duration)throw Error(`INTERVAL: manca la durata di “${ex}”.`);add(ex,duration,restPattern.test(ex),r,bi);}
    }
    summaries.push({type:b.type,rounds});
  });
  return {intervals,blocks:summaries,warnings:[...new Set(warnings)]};
}
export function generateSeconds(template,{name,notes='',intervals}){
  if(typeof name!=='string'||!name.trim())throw Error('Inserisci il nome dell’allenamento.');
  if(!intervals?.length)throw Error('Nessun intervallo da esportare.');
  const result=structuredClone(template), timer=result.items[0],base=timer.intervals[0],colors=new Map();
  timer.intervals=intervals.map(i=>{
    if(!Number.isInteger(i.duration)||i.duration<=0||i.duration>86400||!i.name.trim()||typeof i.rest!=='boolean')throw Error('Controlla nomi e durate degli intervalli (da 1 a 86.400 secondi).');
    const key=i.exercise_key||exerciseKey(i.name);
    if(!i.rest&&!palette.includes(i.color))throw Error('Colore non valido per un esercizio.');
    if(!colors.has(key)&&!i.rest)colors.set(key,i.color);
    return {...structuredClone(base),name:i.name,duration:i.duration,rest:i.rest,color:i.rest?7:colors.get(key)};
  });
  timer.name=name.trim();timer.notes=notes;timer.numberOfSets=1;timer.identifier=crypto.randomUUID().toUpperCase();result.identifier=crypto.randomUUID().toUpperCase();
  return result;
}

