import {incomeSourceName} from './income-source.js';
import {goalTarget} from './financial-goals.js';
import {occurrences} from './schedule.js';
// Shared deterministic calculations. Projections never move money.
export const round=n=>Math.round((Number(n)||0)*100)/100;
const sum=a=>round(a.reduce((n,x)=>n+Number(x||0),0));
export const shift=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const gap=(a,b)=>Math.round((Date.parse(a)-Date.parse(b))/86400000);
const median=a=>{const s=a.slice().sort((a,b)=>a-b);return s.length?(s[Math.floor((s.length-1)/2)]+s[Math.ceil((s.length-1)/2)])/2:0;};
export const perMonth=f=>({Weekly:52/12,Biweekly:26/12,Monthly:1,Quarterly:1/3,Yearly:1/12,'One-time':0}[f]||0);
export function cleanHistory(book,asOf){
 const groups=new Map(),seen=new Set(),ignored=[];
 for(const t of book.transactions||[]){if(t.excluded||t.adjustment||t.date>asOf)continue;const stable=t.externalId||t.plaidTransactionId||t.id;if(stable&&seen.has(stable)){ignored.push(t.id);continue;}seen.add(stable);const key=JSON.stringify([t.accountId,t.date,String(t.name||'').trim().toLowerCase(),t.amount,t.direction,t.historical===true]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(t);}
 const rows=[];for(const g of groups.values()){const key=g.map(t=>t.id).sort().join('|');if(g.length>1&&!(book.dismissedDuplicates||[]).includes(key)){ignored.push(...g.map(t=>t.id));continue;}rows.push(...g);}return {rows,ignored};
}
export function incomeEstimate(book,income,asOf){
 const all=cleanHistory(book,asOf),start=shift(asOf,-55),cashIds=new Set(book.accounts.filter(a=>a.kind==='cash').map(a=>a.id)),rows=all.rows.filter(t=>cashIds.has(t.accountId)&&t.date>=start&&t.direction==='Inflow'&&!t.toAccountId&&t.category==='Income'&&(t.incomeExpectation?t.incomeExpectation.scheduleId===income.id:incomeSourceName(t.name).toLowerCase()===incomeSourceName(income.historyName||income.name).toLowerCase()));
 const rawAmounts=rows.map(t=>t.amount),middle=median(rawAmounts),deviation=median(rawAmounts.map(n=>Math.abs(n-middle))),outlierThreshold=Math.max(50,middle*.25,3*1.4826*deviation),candidates=rows.length>=3?rows.filter(t=>Math.abs(t.amount-middle)<=outlierThreshold):rows,automatic=candidates.length>=2?candidates:rows,overrides=income.depositEstimateOverrides||{},usedRows=rows.filter(t=>overrides[t.id]===true||overrides[t.id]!==false&&automatic.includes(t)),outliers=rows.filter(t=>!usedRows.includes(t));
 const amounts=usedRows.map(t=>t.amount),mean=amounts.length?sum(amounts)/amounts.length:0,sd=amounts.length?Math.sqrt(amounts.reduce((n,a)=>n+(a-mean)**2,0)/amounts.length):0,dates=[...new Set(rows.map(t=>t.date))].sort(),cadence=dates.length>1?median(dates.slice(1).map((d,i)=>gap(d,dates[i]))):null,cv=mean?sd/mean:0;
 const enough=rows.length>=3&&dates.length>=3&&usedRows.length>=2,lastDeposit=dates.at(-1)||null,missedPaydays=lastDeposit&&income.frequency!=='One-time'?occurrences(income.date,income.frequency,shift(lastDeposit,4),shift(asOf,-3)).filter(day=>!['Skipped','Cancelled'].includes(book.overrides?.[income.id+'@'+day]?.status)).length:0;
 const wage=round((income.hourlyRate||0)*(income.hoursPerWeek||0)*(income.takeHomePercent??100)/100*(income.frequency==='Weekly'?1:income.frequency==='Biweekly'?2:income.frequency==='Monthly'?52/12:0));
 const typical=round(mean),conservative=round(Math.max(0,mean-sd)),mode=income.estimateMode||'manual';
 const amount=mode==='wages'?wage:mode==='average'&&enough?typical:mode==='conservative'&&enough?conservative:round(income.amount);
 return {id:income.id,name:income.name,mode,amount,typical,conservative,weekly:round(sum(amounts)/8),volatilityBuffer:round(sd),cadence,confidence:enough?(usedRows.length<3?'Limited':cv<=.15?'High':cv<=.35?'Moderate':'Low'):'Insufficient history',count:usedRows.length,matchedCount:rows.length,outliers,enough,lastDeposit,missedPaydays,withheld:all.ignored.length,fallback:['average','conservative'].includes(mode)&&!enough,rows,variance:rows.filter(t=>t.incomeExpectation).map(t=>({date:t.date,expected:t.incomeExpectation.amount,actual:t.amount,difference:round(t.amount-t.incomeExpectation.amount)}))};
}
// Each income source chooses its own estimate. Legacy global choices are ignored.
export function incomeForecastDecision(book,income,asOf){const estimate=incomeEstimate(book,income,asOf),stale=estimate.enough&&estimate.missedPaydays>=2,reviewReason=stale?`${estimate.missedPaydays} expected pay periods have no matching deposit. Review this income source.`:'';
 if(estimate.mode==='conservative'&&stale)return {estimate,forecast:null,reason:'Cautious forecasting paused this source: '+reviewReason};
 return {estimate,forecast:estimate,reason:reviewReason|| (estimate.fallback?'Using your entered amount until deposit history builds.':'')};}
export function forecastIncomeEstimate(book,income,asOf){return incomeForecastDecision(book,income,asOf).forecast;}
export function spendingAnalysis(book,asOf){
 const history=cleanHistory(book,asOf),rows=history.rows.filter(t=>t.direction==='Outflow'&&!t.toAccountId&&!t.paymentId&&!['Transfer','Debt payment'].includes(t.category));
 const month=asOf.slice(0,7),d=new Date(asOf+'T12:00:00Z'),prior=Array.from({length:3},(_,i)=>new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-i-1,1)).toISOString().slice(0,7)),day=Number(asOf.slice(-2)),days=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
 const categories=[...new Set(rows.map(t=>t.category||'Other'))].sort().map(category=>{const group=rows.filter(t=>(t.category||'Other')===category),past=prior.map(m=>sum(group.filter(t=>t.date.startsWith(m)).map(t=>t.amount))),current=sum(group.filter(t=>t.date.startsWith(month)).map(t=>t.amount)),avg=sum(past)/3,projected=round(current/day*days);return {category,average:round(avg),low:round(avg*.8),high:round(avg*1.2),current,projected,historyMonths:past.filter(x=>x>0).length,status:avg&&projected>avg*1.2?'High':avg?'Within range':'No baseline'};});
 const merchants=new Map();for(const t of rows.filter(t=>t.date>=shift(asOf,-180))){const name=String(t.name||'').trim().toLowerCase();if(!merchants.has(name))merchants.set(name,[]);merchants.get(name).push(t);}
 const recurring=[],leaks=[];
 for(const [name,list]of merchants){const ordered=list.slice().sort((a,b)=>a.date.localeCompare(b.date)),recent=ordered.filter(t=>t.date>=shift(asOf,-29)&&t.amount<=40);if(recent.length>=3)leaks.push({name:ordered.at(-1).name,count:recent.length,total:sum(recent.map(t=>t.amount)),ids:recent.map(t=>t.id)});
  const dates=[...new Set(ordered.map(t=>t.date))];if(dates.length<3)continue;const gaps=dates.slice(1).map((v,i)=>gap(v,dates[i])),interval=median(gaps),regular=gaps.filter(g=>Math.abs(g-interval)<=Math.max(3,interval*.2)).length/gaps.length>=.7;if(!regular||interval<5||interval>95)continue;
  const latest=ordered.at(-1),typical=median(ordered.slice(0,-1).map(t=>t.amount)),change=round(latest.amount-typical),next=shift(latest.date,Math.round(interval)),late=asOf>shift(next,Math.max(3,Math.round(interval*.25)));recurring.push({name:latest.name,interval:Math.round(interval),latest:latest.amount,typical:round(typical),change,last:latest.date,next,signal:late?'May have stopped':change>Math.max(1,typical*.05)?'Price increase':dates.length===3?'New recurring pattern':'Stable',ids:ordered.map(t=>t.id)});
 }
 const heatmap={};for(const t of rows.filter(t=>t.date.startsWith(asOf.slice(0,4)))){const k=t.category||'Other';heatmap[k]??=Array(12).fill(0);heatmap[k][Number(t.date.slice(5,7))-1]=round(heatmap[k][Number(t.date.slice(5,7))-1]+t.amount);}
 return {categories,recurring,leaks:leaks.sort((a,b)=>b.total-a.total),heatmap,withheld:history.ignored.length,rows};
}
export function debtSimulation(accounts,extraWeekly=0,strategy='avalanche',priorityId=''){
 const debts=accounts.filter(a=>a.kind!=='cash'&&a.balance>0).map(a=>({...a,left:a.balance,monthly:(a.payment||0)*perMonth(a.frequency)}));const regular=sum(debts.map(a=>a.monthly)),budget=round(regular+Math.max(0,extraWeekly)*52/12),schedule=[];let interest=0;
 if(!debts.length)return {months:0,interest:0,total:0,paidOff:[],schedule:[],limited:false};
 for(let month=1;month<=600;month++){let available=budget;for(const a of debts.filter(a=>a.left>0)){const charge=round(a.left*(a.apr||0)/1200);interest+=charge;a.left+=charge;const paid=Math.min(a.left,a.monthly,available);a.left=round(a.left-paid);available=round(available-paid);if(a.left<=.005&&!a.paidMonth)a.paidMonth=month;}
  const ordered=debts.filter(a=>a.left>0).sort((a,b)=>a.id===priorityId?-1:b.id===priorityId?1:strategy==='snowball'?a.left-b.left:(b.apr||0)-(a.apr||0)||a.left-b.left);
  for(const a of ordered){const paid=Math.min(a.left,available);a.left=round(a.left-paid);available=round(available-paid);if(a.left<=.005&&!a.paidMonth)a.paidMonth=month;}
  schedule.push({month,balance:sum(debts.map(a=>a.left))});if(schedule.at(-1).balance<=.005)return {months:month,interest:round(interest),total:budget,paidOff:debts.map(a=>({id:a.id,name:a.name,month:a.paidMonth})),schedule,limited:false};
 }return {months:null,interest:round(interest),total:budget,paidOff:debts.filter(a=>a.paidMonth).map(a=>({id:a.id,name:a.name,month:a.paidMonth})),schedule,limited:true};
}
// Wishes wait only while the money is not there. The test is the projected low point over the
// paycheck window (or today's cash when there is no forecast yet), not today's balance alone,
// so saving for wishes starts as soon as the projection clears the buffer.
export function wishesPausedForBuffer(data,projectedLow){
 if(data?.pauseWishesBelowBuffer===false)return false;
 const low=Number.isFinite(projectedLow)?projectedLow:Number.isFinite(data?.plan?.forecast?.[0]?.cash)?Math.min(...data.plan.forecast.map(p=>p.cash)):data?.cash?.balance;
 return Number.isFinite(low)&&low<data.cash.bufferTarget;
}
export function allocatePaycheck(book,data,{reserved=0}={}){
 const next=data.nextPaychecks.map(x=>x.date).sort()[0];if(!next)return null;const after=data.nextPaychecks.map(x=>x.date).filter(d=>d>next).sort()[0],points=data.plan.forecast.filter(p=>p.date>=next&&(!after||p.date<after)),amount=sum(data.nextPaychecks.filter(p=>p.date===next).map(p=>p.amount)),required=sum(data.upcoming.filter(e=>e.date>=next&&(!after||e.date<after)).map(e=>e.amount));
 // headroom is the projected low point over this paycheck window above your buffer, so a surplus is
 // only suggested once the projection clears the buffer. A dip below the buffer before payday no longer
 // cancels the whole plan; running out of cash entirely still does.
 const headroom=points.length?Math.max(0,Math.min(...points.map(p=>p.cash-reserved))-data.cash.bufferTarget):0,surplus=data.ready&&!data.plan.forecast.some(p=>p.date<next&&p.cash<0)?Math.max(0,Math.min(amount-required,headroom)):0,buffer=round(Math.max(0,amount-required-surplus)),weights=book.settings.allocations||{debt:35,sinking:15,goals:10,wishes:25,flex:15},parts={};let used=0;const keys=['debt','sinking','goals','wishes','flex'];for(const k of keys){parts[k]=round(surplus*weights[k]/100);used+=parts[k];}parts.flex=round(parts.flex+surplus-used);
 // Empty/completed/paused destinations cannot receive a suggested allocation.
 const eligible=(g,list)=>g.active!==false&&!(list==='goals'&&g.goalType==='debt')&&Number(g.saved||0)<Number(list==='goals'?goalTarget(g,book):g.cost||0)&&effectiveSavingsStyle(g,data.asOf)!=='Pause'&&!(list==='wishes'&&wishPauseState(g,book,data.asOf).manualPaused);
 const available={debt:data.accounts.some(a=>a.active!==false&&a.kind!=='cash'&&a.balance>0),goals:(book.goals||[]).some(g=>eligible(g,'goals')),sinking:(book.sinking||[]).some(g=>eligible(g,'sinking')),wishes:(book.wishes||[]).some(g=>eligible(g,'wishes'))};
 for(const k of ['debt','goals','sinking','wishes'])if(!available[k]){parts.flex=round(parts.flex+parts[k]);parts[k]=0;}
 // Over this paycheck window the projection already clears the buffer when there is a surplus.
 const projectedLow=points.length?Math.min(...points.map(p=>p.cash)):data.cash.balance;
 const wishBufferHold=wishesPausedForBuffer(data,projectedLow)?parts.wishes:0;if(wishBufferHold)parts.wishes=0;
 return {date:next,until:points.at(-1)?.date||next,truncated:!after,amount,required,buffer:round(buffer+wishBufferHold),surplus:round(surplus-wishBufferHold),parts,weights,wishBufferHold,shortfall:Math.max(0,round(required-amount))};
}
export function effectiveSavingsStyle(g,asOf){
 if(g.style==='Pause'&&g.pauseUntil&&g.pauseUntil<=asOf)return g.resumeStyle==='Custom'?'Custom':'Automatic';
 return g.style||'Automatic';
}
export function wishPauseState(w,book,asOf,data){
 const manual=effectiveSavingsStyle(w,asOf)==='Pause',dates=(book.cooling||[]).filter(c=>c.date>asOf&&(c.wishId===w.id||!c.wishId&&c.name===w.name)).map(c=>c.date),bufferPaused=wishesPausedForBuffer(data);
 if(manual&&!w.pauseUntil)return {paused:true,manualPaused:true,bufferPaused,until:''};
 if(manual)dates.push(w.pauseUntil);
 return {paused:bufferPaused||dates.length>0,manualPaused:dates.length>0,bufferPaused,until:dates.sort().at(-1)||''};
}
export function savingsPlans(book,data){
 const budget=allocatePaycheck(book,data),weeks=budget?Math.max(1,(gap(budget.until,budget.date)+1)/7):1,groups={wishes:book.wishes.map(w=>wishPauseState(w,book,data.asOf,data).paused?{...w,style:'Pause',pauseUntil:''}:w),goals:book.goals.filter(g=>g.goalType!=='debt').map(g=>({...g,cost:goalTarget(g,book)})),sinking:book.sinking},out=[];
 for(const [list,targets]of Object.entries(groups)){const pool=budget?round(budget.parts[list]/weeks):0,custom=sum(targets.filter(g=>effectiveSavingsStyle(g,data.asOf)==='Custom'&&g.saved<g.cost).map(g=>g.weekly)),autos=targets.filter(g=>effectiveSavingsStyle(g,data.asOf)==='Automatic'&&g.saved<g.cost),available=Math.max(0,pool-custom),selected=book.settings.priorityTarget,focused=autos.find(g=>selected?.list===list&&selected.id===g.id),total=autos.length+(focused?1:0);
  for(const g of targets){const rawWeekly=effectiveSavingsStyle(g,data.asOf)==='Pause'||g.saved>=g.cost?0:effectiveSavingsStyle(g,data.asOf)==='Custom'?g.weekly:available*(focused?.id===g.id?2:1)/(total||1),weekly=round(rawWeekly),remaining=Math.max(0,g.cost-g.saved),weeksNeeded=weekly>0?Math.ceil(remaining/weekly):Infinity,ready=remaining<=0?data.asOf:weeksNeeded<=5200?shift(data.asOf,weeksNeeded*7):null;out.push({id:g.id,list,name:g.name,weekly,ready,remaining:round(remaining),overallocated:custom>pool,pool,focus:focused?.id===g.id});}
 }return out;
}
export function activityTotals(book,data,start,end){
 const history=cleanHistory(book,data.asOf),rows=history.rows.filter(t=>t.date>=start&&t.date<=end),cashIds=new Set(book.accounts.filter(a=>a.kind==='cash').map(a=>a.id)),income=sum(rows.filter(t=>cashIds.has(t.accountId)&&t.direction==='Inflow'&&!t.toAccountId&&t.category==='Income').map(t=>t.amount)),spending=sum(rows.filter(t=>t.direction==='Outflow'&&!t.toAccountId&&!t.paymentId&&!['Transfer','Debt payment'].includes(t.category)).map(t=>t.amount)),payments=sum(book.payments.filter(p=>p.date>=start&&p.date<=end&&p.date<=data.asOf).map(p=>p.amount)),unlinkedDebt=sum(rows.filter(t=>t.direction==='Outflow'&&!t.paymentId&&t.category==='Debt payment').map(t=>t.amount));
 const cashFlow=sum(rows.filter(t=>cashIds.has(t.accountId)&&!t.toAccountId&&t.category!=='Transfer').map(t=>t.direction==='Inflow'?t.amount:-t.amount)),directCashPayments=sum(book.payments.filter(p=>p.date>=start&&p.date<=end&&p.date<=data.asOf&&cashIds.has(p.fundingId)&&!p.transactionId).map(p=>p.amount));
 return {income,spending,payments:round(payments+unlinkedDebt),net:round(cashFlow-directCashPayments),withheld:history.ignored.length,recordCount:rows.length};
}
export function monthlyReport(book,data,month){return {month,...activityTotals(book,data,month+'-01',month+'-31')};}
export function analyzeBudget(book,data){const income=book.incomes.filter(i=>i.active!==false).map(i=>incomeEstimate(book,i,data.asOf)),spending=spendingAnalysis(book,data.asOf),allocation=allocatePaycheck(book,data),savings=savingsPlans(book,data),baseline=debtSimulation(data.accounts,0,book.settings.debtStrategy||'avalanche',book.settings.priorityDebt||''),issues=[];
 for(const c of spending.categories.filter(c=>c.status==='High'))issues.push({id:'pace:'+c.category+':'+data.asOf.slice(0,7),title:c.category+' is above its usual pace',detail:`Projected ${c.projected}; usual upper range ${c.high}.`,action:'transactions'});
 for(const m of spending.recurring.filter(m=>m.signal!=='Stable'))issues.push({id:'merchant:'+m.name+':'+m.last,title:m.name+': '+m.signal,detail:`Latest ${m.latest}, typical ${m.typical}. Expected around ${m.next}. Pattern only; confirm before changing a bill.`,action:'calendar'});
 for(const m of spending.leaks.slice(0,3))issues.push({id:'leak:'+m.name+':'+data.asOf.slice(0,7),title:'Small purchases at '+m.name,detail:`${m.count} purchases of 40 or less total ${m.total} over 30 days.`,action:'transactions'});
 if(data.ready&&data.cash.minimumCash<data.cash.bufferTarget)issues.push({id:'buffer:'+data.cash.minimumCashDate,title:'Protect your buffer',detail:`Lowest projected cash ${data.cash.minimumCash} on ${data.cash.minimumCashDate}.`,action:'plan'});
 if(allocation?.parts.debt>0)issues.push({id:'extra-debt:'+allocation.date,title:'Room for an extra debt payment',detail:`Your next paycheck plan assigns ${allocation.parts.debt} to extra debt. Preview before paying.`,action:'debt'});
 const incomeConf=income.length?income.reduce((n,i)=>n+(i.confidence==='High'?100:i.confidence==='Moderate'?65:i.confidence==='Low'?30:0),0)/income.length:0,confidence=Math.round((data.ready?50:0)+incomeConf*.3+(spending.withheld?0:10)+(book.reviewTransactions.length?0:10));
 const accountIds=new Set(book.accounts.map(a=>a.id)),diagnostics=[];for(const t of book.transactions)if(!accountIds.has(t.accountId)||t.toAccountId&&!accountIds.has(t.toAccountId))diagnostics.push('Transaction '+t.name+' references a missing account.');for(const p of book.payments){if(!accountIds.has(p.debtId)||p.fundingId&&!accountIds.has(p.fundingId))diagnostics.push('Payment '+(p.debtName||p.id)+' references a missing account.');if(p.transactionId&&!book.transactions.some(t=>t.id===p.transactionId&&t.paymentId===p.id))diagnostics.push('Payment '+(p.debtName||p.id)+' has a broken transaction link.');}if(data.protectedSavings>data.cash.balance)diagnostics.push('Reserved savings exceed your cash balance. Review targets and accounts.');for(const a of data.accounts)if(gap(data.asOf,a.confirmedAt||a.balanceDate)>14)diagnostics.push(a.name+' has not been confirmed in more than 14 days.');
 return {income,spending,allocation,savings,baseline,confidence,diagnostics,issues:issues.filter(i=>{const state=book.insightStates?.[i.id];return !state||state.status==='snoozed'&&state.until<=data.asOf;}),reports:[...new Set([data.asOf.slice(0,7),...spending.rows.map(t=>t.date.slice(0,7)),...book.transactions.filter(t=>t.category==='Income'&&t.direction==='Inflow'&&t.date<=data.asOf&&book.accounts.some(a=>a.id===t.accountId&&a.kind==='cash')).map(t=>t.date.slice(0,7)),...book.payments.filter(p=>p.date<=data.asOf).map(p=>p.date.slice(0,7))])].sort().reverse().map(m=>monthlyReport(book,data,m))};}

// Suggestions are evidence only: never create payments or move bank balances.
export const recurringMerchant=name=>String(name||'').normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function recurringBillSuggestions(book,asOf,{allowIncomeGaps=false}={}){return allowIncomeGaps?incomePatterns(book,asOf):billPatterns(book,asOf);}

// ---- Recurring bills ----
// Bank descriptions add reference numbers, dates, store numbers and payment-processor prefixes
// ("PAYPAL *HULU", "AMAZON PRIME*2K4LM", "COMCAST 0412 #88213"). merchantKey keeps the stable words
// so every charge from one bill lands in the same group.
const PROCESSORS=new Set(['paypal','pp','sq','sqc','tst','sp','py','in','pypl']);
const STATES=new Set('al ak az ar ca co ct de fl ga hi ia id il in ks ky la ma md me mi mn mo ms mt nc nd ne nh nj nm nv ny oh ok or pa ri sc sd tn tx ut va vt wa wi wv wy dc'.split(' '));
const NOISE=new Set(['pos','ach','debit','card','purchase','recurring','payment','pymt','pmt','autopay','auto','online','web','ppd','id','checkcard','withdrawal','bill','billing','des','indn','www','com','net','org','co','inc','llc','ltd']);
export function merchantKey(name){
 let text=String(name||'').normalize('NFKC').toLowerCase();
 const star=text.indexOf('*');
 if(star>0){const before=text.slice(0,star).trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean);text=before.length&&PROCESSORS.has(before.at(-1))?text.slice(star+1):text.slice(0,star);}
 // Location suffixes ("… LOS GATOS CA") come and go between charges; state codes after the first word are dropped.
 const words=text.split(/[^\p{L}\p{N}]+/u).filter((w,i)=>w.length>1&&!/\d/.test(w)&&!NOISE.has(w)&&!PROCESSORS.has(w)).filter((w,i)=>i===0||!STATES.has(w));
 return words.slice(0,3).join(' ')||recurringMerchant(name);
}
// True when two bank descriptions name the same business, allowing for extra words
// ("ALAMO DRAFTHOUSE PAYROLL" and "Alamo Drafthouse").
export function sameMerchant(a,b){
 const x=merchantKey(a),y=merchantKey(b);
 return !!x&&!!y&&(x===y||x.length>=4&&y.length>=4&&(x.startsWith(y+' ')||y.startsWith(x+' ')));
}
const addMonths=(date,months,day)=>{const d=new Date(date+'T12:00:00Z'),y=d.getUTCFullYear(),m=d.getUTCMonth()+months,last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return new Date(Date.UTC(y,m,Math.min(day,last),12)).toISOString().slice(0,10);};
const monthIndex=date=>Number(date.slice(0,4))*12+Number(date.slice(5,7))-1;
const PERIODS=[
 {frequency:'Weekly',days:7,tolerance:2},
 {frequency:'Biweekly',days:14,tolerance:3},
 {frequency:'Monthly',months:1,tolerance:5},
 {frequency:'Quarterly',months:3,tolerance:7},
 {frequency:'Yearly',months:12,tolerance:10}
];
const spread=amounts=>{const m=median(amounts);return m>0?(Math.max(...amounts)-Math.min(...amounts))/m:0;};
const isMonthEnd=date=>{const d=new Date(date+'T12:00:00Z');return d.getUTCDate()===new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();};

// Lines charges up with a schedule anchored on one of them. Each charge must land within the tolerance
// of a scheduled date, no two in the same period; periods with no charge count as missing.
function fitSchedule(dates,period,anchor){
 const monthEnd=period.months&&dates.every(isMonthEnd),day=monthEnd?31:Number(anchor.slice(-2));
 const scheduled=k=>period.days?shift(anchor,k*period.days):addMonths(anchor,k*period.months,day);
 const slots=[];let deviation=0;
 for(const date of dates){
  const guess=period.days?Math.round(gap(date,anchor)/period.days):Math.round((monthIndex(date)-monthIndex(anchor))/period.months);
  let best=null;for(const k of [guess-1,guess,guess+1]){const off=Math.abs(gap(date,scheduled(k)));if(!best||off<best.off)best={k,off};}
  if(best.off>period.tolerance)return null;slots.push(best.k);deviation+=best.off;
 }
 if(new Set(slots).size!==slots.length)return null;
 const first=Math.min(...slots),last=Math.max(...slots);
 return {missing:last-first+1-slots.length,deviation,next:scheduled(last+1)};
}

// Finds the most regular schedule for one series of charges, or null.
function detectSchedule(series,otherDates){
 const dates=series.map(t=>t.date),amounts=series.map(t=>t.amount);
 for(const period of PERIODS){
  const twoCharges=series.length===2;
  if(twoCharges){
   // Two charges are enough only for monthly-or-longer bills with the same amount (yearly: within 20%),
   // and only when nothing else was bought from this merchant in between.
   if(period.days)continue;
   if(period.months===12?spread(amounts)>0.2:Math.abs(amounts[0]-amounts[1])>=0.01)continue;
   if(otherDates.some(d=>d>dates[0]&&d<dates[1]))continue;
  }else if(series.length<3)return null;
  // Weekly and biweekly bills have steady amounts; shopping trips do not.
  if(period.days&&spread(amounts)>0.2)continue;
  let best=null;
  for(const anchor of dates){const fit=fitSchedule(dates,period,anchor);if(fit&&(!best||fit.missing<best.missing||fit.missing===best.missing&&fit.deviation<best.deviation))best=fit;}
  if(!best||best.missing>(twoCharges?0:1))continue;
  return {...period,...best,step:period.days||period.months*30.44};
 }
 return null;
}

// Splits one merchant's charges into same-price series (for example two subscriptions from one company).
// Prices must match to the cent: subscriptions charge a set price, everyday purchases rarely repeat exactly.
function amountClusters(charges){
 const sorted=charges.slice().sort((a,b)=>a.amount-b.amount),clusters=[];
 for(const t of sorted){const c=clusters.at(-1);if(c&&t.amount-c[0].amount<0.01)c.push(t);else clusters.push([t]);}
 return clusters.map(c=>c.sort((a,b)=>a.date.localeCompare(b.date)));
}

// Bill name for the suggestion, without reference numbers ("COMCAST CABLE COMM 0912 #94410" → "COMCAST CABLE COMM").
const displayName=name=>String(name||'').split(/\s+/).filter(w=>!/\d/.test(w)&&w!=='#').join(' ').trim()||String(name||'');

function billPatterns(book,asOf){
 const groups=new Map(),accounts=new Map((book.accounts||[]).map(a=>[a.id,a]));
 for(const t of cleanHistory(book,asOf).rows){
  const category=String(t.category).toLowerCase();
  if(t.pending||t.direction!=='Outflow'||t.toAccountId||t.paymentId||!(t.amount>0)||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))||category==='income'||!accounts.has(t.accountId)||accounts.get(t.accountId).kind==='loan')continue;
  const merchant=merchantKey(t.merchantName||t.name);if(!merchant)continue;
  const key=JSON.stringify([t.accountId,merchant]);if(!groups.has(key))groups.set(key,{merchant,charges:[]});groups.get(key).charges.push(t);
 }
 // Bank descriptions sometimes carry a city and state ("AFFIRM" and "AFFIRM INC SAN FRANCISCO CA").
 // A key that only adds words to a shorter key from the same account is the same merchant.
 const keys=[...groups.keys()].sort((a,b)=>groups.get(a).merchant.length-groups.get(b).merchant.length);
 for(const key of keys){
  if(!groups.has(key))continue;const {merchant}=groups.get(key),account=JSON.parse(key)[0];
  for(const other of keys){
   if(other===key||!groups.has(other))continue;const group=groups.get(other);
   if(JSON.parse(other)[0]===account&&group.merchant.startsWith(merchant+' ')){groups.get(key).charges.push(...group.charges);groups.delete(other);}
  }
 }
 const results=[];
 for(const [groupKey,{merchant,charges}] of groups){
  const all=charges.sort((a,b)=>a.date.localeCompare(b.date)),allDates=all.map(t=>t.date);
  // The same amount twice on one day may be one charge imported twice; leave that for duplicate review.
  const sameDay=new Map();let duplicate=false;for(const t of all){const k=t.date+'|'+t.amount;if(sameDay.has(k))duplicate=true;sameDay.set(k,true);}
  if(duplicate)continue;
  // Try the merchant's charges as one bill first; if that fails, try each steady amount on its own.
  let found=[];const whole=all.slice(-12),fit=detectSchedule(whole,[]);
  if(fit&&new Set(whole.map(t=>t.date)).size===whole.length)found=[{series:whole,fit,key:groupKey,cluster:false}];
  else{const clusters=amountClusters(all).filter(c=>c.length>=2);if(clusters.length)for(const c of clusters){const series=c.slice(-12),seriesFit=detectSchedule(series,allDates.filter(d=>!series.some(t=>t.date===d)));if(seriesFit)found.push({series,fit:seriesFit,key:JSON.stringify([series.at(-1).accountId,merchant,round(median(series.map(t=>t.amount)))]),cluster:clusters.length>1});}}
  for(const {series,fit,key,cluster} of found){
   const last=series.at(-1),transfer=series.some(t=>String(t.category).toLowerCase()==='transfer'),loan=series.some(t=>['debt payment','debt'].includes(String(t.category).toLowerCase()));
   // Transfers are included only at a fixed amount (rent, a loan to family); anything else is too uncertain.
   if(transfer&&spread(series.map(t=>t.amount))>0.01)continue;
   // Do not guess that a long-stopped subscription still exists.
   if(gap(asOf,fit.next)>Math.max(3,Math.round(fit.step*.35)))continue;
   const legacyKey=JSON.stringify([last.accountId,recurringMerchant(last.merchantName||last.name)]),typical=median(series.map(t=>t.amount));
   const sameName=name=>{const a=merchantKey(name),b=merchant;return a===b||recurringMerchant(name)===recurringMerchant(last.merchantName||last.name)||(a.length>=4&&b.length>=4&&(a.startsWith(b+' ')||b.startsWith(a+' ')));};
   if((book.permanentRecurringDismissals||[]).includes(JSON.stringify([last.accountId,recurringMerchant(last.merchantName||last.name)])))continue;
   const existing=(book.bills||[]).some(b=>b.active!==false&&b.frequency!=='One-time'&&(b.recurringSource===key||b.recurringSource===legacyKey||sameName(b.name)&&(!cluster||Math.abs(Number(b.amount)-typical)<=Math.max(1,typical*.2))));
   const debt=(book.accounts||[]).some(a=>a.kind!=='cash'&&a.payment>0&&sameName(a.name));
   if(existing||debt)continue;
   const low=Math.min(...series.map(t=>t.amount)),high=Math.max(...series.map(t=>t.amount)),count=series.length;
   const notes=[count===2&&'Seen twice so far.',fit.missing&&'One expected charge is missing from your history.',transfer&&'Paid by bank transfer: confirm this is a bill and not a move between your own accounts.',loan&&'Recorded as a loan or installment payment, such as a buy-now-pay-later plan.',cluster&&'One of several charges from this merchant.'].filter(Boolean);
   const name=displayName(last.merchantName||last.name)+(cluster?' · '+round(typical).toFixed(2):'');
   results.push({key,legacyKey,name,accountId:last.accountId,accountName:accounts.get(last.accountId).name,frequency:fit.frequency,cadenceNeedsReview:false,
    confidence:count===2?'Low':fit.missing||transfer||loan?'Medium':'High',note:notes.join(' '),
    amount:last.amount,category:last.category,next:fit.next<asOf?asOf:fit.next,expected:fit.next,low,high,variable:high-low>Math.max(1,typical*.05),
    evidence:series.map(t=>({id:t.id,date:t.date,amount:t.amount})),dismissed:(book.dismissedRecurring||[]).includes(key)||(book.dismissedRecurring||[]).includes(legacyKey)});
  }
 }
 return results.sort((a,b)=>a.next.localeCompare(b.next)||a.name.localeCompare(b.name));
}

// ---- Recurring income (unchanged cadence rules; used by recurringIncomeSuggestions) ----
function incomePatterns(book,asOf){const allowIncomeGaps=true;
 const groups=new Map(),accounts=new Map((book.accounts||[]).map(a=>[a.id,a]));
 for(const t of cleanHistory(book,asOf).rows){
  if(t.pending||t.direction!=='Outflow'||t.toAccountId||t.paymentId||!(t.amount>0)||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))||['transfer','debt payment','debt','income'].includes(String(t.category).toLowerCase())||!accounts.has(t.accountId)||accounts.get(t.accountId).kind==='loan')continue;
  const merchant=recurringMerchant(t.merchantName||t.name);if(!merchant)continue;
  const key=JSON.stringify([t.accountId,merchant]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(t);
 }
 const results=[];
 for(const [key,all]of groups){
  const ordered=all.sort((a,b)=>a.date.localeCompare(b.date)).slice(-8),dates=ordered.map(t=>t.date);
  // Multiple same-day charges may be separate purchases or unmatched duplicates.
  if(ordered.length<3||new Set(dates).size!==dates.length)continue;
  const gaps=dates.slice(1).map((d,i)=>gap(d,dates[i])),interval=median(gaps),last=ordered.at(-1),merchant=recurringMerchant(last.merchantName||last.name);
  let frequency,step,cadenceNeedsReview=false;
  for(const [f,n,tolerance]of [['Weekly',7,2],['Biweekly',14,3],['Monthly',30.44,4],['Quarterly',91.31,7],['Yearly',365.25,10]])if(Math.abs(interval-n)<=tolerance&&gaps.every(g=>Math.abs(g-n)<=tolerance)){frequency=f;step=n;break;}
  // Income may skip a pay period. Require a directly observed base interval,
  // and allow at most one missing period per gap; never invent deposits.
  if(!frequency&&allowIncomeGaps){
   for(const [f,n,tolerance] of [['Weekly',7,2],['Biweekly',14,3]]){
    if(gaps.some(g=>Math.abs(g-n)<=tolerance)&&gaps.every(g=>Math.abs(g-n)<=tolerance||Math.abs(g-2*n)<=tolerance)){
     frequency=f;step=n;cadenceNeedsReview=true;break;
    }
   }
  }
  if(!frequency)continue;
  let next;
  if(step<20)next=shift(last.date,Math.round(step));else{
   const d=new Date(last.date+'T12:00:00Z'),months={Monthly:1,Quarterly:3,Yearly:12}[frequency],month=d.getUTCMonth()+months,year=d.getUTCFullYear();
   const monthEnd=dates.every(s=>{const v=new Date(s+'T12:00:00Z');return v.getUTCDate()===new Date(Date.UTC(v.getUTCFullYear(),v.getUTCMonth()+1,0)).getUTCDate();});
   const day=monthEnd?31:Math.max(...dates.map(s=>Number(s.slice(-2))));
   next=new Date(Date.UTC(year,month,Math.min(day,new Date(Date.UTC(year,month+1,0)).getUTCDate()))).toISOString().slice(0,10);
  }
  // Do not guess that a long-stopped subscription still exists.
  if(gap(asOf,next)>Math.max(3,Math.round(step*.2)))continue;
  const existing=(book.bills||[]).some(b=>b.active!==false&&b.frequency!=='One-time'&&(b.recurringSource===key||recurringMerchant(b.name)===merchant));
  const debt=(book.accounts||[]).some(a=>a.kind!=='cash'&&a.payment>0&&recurringMerchant(a.name)===merchant);
  if(existing||debt)continue;
  const low=Math.min(...ordered.map(t=>t.amount)),high=Math.max(...ordered.map(t=>t.amount));
  results.push({key,name:last.merchantName||last.name,accountId:last.accountId,accountName:accounts.get(last.accountId).name,frequency,cadenceNeedsReview,amount:last.amount,category:last.category,next:next<asOf?asOf:next,expected:next,low,high,variable:high-low>Math.max(1,median(ordered.map(t=>t.amount))*.05),evidence:ordered.map(t=>({id:t.id,date:t.date,amount:t.amount})),dismissed:(book.dismissedRecurring||[]).includes(key)});
 }
 return results.sort((a,b)=>a.next.localeCompare(b.next)||a.name.localeCompare(b.name));
}

// Income suggestions reuse cadence checks, with a separate deposit-only evidence set.
export function recurringIncomeSuggestions(book,asOf){
 const cash=new Set((book.accounts||[]).filter(a=>a.kind==='cash'&&a.active!==false).map(a=>a.id));
 const transactions=(book.transactions||[]).filter(t=>t.direction==='Inflow'&&cash.has(t.accountId)&&!t.toAccountId&&!t.paymentId&&!t.adjustment&&!t.excluded&&!t.pending&&t.category==='Income'&&!/\b(refund|reversal|transfer|cashback|cash back|reimbursement)\b/i.test(t.name||''));
 const projected={...book,accounts:(book.accounts||[]).filter(a=>cash.has(a.id)),transactions:transactions.map(t=>({...t,name:incomeSourceName(t.name),merchantName:incomeSourceName(t.name),direction:'Outflow',category:'Other'})),bills:(book.incomes||[]).map(i=>({...i,name:incomeSourceName(i.historyName||i.name),frequency:'Monthly',recurringSource:i.recurringSource})),dismissedRecurring:book.dismissedIncomeSuggestions||[]};
 return recurringBillSuggestions(projected,asOf,{allowIncomeGaps:true}).map(s=>({...s,amount:round(median(s.evidence.map(t=>t.amount))),latest:s.amount}));
}

// Goal projections reserve each contribution across subsequent paycheck windows.
// Earlier shortfalls do not prevent saving after a later paycheck restores cash.
export function projectGoalSavings(book,data){
 const points=data.plan.forecast.slice(0,60),dates=[...new Set(data.nextPaychecks.map(p=>p.date))].filter(d=>points.some(p=>p.date===d)).sort();
 const goals=(book.goals||[]).filter(g=>g.active!==false&&g.goalType!=='debt');
 const alreadySaved=sum(goals.map(g=>g.saved)),funded=new Map(goals.map(g=>[g.id,Number(g.saved)||0])),completed=new Map();let reserved=0;
 const rows=dates.map((date,index)=>{
  const eligible=goals.filter(g=>effectiveSavingsStyle(g,date)!=='Pause'&&funded.get(g.id)<goalTarget(g,book));
  const remaining=sum(eligible.map(g=>goalTarget(g,book)-funded.get(g.id)));
  const nextDate=dates[index+1];
  const tail=points.filter(p=>p.date>=date&&(!nextDate||p.date<nextDate)).map(p=>({...p,cash:round(p.cash-reserved)}));
  const amount=sum(data.nextPaychecks.filter(p=>p.date===date).map(p=>p.amount));
  const headroom=Math.max(0,round(Math.min(...tail.map(p=>p.cash))-data.cash.bufferTarget));
  const allocation=allocatePaycheck(book,{...data,nextPaychecks:data.nextPaychecks.filter(p=>p.date>=date),asOf:date},{reserved});
  const contribution=data.ready&&remaining>0?round(Math.min(remaining,allocation?.parts.goals||0,headroom)):0;
  // Allocate to outstanding targets in priority order; this prevents completed
  // targets from receiving the same forecasted savings on every paycheck.
  let left=contribution;
  const selected=book.settings.priorityTarget,automatic=eligible.filter(g=>effectiveSavingsStyle(g,date)==='Automatic'),custom=eligible.filter(g=>effectiveSavingsStyle(g,date)==='Custom');
  // Custom targets receive their requested share first; the rest is split by
  // automatic weights, with the chosen Next Target receiving two shares.
  for(const g of custom){const n=Math.min(left,Math.max(0,Number(g.weekly)||0),goalTarget(g,book)-funded.get(g.id));funded.set(g.id,round(funded.get(g.id)+n));left=round(left-n);}
  while(left>.009&&automatic.some(g=>funded.get(g.id)<goalTarget(g,book)-.009)){
   const open=automatic.filter(g=>funded.get(g.id)<goalTarget(g,book)-.009),weight=g=>selected?.list==='goals'&&selected.id===g.id?2:1,total=open.reduce((n,g)=>n+weight(g),0),share=left;let used=0;
   for(const g of open){const n=Math.min(goalTarget(g,book)-funded.get(g.id),round(share*weight(g)/total));funded.set(g.id,round(funded.get(g.id)+n));used=round(used+n);}
   if(used<.01)break;left=round(left-used);
  }
  for(const g of eligible)if(funded.get(g.id)>=goalTarget(g,book)&&!completed.has(g.id))completed.set(g.id,date);
  const applied=round(contribution-left);
  reserved=round(reserved+applied);
  return {date,amount,contribution:applied,projectedSaved:round(alreadySaved+reserved),lowestAfter:round(Math.min(...tail.map(p=>p.cash))-applied),reason:!data.ready?'Confirm planning setup':!remaining?'No active unfunded goals':!headroom?'Protecting your buffer':applied?'Goals allocation reserved':!allocation?.parts.goals?'No Goals allocation':'No paycheck surplus available'};
 });
 return {alreadySaved,projectedContributions:reserved,projectedSaved:round(alreadySaved+reserved),rows,end:points.at(-1)?.date||data.asOf,goals:goals.map(g=>({id:g.id,list:'goals',projected:round(funded.get(g.id)-(Number(g.saved)||0)),projectedSaved:funded.get(g.id),ready:completed.get(g.id)||null,forecastEnd:points.at(-1)?.date||data.asOf}))};
}

// Wish projections use the same paycheck windows, buffer checks, and priority
// weighting as goal projections, while keeping each wish's remaining cost capped.
export function projectWishSavings(book,data){
 const points=data.plan.forecast.slice(0,60),dates=[...new Set(data.nextPaychecks.map(p=>p.date))].filter(d=>points.some(p=>p.date===d)).sort();
 const wishes=(book.wishes||[]).filter(w=>w.active!==false),alreadySaved=sum(wishes.map(w=>w.saved)),funded=new Map(wishes.map(w=>[w.id,Number(w.saved)||0])),completed=new Map();let reserved=0;
 const rows=dates.map((date,index)=>{
  const eligible=wishes.filter(w=>effectiveSavingsStyle(w,date)!=='Pause'&&funded.get(w.id)<Number(w.cost||0)&&!wishPauseState(w,book,date,data).manualPaused);
  const remaining=sum(eligible.map(w=>Number(w.cost||0)-funded.get(w.id))),nextDate=dates[index+1];
  const tail=points.filter(p=>p.date>=date&&(!nextDate||p.date<nextDate)).map(p=>({...p,cash:round(p.cash-reserved)}));
  const amount=sum(data.nextPaychecks.filter(p=>p.date===date).map(p=>p.amount)),headroom=Math.max(0,round(Math.min(...tail.map(p=>p.cash))-data.cash.bufferTarget));
  const allocation=allocatePaycheck(book,{...data,nextPaychecks:data.nextPaychecks.filter(p=>p.date>=date),asOf:date},{reserved});
  let contribution=data.ready&&remaining>0?round(Math.min(remaining,allocation?.parts.wishes||0,headroom)):0,left=contribution;
  const selected=book.settings.priorityTarget,automatic=eligible.filter(w=>effectiveSavingsStyle(w,date)==='Automatic'),custom=eligible.filter(w=>effectiveSavingsStyle(w,date)==='Custom');
  const weeks=Math.max(1,((Date.parse(nextDate||allocation?.until||date)-Date.parse(date)+86400000)/604800000));
  for(const w of custom){const n=Math.min(left,Math.max(0,Number(w.weekly)||0)*weeks,Number(w.cost||0)-funded.get(w.id));funded.set(w.id,round(funded.get(w.id)+n));left=round(left-n);}
  while(left>.009&&automatic.some(w=>funded.get(w.id)<Number(w.cost||0)-.009)){
   const open=automatic.filter(w=>funded.get(w.id)<Number(w.cost||0)-.009),weight=w=>selected?.list==='wishes'&&selected.id===w.id?2:1,total=open.reduce((n,w)=>n+weight(w),0),share=left;let used=0;
   for(const w of open){const n=Math.min(Number(w.cost||0)-funded.get(w.id),round(share*weight(w)/(total||1)));funded.set(w.id,round(funded.get(w.id)+n));used=round(used+n);}
   if(used<.01)break;left=round(left-used);
  }
  for(const w of eligible)if(funded.get(w.id)>=Number(w.cost||0)&&!completed.has(w.id))completed.set(w.id,date);
  const applied=round(contribution-left);reserved=round(reserved+applied);
  return {date,amount,contribution:applied,projectedSaved:round(alreadySaved+reserved),lowestAfter:round(Math.min(...tail.map(p=>p.cash))-applied),reason:!data.ready?'Confirm planning setup':!remaining?'No active unfunded wishes':!headroom?'Protecting your buffer':applied?'Wish allocation reserved':!allocation?.parts.wishes?'No Wish List allocation':'No paycheck surplus available'};
 });
 return {alreadySaved,projectedContributions:reserved,projectedSaved:round(alreadySaved+reserved),rows,end:points.at(-1)?.date||data.asOf,wishes:wishes.map(w=>({id:w.id,list:'wishes',projected:round(funded.get(w.id)-(Number(w.saved)||0)),projectedSaved:funded.get(w.id),ready:completed.get(w.id)||null,forecastEnd:points.at(-1)?.date||data.asOf}))};
}
