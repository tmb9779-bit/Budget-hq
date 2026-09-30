// A scheduled Need is represented by a one-time bill. A confirmed match links
// its existing purchase; it never creates another transaction or cash change.
export function needMatchCandidates(book,asOf){
 const difference=(a,b)=>Math.abs(Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000;
 const purchases=(book.transactions||[]).filter(t=>t.direction==='Outflow'&&t.date<=asOf&&!t.excluded&&!t.bankRemoved&&!t.pending&&!t.adjustment&&!t.toAccountId&&!t.paymentId&&!t.bankMatchId&&!t.occurrenceKey&&!t.goalId);
 return (book.bills||[]).filter(b=>b.active!==false&&b.needId&&b.frequency==='One-time'&&b.date<=asOf&&book.overrides?.[b.id+'@'+b.date]?.status!=='Paid').flatMap(b=>purchases.filter(t=>difference(t.date,b.date)<=3&&Math.abs(t.amount-b.amount)<=Math.max(3,b.amount*.1)).map(t=>({key:b.id+'@'+b.date+'|'+t.id,billId:b.id,transactionId:t.id,bill:b,transaction:t}))).filter(c=>!(book.dismissedNeedMatches||[]).includes(c.key));
}
