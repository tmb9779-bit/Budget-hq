import {join} from 'node:path';
import {PrivateStore} from './private-store.mjs';
import {configDir} from './config.mjs';

// Persistence seam for Budget HQ Universal Data.
// 0.9.154 intentionally defaults to the proven encrypted local vault.
// A hosted adapter can implement the same get/put/list/remove contract without
// changing BudgetService, PlaidConnection, owner sessions, or mail storage.
export function createStore(name,{dir=configDir}={}){
 const mode=(process.env.BUDGET_HQ_STORE||'local').trim().toLowerCase();
 if(mode==='local')return new PrivateStore(join(dir,name));
 if(mode==='hosted')throw new Error('Hosted storage is not configured yet. Set BUDGET_HQ_STORE=local or configure the hosted adapter before migration.');
 throw new Error(`Unknown BUDGET_HQ_STORE mode: ${mode}`);
}
