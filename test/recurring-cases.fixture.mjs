// Realistic recurring-expense cases: which ones does the detector find?
export const asOf='2026-09-18';
const base=()=>({accounts:[{id:'chk',name:'Checking',kind:'cash',active:true},{id:'card',name:'Visa',kind:'credit',active:true}],bills:[],transactions:[],reviewTransactions:[],payments:[],incomes:[],goals:[],wishes:[],needs:[],sinking:[],settings:{},dismissedRecurring:[]});
let n=0;const tx=(date,name,amount,extra={})=>({id:'t'+(++n),date,name,amount,accountId:'card',direction:'Outflow',category:'Entertainment',...extra});
export const shouldFind={
 'Two Apple subscriptions billed the same day':b=>{for(const m of ['05','06','07','08','09'])b.transactions.push(tx('2026-'+m+'-05','APPLE.COM/BILL',2.99),tx('2026-'+m+'-05','APPLE.COM/BILL',10.99));},
 'Bill name includes a changing reference number':b=>{for(const [m,r] of [['05','0512 #88213'],['06','0612 #90117'],['07','0712 #91554'],['08','0812 #93002'],['09','0912 #94410']])b.transactions.push(tx('2026-'+m+'-12','COMCAST CABLE COMM '+r,89.99,{category:'Utilities',accountId:'chk'}));},
 'One month charged a few days late':b=>{for(const d of ['2026-05-01','2026-06-06','2026-07-01','2026-08-01','2026-09-01'])b.transactions.push(tx(d,'PLANET FITNESS',24.99));},
 'One month skipped (paused)':b=>{for(const d of ['2026-04-15','2026-05-15','2026-07-15','2026-08-15','2026-09-15'])b.transactions.push(tx(d,'SPOTIFY USA',11.99));},
 'New subscription, charged twice so far':b=>{for(const d of ['2026-08-10','2026-09-10'])b.transactions.push(tx(d,'DISNEY PLUS',15.99));},
 'Yearly membership (two renewals on record)':b=>{for(const d of ['2025-09-22','2024-09-22'])b.transactions.push(tx(d,'AMAZON PRIME*MEMBERSHIP',139));},
 'Quarterly bill seen twice':b=>{for(const d of ['2026-03-20','2026-06-20'])b.transactions.push(tx(d,'CITY WATER UTILITY',64.5,{category:'Utilities',accountId:'chk'}));},
 'This month\'s charge is a week late':b=>{for(const d of ['2026-06-08','2026-07-08','2026-08-08'])b.transactions.push(tx(d,'GEICO AUTO',142.3,{category:'Transportation',accountId:'chk'}));},
 'Rent paid by Zelle (a bank transfer)':b=>{for(const d of ['2026-06-01','2026-07-01','2026-08-01','2026-09-01'])b.transactions.push(tx(d,'ZELLE TO SMITH PROPERTY',1500,{category:'Transfer',accountId:'chk'}));},
};
export const shouldFindExtra={
 'Affirm instalments the bank files as a loan payment':b=>{for(const d of ['2026-07-24','2026-08-07','2026-08-21','2026-09-04','2026-09-18'])b.transactions.push(tx(d,'AFFIRM * PAY',49.86,{category:'Debt payment',accountId:'chk'}));},
 'Affirm with a different reference number each time':b=>{for(const [d,r] of [['2026-07-24','ZBQ5T2'],['2026-08-07','K71PQR'],['2026-08-21','M40XZA'],['2026-09-04','P22LLD'],['2026-09-18','R91TTQ']])b.transactions.push(tx(d,'AFFIRM *'+r,49.86,{category:'Debt payment',accountId:'chk'}));},
 'Affirm where some rows add the city and state':b=>{for(const [d,name] of [['2026-07-24','AFFIRM'],['2026-08-07','AFFIRM INC SAN FRANCISCO CA'],['2026-08-21','AFFIRM'],['2026-09-04','AFFIRM INC SAN FRANCISCO CA'],['2026-09-18','AFFIRM']])b.transactions.push(tx(d,name,49.86,{category:'Debt payment',accountId:'chk'}));}
};
export const shouldNotFind={
 'Grocery trips (irregular amounts and dates)':b=>{for(const [d,a] of [['2026-08-02',84.1],['2026-08-09',61.2],['2026-08-15',97.3],['2026-08-24',55],['2026-09-01',72.4],['2026-09-08',88.8],['2026-09-16',66.1]])b.transactions.push(tx(d,'KROGER #412',a,{category:'Groceries'}));},
 'Same coffee price twice with other visits between':b=>{for(const [d,a] of [['2026-08-11',4.5],['2026-08-20',6.25],['2026-08-29',5.1],['2026-09-11',4.5]])b.transactions.push(tx(d,'STARBUCKS STORE 123',a,{category:'Groceries'}));},
 'Transfer to your own savings account':b=>{for(const d of ['2026-06-01','2026-07-01','2026-08-01','2026-09-01'])b.transactions.push(tx(d,'TRANSFER TO SAVINGS',200,{category:'Transfer',accountId:'chk',toAccountId:'sav'}));},
 'Debt payment':b=>{for(const d of ['2026-06-03','2026-07-03','2026-08-03','2026-09-03'])b.transactions.push(tx(d,'VISA PAYMENT',300,{category:'Debt payment',accountId:'chk',paymentId:'p'}));},
 'Cancelled subscription (stopped in spring)':b=>{for(const d of ['2026-02-07','2026-03-07','2026-04-07'])b.transactions.push(tx(d,'HULU',17.99));},
 'Same charge imported twice on the same day':b=>{for(const d of ['2026-07-19','2026-08-19','2026-09-19'.replace('19','17')]){b.transactions.push(tx(d,'NETFLIX.COM',15.49),tx(d,'NETFLIX.COM',15.49,{historical:true}));}},
};
export function evaluate(detect){
 const out=[];
 for(const [label,build] of Object.entries({...shouldFind,...shouldFindExtra})){const b=base();build(b);const found=detect(b,asOf);out.push({label,expect:true,found:found.length,names:found.map(s=>s.name+' '+s.frequency+' $'+s.amount)});}
 for(const [label,build] of Object.entries(shouldNotFind)){const b=base();build(b);const found=detect(b,asOf);out.push({label,expect:false,found:found.length,names:found.map(s=>s.name+' '+s.frequency)});}
 return out;
}
