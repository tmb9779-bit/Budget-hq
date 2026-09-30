// Build a complete new cache before committing its cursor. Retrying is safe.
export async function pullTransactions(call,item){
 for(let retry=0;retry<3;retry++){
  let cursor=item.txCursor||'',rows=new Map((item.transactions||[]).map(t=>[t.transaction_id,t]));
  try{for(let page=0;page<200;page++){
   const data=await call('/transactions/sync',{access_token:item.accessToken,...(cursor?{cursor}:{}),count:500});
   if(!Array.isArray(data.added)||!Array.isArray(data.modified)||!Array.isArray(data.removed)||typeof data.next_cursor!=='string'||typeof data.has_more!=='boolean')throw Error('Incomplete transaction response. Previous history retained.');
   for(const t of [...data.added,...data.modified]){if(!t.transaction_id||!t.account_id||!Number.isFinite(t.amount)||!/^\d{4}-\d\d-\d\d$/.test(t.date))throw Error('Invalid transaction response.');if(t.pending_transaction_id)rows.delete(t.pending_transaction_id);rows.set(t.transaction_id,t);}
   for(const t of data.removed){if(typeof t?.transaction_id!=='string'||!t.transaction_id)throw Error('Incomplete transaction removal. Previous history retained.');rows.delete(t.transaction_id);}
   if(data.has_more&&(!data.next_cursor||data.next_cursor===cursor))throw Error('Transaction pagination did not advance.');
   cursor=data.next_cursor;if(!data.has_more)return {transactions:[...rows.values()],txCursor:cursor};
  }throw Error('Transaction update exceeded page limit.');
  }catch(e){if(!String(e.message).includes('TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION')||retry===2)throw e;}
 }
}
export function liabilityFields(data){const out=[];for(const type of ['credit','student','mortgage'])for(const row of data?.[type]||[]){const apr=type==='credit'?row.aprs?.find(a=>a.apr_type==='purchase_apr')?.apr_percentage:type==='student'?row.interest_rate_percentage:row.interest_rate?.percentage;out.push({accountId:row.account_id,type,apr:Number.isFinite(apr)?apr:null,payment:type==='mortgage'?row.next_monthly_payment:row.minimum_payment_amount,date:row.next_payment_due_date,aprs:type==='credit'?row.aprs?.map(a=>({type:a.apr_type,apr:a.apr_percentage,balance:a.balance_subject_to_apr})):[]});}return out;}
