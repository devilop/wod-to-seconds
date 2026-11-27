import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseWod} from '../parser.js';
const sequence='20 BOX JUMP OVER\n2 ROPE CLIMB\n20 AMERICAN SWING\n2 ROPE CLIMB';
for(const header of ["EVERY 5’ FOR 15’",'Every 5 minutes for 15 minutes','OGNI 5 minuti PER 15 minuti','CADA 5 minutos DURANTE 15 minutos'])test(header,()=>{
 const p=parseWod(header+'\n'+sequence);assert.equal(p.intervals.length,3);assert.equal(p.blocks[0].rounds,3);assert.ok(p.intervals.every(i=>i.duration===300&&i.name===sequence.replaceAll('\n',' + ')));assert.equal(new Set(p.intervals.map(i=>i.color)).size,1);
});
for(const [slot,count] of [[1,12],[2,6],[3,4],[4,3],[5,3],[6,2],[10,3],[15,2]])test(`EVERY ${slot} min full sequence`,()=>{const p=parseWod(`EVERY ${slot} min FOR ${slot*count} min\n`+sequence);assert.equal(p.intervals.length,count);assert.equal(p.intervals[0].duration,slot*60);assert.match(p.intervals[0].name,/ROPE CLIMB.*ROPE CLIMB/);});
test('EVERY seconds and mixed blocks',()=>{const p=parseWod('EVERY 90 s FOR 6 min\n5 clean + 8 press\nRest 1 min\nAMRAP 3 min\n10 squat');assert.deepEqual(p.intervals.map(i=>i.duration),[90,90,90,90,60,180]);});
test('reject incomplete EVERY windows',()=>{for(const header of ['EVERY 5 min FOR 14 min','EVERY 0 min FOR 15 min','EVERY 5 FOR 15'])assert.throws(()=>parseWod(header+'\n'+sequence));});
// Source: https://www.fullcrossfit.com/crossfit-ejercicios
// Representative structures, not a catalogue of named workouts.
for(const scheme of ['9-7-5','21-15-9','50-40-30-20-10','10-9-8-7-6-5-4-3-2-1'])test('trailing Spanish rep scheme '+scheme,()=>{const input=`Squat\nPush-up\n${scheme} repeticiones por tiempo`;assert.throws(()=>parseWod(input),/time cap/);const p=parseWod(input+'\nTime cap 12 min');assert.equal(p.intervals[0].duration,720);assert.ok(p.intervals[0].name.includes(scheme));});
for(const rounds of [2,3,4,5,6,7,10])test('trailing Spanish rounds '+rounds,()=>{const p=parseWod(`10 squat\n5 push-up\n${rounds} rondas, por tiempo\nTime cap 15 min`);assert.equal(p.blocks[0].rounds,rounds);assert.equal(p.intervals.length,1);});
test('trailing Spanish AMRAP',()=>{const p=parseWod('5 squat\n10 push-up\nAMRAP (as many reps as possible) máximas repeticiones posibles en 20 minutos');assert.equal(p.intervals[0].duration,1200);assert.match(p.intervals[0].name,/5 squat.*10 push-up/);});
test('explicit all exercises each minute',()=>{const p=parseWod('5 Pull-ups\n10 Push-ups\n15 Squats\nEMOM (every minute on the minute), todos los ejercicios hay que hacerlos dentro de 1 minuto, durante 30 minutos');assert.equal(p.intervals.length,30);assert.match(p.intervals[0].name,/Pull-ups.*Push-ups.*Squats/);});
test('leading title does not become EMOM station',()=>{const p=parseWod('WOD\nEMOM 4 min\n10 squat\n5 press');assert.equal(p.blocks[0].rounds,2);});
// Source: https://wodcat.com/wod?hl=it. Listed scores are NOT time caps.
for(const [name,input] of [['Death feet','FOR TIME\n200 Walking Lunge'],['50 burpees','FOR TIME\n50 Burpees'],['DSTU','5 rounds for time of:\n100 Jump Rope (Single)\n50 Sit-Ups\n100 Jump Rope (Single)\n50 Mountain Climber']])test('WODCAT '+name,()=>{assert.throws(()=>parseWod(input),/time cap/);const p=parseWod(input+'\nTime cap 25 min');assert.equal(p.intervals[0].duration,1500);});
for(const format of ['AFAP','For-Time','CHIPPER','3 RFT'])test('WODCAT format '+format,()=>{const p=parseWod(format+'\nTime cap 10 min\n30 clean and jerk 42,5 kg');assert.equal(p.intervals[0].duration,600);assert.match(p.intervals[0].name,/clean and jerk 42,5 kg/);if(format==='3 RFT')assert.equal(p.blocks[0].rounds,3);});
