import test from 'node:test';import assert from 'node:assert/strict';
import {recurringBillSuggestions,merchantKey} from '../analysis.js';
import {change} from '../server/model.mjs';
import {shouldFind,shouldNotFind,evaluate,asOf} from './recurring-cases.fixture.mjs';

test('finds real-world recurring bills',()=>{for(const r of evaluate(recurringBillSuggestions).filter(r=>r.expect))assert.ok(r.found>0,'missed: '+r.label);});
test('does not flag everyday spending, own transfers, debt payments, cancelled or duplicate charges',()=>{for(const r of evaluate(recurringBillSuggestions).filter(r=>!r.expect))assert.equal(r.found,0,'false alarm: '+r.label+' '+r.names);});
test('two subscriptions from one company become two suggestions',()=>{const r=evaluate(recurringBillSuggestions).find(r=>r.label.startsWith('Two Apple'));assert.equal(r.found,2);});

test('bank descriptions group by their stable words',()=>{
 for(const [a,b] of [['COMCAST CABLE COMM 0412 #88213','COMCAST CABLE COMM 0512 #90117'],['PAYPAL *HULU 402-935-7733','PAYPAL *HULU'],['AMAZON PRIME*2K4LM81','Amazon Prime*MEMBERSHIP'],['NETFLIX.COM','Netflix'],['APPLE.COM/BILL','APPLE.COM/BILL 866-712-7753 CA']])assert.equal(merchantKey(a),merchantKey(b),a+' vs '+b);
 assert.notEqual(merchantKey('PAYPAL *HULU'),merchantKey('PAYPAL *SPOTIFY'),'processor prefixes never merge different merchants');
});

test('random everyday shopping produces no suggestions',()=>{
 let seed=11;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;},day=i=>new Date(Date.UTC(2025,8,18)+i*86400000).toISOString().slice(0,10);let flagged=[];
 for(let trial=0;trial<40;trial++){const b={accounts:[{id:'c',name:'Card',kind:'credit',active:true}],bills:[],transactions:[],reviewTransactions:[],payments:[],dismissedRecurring:[]};let n=0;
  for(let m=0;m<25;m++){const style=r(),visits=[];let d=Math.floor(r()*20);const meanGap=style<.3?4+r()*6:style<.6?8+r()*20:20+r()*40;while(d<365){visits.push(d);d+=Math.max(1,Math.round(meanGap*(0.5+r())));}
   const fixed=r()<.35,price=[3.5,4.99,5,9.99,12,15,20,25,40][Math.floor(r()*9)];for(const v of visits)b.transactions.push({id:'t'+(++n),date:day(v),name:'STORE '+m,amount:fixed&&r()<.6?price:Math.round((5+r()*80)*100)/100,accountId:'c',direction:'Outflow',category:'Shopping'});}
  flagged.push(...recurringBillSuggestions(b,asOf));}
 assert.deepEqual(flagged.map(s=>s.name),[]);
});

test('suggestions dismissed before this update stay dismissed and can be restored',()=>{
 const book={accounts:[{id:'chk',name:'Checking',kind:'cash',active:true,openingBalance:0,balanceDate:'2026-01-01'}],bills:[],transactions:[],reviewTransactions:[],payments:[],incomes:[],goals:[],wishes:[],needs:[],sinking:[],settings:{},overrides:{},
  dismissedRecurring:[JSON.stringify(['chk','spotify usa'])]};
 for(const d of ['2026-06-15','2026-07-15','2026-08-15','2026-09-15'])book.transactions.push({id:d,date:d,name:'SPOTIFY USA',amount:11.99,accountId:'chk',direction:'Outflow',category:'Entertainment'});
 const [s]=recurringBillSuggestions(book,asOf);assert.equal(s.dismissed,true,'old-style dismissal still applies');
 const restored=change(book,'recurringSuggestion',{key:s.key,mode:'restore'},asOf);assert.equal(recurringBillSuggestions(restored,asOf)[0].dismissed,false);
});

test('an existing bill with a slightly different name suppresses the suggestion; a split subscription needs a matching amount',()=>{
 const b={accounts:[{id:'card',name:'Visa',kind:'credit',active:true}],bills:[{name:'Netflix',amount:15.49,frequency:'Monthly',active:true}],transactions:[],reviewTransactions:[],payments:[],dismissedRecurring:[]};
 for(const m of ['06','07','08','09'])b.transactions.push({id:'n'+m,date:'2026-'+m+'-03',name:'NETFLIX.COM 866-579-7172',amount:15.49,accountId:'card',direction:'Outflow',category:'Entertainment'});
 assert.equal(recurringBillSuggestions(b,asOf).length,0);
 shouldFind['Two Apple subscriptions billed the same day'](b);b.bills.push({name:'Apple',amount:2.99,frequency:'Monthly',active:true});
 assert.deepEqual(recurringBillSuggestions(b,asOf).map(s=>s.amount),[10.99],'only the Apple subscription without a bill is suggested');
});
