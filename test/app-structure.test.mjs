import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
// app.js used to grow by re-assigning its own functions (layer on layer). Keep every function defined once.
test('app functions are declared once, never re-assigned or wrapped at runtime',()=>{
 assert.deepEqual(app.match(/(^|[;{}])\s*[a-zA-Z_$][\w$]*=(async\s+)?function\b/gm)||[],[]);
 const names=[...app.matchAll(/^(?:async )?function ([\w$]+)\(/gm)].map(m=>m[1]);
 assert.deepEqual(names.filter((n,i)=>names.indexOf(n)!==i),[]);
});
test('each button action is handled in one place in advancedClick',()=>{
 const start=app.indexOf('async function advancedClick('),body=app.slice(start,app.indexOf('\n}\n',start));
 const actions=[...body.matchAll(/(?:\bif\(|\|\|)action==='([\w-]+)'/g)].map(m=>m[1]).filter(a=>a!=='checkinAccounts');
 assert.deepEqual(actions.filter((a,i)=>actions.indexOf(a)!==i),[]);
});
