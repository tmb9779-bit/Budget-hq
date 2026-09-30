import {isAlamoIncome} from './income-source.js';
// Shared classification for new bank records and existing uncategorized history.
// One shared list of transaction types, used for transactions, bills, planned expenses,
// calendar colours, icons and reports. name: what you see. slug: the colour/CSS key.
// expense:false marks types that are not spending (money coming in, or moving between your own accounts).
export const TYPES=[
 {name:'Income',slug:'income',icon:'income',color:'#2F6F4E',expense:false},
 {name:'Groceries',slug:'groceries',icon:'grocery',color:'#397B43'},
 {name:'Dining out',slug:'dining-out',icon:'dining',color:'#7C7A24'},
 {name:'Housing',slug:'housing',icon:'housing',color:'#526A88'},
 {name:'Utilities',slug:'utilities',icon:'utility',color:'#956619'},
 {name:'Phone',slug:'phone',icon:'phone',color:'#2B89A9'},
 {name:'Transportation',slug:'transportation',icon:'car',color:'#A85535'},
 {name:'Insurance',slug:'insurance',icon:'insurance',color:'#2F6E7A'},
 {name:'Medical',slug:'medical',icon:'medical',color:'#B6384D'},
 {name:'Pets',slug:'pets',icon:'pets',color:'#805475'},
 {name:'Entertainment',slug:'entertainment',icon:'entertainment',color:'#7154A1'},
 {name:'Shopping',slug:'shopping',icon:'shopping',color:'#AB4965'},
 {name:'Personal care',slug:'personal-care',icon:'personalCare',color:'#B05283'},
 {name:'Services',slug:'services',icon:'services',color:'#4C6B70'},
 {name:'Education',slug:'education',icon:'education',color:'#3F5DA8'},
 {name:'Travel',slug:'travel',icon:'travel',color:'#3186A3'},
 {name:'Home improvement',slug:'home-improvement',icon:'homeImprovement',color:'#7A6142'},
 {name:'Donations',slug:'donations',icon:'donations',color:'#C25E7A'},
 {name:'Bank fees',slug:'bank-fees',icon:'bankFees',color:'#7A6B5A'},
 {name:'Taxes',slug:'taxes',icon:'governmentTaxes',color:'#5C6B3F'},
 {name:'Debt payment',slug:'debt-payment',icon:'debtPayment',color:'#4E5FAD'},
 {name:'Transfer',slug:'transfer',icon:'transfer',color:'#6B7280',expense:false},
 {name:'Other',slug:'other',icon:'other',color:'#6B7280'}
];
export const CATEGORIES=TYPES.map(t=>t.name);
// Types a bill or planned expense can use: everything except money in and moves between your own accounts.
export const EXPENSE_CATEGORIES=TYPES.filter(t=>t.expense!==false).map(t=>t.name);
export const TYPE_BY_NAME=new Map(TYPES.map(t=>[t.name,t]));
export const typeSlug=name=>TYPE_BY_NAME.get(name)?.slug||'other';
export const typeColors=Object.fromEntries(TYPES.filter(t=>t.expense!==false).map(t=>[t.slug,t.color]));

// Names used by earlier versions, and by the separate bill list that used to exist.
const ALIASES={'Vet Bills':'Pets','Vet':'Pets','Veterinary':'Pets','Government & taxes':'Taxes','Utility':'Utilities','Grocery':'Groceries','Car':'Transportation','Debt':'Debt payment','Food':'Groceries','Dining':'Dining out','Restaurants':'Dining out','Personal Care':'Personal care','Home Improvement':'Home improvement','Bank Fees':'Bank fees','Debt Payment':'Debt payment'};
const DINING=/\b(restaurant|cafe|caf|coffee|starbucks|dunkin|mcdonald|chipotle|taco|pizza|burger|grill|bar|brewery|pub|diner|bistro|sushi|thai|chinese|mexican|deli|bakery|doordash|uber eats|ubereats|grubhub|postmates|seamless|panera|subway|wendy|chick fil|popeyes|kfc|sonic|arby|five guys|ihop|denny|applebee|olive garden|food truck|catering)\b/;
// "Food" used to cover both; restaurants and delivery become Dining out, everything else Groceries.
export const splitFood=name=>DINING.test(String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' '))?'Dining out':'Groceries';
// Accepts any older name and returns a current one. Unrecognised values return '' so callers can reject them.
export function normalizeCategory(value,name=''){
 const raw=String(value??'').trim();if(!raw)return '';
 if(TYPE_BY_NAME.has(raw))return raw;
 const alias=ALIASES[raw]||ALIASES[raw.replace(/\b\w/g,c=>c.toUpperCase())];
 if(alias==='Groceries'&&/^(food|grocery)$/i.test(raw))return splitFood(name);
 if(alias)return alias;
 const match=TYPES.find(t=>t.name.toLowerCase()===raw.toLowerCase()||t.slug===raw.toLowerCase());
 return match?match.name:'';
}
const primary={INCOME:'Income',FOOD_AND_DRINK:'Dining out',GENERAL_MERCHANDISE:'Shopping',RENT_AND_UTILITIES:'Utilities',TRANSPORTATION:'Transportation',MEDICAL:'Medical',ENTERTAINMENT:'Entertainment',TRAVEL:'Travel',PERSONAL_CARE:'Personal care',GENERAL_SERVICES:'Services',BANK_FEES:'Bank fees',GOVERNMENT_AND_NON_PROFIT:'Government & taxes',HOME_IMPROVEMENT:'Home improvement'};
const rules=[
 [/\b(payroll|paycheck|salary|direct dep(?:osit)?|dir dep|ssa treas|social security)\b/,'Income'],
 [/\b(credit card payment|loan payment|autopay payment)\b/,'Debt payment'],
 [/\b(zelle|venmo|cash app|transfer)\b/,'Transfer'],
 [/\b(veterinary|veterinarian|animal hospital|vet clinic|banfield|pet |petco|petsmart|chewy|groomer|grooming|kennel|boarding)\b/,'Pets'],
 [/\b(petco|petsmart|chewy|pet supplies)\b/,'Pets'],
 [/\b(kroger|aldi|trader joe ?s?|whole foods|safeway|publix|h e b|heb|grocery|groceries|supermarket|food lion|wegmans|sprouts|market)\b/,'Groceries'],
 [/\b(restaurant|cafe|coffee|starbucks|dunkin|mcdonald|chipotle|taco bell|doordash|uber eats|grubhub|pizza|burger|grill|brewery|bakery|deli|diner)\b/,'Dining out'],
 [/\b(shell|chevron|exxon|texaco|bp|gas station|uber|lyft|parking|toll)\b/,'Transportation'],
 [/\b(netflix|spotify|hulu|cinema|alamo drafthouse|movie|steamgames)\b/,'Entertainment'],
 [/\b(walmart|wal mart|target|amazon|amzn|ebay|etsy|goodwill|costco)\b/,'Shopping'],
 [/\b(cvs|walgreens|pharmacy|hospital|dental|dentist|medical)\b/,'Medical'],
 [/\b(rent|mortgage)\b/,'Housing'],
 [/\b(mint mobile|mobile phone|cell phone|phone bill|wireless|verizon|at t|t mobile|tmobile)\b/,'Phone'],
 [/\b(electric|water bill|internet|comcast|spectrum)\b/,'Utilities'],
 [/\b(insurance|geico|progressive|state farm)\b/,'Insurance'],
 [/\b(tuition|student tuition|university|college)\b/,'Education'],
 [/\b(salon|barber|barbershop|haircut|hair|spa|nail|great clips|supercuts|sport clips|ulta|sephora)\b/,'Personal care'],
 [/\b(irs|treasury|tax payment|property tax)\b/,'Taxes'],
 [/\b(overdraft|maintenance fee|atm fee|late fee)\b/,'Bank fees'],
 [/\b(hotel|airbnb|airlines|airways)\b/,'Travel']
];
export function classifyTransaction(t){
 if(isAlamoIncome(t))return 'Income';
 const pfc=t.personal_finance_category||t.bankCategory||{};
 const p=String(pfc.primary||'').toUpperCase(),d=String(pfc.detailed||'').toUpperCase();
 const inflow=t.direction?t.direction==='Inflow':t.amount<0;
 if(p==='LOAN_PAYMENTS')return 'Debt payment';
 if(p.startsWith('TRANSFER'))return /CREDIT_CARD_PAYMENT/.test(d)?'Debt payment':'Transfer';
 if(/VETERINARY/.test(d))return 'Pets';
 if(/GROCERIES|SUPERMARKET/.test(d))return 'Groceries';
 if(/PET_SUPPLIES/.test(d))return 'Pets';
 if(/EDUCATION/.test(d))return 'Education';
 if(/INSURANCE/.test(d))return 'Insurance';
 if(/DONATION/.test(d))return 'Donations';
 if(p==='RENT_AND_UTILITIES'&&/RENT/.test(d))return 'Housing';
 if(primary[p]&&(p!=='INCOME'||inflow))return primary[p];
 const legacy=Array.isArray(t.category)?t.category.join(' '):'';
 const name=[t.merchant_name,t.name,t.original_description,legacy].filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9]+/g,' ');
 // Refunds and unidentified credits must not become paycheck income.
 if(inflow&&/\b(refund|reversal|cashback|cash back)\b/.test(name))return 'Other';
 for(const [pattern,category] of rules)if(pattern.test(name)&&(category!=='Income'||inflow))return category;
 if(/\b(food|grocery|restaurants)\b/.test(legacy.toLowerCase()))return splitFood(name);
 return 'Other';
}
export function categorizeOther(book){
 let updated=0;
 for(const t of book.transactions){
  if(t.categoryConfirmed||t.adjustment||t.paymentId||t.bankMatchId||t.toAccountId||t.excluded||t.bankRemoved||(!isAlamoIncome(t)&&!['Other','',undefined,null].includes(t.category)))continue;
  const category=isAlamoIncome(t)?'Income':CATEGORIES.includes(t.suggestedCategory)&&t.suggestedCategory!=='Other'?t.suggestedCategory:classifyTransaction(t);
  if(category==='Other'||category===t.category)continue;
  t.category=category;delete t.suggestedCategory;updated++;
 }
 return updated;
}
