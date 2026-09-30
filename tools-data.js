import {TYPE_BY_NAME,normalizeCategory} from './categories.js';
// Read-only Tools models. All mutations continue through the existing ledger.
import {cleanHistory,spendingAnalysis,activityTotals,round} from './analysis.js';
import {reviewState} from './workflow.js';
export function recentCashActivity(book,data){
 const cash=new Map(data.accounts.filter(a=>a.kind==='cash').map(a=>[a.id,a]));
 const accounts=new Map(book.accounts.map(a=>[a.id,a.name])),linked=new Set(book.payments.map(p=>p.transactionId).filter(Boolean));
 const transactions=book.transactions.filter(t=>!t.excluded&&t.date<=data.asOf&&(cash.has(t.accountId)||cash.has(t.toAccountId))).map(t=>{
  const source=cash.has(t.accountId),destination=cash.has(t.toAccountId),transfer=!!t.toAccountId;
  const cashChange=round((source?(t.direction==='Inflow'?t.amount:-t.amount):0)+(destination?t.amount:0));
  return {id:'transaction-'+t.id,date:t.date,name:t.name,amount:t.amount,cashChange,category:t.adjustment?'Balance Correction':transfer?'Transfer':t.paymentId||linked.has(t.id)?'Debt payment':t.category||'Other',account:transfer?(accounts.get(t.accountId)||'Other account')+' → '+(accounts.get(t.toAccountId)||'Other account'):accounts.get(t.accountId)||'Cash account',historical:!!t.historical};
 });
 const payments=book.payments.filter(p=>!p.transactionId&&cash.has(p.fundingId)&&p.date<=data.asOf).map(p=>({id:'payment-'+p.id,date:p.date,name:p.debtName||accounts.get(p.debtId)||'Debt Payment',amount:p.amount,cashChange:-p.amount,category:'Debt payment',account:accounts.get(p.fundingId)||'Cash account'}));
 return [...transactions,...payments].map((t,index)=>({...t,index})).sort((a,b)=>b.date.localeCompare(a.date)||b.index-a.index).slice(0,7);
}
export const total=rows=>round(rows.reduce((n,t)=>n+t.amount,0));
export function periods(book,asOf){return [...new Set([asOf.slice(0,7),...book.transactions.map(t=>t.date?.slice(0,7)),...book.payments.map(p=>p.date?.slice(0,7))].filter(m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m)&&m<=asOf.slice(0,7)))].sort().reverse();}
export function reviewQueue(book){const r=reviewState(book);return {...r,count:r.uncategorized.length+r.duplicates.length+r.matches.length+r.history};}
// The bank or lender an account belongs to. Accounts without one stand alone under their own name.
export const accountGroup=account=>String(account?.institution||'').trim()||String(account?.name||'').trim();
export function filterTransactions(book,filter={}){
 const needle=String(filter.q||'').trim().toLowerCase();
 const inGroup=id=>{const a=book.accounts.find(x=>x.id===id);return !!a&&accountGroup(a)===filter.institution;};return book.transactions.filter(t=>(!filter.kind||filter.kind!=='balance'||!!t.adjustment)&&(!filter.institution||inGroup(t.accountId)||inGroup(t.toAccountId))&&(!filter.month||filter.month==='all'||t.date.startsWith(filter.month))&&(!filter.account||t.accountId===filter.account||t.toAccountId===filter.account)&&(!filter.category||(t.category||'Other')===filter.category)&&(!filter.ids||filter.ids.includes(t.id))&&(!needle||[t.name,...book.accounts.filter(a=>a.id===t.accountId||a.id===t.toAccountId).map(a=>a.name)].some(v=>String(v).toLowerCase().includes(needle)))).slice().sort((a,b)=>b.date.localeCompare(a.date)||String(a.id).localeCompare(String(b.id)));}
export function reportData(book,data,period){const yearly=/^\d{4}$/.test(period),start=period+(yearly?'-01-01':'-01'),end=period+(yearly?'-12-31':'-31'),clean=cleanHistory(book,data.asOf),rows=clean.rows.filter(t=>t.date>=start&&t.date<=end),spending=rows.filter(t=>t.direction==='Outflow'&&!t.toAccountId&&!t.paymentId&&!['Transfer','Debt payment'].includes(t.category)),income=rows.filter(t=>t.direction==='Inflow'&&!t.toAccountId&&t.category==='Income'),payments=book.payments.filter(p=>p.date>=start&&p.date<=end&&p.date<=data.asOf),unlinked=rows.filter(t=>t.direction==='Outflow'&&!t.paymentId&&t.category==='Debt payment'),categories=[...new Set(spending.map(t=>t.category||'Other'))].sort().map(name=>({name,amount:total(spending.filter(t=>(t.category||'Other')===name)),rows:spending.filter(t=>(t.category||'Other')===name)})),cashIds=new Set(book.accounts.filter(a=>a.kind==='cash').map(a=>a.id)),cash=rows.filter(t=>cashIds.has(t.accountId)&&!t.toAccountId&&t.category!=='Transfer'),directPayments=payments.filter(p=>cashIds.has(p.fundingId)&&!p.transactionId);
 return {period,yearly,start,end,...activityTotals(book,data,start,end),rows,spendingRows:spending,incomeRows:income.filter(t=>cashIds.has(t.accountId)),paymentRows:[...payments.map(p=>({...p,name:p.debtName,recordType:'payment'})),...unlinked.map(t=>({...t,recordType:'transaction'}))],categories,cashIncome:total(cash.filter(t=>t.direction==='Inflow')),cashSpending:total(cash.filter(t=>t.direction==='Outflow'&&!t.paymentId&&t.category!=='Debt payment')),cashPayments:round(total(directPayments)+total(cash.filter(t=>t.direction==='Outflow'&&(t.paymentId||t.category==='Debt payment')))),heatmap:categories.map(c=>({...c,months:Array.from({length:12},(_,i)=>total(c.rows.filter(t=>Number(t.date.slice(5,7))===i+1)))}))};
}
export function periodInsights(book,data,month){const last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10),asOf=last<data.asOf?last:data.asOf,result=spendingAnalysis(book,asOf),hidden=book.insightStates||{},cards=[];for(const c of result.categories)cards.push({id:'pace:'+c.category+':'+month,kind:'category',name:c.category,data:c});for(const m of result.recurring)cards.push({id:'merchant:'+m.name+':'+m.last,kind:'merchant',name:m.name,data:m});for(const m of result.leaks)cards.push({id:'leak:'+m.name+':'+month,kind:'small',name:m.name,data:m});const isHidden=c=>hidden[c.id]&&(hidden[c.id].status!=='snoozed'||hidden[c.id].until>data.asOf);return {...result,asOf,month,cards,visible:cards.filter(c=>!isHidden(c)),hidden:cards.filter(isHidden)};}

// Icon and colour for a transaction type, from the one shared list.
export const transactionStyle=cat=>{
 if(/balance correction/i.test(String(cat||'')))return ['difference','gray'];
 const type=TYPE_BY_NAME.get(normalizeCategory(cat)||String(cat||''));
 if(type)return [type.icon,type.slug];
 return /uncategor/i.test(String(cat||''))?['uncategorized','gray']:['other','other'];
};
