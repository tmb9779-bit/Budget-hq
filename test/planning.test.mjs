import test from 'node:test';import assert from 'node:assert/strict';import {calculateScenario} from '../scenario.js';import {starterTripEstimate,tripCost,evaluateTrip,suggestTripDates} from '../trip-planner.js';import {fresh,change,summary} from '../server/model.mjs';
const day='2026-09-15';
function trip(){const t={name:'Weekend',origin:'Home',destination:'City',start:'2026-09-20',end:'2026-09-23',bookingDate:day,mode:'Fly',rental:false,travelers:2,rooms:1,savingsMode:'Automatic',saved:0,weeklySaving:0,upfront:0};return {...t,...starterTripEstimate(t).values};}
function data(){let b=fresh();b=change(b,'account',{name:'Cash',kind:'cash',openingBalance:20000,balanceDate:day},day);return summary(b,day);}
test('generated trip estimate includes hotel nights and airfare per traveler',()=>{const result=tripCost(trip());assert.equal(result.nights,3);assert.equal(result.lines.find(x=>x.label==='Round-trip flights').amount,850);assert.equal(result.lines.find(x=>x.label==='Accommodation').amount,480);assert.ok(result.total>1000);});
test('trip dates and savings projection respect forecast window',()=>{const t=trip(),s=data(),result=evaluateTrip(t,s);assert.equal(result.selected.status,'Fits forecast');assert.ok(result.weeklySaving>0);assert.equal(suggestTripDates(t,3,s).length,3);assert.equal(evaluateTrip({...t,start:'2026-12-01',end:'2026-12-04'},s).selected.status,'Outside forecast');});
test('one-time what-if purchase is charged exactly once on chosen date',()=>{const forecast=data().plan.forecast,r=calculateScenario(forecast,{start:day,date:'2026-09-20',purchase:500,buffer:400});assert.equal(r.points[4].cash,20000);assert.equal(r.points[5].cash,19500);assert.equal(r.ending.cash,19500);assert.throws(()=>calculateScenario(forecast,{start:day,date:'2026-12-01',purchase:500}));});
test('saved trip money is never added to current cash a second time',()=>{const t=trip(),s=data(),a=evaluateTrip(t,s),b=evaluateTrip({...t,saved:500},s);assert.equal(a.selected.low.cash,b.selected.low.cash);assert.equal(Math.round((a.remaining-b.remaining)*100),50000);});

test('same-day paychecks subtract every bill and debt payment in the daily and paycheck plans',async()=>{
 const {buildPlan}=await import('../plan-view.js');const {allocatePaycheck}=await import('../analysis.js');
 let b=fresh();b=change(b,'account',{name:'Cash',kind:'cash',openingBalance:1000,balanceDate:day},day);b=change(b,'settings',{buffer:0,planningConfirmed:true},day);
 b=change(b,'income',{name:'Pay',amount:800,date:day,frequency:'Biweekly'},day);
 b=change(b,'income',{name:'Second pay',amount:200,date:day,frequency:'Biweekly'},day);
 for(const [name,amount] of [['Rent',300],['Internet',60]])b=change(b,'bill',{name,amount,date:day,frequency:'Monthly'},day);
 b=change(b,'account',{name:'Card',kind:'credit',openingBalance:500,balanceDate:day,payment:100,dueDate:day,frequency:'Monthly'},day);
 const s=summary(b,day),p=s.plan.forecast[0];assert.equal(p.income,1000);assert.equal(p.scheduled,360);assert.equal(p.reserve,100);assert.equal(p.cash,1540);
 assert.equal(buildPlan(b,s).periods[0].committed,460);assert.equal(allocatePaycheck(b,s).required,460);
 assert.equal(s.plan.forecast[1].cash,1540);
});
