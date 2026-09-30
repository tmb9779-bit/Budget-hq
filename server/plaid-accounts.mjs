import {applyPlaidProducts} from './plaid-ledger.mjs';
import {autoConfirmPaychecks} from '../bank-matches.js';
import {randomUUID} from 'node:crypto';
import {balances,money,today} from './model.mjs';
// Absolute reported balances are reconciled, never added as deposits.
export function applyPlaidAccounts(original,items,asOf=today(),{allowNew=null}={}){
 const book=structuredClone(original),notes=[];let added=0,updated=0;
 book.plaidAccountConflicts??=[];
 for(const item of items){
  if(!item.error)book.plaidAccountConflicts=book.plaidAccountConflicts.filter(c=>c.itemId!==item.id);
  if(item.error){notes.push(item.name+': '+item.error);for(const a of book.accounts.filter(a=>a.plaid?.itemId===item.id))a.verified=false;continue;}
  const seen=new Set();
  for(const source of item.accounts||[]){
   if(!source.id||seen.has(source.id))continue;seen.add(source.id);
   const kind={depository:'cash',credit:'credit',loan:'loan'}[source.type];
   if(!kind){notes.push(source.name+': account type is not supported in this budget.');continue;}
   let account=book.accounts.find(a=>a.plaid?.accountId===source.id||(source.persistentId&&a.plaid?.persistentId===source.persistentId));
   if(source.currency!=='USD'||!Number.isFinite(source.current)||Math.abs(source.current)>1e9){if(account)account.verified=false;notes.push(source.name+': no usable USD current balance; previous value retained.');continue;}
   if(account&&account.kind!==kind){account.verified=false;notes.push(source.name+': account type changed; review before updating.');continue;}
   if(!account){
    const possible=book.accounts.some(a=>a.active!==false&&a.kind===kind&&((source.mask&&a.plaid?.mask===source.mask&&a.plaid?.institutionId===item.institutionId)||a.name.toLowerCase()===source.name.toLowerCase()));
    if(possible&&!(allowNew?.itemId===item.id&&allowNew?.accountId===source.id)){
     book.plaidAccountConflicts.push({id:JSON.stringify([item.id,source.id]),itemId:item.id,institution:item.name,institutionId:item.institutionId||'',checkedAt:item.checkedAt,source:structuredClone(source),bankAccountIds:(item.accounts||[]).map(a=>a.id)});
     notes.push(source.name+': possible existing account; not added twice. Open Resolve Account Conflicts; no reconnection is needed.');continue;
    }
    account={id:randomUUID(),name:source.name,institution:item.name,kind,openingBalance:money(source.current),balanceDate:asOf,original:Math.max(0,money(source.current)),apr:0,payment:0,dueDate:'',frequency:'Monthly',limit:0,verified:true,active:true};book.accounts.push(account);added++;
   }
   // Deleted/disabled linked accounts stay deleted instead of being resurrected.
   if(account.active===false){notes.push(source.name+': inactive account was not restored.');continue;}
   const target=money(source.current),current=balances(book,asOf).find(a=>a.id===account.id).balance,delta=money(target-current);
   if(delta){book.transactions.push({id:randomUUID(),name:'Plaid balance update',date:asOf,accountId:account.id,amount:Math.abs(delta),direction:(kind==='cash'?delta>0:delta<0)?'Inflow':'Outflow',category:'Balance correction',adjustment:true,plaidBalance:true});updated++;}
   if(kind==='credit'&&Number.isFinite(source.limit)&&source.limit>=0)account.limit=money(source.limit);
   account.verified=true;account.confirmedAt=asOf;
   account.plaid={...account.plaid,itemId:item.id,accountId:source.id,persistentId:source.persistentId||'',institutionId:item.institutionId||'',mask:source.mask,reportedBalance:target,available:source.available,currency:'USD',retrievedAt:item.checkedAt,balanceUpdatedAt:source.balanceUpdatedAt||null};
  }
  for(const a of book.accounts.filter(a=>a.plaid?.itemId===item.id&&a.active!==false))if(!seen.has(a.plaid.accountId)){a.verified=false;notes.push(a.name+': no longer returned by the bank; retained for review.');}
 }
 const imported=applyPlaidProducts(book,items,notes,asOf);
 const clearedPaychecks=autoConfirmPaychecks(book,asOf);
 if(clearedPaychecks)notes.push(clearedPaychecks+' expected paycheck'+(clearedPaychecks===1?'':'s')+' matched to your bank deposits.');
 return {book,added,updated,imported,notes};
}

export function resolvePlaidAccountConflict(original,{id,accountId,mode},asOf=today()){
 const conflict=(original.plaidAccountConflicts||[]).find(c=>c.id===id);
 if(!conflict)throw Error('This conflict is no longer available. Sync and review again.');
 if(!['link','separate'].includes(mode))throw Error('Choose how to resolve this account.');
 const book=structuredClone(original),source=conflict.source,kind={depository:'cash',credit:'credit',loan:'loan'}[source.type];
 if(book.accounts.some(a=>a.plaid?.accountId===source.id))throw Error('This bank account is already linked. Sync again.');
 if(mode==='link'){
  const target=book.accounts.find(a=>a.id===accountId&&a.active!==false&&a.kind===kind);
  if(!target)throw Error('Choose an active account of the same type.');
  if(target.plaid?.accountId&&(target.plaid.itemId!==conflict.itemId||conflict.bankAccountIds.includes(target.plaid.accountId)))throw Error('That account is linked to another bank account. Choose a different account or add this separately.');
  target.plaid={...target.plaid,itemId:conflict.itemId,accountId:source.id};
 }
 const item={id:conflict.itemId,name:conflict.institution,institutionId:conflict.institutionId,checkedAt:conflict.checkedAt,accounts:[source]};
 const result=applyPlaidAccounts(book,[item],asOf,{allowNew:mode==='separate'?{itemId:item.id,accountId:source.id}:null}).book;
 // A single-account resolution must not change unrelated account verification,
 // pending diagnostics, or other conflicts on the same connection.
 for(const a of result.accounts)if(a.plaid?.accountId!==source.id){const prior=original.accounts.find(x=>x.id===a.id);if(prior)a.verified=prior.verified;}
 result.pendingSyncDiagnostics=structuredClone(original.pendingSyncDiagnostics||{});
 result.plaidAccountConflicts=structuredClone((original.plaidAccountConflicts||[]).filter(c=>c.id!==id));
 return result;
}
