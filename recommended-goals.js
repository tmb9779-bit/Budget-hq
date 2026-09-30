export function recommendedGoalIdeas(book,summary){
 const existing=new Set((book.goals||[]).map(g=>String(g.name).trim().toLowerCase()));
 const ideas=[],seen=new Set();
 const add=(name,type,cost,meta={})=>{const key=name.toLowerCase();if(!existing.has(key)&&!seen.has(key)){ideas.push({name,type,cost,...meta});seen.add(key);}};
 const debts=(summary.accounts||[]).filter(a=>a.active!==false&&a.kind!=='cash'&&a.balance>0);
 for(const a of debts){
  const balance=Number(a.balance),limit=Number(a.limit)||0;
  if(a.kind==='credit'&&limit>0)for(const percent of [40,25,10])if(balance>limit*percent/100)add(`Get to ${percent}% utilization: ${a.name}`,'debt',0,{debtId:a.id,targetBalance:Math.round(limit*percent)/100});
  for(const [label,target] of [['Reduce balance by 15%',balance*.85],['Reduce balance by 33%',balance*.67],['Cut balance in half',balance*.5],['Reduce balance by $250',balance-250],['Reduce balance by $750',balance-750],['Pay off remaining balance',0]])if(target>=0&&target<balance)add(`${label}: ${a.name}`,'debt',0,{debtId:a.id,targetBalance:Math.round(target*100)/100});
 }
 add('Build a one-month emergency reserve','emergency',0,{months:1});
 add('Build a three-month emergency reserve','emergency',0,{months:3});
 const annual=(book.bills||[]).filter(b=>b.active!==false&&['Quarterly','Yearly'].includes(b.frequency)).reduce((sum,b)=>sum+Number(b.amount||0)*(b.frequency==='Quarterly'?4:1),0);
 if(annual>0)add('Set aside annual bills','deadline',Math.round(annual*100)/100);
 for(const [name,cost] of [['Save a $500 checking cushion',500],['Prepare for car repairs',500],['Prepare for pet expenses',300],['Prepare for medical costs',500],['Save for home repairs',750],['Save for education',500],['Save for travel',750],['Prepare for holiday expenses',400],['Save a $1,000 safety cushion',1000],['Prepare for insurance deductibles',500],['Save for a future move',1000],['Build a $2,000 emergency cushion',2000],['Prepare for technology replacement',500]])add(name,'deadline',cost);
 return ideas.slice(0,10);
}
