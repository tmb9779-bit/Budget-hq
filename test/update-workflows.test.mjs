import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,change,summary} from '../server/model.mjs';
import {needMatchCandidates} from '../need-matches.js';
import {autoConfirmBills} from '../bank-matches.js';
import {recurringBillSuggestions} from '../analysis.js';
import {debtIconNames} from '../icon-catalog.js';
const day='2026-09-25';
function base(){let book=fresh();book=change(book,'account',{name:'Checking',kind:'cash',openingBalance:1000,balanceDate:'2026-01-01'},day);return book;}
test('scheduled Need asks to match an existing purchase and clears it without a second deduction',()=>{
 let book=base();book=change(book,'need',{name:'Phone Repair',cost:105,urgency:'High',mode:'schedule',date:day},day);
 const bill=book.bills.at(-1),account=book.accounts[0];assert.ok(bill.needId);
 book=change(book,'transaction',{name:'Phone Shop',amount:103,date:day,direction:'Outflow',accountId:account.id,category:'Services'},day);
 const before=summary(book,day).cash.balance,match=needMatchCandidates(book,day)[0];assert.ok(match);
 book=change(book,'needMatch',{key:match.key,mode:'confirm'},day);
 assert.equal(summary(book,day).cash.balance,before);
 assert.equal(book.overrides[bill.id+'@'+bill.date].status,'Paid');assert.equal(book.transactions.at(-1).occurrenceKey,bill.id+'@'+bill.date);
 assert.equal(needMatchCandidates(book,day).length,0);
});
test('a posted bank purchase for a Need waits for confirmation instead of clearing automatically',()=>{
 let book=base();book=change(book,'need',{name:'Phone Repair',cost:105,urgency:'High',mode:'schedule',date:day},day);
 book.transactions.push({id:'bank',name:'Phone Repair',date:day,amount:105,direction:'Outflow',accountId:book.accounts[0].id,category:'Services',historical:true,plaidTransactionId:'external'});
 assert.equal(autoConfirmBills(book,day),0);assert.equal(needMatchCandidates(book,day).length,1);
});
test('all advertised debt icons including phone are accepted and saved',()=>{
 let book=base();assert.ok(debtIconNames.length>40);assert.ok(debtIconNames.includes('phone'));
 book=change(book,'account',{name:'Phone Loan',kind:'loan',openingBalance:500,balanceDate:day,icon:'phone',payment:25,dueDate:day,frequency:'Monthly'},day);
 assert.equal(book.accounts.at(-1).icon,'phone');
});
