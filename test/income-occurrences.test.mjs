import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,change,summary,incomeEvents,eventsFor,addDays} from '../server/model.mjs';
import {normalizeRecovery} from '../server/recycle.mjs';
const day='2026-09-16';
function fixture(frequency='Weekly'){let b=fresh();b=change(b,'account',{name:'Cash',kind:'cash',openingBalance:2000,balanceDate:day},day);b=change(b,'income',{name:'Paycheck',amount:800,date:day,frequency},day);b=change(b,'settings',{buffer:400,planningConfirmed:true},day);return b;}
test('deleting a paycheck affects only that date in calendar and forecast, leaving cash and later paychecks intact',()=>{
 let b=fixture();const id=b.incomes[0].id,key=id+'@'+day,original=summary(b,day);b=change(b,'occurrence',{key,date:day,status:'Skipped'},day);let s=summary(b,day);
 assert.equal(s.cash.balance,original.cash.balance);assert.equal(s.cash.safeToSpend,original.cash.safeToSpend);assert.equal(s.plan.forecast[0].cash,original.plan.forecast[0].cash-800);assert.equal(s.nextPaychecks[0].date,addDays(day,7));assert.equal(b.incomes[0].date,day);assert.equal(b.overrides[key].inflow,true);assert.equal(b.overrides[key].expiresAt,addDays(day,30));assert.equal(incomeEvents(b,day,day,day).length,0);assert.throws(()=>change(b,'occurrence',{key,date:day,status:'Skipped'},day),/no longer active/);
 b=change(JSON.parse(JSON.stringify(b)),'restoreOccurrence',{key},day);assert.deepEqual(summary(b,day).plan.forecast,original.plan.forecast);assert.equal(b.overrides[key],undefined);
});
test('expired and permanently deleted paychecks stay removed and cannot be restored',()=>{
 for(const mode of ['expiry','purge']){let b=fixture();const key=b.incomes[0].id+'@'+addDays(day,35);b=change(b,'occurrence',{key,date:addDays(day,35),status:'Skipped'},day);b=mode==='purge'?change(b,'purgeOccurrence',{key},day):normalizeRecovery(b,addDays(day,30));assert.equal(incomeEvents(b,addDays(day,35),addDays(day,35),day).length,0);assert.throws(()=>change(b,'restoreOccurrence',{key},addDays(day,30)),/no longer available/);}
});
test('receiving income uses the next undeleted expectation and refuses a stale selected paycheck',()=>{
 let b=fixture(),id=b.incomes[0].id,key=id+'@'+day;const payload={id,date:day,accountId:b.accounts[0].id,amount:800};b=change(b,'occurrence',{key,date:day,status:'Skipped'},day);assert.throws(()=>change(b,'receiveIncome',{addToBalance:true,...payload,expectedDate:day},day),/earlier scheduled paycheck/);b=change(b,'receiveIncome',{addToBalance:true,...payload,expectedDate:addDays(day,7)},day);assert.equal(b.transactions[0].incomeExpectation.date,addDays(day,7));assert.equal(summary(b,day).cash.balance,2800);assert.equal(summary(b,day).nextPaychecks[0].date,addDays(day,14));assert.throws(()=>change(b,'restoreOccurrence',{key},day),/schedule has changed/);
});
test('a deleted one-time paycheck cannot be received until restored, and cannot be marked as an outflow',()=>{
 let b=fixture('One-time'),id=b.incomes[0].id,key=id+'@'+day;assert.throws(()=>change(b,'occurrence',{key,date:day,status:'Paid',accountId:b.accounts[0].id},day),/Use Received/);b=change(b,'occurrence',{key,date:day,status:'Skipped'},day);assert.throws(()=>change(b,'receiveIncome',{addToBalance:true,id,date:day,amount:800,accountId:b.accounts[0].id},day),/No active paycheck/);b=change(b,'restoreOccurrence',{key},day);assert.equal(incomeEvents(b,day,day,day).length,1);
});
test('deleting a debt occurrence retains the debt and next scheduled payment and restores correctly',()=>{
 let b=fixture();b=change(b,'account',{name:'Loan',kind:'loan',openingBalance:4000,balanceDate:day,payment:100,dueDate:day,frequency:'Monthly'},day);const id=b.accounts[1].id,key=id+'@'+day,initial=summary(b,day);b=change(b,'occurrence',{key,date:day,status:'Skipped'},day);assert.equal(summary(b,day).accounts[1].balance,4000);assert.equal(summary(b,day).cash.safeToSpend,initial.cash.safeToSpend+100);assert.equal(eventsFor(b,day,'2026-10-31',day).filter(e=>e.debtId===id).length,1);b=change(b,'restoreOccurrence',{key},day);assert.equal(summary(b,day).cash.safeToSpend,initial.cash.safeToSpend);
});
