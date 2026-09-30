// Device-local display preferences; never changes budget records.
export function restoreSections(root,scope,storage){
 if(!root?.querySelectorAll)return;
 const prefix='budget-hq-sections-v1:',key=prefix+scope;let saved={};
 try{const parsed=JSON.parse(storage?.getItem(key)||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))saved=parsed;}catch{}
 const counts=new Map();
 for(const detail of root.querySelectorAll('details')){
  const title=detail.querySelector('summary')?.textContent?.trim()||'section';
  const base=detail.dataset.sectionKey||title.replace(/\s*\(\d+\)\s*$/,'').replace(/^\d+ Days Below/,'Days Below');
  const count=counts.get(base)||0;counts.set(base,count+1);const id=base+'|'+count;
  if(typeof saved[id]==='boolean')detail.open=saved[id];
  detail.addEventListener('toggle',()=>{if(detail.isConnected===false)return;saved[id]=detail.open;try{storage?.setItem(key,JSON.stringify(Object.fromEntries(Object.entries(saved).slice(-200))));}catch{}});
 }
}
