// Shared arithmetic. Prices are user-entered USD estimates, never live quotes.
const DAY=86400000;
const stamp=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?Date.parse(s+'T00:00:00Z'):NaN;
const iso=n=>new Date(n).toISOString().slice(0,10);
const money=n=>Math.round(n*100)/100;
// Planning defaults, deliberately not advertised as live fares or hotel quotes.
// They give a useful first pass from the trip length and party size, then remain
// fully editable by the user.
export function starterTripEstimate(input){
 const start=stamp(input.start),end=stamp(input.end),travelers=Math.max(1,Number(input.travelers)||1),rooms=Math.max(1,Number(input.rooms)||1);
 if(!String(input.origin||'').trim()||!String(input.destination||'').trim()||!Number.isFinite(start)||!Number.isFinite(end)||end<start)throw Error('Enter your departure city, destination, and valid dates before generating an estimate.');
 const nights=Math.round((end-start)/DAY),days=nights+1,mode=input.mode==='Drive'?'Drive':'Fly',rental=input.rental===true||input.rental==='true';
 const values={hotelRate:160,hotelTax:15,hotelFees:35,foodDaily:50,activities:Math.round(90*travelers),other:50,contingency:12,upfront:0,rentalDays:days};
 if(mode==='Fly')Object.assign(values,{flightFare:425,baggage:40,airportTransport:60,miles:0,mpg:25,fuelPrice:0,tolls:0,parking:0});
 else Object.assign(values,{miles:500,mpg:25,fuelPrice:3.5,tolls:30,parking:25,flightFare:0,baggage:0,airportTransport:0});
 if(rental)Object.assign(values,{rentalRate:55,rentalFees:80,rentalFuel:35});
 else Object.assign(values,{rentalRate:0,rentalFees:0,rentalFuel:0});
 const transport=mode==='Fly'?`$425 round-trip fare and $40 baggage per traveler`:'500-mile round trip at $3.50/gal';
 return {values,note:`Planning estimate generated for ${days} travel day(s), ${nights} hotel night(s), ${travelers} traveler(s), and ${rooms} room(s): ${transport}; $160/night room, 15% hotel tax, $50/day food per traveler, and 12% contingency. Adjust anything that you already know.`};
}
export function normalizeTrip(input){
 const t={};if(input.photo){if(typeof input.photo!=='string'||input.photo.length>180000||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(input.photo))throw Error('Choose a supported photo under the upload limit.');t.photo=input.photo;}for(const key of ['name','origin','destination']){if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>150)throw Error('Enter a trip name, departure city, and destination.');t[key]=input[key].trim();}
 for(const key of ['start','end','bookingDate']){if(!Number.isFinite(stamp(input[key])))throw Error('Choose valid travel and booking dates.');t[key]=input[key];}
 if(stamp(t.end)<stamp(t.start)||stamp(t.end)-stamp(t.start)>90*DAY)throw Error('Choose a trip lasting up to 90 nights.');if(stamp(t.bookingDate)>stamp(t.start))throw Error('Upfront payment must be due on or before departure.');
 if(!['Fly','Drive'].includes(input.mode))throw Error('Choose Fly or Drive.');t.savingsMode=input.savingsMode||'Automatic';if(!['Automatic','Choose my own'].includes(t.savingsMode))throw Error('Choose automatic or custom savings.');t.mode=input.mode;t.rental=input.rental===true;t.protectedFund=typeof input.protectedFund==='string'?input.protectedFund.slice(0,600):'';
 for(const key of ['travelers','rooms','flightFare','baggage','airportTransport','miles','mpg','fuelPrice','tolls','parking','rentalDays','rentalRate','rentalFees','rentalFuel','hotelRate','hotelTax','hotelFees','foodDaily','activities','other','contingency','saved','weeklySaving','upfront']){
  const value=input[key];if(value===''||value===undefined||value===null||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>1000000)throw Error('Enter valid nonnegative amounts in every visible cost field.');t[key]=Number(value);
 }
 if(!Number.isInteger(t.travelers)||t.travelers<1||t.travelers>30||!Number.isInteger(t.rooms)||t.rooms<1||t.rooms>30)throw Error('Choose 1–30 travelers and rooms.');
 if(t.mode==='Drive'&&t.mpg<=0)throw Error('Miles per gallon must be greater than zero.');if(!Number.isInteger(t.rentalDays)||t.rentalDays>91)throw Error('Enter up to 91 rental days.');if(t.rental&&t.rentalDays<1)throw Error('Enter the number of rental days.');if(t.hotelTax>100||t.contingency>100)throw Error('Tax and contingency percentages must be 0–100.');
 return t;
}
export function tripCost(input){const t=normalizeTrip(input),nights=Math.round((stamp(t.end)-stamp(t.start))/DAY),days=nights+1;
 const lines=[];const add=(label,amount,detail)=>lines.push({label,amount:money(amount),detail});
 if(t.mode==='Fly'){add('Round-trip flights',t.flightFare*t.travelers,`${t.travelers} traveler(s) × round-trip fare`);add('Baggage',t.baggage*t.travelers,'Round-trip baggage allowance per traveler');add('Airport transport',t.airportTransport,'Total for the party');}
 else{add('Driving fuel',t.miles/t.mpg*t.fuelPrice,'Total round-trip miles ÷ MPG × price per gallon');add('Tolls',t.tolls,'Round-trip total');add('Parking',t.parking,'Total for the trip');}
 if(t.rental){add('Rental car',t.rentalDays*t.rentalRate,'Rental days × daily rate');add('Rental fees and taxes',t.rentalFees,'Total, including any insurance allowance');add('Rental fuel',t.rentalFuel,'Separate from driving fuel above');}
 const hotel=nights*t.rooms*t.hotelRate;add('Accommodation',hotel,`${nights} night(s) × ${t.rooms} room(s) × nightly rate`);add('Accommodation taxes & fees',hotel*t.hotelTax/100+t.hotelFees,'Room subtotal × tax rate + total fees');add('Food',days*t.travelers*t.foodDaily,`${days} day(s) × ${t.travelers} traveler(s) × daily allowance`);add('Activities',t.activities,'Total for the party');add('Other',t.other,'Total for the party');
 const subtotal=money(lines.reduce((s,x)=>s+x.amount,0));add('Contingency',subtotal*t.contingency/100,`${t.contingency}% of estimated costs`);const total=money(lines.reduce((s,x)=>s+x.amount,0));if(t.upfront>total)throw Error('The upfront payment cannot exceed the trip total.');return {trip:t,lines,total,nights,days};
}
export function automaticTripSaving(data){
 const points=(data.plan?.forecast||[]).filter(p=>Number.isFinite(p.cash)).slice().sort((a,b)=>a.date.localeCompare(b.date)),start=stamp(data.asOf),buffer=Number(data.cash?.bufferTarget)||0;
 if(!Number.isFinite(start)||!points.length)return 0;
 const future=points.filter(p=>stamp(p.date)>=start);if(!future.length||future[0].date!==data.asOf||future.some((p,i)=>stamp(p.date)!==start+i*DAY))return 0;
 if(future.some(p=>p.cash<buffer))return 0;
 const limits=future.filter(p=>stamp(p.date)>=start+7*DAY).map(p=>(p.cash-buffer)/Math.floor((stamp(p.date)-start)/(7*DAY)));
 return limits.length?Math.max(0,Math.floor(Math.min(...limits)*100)/100):0;
}
export function evaluateTrip(input,data){const cost=tripCost(input),t=cost.trip,points=(data.plan?.forecast||[]).filter(p=>Number.isFinite(p.cash)).slice().sort((a,b)=>a.date.localeCompare(b.date)),today=data.asOf||iso(Date.now()),last=points.at(-1)?.date||null;
 const funds=[...(data.goals||[]).map(g=>({...g,key:'goal:'+g.row+':'+g.name})),...(data.sinking||[]).map(g=>({...g,key:'sinking:'+g.row+':'+g.name}))];const fund=funds.find(f=>f.key===t.protectedFund),saved=Math.min(cost.total,Math.max(0,fund?fund.saved:t.saved));
 // Selected saved goal/fund money is already excluded from Cash Forecast. Release
 // it against trip costs once. Manually tracked savings are already in cash and
 // must not be added to the bank forecast again.
 const released=fund?saved:0,remaining=money(Math.max(0,cost.total-saved)),lead=Math.round((stamp(t.start)-stamp(t.bookingDate))/DAY),buffer=Number(data.cash?.bufferTarget)||0;
 const assess=(start,booking)=>{const end=iso(stamp(start)+cost.nights*DAY),first=t.upfront>0?booking:start;if(!last||first<today||end>last||!points.some(p=>p.date===first)||!points.some(p=>p.date===end))return {status:'Outside forecast',start,end,booking};
  const future=points.filter(p=>p.date>=first);if(future.length!==Math.round((stamp(last)-stamp(first))/DAY)+1||new Set(future.map(p=>p.date)).size!==future.length)return {status:'Outside forecast',start,end,booking};let low=null;for(const p of future){const due=(p.date>=booking?t.upfront:0)+(p.date>=start?cost.total-t.upfront:0),cash=money(p.cash-Math.max(0,due-released));if(!low||cash<low.cash)low={date:p.date,cash};}
  return {status:low.cash>=buffer?'Fits forecast':'Below buffer',start,end,booking,low,shortfall:money(Math.max(0,buffer-low.cash))};};
 const selected=assess(t.start,t.bookingDate);let earliest=null;
 for(const p of points.filter(p=>p.date>=today)){const booking=iso(Math.max(stamp(today),stamp(p.date)-lead*DAY));const candidate=assess(p.date,booking);if(candidate.status==='Fits forecast'){earliest=candidate;break;}}
 const pays=(data.nextPaychecks||[]).filter(p=>p.date>=today&&p.date<=t.start),upfrontPays=pays.filter(p=>p.date<=t.bookingDate);const unpaidUpfront=money(Math.max(0,t.upfront-saved));
 const suggestedWeekly=automaticTripSaving(data),weeklySaving=t.savingsMode==='Automatic'?suggestedWeekly:t.weeklySaving;
 const weeks=weeklySaving>0?Math.ceil(remaining/weeklySaving):remaining===0?0:null,goalReady=weeks===null||weeks>520?null:iso(stamp(today)+weeks*7*DAY),estimatedDeparture=goalReady?iso(Math.max(stamp(goalReady),stamp(goalReady)+lead*DAY)):null;
 return {...cost,saved,remaining,weeklySaving,suggestedWeekly,fundName:fund?.name||null,fundMissing:!!t.protectedFund&&!fund,buffer,selected,earliest,lastForecastDate:last,perPaycheck:pays.length?money(remaining/pays.length):null,paychecks:pays.length,upfrontPerPaycheck:upfrontPays.length?money(unpaidUpfront/upfrontPays.length):null,upfrontRemaining:unpaidUpfront,goalReady,estimatedDeparture};
}
export function suggestTripDates(input,nights,data){
 if(!Number.isInteger(nights)||nights<1||nights>90)throw Error('Choose 1–90 nights.');
 const options=[];
 for(const point of data.plan?.forecast||[]){
  if(point.date<data.asOf||point.date<input.bookingDate)continue;
  const end=new Date(Date.parse(point.date+'T00:00:00Z')+nights*86400000).toISOString().slice(0,10);
  const result=evaluateTrip({...input,start:point.date,end,rentalDays:input.rental?nights+1:input.rentalDays},data);
  if(result.selected.status==='Fits forecast')options.push(result);
  if(options.length===3)break;
 }
 return options;
}
