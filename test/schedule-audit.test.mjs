import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,change,summary,eventsFor,incomeEvents} from '../server/model.mjs';
import {applyPlaidAccounts} from '../server/plaid-accounts.mjs';
const day='2026-09-19';
function fixture(){let b=fresh();b=change(b,'account',{name:'Checking',kind:'cash',openingBalance:2000,balanceDate:day},day);b=change(b,'account',{name:'Card',kind:'credit',openingBalance:500,balanceDate:day,payment:100,dueDate:'2026-09-21',frequency:'Monthly'},day);return b;}
test('next paycheck is earliest across sources and paid occurrences are omitted',()=>{
 let b=fixture();for(const [name,date]of [['Later Job','2026-09-30'],['Sooner Job','2026-09-21']])b=change(b,'income',{name,date,amount:100,frequency:'Weekly'},day);
 assert.equal(summary(b,day).nextPaychecks[0].name,'Sooner Job');b.overrides[b.incomes[1].id+'@2026-09-21']={status:'Paid'};assert.equal(incomeEvents(b,day,'2026-10-31',day)[0].date,'2026-09-28');
});
test('recurring bills and debt share forecast/calendar; paid debt estimate does not reconstruct balances',()=>{
 let b=fixture();b=change(b,'bill',{name:'Internet',amount:60,date:'2026-08-22',frequency:'Monthly',category:'Utilities'},day);b.settings.planningConfirmed=true;
 const s=summary(b,day),events=eventsFor(b,day,'2026-10-31',day);assert.equal(events.filter(e=>e.name==='Internet').length,2);assert.equal(events.filter(e=>e.name==='Card').length,2);assert.equal(s.plan.forecast.find(d=>d.date==='2026-09-21').reserve,100);assert.equal(s.plan.forecast.find(d=>d.date==='2026-09-22').scheduled,60);assert.equal(s.cash.safeToSpend,2000-b.settings.buffer-s.protectedBills.reduce((n,e)=>n+e.amount,0));
 b.accounts[1].dueDate=day;const key=b.accounts[1].id+'@'+day;b=change(b,'payment',{debtId:b.accounts[1].id,fundingId:b.accounts[0].id,date:day,amount:100,principal:100,occurrenceKey:key},day);
 const before=JSON.stringify(b);assert.equal(eventsFor(b,day,day,day).filter(e=>e.debtId).length,0);assert.equal(eventsFor(b,day,day,day,{includePaid:true})[0].amount,100);assert.equal(JSON.stringify(b),before);
});
test('pending bank activity with a future posting date is retained and included in fallback estimate',()=>{
 const item={id:'bank',name:'Bank',accounts:[{id:'cash',name:'Checking',type:'depository',current:1000,currency:'USD'}],transactions:[{transaction_id:'p',account_id:'cash',date:'2026-09-21',amount:50,pending:true,name:'Pending purchase',iso_currency_code:'USD'}]};
 const {book}=applyPlaidAccounts(fresh(),[item],day);assert.equal(book.plaidPending.length,1);assert.equal(summary(book,day).cash.balance,950);assert.equal(book.transactions.length,0);
});
