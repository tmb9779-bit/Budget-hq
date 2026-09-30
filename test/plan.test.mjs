import test from 'node:test';import assert from 'node:assert/strict';import {fresh,change,summary,addDays,balances} from '../server/model.mjs';import {buildPlan,forecastReconciliation} from '../plan-view.js';
const day='2026-09-15';
function seed(){let b=fresh();b=change(b,'account',{name:'Checking',kind:'cash',openingBalance:2000,balanceDate:addDays(day,-30)},day);b=change(b,'settings',{buffer:400,planningConfirmed:true},day);return b;}
test('payday grouping allocates each bill once without mutating cash or savings',()=>{let b=seed();for(const name of ['Main','Side'])b=change(b,'income',{name,amount:500,date:addDays(day,2),frequency:'Weekly'},day);for(let i=0;i<20;i++)b=change(b,'bill',{name:'Bill '+i,amount:10,date:addDays(day,i),frequency:'One-time'},day);b=change(b,'goal',{name:'Reserved',cost:1000,saved:200,style:'Pause'},day);const s=summary(b,day),before=JSON.stringify(b),p=buildPlan(b,s);assert.equal(p.periods[0].amount,1000);assert.equal(p.before.length,2);assert.equal(p.periods.reduce((n,p)=>n+p.bills.length,0)+p.before.length,20);assert.equal(new Set(p.periods.flatMap(p=>p.bills.map(b=>b.key))).size,18);assert.equal(p.periods[0].headroom,Math.min(...s.plan.forecast.filter(x=>x.date>=p.periods[0].date&&x.date<=p.periods[0].end).map(x=>x.cash))-400);assert.equal(JSON.stringify(b),before);});
test('skipping, removing, and restoring a bill update allocations and the shared forecast',()=>{let b=seed();b=change(b,'income',{name:'Pay',amount:100,date:day,frequency:'Weekly'},day);b=change(b,'bill',{name:'Bill',amount:500,date:addDays(day,1),frequency:'One-time'},day);const id=b.bills[0].id,key=id+'@'+addDays(day,1),before=summary(b,day);b=change(b,'occurrence',{key,date:addDays(day,1),status:'Skipped'},day);let s=summary(b,day);assert.equal(buildPlan(b,s).periods[0].committed,0);assert.equal(s.cash.safeToSpend,before.cash.safeToSpend+500);b=change(b,'restoreOccurrence',{key},day);b=change(b,'remove',{id,list:'bills'},day);assert.equal(buildPlan(b,summary(b,day)).periods[0].committed,0);b=change(b,'restoreBill',{id},day);s=summary(b,day);assert.equal(buildPlan(b,s).periods[0].committed,500);assert.equal(s.cash.minimumCash,before.cash.minimumCash);});
test('expected income is captured once and actual edits do not rewrite the expectation',()=>{let b=seed();b=change(b,'income',{name:'Pay',amount:800,date:day,frequency:'Biweekly'},day);const id=b.incomes[0].id;b=change(b,'receiveIncome',{addToBalance:true,id,date:day,accountId:b.accounts[0].id,amount:750},day);const tx=b.transactions[0];assert.equal(summary(b,day).cash.balance,2750);assert.equal(b.incomes[0].date,addDays(day,14));b=change(b,'income',{...b.incomes[0],amount:900},day);b=change(b,'transaction',{...tx,amount:760},day);const p=buildPlan(b,summary(b,day));assert.equal(p.receipts[0].expected,800);assert.equal(p.receipts[0].difference,-40);assert.equal(summary(b,day).cash.balance,2760);b=change(b,'remove',{list:'transactions',id:tx.id},day);assert.equal(summary(b,day).cash.balance,2000);assert.equal(b.incomes[0].date,day);assert.equal(buildPlan(b,summary(b,day)).receipts.length,0);});
test('early deposits advance from the scheduled payday and later receipts protect schedule reversal',()=>{let b=seed();b=change(b,'income',{name:'Pay',amount:800,date:addDays(day,2),frequency:'Biweekly'},day);const id=b.incomes[0].id;b=change(b,'receiveIncome',{addToBalance:true,id,date:day,accountId:b.accounts[0].id,amount:800},day);assert.equal(b.incomes[0].date,addDays(day,16));const first=b.transactions[0].id;b=change(b,'receiveIncome',{addToBalance:true,id,date:addDays(day,16),accountId:b.accounts[0].id,amount:800},addDays(day,16));assert.throws(()=>change(b,'remove',{list:'transactions',id:first},addDays(day,16)),/schedule has changed/);});
test('pressure points and next step stay behind confirmed data and needs sort by priority',()=>{let b=seed();for(const urgency of ['Low','High','Medium'])b=change(b,'need',{name:urgency,cost:50,urgency},day);b=change(b,'bill',{name:'Large bill',amount:1900,date:day,frequency:'One-time'},day);const p=buildPlan(b,summary(b,day));assert.ok(p.shortfalls.length);assert.deepEqual(p.needs.map(n=>n.urgency),['High','Medium','Low']);b.accounts[0].verified=false;const unready=buildPlan(b,summary(b,day));assert.equal(unready.next.action,'reviewAccounts');assert.equal(unready.shortfalls.length,0);});

test('clearing a paycheck leaves the balance alone; the bank deposit is what moves it',()=>{
 let b=seed();b=change(b,'income',{name:'Alamo Drafthouse',amount:1500,date:day,frequency:'Biweekly'},day);
 const income=b.incomes[0],account=b.accounts[0].id,before=balances(b,day).find(a=>a.id===account).balance;
 const cleared=change(b,'receiveIncome',{id:income.id,amount:1500,date:day,accountId:account},day);
 assert.equal(balances(cleared,day).find(a=>a.id===account).balance,before,'balance is unchanged');
 assert.equal(cleared.transactions.filter(t=>t.direction==='Inflow').length,b.transactions.filter(t=>t.direction==='Inflow').length,'no deposit is invented');
 assert.equal(cleared.incomes[0].date,addDays(day,14),'the schedule moves to the next payday');
 assert.ok(!summary(cleared,day).nextPaychecks.some(p=>p.date===day),'the cleared paycheck is gone from upcoming');
 // Cash or a cheque the bank will never show can still be added on purpose.
 const recorded=change(b,'receiveIncome',{addToBalance:true,id:income.id,amount:1500,date:day,accountId:account},day);
 assert.equal(balances(recorded,day).find(a=>a.id===account).balance,before+1500);
});

test('Received clears the payday even when the bank deposit is already imported',()=>{
 let b=seed();b=change(b,'income',{name:'Alamo Drafthouse',amount:1500,date:day,frequency:'Biweekly'},day);
 const account=b.accounts[0].id,income=b.incomes[0];
 b.transactions.push({id:'dep',date:day,name:'ALAMO DRAFTHOUSE PAYROLL',amount:1487.22,direction:'Inflow',category:'Income',accountId:account,plaidTransactionId:'p1',historical:true});
 assert.equal(summary(b,day).nextPaychecks[0].date,day,'the payday is showing before');
 const after=change(b,'receiveIncome',{id:income.id,amount:1487.22,date:day,accountId:account},day);
 assert.equal(after.incomes[0].date,addDays(day,14),'Next Payday moves on');
 assert.equal(summary(after,day).nextPaychecks[0].date,addDays(day,14),'the cleared payday is gone from upcoming');
 assert.ok(after.transactions.find(t=>t.id==='dep').incomeExpectation,'the imported deposit is linked to that payday');
 assert.equal(after.transactions.filter(t=>t.direction==='Inflow').length,1,'no second deposit is created');
 assert.equal(balances(after,day).find(a=>a.id===account).balance,balances(b,day).find(a=>a.id===account).balance,'the balance is left to the bank');
});

test('60-day Plan reconciliation uses the same income, bills, debt and reserved cash as the daily forecast',()=>{
 let b=seed();b=change(b,'goal',{name:'Emergency',cost:500,saved:125,style:'Pause'},day);
 b=change(b,'incomeProfile',{name:'Work',amount:800,date:addDays(day,1),frequency:'Monthly',estimateMode:'conservative'},day);
 b=change(b,'bill',{name:'Rent',amount:300,date:addDays(day,2),frequency:'One-time'},day);
 b=change(b,'account',{name:'Card',kind:'credit',openingBalance:500,balanceDate:day,payment:50,dueDate:addDays(day,3),frequency:'Monthly'},day);
 const before=JSON.stringify(b),s=summary(b,day),r=forecastReconciliation(s);
 assert.equal(r.opening,1875);assert.equal(r.income,s.nextPaychecks.reduce((n,e)=>n+e.amount,0));
 assert.equal(r.bills,300);assert.equal(r.debt,100);assert.equal(r.ending,s.plan.forecast.at(-1).cash);assert.equal(r.balanced,true);
 assert.equal(JSON.stringify(b),before);
 b.settings.forecastIncome='cautious';const cautious=forecastReconciliation(summary(b,day));assert.equal(cautious.income,r.income);assert.equal(cautious.balanced,true);
});

test('Safe to Spend protects the next seven days and Plan reconciliation stays balanced',()=>{
 let b=seed();b=change(b,'goal',{name:'Reserved',cost:500,saved:100,style:'Pause'},day);
 b=change(b,'incomeProfile',{name:'Pay',amount:800,date:addDays(day,10),frequency:'Monthly',estimateMode:'conservative'},day);
 b=change(b,'bill',{name:'This week',amount:60,date:addDays(day,2),frequency:'One-time'},day);
 b=change(b,'bill',{name:'Before pay',amount:140,date:addDays(day,8),frequency:'One-time'},day);
 let s=summary(b,day);assert.equal(s.protectedBills.length,1);assert.equal(s.cash.safeToSpend,1440);assert.equal(forecastReconciliation(s).balanced,true);
 b.settings.billProtection='payday';s=summary(b,day);assert.equal(s.protectedBills.length,1);assert.equal(s.cash.safeToSpend,1440);assert.equal(forecastReconciliation(s).balanced,true);
 b.settings.forecastIncome='cautious';s=summary(b,day);assert.ok(s.nextPaychecks.length);assert.equal(s.protectionEnd,addDays(day,6));assert.equal(s.cash.safeToSpend,1440);
});
