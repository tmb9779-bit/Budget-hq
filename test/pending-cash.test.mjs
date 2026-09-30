import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,summary,balances} from '../server/model.mjs';
import {applyPlaidAccounts} from '../server/plaid-accounts.mjs';
const day='2026-09-19';
const tx=(id,amount=100,pending=true,account_id='cash')=>({transaction_id:id,account_id,date:day,amount,pending,name:'Purchase',iso_currency_code:'USD'});
const item=(available,current=1000,transactions=[])=>({id:'bank',name:'Bank',accounts:[{id:'cash',name:'Checking',type:'depository',current,available,currency:'USD'},{id:'card',name:'Card',type:'credit',current:500,available:2000,currency:'USD'}],transactions});
test('available balance includes pending once and planning shares adjusted cash',()=>{
 const b=applyPlaidAccounts(fresh(),[item(900,1000,[tx('p')])],day).book;b.settings.planningConfirmed=true;
 const s=summary(b,day);assert.equal(s.cash.balance,900);assert.equal(s.cash.postedBalance,1000);assert.equal(s.cash.pendingAdjustment,100);assert.equal(s.cash.balanceDetails[0].pendingCharges,100);assert.equal(s.cash.safeToSpend,900-b.settings.buffer);assert.equal(balances(b,day)[0].balance,1000);assert.equal(b.transactions.filter(t=>!t.adjustment).length,0);
});
test('missing available balance estimates outflows, ignores pending income and credit purchases',()=>{
 const b=applyPlaidAccounts(fresh(),[item(null,1000,[tx('p'),tx('income',-300),tx('credit',200,true,'card')])],day).book;b.plaidPending.push({...b.plaidPending[0]});
 assert.equal(summary(b,day).cash.balance,900);assert.equal(summary(b,day).cash.balanceDetails[0].method,'estimate');
});
test('posting, cancellation and repeated sync do not double deduct pending cash',()=>{
 let b=applyPlaidAccounts(fresh(),[item(null,1000,[tx('p')])],day).book;assert.equal(summary(b,day).cash.balance,900);
 b=applyPlaidAccounts(b,[item(null,900,[tx('posted',100,false)])],day).book;assert.equal(summary(b,day).cash.balance,900);assert.equal(b.plaidPending.length,0);
 b=applyPlaidAccounts(b,[item(null,900,[tx('posted',100,false)])],day).book;assert.equal(summary(b,day).cash.balance,900);
 b=applyPlaidAccounts(fresh(),[item(null,1000,[tx('p')])],day).book;b=applyPlaidAccounts(b,[item(null,1000,[])],day).book;assert.equal(summary(b,day).cash.balance,1000);
});
test('zero and negative available balances are respected; available above posted does not add cash',()=>{
 for(const [available,expected] of [[0,0],[-20,-20],[1200,1000]]){const b=applyPlaidAccounts(fresh(),[item(available)],day).book;assert.equal(summary(b,day).cash.balance,expected);}
});
