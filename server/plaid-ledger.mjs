import {bankFingerprint} from '../bank-matches.js';
import {money,dateValid} from './model.mjs';
import {classifyTransaction as category} from '../categories.js';
export function applyPlaidProducts(book,items,notes,asOf){
 book.plaidPending??=[];book.plaidSuppressed??=[];const suppressed=new Set(book.plaidSuppressed);let imported=0;
 for(const item of items){
  book.pendingSyncDiagnostics??={};
  const failed=!!(item.error||item.transactionsError),diagnostic={name:item.name,freshRefresh:item.freshRefresh||null,freshBalance:item.freshBalance||null,attemptedAt:item.attemptedAt||null,checkedAt:item.checkedAt||null,status:failed?'failed':Array.isArray(item.transactions)?'complete':'not-received',received:failed?null:Array.isArray(item.transactions)?item.transactions.filter(t=>t.pending).length:null,imported:0,withheld:{},error:item.error||item.transactionsError||''};
  book.pendingSyncDiagnostics[item.id]=diagnostic;
  const withheld=(t,reason)=>{if(t.pending)diagnostic.withheld[reason]=(diagnostic.withheld[reason]||0)+1;};
  if(item.error)continue;
  if(item.transactionsError)notes.push(item.name+': transaction update failed. '+item.transactionsError);
  else if(Array.isArray(item.transactions)){
   const ids=new Set(item.transactions.filter(t=>!t.pending).map(t=>t.transaction_id));
   // Bank removals and pending-to-posted transitions never reverse snapshot cash.
   for(const key of ['transactions','reviewTransactions'])book[key]=book[key].filter(t=>t.plaidItemId!==item.id||ids.has(t.plaidTransactionId)||t.paymentId||t.bankMatchId);
   for(const t of book.transactions.filter(t=>t.plaidItemId===item.id&&t.bankMatchId)){if(!ids.has(t.plaidTransactionId)){t.bankRemoved=true;t.excluded=true;}}
   book.plaidPending=book.plaidPending.filter(t=>t.plaidItemId!==item.id);
   // Lookup tables built once per bank, so each imported transaction is matched in constant time
   // instead of scanning the whole history (which made large syncs quadratic).
   const firstBy=(list,key)=>{const m=new Map();for(const x of list){const k=key(x);if(k!=null&&!m.has(k))m.set(k,x);}return m;};
   const accountsByPlaid=firstBy(book.accounts.filter(a=>a.active!==false),a=>a.plaid?.accountId),byPlaidId=firstBy(book.transactions,x=>x.plaidTransactionId),queuedByPlaidId=firstBy(book.reviewTransactions,x=>x.plaidTransactionId);
   const dupKey=x=>x.accountId+'|'+x.amount+'|'+x.direction,dupIndex=new Map(),indexDup=x=>{if(x.adjustment)return;const k=dupKey(x);if(!dupIndex.has(k))dupIndex.set(k,[]);dupIndex.get(k).push(x);},unindexDup=(x,k)=>{const list=dupIndex.get(k);if(list){const i=list.indexOf(x);if(i>=0)list.splice(i,1);}};
   for(const x of book.transactions)indexDup(x);
   const paymentsByAmount=new Map();for(const p of book.payments){if(!paymentsByAmount.has(p.amount))paymentsByAmount.set(p.amount,[]);paymentsByAmount.get(p.amount).push(p);}
   const within=(a,b,days)=>Math.abs(Date.parse(a)-Date.parse(b))<=days*86400000;
   for(const t of item.transactions){
    const account=accountsByPlaid.get(t.account_id);if(!account){withheld(t,'Account not linked or inactive');continue;}if(suppressed.has(t.transaction_id)){withheld(t,'Previously discarded');continue;}
    if(t.iso_currency_code!=='USD'||!dateValid(t.date)||(!t.pending&&t.date>asOf)||!Number.isFinite(t.amount)||Math.abs(t.amount)>1e9){withheld(t,t.iso_currency_code!=='USD'?'Unsupported or missing currency':!dateValid(t.date)?'Invalid date':'Invalid amount');notes.push('A transaction has an unsupported amount, currency or date and was withheld.');continue;}
    const record={id:'plaid:'+t.transaction_id,externalId:t.transaction_id,plaidTransactionId:t.transaction_id,plaidItemId:item.id,accountId:account.id,name:String(t.merchant_name||t.name||'Bank transaction').slice(0,150),amount:money(Math.abs(t.amount)),direction:t.amount<0?'Inflow':'Outflow',date:t.date,bankCategory:t.personal_finance_category||null,original_description:String(t.name||'').slice(0,300),category:category(t),historical:true,imported:true};
    if(t.pending){diagnostic.imported++;book.plaidPending.push({...record,pending:true});continue;}
    const old=byPlaidId.get(t.transaction_id),queued=queuedByPlaidId.get(t.transaction_id);
    if(old){if(old.bankMatchId){const link=book.bankMatches?.find(m=>m.id===old.bankMatchId);if(link&&bankFingerprint(old)!==bankFingerprint(record))link.needsReview=true;}if(old.bankRemoved){delete old.bankRemoved;delete old.excluded;}if(!book.settings.reviewImportedCategories)delete old.suggestedCategory;const oldKey=dupKey(old),wasAdjustment=old.adjustment;Object.assign(old,{...record,id:old.id,...((old.categoryConfirmed||old.paymentId||old.bankMatchId||old.toAccountId)?{category:old.category}:old.suggestedCategory&&book.settings.reviewImportedCategories?{category:'Other',suggestedCategory:record.category}:{})});if(!wasAdjustment&&oldKey!==dupKey(old)){unindexDup(old,oldKey);indexDup(old);}continue;}
    if(queued){Object.assign(queued,record);continue;}
    const possible=(dupIndex.get(dupKey(record))||[]).some(x=>within(x.date,record.date,3))||(paymentsByAmount.get(record.amount)||[]).some(p=>(p.fundingId===record.accountId||p.debtId===record.accountId)&&within(p.date,record.date,5));
    if(possible){const review={...record,reviewReason:'Possible existing transaction or payment. Discard if already recorded.'};book.reviewTransactions.push(review);if(!queuedByPlaidId.has(record.plaidTransactionId))queuedByPlaidId.set(record.plaidTransactionId,review);continue;}
    if(book.settings.reviewImportedCategories&&!['Transfer','Debt payment'].includes(record.category)){record.suggestedCategory=record.category;record.category='Other';}
    book.transactions.push(record);indexDup(record);if(!byPlaidId.has(record.plaidTransactionId))byPlaidId.set(record.plaidTransactionId,record);imported++;
   }
  }
  for(const source of item.accounts||[])if(source.type==='loan'&&!['student','mortgage'].includes(source.subtype))notes.push(source.name+': automatic APR/payment details are not supported for this loan type.');
  if(item.liabilitiesError){notes.push(item.name+': APR/payment details unavailable. '+item.liabilitiesError);continue;}
  for(const data of item.liabilities||[]){
   const a=book.accounts.find(a=>a.plaid?.accountId===data.accountId&&a.active!==false);if(!a)continue;
   const last=a.plaid.liability||{},applied={...last.applied};
   const values={};if(Number.isFinite(data.apr)&&data.apr>=0&&data.apr<=100)values.apr=money(data.apr);if(Number.isFinite(data.payment)&&data.payment>=0&&data.payment<=1e9)values.payment=money(data.payment);if(dateValid(data.date))values.dueDate=data.date;
   for(const [key,value]of Object.entries(values)){
    const previouslyManaged=Object.hasOwn(applied,key),unchanged=previouslyManaged?a[key]===applied[key]:!a[key];
    if(unchanged){a[key]=value;applied[key]=value;}else notes.push(a.name+': manual '+key+' retained. Bank reports '+value+'.');
   }
   if(Object.hasOwn(applied,'payment')&&Object.hasOwn(applied,'dueDate')&&a.frequency===(last.frequency||'Monthly'))a.frequency='Monthly';
   a.plaid.liability={reported:values,applied,frequency:'Monthly',retrievedAt:item.checkedAt,aprs:data.aprs||[],kind:data.type};
   if(!Object.hasOwn(values,'apr'))notes.push(a.name+': APR not provided; enter it manually.');
   if(!Object.hasOwn(values,'payment')||!Object.hasOwn(values,'dueDate'))notes.push(a.name+': payment or due date missing; complete its schedule manually.');
  }
 }
 for(const link of book.bankMatches||[])if(link.before.some(x=>book.transactions.find(t=>t.id===x.id)?.bankRemoved)){link.needsReview=true;notes.push('A matched bank transaction was removed. Review Bank Activity Matches before relying on its schedule.');}
 return imported;
}
