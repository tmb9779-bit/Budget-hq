import {addDays,occurrences} from './schedule.js';
const dayDiff=(a,b)=>Math.abs((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/86400000);
const merchant=s=>String(s||'').toLowerCase().replace(/\b(inc|llc|payment|online|bill|ach|debit|credit|the)\b/g,'').replace(/[^a-z0-9]/g,'');
const similarName=(a,b)=>{const x=merchant(a),y=merchant(b);return x.length>=4&&y.length>=4&&(x.includes(y)||y.includes(x));};

// Review only; a transaction never marks a schedule paid without confirmation.
export function unmatchedScheduledBills(book,asOf,{lookback=35,grace=3}={}){
 const start=addDays(asOf,-lookback),end=addDays(asOf,-grace),snoozes=book.billReviewSnoozes||{};
 const sources=[...(book.bills||[]).filter(x=>x.active!==false).map(x=>({...x,kind:'bill',anchor:x.date,amount:Number(x.amount)})),...(book.accounts||[]).filter(x=>x.active!==false&&x.kind!=='cash'&&x.payment>0).map(x=>({...x,kind:'debt',anchor:x.dueDate,amount:Number(x.payment)}))];
 const pending=book.plaidPending||[],posted=book.transactions||[];
 return sources.flatMap(source=>occurrences(source.anchor,source.frequency,start,end).map(date=>{
  const key=source.id+'@'+date,override=book.overrides?.[key];
  if(['Paid','Skipped','Cancelled'].includes(override?.status)||snoozes[key]>asOf)return null;
  if(posted.some(t=>t.occurrenceKey===key)||book.payments?.some(p=>p.occurrenceKey===key))return null;
  const amountClose=x=>Math.abs(Number(x.amount)-source.amount)<=Math.max(3,source.amount*.1),dateClose=x=>dayDiff(x.date,date)<=3;
  const matched=[...posted,...pending].some(t=>t.direction==='Outflow'&&!t.excluded&&!t.bankRemoved&&!t.adjustment&&amountClose(t)&&dateClose(t)&&(source.kind==='debt'?(t.paymentId||similarName(source.name,t.name)):true));
  if(matched||source.kind==='debt'&&book.payments?.some(p=>p.debtId===source.id&&amountClose(p)&&dateClose(p)))return null;
  return {key,id:source.id,name:source.name,date,amount:source.amount,kind:source.kind};
 })).filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date)||a.name.localeCompare(b.name));
}
