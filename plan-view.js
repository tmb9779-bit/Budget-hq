// Read-only views of the same forecast used by Home. No allocations are saved.
const sum=items=>Math.round(items.reduce((s,x)=>s+x.amount,0)*100)/100;
// Reconcile the same events and balances used by the daily forecast. The cash buffer is
// a threshold for the projected balance, not another withdrawal from it.
export function forecastReconciliation(data){
 const round=n=>Math.round(n*100)/100;
 const opening=round(data.cash.balance-data.protectedSavings);
 const income=sum(data.nextPaychecks);
 const bills=sum(data.upcoming.filter(e=>e.type!=='Debt'));
 const debt=sum(data.upcoming.filter(e=>e.type==='Debt'));
 const ending=round(opening+income-bills-debt);
 const forecastEnding=data.plan.forecast.at(-1)?.cash??opening;
 return {cash:data.cash.balance,saved:data.protectedSavings,opening,income,bills,debt,ending,forecastEnding,balanced:Math.abs(ending-forecastEnding)<0.005};
}
export function buildPlan(book,data){
 const end=data.plan.forecast.at(-1)?.date||data.asOf,dates=[...new Set(data.nextPaychecks.map(p=>p.date))].sort();
 const periods=dates.map((date,i)=>{const next=dates[i+1],income=data.nextPaychecks.filter(p=>p.date===date),bills=data.upcoming.filter(e=>e.date>=date&&(next?e.date<next:e.date<=end)),points=data.plan.forecast.filter(p=>p.date>=date&&(next?p.date<next:p.date<=end));return {date,end:points.at(-1)?.date||date,income,bills,amount:sum(income),committed:sum(bills),remainder:sum(income)-sum(bills),headroom:points.length?Math.min(...points.map(p=>p.cash))-data.cash.bufferTarget:0,truncated:!next};});
 const before=data.upcoming.filter(e=>!dates.length||e.date<dates[0]);
 const shortfalls=data.ready?data.plan.forecast.filter(p=>p.cash<data.cash.bufferTarget):[];
 const receipts=book.transactions.filter(t=>t.incomeExpectation&&!t.historical&&!t.toAccountId&&t.direction==='Inflow').map(t=>({...t,expected:t.incomeExpectation.amount,difference:Math.round((t.amount-t.incomeExpectation.amount)*100)/100})).sort((a,b)=>b.date.localeCompare(a.date));
 const needs=book.needs.slice().sort((a,b)=>({High:0,Medium:1,Low:2}[a.urgency]??3)-({High:0,Medium:1,Low:2}[b.urgency]??3)||a.cost-b.cost||a.name.localeCompare(b.name));
 let next;if(data.unverified.length)next={label:'Confirm Your Account Balances',detail:'The forecast needs a reliable starting point.',action:'reviewAccounts'};else if(!data.ready)next={label:'Finish Planning Setup',detail:'Confirm due dates and your entered schedules.',action:'navigate',id:data.missingSchedule.length?'debt':'settings'};else{const due=data.nextPaychecks.find(p=>p.date===data.asOf);if(due)next={label:'Check Your Expected Paycheck',detail:`${due.name} is due. Record it only if the money has arrived.`,action:'receive',id:due.id};else if(!dates.length)next={label:'Add Your Next Paycheck',detail:'No income is scheduled within the next 60 days.',action:'income'};else if(shortfalls.length)next={label:'Review the Tightest Day',detail:'Your entered plan falls below the protected buffer.',action:'planDay',id:shortfalls.reduce((a,b)=>a.cash<=b.cash?a:b).date};else if(needs.length)next={label:'Plan Your Highest-Priority Need',detail:needs[0].name,action:'need',id:needs[0].id};else next={label:'Check a Purchase',detail:'See how a purchase would affect your current plan.',action:'afford'};}
 return {periods,before,beforeTotal:sum(before),shortfalls,receipts,needs,next};
}
