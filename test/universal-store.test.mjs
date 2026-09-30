import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../server/store-factory.mjs';

test('universal storage foundation defaults to the encrypted local store',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'budget-universal-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const previous=process.env.BUDGET_HQ_STORE;delete process.env.BUDGET_HQ_STORE;
 t.after(()=>previous===undefined?delete process.env.BUDGET_HQ_STORE:process.env.BUDGET_HQ_STORE=previous);
 const store=createStore('budget',{dir});await store.put('probe',{ok:true});
 assert.deepEqual(await store.get('probe'),{ok:true});assert.deepEqual(await store.list('pro'),['probe']);
});

test('hosted mode fails closed until a hosted adapter is configured',()=>{
 const previous=process.env.BUDGET_HQ_STORE;process.env.BUDGET_HQ_STORE='hosted';
 try{assert.throws(()=>createStore('budget'),/not configured yet/i);}finally{previous===undefined?delete process.env.BUDGET_HQ_STORE:process.env.BUDGET_HQ_STORE=previous;}
});
