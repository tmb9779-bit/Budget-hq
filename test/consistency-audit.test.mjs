import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,change,summary,eventsFor} from '../server/model.mjs';
import {activityTotals,monthlyReport,allocatePaycheck,incomeEstimate} from '../analysis.js';
import {buildPlan} from '../plan-view.js';
const day='2026-09-30';
test('fictional month reconciles income, skipped and paid bills, matching, savings, corrections and removal',()=>{
 let b=fresh();const put=(action,data)=>b=change(b,action,data,day);
 put('account',{name:'Checking',kind:'cash',openingBalance:3000,balanceDate:'2026-09-01'});const cash=b.accounts[0].id;
 put('account',{name:'Savings',kind:'cash',openingBalance:0,balanceDate:'2026-09-01'});const savings=b.accounts[1].id;
 put('account',{name:'Card',kind:'credit',openingBalance:500,balanceDate:'2026-09-01',payment:50,dueDate:'2026-10-02',frequency:'Monthly',apr:20});const debt=b.accounts[2].id;
 put('settings',{buffer:400,planningConfirmed:true});
 const check=(expectedCash,expectedDebt,reserved)=>{const s=summary(b,day);assert.equal(s.cash.balance,expectedCash);assert.equal(s.accounts.find(a=>a.id===debt).balance,expectedDebt);assert.equal(s.protectedSavings,reserved);assert.equal(s.cash.safeToSpend,expectedCash-reserved-400-s.protectedBills.reduce((n,e)=>n+e.amount,0));assert.deepEqual(s.upcoming,eventsFor(b,day,s.plan.forecast.at(-1).date,day));let projected=expectedCash-reserved;for(const p of s.plan.forecast){projected=Math.round((projected+p.income-p.scheduled-p.reserve)*100)/100;assert.equal(p.cash,projected);}};
 put('goal',{name:'Emergency',cost:1000,saved:200,style:'Pause'});put('wish',{name:'Bookcase',cost:120,saved:50,style:'Pause'});check(3000,500,250);
 put('income',{name:'Work',amount:1000,date:'2026-09-01',frequency:'Monthly'});put('receiveIncome',{addToBalance:true,id:b.incomes[0].id,amount:1000,date:'2026-09-01',accountId:cash});check(4000,500,250);
 put('bill',{name:'Optional',amount:200,date:'2026-09-03',frequency:'Monthly'});put('occurrence',{key:b.bills[0].id+'@2026-09-03',date:'2026-09-03',status:'Skipped'});check(4000,500,250);
 put('bill',{name:'Internet',amount:80,date:'2026-09-05',frequency:'Monthly'});put('occurrence',{key:b.bills[1].id+'@2026-09-05',date:'2026-09-05',status:'Paid',accountId:cash});check(3920,500,250);
 put('transaction',{name:'Card payment',amount:100,date:'2026-09-10',direction:'Outflow',category:'Other',accountId:cash});const transactionId=b.transactions.at(-1).id;check(3820,500,250);
 put('payment',{debtId:debt,amount:100,principal:90,date:'2026-09-10',fundingId:cash,transactionId});check(3820,410,250);
 put('completeTarget',{id:b.wishes[0].id,list:'wishes',mode:'purchased',date:'2026-09-12',accountId:cash});check(3700,410,200);
 put('transaction',{name:'Move cash',amount:100,date:'2026-09-15',direction:'Outflow',accountId:cash,toAccountId:savings});check(3700,410,200);
 put('reconcile',{id:cash,balance:3625});check(3725,410,200);
 put('payment',{debtId:debt,amount:50,principal:50,date:day,fundingId:cash});check(3675,360,200);
 put('remove',{list:'payments',id:b.payments.at(-1).id});check(3725,410,200);
 const s=summary(b,day),r=monthlyReport(b,s,'2026-09'),totals=activityTotals(b,s,'2026-09-01',day);assert.equal(r.income,1000);assert.equal(r.spending,200);assert.equal(r.payments,100);assert.equal(r.net,700);assert.deepEqual({...r,month:undefined},{...totals,month:undefined});
 const before=JSON.stringify(b),a=allocatePaycheck(b,s);assert.equal(Math.round((Math.min(a.required,a.amount)+a.buffer+Object.values(a.parts).reduce((n,v)=>n+v,0))*100),Math.round(a.amount*100));assert.equal(JSON.stringify(b),before);const reloaded=JSON.parse(JSON.stringify(b));assert.deepEqual(summary(reloaded,day),s);
});
test('paid-off debts disappear consistently and new borrowing on a zero starting balance is scheduled',()=>{
 let b=fresh();b=change(b,'account',{name:'Card',kind:'credit',openingBalance:100,balanceDate:day,payment:20,dueDate:'2026-10-05',frequency:'Monthly'},day);b=change(b,'payment',{debtId:b.accounts[0].id,amount:100,principal:100,date:day},day);assert.equal(eventsFor(b,'2026-10-01','2026-10-31',day).length,0);assert.equal(summary(b,day).upcoming.length,0);
 let n=fresh();n=change(n,'account',{name:'New card',kind:'credit',openingBalance:0,balanceDate:day,payment:20,dueDate:'2026-10-05',frequency:'Monthly'},day);n=change(n,'transaction',{name:'Purchase',amount:100,date:day,accountId:n.accounts[0].id,direction:'Outflow',category:'Shopping'},day);assert.equal(eventsFor(n,'2026-10-01','2026-10-31',day).length,1);assert.equal(summary(n,day).upcoming.length,2);
});
test('a credit refund labeled Income does not inflate cash income or paycheck history',()=>{
 let b=fresh();b=change(b,'account',{name:'Checking',kind:'cash',openingBalance:1000,balanceDate:day},day);b=change(b,'account',{name:'Card',kind:'credit',openingBalance:500,balanceDate:day},day);b=change(b,'income',{name:'Work',amount:800,date:day,frequency:'Monthly'},day);
 const cash=b.accounts[0].id,card=b.accounts[1].id;
 b=change(b,'transaction',{name:'Work',amount:200,date:day,direction:'Inflow',category:'Income',accountId:card},day);
 let s=summary(b,day),report=monthlyReport(b,s,'2026-09');assert.equal(s.cash.balance,1000);assert.equal(report.income,0);assert.equal(report.net,0);assert.equal(incomeEstimate(b,b.incomes[0],day).count,0);
 b=change(b,'transaction',{name:'Work',amount:800,date:day,direction:'Inflow',category:'Income',accountId:cash},day);
 s=summary(b,day);report=monthlyReport(b,s,'2026-09');assert.equal(s.cash.balance,1800);assert.equal(report.income,800);assert.equal(report.net,800);assert.equal(incomeEstimate(b,b.incomes[0],day).count,1);
 b.accounts[0].active=false;assert.equal(monthlyReport(b,summary(b,day),'2026-09').income,800);
});
test('Plan prompts for a paycheck only when the shared forecast schedules one today',()=>{
 let b=fresh();b=change(b,'account',{name:'Checking',kind:'cash',openingBalance:1000,balanceDate:day},day);b=change(b,'settings',{buffer:0,planningConfirmed:true},day);b=change(b,'incomeProfile',{name:'Work',amount:800,date:day,frequency:'Monthly',estimateMode:'conservative'},day);
 assert.equal(buildPlan(b,summary(b,day)).next.action,'receive');
 b.settings.forecastIncome='cautious';assert.ok(summary(b,day).nextPaychecks.length);assert.equal(buildPlan(b,summary(b,day)).next.action,'receive');
 b.settings.forecastIncome='expected';b.incomes[0].date='2026-09-01';assert.equal(summary(b,day).nextPaychecks[0].date,'2026-10-01');assert.notEqual(buildPlan(b,summary(b,day)).next.action,'receive');
});

test('Reports exclude card refunds from cash Income rows and retain payment-only months in Annual Review',async()=>{
 const {reportData}=await import('../tools-data.js');const {analyzeBudget}=await import('../analysis.js');
 let b=fresh();b=change(b,'account',{name:'Checking',kind:'cash',openingBalance:1000,balanceDate:'2026-06-01'},day);
 b=change(b,'account',{name:'Card',kind:'credit',openingBalance:500,balanceDate:'2026-06-01'},day);
 const cash=b.accounts[0].id,card=b.accounts[1].id;
 b=change(b,'transaction',{name:'Card refund',amount:50,date:'2026-08-10',direction:'Inflow',category:'Income',accountId:card},day);
 b=change(b,'transaction',{name:'Paycheck',amount:200,date:'2026-08-15',direction:'Inflow',category:'Income',accountId:cash},day);
 let s=summary(b,day),r=reportData(b,s,'2026-08');assert.equal(r.income,200);assert.equal(r.incomeRows.length,1);assert.equal(r.incomeRows[0].name,'Paycheck');assert.equal(r.incomeRows.reduce((n,t)=>n+t.amount,0),r.income);
 b=change(b,'payment',{debtId:card,amount:40,principal:35,date:'2026-07-20',fundingId:cash},day);
 s=summary(b,day);r=reportData(b,s,'2026-07');assert.equal(r.income,0);assert.equal(r.spending,0);assert.equal(r.payments,40);assert.equal(r.net,-40);
 const archive=analyzeBudget(b,s).reports;assert.ok(archive.some(m=>m.month==='2026-07'&&m.payments===40&&m.net===-40));
});
