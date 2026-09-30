import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,change,summary} from '../server/model.mjs';import {allocatePaycheck} from '../analysis.js';
const day='2026-09-19';
function fixture(){let b=fresh();b=change(b,'account',{name:'Checking',kind:'cash',openingBalance:2000,balanceDate:day},day);b=change(b,'income',{name:'Job',date:day,amount:1000,frequency:'Weekly'},day);b=change(b,'settings',{buffer:100,planningConfirmed:true},day);return b;}
test('empty destinations allocate zero and unused money stays flexible without changing saved weights',()=>{
 const b=fixture(),before=JSON.stringify(b),a=allocatePaycheck(b,summary(b,day));for(const key of ['goals','sinking','wishes','debt'])assert.equal(a.parts[key],0);assert.equal(a.parts.flex,a.surplus);assert.equal(JSON.stringify(b),before);assert.equal(a.buffer+Object.values(a.parts).reduce((n,v)=>n+v,0)+Math.min(a.required,a.amount),a.amount);
});
test('unfinished plans get allocations; completed and manually paused plans do not',()=>{
 let b=fixture();for(const action of ['goal','sinking','wish'])b=change(b,action,{name:action,cost:1000,saved:0,style:'Automatic'},day);
 let a=allocatePaycheck(b,summary(b,day));for(const k of ['goals','sinking','wishes'])assert.ok(a.parts[k]>0);
 b.goals[0].saved=1000;b.sinking[0].style='Pause';b.wishes[0].style='Pause';a=allocatePaycheck(b,summary(b,day));for(const k of ['goals','sinking','wishes'])assert.equal(a.parts[k],0);
});
