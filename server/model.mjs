import {pendingCash} from './pending-cash.mjs';
import {utilizationPercent} from '../financial-goals.js';
import {applyBankMatch,bankMatchCandidates} from '../bank-matches.js';
import {needMatchCandidates} from '../need-matches.js';
import {debtIconNames} from '../icon-catalog.js';
import {normalizeRecovery,stampDeletion,withoutDeletion} from './recycle.mjs';
import {incomeEstimate,forecastIncomeEstimate,recurringBillSuggestions,recurringMerchant,recurringIncomeSuggestions} from '../analysis.js';
import {advancedActions,applyAdvanced} from './advanced.mjs';
import {randomUUID} from 'node:crypto';
import {normalizeTrip} from '../trip-planner.js';
import {reviewState,reviewWarningItems,weekStart,attentionItems,scheduleGaps} from '../workflow.js';
import {dateValid,addDays,occurrences} from '../schedule.js';
export {dateValid,addDays,occurrences};
export const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
import {timeZone} from './config.mjs';
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
export const today=()=>dayFormat.format(new Date());
export {CATEGORIES,EXPENSE_CATEGORIES,TYPES,typeSlug,typeColors} from '../categories.js';
import {CATEGORIES,EXPENSE_CATEGORIES,normalizeCategory} from '../categories.js';
export function fresh(){return {schema:1,revision:randomUUID(),settings:{buffer:400},accounts:[],transactions:[],payments:[],bills:[],needs:[],wishes:[],goals:[],sinking:[],incomes:[],trips:[],decisions:[],renewals:[],cooling:[],overrides:{},reviewTransactions:[],dismissedReviewWarnings:[],migration:{capturedAt:null,sourceRows:0,duplicateRows:0,unresolved:[]},receipts:[]};}
export function balances(book,asOf=today()){
 // One pass over transactions and payments for all accounts (previously one full pass per account).
 const active=book.accounts.filter(a=>a.active!==false),totals=new Map();for(const a of active)if(!totals.has(a.id))totals.set(a.id,{a,change:0});
 const hit=id=>totals.get(id);
 for(const t of book.transactions){if(t.date>asOf||t.historical)continue;const from=hit(t.accountId),to=hit(t.toAccountId);if(from&&t.date>=from.a.balanceDate){const n=t.direction==='Inflow'?t.amount:-t.amount;from.change+=from.a.kind==='cash'?n:-n;}if(to&&t.date>=to.a.balanceDate)to.change+=to.a.kind==='cash'?t.amount:-t.amount;}
 for(const p of book.payments){if(p.date>asOf)continue;const debt=hit(p.debtId),fund=hit(p.fundingId);if(debt&&p.date>=debt.a.balanceDate&&!p.balanceIncluded)debt.change-=p.principal;if(fund&&p.date>=fund.a.balanceDate)fund.change-=p.amount;}
 return active.map(a=>({...a,balance:money(a.openingBalance+totals.get(a.id).change)}));
}
export function eventsFor(book,start,end,asOf=today(),{includePaid=false}={}){
 const items=[],currentBalances=new Map(balances(book,asOf).map(a=>[a.id,a.balance])),paymentsByKey=new Map();for(const p of book.payments){if(!p.occurrenceKey)continue;if(!paymentsByKey.has(p.occurrenceKey))paymentsByKey.set(p.occurrenceKey,[]);paymentsByKey.get(p.occurrenceKey).push(p);}
 for(const b of book.bills.filter(b=>b.active!==false))for(const date of occurrences(b.date,b.frequency,start,end)){const key=b.id+'@'+date,over=book.overrides[key]||{};if(['Skipped','Cancelled'].includes(over.status)||(!includePaid&&over.status==='Paid'))continue;items.push({key,id:b.id,name:b.name,date,amount:b.amount,type:b.kind||'Bill',...over});}
 for(const a of book.accounts.filter(a=>a.active!==false&&a.kind!=='cash'&&a.payment>0))for(const date of occurrences(a.dueDate,a.frequency,start,end)){const key=a.id+'@'+date,over=book.overrides[key]||{};if(date>=asOf&&(currentBalances.get(a.id)||0)<=0&&!(includePaid&&(over.status==='Paid'||paymentsByKey.has(key))))continue;const paid=(paymentsByKey.get(key)||[]).reduce((s,p)=>s+p.amount,0),remaining=money(Math.max(0,a.payment-(includePaid?0:paid)));if(['Skipped','Cancelled'].includes(over.status)||(!includePaid&&over.status==='Paid')||!remaining)continue;items.push({key,id:a.id,name:a.name,date,amount:remaining,type:'Debt',debtId:a.id,...over});}
 return items.filter(x=>x.date>=start&&x.date<=end).sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
}
export function incomeEvents(book,start,end,asOf=today()){return book.incomes.filter(i=>i.active!==false&&i.verified).flatMap(i=>{const estimate=forecastIncomeEstimate(book,i,asOf);if(!estimate)return [];const amount=estimate.amount;return occurrences(i.date,i.frequency,start,end).filter(date=>!['Skipped','Cancelled','Paid'].includes(book.overrides[i.id+'@'+date]?.status)).map(date=>({key:i.id+'@'+date,id:i.id,name:i.name,source:i.name,date,amount,inflow:true}));}).sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));}
export function summary(book,asOf=today(),days=60){
 const accounts=balances(book,asOf),cashAccounts=accounts.filter(a=>a.kind==='cash'),cashView=pendingCash(book,accounts,asOf),cash=cashView.balance,buffer=book.settings.buffer,end=addDays(asOf,days-1);
 const unverified=accounts.filter(a=>!a.verified),missingSchedule=accounts.filter(a=>a.kind!=='cash'&&a.balance>0&&a.payment>0&&!dateValid(a.dueDate));
 const gaps=scheduleGaps(book,asOf),ready=!!cashAccounts.length&&!unverified.length&&!missingSchedule.length&&!gaps.bills.length&&!gaps.debts.length;
 const protectedSavings=money([...book.wishes,...book.goals,...book.sinking].reduce((s,g)=>s+g.saved,0));
 const overdue=book.settings.overdueMode==='reserve'&&dateValid(book.settings.overdueSince)&&book.settings.overdueSince<asOf?eventsFor(book,book.settings.overdueSince,addDays(asOf,-1),asOf).map(e=>({...e,overdue:true})):[];
 const allEvents=[...overdue,...eventsFor(book,asOf,end,asOf)].filter(e=>e.type!=='Debt'||accounts.find(a=>a.id===e.debtId)?.balance>0),income=incomeEvents(book,asOf,end,asOf);
 let running=cash-protectedSavings;const forecast=[];
 const byDay=(list,dateOf)=>{const m=new Map();for(const x of list){const d=dateOf(x);if(!m.has(d))m.set(d,[]);m.get(d).push(x);}return m;},incomeByDay=byDay(income,x=>x.date),eventsByDay=byDay(allEvents,x=>x.date<asOf?asOf:x.date);
 for(let i=0;i<days;i++){const date=addDays(asOf,i),dayEvents=eventsByDay.get(date)||[],inflow=(incomeByDay.get(date)||[]).reduce((s,x)=>s+x.amount,0),expense=dayEvents.reduce((s,x)=>s+x.amount,0),reserve=dayEvents.filter(x=>x.type==='Debt').reduce((s,x)=>s+x.amount,0);running=money(running+inflow-expense);forecast.push({date,cash:running,income:inflow,scheduled:expense-reserve,reserve});}
 const low=forecast.reduce((a,b)=>a.cash<=b.cash?a:b),weekEnd=addDays(asOf,6),weekBills=allEvents.filter(x=>x.date<=weekEnd),protectionEnd=weekEnd,protectedBills=allEvents.filter(e=>e.date<=protectionEnd),due=money(protectedBills.reduce((s,x)=>s+x.amount,0)),safe=money(cash-protectedSavings-buffer-due);
 const review=book.reviewTransactions.length;
 const scoreParts=[{name:'Accounts confirmed',earned:accounts.length?Math.round(40*(accounts.length-unverified.length)/accounts.length):0,max:40},{name:'Debt schedules complete',earned:missingSchedule.length?0:20,max:20},{name:'Buffer protected for 60 days',earned:ready&&low.cash>=buffer?25:0,max:25},{name:'Imported history reviewed',earned:review?0:15,max:15}];
 const health=scoreParts.reduce((s,p)=>s+p.earned,0);
 return {asOf,ready,pauseWishesBelowBuffer:false,overdue,protectedBills,protectionEnd,accounts,cash:{...cashView,balance:cash,bufferTarget:buffer,safeToSpend:safe,minimumCash:low.cash,minimumCashDate:low.date},plan:{forecast},upcoming:allEvents,nextPaychecks:income,goals:book.goals,sinking:book.sinking,protectedSavings,weekBills,unverified:unverified.map(a=>a.id),missingSchedule:missingSchedule.map(a=>a.id),health,scoreParts,reviewCount:review,source:'Local budget',lastSaved:book.updatedAt||null};
}
const text=(v,max=150)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Enter a valid name.');return v.trim();};
const num=(v,min=0,max=1e9)=>{if(v===''||v===null||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max)throw Error('Enter a valid amount.');return money(v);};
const date=v=>{if(!dateValid(v))throw Error('Choose a valid date.');return v;};
const choice=(v,options)=>{if(!options.includes(v))throw Error('Choose one of the listed options.');return v;};
export const FREQUENCIES=['One-time','Weekly','Biweekly','Monthly','Quarterly','Yearly'];
export const DEBT_ICONS=debtIconNames;
export function change(book,action,p,asOf=today()){
 const b=normalizeRecovery(book,asOf),find=(list,id)=>{const x=b[list]?.find(x=>x.id===id);if(!x)throw Error('This record is no longer available. Reload the page.');return x;};
 const save=(list,record)=>{if(p.id){find(list,p.id);b[list]=b[list].map(x=>x.id===p.id?{...x,...record}:x);}else b[list].push({id:randomUUID(),...record});};
 if(action==='editAccount'){const a=find('accounts',p.id);const edited=change(b,'account',{...p,openingBalance:a.openingBalance,balanceDate:a.balanceDate},asOf);return change(edited,'reconcile',{id:p.id,balance:p.currentBalance},asOf);}
 else if(action==='bankMatch')applyBankMatch(b,p,asOf);
 else if(action==='incomeDepositReview'){
  const source=find('incomes',p.incomeId),deposit=incomeEstimate(b,source,asOf).rows.find(t=>t.id===p.transactionId);
  if(!deposit)throw Error('This deposit is no longer matched to the income source. Reload its history.');
  const mode=choice(p.mode,['include','exclude','automatic']),overrides={...(source.depositEstimateOverrides||{})};
  if(mode==='automatic')delete overrides[deposit.id];else overrides[deposit.id]=mode==='include';
  source.depositEstimateOverrides=overrides;
 }
 else if(advancedActions.has(action))applyAdvanced(b,action,p,asOf);
 else if(action==='account'){
  if(p.kind!=='cash'&&Number(p.payment)>0&&!dateValid(p.dueDate))throw Error('Choose a due date for the scheduled payment so it can appear on Calendar.');
  if(p.balanceDate>asOf)throw Error('A starting balance must be dated today or earlier.');
  const prev=p.id?find('accounts',p.id):null;
  if(prev&&b.transactions.some(t=>(t.accountId===p.id||t.toAccountId===p.id)&&!t.historical)||prev&&b.payments.some(t=>t.debtId===p.id||t.fundingId===p.id)){
   if(Number(p.openingBalance)!==prev.openingBalance||p.balanceDate!==prev.balanceDate||p.kind!==prev.kind)throw Error('This account has activity. Use Correct current balance to reconcile it; its original opening balance cannot be edited.');
  }
  save('accounts',{name:text(p.name),institution:String(p.institution||'').slice(0,150),kind:choice(p.kind,['cash','credit','loan']),debtType:p.kind==='loan'?choice(p.debtType??prev?.debtType??'',['','personal']):'',debtCategory:p.kind==='credit'?'credit':p.kind==='loan'?choice(p.debtCategory??prev?.debtCategory??(p.debtType==='personal'?'personal':/student/i.test(p.name)?'student':/car|auto|forester/i.test(p.name)?'car':'personal'),['student','car','personal','other']):'',icon:p.kind==='cash'?'':choice(p.icon||prev?.icon||(p.kind==='credit'?'credit':'debt'),DEBT_ICONS),openingBalance:num(p.openingBalance,-1e9),balanceDate:date(p.balanceDate),verified:true,active:true,apr:num(p.apr||0,0,100),payment:num(p.payment||0),dueDate:p.dueDate?date(p.dueDate):'',frequency:choice(p.frequency||'Monthly',FREQUENCIES),limit:num(p.limit||0),original:num(p.original||0)});
  if(!prev||!prev.verified||Number(p.openingBalance)!==prev.openingBalance)b.accounts.find(a=>a.id===(p.id||b.accounts.at(-1).id)).confirmedAt=asOf;
 }else if(action==='reconcile'||action==='confirmBalance'){
  const a=find('accounts',p.id),current=balances(b,asOf).find(x=>x.id===p.id).balance,target=num(p.balance,-1e9),delta=money(target-current);a.verified=true;
  a.confirmedAt=asOf;if(delta)b.transactions.push({id:randomUUID(),name:'Balance correction',date:asOf,accountId:a.id,amount:Math.abs(delta),direction:(a.kind==='cash'?delta>0:delta<0)?'Inflow':'Outflow',category:'Balance correction',adjustment:true});
 }else if(action==='transaction'){
  if(p.id){const prior=find('transactions',p.id);if(prior.plaidTransactionId){if(p.accountId!==prior.accountId||Number(p.amount)!==prior.amount||p.date!==prior.date||p.direction!==prior.direction||p.toAccountId)throw Error('Bank transaction amounts and dates are managed by Plaid. Change its category instead.');p={...p,historical:true};}}
  if(p.id&&find('transactions',p.id).bankMatchId)throw Error('Unlink the bank match before editing this transaction.');
  const a=find('accounts',p.accountId),amount=num(p.amount);if(!amount)throw Error('Amount must be greater than zero.');const d=date(p.date);if(d>asOf)throw Error('Use a planned bill or income schedule for a future date.');if(d<a.balanceDate&&!p.historical)throw Error('That date is before the account opening balance. Select Historical record so it is not counted twice.');
  if(p.id&&find('transactions',p.id).incomeExpectation&&(p.direction!=='Inflow'||p.historical||p.toAccountId||a.kind!=='cash'))throw Error('A recorded paycheck must remain a current cash deposit. Remove it to reverse receipt.');
  if(p.id&&b.payments.some(x=>x.transactionId===p.id))throw Error('This transaction is linked to a payment. Remove the payment link first.');
  if(p.toAccountId){const to=find('accounts',p.toAccountId);if(to.id===a.id||to.kind!=='cash'||a.kind!=='cash'||p.direction!=='Outflow')throw Error('Transfers require an outflow between two different cash accounts.');}
  save('transactions',{name:text(p.name),date:d,amount,direction:choice(p.direction,['Inflow','Outflow']),accountId:a.id,toAccountId:p.toAccountId||'',category:p.toAccountId?'Transfer':text(p.category||'Other'),historical:!!p.historical});
 }else if(action==='applyPersonalDebt'){
  const tx=find('transactions',p.transactionId),source=find('accounts',tx.accountId),a=find('accounts',p.debtId);
  if(source.kind!=='cash'||tx.direction!=='Outflow'||tx.pending||tx.excluded||tx.adjustment||tx.toAccountId||tx.paymentId||tx.bankMatchId||tx.goalId||tx.date>asOf||b.payments.some(x=>x.transactionId===tx.id))throw Error('Choose an unlinked, posted cash outflow.');
  if(a.active===false||a.kind!=='loan'||(a.debtType!=='personal'&&/student|car|auto|forester/i.test(a.name)))throw Error('Choose an active personal debt.');
  let payment;
  if(p.existingPaymentId){
   payment=find('payments',p.existingPaymentId);
   if(payment.debtId!==a.id||payment.transactionId||payment.amount!==tx.amount||Math.abs(Date.parse(payment.date)-Date.parse(tx.date))>5*86400000||(payment.fundingId&&payment.fundingId!==source.id))throw Error('Choose an unmatched payment for this debt, cash account, amount and date.');
   payment.transactionId=tx.id;payment.fundingId='';
  }else{
   if(b.payments.some(x=>x.debtId===a.id&&x.amount===tx.amount&&Math.abs(Date.parse(x.date)-Date.parse(tx.date))<=5*86400000))throw Error('A similar debt payment already exists. Select it under Already Recorded in Debt instead of creating another.');
   const principal=num(p.principal),included=choice(p.balanceTreatment,['reduce','included'])==='included',current=balances(b,asOf).find(x=>x.id===a.id).balance;
   if(principal>tx.amount||(!included&&principal>Math.max(0,current)))throw Error('Principal cannot exceed the transaction amount or remaining debt.');
   if(!included&&tx.date<a.balanceDate)throw Error('This payment predates the debt starting balance. Choose already included, or correct the debt starting balance first.');
   if(p.occurrenceKey){const due=String(p.occurrenceKey).split('@')[1];if(!dateValid(due)||!eventsFor(b,due,due,asOf).some(e=>e.key===p.occurrenceKey&&e.debtId===a.id))throw Error('Choose an unpaid scheduled occurrence for the selected debt.');}
   payment={id:randomUUID(),debtId:a.id,debtName:a.name,amount:tx.amount,principal,date:tx.date,fundingId:'',transactionId:tx.id,occurrenceKey:p.occurrenceKey||'',balanceIncluded:included};b.payments.push(payment);
  }
  tx.paymentId=payment.id;tx.previousCategory=tx.category;tx.category='Debt payment';
 }else if(action==='payment'){
  const a=find('accounts',p.debtId);if(a.kind==='cash')throw Error('Choose a debt account.');const current=balances(b,asOf).find(x=>x.id===a.id).balance,amount=num(p.amount),principal=num(p.principal),d=date(p.date);if(d>asOf)throw Error('Record a payment only after it is made.');if(d<a.balanceDate)throw Error('This payment is already covered by the opening balance; adjust the opening record instead.');if(!amount||principal>amount||principal>Math.max(0,current))throw Error('Principal cannot exceed the payment or remaining debt.');
  if(p.fundingId){const cash=find('accounts',p.fundingId);if(cash.kind!=='cash'||d<cash.balanceDate)throw Error('Choose a cash account with a starting date on or before this payment.');}
  let tx=null;if(p.transactionId){tx=find('transactions',p.transactionId);if(tx.paymentId||tx.toAccountId||tx.direction!=='Outflow'||tx.amount!==amount||tx.accountId!==p.fundingId||tx.historical)throw Error('Choose an unmatched outflow from this cash account for the same amount.');}
  if(p.occurrenceKey){const due=String(p.occurrenceKey).split('@')[1];if(!dateValid(due)||!eventsFor(b,due,due,asOf).some(e=>e.key===p.occurrenceKey&&e.debtId===a.id))throw Error('That scheduled payment is not active.');}
  const id=randomUUID();b.payments.push({id,debtId:a.id,debtName:a.name,amount,principal,date:d,fundingId:tx?'':p.fundingId||'',transactionId:tx?.id||'',occurrenceKey:p.occurrenceKey||''});if(tx){tx.paymentId=id;tx.previousCategory=tx.category;tx.category='Debt payment';}
 }else if(action==='matchPayment'){
  const match=reviewState(b).matches.find(x=>x.payment.id===p.id),tx=match?.candidates.find(t=>t.id===p.transactionId);if(!tx)throw Error('This payment match is no longer available. Reload Review.');
  match.payment.transactionId=tx.id;match.payment.fundingId='';tx.paymentId=p.id;tx.previousCategory=tx.category;tx.category='Debt payment';
 }else if(action==='dismissDuplicate'){
  if(!reviewState(b).duplicates.some(g=>g.key===p.key))throw Error('This duplicate group is no longer available.');b.dismissedDuplicates=[...(b.dismissedDuplicates||[]),p.key].slice(-1000);
 }else if(action==='checkin'){
  if(p.balancesReviewed!==true||p.billsReviewed!==true||p.incomeReviewed!==true)throw Error('Review balances, bills and expected pay before finishing.');
  if(!['same','changed'].includes(p.schedule))throw Error('Choose whether your work schedule is the same or changed.');
  if(b.accounts.some(a=>a.active!==false&&!a.verified)||!b.accounts.some(a=>a.kind==='cash'))throw Error('Confirm your account balances first.');
  const record={id:randomUUID(),week:weekStart(asOf),date:asOf,schedule:p.schedule,notes:String(p.notes||'').slice(0,2000)};
  b.checkins=[record,...(b.checkins||[]).filter(c=>c.week!==record.week)].slice(0,52);
  for(const a of b.accounts.filter(a=>a.active!==false))a.confirmedAt=asOf;
 }else if(action==='dismissAttention'){
  const item=attentionItems(b,summary(b,asOf)).find(x=>x.key===p.key);if(item)b.dismissedAttention=[...new Set([...(b.dismissedAttention||[]),...item.ids])].slice(-5000);
 }else if(action==='dismissReviewWarning'){
  const item=reviewWarningItems(b).find(x=>x.kind===p.kind);if(!item)throw Error('This review warning is no longer active.');
  b.dismissedReviewWarnings=[...new Set([...(b.dismissedReviewWarnings||[]),...item.pending])].slice(-5000);
 }else if(action==='category'){
  const t=find('transactions',p.id);if(t.bankMatchId)throw Error('Unlink the bank match before changing its category.');t.category=choice(normalizeCategory(p.category,p.name??find('transactions',p.id)?.name),CATEGORIES);delete t.suggestedCategory;t.categoryConfirmed=true;
 }else if(action==='trip'){
  save('trips',normalizeTrip(p));
 }else if(action==='recurringSuggestion'){
  const suggestion=recurringBillSuggestions(b,asOf).find(s=>s.key===p.key);
  if(!suggestion)throw Error('This suggestion has changed or already has a bill. Refresh to review it again.');
  if(p.mode==='dismiss'){b.dismissedRecurring=[...new Set([...(b.dismissedRecurring||[]),suggestion.key])];}
  else if(p.mode==='permanent'){b.permanentRecurringDismissals=[...new Set([...(b.permanentRecurringDismissals||[]),suggestion.legacyKey||JSON.stringify([suggestion.accountId,recurringMerchant(suggestion.name)])])];b.dismissedRecurring=(b.dismissedRecurring||[]).filter(k=>k!==suggestion.key&&k!==suggestion.legacyKey);}
  else if(p.mode==='restore'){b.dismissedRecurring=(b.dismissedRecurring||[]).filter(k=>k!==suggestion.key&&k!==suggestion.legacyKey);}
  else if(p.mode==='accept'){
   if(suggestion.dismissed)throw Error('Restore this suggestion before adding it.');
   if(p.date<asOf)throw Error('Choose today or a future due date.');
   if(p.frequency==='One-time')throw Error('Choose a recurring frequency.');
   if(!(Number(p.amount)>0))throw Error('Enter an amount greater than zero.');
   if(b.bills.some(x=>x.active!==false&&x.frequency!=='One-time'&&recurringMerchant(x.name)===recurringMerchant(p.name)))throw Error('A recurring bill with this name already exists. Edit that bill instead.');
   const updated=change(b,'bill',{name:p.name,amount:p.amount,date:p.date,frequency:p.frequency,category:p.category,kind:'Fixed'},asOf);
   updated.bills.at(-1).recurringSource=suggestion.key;
   updated.bills.at(-1).recurringEvidence=suggestion.evidence.map(t=>t.id);
   return updated;
  }else throw Error('Choose a suggestion action.');
 }else if(action==='removeLegacyPayoffGoals'){
  // Remove the old automatic "Pay off <account>" goals. Keep the new
  // milestone wording "Pay off balance: <account>".
  b.goals=(b.goals||[]).filter(g=>!/^pay\s+off\s+(?!balance\s*:)/i.test(String(g.name||'')));
}else if(action==='goalSuggestion'){
  // Suggested financial goals live on the Goals page; refusing one keeps it out of the way.
  const name=text(p.name);
  if(p.mode==='dismiss')b.dismissedGoalSuggestions=[...new Set([...(b.dismissedGoalSuggestions||[]),name])].slice(0,100);
  else if(p.mode==='restore')b.dismissedGoalSuggestions=(b.dismissedGoalSuggestions||[]).filter(x=>x!==name);
  else throw Error('Choose a suggestion action.');
 }else if(action==='bill'){
  save('bills',{name:text(p.name),amount:num(p.amount),date:date(p.date),frequency:choice(p.frequency,FREQUENCIES),category:p.category?choice(normalizeCategory(p.category,p.name),EXPENSE_CATEGORIES):undefined,kind:choice(p.kind||'Fixed',['Fixed','Planned','Renewal']),active:true});
 }else if(action==='occurrence'){
  const key=String(p.key),e=[...eventsFor(b,p.date,p.date,asOf),...incomeEvents(b,p.date,p.date,asOf)].find(x=>x.key===key);if(!e)throw Error('This scheduled occurrence is no longer active.');const status=choice(p.status,['Skipped','Paid']);
  if(e.inflow&&status==='Paid')throw Error('Use Received for expected income.');
  if(status==='Paid'){if(bankMatchCandidates(b,asOf).some(c=>c.kind==='bill'&&c.sourceId===e.id&&c.date===e.date))throw Error('A matching bank charge is already imported. Review Bank Activity Matches in Transactions first.');if(e.debtId)throw Error('Use Record payment for debt bills.');const a=find('accounts',p.accountId);if(!['cash','credit'].includes(a.kind))throw Error('Choose a cash account or credit card.');if(p.date<a.balanceDate||p.date>asOf)throw Error('Record payment on a valid past or current date.');b.transactions.push({id:randomUUID(),name:e.name,date:p.date,amount:e.amount,direction:'Outflow',category:'Bills',accountId:a.id,occurrenceKey:key});}
  b.overrides[key]=status==='Skipped'?{status,...stampDeletion(asOf),name:e.name,amount:e.amount,...(e.inflow?{inflow:true}:{})}:{status};
 }else if(action==='restoreOccurrence'){
  if(b.overrides[p.key]?.status!=='Skipped')throw Error('This occurrence is no longer available to restore.');const [source,day]=String(p.key).split('@');if(![...b.bills,...b.accounts,...b.incomes].some(x=>x.id===source&&x.active!==false))throw Error('Restore the bill, account, or income schedule first.');const income=b.incomes.find(i=>i.id===source);if(income&&!occurrences(income.date,income.frequency,day,day).length)throw Error('This income schedule has changed since deletion. Adjust its start date before restoring this paycheck.');delete b.overrides[p.key];
 }else if(action==='purgeOccurrence'){
  if(b.overrides[p.key]?.status!=='Skipped')throw Error('This occurrence is no longer available.');b.overrides[p.key]={status:'Cancelled'};
 }else if(action==='need'){
  const savedCategory=p.category===undefined?b.needs.find(n=>n.id===p.id)?.category:p.category;const record={name:text(p.name),cost:num(p.cost),urgency:choice(p.urgency,['High','Medium','Low']),category:savedCategory?choice(normalizeCategory(savedCategory,p.name),EXPENSE_CATEGORIES):''};if(p.mode==='schedule'){if(date(p.date)<asOf)throw Error('Choose today or a future date.');save('needs',record);const id=p.id||b.needs.at(-1).id;b.bills.push({id:randomUUID(),name:record.name,amount:record.cost,date:date(p.date),frequency:'One-time',category:record.category||(/car|tire|auto/i.test(record.name)?'Car':/dental|doctor|medical/i.test(record.name)?'Medical':/rent|home|roof/i.test(record.name)?'Housing':/food|grocery/i.test(record.name)?'Grocery':'Other'),kind:'Planned',active:true,needId:id});b.needs=b.needs.filter(x=>x.id!==id);}else save('needs',record);
 }else if(action==='needMatch'){
  const c=needMatchCandidates(b,asOf).find(c=>c.key===p.key);if(!c)throw Error('This purchase is no longer available to match. Refresh and review it again.');
  if(p.mode==='dismiss'){b.dismissedNeedMatches=[...new Set([...(b.dismissedNeedMatches||[]),c.key])];}
  else if(p.mode==='confirm'){const tx=find('transactions',c.transactionId),key=c.billId+'@'+c.bill.date;tx.occurrenceKey=key;b.overrides[key]={status:'Paid',needMatchId:tx.id};}
  else throw Error('Choose a matching action.');
 }else if(action==='wishPause'||action==='wishResume'){
  const w=find('wishes',p.id),resume=w.style==='Pause'?(w.resumeStyle==='Custom'?'Custom':'Automatic'):(w.style||'Automatic');
  if(action==='wishPause'){
   const until=p.pauseUntil?date(p.pauseUntil):'';if(until&&until<=asOf)throw Error('Choose a future resume date, or leave it blank.');
   w.resumeStyle=resume;w.style='Pause';w.pauseUntil=until;
  }else{w.style=resume;w.resumeStyle=resume;w.pauseUntil='';}
  b.cooling=b.cooling.filter(c=>!(c.wishId===w.id||!c.wishId&&c.name===w.name));
 }else if(['wish','goal','sinking'].includes(action)){
  const list={wish:'wishes',goal:'goals',sinking:'sinking'}[action],cost=num(p.cost),saved=num(p.saved||0);if(saved>cost&&!(action==='goal'&&p.goalType==='emergency'))throw Error('Saved money cannot exceed this target.');
  const link=p.link?new URL(p.link):null;if(link&&!['http:','https:'].includes(link.protocol))throw Error('Use a valid website link.');
  if(p.image&&String(p.image).startsWith('https://')){const u=new URL(p.image);if(u.username||u.password||p.image.length>4096)throw Error('Use a direct HTTPS image URL without credentials.');}
  else if(p.image&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(p.image))throw Error('Use the photo picker to select a JPEG image.');if((p.image||'').length>180000)throw Error('Choose a smaller image.');
  const prior=b[list].find(g=>g.id===p.id),style=choice(p.style||'Automatic',['Automatic','Custom','Pause']),pauseUntil=style==='Pause'&&p.pauseUntil?date(p.pauseUntil):'';
  if(pauseUntil&&pauseUntil<=asOf)throw Error('Choose a future resume date, or leave it blank for an indefinite pause.');
  const resumeStyle=style==='Pause'?choice(p.resumeStyle||prior?.resumeStyle||(prior?.style==='Custom'?'Custom':'Automatic'),['Automatic','Custom']):style;
  let goalMeta={};
  if(action==='goal'){
   const goalType=choice(p.goalType||prior?.goalType||'deadline',['emergency','debt','deadline']);
   if(goalType==='debt'){
    const debt=find('accounts',p.debtId);if(debt.kind==='cash')throw Error('Choose a debt account.');
    if(saved!==0||(prior?.saved||0)>0)throw Error('Move reserved savings out of this goal before turning it into a debt milestone.');
    const targetBalance=num(p.targetBalance||0),balance=balances(b,asOf).find(a=>a.id===debt.id).balance;
    const targetUtilization=p.targetUtilization===''?null:utilizationPercent({name:p.name,targetMode:p.targetMode||prior?.targetMode,targetUtilization:p.targetUtilization??prior?.targetUtilization},debt);
    if(p.targetUtilization!==undefined&&p.targetUtilization!==''&&targetUtilization===null)throw Error('Choose a credit card and a utilization target from 0 to 100%.');
    const targetMode=choice(p.targetMode||prior?.targetMode||(targetUtilization!==null?'utilization':'balance'),['balance','utilization']);if(targetMode==='utilization'&&targetUtilization===null)throw Error('Enter a credit utilization target.');
    if(targetUtilization===null&&targetBalance>balance&&!(prior?.goalType==='debt'&&prior.debtId===debt.id))throw Error('Target balance must not exceed the current debt.');
    goalMeta={goalType,debtId:debt.id,targetBalance,targetMode,targetUtilization:targetMode==='utilization'?targetUtilization:null,startBalance:prior?.goalType==='debt'&&prior.debtId===debt.id?Math.max(prior.startBalance,balance):balance};
   }else if(goalType==='emergency'){
    const months=num(p.months||3);if(months<1||months>24)throw Error('Choose 1 to 24 months.');
    goalMeta={goalType,months,expenseMode:choice(p.expenseMode||'automatic',['automatic','custom']),monthlyEssentials:num(p.monthlyEssentials||0)};
   }else{goalMeta={goalType};if(p.goalType&&!p.date)throw Error('Choose a savings deadline.');}
   if(p.date&&date(p.date)<asOf&&p.date!==prior?.date)throw Error('Choose today or a future deadline.');
  }
  save(list,{...goalMeta,name:text(p.name),cost,saved,priority:choice(p.priority||b[list].find(g=>g.id===p.id)?.priority||'Normal',['High','Normal','Low']),date:p.date?date(p.date):'',style,pauseUntil,resumeStyle,weekly:num(p.weekly||0),link:link?.href||'',image:p.image||''});
 }else if(action==='incomeSuggestion'){
  const suggestion=recurringIncomeSuggestions(b,asOf).find(s=>s.key===p.key);
  if(!suggestion)throw Error('This income suggestion has changed or already has a schedule. Refresh and review again.');
  if(p.mode==='dismiss')b.dismissedIncomeSuggestions=[...new Set([...(b.dismissedIncomeSuggestions||[]),suggestion.key])];
  else if(p.mode==='restore')b.dismissedIncomeSuggestions=(b.dismissedIncomeSuggestions||[]).filter(k=>k!==suggestion.key);
  else if(p.mode==='accept'){
   if(suggestion.dismissed)throw Error('Restore this suggestion before adding it.');
   if(p.date<asOf)throw Error('Choose today or a future payday.');
   if(p.frequency==='One-time')throw Error('Choose a recurring frequency.');
   if(!(Number(p.amount)>0))throw Error('Enter expected take-home pay greater than zero.');
   if(b.incomes.some(i=>i.active!==false&&recurringMerchant(i.name)===recurringMerchant(p.name)))throw Error('An income source with this name already exists. Edit that source instead.');
   const updated=change(b,'income',{name:p.name,amount:p.amount,date:p.date,frequency:p.frequency},asOf),income=updated.incomes.at(-1);
   income.recurringSource=suggestion.key;income.recurringEvidence=suggestion.evidence.map(t=>t.id);income.historyName=suggestion.name;income.accountId=suggestion.accountId;income.estimateMode='manual';
   return updated;
  }else throw Error('Choose an income suggestion action.');
 }else if(action==='income')save('incomes',{name:text(p.name),amount:num(p.amount),date:date(p.date),frequency:choice(p.frequency,FREQUENCIES),verified:true,active:true});
 else if(action==='receiveIncome'){
  // If the bank already imported this deposit, Received links it and clears the payday rather than refusing.
  const imported=bankMatchCandidates(b,asOf).filter(c=>c.kind==='income'&&c.sourceId===p.id)
   .sort((x,y)=>(y.nameMatch?1:0)-(x.nameMatch?1:0)||Math.abs(Date.parse(x.transaction.date)-Date.parse(p.date||asOf))-Math.abs(Date.parse(y.transaction.date)-Date.parse(p.date||asOf)));
  if(imported.length){applyBankMatch(b,{key:imported[0].key,mode:'confirm'},asOf);return b;}
  const income=find('incomes',p.id),d=date(p.date);if(income.active===false||!dateValid(income.date))throw Error('This income schedule is no longer active.');if(d>asOf)throw Error('Record income after it arrives.');const a=find('accounts',p.accountId);if(a.kind!=='cash'||d<a.balanceDate)throw Error('Choose a cash account with a valid opening date.');
  const expectedDate=occurrences(income.date,income.frequency,income.date,addDays(income.date,3660)).find(day=>!['Skipped','Cancelled'].includes(b.overrides[income.id+'@'+day]?.status));
  if(!expectedDate)throw Error('No active paycheck remains on this schedule. Restore it or edit the schedule first.');if(p.expectedDate&&p.expectedDate!==expectedDate)throw Error('Resolve the earlier scheduled paycheck first, then record this deposit.');
  const nextDate=occurrences(expectedDate,income.frequency,addDays(expectedDate,1),addDays(expectedDate,370))[0]||'';
  // By default the deposit is expected to arrive through the bank import, so nothing is added to your
  // balance here: the paycheck just clears from the schedule. addToBalance is for pay the bank will
  // never show, such as cash or a cheque you deposit yourself.
  if(p.addToBalance===true)b.transactions.push({id:randomUUID(),name:income.name,date:d,amount:num(p.amount),direction:'Inflow',category:'Income',accountId:a.id,incomeExpectation:{scheduleId:income.id,date:expectedDate,amount:incomeEstimate(book,income,asOf).amount,nextDate,frequency:income.frequency}});
  else b.overrides[income.id+'@'+expectedDate]={status:'Received',awaitingBank:true,date:d,amount:num(p.amount),name:income.name};
  income.date=nextDate;if(!income.date)income.active=false;
 }else if(action==='settings'){b.settings={...b.settings,buffer:num(p.buffer)};delete b.settings.alerts;delete b.settings.planningConfirmed;delete b.settings.forecastIncome;}
 else if(action==='decision')save('decisions',{name:text(p.name),notes:String(p.notes||'').slice(0,2000),date:asOf});
 else if(action==='cooling'){const days=num(p.days,1,365);if(!Number.isInteger(days))throw Error('Enter a whole number of days.');save('cooling',{wishId:p.wishId?find('wishes',p.wishId).id:undefined,name:text(p.name),cost:num(p.cost),date:addDays(asOf,days)});}
 else if(action==='reviewHistory'){
  const chosen=p.ids?new Set(p.ids):null,candidates=b.reviewTransactions.filter(t=>!chosen||chosen.has(t.id));if(!candidates.length)throw Error('No records selected.');
  if(!p.accept){b.plaidSuppressed=[...new Set([...(b.plaidSuppressed||[]),...candidates.map(t=>t.plaidTransactionId).filter(Boolean)])];}
  if(p.accept)for(const t of candidates)b.transactions.push({...t,historical:true,imported:true,...(b.settings.reviewImportedCategories&&t.category&&!['Other','Transfer','Debt payment'].includes(t.category)&&!t.toAccountId&&!t.paymentId?{suggestedCategory:t.category,category:'Other'}:{})});const ids=new Set(candidates.map(t=>t.id));b.reviewTransactions=b.reviewTransactions.filter(t=>!ids.has(t.id));
 }else if(action==='purgeBill'){if(!(b.deletedBills||[]).some(x=>x.id===p.id))throw Error('Deleted expense not found.');b.deletedBills=b.deletedBills.filter(x=>x.id!==p.id);for(const key of Object.keys(b.overrides))if(key.startsWith(p.id+'@'))delete b.overrides[key];
 }else if(action==='restoreBill'){const item=(b.deletedBills||[]).find(x=>x.id===p.id);if(!item)throw Error('Deleted expense not found.');if(b.bills.some(x=>x.id===p.id))throw Error('Expense is already restored.');b.bills.push(withoutDeletion(item));b.deletedBills=b.deletedBills.filter(x=>x.id!==p.id);
 }else if(action==='purgePayment'){
  if(!b.deletedPayments.some(x=>x.id===p.id))throw Error('Deleted payment not found.');b.deletedPayments=b.deletedPayments.filter(x=>x.id!==p.id);
 }else if(action==='restoreBillPayment'){
  const saved=b.deletedPayments.find(x=>x.id===p.id&&x.recordType==='bill');if(!saved)throw Error('This payment is no longer available to restore.');
  const item=withoutDeletion(saved),account=b.accounts.find(a=>a.id===item.accountId&&a.active!==false),snapshot=saved.recovery.account;
  if(!account||!['cash','credit'].includes(account.kind))throw Error('Restore the paying account first.');
  if(account.kind!==snapshot.kind||account.openingBalance!==snapshot.openingBalance||account.balanceDate!==snapshot.balanceDate||b.transactions.some(t=>t.adjustment&&t.accountId===account.id&&!saved.recovery.adjustments.includes(t.id)))throw Error('The paying account balance changed after deletion. Review it before recording this payment again.');
  if(b.transactions.some(t=>t.id===item.id||t.occurrenceKey===item.occurrenceKey)||b.overrides[item.occurrenceKey]?.status)throw Error('This bill occurrence has changed or is already paid. Review it before restoring.');
  b.transactions.push(item);b.overrides[item.occurrenceKey]=saved.recovery.occurrenceOverride||{status:'Paid'};b.deletedPayments=b.deletedPayments.filter(x=>x.id!==item.id);
 }else if(action==='restorePayment'){
  const saved=b.deletedPayments.find(x=>x.id===p.id&&x.recordType!=='bill');if(!saved)throw Error('This payment is no longer available to restore.');
  if(b.payments.some(x=>x.id===p.id))throw Error('Payment is already restored.');
  const item=withoutDeletion(saved),account=b.accounts.find(x=>x.id===item.debtId&&x.active!==false);
  if(!account||account.kind==='cash')throw Error('Restore the debt account first.');
  const unchanged=snapshot=>{const current=b.accounts.find(x=>x.id===snapshot.id);return current&&current.active!==false&&current.kind===snapshot.kind&&current.openingBalance===snapshot.openingBalance&&current.balanceDate===snapshot.balanceDate;};
  if(!(saved.recovery?.accounts||[]).every(unchanged))throw Error('An account starting balance changed after deletion. Record this payment again after reviewing balances.');
  const effectIds=new Set([item.debtId,item.fundingId,saved.recovery?.linkedTransaction?.accountId].filter(Boolean));
  const corrected=b.transactions.some(t=>t.adjustment&&effectIds.has(t.accountId)&&!saved.recovery?.adjustments?.includes(t.id));
  if(corrected)throw Error('An account balance was corrected after deletion. Review balances before recording this payment again.');
  if(item.date<account.balanceDate||item.date>asOf||item.principal>Math.max(0,balances(b,asOf).find(x=>x.id===account.id).balance))throw Error('This payment no longer fits the debt balance. Review it before recording again.');
  if(item.fundingId&&!b.accounts.some(x=>x.id===item.fundingId&&x.kind==='cash'&&x.active!==false&&x.balanceDate<=item.date))throw Error('Restore the funding account first.');
  if(item.occurrenceKey&&b.overrides[item.occurrenceKey]?.status)throw Error('This occurrence changed after deletion. Review it before restoring the payment.');
  const linked=saved.recovery?.linkedTransaction;
  if(item.transactionId){
   if(!linked)throw Error('The linked transaction cannot be recovered safely.');
   let tx=b.transactions.find(t=>t.id===item.transactionId);
   if(saved.recovery.removedLinked){if(tx)throw Error('The linked transaction is already present. Review it first.');tx={...linked};b.transactions.push(tx);}
   else if(!tx||tx.paymentId||JSON.stringify(tx)!==JSON.stringify(saved.recovery.unlinkedTransaction))throw Error('The linked transaction changed after deletion. Review it before restoring.');
   if(b.payments.some(x=>x.transactionId===tx.id))throw Error('This transaction is already matched to another payment.');
   tx.paymentId=item.id;tx.previousCategory=linked.previousCategory;tx.category='Debt payment';
  }
  b.payments.push(item);b.deletedPayments=b.deletedPayments.filter(x=>x.id!==p.id);
  if(item.occurrenceKey&&saved.recovery?.occurrenceOverride)b.overrides[item.occurrenceKey]=saved.recovery.occurrenceOverride;
 }else if(action==='remove'){if(p.list==='transactions'){const old=find('transactions',p.id);if(old.plaidTransactionId)b.plaidSuppressed=[...new Set([...(b.plaidSuppressed||[]),old.plaidTransactionId])];}
  const list=choice(p.list,['accounts','transactions','payments','bills','needs','wishes','goals','sinking','incomes','decisions','cooling','trips']);const item=find(list,p.id);
  if(list==='accounts'&&(b.transactions.some(t=>t.accountId===p.id||t.toAccountId===p.id)||b.payments.some(t=>t.debtId===p.id||t.fundingId===p.id)))throw Error('This account has records. Remove or move its records before removing it.');
  if(list==='accounts')b.reviewTransactions=b.reviewTransactions.filter(t=>t.accountId!==p.id);
  if(list==='transactions'&&item.bankMatchId)throw Error('Unlink this transaction in Bank Activity Matches before deleting it.');
  if(list==='transactions'&&item.incomeExpectation){const expected=item.incomeExpectation,schedule=b.incomes.find(i=>i.id===expected.scheduleId);if(schedule){if(schedule.date!==expected.nextDate||schedule.frequency!==expected.frequency)throw Error('This paycheck schedule has changed since receipt. Remove later receipts first, or restore the schedule date before removing this deposit.');schedule.date=expected.date;schedule.active=true;}}
  if(list==='transactions'&&item.paymentId)throw Error('Remove the linked payment first.');
  if(list==='payments'){
   const tx=b.transactions.find(t=>t.id===item.transactionId),recovery={linkedTransaction:tx?structuredClone(tx):null,removedLinked:!!tx&&p.removeLinked===true,occurrenceOverride:item.occurrenceKey?b.overrides[item.occurrenceKey]:null,adjustments:b.transactions.filter(t=>t.adjustment).map(t=>t.id),accounts:b.accounts.filter(a=>[item.debtId,item.fundingId,tx?.accountId].includes(a.id)).map(a=>({id:a.id,kind:a.kind,openingBalance:a.openingBalance,balanceDate:a.balanceDate}))};
   if(tx){if(p.removeLinked===true)b.transactions=b.transactions.filter(t=>t.id!==tx.id);else{delete tx.paymentId;tx.category=tx.previousCategory||'Other';delete tx.previousCategory;recovery.unlinkedTransaction=structuredClone(tx);}}
   b.deletedPayments.push({...item,...stampDeletion(asOf),recovery});if(item.occurrenceKey)delete b.overrides[item.occurrenceKey];
  }
  if(list==='transactions'&&item.occurrenceKey){
   const account=find('accounts',item.accountId);b.deletedPayments.push({...item,recordType:'bill',...stampDeletion(asOf),recovery:{account:{kind:account.kind,openingBalance:account.openingBalance,balanceDate:account.balanceDate},adjustments:b.transactions.filter(t=>t.adjustment).map(t=>t.id),occurrenceOverride:b.overrides[item.occurrenceKey]}});delete b.overrides[item.occurrenceKey];
  }
  if(list==='bills')b.deletedBills=[...(b.deletedBills||[]),{...item,...stampDeletion(asOf)}];
  b[list]=b[list].filter(x=>x.id!==p.id);
  if(['wishes','goals','sinking'].includes(list)&&b.settings.priorityTarget?.list===list&&b.settings.priorityTarget.id===p.id){
   delete b.settings.priorityTarget;
   if(b.settings.allocationMode==='automatic'&&b.settings.baseAllocations)b.settings.allocations={...b.settings.baseAllocations};
  }
 }else throw Error('Unsupported action.');
 return b;
}
