import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,change,summary} from '../server/model.mjs';
import {applyPlaidAccounts,resolvePlaidAccountConflict} from '../server/plaid-accounts.mjs';
const date='2026-09-19';
const source={id:'share-bank',name:'Regular Share',type:'depository',current:100,available:95,currency:'USD',mask:'1234'};
const item={id:'scott',name:'Scott Credit Union',institutionId:'scott-ins',checkedAt:date,accounts:[source]};
function conflict(){let b=fresh();b=change(b,'account',{name:'Regular Share',kind:'cash',openingBalance:20,balanceDate:date},date);return applyPlaidAccounts(b,[item],date).book;}
test('same-name account prompts review and explicit link preserves identity and includes bank cash once',()=>{
 const b=conflict(),id=b.accounts[0].id;assert.equal(b.plaidAccountConflicts.length,1);
 const r=resolvePlaidAccountConflict(b,{id:b.plaidAccountConflicts[0].id,mode:'link',accountId:id},date);
 assert.equal(r.accounts.length,1);assert.equal(r.accounts[0].id,id);assert.equal(summary(r,date).cash.balance,95);assert.equal(r.plaidAccountConflicts.length,0);
 const synced=applyPlaidAccounts(r,[item],date).book;assert.equal(synced.accounts.length,1);assert.equal(summary(synced,date).cash.balance,95);assert.equal(synced.transactions.length,r.transactions.length);
 assert.equal(b.accounts[0].openingBalance,20);
});
test('separate same-name accounts can be added without replacing an existing balance',()=>{
 const b=conflict(),r=resolvePlaidAccountConflict(b,{id:b.plaidAccountConflicts[0].id,mode:'separate'},date);
 assert.equal(r.accounts.length,2);assert.equal(summary(r,date).cash.balance,115);assert.equal(applyPlaidAccounts(r,[item],date).book.accounts.length,2);
 assert.throws(()=>resolvePlaidAccountConflict(r,{id:b.plaidAccountConflicts[0].id,mode:'separate'},date),/no longer/);
});
test('cannot steal a live link, relink inactive account, or change account type',()=>{
 const b=conflict(),id=b.accounts[0].id,key=b.plaidAccountConflicts[0].id;
 b.accounts[0].plaid={itemId:'different-bank',accountId:'other'};assert.throws(()=>resolvePlaidAccountConflict(b,{id:key,mode:'link',accountId:id},date),/linked/);
 delete b.accounts[0].plaid;b.accounts[0].active=false;assert.throws(()=>resolvePlaidAccountConflict(b,{id:key,mode:'link',accountId:id},date),/active/);
 b.accounts[0].active=true;b.accounts[0].kind='loan';assert.throws(()=>resolvePlaidAccountConflict(b,{id:key,mode:'link',accountId:id},date),/same type/);
});

test('resolution saves through the budget service with revision checks and undo history',async()=>{
 const {BudgetService}=await import('../server/service.mjs'),records=new Map(),store={get:async(k,d)=>structuredClone(records.has(k)?records.get(k):d),put:async(k,v)=>records.set(k,structuredClone(v)),list:async prefix=>[...records.keys()].filter(k=>k.startsWith(prefix))};
 const service=await new BudgetService(store,async()=>conflict()).init(),before=service.read().book;
 const result=await service.write({revision:before.revision,operationId:'resolve-test',action:'resolvePlaidAccount',data:{id:before.plaidAccountConflicts[0].id,mode:'separate'}});
 assert.equal(result.book.accounts.length,2);assert.equal(records.get('budget').book.plaidAccountConflicts.length,0);assert.equal(service.history()[0].action,'resolvePlaidAccount');
 const repeat=await service.write({revision:before.revision,operationId:'resolve-test',action:'resolvePlaidAccount',data:{}});assert.equal(repeat.repeated,true);assert.equal(repeat.book.accounts.length,2);
});
