import {access} from 'node:fs/promises';import {join} from 'node:path';import {randomUUID} from 'node:crypto';
import {PrivateStore} from './private-store.mjs';import {normalizeTrip} from '../trip-planner.js';
export async function bringOverTrips(book,configDir){
 const dir=join(configDir,'private');try{await access(join(dir,'trips.enc'));await access(join(dir,'vault.key'));}catch{return;}
 try{const legacy=new PrivateStore(dir),saved=await legacy.get('trips');for(const t of saved?.items||[])try{book.trips.push({id:t.id||randomUUID(),...normalizeTrip({...t,protectedFund:''})});}catch{book.migration.unresolved.push('An old trip draft could not be validated. It remains in the old app’s private storage.');}
 if(book.trips.length)book.migration.unresolved.push(`${book.trips.length} trip draft(s) copied from local storage. Review any savings previously linked to spreadsheet goals.`);
 }catch{book.migration.unresolved.push('Old trip storage could not be read. It was left untouched.');}
}
