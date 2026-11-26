import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseWod} from '../parser.js';
// Protocols paraphrased from official CrossFit sources. Caps below are explicit test inputs, not source prescriptions.
test('Cindy: English AMRAP wording (crossfit.com/benchmark/cindy)',()=>{const p=parseWod('Cindy\nComplete as many rounds and reps as possible in 20 minutes of:\n5 pull-ups\n10 push-ups\n15 squats');assert.equal(p.intervals.length,1);assert.equal(p.intervals[0].duration,1200);assert.equal(p.blocks[0].rounds,null);});
test('Fran: descending reps, no invented cap (crossfit.com/benchmark/fran)',()=>{const text='Fran\n21-15-9 reps for time of:\nThrusters\nPull-ups';assert.throws(()=>parseWod(text),/time cap/);const p=parseWod(text+'\nTime cap 10 min');assert.equal(p.intervals[0].duration,600);assert.match(p.intervals[0].name,/21-15-9/);});
test('Helen: rounds for time (crossfit.com/benchmark/helen)',()=>{const text='Helen\n3 rounds for time:\nRun 400 m\n21 kettlebell swings\n12 pull-ups';assert.throws(()=>parseWod(text),/time cap/);const p=parseWod(text+'\nTime cap 15 min');assert.equal(p.blocks[0].rounds,3);assert.equal(p.intervals.length,1);});
test('Tabata This: five successive blocks and rotation rests (crossfit.com/faq)',()=>{const text=['Squat','Row','Pull-ups','Sit-ups','Push-ups'].map(x=>'TABATA 8 round 20/10\n'+x).join('\nRecupero 1 min\n');const p=parseWod(text);assert.equal(p.intervals.length,84);assert.equal(p.intervals.reduce((s,i)=>s+i.duration,0),1440);});
test('English every two minutes phrase',()=>{const p=parseWod('Every 2 minutes for 12 minutes\nFront squat');assert.equal(p.intervals.length,6);assert.ok(p.intervals.every(i=>i.duration===120));});
