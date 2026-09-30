import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,change,summary} from '../server/model.mjs';import {calendarView} from '../server/calendar-view.mjs';
import {applyPlaidAccounts} from '../server/plaid-accounts.mjs';
const day='2026-09-19';
test('calendar and forecast use equal day totals including overdue and partial debt payments',()=>{
 let b=fresh();b=change(b,'account',{name:'Cash',kind:'cash',openingBalance:2000,balanceDate:'2026-09-01'},day);b=change(b,'account',{name:'Card',kind:'credit',openingBalance:500,payment:100,dueDate:day,balanceDate:'2026-09-01',frequency:'Monthly'},day);
 b=change(b,'bill',{name:'Rent',amount:200,date:'2026-09-18',frequency:'Monthly'},day);b=change(b,'income',{name:'Job',amount:300,date:'2026-09-20',frequency:'Weekly'},day);b.settings.overdueMode='reserve';b.settings.overdueSince='2026-09-18';
 b=change(b,'payment',{debtId:b.accounts[1].id,fundingId:b.accounts[0].id,amount:30,principal:30,date:day,occurrenceKey:b.accounts[1].id+'@'+day},day);
 const s=summary(b,day),c=calendarView(b,'2026-09-01','2026-09-30',day,s);assert.deepEqual(c.forecast,s.plan.forecast);assert.equal(c.forecast[0].scheduled+c.forecast[0].reserve,270);
 for(const point of c.forecast){assert.equal(c.forecastEvents.filter(e=>(e.date<day?day:e.date)===point.date).reduce((n,e)=>n+e.amount,0),point.scheduled+point.reserve);assert.equal(c.forecastIncome.filter(e=>e.date===point.date).reduce((n,e)=>n+e.amount,0),point.income);}
 assert.equal(c.events.find(e=>e.debtId).amount,70);assert.equal(c.predictedEvents.find(e=>e.debtId).amount,100);
});
test('pending diagnostics distinguish no returned records, filtered records, and errors',()=>{
 const item={id:'scu',name:'Scott Credit Union',checkedAt:day,accounts:[{id:'cash',name:'Checking',type:'depository',current:100,currency:'USD'}],transactions:[]};
 let b=applyPlaidAccounts(fresh(),[item],day).book;assert.equal(b.pendingSyncDiagnostics.scu.received,0);
 const t={transaction_id:'p',account_id:'cash',amount:10,date:day,pending:true,name:'Pending',iso_currency_code:'USD'};
 b=applyPlaidAccounts(b,[{...item,transactions:[t,{...t,transaction_id:'q',iso_currency_code:'EUR'},{...t,transaction_id:'r',account_id:'unknown'}]}],day).book;
 assert.equal(b.pendingSyncDiagnostics.scu.received,3);assert.equal(b.pendingSyncDiagnostics.scu.imported,1);assert.equal(Object.values(b.pendingSyncDiagnostics.scu.withheld).reduce((a,n)=>a+n,0),2);
 b=applyPlaidAccounts(b,[{...item,transactionsError:'Test failure'}],day).book;assert.equal(b.pendingSyncDiagnostics.scu.status,'failed');assert.equal(b.pendingSyncDiagnostics.scu.received,null);assert.equal(b.plaidPending.length,1);
});

test('paid, skipped and overdue bill occurrences agree across Calendar, Plan and Safe to Spend',()=>{
 let b=fresh();b=change(b,'account',{name:'Cash',kind:'cash',openingBalance:1000,balanceDate:'2026-09-01'},day);const cash=b.accounts[0].id;
 b=change(b,'bill',{name:'Weekly bill',amount:50,date:'2026-09-12',frequency:'Weekly'},day);const id=b.bills[0].id;
 b.settings.overdueMode='reserve';b.settings.overdueSince='2026-09-12';
 let s=summary(b,day);assert.equal(s.overdue.length,1);assert.equal(s.protectedBills.length,s.weekBills.length);assert.equal(s.cash.safeToSpend,1000-s.cash.bufferTarget-s.protectedBills.reduce((n,e)=>n+e.amount,0));
 const past=id+'@2026-09-12',future=id+'@2026-09-26';
 b=change(b,'occurrence',{key:past,date:'2026-09-12',status:'Paid',accountId:cash},day);s=summary(b,day);assert.equal(s.cash.balance,950);assert.equal(s.overdue.length,0);assert.equal(s.protectedBills.length,s.weekBills.length);
 let c=calendarView(b,'2026-09-01','2026-09-30',day,s);assert.ok(c.predictedEvents.some(e=>e.key===past));assert.ok(!c.events.some(e=>e.key===past));assert.equal(c.forecast[0].scheduled,50);
 b=change(b,'occurrence',{key:future,date:'2026-09-26',status:'Skipped'},day);s=summary(b,day);c=calendarView(b,'2026-09-01','2026-09-30',day,s);assert.ok(!c.predictedEvents.some(e=>e.key===future));assert.ok(!s.upcoming.some(e=>e.key===future));assert.equal(c.forecast,s.plan.forecast);
 b=change(b,'restoreOccurrence',{key:future},day);s=summary(b,day);assert.ok(s.upcoming.some(e=>e.key===future));assert.equal(s.cash.balance,950);
});
