import {fresh,change,today,addDays,summary} from './model.mjs';
import {starterTripEstimate} from '../trip-planner.js';
export function sampleBudget(day=today()){
 let b=fresh();const put=(action,data)=>{b=change(b,action,data,day);};
 for(const [name,kind,openingBalance,payment,limit] of [['Sample Checking','cash',4200,0,0],['Sample Savings','cash',1800,0,0],['Sample Credit Card','credit',950,65,3000],['Sample Auto Loan','loan',8200,280,0]])put('account',{name,kind,openingBalance,payment,limit,balanceDate:addDays(day,-30),dueDate:addDays(day,5),frequency:'Monthly',apr:kind==='credit'?22:5,original:10000});
 const cash=b.accounts[0].id,card=b.accounts[2].id;
 for(const [name,amount,offset,frequency] of [['Rent',1100,3,'Monthly'],['Electricity',95,6,'Monthly'],['Internet',60,8,'Monthly'],['Phone',45,12,'Monthly'],['Groceries',85,2,'Weekly'],['Vet appointment',120,15,'One-time'],['Car service',160,22,'One-time'],['Insurance',90,26,'Monthly']])put('bill',{name,amount,date:addDays(day,offset),frequency,kind:frequency==='One-time'?'Planned':'Fixed'});
 put('income',{name:'Sample paycheck',amount:1550,date:addDays(day,4),frequency:'Biweekly'});put('income',{name:'Sample side work',amount:160,date:addDays(day,7),frequency:'Weekly'});
 for(let i=0;i<16;i++)put('transaction',{name:['Market','Coffee shop','Fuel','Bookshop'][i%4],amount:12+i*3,date:addDays(day,-i),direction:'Outflow',accountId:cash,category:['Food','Food','Transportation','Other'][i%4]});
 put('payment',{debtId:card,amount:100,principal:90,date:day,fundingId:cash});
 for(const [name,cost,urgency] of [['New work shoes',85,'High'],['Dental checkup',140,'Medium'],['Replace desk lamp',40,'Low']])put('need',{name,cost,urgency});
 for(const [action,name,cost,saved] of [['wish','Camera',650,100],['wish','Concert tickets',120,30],['wish','Art supplies',90,20],['goal','Emergency savings',3000,500],['sinking','Car maintenance',600,100]])put(action,{name,cost,saved,style:'Custom',weekly:20});
 const trip={name:'Sample weekend trip',origin:'Dallas',destination:'Austin',start:addDays(day,20),end:addDays(day,22),bookingDate:addDays(day,2),mode:'Drive',travelers:1,rooms:1,rental:false,saved:0,weeklySaving:30};put('trip',{...trip,...starterTripEstimate(trip).values});
 put('decision',{name:'Sample planning note',notes:'Try skipping a bill and watch Home totals update.'});put('settings',{buffer:400});
 b.sampleMode=true;return b;
}

// A fuller walkthrough dataset. Existing saved budgets are only replaced by
// the explicit sample-loading launcher, which makes a backup first.
export function fullSampleBudget(day=today()){
 let b=sampleBudget(day);const put=(action,data)=>{b=change(b,action,data,day);};
 const cash=b.accounts[0].id,savings=b.accounts[1].id,card=b.accounts[2].id;
 for(const [name,balance,payment,apr] of [['Sample Student Loan',6400,95,4.8],['Sample Furniture Loan',780,65,0]])put('account',{name,kind:'loan',openingBalance:balance,balanceDate:addDays(day,-30),original:balance+1800,payment,apr,dueDate:addDays(day,9),frequency:'Monthly'});
 // Historical entries populate reports without replaying into cash balances.
 for(let month=0;month<12;month++){
  const anchor=new Date(day+'T12:00:00Z');anchor.setUTCDate(1);anchor.setUTCMonth(anchor.getUTCMonth()-month);
  const monthDay=n=>new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth(),n)).toISOString().slice(0,10);
  for(const [name,amount,category,d] of [['Sample paycheck',3100+month*15,'Income',2],['Grocery Market',245+(month%3)*38,'Groceries',4],['Electric Company',90+(month%4)*17,'Utilities',5],['Fuel Station',95+(month%3)*12,'Transportation',7],['Movie Night',34,'Entertainment',8],['Home Supplies',52,'Shopping',9],['Dentist',month%3===0?110:25,'Medical',10]]){
   const date=monthDay(d);if(date>day)continue;
   put('transaction',{name,amount,date,category,accountId:cash,direction:category==='Income'?'Inflow':'Outflow',historical:true});
  }
 }
 for(let i=4;i>=0;i--)put('transaction',{name:'Sample Streaming Service',amount:i?12.99:17.99,date:addDays(day,-i*30),category:'Entertainment',accountId:cash,direction:'Outflow',historical:true});
 for(let i=0;i<8;i++)put('transaction',{name:'Sample Coffee Stop',amount:6.5,date:addDays(day,-i*3),category:'Dining out',accountId:cash,direction:'Outflow',historical:true});
 for(let i=0;i<2;i++)put('transaction',{name:'Sample Duplicate to Review',amount:24,date:addDays(day,-12),category:'Other',accountId:cash,direction:'Outflow',historical:true});
 put('transaction',{name:'Sample Savings Transfer',amount:150,date:addDays(day,-2),category:'Transfer',accountId:cash,toAccountId:savings,direction:'Outflow'});
 put('transaction',{name:'Sample Card Payment',amount:75,date:addDays(day,-1),category:'Other',accountId:cash,direction:'Outflow'});
 put('payment',{debtId:card,amount:75,principal:70,date:addDays(day,-1),fundingId:cash,transactionId:b.transactions.at(-1).id});
 put('bill',{name:'Sample Internet — Already Paid',amount:60,date:addDays(day,-1),frequency:'One-time',kind:'Planned',category:'Utilities'});
 let bill=b.bills.at(-1);put('occurrence',{key:bill.id+'@'+bill.date,date:bill.date,status:'Paid',accountId:cash});
 put('bill',{name:'Sample Gym — Skipped This Month',amount:35,date:addDays(day,3),frequency:'Monthly',kind:'Fixed',category:'Entertainment'});
 bill=b.bills.at(-1);put('occurrence',{key:bill.id+'@'+bill.date,date:bill.date,status:'Skipped'});
 put('bill',{name:'Sample Old Subscription — Restore Me',amount:14,date:addDays(day,5),frequency:'Monthly',kind:'Fixed',category:'Entertainment'});
 put('remove',{list:'bills',id:b.bills.at(-1).id});
 put('goal',{name:'Sample New Computer',cost:1800,saved:650,style:'Automatic',weekly:0,date:addDays(day,150)});
 put('sinking',{name:'Sample Annual Insurance',cost:900,saved:225,style:'Custom',weekly:25,date:addDays(day,120)});
 put('wish',{name:'Sample Headphones',cost:240,saved:180,style:'Custom',weekly:15,link:'https://example.com/headphones'});
 put('targetPriority',{list:'wishes',id:b.wishes.at(-1).id,priority:'High',focus:true});
 put('cooling',{wishId:b.wishes[1].id,name:b.wishes[1].name,cost:b.wishes[1].cost,days:'7'});
 put('need',{name:'Sample Urgent Tire Replacement',cost:390,urgency:'High'});
 put('need',{name:'Sample Desk Upgrade',cost:275,urgency:'Low'});
 put('incomeProfile',{id:b.incomes[0].id,name:'Sample paycheck',amount:1550,date:addDays(day,4),frequency:'Biweekly',estimateMode:'wages',hourlyRate:25,hoursPerWeek:40,takeHomePercent:77.5});
 put('incomeProfile',{id:b.incomes[1].id,name:'Sample side work',amount:160,date:addDays(day,7),frequency:'Weekly',estimateMode:'manual'});
 put('allocationSettings',{debt:25,sinking:20,goals:25,wishes:10,flex:20});
 put('debtSettings',{strategy:'snowball',extraWeekly:25});
 put('utilizationSettings',{target:20});
 put('decision',{name:'Sample Win: Caught a Price Increase',notes:'The streaming service history includes a price increase for Insights to flag.'});
 put('decision',{name:'Sample Win: Started Saving',notes:'Open Goals to see custom and automatic plans, a focus wish, and a waiting period.'});
 // A future pressure point demonstrates the buffer alert while today's cash
 // and safe-to-spend figures remain usable. It is a fictional planned bill.
 const point=summary(b,day).plan.forecast[24];
 put('bill',{name:'Sample Major Repair — Review This Plan',amount:Math.max(1200,Math.ceil((point.cash-b.settings.buffer+350)/100)*100),date:point.date,frequency:'One-time',kind:'Planned',category:'Car'});
 b.sampleScenario='Full app walkthrough';
 return b;
}
