import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseWod,generateSeconds,exerciseKey,seconds} from '../parser.js';
const template=JSON.parse(fs.readFileSync(new URL('../template.seconds',import.meta.url)));
test('EMOM expands 12 minutes over three stations',()=>{const p=parseWod('EMOM 12 min\n10 burpees\n12 swing 24 kg\n15 squat');assert.equal(p.intervals.length,12);assert.equal(p.blocks[0].rounds,4);assert.equal(p.intervals.reduce((s,i)=>s+i.duration,0),720);assert.equal(p.intervals[0].color,p.intervals[3].color);});
test('E2MOM and E3MOM preserve combined exercises',()=>{for(const [type,duration] of [['E2MOM',120],['E3MOM',180]]){const p=parseWod(`${type} 2 round\n5 squat + 5 press\n10 row`);assert.equal(p.intervals.length,4);assert.equal(p.intervals[0].duration,duration);assert.equal(p.intervals[0].name,'5 squat + 5 press');}});
test('AMRAP is one whole interval, rounds unknown',()=>{const p=parseWod('AMRAP 10 min\n10 burpees\n20 squat');assert.equal(p.intervals.length,1);assert.equal(p.intervals[0].duration,600);assert.equal(p.blocks[0].rounds,null);});
test('FOR TIME requires cap and preserves prescription',()=>{assert.throws(()=>parseWod('FOR TIME\n10 burpees'),/time cap/);const p=parseWod('FOR TIME — 3 round\nTime cap 8 min\n10 burpees 20 kg');assert.equal(p.intervals[0].duration,480);assert.match(p.intervals[0].name,/3 round/);assert.match(p.intervals[0].name,/20 kg/);});
test('Tabata standard and custom',()=>{const standard=parseWod('TABATA\nBurpees');assert.equal(standard.intervals.length,16);assert.equal(standard.intervals.reduce((s,i)=>s+i.duration,0),240);const custom=parseWod('TABATA 6 round 30/15\nSquat');assert.equal(custom.intervals.length,12);assert.equal(custom.intervals[1].duration,15);});
test('mixed blocks preserve order and rest',()=>{const p=parseWod('EMOM 2 min\nBurpees\nRecupero 90 s\nAMRAP 3 min\nSquat\nFOR TIME 4 min\nRow');assert.deepEqual(p.intervals.map(i=>i.duration),[60,60,90,180,240]);assert.equal(p.intervals[2].color,7);assert.equal(p.intervals[2].rest,true);});
test('interval work and rest repeated explicitly',()=>{const p=parseWod('INTERVAL 2 round\nRow 40 s\nRest 20 s');assert.deepEqual(p.intervals.map(i=>i.duration),[40,20,40,20]);assert.equal(p.intervals[3].rest,true);});
test('EMOM rest station uses the full window',()=>{const p=parseWod('EMOM 6 min\nBurpees\nRest');assert.equal(p.intervals.length,6);assert.equal(p.intervals[1].duration,60);assert.equal(p.intervals[1].color,7);assert.equal(p.intervals[1].rest,true);});
test('keys ignore reps and loads',()=>{assert.equal(exerciseKey('10 front squat 40 kg'),exerciseKey('15 front squat 60 kg'));});
test('reject missing, conflicting and unreasonable durations',()=>{for(const s of ['hello','EMOM\nSquat','E2MOM 3 min\nSquat','EMOM 12 min 3 round\nSquat','AMRAP\nRow','INTERVAL\nBurpees','TABATA 0 round\nSquat','EMOM 5000 min\nSquat'])assert.throws(()=>parseWod(s));});
test('time units and inline text',()=>{assert.equal(seconds('1 min 30 s'),90);assert.equal(seconds('12:30'),750);assert.equal(parseWod('AMRAP 10 min — 200 m run').intervals[0].duration,600);assert.equal(parseWod('EMOM 4 min: 10 burpees').intervals.length,4);});
test('export clones all template fields, expands sets, uses UUIDs',()=>{const p=parseWod('TABATA 2 round\nSquat');const out=generateSeconds(template,{name:'Test',notes:'original',intervals:p.intervals});assert.equal(out.items[0].numberOfSets,1);assert.equal(out.items[0].intervals.length,4);assert.deepEqual(out.items[0].music,template.items[0].music);assert.deepEqual(Object.keys(out.items[0].intervals[0]).sort(),Object.keys(template.items[0].intervals[0]).sort());assert.notEqual(out.identifier,template.identifier);assert.equal(template.items[0].intervals.length,3);assert.equal(out.items[0].intervals[1].color,7);});
test('invalid export rejected and gray excluded from work palette',()=>{const p=parseWod('EMOM 1 min\nSquat');for(const duration of [0,-1,1.2,NaN])assert.throws(()=>generateSeconds(template,{name:'x',intervals:[{...p.intervals[0],duration}]}));assert.throws(()=>generateSeconds(template,{name:'x',intervals:[{...p.intervals[0],color:7}]}));});

test('HYBRID photo with subtitle and ordinal stations',()=>{const p=parseWod("HYBRID\nFor Time\nEMOM 30’\n1° 15/12 CAL SKIERG\n2° 10 PUSH PRESS 2xDB\n3° 15 STEP BOX OVER 1xDB\n4° 20 PUSH UP\n5° 15/12 CAL SKIERG\n6° REST");assert.equal(p.intervals.length,30);assert.equal(p.blocks[0].rounds,5);assert.equal(p.intervals.reduce((s,i)=>s+i.duration,0),1800);assert.equal(p.intervals.filter(i=>i.rest).length,5);assert.equal(p.intervals[0].name,'15/12 CAL SKIERG');assert.equal(p.intervals[1].name,'10 PUSH PRESS 2xDB');assert.equal(p.intervals[0].color,p.intervals[4].color);assert.equal(p.intervals[5].color,7);});
test('do not discard real or ambiguous FOR TIME blocks',()=>{assert.throws(()=>parseWod('FOR TIME 5 min\nEMOM 2 min\nSquat'));assert.throws(()=>parseWod('FOR TIME\n10 burpees\nEMOM 2 min\nSquat'),/time cap/);const p=parseWod('FOR TIME 5 min\n10 burpees\nEMOM 2 min\nSquat');assert.equal(p.blocks.length,2);assert.equal(p.intervals[0].duration,300);});

test('double rest range in EMOM is two stations',()=>{const p=parseWod("WOD\nFor Time\nEMOM 30’\n1° 50 DOUBLE UNDER\n2° 15 THRUSTER 2xDB\n3° 15 HSPU\n4° MAX REP MAN MAKER 2xDB\n5°-6° REST");assert.equal(p.intervals.length,30);assert.equal(p.blocks[0].rounds,5);assert.equal(p.intervals.filter(i=>i.rest).length,10);assert.equal(p.intervals[4].name,'REST');assert.equal(p.intervals[5].duration,60);});
test('E2MOM rep progression and starting load',()=>{const p=parseWod("E2MOM 12’\nFRONT SQUAT\n6-6-4-4-2-2\nSTART 60%");assert.deepEqual(p.intervals.map(i=>parseInt(i.name)),[6,6,4,4,2,2]);assert.ok(p.intervals.every(i=>i.duration===120&&!i.rest));assert.equal(p.blocks[0].rounds,6);assert.match(p.intervals[0].name,/START 60%/);assert.equal(new Set(p.intervals.map(i=>i.color)).size,1);});

test('photo with implicit FOR TIME preserves sequence and alternatives',()=>{
 const movements=['30 V-UP','20 ALT SNATCH DB','15 PISTOL SQUAT / 20 LUNGES','10 ALT DEVIL PRESS','10 MUSCLE UP','10 ALT DEVIL PRESS','15 PISTOL SQUAT / 20 LUNGES','20 ALT SNATCH DB','30 V-UP'];
 for(const heading of ['TIME CAP 14’','Time cap: 14 min','CAP 14:00']){
  const p=parseWod([heading,...movements].join('\n'));
  assert.equal(p.intervals.length,1);assert.equal(p.intervals[0].duration,840);
  assert.equal(p.intervals[0].name,'FOR TIME · '+movements.join(' + '));
  const out=generateSeconds(template,{name:'Time cap 14',intervals:p.intervals});
  assert.equal(out.items[0].intervals[0].duration,840);
 }
});
test('cap metadata does not override explicit protocol or invent missing duration',()=>{
 assert.equal(parseWod('AMRAP\nTime cap 14 min\n10 squat').blocks[0].type,'AMRAP');
 assert.equal(parseWod('FOR TIME\nTime cap 14 min\n10 squat').intervals.length,1);
 assert.throws(()=>parseWod('TIME CAP\n30 V-UP'),/time cap/);
 assert.throws(()=>parseWod('TIME CAP 14 min'),/esercizi/);
});
