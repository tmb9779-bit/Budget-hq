export function calculateScenario(forecast,{income=0,spending=0,purchase=0,date,start,extra=0,buffer=0}={}){
 if(!forecast?.length)throw Error('Refresh your budget to load a forecast first.');
 if(![income,spending,purchase,extra,buffer].every(Number.isFinite)||income< -100||spending< -100||purchase<0)throw Error('Enter valid amounts; decreases cannot exceed 100%.');
 const first=forecast[0].date,last=forecast.at(-1).date;
 if(!start||start<first||start>last)throw Error('Choose a change start date inside the loaded forecast.');
 if(purchase&&(!date||date<first||date>last))throw Error('Choose a purchase date inside the loaded forecast.');
 let delta=0,charged=false;
 const points=forecast.map(p=>{
  if(p.date>=start)delta+=(p.income||0)*income/100-(p.scheduled||0)*spending/100+extra/7;
  if(purchase&&!charged&&p.date>=date){delta-=purchase;charged=true;}
  return {...p,baseline:p.cash,cash:p.cash+delta};
 });
 const minimum=points.reduce((a,b)=>a.cash<=b.cash?a:b),baseline=forecast.reduce((a,b)=>a.cash<=b.cash?a:b);
 return {points,minimum,baseline,ending:points.at(-1),belowBuffer:points.filter(p=>p.cash<buffer).length,shortfall:Math.max(0,buffer-minimum.cash)};
}
