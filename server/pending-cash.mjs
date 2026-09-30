// Pending cash is a read-only projection. The posted ledger remains authoritative
// for reconciliation and never receives pending transactions as booked expenses.
const money=n=>Math.round(n*100)/100;
export function pendingCash(book,accounts,asOf){
 const postedIds=new Set((book.transactions||[]).map(t=>t.plaidTransactionId).filter(Boolean));
 const seen=new Set(),pending=(book.plaidPending||[]).filter(t=>{
  const id=t.plaidTransactionId||t.id;
  if(!id||seen.has(id)||postedIds.has(id)||t.excluded||t.bankRemoved||!Number.isFinite(t.amount)||t.amount<=0)return false;
  seen.add(id);return t.direction==='Outflow';
 });
 const details=accounts.filter(a=>a.kind==='cash'&&a.active!==false).map(a=>{
  const charges=pending.filter(t=>t.accountId===a.id),pendingCharges=money(charges.reduce((n,t)=>n+t.amount,0));
  const hasAvailable=Number.isFinite(a.plaid?.available)&&Number.isFinite(a.plaid?.reportedBalance);
  // Carry local balance changes forward. Never count extra available credit or
  // pending deposits as cash above the posted balance.
  const balance=money(hasAvailable?Math.min(a.balance,a.plaid.available+a.balance-a.plaid.reportedBalance):a.balance-pendingCharges);
  return {id:a.id,name:a.name,postedBalance:a.balance,balance,pendingCharges,adjustment:money(a.balance-balance),method:hasAvailable?'available':charges.length?'estimate':'posted',charges};
 });
 return {balance:money(details.reduce((n,a)=>n+a.balance,0)),postedBalance:money(details.reduce((n,a)=>n+a.postedBalance,0)),pendingAdjustment:money(details.reduce((n,a)=>n+a.adjustment,0)),balanceDetails:details};
}
