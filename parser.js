export const palette = [0,5,1,2,3,4,6];
export const swatches = ['#c9fa65','#80baff','#ffb16b','#ed8fc7','#b7a1ff','#70dbc8','#f2d463'];
export function exerciseKey(name) {
  return name.toLowerCase().replace(/\b\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:kg|lbs?|cal|reps?|ripetizioni|metri|m)?\b/g,'').replace(/[@()–—:,]/g,' ').replace(/\s+/g,' ').trim();
}
export function seconds(text) {
  const clock = text.match(/\b(\d+):(\d{2})\b/);
  if(clock) return Number(clock[1])*60+Number(clock[2]);
  const units = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(minuti|minuto|minutes?|mins?|min|secondi|secondo|seconds?|secs?|sec|s\b|m\b|['′"″])/gi)];
  if(!units.length) return null;
  return Math.round(units.reduce((sum,m)=>sum+Number(m[1].replace(',','.'))*(/^(m|')|′/i.test(m[2])?60:1),0));
}
const kindPattern = /\b(E[23]MOM|EMOM|AMRAP|TABATA|FOR\s+TIME|INTERVAL(?:\s+TRAINING)?)\b/i;
const restPattern = /^(?:rest|recupero|riposo|pausa)\b/i;
function roundsOf(s){const m=s.match(/(\d+)\s*(?:rounds?|giri|serie|sets?)\b/i)||s.match(/(?:rounds?|giri|serie|sets?)\s*[:x]?\s*(\d+)/i);return m?Number(m[1]):null;}
export function parseWod(input) {
  if(!input.trim()) throw Error('Scrivi o carica un allenamento.');
  if(input.length>20000) throw Error('Testo troppo lungo: massimo 20.000 caratteri.');
  const lines=input.replace(/\r/g,'').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/;|\s+poi\s+|\s+then\s+/gi,'\n').split('\n').map(s=>s.replace(/^\s*[-•]\s*/,'').trim()).filter(Boolean);
  const blocks=[]; let block=null; const warnings=[];
  for(const line of lines){
    const type=line.match(kindPattern);
    if(type){block={type:type[1].toUpperCase().replace(/\s+/g,' '),header:line,lines:[]};blocks.push(block);}
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
    exercises=exercises.flatMap(s=>s.split(/\s*,\s*(?!\d)|\s+e\s+|\s+and\s+/i)).filter(Boolean);
    let rounds=roundsOf(info), total=seconds(info.split(/\s[-–—]\s|:\s+/)[0]);
    if(metadata.length)total=seconds(metadata.join(' '))||total;
    if(rounds!==null&&(rounds<1||rounds>2000))throw Error('Il numero di round deve essere tra 1 e 2.000.');
    if(!exercises.length) throw Error(`${b.type}: aggiungi gli esercizi su righe separate oppure dopo “ — ”.`);
    if(/^(E[23]MOM|EMOM)$/.test(b.type)){
      const slot=b.type==='EMOM'?60:b.type==='E2MOM'?120:180;
      const numbered=exercises.some(s=>/^(?:(?:min(?:uto|ute)?|station)\s*)?\d+\s*[:.)-]/i.test(s));
      exercises=exercises.map(s=>s.replace(/^(?:(?:min(?:uto|ute)?|station)\s*)?\d+\s*[:.)-]\s*/i,''));
      let count=total?total/slot:rounds?rounds*exercises.length:null;
      if(!count||!Number.isInteger(count))throw Error(`${b.type}: indica una durata multipla di ${slot} s oppure il numero di round.`);
      if(rounds&&total&&rounds*exercises.length!==count)throw Error(`${b.type}: durata, round e numero di stazioni non coincidono.`);
      for(let i=0;i<count;i++){const name=exercises[i%exercises.length];add(name,slot,restPattern.test(name),Math.floor(i/exercises.length)+1,bi);}
      rounds=count/exercises.length;
      if(!Number.isInteger(rounds))warnings.push(`${b.type}: ultimo giro incompleto (${count} finestre, ${exercises.length} stazioni).`);
      warnings.push(`${b.type}: ${numbered?'stazioni numerate':'ogni riga è una stazione'}; usa “+” per più esercizi nella stessa finestra. Il recupero residuo resta nella finestra.`);
    }else if(b.type==='AMRAP'||b.type==='FOR TIME'){
      if(!total)throw Error(`${b.type}: ${b.type==='FOR TIME'?'serve un time cap':'specifica la durata'} (es. 12 min).`);
      add(`${b.type}${rounds?' · '+rounds+' round':''} · ${exercises.join(' + ')}`,total,false,1,bi);
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

