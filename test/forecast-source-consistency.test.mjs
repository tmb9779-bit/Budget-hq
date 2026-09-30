import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,change,incomeEvents} from '../server/model.mjs';
import {incomeForecastDecision,incomeEstimate} from '../analysis.js';

const day='2026-09-16';
function budget(){let b=fresh();b=change(b,'account',{name:'Checking',kind:'cash',openingBalance:1000,balanceDate:day},day);b=change(b,'incomeProfile',{name:'Work',historyName:'Work',amount:800,date:day,frequency:'Weekly',estimateMode:'conservative'},day);return b;}

test('the source estimate agrees with forecast events even with saved legacy global choices',()=>{
 let b=budget(),source=b.incomes[0];
 for(const policy of ['expected','cautious','manual','entered','typical']){
  b.settings.forecastIncome=policy;
  const decision=incomeForecastDecision(b,source,day);
  assert.equal(decision.forecast.amount,800);
  assert.equal(incomeEvents(b,day,day,day)[0].amount,800);
 }
 source.estimateMode='manual';assert.equal(incomeForecastDecision(b,source,day).forecast.amount,800);
});
test('a cautious source pauses after two missed pay periods regardless of saved global choice',()=>{
 const asOf='2026-09-27';let b=fresh();b=change(b,'account',{name:'Checking',kind:'cash',openingBalance:1000,balanceDate:'2026-08-01'},asOf);b=change(b,'incomeProfile',{name:'Work',historyName:'Work',amount:800,date:'2026-08-23',frequency:'Weekly',estimateMode:'conservative'},asOf);
 for(const date of ['2026-08-23','2026-08-30','2026-09-06'])b=change(b,'transaction',{name:'Work',amount:800,date,direction:'Inflow',category:'Income',accountId:b.accounts[0].id,historical:true},asOf);
 b.settings.forecastIncome='expected';let decision=incomeForecastDecision(b,b.incomes[0],asOf);assert.equal(decision.estimate.missedPaydays,2);assert.equal(decision.forecast,null);assert.match(decision.reason,/paused this source/);assert.deepEqual(incomeEvents(b,asOf,'2026-10-04',asOf),[]);
 b=change(b,'transaction',{name:'Work',amount:810,date:'2026-09-20',direction:'Inflow',category:'Income',accountId:b.accounts[0].id,historical:true},asOf);decision=incomeForecastDecision(b,b.incomes[0],asOf);assert.equal(decision.estimate.missedPaydays,0);assert.ok(decision.forecast);
});
test('one unusually low paycheck is excluded while ordinary variable pay remains visible',()=>{
 const asOf='2026-09-27';let b=fresh();b=change(b,'account',{name:'Checking',kind:'cash',openingBalance:1000,balanceDate:'2026-08-01'},asOf);b=change(b,'incomeProfile',{name:'Work',amount:800,date:'2026-09-06',frequency:'Weekly',estimateMode:'conservative'},asOf);
 for(const [date,amount] of [['2026-09-06',1000],['2026-09-13',1020],['2026-09-20',980],['2026-09-27',300]])b=change(b,'transaction',{name:'Work',amount,date,direction:'Inflow',category:'Income',accountId:b.accounts[0].id,historical:true},asOf);
 let e=incomeEstimate(b,b.incomes[0],asOf);assert.equal(e.matchedCount,4);assert.equal(e.count,3);assert.equal(e.outliers[0].amount,300);assert.equal(e.typical,1000);assert.ok(e.conservative>970&&e.conservative<1000);assert.equal(e.rows.length,4);
 b.transactions.forEach((t,i)=>t.amount=[500,500,1000,1000][i]);e=incomeEstimate(b,b.incomes[0],asOf);assert.equal(e.outliers.length,0);assert.equal(e.typical,750);
});

test('deposit review overrides automatic outliers without changing recorded cash',()=>{
 let b=budget();for(const [i,amount] of [1000,1020,980,300].entries())b=change(b,'transaction',{name:'Work',amount,date:`2026-08-${String(10+i*7).padStart(2,'0')}`,direction:'Inflow',category:'Income',accountId:b.accounts[0].id,historical:true},day);
 const original=JSON.stringify(b.transactions),e=incomeEstimate(b,b.incomes[0],day),low=e.outliers[0];assert.equal(e.typical,1000);
 b=change(b,'incomeDepositReview',{incomeId:b.incomes[0].id,transactionId:low.id,mode:'include'},day);assert.equal(incomeEstimate(b,b.incomes[0],day).count,4);
 b=change(b,'incomeDepositReview',{incomeId:b.incomes[0].id,transactionId:low.id,mode:'automatic'},day);assert.equal(incomeEstimate(b,b.incomes[0],day).count,3);
 b=change(b,'incomeDepositReview',{incomeId:b.incomes[0].id,transactionId:e.rows.find(t=>t.amount===1020).id,mode:'exclude'},day);assert.equal(incomeEstimate(b,b.incomes[0],day).count,2);assert.equal(JSON.stringify(b.transactions),original);
 assert.throws(()=>change(b,'incomeDepositReview',{incomeId:b.incomes[0].id,transactionId:'missing',mode:'include'},day),/no longer matched/);
});

test('source method controls the amount while legacy global policy is inert',()=>{
 let b=budget();for(const [i,amount] of [900,1000,1100].entries())b=change(b,'transaction',{name:'Work',amount,date:`2026-08-${10+i*7}`,direction:'Inflow',category:'Income',accountId:b.accounts[0].id,historical:true},day);
 b.settings.forecastIncome='entered';const cautious=incomeForecastDecision(b,b.incomes[0],day).forecast.amount;
 assert.ok(cautious<1000);assert.equal(incomeEvents(b,day,day,day)[0].amount,cautious);
 b.incomes[0].estimateMode='average';b.settings.forecastIncome='cautious';assert.equal(incomeForecastDecision(b,b.incomes[0],day).forecast.amount,1000);
 b.incomes[0].estimateMode='manual';assert.equal(incomeForecastDecision(b,b.incomes[0],day).forecast.amount,800);
});
