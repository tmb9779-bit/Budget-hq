import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,change,summary,eventsFor} from '../server/model.mjs';
import {boostAllocation,defaultAllocations} from '../priority-allocation.js';
import {unmatchedScheduledBills} from '../bill-review.js';
import {autoConfirmBills} from '../bank-matches.js';
const asOf='2026-09-25';
function book(){let b=fresh();b=change(b,'account',{name:'Checking',kind:'cash',openingBalance:2000,balanceDate:'2026-09-01'},asOf);return b;}

test('priority selection changes the saved paycheck split without moving or reserving cash',()=>{
 let b=book();b=change(b,'account',{name:'Card',kind:'credit',openingBalance:900,balanceDate:'2026-09-01',limit:1000,payment:50,dueDate:'2026-10-01'},asOf);
 b=change(b,'goal',{name:'Half utilization',goalType:'debt',debtId:b.accounts[1].id,targetBalance:500,cost:0,saved:0,style:'Pause'},asOf);
 const before=summary(b,asOf);b=change(b,'goalFocus',{list:'goals',id:b.goals[0].id,mode:'automatic'},asOf);
 assert.deepEqual(b.settings.allocations,boostAllocation(defaultAllocations,'debt'));assert.equal(b.settings.allocations.debt,50);assert.equal(b.settings.priorityDebt,b.accounts[1].id);
 assert.equal(summary(b,asOf).cash.balance,before.cash.balance);assert.equal(summary(b,asOf).protectedSavings,before.protectedSavings);
 b=change(b,'wish',{name:'Art supplies',cost:100,saved:0},asOf);
 b=change(b,'goalFocus',{list:'wishes',id:b.wishes[0].id,mode:'automatic'},asOf);
 assert.deepEqual(b.settings.allocations,boostAllocation(defaultAllocations,'wishes'),'switching targets must not stack a second boost');
 b=change(b,'goalFocus',{list:'goals',id:b.goals[0].id,mode:'custom',debt:40,sinking:10,goals:15,wishes:20,flex:15},asOf);
 assert.equal(b.settings.allocations.debt,40);assert.equal(b.settings.allocationMode,'custom');
 assert.throws(()=>change(b,'goalFocus',{list:'goals',id:b.goals[0].id,mode:'custom',debt:40,sinking:10,goals:15,wishes:20,flex:10},asOf),/total 100/);
});

test('unmatched scheduled bill waits three days and respects posted, pending, skip and snooze',()=>{
 let b=book();b=change(b,'bill',{name:'Internet',amount:60,date:'2026-09-20',frequency:'Monthly',category:'Utilities'},asOf);
 const key=b.bills[0].id+'@2026-09-20';assert.equal(unmatchedScheduledBills(b,'2026-09-22').length,0);
 assert.equal(unmatchedScheduledBills(b,asOf)[0].key,key);
 b.plaidPending=[{name:'Internet',date:'2026-09-20',amount:61,direction:'Outflow'}];assert.equal(unmatchedScheduledBills(b,asOf).length,0);
 b.plaidPending=[];b.transactions.push({id:'tx',name:'Internet',date:'2026-09-20',amount:60,direction:'Outflow',accountId:b.accounts[0].id,plaidTransactionId:'bank',historical:true});assert.equal(unmatchedScheduledBills(b,asOf).length,0);
 b.transactions=[];b=change(b,'billReviewSnooze',{key},asOf);assert.equal(unmatchedScheduledBills(b,asOf).length,0);
 assert.equal(unmatchedScheduledBills(b,'2026-09-26').length,1);
 b.overrides[key]={status:'Skipped'};assert.equal(unmatchedScheduledBills(b,'2026-09-26').length,0);
});

test('confident imported bill charge clears one schedule without another cash deduction',()=>{
 let b=book();b=change(b,'bill',{name:'Internet',amount:60,date:'2026-09-20',frequency:'Monthly',category:'Utilities'},asOf);
 b.transactions.push({id:'tx',name:'INTERNET PAYMENT',date:'2026-09-20',amount:60,direction:'Outflow',accountId:b.accounts[0].id,plaidTransactionId:'bank-1',historical:true,category:'Utilities'});
 const before=summary(b,asOf).cash.balance;assert.equal(autoConfirmBills(b,asOf),1);assert.equal(summary(b,asOf).cash.balance,before);
 assert.equal(b.overrides[b.bills[0].id+'@2026-09-20'].status,'Paid');assert.equal(autoConfirmBills(b,asOf),0);
 assert.equal(b.transactions.length,1);assert.equal(b.bankMatches.length,1);
});
test('one bank charge never automatically chooses between two similar bills',()=>{
 let b=book();for(let i=0;i<2;i++)b=change(b,'bill',{name:'Internet',amount:60,date:'2026-09-20',frequency:'Monthly',category:'Utilities'},asOf);
 b.transactions.push({id:'tx',name:'INTERNET',date:'2026-09-20',amount:60,direction:'Outflow',accountId:b.accounts[0].id,plaidTransactionId:'bank-2',historical:true,category:'Utilities'});
 assert.equal(autoConfirmBills(b,asOf),0);assert.equal(b.bankMatches?.length||0,0);assert.equal(Object.keys(b.overrides).length,0);
});

test('chosen debt icon survives edit and does not change scheduled amounts',()=>{
 let b=book();b=change(b,'account',{name:'Student Loan',kind:'loan',icon:'education',openingBalance:1000,balanceDate:'2026-09-01',payment:50,dueDate:asOf},asOf);
 const a=b.accounts[1];assert.equal(a.icon,'education');const before=eventsFor(b,asOf,asOf,asOf)[0].amount;
 b=change(b,'editAccount',{...a,id:a.id,currentBalance:1000,icon:'student'},asOf);assert.equal(b.accounts[1].icon,'student');assert.equal(eventsFor(b,asOf,asOf,asOf)[0].amount,before);
 assert.throws(()=>change(b,'account',{...a,id:a.id,icon:'<script>'},asOf),/Choose one/);
});

test('calendar monthly scheduled total counts each weekly and paid occurrence once',async()=>{
 const {calendarView}=await import('../server/calendar-view.mjs');let b=book();
 b=change(b,'bill',{name:'Groceries',amount:40,date:'2026-09-04',frequency:'Weekly',category:'Groceries'},asOf);
 b=change(b,'bill',{name:'Rent',amount:500,date:'2026-09-01',frequency:'Monthly',category:'Housing'},asOf);
 b.overrides[b.bills[0].id+'@2026-09-11']={status:'Paid'};
 const view=calendarView(b,'2026-09-01','2026-09-30',asOf);
 const total=view.predictedEvents.reduce((sum,e)=>sum+e.amount,0);
 assert.equal(total,660);assert.equal(view.predictedEvents.filter(e=>e.name==='Groceries').length,4);
});
