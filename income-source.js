// Confirmed employer alias; used only for incoming pay, never purchases/refunds.
const normalized=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function incomeSourceName(value){return /\balamo\s*(?:drafthouse|draft\s+house)\b/.test(normalized(value))?'Alamo Drafthouse':String(value||'').trim();}
export function isAlamoIncome(t){
 const incoming=t.direction?t.direction==='Inflow':t.amount<0;
 const description=[t.merchant_name,t.name,t.original_description].filter(Boolean).join(' ');
 return incoming&&incomeSourceName(description)==='Alamo Drafthouse'&&!t.toAccountId&&!t.paymentId&&!t.bankMatchId&&!t.adjustment&&!/\b(refund|reversal|reversed|cashback|cash back|reimbursement|zelle|venmo|cash app)\b/.test(normalized(description));
}
