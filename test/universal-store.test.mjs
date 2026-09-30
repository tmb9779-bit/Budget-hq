import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../server/store-factory.mjs';
import {HostedStore} from '../server/hosted-store.mjs';

test('universal storage defaults to the encrypted local store',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'budget-universal-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const store=createStore('budget',{dir,mode:'local'});await store.put('probe',{ok:true});
 assert.deepEqual(await store.get('probe'),{ok:true});assert.deepEqual(await store.list('pro'),['probe']);
});

test('hosted store rejects missing deployment secrets',()=>{
 assert.throws(()=>new HostedStore('budget',{url:'',key:Buffer.alloc(32)}),/DATABASE_URL/i);
});

test('hosted store encrypts values before database writes and decrypts reads',async()=>{
 const rows=new Map();
 const pool={async query(sql,args=[]){
  if(sql.startsWith('CREATE TABLE'))return {rows:[]};
  if(sql.startsWith('INSERT')){rows.set(args[0]+'|'+args[1],Buffer.from(args[2]));return {rows:[]};}
  if(sql.startsWith('SELECT payload')){const value=rows.get(args[0]+'|'+args[1]);return {rows:value?[{payload:value}]:[]};}
  if(sql.startsWith('SELECT name')){const [ns,pattern]=args,prefix=pattern.slice(0,-1);return {rows:[...rows.keys()].filter(k=>k.startsWith(ns+'|'+prefix)).map(k=>({name:k.split('|')[1]})).sort((a,b)=>a.name.localeCompare(b.name))};}
  if(sql.startsWith('DELETE')){rows.delete(args[0]+'|'+args[1]);return {rows:[]};}
  throw new Error('Unexpected SQL: '+sql);
 }};
 const store=new HostedStore('budget',{url:'postgres://test',key:Buffer.alloc(32,7),pool});
 await store.put('probe',{account:'Checking',balance:123});
 const raw=rows.get('budget|probe');assert.ok(raw);assert.equal(raw.includes(Buffer.from('Checking')),false);
 assert.deepEqual(await store.get('probe'),{account:'Checking',balance:123});assert.deepEqual(await store.list('pro'),['probe']);
 await store.remove('probe');assert.equal(await store.get('probe',null),null);
});
