import {fresh,today,dateValid,money} from './model.mjs';
import {randomUUID} from 'node:crypto';
const iso=n=>typeof n==='number'?new Date(Date.UTC(1899,11,30)+Math.floor(n)*86400000).toISOString().slice(0,10):dateValid(n)?n:'';
const frequency=s=>s==='Every 2 Weeks'?'Biweekly':['Weekly','Biweekly','Monthly','Quarterly','Yearly'].includes(s)?s:'One-time';
export function migrate(source,asOf=today()){
 const b=fresh(),s=source.book||{},ids=new Map(),known=new Map();
 function account(key,row,record,external){
  let a=known.get(key);if(!a){a={id:randomUUID(),institution:'',apr:0,payment:0,dueDate:'',frequency:'Monthly',limit:0,original:0,...record,balanceDate:asOf,verified:false,active:true,sourceRows:[]};known.set(key,a);b.accounts.push(a);}
  a.sourceRows.push(row);if(external)ids.set(external,a.id);
  if(record.openingBalance!==a.openingBalance)b.migration.unresolved.push(`${a.name}: source balances differ (${a.openingBalance} and ${record.openingBalance}). Confirm the current balance.`);
 }
 (s.Accounts||[]).slice(2).forEach((r,i)=>{if(r[0]&&r[1])account(`${r[0]}|${r[1]}`,`Accounts ${i+3}`,{name:r[1],institution:r[0],kind:'cash',openingBalance:Number(r[3])||0},r[7]);});
 (s['Credit Cards']||[]).slice(2).forEach((r,i)=>{if(r[0])account(`card|${r[0]}|${r[1]}`,`Credit Cards ${i+3}`,{name:r[0],institution:r[1]||'',kind:'credit',openingBalance:Number(r[2])||0,apr:money((r[3]||0)*100),payment:Number(r[4])||0,limit:Number(r[15])||0},r[12]);});
 (s['Car Loans']||[]).slice(2).forEach((r,i)=>{if(r[1])account(`car|${r[0]}|${r[1]}`,`Car Loans ${i+3}`,{name:r[1],institution:r[0]||'',kind:'loan',original:r[2]||0,openingBalance:r[3]||0,apr:money((r[4]||0)*100),payment:r[5]||0,frequency:frequency(r[6])},r[15]);});
 for(const name of ['Personal Debts','Student Loans'])(s[name]||[]).slice(2).forEach((r,i)=>{if(!r[0])return;const k=name==='Student Loans'?1:0;account(`${name}|${i}`,`${name} ${i+3}`,{name:r[0],kind:'loan',original:r[1+k]||0,openingBalance:r[2+k]||0,apr:money((r[3+k]||0)*100),payment:r[4+k]||0,frequency:frequency(r[5+k])});});
 // Re-link IDs are aliases only in this reviewed, one-time migration. Future
 // accounts are independent UUIDs; similarly named accounts are never merged.
 const groups=new Map();let rows=0;
 for(const [index,r] of (s.Transactions||[]).entries()){
  if(index<2||!r[1]||!iso(r[0]))continue;rows++;const accountId=ids.get(r[10]);
  if(!accountId){b.migration.unresolved.push(`Transaction row ${index+1}: not imported because no matching account was found.`);continue;}
  const pending=String(r[7]).toLowerCase()==='yes',base=JSON.stringify([accountId,iso(r[0]),String(r[1]).trim(),money(r[3]),r[4],pending]);
  if(!groups.has(base))groups.set(base,new Map());const streams=groups.get(base),stream=r[10]||'unknown';if(!streams.has(stream))streams.set(stream,[]);streams.get(stream).push({id:randomUUID(),accountId,name:r[1],date:iso(r[0]),amount:money(r[3]),direction:r[4]==='Inflow'?'Inflow':'Outflow',category:r[5]==='INCOME'?'Income':({FOOD_AND_DRINK:'Food',GENERAL_MERCHANDISE:'Shopping',MEDICAL:'Medical',TRANSPORTATION:'Transportation',ENTERTAINMENT:'Entertainment',RENT_AND_UTILITIES:'Utilities'})[r[5]]||'Other',pending,sourceRow:index+1,historical:true});
 }
 for(const streams of groups.values()){
  const chosen=[...streams.values()].sort((a,b)=>b.length-a.length)[0];
  b.reviewTransactions.push(...chosen.map(t=>({...t,duplicateStreams:streams.size})));
 }
 b.migration.sourceRows=rows;b.migration.duplicateRows=rows-b.reviewTransactions.length;b.migration.capturedAt=source.capturedAt;
 for(const r of (s['Fixed Expenses']||[]).slice(2))if(r[0]&&iso(r[3])&&!['Paid','Skipped','Cancelled'].includes(r[6]))b.bills.push({id:randomUUID(),name:r[0],amount:Number(r[2])||0,date:iso(r[3]),frequency:frequency(r[4]),kind:'Fixed',active:true});
 for(const r of (s['Possible Expenses']||[]).slice(2))if(r[0]&&iso(r[2])&&!r[15]&&!['Paid','Cancelled'].includes(r[10]))b.bills.push({id:randomUUID(),name:r[0],amount:Number(r[16]??r[14]??r[5])||0,date:iso(r[2]),frequency:'One-time',kind:'Planned',active:true});
 for(const r of (s['Bills & Planning']||[]).slice(5))if(r[0])b.needs.push({id:randomUUID(),name:r[0],cost:Number(r[3])||0,urgency:['High','Medium','Low'].includes(r[2])?r[2]:'Medium'});
 for(const r of (s['Wish List']||[]).slice(8,38))if(r[0]&&!r[14])b.wishes.push({id:randomUUID(),name:r[0],cost:Number(r[2])||0,saved:Number(r[3])||0,style:r[6]||'Automatic',weekly:Number(r[7])||0,date:'',link:'',image:''});
 for(const r of (s['Plan & Goals']||[]).slice(33))for(const [list,k] of [['sinking',0],['goals',9]])if(r[k])b[list].push({id:randomUUID(),name:r[k],cost:Number(r[k+1])||0,saved:Number(r[k+3])||0,date:iso(r[k+2]),style:'Automatic',weekly:0,link:'',image:''});
 b.settings.buffer=Number(s['Plan & Goals']?.[5]?.[4])||400;
 // Do not carry over inflated paycheck predictions or replay historical
 // payments against an already-updated opening balance.
 b.migration.unresolved.push('Confirm paycheck amounts and dates in Plan. Spreadsheet predictions were excluded because duplicate deposits inflated them.');
 b.migration.unresolved.push('Confirm debt due dates and recurring bills. No inferred Plaid payment is treated as a bill.');
 for(const r of s['Decisions & Wins']||[]){if(r[4]==='Budget HQ: wish details')try{const v=JSON.parse(r[5]),w=b.wishes.find(w=>w.name===v.name);if(w&&/^https?:\/\//.test(v.link||''))w.link=v.link;}catch{}}
 return b;
}
