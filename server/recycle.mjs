// Recently Deleted keeps a 30-day recovery window. Cancellation markers are
// retained separately so expiring recovery never brings an occurrence back.
export const RECOVERY_DAYS=30;
const plus=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export const stampDeletion=(asOf)=>({deletedAt:asOf,expiresAt:plus(asOf,RECOVERY_DAYS)});
export function normalizeRecovery(book,asOf){
 const b=structuredClone(book);
 for(const list of ['deletedBills','deletedPayments'])b[list]=(b[list]||[]).map(item=>({...item,...(!item.deletedAt?stampDeletion(asOf):!item.expiresAt?{expiresAt:plus(item.deletedAt.slice(0,10),RECOVERY_DAYS)}:{})})).filter(item=>item.expiresAt>asOf);
 for(const [key,value] of Object.entries(b.overrides||{}))if(value.status==='Skipped'){
  const v={...value,...(!value.deletedAt?stampDeletion(asOf):!value.expiresAt?{expiresAt:plus(value.deletedAt.slice(0,10),RECOVERY_DAYS)}:{})};
  b.overrides[key]=v.expiresAt<=asOf?{status:'Cancelled'}:v;
 }
 return b;
}
export function withoutDeletion(item){const {deletedAt,expiresAt,recovery,recordType,...record}=item;return record;}
