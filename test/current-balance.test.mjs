import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,change,summary} from '../server/model.mjs';
import {recentCashActivity} from '../tools-data.js';
const day='2026-09-16';
function budget(){let b=fresh();for(const [id,name,kind,balance] of [['checking','Checking','cash',3000],['savings','Savings','cash',1000],['card','Card','credit',500]]){b=change(b,'account',{name,kind,openingBalance:balance,balanceDate:'2026-09-01'},day);b.accounts.at(-1).id=id;}return b;}
test('cash preview includes direct payments once, uses matched transactions once, and treats cash transfers as neutral',()=>{
 let b=budget();b=change(b,'transaction',{name:'Card autopay',accountId:'checking',date:day,amount:50,direction:'Outflow',category:'Other'},day);const tx=b.transactions.at(-1);
 b=change(b,'payment',{debtId:'card',fundingId:'checking',transactionId:tx.id,amount:50,principal:50,date:day},day);
 b=change(b,'payment',{debtId:'card',fundingId:'checking',amount:35,principal:35,date:day},day);
 b=change(b,'transaction',{name:'To savings',accountId:'checking',toAccountId:'savings',date:day,amount:100,direction:'Outflow',category:'Transfer'},day);
 const before=JSON.stringify(b),rows=recentCashActivity(b,summary(b,day));assert.equal(rows.length,3);assert.equal(rows.filter(t=>t.amount===50).length,1);assert.equal(rows.filter(t=>t.amount===35).length,1);assert.equal(rows.filter(t=>t.category==='Debt payment').length,2);assert.equal(rows.find(t=>t.name==='To savings').cashChange,0);assert.equal(rows.find(t=>t.name==='To savings').account,'Checking → Savings');assert.equal(rows.reduce((n,t)=>n+t.cashChange,0),-85);assert.equal(JSON.stringify(b),before);
});
test('cash preview selects the latest seven across cash accounts, excluding credit-only, future and excluded entries',()=>{
 const b=budget();for(let i=1;i<=9;i++)b.transactions.push({id:'t'+i,name:'Activity '+i,date:'2026-09-'+String(i).padStart(2,'0'),amount:i,direction:i===9?'Inflow':'Outflow',category:i===9?'Income':'Food',accountId:i%2?'checking':'savings'});
 b.transactions.push({id:'credit',name:'Card charge',date:day,accountId:'card',amount:10,direction:'Outflow'},{id:'future',name:'Future',date:'2026-10-01',accountId:'checking',amount:10,direction:'Inflow'},{id:'excluded',name:'Excluded',date:day,accountId:'checking',amount:10,direction:'Outflow',excluded:true});
 const rows=recentCashActivity(b,summary(b,day));assert.deepEqual(rows.map(t=>t.name),[9,8,7,6,5,4,3].map(n=>'Activity '+n));assert.equal(rows[0].cashChange,9);assert.equal(rows[1].cashChange,-8);assert.deepEqual(recentCashActivity(b,{accounts:[],asOf:day}),[]);
});
