import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {TYPES,CATEGORIES,EXPENSE_CATEGORIES,normalizeCategory,splitFood,typeSlug} from '../categories.js';
import {classifyTransaction} from '../categories.js';
import {fresh,change} from '../server/model.mjs';
import {migrateCategories,CATEGORY_VERSION} from '../server/service.mjs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8'),palette=readFileSync(new URL('../palette.css',import.meta.url),'utf8');
const day='2026-09-20';

test('one shared list: unique names and slugs, spending types only for bills',()=>{
 assert.equal(new Set(CATEGORIES).size,CATEGORIES.length);
 assert.equal(new Set(TYPES.map(t=>t.slug)).size,TYPES.length);
 assert.deepEqual(CATEGORIES.filter(c=>!EXPENSE_CATEGORIES.includes(c)),['Income','Transfer']);
 for(const t of TYPES)assert.match(t.color,/^#[0-9a-f]{6}$/i,t.name);
});

test('every type has artwork and colour rules to draw with',()=>{
 for(const t of TYPES){
  assert.ok(app.includes('"'+t.icon+'"')||app.includes('.'+t.icon+'=')||app.includes("'"+t.icon+"'"),'icon missing for '+t.name);
  for(const rule of ['.tone-'+t.slug,'.cat-'+t.slug,'.gradient-'+t.slug])assert.ok(palette.includes(rule),'no '+rule+' for '+t.name);
 }
});

test('older names from both lists map to current ones',()=>{
 for(const [old,now] of [['Vet Bills','Pets'],['Vet','Pets'],['Government & taxes','Taxes'],['Utility','Utilities'],['Grocery','Groceries'],['Car','Transportation'],['Debt','Debt payment'],['Housing','Housing'],['Shopping','Shopping']])assert.equal(normalizeCategory(old),now,old);
 assert.equal(normalizeCategory('Food','STARBUCKS #22'),'Dining out');
 assert.equal(normalizeCategory('Food','KROGER 412'),'Groceries');
 assert.equal(splitFood('DOORDASH*WENDYS'),'Dining out');
 assert.equal(normalizeCategory('Nonsense'),'','unknown names are rejected, not guessed');
 assert.equal(normalizeCategory(''),'');
 assert.equal(normalizeCategory('phone'),'Phone');
 assert.equal(classifyTransaction({name:'Mint Mobile monthly service'}),'Phone');
});

test('bills, planned expenses and transactions all accept the shared list',()=>{
 let b=fresh();b=change(b,'account',{name:'Cash',kind:'cash',openingBalance:500,balanceDate:'2026-01-01'},day);
 for(const category of EXPENSE_CATEGORIES){
  b=change(b,'bill',{name:'Bill '+category,amount:10,date:'2026-10-01',frequency:'Monthly',category},day);
  assert.equal(b.bills.at(-1).category,category);
  b=change(b,'need',{name:'Need '+category,cost:10,urgency:'Medium',category,mode:'save'},day);
  assert.equal(b.needs.at(-1).category,category);
 }
 b=change(b,'transaction',{accountId:b.accounts[0].id,name:'Charge',date:day,amount:5,direction:'Outflow'},day);
 const id=b.transactions.at(-1).id;
 for(const category of CATEGORIES){b=change(b,'category',{id,category},day);assert.equal(b.transactions.find(t=>t.id===id).category,category);}
 b=change(b,'category',{id,category:'Utility'},day);assert.equal(b.transactions.find(t=>t.id===id).category,'Utilities','old names still accepted');
 assert.throws(()=>change(b,'category',{id,category:'Nonsense'},day),/listed options/);
 assert.throws(()=>change(b,'bill',{name:'x',amount:1,date:'2026-10-01',frequency:'Monthly',category:'Income'},day),/listed options/,'income is not a bill type');
});

test('saved budgets move to the new types once, without touching anything else',()=>{
 const book={categoryVersion:0,transactions:[{id:'a',category:'Food',name:'STARBUCKS'},{id:'b',category:'Food',name:'ALDI'},{id:'c',category:'Vet Bills',name:'Banfield'},{id:'d',name:'No category'}],
  reviewTransactions:[{id:'r',category:'Government & taxes',name:'IRS'}],bills:[{id:'x',category:'Utility',name:'Electric'},{id:'mint',category:'Utilities',name:'Mint Mobile',icon:'phone'}],needs:[{id:'n',category:'Car',name:'Tires'}],
  settings:{buffer:400,expenseColors:{grocery:'#111111',car:'#222222',vet:'#333333'}}};
 const moved=migrateCategories(book);
 assert.deepEqual(moved.transactions.map(t=>t.category),['Dining out','Groceries','Pets',undefined]);
 assert.equal(moved.reviewTransactions[0].category,'Taxes');
 assert.equal(moved.bills[0].category,'Utilities');assert.equal(moved.bills[1].category,'Phone');assert.equal('icon' in moved.bills[1],false);assert.equal(moved.needs[0].category,'Transportation');
 assert.deepEqual(moved.settings.expenseColors,{groceries:'#111111',transportation:'#222222',pets:'#333333'},'your chosen colours follow their type');
 assert.equal(moved.settings.buffer,400);
 assert.equal(moved.categoryVersion,CATEGORY_VERSION);
 assert.equal(migrateCategories(moved),null,'runs only once');
});

test('bank imports separate groceries from eating out',()=>{
 for(const [t,expected] of [
  [{name:'KROGER #412',direction:'Outflow',personal_finance_category:{primary:'FOOD_AND_DRINK',detailed:'FOOD_AND_DRINK_GROCERIES'}},'Groceries'],
  [{name:'CHIPOTLE 2242',direction:'Outflow',personal_finance_category:{primary:'FOOD_AND_DRINK',detailed:'FOOD_AND_DRINK_RESTAURANT'}},'Dining out'],
  [{name:'TRADER JOES 117',direction:'Outflow'},'Groceries'],
  [{name:'DOORDASH*PANERA',direction:'Outflow'},'Dining out'],
  [{name:'GREAT CLIPS',direction:'Outflow'},'Personal care'],
  [{name:'IRS TREAS TAX PAYMENT',direction:'Outflow'},'Taxes']])assert.equal(classifyTransaction(t),expected,t.name);
});

test('colour keys stay stable for CSS',()=>{assert.equal(typeSlug('Dining out'),'dining-out');assert.equal(typeSlug('Debt payment'),'debt-payment');assert.equal(typeSlug('Nonsense'),'other');});

test('pet care is one type: vet visits, supplies and grooming',()=>{
 assert.ok(!CATEGORIES.includes('Vet'),'Vet is no longer a separate type');
 assert.ok(EXPENSE_CATEGORIES.includes('Pets'));
 for(const old of ['Vet','Vet Bills','Veterinary'])assert.equal(normalizeCategory(old),'Pets',old);
 for(const [t,expected] of [
  [{name:'BANFIELD PET HOSPITAL',direction:'Outflow'},'Pets'],
  [{name:'PETSMART #1123',direction:'Outflow'},'Pets'],
  [{name:'CHEWY.COM',direction:'Outflow'},'Pets'],
  [{name:'RIVERSIDE ANIMAL HOSPITAL',direction:'Outflow'},'Pets'],
  [{name:'CITY VET CLINIC',direction:'Outflow',personal_finance_category:{primary:'MEDICAL',detailed:'MEDICAL_VETERINARY_SERVICES'}},'Pets']])assert.equal(classifyTransaction(t),expected,t.name);
 assert.equal(classifyTransaction({name:'CITY DENTAL',direction:'Outflow',personal_finance_category:{primary:'MEDICAL',detailed:'MEDICAL_DENTAL_CARE'}}),'Medical','people care stays Medical');
});

// Reads the two icon tables out of app.js the way the app builds them.
function iconArtwork(){
 const markup={},paths={};
 for(const m of app.matchAll(/"([a-zA-Z0-9]+)":\s*"((?:[^"\\]|\\.)*)"/g)){const v=m[2].replace(/\\"/g,'"');if(v.startsWith('<'))markup[m[1]]=v;else if(v.startsWith('M'))paths[m[1]]=v;}
 for(const m of app.matchAll(/approvedIconMarkup\.([a-zA-Z0-9]+)="((?:[^"\\]|\\.)*)"/g))markup[m[1]]=m[2].replace(/\\"/g,'"');
 for(const m of app.matchAll(/approvedIconMarkup\.([a-zA-Z0-9]+)='([^']*)'/g))markup[m[1]]=m[2];
 return name=>markup[name]||(paths[name]?'<path d="'+paths[name]+'"/>':null);
}
test('every type draws its own icon, and no two types share one',()=>{
 const artwork=iconArtwork(),seen=new Map();
 for(const t of TYPES){
  const art=artwork(t.icon);
  assert.ok(art,t.name+' has no artwork for icon "'+t.icon+'" and would fall back to a generic shape');
  assert.ok(!seen.has(art),t.name+' reuses the icon already used by '+seen.get(art));
  seen.set(art,t.name);
 }
});
