// Shared, deterministic review rules. Suggestions never change the ledger.
import {incomeForecastDecision} from './analysis.js';
import {forecastReconciliation} from './plan-view.js';
export function weekStart(date){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);}
export function tripFieldVisible(field,mode,rental){if(['flightFare','baggage','airportTransport'].includes(field))return mode==='Fly';if(['miles','mpg','fuelPrice','tolls','parking'].includes(field))return mode==='Drive';if(['rentalDays','rentalRate','rentalFees','rentalFuel'].includes(field))return rental;return true;}
export function reviewState(book){
 const balances=book.accounts.filter(a=>a.active!==false&&!a.verified),uncategorized=book.transactions.filter(t=>!t.adjustment&&!t.paymentId&&!t.toAccountId&&(!t.category||t.category==='Other'));
 const dismissed=new Set(book.dismissedDuplicates||[]),groups=new Map();
 for(const t of book.transactions.filter(t=>!t.adjustment)){const key=JSON.stringify([t.accountId,t.date,t.name.trim().toLowerCase(),t.amount,t.direction,t.historical===true]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(t);}
 const duplicates=[...groups.values()].filter(g=>g.length>1).map(items=>({key:items.map(t=>t.id).sort().join('|'),items})).filter(g=>!dismissed.has(g.key));
 const matches=book.payments.filter(p=>p.fundingId&&!p.transactionId).map(payment=>({payment,candidates:book.transactions.filter(t=>!t.historical&&!t.adjustment&&!t.paymentId&&!t.toAccountId&&t.accountId===payment.fundingId&&t.direction==='Outflow'&&t.amount===payment.amount&&Math.abs(Date.parse(t.date)-Date.parse(payment.date))<=5*86400000)})).filter(x=>x.candidates.length);
 return {balances,uncategorized,duplicates,matches,history:book.reviewTransactions.length,count:balances.length+uncategorized.length+duplicates.length+matches.length+book.reviewTransactions.length};
}
export function reviewWarningItems(book){
 const review=reviewState(book),dismissed=new Set([...(book.dismissedReviewWarnings||[]),...(book.dismissedAttention||[])]);
 return [
  {kind:'other',title:'Transactions remain in Other',ids:review.uncategorized.map(t=>'category:'+t.id)},
  {kind:'duplicates',title:'Possible duplicate transactions',ids:review.duplicates.map(g=>'duplicate:'+g.key)},
  {kind:'payments',title:'Debt payments may match cash transactions',ids:review.matches.map(m=>'match:'+m.payment.id)},
  {kind:'imports',title:'Imported history needs review',ids:(book.reviewTransactions||[]).map(t=>'history:'+t.id)}
 ].map(item=>({...item,pending:item.ids.filter(id=>!dismissed.has(id))})).filter(item=>item.pending.length);
}
export function scheduleGaps(book,asOf){
 const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&Number.isFinite(Date.parse(d))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 const validFrequency=f=>['One-time','Weekly','Biweekly','Monthly','Quarterly','Yearly'].includes(f);
 const bills=(book.bills||[]).filter(b=>b.active!==false&&(!validDate(b.date)||!(Number(b.amount)>0)||!validFrequency(b.frequency)||b.frequency==='One-time'&&b.date<asOf&&!['Paid','Skipped','Cancelled'].includes(book.overrides?.[b.id+'@'+b.date]?.status)&&!(book.transactions||[]).some(t=>t.occurrenceKey===b.id+'@'+b.date)));
 const debts=(book.accounts||[]).filter(a=>a.active!==false&&a.kind!=='cash'&&Number(a.openingBalance||a.balance)>0&&(!validDate(a.dueDate)||!(Number(a.payment)>0)||!validFrequency(a.frequency)||a.frequency==='One-time'&&a.dueDate<asOf));
 return {bills,debts};
}
export function changeDescription(before,after,action){
 const labels={bill:'Expense Saved',income:'Income Saved',transaction:'Transaction Saved',need:'Need Saved',wish:'Wish Saved',goal:'Goal Saved',sinking:'Sinking Fund Saved',trip:'Trip Saved',settings:'Preferences Saved',cooling:'Waiting Period Saved',restoreBill:'Expense Restored',purgeBill:'Expense Deleted',occurrence:'Bill status saved',restoreOccurrence:'Bill occurrence restored',payment:'Payment recorded',matchPayment:'Payment matched',remove:'Record removed',reconcile:'Balance corrected',confirmBalance:'Account balance confirmed',account:'Account saved',checkin:'Weekly check-in completed',dismissDuplicate:'Marked as separate transactions',category:'Category updated'};
 const parts=[labels[action]||'Saved on this computer'];
 if(before.ready&&after.ready){const cents=Math.round((after.cash.safeToSpend-before.cash.safeToSpend)*100);if(cents){const value=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Math.abs(cents)/100);parts.push(`This week’s available spending ${cents>0?'increased':'decreased'} by ${value}`);}}
 return parts.join('. ')+'.';
}

export function attentionItems(book,data){
 const review=reviewState(book),items=[],dismissed=new Set(book.dismissedAttention||[]);
 const add=(item)=>{const ids=item.ids.filter(id=>!dismissed.has(id));if(ids.length)items.push({...item,ids});};
 const accountIds=review.balances.map(a=>'account:'+a.id);
 add({key:'accounts',title:'Review accounts',detail:`${accountIds.length} balance(s) need confirmation.`,action:'reviewAccounts',ids:accountIds});
 const incomes=(book.incomes||[]).filter(i=>i.active!==false),unconfirmed=incomes.filter(i=>!i.verified),omitted=incomes.filter(i=>i.verified&&!incomeForecastDecision(book,i,data.asOf).forecast);
 add({key:'income',title:'Review income sources',detail:`${unconfirmed.length} unconfirmed and ${omitted.length} paused source(s) are excluded from the forecast.`,action:'navigate',id:'settings/income',ids:[...unconfirmed,...omitted].map(i=>'income:'+i.id)});
 const {bills,debts}=scheduleGaps(book,data.asOf);
 add({key:'schedules',title:'Review schedules',detail:`${bills.length} bill(s) and ${debts.length} debt schedule(s) need a date, amount, or recurrence.`,action:'navigate',id:'calendar',ids:[...bills.map(b=>'bill:'+b.id),...debts.map(a=>'debt:'+a.id)]});
 if(data.plan?.forecast?.length&&!forecastReconciliation(data).balanced)add({key:'forecast',title:'Review forecast totals',detail:'Forecast totals do not match the scheduled amounts. Reload and inspect your schedules.',action:'navigate',id:'calendar',ids:['forecast:'+data.asOf]});
 if(!(book.checkins||[]).some(c=>c.week===weekStart(data.asOf)))add({key:'checkin',title:'Weekly check-in',detail:'Check balances, upcoming bills and this week’s work schedule.',action:'checkin',ids:['checkin:'+weekStart(data.asOf)]});
 if(data.ready&&data.cash.minimumCash<data.cash.bufferTarget)add({key:'buffer',title:'Protect your buffer',detail:'Your forecast falls below your protected buffer.',action:'explain',id:'forecast',ids:['buffer:'+weekStart(data.asOf)]});
 const needs=(book.needs||[]).filter(n=>!n.date&&!dismissed.has('need:'+n.id));add({key:'needs',title:'Plan your Needs',detail:['High','Medium','Low'].map(p=>`${needs.filter(n=>n.urgency===p).length} ${p.toLowerCase()}`).join(' · ')+ ' priority without dates.',action:'navigate',id:'plan/needs',ids:needs.map(n=>'need:'+n.id)});
 return items;
}
