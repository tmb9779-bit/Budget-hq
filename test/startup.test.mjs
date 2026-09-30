import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,summary} from '../server/model.mjs';
test('browser module starts and renders Home with native module semantics',async()=>{
 const elements=new Map(),node=s=>{if(!elements.has(s))elements.set(s,{dataset:{},innerHTML:'',textContent:'',open:false,addEventListener(){},setAttribute(){},removeAttribute(){},prepend(){},querySelector(){return null;},querySelectorAll(){return [];},classList:{add(){},remove(){},toggle(){}}});return elements.get(s);};
 const saved={};for(const key of ['document','window','location','sessionStorage','fetch','setInterval'])saved[key]=globalThis[key];
 globalThis.setInterval=()=>0;
 globalThis.document={querySelector:node,querySelectorAll:()=>[],addEventListener(){},body:node('body'),createElement:()=>node('created')};
 globalThis.window={addEventListener(){}};globalThis.location={hash:'#home'};globalThis.sessionStorage={setItem(){},getItem(){return null;}};
 const book=fresh();globalThis.fetch=async url=>({ok:true,status:200,json:async()=>String(url).includes('plaid/status')?{configured:false,items:[],sessions:[]}: {book,summary:summary(book,'2026-09-19'),appVersion:'test'}});
 try{await import('../app.js');await new Promise(resolve=>setTimeout(resolve,50));assert.match(node('#content').innerHTML,/My Balance|Current Balance/);assert.match(node('#navigation').innerHTML,/Plan/);}
 finally{for(const [key,value]of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
