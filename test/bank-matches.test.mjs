import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,change,summary,eventsFor} from '../server/model.mjs';
import {bankMatchCandidates,bankDebtOccurrences,autoConfirmPaychecks} from '../bank-matches.js';
import {activityTotals} from '../analysis.js';
import {applyPlaidProducts} from '../server/plaid-ledger.mjs';
const now='2026-09-18';
function book(){const b=fresh();b.accounts=[{id:'cash',name:'Checking',kind:'cash',openingBalance:2000,balanceDate:'2026-01-01',verified:true},{id:'saving',name:'Savings',kind:'cash',openingBalance:1000,balanceDate:'2026-01-01',verified:true},{id:'card',name:'Credit',kind:'credit',openingBalance:500,balanceDate:'2026-01-01',verified:true,payment:100,dueDate:'2026-09-18',frequency:'Monthly'}];return b;}
const tx=(id,accountId,direction,amount,category,name='Bank entry')=>({id,plaidTransactionId:id,plaidItemId:'bank',accountId,direction,amount,category,name,date:'2026-09-17',historical:true});
test('paycheck match advances schedule once, reports variance and adds no cash',()=>{let b=book();b.incomes=[{id:'work',name:'Employer',date:now,frequency:'Biweekly',amount:1000,verified:true}];b.transactions=[tx('pay','cash','Inflow',1100,'Income','Employer')];const [m]=bankMatchCandidates(b,now),before=summary(b,now).cash.balance;b=change(b,'bankMatch',{key:m.key,mode:'confirm'},now);assert.equal(b.incomes[0].date,'2026-10-02');assert.equal(b.transactions[0].incomeExpectation.amount,1000);assert.equal(summary(b,now).cash.balance,before);assert.equal(b.transactions.length,1);assert.throws(()=>change(b,'bankMatch',{key:m.key,mode:'confirm'},now));b=change(b,'bankMatch',{id:m.key,mode:'unlink'},now);assert.equal(b.incomes[0].date,now);assert.equal(b.transactions[0].incomeExpectation,undefined);assert.equal(summary(b,now).cash.balance,before);});
test('matching bill completes only the selected occurrence and can be unlinked',()=>{let b=book();b.bills=[{id:'internet',name:'Internet',amount:50,date:now,frequency:'Monthly'}];b.transactions=[tx('charge','cash','Outflow',50,'Utilities','Internet')];const [m]=bankMatchCandidates(b,now);b=change(b,'bankMatch',{key:m.key,mode:'confirm'},now);assert.equal(eventsFor(b,now,now,now).some(e=>e.id==='internet'),false);assert.ok(eventsFor(b,'2026-10-18','2026-10-18',now).some(e=>e.id==='internet'));assert.equal(summary(b,now).cash.balance,3000);assert.throws(()=>change(b,'remove',{list:'transactions',id:'charge'},now),/Unlink/);b=change(b,'bankMatch',{id:m.key,mode:'unlink'},now);assert.ok(eventsFor(b,now,now,now).some(e=>e.id==='internet'));});
test('transfer pair excluded from income and spending while balances remain fixed',()=>{let b=book();b.transactions=[tx('out','cash','Outflow',200,'Transfer'),tx('in','saving','Inflow',200,'Income')];const [m]=bankMatchCandidates(b,now);assert.equal(m.kind,'transfer');b=change(b,'bankMatch',{key:m.key,mode:'confirm'},now);const t=activityTotals(b,summary(b,now),'2026-09-01',now);assert.equal(t.income,0);assert.equal(t.spending,0);assert.equal(t.net,0);assert.equal(summary(b,now).cash.balance,3000);});
test('card payment counted once with no second principal reduction, optional scheduled completion',()=>{let b=book();b.transactions=[tx('out','cash','Outflow',100,'Debt payment'),tx('in','card','Inflow',100,'Transfer')];const [m]=bankMatchCandidates(b,now);assert.equal(m.kind,'debtTransfer');const [due]=bankDebtOccurrences(b,m);b=change(b,'bankMatch',{key:m.key,mode:'confirm',occurrenceKey:due.key},now);assert.equal(summary(b,now).accounts.find(a=>a.id==='card').balance,500);assert.equal(activityTotals(b,summary(b,now),'2026-09-01',now).payments,100);assert.equal(b.payments.length,0);assert.equal(eventsFor(b,now,now,now).length,0);b=change(b,'bankMatch',{id:m.key,mode:'unlink'},now);assert.equal(eventsFor(b,now,now,now).length,1);});
test('ambiguous matches require selection; each bank record used once',()=>{let b=book();b.bills=[{id:'a',name:'A',date:now,amount:50,frequency:'Monthly'},{id:'b',name:'B',date:now,amount:50,frequency:'Monthly'}];b.transactions=[tx('t','cash','Outflow',50,'Other')];const choices=bankMatchCandidates(b,now);assert.equal(choices.length,2);b=change(b,'bankMatch',{key:choices[0].key,mode:'confirm'},now);assert.equal(bankMatchCandidates(b,now).length,0);assert.throws(()=>change(b,'bankMatch',{key:choices[1].key,mode:'confirm'},now));});
test('denying a bank transaction hides all its match suggestions after reload',()=>{let b=book();b.bills=[{id:'a',name:'A',date:now,amount:50,frequency:'Monthly'},{id:'b',name:'B',date:now,amount:50,frequency:'Monthly'}];b.transactions=[tx('t','cash','Outflow',50,'Other')];const choices=bankMatchCandidates(b,now);assert.equal(choices.length,2);b=change(b,'bankMatch',{key:choices[0].key,mode:'dismiss'},now);b=JSON.parse(JSON.stringify(b));assert.equal(bankMatchCandidates(b,now).length,0);assert.throws(()=>change(b,'bankMatch',{mode:'restoreDismissed'},now),/cannot be restored/);});
test('refresh preserves links; bank removal is visible and excluded from reports',()=>{let b=book();b.accounts[0].plaid={accountId:'plaidCash'};b.bills=[{id:'a',name:'Internet',date:now,amount:50,frequency:'Monthly'}];b.transactions=[tx('t','cash','Outflow',50,'Utilities','Internet')];const [m]=bankMatchCandidates(b,now);b=change(b,'bankMatch',{key:m.key,mode:'confirm'},now);const raw={transaction_id:'t',account_id:'plaidCash',date:'2026-09-17',amount:50,name:'Internet',iso_currency_code:'USD'};applyPlaidProducts(b,[{id:'bank',transactions:[raw]}],[],now);assert.equal(b.transactions[0].bankMatchId,m.key);const notes=[];applyPlaidProducts(b,[{id:'bank',transactions:[]}],notes,now);assert.equal(b.transactions[0].bankRemoved,true);assert.equal(b.bankMatches[0].needsReview,true);assert.equal(activityTotals(b,summary(b,now),'2026-09-01',now).spending,0);assert.ok(notes.length);});
test('manual received and paid cannot add a second copy when matching imported record exists',()=>{const b=book();b.incomes=[{id:'i',name:'Work',date:now,frequency:'Biweekly',amount:100,verified:true}];b.bills=[{id:'b',name:'Internet',date:now,frequency:'Monthly',amount:50}];b.transactions=[tx('in','cash','Inflow',100,'Income','Work'),tx('out','cash','Outflow',50,'Utilities','Internet')];// Received now links the imported deposit instead of refusing, so no second copy is created.
 {const linked=change(b,'receiveIncome',{addToBalance:true,id:'i',accountId:'cash',date:now,amount:100},now);
  assert.equal(linked.transactions.filter(t=>t.direction==='Inflow').length,1,'no duplicate deposit');
  assert.ok(linked.transactions.find(t=>t.id==='in').incomeExpectation,'the imported deposit covers the payday');
  assert.notEqual(linked.incomes[0].date,now,'the payday advances');}
 assert.throws(()=>change(b,'occurrence',{key:'b@'+now,date:now,status:'Paid',accountId:'cash'},now),/already imported/);});

test('an employer deposit from the bank clears the expected paycheck by itself',()=>{
 const b=book();
 b.accounts=[{id:'chk',name:'SCU Checking',kind:'cash',active:true,openingBalance:500,balanceDate:'2026-01-01'}];
 b.incomes=[{id:'i',name:'Alamo Drafthouse',amount:1500,date:'2026-09-18',frequency:'Biweekly',active:true,verified:true}];
 b.transactions=[{id:'dep',date:'2026-09-18',name:'ALAMO DRAFTHOUSE PAYROLL',amount:1487.22,direction:'Inflow',category:'Income',accountId:'chk',plaidTransactionId:'p1',historical:true}];
 const cleared=autoConfirmPaychecks(b,'2026-09-22');
 assert.equal(cleared,1);
 assert.equal(b.incomes[0].date,'2026-10-02','the schedule moved to the next payday');
 assert.equal(b.transactions[0].incomeExpectation.date,'2026-09-18','the deposit is linked to the payday it covers');
 assert.equal(bankMatchCandidates(b,'2026-09-22').filter(c=>c.kind==='income').length,0,'nothing is left to review');
 // A deposit that does not name the employer still waits for you.
 const other=book();
 other.accounts=b.accounts;other.incomes=[{...b.incomes[0],date:'2026-09-18'}];
 other.transactions=[{id:'d2',date:'2026-09-18',name:'MOBILE DEPOSIT',amount:1500,direction:'Inflow',category:'Income',accountId:'chk',plaidTransactionId:'p2',historical:true}];
 assert.equal(autoConfirmPaychecks(other,'2026-09-22'),0);
 assert.equal(bankMatchCandidates(other,'2026-09-22').filter(c=>c.kind==='income').length,1,'it is offered for review instead');
});
test('a current deposit matches a recurring payday even when the schedule anchor is older',()=>{
 const b=book();b.incomes=[{id:'work',name:'Employer',historyName:'Employer',date:'2026-08-21',frequency:'Biweekly',amount:1000,verified:true,active:true}];b.transactions=[tx('pay','cash','Inflow',990,'Income','Employer')];
 const candidates=bankMatchCandidates(b,now).filter(c=>c.kind==='income');assert.equal(candidates.length,1);assert.equal(candidates[0].date,'2026-09-18');
 assert.equal(autoConfirmPaychecks(b,now),1);assert.equal(b.incomes[0].date,'2026-10-02');assert.equal(b.transactions[0].incomeExpectation.date,'2026-09-18');
});
test('ambiguous employer deposits wait for review instead of advancing an arbitrary schedule',()=>{
 const b=book();b.incomes=[{id:'first',name:'Employer',date:now,frequency:'Biweekly',amount:1000,verified:true,active:true},{id:'second',name:'Employer',date:now,frequency:'Monthly',amount:1000,verified:true,active:true}];b.transactions=[tx('pay','cash','Inflow',1000,'Income','Employer')];
 assert.equal(bankMatchCandidates(b,now).filter(c=>c.kind==='income').length,2);assert.equal(autoConfirmPaychecks(b,now),0);assert.equal(b.bankMatches?.length||0,0);
});
test('paycheck history imported newest first advances every occurrence in date order',()=>{
 const b=book();b.incomes=[{id:'work',name:'Employer',date:'2026-08-21',frequency:'Biweekly',amount:1000,verified:true,active:true}];
 b.transactions=['2026-09-18','2026-09-04','2026-08-21'].map((date,i)=>({...tx('pay'+i,'cash','Inflow',1000,'Income','Employer'),date}));
 assert.equal(autoConfirmPaychecks(b,now),3);assert.equal(b.incomes[0].date,'2026-10-02');assert.deepEqual(b.transactions.map(t=>t.incomeExpectation.date),['2026-09-18','2026-09-04','2026-08-21']);
});
test('an unusually small employer-named credit waits for review',()=>{
 const b=book();b.incomes=[{id:'work',name:'Employer',date:now,frequency:'Biweekly',amount:1000,verified:true,active:true}];b.transactions=[tx('refund','cash','Inflow',20,'Income','Employer')];
 assert.equal(bankMatchCandidates(b,now).filter(c=>c.kind==='income').length,1);assert.equal(autoConfirmPaychecks(b,now),0);assert.equal(b.incomes[0].date,now);
});
