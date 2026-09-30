import {recurringMerchant,shift,incomeEstimate,sameMerchant} from './analysis.js';
const days=(a,b)=>Math.abs(Date.parse(a)-Date.parse(b))/86400000;
const dates=(anchor,f,start,end)=>{if(!anchor)return [];const out=[],d=new Date(anchor+'T12:00:00Z');if(!Number.isFinite(+d))return out;const months={Monthly:1,Quarterly:3,Yearly:12}[f],step={Weekly:7,Biweekly:14}[f];for(let i=0;i<10000;i++){let date;if(step)date=shift(anchor,step*i);else if(months){const month=d.getUTCMonth()+months*i;date=new Date(Date.UTC(d.getUTCFullYear(),month,Math.min(d.getUTCDate(),new Date(Date.UTC(d.getUTCFullYear(),month+1,0)).getUTCDate()))).toISOString().slice(0,10);}else date=anchor;if(date>end)break;if(date>=start)out.push(date);if(!step&&!months)break;}return out;};
export const bankFingerprint=t=>JSON.stringify([t.accountId,t.date,t.amount,t.direction]);
export function bankMatchCandidates(book,asOf){
 const accounts=new Map(book.accounts.filter(a=>a.active!==false).map(a=>[a.id,a])),denied=new Set(book.dismissedBankMatchTransactions||[]),rows=book.transactions.filter(t=>t.plaidTransactionId&&t.historical&&!t.excluded&&!t.bankRemoved&&!t.pending&&!t.bankMatchId&&!t.paymentId&&!t.toAccountId&&!denied.has(t.id)&&t.date<=asOf),out=[];
 const inflows=new Map();for(const t of rows.filter(t=>t.direction==='Inflow')){const list=inflows.get(t.amount)||[];list.push(t);inflows.set(t.amount,list);}
 const add=(kind,t,source,date,expected,other,nameMatch=false)=>{const key=JSON.stringify([kind,t.id,source?.id||other?.id,date||'']);if(!(book.dismissedBankMatches||[]).includes(key))out.push({key,kind,transactionId:t.id,sourceId:source?.id,date,expected,otherId:other?.id,name:source?.name||other?.name,actual:t.amount,transaction:t,other,nameMatch});};
 for(const t of rows){const a=accounts.get(t.accountId);if(!a)continue;
  if(t.direction==='Inflow'&&a.kind==='cash'&&t.category==='Income')for(const s of book.incomes.filter(i=>i.active!==false&&i.verified&&(!i.accountId||i.accountId===a.id))){const expected=incomeEstimate(book,s,asOf).amount,nameMatch=sameMerchant(t.name,s.historyName||s.name);if(!nameMatch&&Math.abs(t.amount-expected)>=.01)continue;for(const date of dates(s.date,s.frequency,shift(t.date,-5),shift(t.date,5))){if(book.overrides?.[s.id+'@'+date]||book.transactions.some(x=>x.incomeExpectation?.scheduleId===s.id&&x.incomeExpectation.date===date))continue;add('income',t,s,date,expected,undefined,nameMatch);}}
  if(t.direction==='Outflow'&&['cash','credit'].includes(a.kind)&&!['Transfer','Debt payment'].includes(t.category))for(const s of book.bills.filter(b=>b.active!==false))for(const date of dates(s.date,s.frequency,shift(t.date,-5),shift(t.date,5))){if(book.overrides?.[s.id+'@'+date]||book.transactions.some(x=>x.occurrenceKey===s.id+'@'+date))continue;const nameMatch=sameMerchant(s.name,t.name);if(recurringMerchant(s.name)===recurringMerchant(t.name)||Math.abs(s.amount-t.amount)<.01)add('bill',t,s,date,s.amount,undefined,nameMatch);}
  if(t.direction==='Outflow'&&a.kind==='cash')for(const other of inflows.get(t.amount)||[]){const dest=accounts.get(other.accountId);if(other.direction!=='Inflow'||other.accountId===t.accountId||!dest||days(t.date,other.date)>5||t.amount!==other.amount)continue;const debt=['credit','loan'].includes(dest.kind);if(!['Transfer','Debt payment'].includes(t.category)&&!['Transfer','Debt payment'].includes(other.category))continue;add(debt?'debtTransfer':'transfer',t,null,null,t.amount,other);}
 }
 return out;
}
export function bankDebtOccurrences(book,c){if(c.kind!=='debtTransfer')return [];const a=book.accounts.find(a=>a.id===c.other.accountId);if(!a||!(a.payment>0)||c.actual<a.payment)return [];return dates(a.dueDate,a.frequency,shift(c.transaction.date,-5),shift(c.transaction.date,5)).filter(date=>!book.overrides[a.id+'@'+date]&&!book.payments.some(p=>p.occurrenceKey===a.id+'@'+date)).map(date=>({key:a.id+'@'+date,date,name:a.name,amount:a.payment}));}
export function applyBankMatch(book,p,asOf){
 book.bankMatches??=[];
 if(p.mode==='restoreDismissed')throw Error('Denied bank matches cannot be restored.');
 if(p.mode==='unlink'){
  const link=book.bankMatches.find(m=>m.id===p.id);if(!link)throw Error('This match is no longer available.');
  const source=book.incomes.find(i=>i.id===link.sourceId);
  if(link.kind==='income'&&source){if(source.date!==link.nextDate)throw Error('Unlink later paychecks first, or restore the income schedule date before unlinking this match.');source.date=link.date;source.active=true;}
  const occurrence=link.occurrenceKey||(link.kind==='bill'?link.sourceId+'@'+link.date:'');if(occurrence&&book.overrides[occurrence]?.bankMatchId===link.id)delete book.overrides[occurrence];
  for(const old of link.before){const t=book.transactions.find(t=>t.id===old.id);if(t){t.category=old.category;t.categoryConfirmed=old.categoryConfirmed;delete t.bankMatchId;delete t.incomeExpectation;delete t.occurrenceKey;}}
  book.bankMatches=book.bankMatches.filter(m=>m.id!==link.id);return;
 }
 const match=bankMatchCandidates(book,asOf).find(c=>c.key===p.key);if(!match)throw Error('This match changed or was already used. Refresh the review list.');
 if(p.mode==='dismiss'){book.dismissedBankMatches=[...new Set([...(book.dismissedBankMatches||[]),p.key])];book.dismissedBankMatchTransactions=[...new Set([...(book.dismissedBankMatchTransactions||[]),match.transactionId])];return;}
 if(p.mode!=='confirm')throw Error('Choose a match action.');
 const t=book.transactions.find(t=>t.id===match.transactionId),other=match.otherId?book.transactions.find(t=>t.id===match.otherId):null;
 const link={id:match.key,kind:match.kind,sourceId:match.sourceId,date:match.date,name:match.name,expected:match.expected,actual:t.amount,before:[t,...(other?[other]:[])].map(x=>({id:x.id,category:x.category,categoryConfirmed:x.categoryConfirmed,fingerprint:bankFingerprint(x)}))};
 if(match.kind==='income'){const s=book.incomes.find(s=>s.id===match.sourceId);link.nextDate=dates(match.date,s.frequency,shift(match.date,1),shift(match.date,370))[0]||'';t.incomeExpectation={scheduleId:s.id,date:match.date,amount:match.expected,nextDate:link.nextDate,frequency:s.frequency};s.date=link.nextDate;if(!s.date)s.active=false;}
 if(match.kind==='bill'){t.occurrenceKey=match.sourceId+'@'+match.date;book.overrides[t.occurrenceKey]={status:'Paid',bankMatchId:link.id};}
 if(p.occurrenceKey){const due=bankDebtOccurrences(book,match).find(e=>e.key===p.occurrenceKey);if(!due)throw Error('That debt occurrence no longer matches.');link.occurrenceKey=due.key;book.overrides[due.key]={status:'Paid',bankMatchId:link.id};}
 if(other){t.category=other.category=match.kind==='transfer'?'Transfer':'Debt payment';t.categoryConfirmed=other.categoryConfirmed=true;}
 t.bankMatchId=link.id;if(other)other.bankMatchId=link.id;book.bankMatches.push(link);
}

// A deposit that names the employer on an expected payday is the paycheck: clear it from the schedule
// without asking. Anything less certain (amount alone, or an unfamiliar name) still waits for review.
export function autoConfirmPaychecks(book,asOf){
 let cleared=0;
 for(let pass=0;pass<Math.min(100,(book.transactions||[]).length);pass++){
  const candidates=bankMatchCandidates(book,asOf).filter(c=>c.kind==='income'&&c.nameMatch&&!c.transaction.bankMatchId&&Math.abs(c.actual-c.expected)<=Math.max(25,c.expected*.5)).sort((a,b)=>a.date.localeCompare(b.date)||a.transaction.date.localeCompare(b.transaction.date));
  const match=candidates.find(c=>candidates.filter(x=>x.transactionId===c.transactionId).length===1&&candidates.filter(x=>x.sourceId===c.sourceId&&x.date===c.date).length===1);
  if(!match)break;
  try{applyBankMatch(book,{key:match.key,mode:'confirm'},asOf);cleared++;}catch{break;}
 }
 return cleared;
}
// Confident posted bill matches complete the schedule without adding a
// second cash transaction. Amount-only and ambiguous matches stay in Review.
export function autoConfirmBills(book,asOf){
 let cleared=0;
 for(let pass=0;pass<Math.min(100,(book.transactions||[]).length);pass++){
  const candidates=bankMatchCandidates(book,asOf).filter(c=>c.kind==='bill'&&!book.bills.find(b=>b.id===c.sourceId)?.needId&&c.nameMatch&&days(c.date,c.transaction.date)<=3&&Math.abs(c.actual-c.expected)<=Math.max(3,c.expected*.1));
  const match=candidates.find(c=>candidates.filter(x=>x.transactionId===c.transactionId).length===1);
  if(!match)break;
  try{applyBankMatch(book,{key:match.key,mode:'confirm'},asOf);cleared++;}catch{break;}
 }
 return cleared;
}
