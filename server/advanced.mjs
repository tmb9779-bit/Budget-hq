import {addDays} from '../schedule.js';
import {boostAllocation,allocationKeys,defaultAllocations} from '../priority-allocation.js';
import {categorizeOther,TYPES} from '../categories.js';
import {randomUUID} from 'node:crypto';
export const advancedActions=new Set(['autoCategorize','forecastPreferences','wishProtection','overduePreferences','importPreferences','incomeProfile','allocationSettings','goalFocus','reorderTargets','billReviewSnooze','debtSettings','targetPriority','completeTarget','renewalMeta','insightState','reviewPreferences','utilizationSettings','expenseColors','hideScenario','cashBuffer']);
const text=(v,max=150)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Enter valid text.');return v.trim();};
const number=(v,min=0,max=1e9)=>{if(v===''||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max)throw Error('Enter a valid number.');return Math.round(Number(v)*100)/100;};
const choose=(v,choices)=>{if(!choices.includes(v))throw Error('Choose a listed option.');return v;};
const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)throw Error('Enter a valid date.');return v;};
export function applyAdvanced(b,action,p,asOf){const find=(list,id)=>{const x=b[list].find(x=>x.id===id);if(!x)throw Error('Record not found. Reload.');return x;};
 if(action==='autoCategorize'){categorizeOther(b);b.settings.reviewImportedCategories=false;return;}
 if(action==='forecastPreferences'){b.settings.billProtection='payday';delete b.settings.forecastIncome;return;}
 if(action==='wishProtection'){if(typeof p.pauseWishesBelowBuffer!=='boolean')throw Error('Choose whether to pause wishes.');b.settings.pauseWishesBelowBuffer=p.pauseWishesBelowBuffer;return;}
 if(action==='overduePreferences'){b.settings.overdueMode=choose(p.overdueMode,['upcoming','reserve']);b.settings.overdueSince=date(p.overdueSince);if(b.settings.overdueSince>asOf)throw Error('Choose today or an earlier tracking date.');return;}
 if(action==='importPreferences'){if(typeof p.reviewImportedCategories!=='boolean')throw Error('Choose an import review option.');b.settings.reviewImportedCategories=p.reviewImportedCategories;return;}
 if(action==='expenseColors'){
  // Every spending type may be given a colour; missing ones keep their default.
  const colors={};
  for(const type of TYPES.filter(t=>t.expense!==false)){const value=p[type.slug];if(value==null)continue;if(!/^#[0-9a-f]{6}$/i.test(value))throw Error('Choose a valid color for each type.');colors[type.slug]=value;}
  if(!Object.keys(colors).length)throw Error('Choose a valid color for each type.');
  b.settings.expenseColors=colors;return;
 }
 if(action==='cashBuffer'){b.settings.buffer=number(p.buffer);return;}
 if(action==='reorderTargets'){
  const list=choose(p.list,['wishes','goals']),items=b[list];
  if(!Array.isArray(p.ids)||p.ids.length!==items.length||new Set(p.ids).size!==items.length||p.ids.some(id=>typeof id!=='string'))throw Error('The target order changed. Reload and try again.');
  const byId=new Map(items.map(item=>[item.id,item]));
  if(p.ids.some(id=>!byId.has(id)))throw Error('The target order changed. Reload and try again.');
  b[list]=p.ids.map(id=>byId.get(id));return;
 }
 if(action==='hideScenario'){const value=number(p.extra);b.settings.hiddenScenarios=[...new Set([...(b.settings.hiddenScenarios||[]),value])];return;}
 if(action==='incomeProfile'){const record={name:text(p.name),historyName:p.historyName?text(p.historyName):text(p.name),amount:number(p.amount),date:date(p.date),frequency:choose(p.frequency,['Weekly','Biweekly','Monthly','Quarterly','Yearly','One-time']),estimateMode:choose(p.estimateMode,['manual','average','conservative','wages']),hourlyRate:number(p.hourlyRate||0),hoursPerWeek:number(p.hoursPerWeek||0,0,168),takeHomePercent:number(p.takeHomePercent??100,0,100),verified:true,active:true};if(record.estimateMode==='wages'&&!['Weekly','Biweekly','Monthly'].includes(record.frequency))throw Error('Wage estimates support weekly, biweekly or monthly pay.');if(b.incomes.some(i=>i.id!==p.id&&i.active!==false&&String(i.historyName||i.name).trim().toLowerCase()===record.historyName.toLowerCase()))throw Error('Each active source needs a distinct history name to avoid reusing deposits.');if(p.id)Object.assign(find('incomes',p.id),record);else b.incomes.push({id:randomUUID(),...record});
 }else if(action==='allocationSettings'){const allocations={};for(const k of allocationKeys)allocations[k]=number(p[k],0,100);if(Math.abs(Object.values(allocations).reduce((n,v)=>n+v,0)-100)>.001)throw Error('Allocation percentages must total 100%.');b.settings.allocations=allocations;b.settings.baseAllocations=allocations;b.settings.allocationMode='custom';
 }else if(action==='goalFocus'){
  const list=choose(p.list,['wishes','goals','sinking']),target=find(list,p.id),mode=choose(p.mode,['automatic','custom']),category=target.goalType==='debt'?'debt':{wishes:'wishes',goals:'goals',sinking:'sinking'}[list];
  if(mode==='custom'){
   const allocations={};for(const k of allocationKeys)allocations[k]=number(p[k],0,100);
   if(Math.abs(Object.values(allocations).reduce((n,v)=>n+v,0)-100)>.001)throw Error('Allocation percentages must total 100%.');
   b.settings.allocations=allocations;b.settings.baseAllocations=allocations;
  }else{const base=b.settings.baseAllocations||b.settings.allocations||defaultAllocations;b.settings.baseAllocations={...base};b.settings.allocations=boostAllocation(base,category);}
  b.settings.priorityTarget={list,id:target.id};b.settings.allocationMode=mode;
  if(target.goalType==='debt')b.settings.priorityDebt=target.debtId;
  for(const key of ['wishes','goals','sinking'])for(const goal of b[key])goal.focus=key===list&&goal.id===target.id&&target.goalType!=='debt';

 }else if(action==='billReviewSnooze'){const [id,day]=String(p.key||'').split('@');date(day);if(![...b.bills,...b.accounts.filter(a=>a.kind!=='cash')].some(x=>x.id===id&&x.active!==false))throw Error('This scheduled item is no longer available.');b.billReviewSnoozes={...(b.billReviewSnoozes||{}),[p.key]:addDays(asOf,1)};
 }else if(action==='debtSettings'){b.settings.debtStrategy=choose(p.strategy,['avalanche','snowball']);if(p.priorityDebt&&find('accounts',p.priorityDebt).kind==='cash')throw Error('Priority must be a debt.');b.settings.priorityDebt=p.priorityDebt||'';b.settings.extraWeekly=number(p.extraWeekly||0);
 }else if(action==='targetPriority'){const list=choose(p.list,['wishes','goals','sinking']),g=find(list,p.id);g.priority=choose(p.priority,['High','Normal','Low']);g.focus=p.focus===true;if(g.focus)for(const other of b[list])if(other.id!==g.id)other.focus=false;
 }else if(action==='completeTarget'){const list=choose(p.list,['wishes','goals','sinking']),g=find(list,p.id),mode=choose(p.mode,['schedule','purchased']),day=date(p.date);let linked='';
  if(mode==='schedule'){if(day<asOf)throw Error('Schedule for today or later.');linked=randomUUID();b.bills.push({id:linked,name:g.name,amount:g.cost,date:day,frequency:'One-time',category:'Other',kind:'Planned',active:true,goalId:g.id});}
  else{if(day>asOf)throw Error('Record purchases after payment.');const account=find('accounts',p.accountId);if(account.kind!=='cash'||day<account.balanceDate)throw Error('Choose a cash account and a date covered by its starting balance.');if(p.transactionId){const t=find('transactions',p.transactionId);if(t.goalId||t.paymentId||t.historical||t.adjustment||t.toAccountId||t.direction!=='Outflow'||t.accountId!==account.id||t.amount!==g.cost)throw Error('Choose an unmatched expense for this account and target cost.');t.goalId=g.id;linked=t.id;}else{linked=randomUUID();b.transactions.push({id:linked,goalId:g.id,name:g.name,date:day,accountId:account.id,amount:g.cost,direction:'Outflow',category:'Shopping'});}}
  b.targetHistory=[...(b.targetHistory||[]),{...g,list,mode,completedAt:asOf,linkedId:linked}];b[list]=b[list].filter(x=>x.id!==g.id);
 }else if(action==='renewalMeta'){const bill=find('bills',p.id);bill.renewal={date:date(p.date),reviewBy:date(p.reviewBy),autoRenew:p.autoRenew===true,negotiable:p.negotiable===true,status:choose(p.status,['Review','Contacted','Keep','Cancel','Completed']),potentialSavings:number(p.potentialSavings||0),notes:String(p.notes||'').slice(0,2000)};if(bill.renewal.reviewBy>bill.renewal.date)throw Error('Review date must be on or before renewal.');
 }else if(action==='insightState'){const id=text(p.id,300),status=choose(p.status,['dismissed','handled','snoozed','reset']);b.insightStates??={};if(status==='reset')delete b.insightStates[id];else b.insightStates[id]={status,until:status==='snoozed'?date(p.until):null,at:asOf};
 }else if(action==='utilizationSettings'){b.settings.utilizationTarget=number(p.target,0,100);
 }else if(action==='reviewPreferences'){const email=String(p.email||'').trim();if(email&&!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email))throw Error('Enter a valid email.');if((p.enabled===true||p.yearly===true)&&!email)throw Error('Enter the review recipient.');b.settings.reviewEmail={enabled:p.enabled===true,yearly:p.yearly===true,email};}
}
