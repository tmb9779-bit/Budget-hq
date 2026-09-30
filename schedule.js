// Shared by the server and the browser: date checks and recurring-schedule dates in one place.
export const dateValid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export function occurrences(anchor,frequency,start,end){
 if(!dateValid(anchor)||!dateValid(start)||!dateValid(end))return [];
 const out=[],d=new Date(anchor+'T00:00:00Z'),dom=d.getUTCDate(),months={Monthly:1,Quarterly:3,Yearly:12}[frequency],days={Weekly:7,Biweekly:14}[frequency];
 // Jump straight to the first occurrence that can fall inside the range instead of counting up from an old anchor date.
 let first=0;if(start>anchor){if(days)first=Math.floor((Date.parse(start+'T00:00:00Z')-d.getTime())/(days*86400000));else if(months){const s=new Date(start+'T00:00:00Z');first=Math.floor(((s.getUTCFullYear()-d.getUTCFullYear())*12+s.getUTCMonth()-d.getUTCMonth())/months);}first=Math.max(0,first-1);}
 for(let i=first;i<first+10000;i++){
  let date;if(days)date=addDays(anchor,i*days);else if(months){const x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+i*months,1));x.setUTCDate(Math.min(dom,new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0)).getUTCDate()));date=x.toISOString().slice(0,10);}else date=anchor;
  if(date>end)break;if(date>=start)out.push(date);if(!days&&!months)break;
 }
 return out;
}
