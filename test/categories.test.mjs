import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyTransaction,categorizeOther,CATEGORIES} from '../categories.js';
import {fresh,change,balances} from '../server/model.mjs';
import {applyPlaidAccounts} from '../server/plaid-accounts.mjs';
test('expanded bank categories and merchant fallbacks include income without treating all credits as income',()=>{
 for(const [primary,detailed,expected] of [['PERSONAL_CARE','','Personal care'],['BANK_FEES','','Bank fees'],['GENERAL_SERVICES','GENERAL_SERVICES_INSURANCE','Insurance'],['GENERAL_SERVICES','GENERAL_SERVICES_EDUCATION','Education'],['GENERAL_MERCHANDISE','GENERAL_MERCHANDISE_PET_SUPPLIES','Pets'],['MEDICAL','MEDICAL_VETERINARY_SERVICES','Pets'],['INCOME','','Income'],['TRANSFER_IN','','Transfer'],['LOAN_PAYMENTS','','Debt payment']]){const c=classifyTransaction({amount:-10,personal_finance_category:{primary,detailed}});assert.equal(c,expected);assert.ok(CATEGORIES.includes(c));}
 for(const [name,direction,expected] of [['POS SQ *STARBUCKS #032','Outflow','Dining out'],['KROGER #412','Outflow','Groceries'],['PAYROLL ACME','Inflow','Income'],['PAYROLL ACME','Outflow','Other'],['ZELLE FROM SOMEONE','Inflow','Transfer'],['UNKNOWN DEPOSIT','Inflow','Other'],['AMZN REFUND','Inflow','Other'],['TARGET #124','Outflow','Shopping']])assert.equal(classifyTransaction({name,direction}),expected);
});
test('batch repairs existing Other while preserving manual choices, links and amounts',()=>{
 const b=fresh();b.transactions=[{id:'a',category:'Other',suggestedCategory:'Income',direction:'Inflow',amount:100},{id:'b',category:'Other',name:'STARBUCKS',amount:5,direction:'Outflow'},...['categoryConfirmed','paymentId','bankMatchId','toAccountId','adjustment'].map((key,i)=>({id:String(i),category:'Other',name:'STARBUCKS',[key]:true,amount:5}))];
 const before=structuredClone(b.transactions);assert.equal(categorizeOther(b),2);assert.equal(b.transactions[0].category,'Income');assert.equal(b.transactions[1].category,'Dining out');assert.deepEqual(b.transactions.slice(2),before.slice(2));assert.deepEqual(b.transactions.map(t=>t.amount),before.map(t=>t.amount));assert.equal(categorizeOther(b),0);b.settings.reviewImportedCategories=true;assert.equal(change(b,'autoCategorize',{},'2026-09-18').settings.reviewImportedCategories,false);
});
test('review preference survives refresh and batch enables auto categorization without changing cash',()=>{
 const day='2026-09-18',item={id:'bank',name:'Bank',accounts:[{id:'cash',name:'Checking',type:'depository',current:1000,currency:'USD'}],transactions:[{transaction_id:'a',account_id:'cash',date:day,amount:20,iso_currency_code:'USD',name:'Unknown store',personal_finance_category:{primary:'PERSONAL_CARE'}}]};
 let b=fresh();b.settings.reviewImportedCategories=true;b=applyPlaidAccounts(b,[item],day).book;assert.equal(b.transactions[0].category,'Other');b=applyPlaidAccounts(b,[item],day).book;assert.equal(b.transactions[0].category,'Other');b=change(b,'autoCategorize',{},day);assert.equal(b.transactions[0].category,'Personal care');b=applyPlaidAccounts(b,[item],day).book;assert.equal(b.transactions[0].suggestedCategory,undefined);assert.equal(balances(b,day)[0].balance,1000);
});
